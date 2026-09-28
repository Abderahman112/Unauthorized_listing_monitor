"""
PropertyFinder permit conflict detection.

Finds PF listings whose DLD permit number matches a permit in the
permit_conflicts table (confirmed unauthorized Bayut listings of DR units).

Same permit on a PF listing = same physical unit being listed on two
platforms by unauthorized agents.

Results stored in propertyfinder_conflicts table.

Run: python3 conflicts_pf.py
"""

import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wqaqbqsmyldzqjgdojsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
CREATE_TABLE_SQL = """
create table if not exists propertyfinder_conflicts (
  id                  bigserial primary key,
  permit_number       text not null,
  pf_url              text not null,
  pf_title            text,
  pf_price            text,
  pf_location         text,
  pf_agent_name       text,
  pf_agency_name      text,
  pf_community        text,
  pf_beds             text,
  pf_baths            text,
  pf_area             text,
  bayut_url           text,
  bayut_agent         text,
  bayut_agency        text,
  dr_url              text,
  created_at          timestamptz default now()
);
alter table propertyfinder_conflicts disable row level security;
"""


def fetch_all(sb, table, select="*", filters=None):
    rows, page, size = [], 0, 1000
    while True:
        q = sb.table(table).select(select)
        if filters:
            for col, val in filters.items():
                q = q.eq(col, val)
        res = q.range(page * size, (page + 1) * size - 1).execute()
        rows += res.data
        if len(res.data) < size:
            break
        page += 1
    return rows


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Try to create the table
    try:
        sb.rpc("exec_sql", {"sql": CREATE_TABLE_SQL}).execute()
        print("Table ready (via RPC)")
    except Exception:
        print("Note: run CREATE_TABLE_SQL manually in Supabase SQL editor if table doesn't exist")

    # 1. Get all known conflict permit numbers from the Bayut permit_conflicts table
    print("\nFetching Bayut permit conflicts...")
    bayut_conflicts = fetch_all(sb, "permit_conflicts")
    print(f"  {len(bayut_conflicts)} Bayut permit conflicts")

    # Build lookup: permit_number → conflict row
    permit_to_bayut = {}
    for row in bayut_conflicts:
        pn = (row.get("permit_number") or "").strip()
        if pn:
            permit_to_bayut[pn] = row

    print(f"  {len(permit_to_bayut)} unique permit numbers")

    # 2. Get all PF listings that have a permit number
    print("\nFetching PF listings with permit numbers...")
    pf_listings = fetch_all(sb, "propertyfinder_listings",
                            select="url,permit_number,title,price,location,agent_name,agency_name,community,beds,baths,area")
    pf_with_permit = [l for l in pf_listings if l.get("permit_number")]
    print(f"  {len(pf_listings)} total PF listings | {len(pf_with_permit)} have a permit number")

    # 3. Find intersections
    conflicts = []
    for pf in pf_with_permit:
        pn = (pf.get("permit_number") or "").strip()
        if pn in permit_to_bayut:
            bayut = permit_to_bayut[pn]
            conflicts.append({
                "permit_number": pn,
                "pf_url":        pf["url"],
                "pf_title":      pf.get("title"),
                "pf_price":      pf.get("price"),
                "pf_location":   pf.get("location"),
                "pf_agent_name": pf.get("agent_name"),
                "pf_agency_name":pf.get("agency_name"),
                "pf_community":  pf.get("community"),
                "pf_beds":       pf.get("beds"),
                "pf_baths":      pf.get("baths"),
                "pf_area":       pf.get("area"),
                "bayut_url":     bayut.get("listing_url") or bayut.get("url"),
                "bayut_agent":   bayut.get("agent_name"),
                "bayut_agency":  bayut.get("agency_name"),
                "dr_url":        bayut.get("dr_url"),
            })

    print(f"\nFound {len(conflicts)} PF listings matching known Bayut conflict permits")

    if not conflicts:
        print("No conflicts found yet — permit scrape may still be in progress.")
        return

    # 4. Clear old results and insert
    sb.table("propertyfinder_conflicts").delete().gte("id", 0).execute()
    BATCH = 100
    for i in range(0, len(conflicts), BATCH):
        sb.table("propertyfinder_conflicts").insert(conflicts[i:i+BATCH]).execute()

    print(f"Stored {len(conflicts)} conflicts in propertyfinder_conflicts table.")

    # Summary
    agencies = {}
    for c in conflicts:
        a = c.get("pf_agency_name") or "Unknown"
        agencies[a] = agencies.get(a, 0) + 1
    print("\nTop agencies with PF conflicts:")
    for agency, count in sorted(agencies.items(), key=lambda x: -x[1])[:10]:
        print(f"  {count:3d}  {agency}")


if __name__ == "__main__":
    main()
