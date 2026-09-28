"""
Upload PropertyFinder listings to Supabase.
Creates table if needed, upserts all records.

Run: python3 upload_to_supabase.py
"""

import json, re, os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wqaqbqsmyldzqjgdojsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
INPUT_FILE = os.path.join(os.path.dirname(__file__), "output", "propertyfinder_listings_full.json")

COMMUNITY_NAMES = {
    "L913":   "Jebel Ali Village",
    "L9529":  "City Walk",
    "L9407":  "Bluewaters",
    "L8198":  "Remraam",
    "L556":   "Al Jaddaf",
    "L2212":  "Al Quoz",
    "L825":   "Dubai Waterfront",
    "L555":   "Culture Village",
    "L10026": "Meydan Avenue",
}


def parse_beds(s):
    if not s:
        return None
    s = str(s).lower().strip()
    if "studio" in s:
        return 0
    m = re.search(r'\d+', s)
    return int(m.group()) if m else None


def parse_baths(s):
    if not s:
        return None
    m = re.search(r'\d+', str(s))
    return int(m.group()) if m else None


def parse_area(s):
    if not s:
        return None
    m = re.search(r'[\d,]+', str(s).replace(',', ''))
    if not m:
        m = re.search(r'([\d,]+)', str(s))
    if m:
        return float(m.group().replace(',', ''))
    return None


def parse_price(s):
    if not s:
        return None
    return float(str(s).replace(',', '').strip()) if re.search(r'\d', str(s)) else None


def clean(listing):
    community_raw = listing.get("community", "")
    community = COMMUNITY_NAMES.get(community_raw, community_raw)

    return {
        "url":             listing.get("url"),
        "community":       community,
        "title":           listing.get("title"),
        "price":           listing.get("price"),
        "price_value":     parse_price(listing.get("price_value")),
        "price_period":    listing.get("price_period"),
        "location":        listing.get("location"),
        "beds":            listing.get("beds"),
        "baths":           listing.get("baths"),
        "beds_numeric":    parse_beds(listing.get("beds")),
        "baths_numeric":   parse_baths(listing.get("baths")),
        "area":            listing.get("area"),
        "area_sqft":       parse_area(listing.get("area")),
        "property_type":   listing.get("property_type"),
        "agent_name":      listing.get("agent_name"),
        "agency_name":     listing.get("agency_name"),
        "reference":       listing.get("reference"),
        "broker_license":  listing.get("broker_license"),
        "agent_license":   listing.get("agent_license"),
        "zone_name":       listing.get("zone_name"),
        "listed_date":     listing.get("listed_date"),
        "rental_available": listing.get("rental_available"),
        "description":     (listing.get("description") or "")[:2000],
        "amenities":       listing.get("amenities") or [],
        "photos":          (listing.get("photos") or [])[:10],
    }


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    with open(INPUT_FILE) as f:
        raw = json.load(f)

    records = [clean(l) for l in raw if "error" not in l and l.get("url")]
    print(f"Loaded {len(records)} records")

    BATCH = 100
    for i in range(0, len(records), BATCH):
        batch = records[i:i+BATCH]
        sb.table("propertyfinder_listings").upsert(batch, on_conflict="url").execute()
        print(f"  Uploaded {min(i+BATCH, len(records))}/{len(records)}")

    print(f"\nDone. {len(records)} listings in propertyfinder_listings table.")


if __name__ == "__main__":
    main()
