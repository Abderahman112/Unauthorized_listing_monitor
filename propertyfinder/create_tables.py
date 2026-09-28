"""Create propertyfinder_listings and propertyfinder_matches tables via Supabase RPC."""
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wqaqbqsmyldzqjgdojsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
LISTINGS_SQL = """
create table if not exists propertyfinder_listings (
  id              bigserial primary key,
  url             text unique not null,
  community       text,
  title           text,
  price           text,
  price_value     numeric,
  price_period    text,
  location        text,
  beds            text,
  baths           text,
  beds_numeric    integer,
  baths_numeric   integer,
  area            text,
  area_sqft       numeric,
  property_type   text,
  agent_name      text,
  agency_name     text,
  reference       text,
  broker_license  text,
  agent_license   text,
  zone_name       text,
  listed_date     text,
  rental_available text,
  description     text,
  amenities       jsonb default '[]',
  photos          jsonb default '[]',
  created_at      timestamptz default now()
);
"""

MATCHES_SQL = """
create table if not exists propertyfinder_matches (
  id              bigserial primary key,
  dr_url          text,
  pf_url          text,
  score           numeric,
  score_beds      numeric,
  score_baths     numeric,
  score_size      numeric,
  score_price     numeric,
  building_match  boolean default false,
  is_authorized   boolean default false,
  created_at      timestamptz default now()
);
create index if not exists pf_matches_dr_url_idx on propertyfinder_matches(dr_url);
create index if not exists pf_matches_score_idx  on propertyfinder_matches(score desc);
"""

def run_sql(sb, sql, label):
    try:
        sb.rpc("exec_sql", {"sql": sql}).execute()
        print(f"  {label}: OK (via RPC)")
    except Exception as e:
        print(f"  {label}: RPC not available ({e})")
        print(f"  --> Run this SQL manually in Supabase SQL editor:")
        print(sql)

def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    run_sql(sb, LISTINGS_SQL, "propertyfinder_listings")
    run_sql(sb, MATCHES_SQL, "propertyfinder_matches")

if __name__ == "__main__":
    main()
