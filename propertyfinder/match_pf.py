"""
Matching engine for PropertyFinder listings vs DR portfolio.
Scores each PF listing against every DR property and stores results
in propertyfinder_matches table.

Scoring (same as Bayut engine):
  Beds match:          40 pts
  Baths match:         20 pts
  Size within ±20%:    up to 20 pts (linear)
  Price within ±20%:   up to 20 pts (linear)
  Max score:          100 pts

Thresholds:
  >= 95: critical
  >= 75: high-risk
  >= 60: monitor

Run: python3 match_pf.py
"""

import re
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wqaqbqsmyldzqjgdojsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
MIN_SCORE = 60


def fetch_all(sb, table, select="*"):
    rows, page, size = [], 0, 1000
    while True:
        res = sb.table(table).select(select).range(page * size, (page + 1) * size - 1).execute()
        rows += res.data
        if len(res.data) < size:
            break
        page += 1
    return rows


def parse_num(s):
    if s is None:
        return None
    m = re.search(r'[\d.]+', str(s).replace(',', ''))
    return float(m.group()) if m else None


def parse_beds(s):
    if s is None:
        return None
    s = str(s).lower()
    if "studio" in s:
        return 0
    m = re.search(r'\d+', s)
    return int(m.group()) if m else None


def score_match(dr, pf):
    score = score_beds = score_baths = score_size = score_price = 0

    dr_beds  = parse_beds(dr.get("beds"))
    pf_beds  = pf.get("beds_numeric")
    if dr_beds is not None and pf_beds is not None and dr_beds == pf_beds:
        score_beds = 40

    dr_baths = parse_num(dr.get("baths"))
    pf_baths = pf.get("baths_numeric")
    if dr_baths is not None and pf_baths is not None and dr_baths == pf_baths:
        score_baths = 20

    dr_size = parse_num(dr.get("size_sqft"))
    pf_size = pf.get("area_sqft")
    if dr_size and pf_size and dr_size > 0:
        ratio = abs(pf_size - dr_size) / dr_size
        if ratio <= 0.20:
            score_size = round(20 * (1 - ratio / 0.20))

    dr_price = parse_num(dr.get("price_aed"))
    pf_price = pf.get("price_value")
    if dr_price and pf_price and dr_price > 0:
        ratio = abs(pf_price - dr_price) / dr_price
        if ratio <= 0.20:
            score_price = round(20 * (1 - ratio / 0.20))

    score = score_beds + score_baths + score_size + score_price

    # Building match: share a keyword from location
    dr_loc = (dr.get("location") or "").lower()
    pf_loc = (pf.get("location") or "").lower()
    building_match = False
    if dr_loc and pf_loc:
        dr_words = set(w for w in re.split(r'[\s,\-]+', dr_loc) if len(w) > 3)
        pf_words = set(w for w in re.split(r'[\s,\-]+', pf_loc) if len(w) > 3)
        building_match = bool(dr_words & pf_words)

    return {
        "score":         score,
        "score_beds":    score_beds,
        "score_baths":   score_baths,
        "score_size":    score_size,
        "score_price":   score_price,
        "building_match": building_match,
    }


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Fetching DR portfolio...")
    dr_listings = fetch_all(sb, "dubai_residentials_full")
    print(f"  {len(dr_listings)} DR properties")

    print("Fetching PropertyFinder listings...")
    pf_listings = fetch_all(sb, "propertyfinder_listings")
    print(f"  {len(pf_listings)} PF listings")

    # Clear existing matches
    sb.table("propertyfinder_matches").delete().gte("id", 0).execute()
    print("Cleared old matches")

    total_matches = 0
    BATCH = 200

    for i, dr in enumerate(dr_listings):
        matches = []
        for pf in pf_listings:
            s = score_match(dr, pf)
            if s["score"] >= MIN_SCORE:
                matches.append({
                    "dr_url":        dr["url"],
                    "pf_url":        pf["url"],
                    "score":         s["score"],
                    "score_beds":    s["score_beds"],
                    "score_baths":   s["score_baths"],
                    "score_size":    s["score_size"],
                    "score_price":   s["score_price"],
                    "building_match": s["building_match"],
                    "is_authorized": False,
                })

        for j in range(0, len(matches), BATCH):
            sb.table("propertyfinder_matches").insert(matches[j:j+BATCH]).execute()

        total_matches += len(matches)
        if (i + 1) % 50 == 0 or i == len(dr_listings) - 1:
            print(f"  [{i+1}/{len(dr_listings)}] DR props processed — {total_matches} matches so far")

    print(f"\nDone. {total_matches} matches stored in propertyfinder_matches.")


if __name__ == "__main__":
    main()
