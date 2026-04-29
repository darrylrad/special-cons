from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
import psycopg2.pool
import os
import math
from contextlib import contextmanager

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

_pool = psycopg2.pool.ThreadedConnectionPool(1, 10, DATABASE_URL)


@contextmanager
def get_conn():
    conn = _pool.getconn()
    try:
        yield conn
    finally:
        _pool.putconn(conn)


def _rows(cursor):
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


# ---------------------------------------------------------------------------
# Endpoint 1: Search with filters
# ---------------------------------------------------------------------------
@app.route('/api/search')
def search():
    query = request.args.get('q', '').strip()
    city = request.args.get('city', '').strip()
    category = request.args.get('category', '').strip()
    min_years = request.args.get('min_years', type=float)
    max_years = request.args.get('max_years', type=float)

    conditions = []
    params = []

    if query:
        conditions.append(
            "(name ILIKE %s OR locality ILIKE %s OR level2 ILIKE %s)"
        )
        like = f"%{query}%"
        params += [like, like, like]

    if city:
        conditions.append("locality ILIKE %s")
        params.append(f"%{city}%")

    if category:
        conditions.append("level1 = %s")
        params.append(category)

    if min_years is not None:
        conditions.append(
            "(date_part('day', now() - date_created::timestamp) / 365.25)::numeric >= %s"
        )
        params.append(min_years)

    if max_years is not None:
        conditions.append(
            "(date_part('day', now() - date_created::timestamp) / 365.25)::numeric <= %s"
        )
        params.append(max_years)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    sql = f"""
        SELECT fsq_place_id, name, address, locality, region,
               zip_clean, level1, level2, latitude, longitude,
               overall_score, verdict,
               round((date_part('day', now() - date_created::timestamp) / 365.25)::numeric, 1) AS age_years
        FROM businesses
        {where}
        ORDER BY overall_score DESC NULLS LAST
        LIMIT 25
    """

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            results = _rows(cur)

    print(f"[search] q={query!r} city={city!r} cat={category!r} years=[{min_years},{max_years}] → {len(results)} results")
    return jsonify(results)


# ---------------------------------------------------------------------------
# Endpoint 2: List of level1 categories
# ---------------------------------------------------------------------------
@app.route('/api/categories')
def categories():
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT level1 FROM businesses WHERE level1 IS NOT NULL ORDER BY level1")
            results = [row[0] for row in cur.fetchall()]
    return jsonify(results)


# ---------------------------------------------------------------------------
# Endpoint 3: Full risk report
# ---------------------------------------------------------------------------
@app.route('/api/report/<place_id>')
def report(place_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM businesses WHERE fsq_place_id = %s LIMIT 1", (place_id,))
            rows = _rows(cur)

    if not rows:
        return jsonify({'error': 'Not found'}), 404

    b = rows[0]

    def s(key, default=''):
        v = b.get(key)
        return default if v is None else str(v)

    def f(key, default=0.0, digits=1):
        v = b.get(key)
        return default if v is None else round(float(v), digits)

    def i(key, default=0):
        v = b.get(key)
        return default if v is None else int(v)

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
            'competitors_nearby': i('same_category_count_radius'),
            'historical_closure_rate': f('historical_closure_rate', 0, 3),
            'avg_competitor_age_years': f('avg_same_category_age_radius', 0, 1),
            'ecosystem_diversity': i('level2_diversity_radius'),
            'population': i('population') if b.get('population') is not None else None,
            'businesses_per_10k': f('businesses_per_10k_people', 0, 2) if b.get('businesses_per_10k_people') is not None else None,
        }
    })


# ---------------------------------------------------------------------------
# Endpoint 4: Nearby competitors
# ---------------------------------------------------------------------------
RADIUS_M = 1000
# 1 km in degrees — lat delta is fixed, lng delta accounts for latitude shrinkage.
# We use a slightly generous box (1.2x) so the bounding box never clips the circle edge.
_LAT_DELTA = (RADIUS_M / 111_111) * 1.2

@app.route('/api/competitors/<place_id>')
def competitors(place_id):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT latitude, longitude, level2 FROM businesses WHERE fsq_place_id = %s LIMIT 1",
                (place_id,)
            )
            rows = _rows(cur)

            if not rows:
                return jsonify({'error': 'Not found'}), 404

            b = rows[0]
            if b['latitude'] is None or b['longitude'] is None:
                return jsonify([])

            lat = float(b['latitude'])
            lng = float(b['longitude'])
            lng_delta = _LAT_DELTA / math.cos(math.radians(lat))

            # Bounding box pre-filter uses indexed lat/lng columns to narrow candidates,
            # then ST_DWithin does the precise 1 km circle check on the small result set.
            cur.execute("""
                SELECT fsq_place_id, name, address, latitude, longitude,
                       date_created, level3, overall_score, verdict,
                       saturation_score, churn_score, diversity_score
                FROM businesses
                WHERE fsq_place_id != %s
                  AND level2 = %s
                  AND latitude  BETWEEN %s AND %s
                  AND longitude BETWEEN %s AND %s
                  AND ST_DWithin(
                        ST_MakePoint(longitude::float, latitude::float)::geography,
                        ST_MakePoint(%s, %s)::geography,
                        %s
                      )
                ORDER BY ST_Distance(
                        ST_MakePoint(longitude::float, latitude::float)::geography,
                        ST_MakePoint(%s, %s)::geography
                       ) ASC
                LIMIT 20
            """, (
                place_id, b['level2'],
                lat - _LAT_DELTA, lat + _LAT_DELTA,
                lng - lng_delta,  lng + lng_delta,
                lng, lat, RADIUS_M,
                lng, lat,
            ))
            results = _rows(cur)

    return jsonify(results)


if __name__ == '__main__':
    app.run(debug=True, port=5001)
