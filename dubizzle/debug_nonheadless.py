"""Debug non-headless page load with longer wait."""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import time, re

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
URL = "https://dubai.dubizzle.com/en/property-for-rent/residential/?" + "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)

@browser(headless=False, add_arguments=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"])
def debug(driver: Driver, data):
    print(f"Loading: {URL}")
    driver.get(URL)

    # Wait longer and try multiple times
    for wait_sec in [3, 5, 8]:
        time.sleep(wait_sec)
        soup = soupify(driver)
        testids = [el.get("data-testid") for el in soup.select("[data-testid]") if el.get("data-testid")]
        listing_cards = [t for t in testids if re.match(r'^listing-\d+$', t)]
        title = soup.find("title")
        print(f"\n  After {sum([3,5,8][:([3,5,8].index(wait_sec)+1)]+[0])}s total:")
        print(f"  Page title: {title.get_text()[:80] if title else 'none'}")
        print(f"  data-testid count: {len(testids)}")
        print(f"  listing-N cards: {listing_cards[:5]}")

        incapsula = soup.find(string=re.compile("Incapsula|CAPTCHA|captcha", re.I))
        if incapsula:
            print(f"  !! Incapsula/CAPTCHA detected !!")

        if listing_cards:
            print("  SUCCESS - found listing cards")
            break

    # Save what we get
    with open("output/debug_nonheadless.html", "w") as f:
        f.write(str(soup)[:80000])
    print("\nSaved to output/debug_nonheadless.html")

debug()
