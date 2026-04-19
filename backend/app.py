from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

# Load pre-computed data
print("Loading scored businesses...")
df = pd.read_csv('scored_businesses.csv')
print(f"Loaded {len(df)} businesses")


# Endpoint 1: Search business by name
@app.route('/api/search')
def search():
    query = request.args.get('q', '')
    city = request.args.get('city', '')

    mask = (
    df['name'].str.contains(query, case=False, na=False) |
    df['locality'].str.contains(query, case=False, na=False) |
    df['level2'].str.contains(query, case=False, na=False)
)
    results = df[mask]
    if city:
        results = results[results['locality'].str.contains(city, case=False, na=False)]

    #debug
    total_matches = len(results)
    name_hits = df['name'].str.contains(query, case=False, na=False).sum()
    loc_hits = df['locality'].str.contains(query, case=False, na=False).sum()
    cat_hits = df['level2'].str.contains(query, case=False, na=False).sum()
    print(
        f"[search] q={query!r} city={city!r} | "
        f"name={name_hits} locality={loc_hits} category={cat_hits} "
        f"→ total={total_matches}, returning={min(total_matches, 10)}"
    )
    #debug end

    results = results.head(10)[['fsq_place_id', 'name', 'address', 'locality', 'zip_clean', 'level2', 'latitude', 'longitude']]
    return jsonify(results.to_dict('records'))


# Endpoint 2: Get full risk report
@app.route('/api/report/<place_id>')
def report(place_id):
    biz = df[df['fsq_place_id'] == place_id]
    if biz.empty:
        return jsonify({'error': 'Not found'}), 404

    b = biz.iloc[0]
    return jsonify({
        'business': {
            'name': b.get('name', ''),
            'address': b.get('address', ''),
            'locality': b.get('locality', ''),
            'region': b.get('region', ''),
            'postcode': b.get('zip_clean', ''),
            'latitude': float(b.get('latitude', 0)),
            'longitude': float(b.get('longitude', 0)),
            'category': b.get('primary_label', ''),
            'level1': b.get('level1', ''),
            'level2': b.get('level2', ''),
            'level3': b.get('level3', ''),
        },
        'verdict': b.get('verdict', ''),
        'overall_score': round(float(b.get('overall_score', 0)), 1),
        'scores': {
            'saturation': round(float(b.get('saturation_score', 0)), 1),
            'churn': round(float(b.get('churn_score', 0)), 1),
            'stability': round(float(b.get('stability_score', 0)), 1),
            'diversity': round(float(b.get('diversity_score', 0)), 1),
            'red_flags': round(float(b.get('red_flag_score', 0)), 1),
        },
        'details': {
            'competitors_in_zip': int(b.get('same_category_count_zip', 0)),
            'historical_closure_rate': round(float(b.get('historical_closure_rate', 0)), 3),
            'avg_competitor_age_years': round(float(b.get('avg_same_category_age_zip', 0)), 1),
            'ecosystem_diversity': int(b.get('level2_diversity', 0)),
            'population': int(b.get('population', 0)) if pd.notna(b.get('population')) else None,
            'businesses_per_10k': round(float(b.get('businesses_per_10k_people', 0)), 2) if pd.notna(b.get('businesses_per_10k_people')) else None,
        }
    })


# Endpoint 3: Get nearby competitors
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
    ][['name', 'address', 'latitude', 'longitude', 'date_created', 'level3']].head(20)

    return jsonify(nearby.to_dict('records'))


if __name__ == '__main__':
    app.run(debug=True, port=5001)