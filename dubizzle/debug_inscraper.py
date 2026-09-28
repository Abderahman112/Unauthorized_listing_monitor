"""Debug what parse_cards gets inside the actual scraper loop."""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import time, re, json

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
BASE_URL = "https://dubai.dubizzle.com/en/property-for-rent/residential/?" + "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)

@browser(headless=False, add_arguments=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"])
def debug(driver: Driver, data):
    driver.get(BASE_URL)

    # Wait for a listing card
    try:
        driver.wait_for_element('[data-testid^="listing-"]', wait=10)
        print("wait_for_element: SUCCESS")
    except Exception as e:
        print(f"wait_for_element FAILED: {e}")
        time.sleep(5)

    soup = soupify(driver)

    # All testids
    all_testids = [el.get("data-testid") for el in soup.select("[data-testid]") if el.get("data-testid")]
    listing_testids = [t for t in all_testids if re.match(r'^listing-\d+', t)]
    print(f"Total testids: {len(all_testids)}")
    print(f"listing-N testids: {listing_testids[:10]}")

    # Try each selector variant
    for sel in [
        'a[data-testid^="listing-"]',
        '[data-testid^="listing-"]',
        'a[data-testid^="listing-"][href*="/property-for-rent/residential/"]',
        'a[href*="/property-for-rent/residential/"]',
    ]:
        found = soup.select(sel)
        print(f"  '{sel}': {len(found)} elements")
        if found:
            el = found[0]
            print(f"    First: tag={el.name}, testid={el.get('data-testid')}, href={el.get('href','')[:60]}")

    # Save full HTML
    html = str(soup)
    with open("output/debug_inscraper.html", "w") as f:
        f.write(html)
    print(f"\nFull HTML saved: {len(html)} chars")

    # Check where listing-1 appears
    pos = html.find('listing-1')
    print(f"'listing-1' at position: {pos} (total length: {len(html)})")
    if pos > 0:
        print(f"Context: {html[max(0,pos-50):pos+200]}")

debug()
