"""Check if page 28+ have listings or if we hit a wall."""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import re, time

NEIGHBORHOODS = [84, 66, 89, 64126, 65636, 62028, 189, 62449, 62237, 190, 64, 94]
BASE = "https://dubai.dubizzle.com/en/property-for-rent/residential/?" + "&".join(f"neighborhood={n}" for n in NEIGHBORHOODS)

@browser(headless=False, add_arguments=["--no-sandbox", "--disable-dev-shm-usage", "--disable-blink-features=AutomationControlled"])
def check(driver: Driver, data):
    for page in [28, 29, 30]:
        url = f"{BASE}&page={page}"
        driver.get(url)
        try:
            driver.wait_for_element('[data-testid^="listing-"]', wait=8)
        except Exception:
            time.sleep(4)
        soup = soupify(driver)
        cards = [c for c in soup.select('a[data-testid^="listing-"]') if re.search(r'\d{4}/\d+/\d+/', c.get('href',''))]
        title = (soup.find('title') or {}).get_text('') if soup.find('title') else 'no title'
        incap = 'BLOCKED' if 'Incapsula' in str(soup)[:500] else 'OK'
        print(f"Page {page}: {len(cards)} cards | {incap} | {title[:60]}")
        time.sleep(2)

check()
