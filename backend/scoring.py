import pandas as pd

# ============================================
# STEP 5: Load and merge all data
# ============================================
print("Loading data...")
biz = pd.read_parquet('competitors_per_business.parquet')
churn = pd.read_parquet('churn_with_census.parquet')
ecosystem = pd.read_parquet('ecosystem_by_zip.parquet')

print(f"Businesses: {biz.shape}")
print(f"Churn: {churn.shape}")
print(f"Ecosystem: {ecosystem.shape}")

# Merge churn (by zip + category)
biz = biz.merge(churn, on=['zip_clean', 'level2'], how='left')

# Merge ecosystem (by zip only)
biz = biz.merge(ecosystem, on='zip_clean', how='left')

# Red flag features (Metric 5)
biz['flag_count'] = biz['unresolved_flags'].apply(
    lambda x: len(x) if isinstance(x, list) else 0
)
biz['days_since_refresh'] = (pd.Timestamp.now() - pd.to_datetime(biz['date_refreshed'])).dt.days

print(f"\nAfter merge: {biz.shape}")


# ============================================
# STEP 6: Calculate percentile scores
# ============================================
print("\nCalculating scores...")

# Metric 1: Saturation (fewer competitors = higher score)
biz['saturation_score'] = biz['same_category_count_zip'].rank(pct=True, ascending=False) * 100

# Metric 2: Churn (lower closure rate = higher score)
biz['churn_score'] = biz['historical_closure_rate'].rank(pct=True, ascending=False) * 100

# Metric 3: Stability (older competitors = higher score)
biz['stability_score'] = biz['avg_same_category_age_zip'].rank(pct=True) * 100

# Metric 4: Ecosystem diversity (higher diversity = higher score)
biz['diversity_score'] = biz['level2_diversity'].rank(pct=True) * 100

# Metric 5: Red flags (fewer flags + recent refresh = higher score)
biz['red_flag_raw'] = biz['flag_count'] + (biz['days_since_refresh'] / 365)
biz['red_flag_score'] = biz['red_flag_raw'].rank(pct=True, ascending=False) * 100

# Fill NaN scores with 50 (neutral — no data means average risk)
score_cols = ['saturation_score', 'churn_score', 'stability_score', 'diversity_score', 'red_flag_score']
biz[score_cols] = biz[score_cols].fillna(50)

# Overall score (weighted)
biz['overall_score'] = (
    biz['saturation_score'] * 0.23 +
    biz['churn_score'] * 0.6 +
    biz['diversity_score'] * 0.17
)

# Verdict
biz['verdict'] = biz['overall_score'].apply(
    lambda x: 'PROCEED' if x >= 65
    else ('PROCEED WITH CAUTION' if x >= 40
    else 'AVOID')
)


# ============================================
# STEP 7: Save for API
# ============================================
print("\nVerdict distribution:")
print(biz['verdict'].value_counts())

print("\nScore summary:")
print(biz['overall_score'].describe())

print("\nSample results:")
print(biz[['name', 'level2', 'zip_clean', 'overall_score', 'verdict']].head(20))

# Save
biz.to_csv('scored_businesses.csv', index=False)
print(f"\nSaved {len(biz)} businesses to scored_businesses.csv")