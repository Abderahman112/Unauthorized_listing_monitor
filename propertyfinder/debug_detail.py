"""Quick debug: dump the regulatory section HTML to understand the structure."""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import time

URL = "https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-dubai-the-gardens-the-gardens-buildings-the-gardens-building-73-121104023.html"

@browser(headless=False, add_arguments=["--no-sandbox", "--disable-dev-shm-usage"])
def debug(driver: Driver, data):
    driver.get(URL)
    driver.wait_for_element('[data-testid="property-price-value"]', wait=15)
    time.sleep(3)
    soup = soupify(driver)

    # Find regulatory section
    reg = soup.select_one('[data-testid="regulatory_reference"]')
    if reg:
        # Print parent context
        print("=== regulatory_reference element ===")
        print(repr(str(reg.parent)[:2000]))
    else:
        print("regulatory_reference not found")

    # Also check table-body
    table = soup.select_one('[data-testid="table-body"]')
    if table:
        print("\n=== table-body ===")
        print(repr(str(table)[:2000]))

debug()
