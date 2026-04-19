from flask import Flask, jsonify, request
import math
from datetime import datetime
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load pre-computed data
print("Loading scored businesses...")
df = pd.read_csv('scored_businesses.csv', dtype={'zip_clean': str}, low_memory=False)
print(f"Loaded {len(df)} businesses")

# Pre-compute age-in-years column once, on load. Saves recomputing on every
# search. Businesses with missing/unparseable dates get NaN — they'll simply
# not match any year range filter (which is correct behavior).
df['date_created_parsed'] = pd.to_datetime(df['date_created'], errors='coerce')
_now = pd.Timestamp.now()
df['age_years'] = (_now - df['date_created_parsed']).dt.days / 365.25

# Pre-compute sorted list of distinct level1 categories so /api/categories
# is effectively free to call.
_categories = sorted(df['level1'].dropna().unique().tolist())


def _clean_nan(records):
    """Replace float NaN with None in a list of dicts so jsonify can serialize.
    Pandas refuses to store None in float columns, so we clean post-conversion.
    """
    for row in records:
        for k, v in row.items():
            if isinstance(v, float) and math.isnan(v):
                row[k] = None
    return records


# ---------------------------------------------------------------------------
# Endpoint 1: Search with filters
#   q          — optional free-text, matches name/locality/level2
#   city       — optional, locality substring match
#   category   — optional, exact match against level1
#   min_years  — optional integer, business must be >= this age
#   max_years  — optional integer, business must be <= this age
# ---------------------------------------------------------------------------
@app.route('/api/search')
def search():
    query = request.args.get('q', '').strip()
    city = request.args.get('city', '').strip()
    category = request.args.get('category', '').strip()
    min_years = request.args.get('min_years', type=float)
    max_years = request.args.get('max_years', type=float)

    # Start with everything.
    results = df

    # Free-text search — across name, locality, and level2 category.
    if query:
        mask = (
            results['name'].str.contains(query, case=False, na=False) |
            results['locality'].str.contains(query, case=False, na=False) |
            results['level2'].str.contains(query, case=False, na=False)
        )
        results = results[mask]

    # City refinement.
    if city:
        results = results[
            results['locality'].str.contains(city, case=False, na=False)
        ]

    # Category: exact match on level1. We expect the frontend to pass the
    # exact value returned from /api/categories.
    if category:
        results = results[results['level1'] == category]

    # Year range — businesses with unknown age (NaN) are excluded when either
    # bound is specified, since we can't verify they fit.
    if min_years is not None:
        results = results[results['age_years'] >= min_years]
    if max_years is not None:
        results = results[results['age_years'] <= max_years]

    # Sort by overall_score descending so highest-quality matches come first.
    # This makes filter-only browses (no query text) immediately useful.
    if 'overall_score' in results.columns:
        results = results.sort_values('overall_score', ascending=False, na_position='last')

    total = len(results)

    # Cap at 25 for filter-driven browses (up from 10). Still protects the
    # wire from accidentally returning 400k rows.
    results = results.head(25)[
        ['fsq_place_id', 'name', 'address', 'locality', 'region',
         'zip_clean', 'level1', 'level2', 'latitude', 'longitude',
         'overall_score', 'verdict', 'age_years']
    ].copy()

    # Round age_years to 1 decimal so the frontend can show "3.2 years"
    # without having to trim long floats.
    results['age_years'] = results['age_years'].round(1)

    # Debug line — filters + hit counts.
    print(
        f"[search] q={query!r} city={city!r} cat={category!r} "
        f"years=[{min_years},{max_years}] → total={total}, returning={len(results)}"
    )

    return jsonify(_clean_nan(results.to_dict('records')))


# ---------------------------------------------------------------------------
# Endpoint 2 (new): list of level1 categories
# Used to populate the Category dropdown on the frontend.
# ---------------------------------------------------------------------------
@app.route('/api/categories')
def categories():
    return jsonify(_categories)


# ---------------------------------------------------------------------------
# Endpoint 3: Get full risk report (unchanged behavior, light NaN hardening)
# ---------------------------------------------------------------------------
@app.route('/api/report/<place_id>')
def report(place_id):
    biz = df[df['fsq_place_id'] == place_id]
    if biz.empty:
        return jsonify({'error': 'Not found'}), 404

    b = biz.iloc[0]

    def s(key, default=''):
        """Safe string getter — empty string for NaN."""
        v = b.get(key, default)
        return default if pd.isna(v) else v

    def f(key, default=0.0, digits=1):
        v = b.get(key, default)
        if pd.isna(v):
            return default
        return round(float(v), digits)

    def i(key, default=0):
        v = b.get(key, default)
        if pd.isna(v):
            return default
        return int(v)

    return jsonify({
        'business': {
            'name': s('name'),
            'address': s('address'),
            'locality': s('locality'),
            'region': s('region'),
            'postcode': s('zip_clean'),
            'latitude': f('latitude', 0, 6),
            'longitude': f('longitude', 0, 6),
            'category': s('primary_label'),
            'level1': s('level1'),
            'level2': s('level2'),
            'level3': s('level3'),
        },
        'verdict': s('verdict'),
        'overall_score': f('overall_score', 0, 1),
        'scores': {
            'saturation': f('saturation_score', 0, 1),
            'churn': f('churn_score', 0, 1),

            'diversity': f('diversity_score', 0, 1),

        },
        'details': {
            'competitors_in_zip': i('same_category_count_zip'),
            'historical_closure_rate': f('historical_closure_rate', 0, 3),
            'avg_competitor_age_years': f('avg_same_category_age_zip', 0, 1),
            'ecosystem_diversity': i('level2_diversity'),
            'population': i('population') if pd.notna(b.get('population')) else None,
            'businesses_per_10k': f('businesses_per_10k_people', 0, 2)
                if pd.notna(b.get('businesses_per_10k_people')) else None,
        }
    })


# ---------------------------------------------------------------------------
# Endpoint 4: Get nearby competitors (now with scores for popup)
# ---------------------------------------------------------------------------
@app.route('/api/competitors/<place_id>')
def competitors(place_id):
    biz = df[df['fsq_place_id'] == place_id]
    if biz.empty:
        return jsonify({'error': 'Not found'}), 404

    b = biz.iloc[0]
    nearby = df[
        (df['fsq_place_id'] != place_id) &
        (df['level2'] == b['level2']) &
        (df['zip_clean'] == b['zip_clean'])
    ][[
        'fsq_place_id', 'name', 'address', 'latitude', 'longitude',
        'date_created', 'level3',
        # Score data for the map popup
        'overall_score', 'verdict',
        'saturation_score', 'churn_score', 
        'diversity_score', 
    ]].head(20)

    return jsonify(_clean_nan(nearby.to_dict('records')))


if __name__ == '__main__':
    app.run(debug=True, port=5001)