import psycopg2
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/gapmap")

print(f"Connecting to: {DATABASE_URL[:40]}...")
conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print("Enabling pg_trgm extension...")
cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

indexes = [
    ("idx_businesses_name_trgm",     "CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin(name gin_trgm_ops)"),
    ("idx_businesses_locality_trgm", "CREATE INDEX IF NOT EXISTS idx_businesses_locality_trgm ON businesses USING gin(locality gin_trgm_ops)"),
    ("idx_businesses_level2_trgm",   "CREATE INDEX IF NOT EXISTS idx_businesses_level2_trgm ON businesses USING gin(level2 gin_trgm_ops)"),
]

for name, sql in indexes:
    print(f"Creating {name}...")
    cur.execute(sql)
    print(f"  done.")

cur.close()
conn.close()
print("\nAll indexes created.")
