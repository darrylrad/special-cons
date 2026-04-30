import psycopg2
import os

DATABASE_URL = "postgresql://postgres.cyoeihmpmxuqsowrwprz:tipcyr-zapqo6-Wyrxep@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print("Adding index on level1...")
cur.execute("CREATE INDEX IF NOT EXISTS idx_businesses_level1 ON businesses (level1);")
print("Done.")

print("Adding composite index on (level1, overall_score)...")
cur.execute("CREATE INDEX IF NOT EXISTS idx_businesses_level1_score ON businesses (level1, overall_score DESC NULLS LAST);")
print("Done.")

cur.close()
conn.close()
print("All indexes created.")
