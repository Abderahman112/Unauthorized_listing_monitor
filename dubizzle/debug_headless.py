"""Check what Dubizzle serves in headless mode."""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import time, re

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
URL = "https://dubai.dubizzle.com/en/property-for-rent/residential/?" + "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)

@browser(headless=True, add_arguments=["--no-sandbox", "--disable-dev-shm-usage"])
def debug(driver: Driver, data):
    driver.get(URL)
    time.sleep(5)
    soup = soupify(driver)

    testids = sorted(set(el.get("data-testid") for el in soup.select("[data-testid]") if el.get("data-testid")))
    print(f"data-testid count: {len(testids)}")

    listing_ids = [t for t in testids if re.match(r'^listing-\d+$', t)]
    print(f"listing-N testids: {listing_ids[:10]}")

    cards = soup.select('a[data-testid^="listing-"]')
    print(f"a[data-testid^=listing-] count: {len(cards)}")

    # Check page title to detect CAPTCHA/block
    title = soup.find("title")
    print(f"Page title: {title.get_text() if title else 'none'}")

    # Save HTML
    with open("output/debug_headless.html", "w") as f:
        f.write(str(soup)[:50000])
    print("Saved first 50k chars to output/debug_headless.html")

debug()
