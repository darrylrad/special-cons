import pandas as pd
import numpy as np
from sklearn.neighbors import BallTree

RADIUS_M = 1000  # 1 km competitive radius

# ============================================
# STEP 1: Load data
# ============================================
print("Loading data...")
biz = pd.read_parquet('competitors_per_business.parquet')
churn = pd.read_parquet('churn_with_census.parquet')

print(f"Businesses:  {biz.shape}")
print(f"Churn:       {churn.shape}")

# ============================================
# STEP 2: Radius-based competitor metrics
# Uses a BallTree spatial index (haversine) so this scales — no O(n²) scan.
# Churn stays at zip level: closure-rate data is a market-level signal and is
# only available aggregated by zip+category, not by individual business location.
# ============================================
print(f"\nComputing radius-based metrics (r={RADIUS_M}m)...")

valid = biz.dropna(subset=['latitude', 'longitude']).copy().reset_index(drop=True)
skipped = len(biz) - len(valid)
print(f"  {len(valid):,} businesses with coordinates  ({skipped:,} skipped — no lat/lng)")

coords_rad = np.radians(valid[['latitude', 'longitude']].values)
tree = BallTree(coords_rad, metric='haversine')

radius_rad = RADIUS_M / 6_371_000
print("  Querying spatial index...")
neighbor_indices = tree.query_radius(coords_rad, r=radius_rad)
print("  Done.")

level2_arr = valid['level2'].values
date_arr   = pd.to_datetime(valid['date_created'], errors='coerce').values
now_np     = np.datetime64(pd.Timestamp.now())

same_cat_counts  = np.zeros(len(valid), dtype=np.int32)
avg_ages         = np.full(len(valid), np.nan)
diversity_counts = np.zeros(len(valid), dtype=np.int32)

print("  Computing per-business metrics...")
for i, neighbors in enumerate(neighbor_indices):
    if i % 50_000 == 0:
        print(f"    {i:,} / {len(valid):,}")

    others = neighbors[neighbors != i]
    if len(others) == 0:
        continue

    # Same-category competitors within radius
    same_mask = level2_arr[others] == level2_arr[i]
    same_cat_counts[i] = int(same_mask.sum())

    # Average age (years) of same-category competitors
    same_dates = date_arr[others[same_mask]]
    valid_dates = same_dates[~pd.isnull(same_dates)]
    if len(valid_dates) > 0:
        ages_years = (now_np - valid_dates) / np.timedelta64(1, 'D') / 365.25
        avg_ages[i] = float(ages_years.mean())

    # Distinct level2 categories within radius (ecosystem diversity)
    cats = level2_arr[others]
    diversity_counts[i] = len({c for c in cats if c is not None and not (isinstance(c, float) and np.isnan(c))})

valid['same_category_count_radius'] = same_cat_counts
valid['avg_same_category_age_radius'] = avg_ages
valid['level2_diversity_radius'] = diversity_counts

# Merge radius metrics back onto the full dataset
biz = biz.merge(
    valid[['fsq_place_id', 'same_category_count_radius', 'avg_same_category_age_radius', 'level2_diversity_radius']],
    on='fsq_place_id',
    how='left',
)

# ============================================
# STEP 3: Merge churn data (zip-level — market signal, not hyper-local)
# ============================================
print("\nMerging churn data...")
biz = biz.merge(churn, on=['zip_clean', 'level2'], how='left')
print(f"After merge: {biz.shape}")

# ============================================
# STEP 4: Red flag features
# ============================================
biz['flag_count'] = biz['unresolved_flags'].apply(
    lambda x: len(x) if isinstance(x, list) else 0
)
biz['days_since_refresh'] = (pd.Timestamp.now() - pd.to_datetime(biz['date_refreshed'])).dt.days

# ============================================
# STEP 5: Percentile scores
# ============================================
print("\nCalculating scores...")

# Saturation: fewer same-category businesses within 1km = lower saturation = higher score
biz['saturation_score'] = biz['same_category_count_radius'].rank(pct=True, ascending=False) * 100

# Churn: lower zip-level closure rate = higher score
biz['churn_score'] = biz['historical_closure_rate'].rank(pct=True, ascending=False) * 100

# Diversity: more distinct business types within 1km = higher score
biz['diversity_score'] = biz['level2_diversity_radius'].rank(pct=True) * 100

score_cols = ['saturation_score', 'churn_score', 'diversity_score']
biz[score_cols] = biz[score_cols].fillna(50)

biz['overall_score'] = (
    biz['saturation_score'] * 0.23 +
    biz['churn_score']      * 0.60 +
    biz['diversity_score']  * 0.17
)

biz['verdict'] = biz['overall_score'].apply(
    lambda x: 'PROCEED' if x >= 65 else ('PROCEED WITH CAUTION' if x >= 40 else 'AVOID')
)

# ============================================
# STEP 6: Save
# ============================================
print("\nVerdict distribution:")
print(biz['verdict'].value_counts())

print("\nScore summary:")
print(biz[['overall_score', 'saturation_score', 'churn_score', 'diversity_score']].describe().round(1))

print(f"\nSample (radius-based metrics):")
print(biz[['name', 'level2', 'same_category_count_radius', 'level2_diversity_radius', 'overall_score', 'verdict']].head(10).to_string())

biz.to_csv('scored_businesses.csv', index=False)
print(f"\nSaved {len(biz):,} businesses to scored_businesses.csv")
