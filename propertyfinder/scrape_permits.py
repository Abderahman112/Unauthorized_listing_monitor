"""
Targeted permit-number scraper for PropertyFinder.
Fetches all listing URLs from Supabase, visits each page,
extracts rera.number from __NEXT_DATA__, and upserts permit_number back.

Run: python3 scrape_permits.py
"""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, time
import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://wqaqbqsmyldzqjgdojsg.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
DONE_FILE = "output/permits_done.json"


def fetch_all_urls(sb):
    rows, page, size = [], 0, 1000
    while True:
        res = sb.table("propertyfinder_listings").select("url, permit_number").range(page * size, (page + 1) * size - 1).execute()
        rows += res.data
        if len(res.data) < size:
            break
        page += 1
    return rows


def load_done():
    try:
        with open(DONE_FILE) as f:
            return set(json.load(f))
    except Exception:
        return set()


def save_done(done):
    with open(DONE_FILE, "w") as f:
        json.dump(list(done), f)


def get_permit(soup):
    try:
        nd = json.loads(soup.find('script', {'id': '__NEXT_DATA__'}).string)
        prop = nd['props']['pageProps']['propertyResult']['property']
        return (prop.get('rera') or {}).get('number') or None
    except Exception:
        return None


@browser(
    headless=True,
    add_arguments=["--no-sandbox", "--disable-dev-shm-usage"],
)
def scrape_permits(driver: Driver, data):
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    print("Fetching URLs from Supabase...")
    rows = fetch_all_urls(sb)
    # Only scrape rows that don't already have a permit number
    todo = [r for r in rows if not r.get("permit_number")]
    print(f"Total: {len(rows)} | Already have permit: {len(rows) - len(todo)} | To scrape: {len(todo)}")

    done = load_done()
    remaining = [r for r in todo if r["url"] not in done]
    print(f"Done this session: {len(done)} | Remaining: {len(remaining)}")

    for i, row in enumerate(remaining):
        url = row["url"]
        print(f"\n[{i+1}/{len(remaining)}] {url[-80:]}")

        try:
            driver.get(url)
            driver.wait_for_element('script#__NEXT_DATA__', wait=10)
            time.sleep(0.5)

            soup = soupify(driver)
            permit = get_permit(soup)

            if permit:
                sb.table("propertyfinder_listings").update({"permit_number": permit}).eq("url", url).execute()
                print(f"  Permit: {permit} ✓")
            else:
                print(f"  Permit: (none)")

            done.add(url)
            if (i + 1) % 20 == 0:
                save_done(done)

        except Exception as e:
            print(f"  ERROR: {e}")

        time.sleep(0.5)

    save_done(done)
    print(f"\nDone. Processed {len(remaining)} listings.")


if __name__ == "__main__":
    scrape_permits()
