import pandas as pd
from sqlalchemy import create_engine, text

DATABASE_URL = "postgresql://postgres.tdzhmmpmadrbqxvgalog:FXIiJEmv2aGuNdLf@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
# "postgresql://localhost/gapmap"

print("Connecting to database...")
engine = create_engine(DATABASE_URL)

print("Loading CSV...")
df = pd.read_csv(
    "scored_businesses.csv",
    dtype={"zip_clean": str, "postcode": str},
    low_memory=False,
)
print(f"Loaded {len(df):,} rows, {len(df.columns)} columns")

print("Uploading to database (this takes a few minutes)...")
df.to_sql("businesses", engine, if_exists="replace", index=False, chunksize=1000)
print("Upload complete")

# Use autocommit so each DDL/DML statement commits immediately.
# This prevents a timeout on the heavy UPDATE from rolling back the preceding indexes.
print("Creating indexes and spatial column...")
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    print("  PostGIS enabled")

    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_fsq_place_id ON businesses (fsq_place_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_level1 ON businesses (level1)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_level2 ON businesses (level2)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_overall_score ON businesses (overall_score DESC)"))
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_businesses_search ON businesses
        USING gin(to_tsvector('english', coalesce(name,'') || ' ' || coalesce(locality,'') || ' ' || coalesce(level2,'')))
    """))
    print("  Standard indexes created")

    conn.execute(text("ALTER TABLE businesses ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)"))
    print("  Geography column added — populating (this takes ~2 min)...")

    # Disable statement timeout for this connection before the heavy UPDATE
    conn.execute(text("SET statement_timeout = 0"))
    conn.execute(text("""
        UPDATE businesses
        SET geog = ST_MakePoint(longitude, latitude)::geography
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
    """))
    print("  Geography column populated")

    conn.execute(text("CREATE INDEX IF NOT EXISTS idx_businesses_geog ON businesses USING GIST(geog)"))
    print("  Spatial GIST index created")

print("Done.")
