import psycopg2

# Direct connection URL — get this from:
# Supabase dashboard → Project Settings → Database → Connection string → URI
# It looks like: postgresql://postgres:PASSWORD@db.PROJECTREF.supabase.co:5432/postgres
DIRECT_URL = "postgresql://postgres:[YOUR-PASSWORD]@db.tdzhmmpmadrbqxvgalog.supabase.co:5432/postgres"

BATCH_SIZE = 50_000

conn = psycopg2.connect(DIRECT_URL)
conn.autocommit = True

with conn.cursor() as cur:
    cur.execute("SET statement_timeout = 0")

    cur.execute("SELECT COUNT(*) FROM businesses WHERE geog IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL")
    total = cur.fetchone()[0]
    print(f"Rows to update: {total:,}")

    updated = 0
    while True:
        cur.execute("""
            UPDATE businesses
            SET geog = ST_MakePoint(longitude::float, latitude::float)::geography
            WHERE fsq_place_id IN (
                SELECT fsq_place_id FROM businesses
                WHERE geog IS NULL AND latitude IS NOT NULL AND longitude IS NOT NULL
                LIMIT %s
            )
        """, (BATCH_SIZE,))
        rows = cur.rowcount
        if rows == 0:
            break
        updated += rows
        print(f"  Updated {updated:,} / {total:,}")

    print("Creating spatial index...")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_businesses_geog ON businesses USING GIST(geog)")
    print("Done.")

conn.close()
