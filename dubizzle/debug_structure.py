"""Debug: dumps page HTML and finds all data-testid attributes on Dubizzle."""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import time, re, json

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
URL = "https://dubai.dubizzle.com/en/property-for-rent/residential/?" + "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)

@browser(headless=False, add_arguments=["--no-sandbox", "--disable-dev-shm-usage"])
def debug(driver: Driver, data):
    driver.get(URL)
    time.sleep(6)

    soup = soupify(driver)

    # All unique data-testid values on page
    testids = sorted(set(el.get("data-testid") for el in soup.select("[data-testid]") if el.get("data-testid")))
    print(f"\nAll data-testid values ({len(testids)}):")
    for t in testids:
        print(f"  {t}")

    # All links that look like property listings
    links = soup.select('a[href]')
    prop_links = [a.get("href") for a in links if "/property" in (a.get("href") or "") or re.search(r'/\d{5,}', a.get("href") or "")]
    print(f"\nProperty-like links ({len(prop_links)}):")
    for l in prop_links[:10]:
        print(f"  {l}")

    # Save full HTML for inspection
    with open("output/debug_page.html", "w") as f:
        f.write(str(soup))
    print("\nFull HTML saved to output/debug_page.html")

    # Check __NEXT_DATA__
    nd_script = soup.find("script", {"id": "__NEXT_DATA__"})
    if nd_script:
        nd = json.loads(nd_script.string)
        print("\n__NEXT_DATA__ top-level keys:", list(nd.get("props", {}).get("pageProps", {}).keys())[:15])
    else:
        print("\nNo __NEXT_DATA__ found")

debug()
