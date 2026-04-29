import psycopg2

# Uses the pooler — SET LOCAL disables the statement timeout within each transaction
# so the long-running CREATE INDEX can complete without being cancelled.
POOLER_URL = "postgresql://postgres.tdzhmmpmadrbqxvgalog:FXIiJEmv2aGuNdLf@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

conn = psycopg2.connect(POOLER_URL)
conn.autocommit = False

steps = [
    ("pg_trgm extension",   "CREATE EXTENSION IF NOT EXISTS pg_trgm"),
    ("name trigram index",  "CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin(name gin_trgm_ops)"),
    ("locality trigram index", "CREATE INDEX IF NOT EXISTS idx_businesses_locality_trgm ON businesses USING gin(locality gin_trgm_ops)"),
    ("level2 trigram index","CREATE INDEX IF NOT EXISTS idx_businesses_level2_trgm ON businesses USING gin(level2 gin_trgm_ops)"),
]

with conn.cursor() as cur:
    for label, sql in steps:
        print(f"Creating {label}...")
        cur.execute("SET LOCAL statement_timeout = 0")
        cur.execute(sql)
        conn.commit()
        print(f"  Done.")

conn.close()
print("\nAll done.")
