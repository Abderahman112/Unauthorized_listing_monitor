"""
PropertyFinder scraper — stage 1
Scrapes listing summaries from search results pages across multiple communities.
Output: output/propertyfinder_listings.json (all communities combined)
"""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json
import os
import time

DEBUG = True  # False for headless/server runs

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "output", "propertyfinder_listings.json")

# (name, location_id_or_None, target, extra_params)
# location_id=None → no l= filter (all Dubai)
COMMUNITIES = [
    ("The Gardens",        92,    500, ""),
    ("International City", 63,    600, ""),
    ("L913",              913,    600, ""),
    ("L9529",            9529,    600, ""),
    ("L9407",            9407,    600, ""),
    ("L8198",            8198,    600, ""),
    ("L1480",            1480,    600, ""),
    ("L556",              556,    600, ""),
    ("L2212",            2212,    600, ""),
    ("L825",              825,    600, ""),
    ("L555",              555,    600, ""),
    ("L10026",          10026,    600, ""),
]


def load_existing():
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            data = json.load(f)
        return data.get("listings", [])
    return []


def save(listings):
    with open(OUTPUT_FILE, "w") as f:
        json.dump({"count": len(listings), "listings": listings}, f, indent=2, ensure_ascii=False)


def parse_text(el):
    return el.get_text(strip=True) if el else None


def build_url(location_id, extra_params, page):
    base = "https://www.propertyfinder.ae/en/search?c=2&fu=0&rp=y&ob=mr"
    if location_id is not None:
        base += f"&l={location_id}"
    if extra_params:
        base += f"&{extra_params}"
    base += f"&page={page}"
    return base


def scrape_community(driver, community_name, location_id, target, extra_params, listings, seen_urls):
    community_count = 0
    page = 1

    print(f"\n{'='*50}")
    print(f"Community: {community_name} (target: {target})")
    print(f"{'='*50}")

    while community_count < target:
        url = build_url(location_id, extra_params, page)
        print(f"[Page {page}] {url}")
        driver.get(url)

        try:
            driver.wait_for_element('[data-testid="property-card"]', wait=15)
        except Exception:
            print(f"  No cards found on page {page} — stopping community")
            break

        time.sleep(2)
        soup = soupify(driver)
        cards = soup.select('[data-testid^="list-item-"]')
        print(f"  Found {len(cards)} cards")

        if not cards:
            break

        new_on_page = 0
        for card in cards:
            if community_count >= target:
                break

            link_el = card.select_one('[data-testid="property-card-link"]')
            if not link_el:
                continue
            href = link_el.get("href", "")
            if not href.startswith("http"):
                href = "https://www.propertyfinder.ae" + href
            if href in seen_urls:
                continue

            parts = href.rstrip("/").split("-")
            listing_id = parts[-1] if parts else None

            listing = {
                "url":           href,
                "community":     community_name,
                "listing_id":    listing_id,
                "title":         link_el.get("title") or parse_text(card.select_one('[data-testid="property-card-details"]')),
                "price":         parse_text(card.select_one('[data-testid="property-card-price"]')),
                "location":      parse_text(card.select_one('[data-testid="property-card-location"]')),
                "beds":          parse_text(card.select_one('[data-testid="property-card-spec-bedroom"]')),
                "baths":         parse_text(card.select_one('[data-testid="property-card-spec-bathroom"]')),
                "area":          parse_text(card.select_one('[data-testid="property-card-spec-area"]')),
                "property_type": parse_text(card.select_one('[data-testid="property-card-spec-propertyType"]')),
                "agent_name":    parse_text(card.select_one('h3')),
                "agency_name":   parse_text(card.select_one('p[class*="broker-name"]')),
            }

            listings.append(listing)
            seen_urls.add(href)
            new_on_page += 1
            community_count += 1
            print(f"  [{community_count}/{target}] {listing['location'] or listing['title'] or href[:70]}")

        save(listings)

        if new_on_page == 0:
            print("  No new listings — moving to next community")
            break

        page += 1
        time.sleep(2)

    print(f"  {community_name}: collected {community_count} listings")
    return community_count


@browser(
    headless=not DEBUG,
    add_arguments=["--no-sandbox", "--disable-dev-shm-usage"],
)
def scrape(driver: Driver, data):
    listings = load_existing()
    seen_urls = {l["url"] for l in listings}

    print(f"Resuming from {len(listings)} existing listings")

    for community_name, location_id, target, extra_params in COMMUNITIES:
        already = sum(1 for l in listings if l.get("community") == community_name)
        if already >= target:
            print(f"\nSkipping {community_name} — already have {already}/{target}")
            continue
        scrape_community(driver, community_name, location_id, target, extra_params, listings, seen_urls)

    print(f"\n{'='*50}")
    print(f"All done. Total listings: {len(listings)} → {OUTPUT_FILE}")
    return listings


if __name__ == "__main__":
    scrape()
