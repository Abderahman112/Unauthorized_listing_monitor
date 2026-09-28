"""
Dubizzle stage 1 scraper — collects listing URLs and basic info.
Paginates via &page=N (175 pages, ~35 listings each ≈ 6,100 total).
Output: output/dubizzle_listings.json

Run: python3 dubizzle.py
"""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re, random

DEBUG = True  # Must run non-headless — Dubizzle uses Incapsula bot detection that blocks headless Chrome
               # On the server use: xvfb-run -a python3 -u dubizzle.py

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
BASE_PARAMS   = "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)
BASE_URL      = f"https://dubai.dubizzle.com/en/property-for-rent/residential/?{BASE_PARAMS}"

OUTPUT_FILE    = os.path.join(os.path.dirname(__file__), "output", "dubizzle_listings.json")
PROGRESS_FILE  = os.path.join(os.path.dirname(__file__), "output", "dubizzle_progress.json")


def build_url(page):
    return f"{BASE_URL}&page={page}"


def load_done():
    listings = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            data = json.load(f)
        listings = {l["url"]: l for l in data.get("listings", [])}
    last_page = 1
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE) as f:
            last_page = json.load(f).get("next_page", 1)
    return listings, last_page


def save(listings, next_page):
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"count": len(listings), "listings": list(listings.values())}, f, indent=2, ensure_ascii=False)
    with open(PROGRESS_FILE, "w") as f:
        json.dump({"next_page": next_page}, f)


def get_last_page(soup):
    """Read total page count from the last-page pagination button."""
    el = soup.select_one('[data-testid="page-last"]')
    if el:
        href = el.get("href", "")
        m = re.search(r'page=(\d+)', href)
        if m:
            return int(m.group(1))
    # fallback: highest page-N testid
    nums = [int(re.search(r'\d+', el.get("data-testid","")).group())
            for el in soup.select('[data-testid^="page-"]')
            if re.search(r'page-\d+', el.get("data-testid",""))]
    return max(nums) if nums else 1


def parse_cards(soup):
    cards = soup.select('a[data-testid^="listing-"]')
    results = {}
    for card in cards:
        href = card.get("href", "")
        url = f"https://dubai.dubizzle.com{href}" if href and not href.startswith("http") else href
        if not url:
            continue
        # Skip navigation/filter links (no date segment)
        if not re.search(r'\d{4}/\d+/\d+/', url):
            continue

        def txt(*testids):
            for tid in testids:
                el = card.select_one(f'[data-testid="{tid}"]')
                if el:
                    return el.get_text(strip=True)
            return None

        results[url] = {
            "url":      url,
            "title":    card.get("title") or txt("listing-title"),
            "price":    txt("listing-price"),
            "location": txt("listing-location"),
            "beds":     txt("listing-bedrooms"),
            "baths":    txt("listing-bathrooms"),
            "area":     txt("listing-size"),
        }
    return results


@browser(
    headless=not DEBUG,
    add_arguments=["--no-sandbox", "--disable-dev-shm-usage",
                   "--disable-blink-features=AutomationControlled"],
)
def scrape(driver: Driver, data):
    done, start_page = load_done()
    start_page = max(1, start_page)
    print(f"Already collected: {len(done)} listings | Resuming from page {start_page}")

    total_pages = 175  # known from page-last link; updated on first page load

    for page in range(start_page, total_pages + 1):
        url = build_url(page)
        print(f"\n[Page {page}/{total_pages}] ", end="", flush=True)

        try:
            driver.get(url)
            try:
                driver.wait_for_element('[data-testid^="listing-"]', wait=10)
            except Exception:
                time.sleep(5)

            soup = soupify(driver)

            # Update total pages on first load
            if page == start_page:
                detected = get_last_page(soup)
                if detected > 1:
                    total_pages = detected
                    print(f"(total pages: {total_pages}) ", end="")

            # Exit cleanly if Incapsula blocks — shell loop will restart with fresh browser
            if 'Incapsula' in str(soup)[:1000]:
                print(f"\n  [BLOCKED by Incapsula] Saving progress at page {page}, exiting for restart.")
                save(done, page)
                return list(done.values())

            cards = parse_cards(soup)

            if not cards:
                # Might be a soft block or genuine end — check next page before giving up
                print(f"  0 cards — checking if end of results...")
                save(done, page + 1)
                # Continue loop; if 3 consecutive empty pages, stop
                consecutive_empty = getattr(scrape, '_empty', 0) + 1
                scrape._empty = consecutive_empty
                if consecutive_empty >= 3:
                    print(f"  3 consecutive empty pages — done.")
                    break
            else:
                scrape._empty = 0
                new = {u: l for u, l in cards.items() if u not in done}
                done.update(new)
                print(f"{len(cards)} cards | {len(new)} new | Total: {len(done)}")
                save(done, page + 1)

        except Exception as e:
            print(f"  ERROR: {e}")
            save(done, page)

        # Random delay to avoid triggering rate limits
        time.sleep(random.uniform(4, 8))

    save(done, total_pages)
    print(f"\nDone. {len(done)} listings saved → {OUTPUT_FILE}")
    return list(done.values())


if __name__ == "__main__":
    scrape()
