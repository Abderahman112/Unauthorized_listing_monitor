"""
PropertyFinder scraper — stage 2 (detail)
Visits each listing URL from propertyfinder_listings.json and extracts full details.
Output: output/propertyfinder_listings_full.json

Run with DEBUG=True to watch the browser.
"""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json
import os
import time

DEBUG = False  # Set True to watch the browser

INPUT_FILE  = os.path.join(os.path.dirname(__file__), "output", "propertyfinder_listings.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "output", "propertyfinder_listings_full.json")


def load_listings():
    with open(INPUT_FILE) as f:
        return json.load(f).get("listings", [])


def load_done():
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            done = json.load(f)
        return {d["url"]: d for d in done}
    return {}


def save(results):
    with open(OUTPUT_FILE, "w") as f:
        json.dump(list(results.values()), f, indent=2, ensure_ascii=False)


def get_text(soup, *testids):
    for testid in testids:
        el = soup.select_one(f'[data-testid="{testid}"]')
        if not el:
            continue
        # Regulatory fields: testid is on <dt>, value is in the next <dd>
        if el.name == 'dt':
            dd = el.find_next_sibling('dd')
            return dd.get_text(strip=True) if dd else None
        return el.get_text(strip=True)
    return None


def get_next_property(soup):
    script = soup.find('script', {'id': '__NEXT_DATA__'})
    if not script:
        return {}
    try:
        nd = json.loads(script.string)
        return nd['props']['pageProps']['propertyResult']['property'] or {}
    except Exception:
        return {}


def get_price_from_next_data(prop):
    try:
        price = prop['price']
        value = price.get('value')
        period = price.get('period', '')
        currency = price.get('currency', 'AED')
        if value:
            return f"{value:,}", f"{currency}/{period}"
    except Exception:
        pass
    return None, None


def get_agent_from_next_data(prop):
    try:
        return prop['agent']['name']
    except Exception:
        return None


def get_photos(soup):
    imgs = soup.select('img[elementtiming*="gallery"]')
    seen = set()
    photos = []
    for img in imgs:
        src = img.get("src") or img.get("data-src") or ""
        if src and src not in seen and ("static.shared" in src or "propertyfinder" in src):
            seen.add(src)
            photos.append(src)
    return photos


def get_amenities(soup):
    section = soup.select_one('[data-testid="amenities-section"]')
    if not section:
        return []
    return [el.get_text(strip=True) for el in section.select('[data-testid^="amenity-"]')]


@browser(
    headless=not DEBUG,
    add_arguments=["--no-sandbox", "--disable-dev-shm-usage"],
)
def scrape_details(driver: Driver, data):
    listings = load_listings()
    done = load_done()

    remaining = [l for l in listings if l["url"] not in done]
    print(f"Total: {len(listings)} | Already done: {len(done)} | To scrape: {len(remaining)}")

    for i, listing in enumerate(remaining):
        url = listing["url"]
        print(f"\n[{i+1}/{len(remaining)}] {url}")

        try:
            driver.get(url)
            driver.wait_for_element('script#__NEXT_DATA__', wait=10)
            time.sleep(1)

            soup = soupify(driver)
            prop = get_next_property(soup)

            price_val = get_text(soup, "property-price-value")
            price_per = get_text(soup, "property-price-period")
            if not price_val:
                price_val, price_per = get_price_from_next_data(prop)

            agent = get_text(soup, "property-detail-agent-name") or get_agent_from_next_data(prop)

            rera = (prop.get('rera') or {}) if prop else {}

            result = {
                **listing,
                "price_value":         price_val,
                "price_period":        price_per,
                "agent_name":          agent,
                "reference":           get_text(soup, "regulatory_reference", "property-regulatory-reference"),
                "authority":           get_text(soup, "regulatory_authority_name"),
                "broker_license":      get_text(soup, "regulatory_broker_license"),
                "agent_license":       get_text(soup, "regulatory_agent_license_from_licenses"),
                "zone_name":           get_text(soup, "regulatory_zone_name"),
                "listed_date":         get_text(soup, "regulatory_listed"),
                "rental_available":    get_text(soup, "property-details-rental-availability-date"),
                "description":         get_text(soup, "description-section"),
                "amenities":           get_amenities(soup),
                "photos":              get_photos(soup),
                "permit_number":       rera.get('number') or None,
                "permit_validation_url": rera.get('permit_validation_url') or None,
            }

            print(f"  Price: {result['price_value']} | Agent: {result['agent_name']} | Permit: {result['permit_number']}")

            done[url] = result
            save(done)

        except Exception as e:
            print(f"  ERROR: {e}")
            done[url] = {**listing, "error": str(e)}
            save(done)

        time.sleep(1)

    print(f"\nDone. {len(done)} listings saved → {OUTPUT_FILE}")
    return list(done.values())


if __name__ == "__main__":
    scrape_details()
