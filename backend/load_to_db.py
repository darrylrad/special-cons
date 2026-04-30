import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://localhost/gapmap"
#"postgresql://postgres.tdzhmmpmadrbqxvgalog:FXIiJEmv2aGuNdLf@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

print("Loading CSV...")
df = pd.read_csv(
    "scored_businesses.csv",
    dtype={"zip_clean": str, "postcode": str},
    low_memory=False,
)
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")

print("Uploading to Supabase (this takes a few minutes)...")
df.to_sql("businesses", engine, if_exists="replace", index=False, chunksize=1000)
print("Upload complete")

print("Creating indexes...")
with engine.connect() as conn:
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_fsq_place_id ON businesses (fsq_place_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_level1 ON businesses (level1)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_zip_clean ON businesses (zip_clean)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_overall_score ON businesses (overall_score DESC)"))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses
        USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(locality,'') || ' ' || coalesce(level2,'')))
    """))
    conn.commit()
print("Indexes created")

print("Done.")
