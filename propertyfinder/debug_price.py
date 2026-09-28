from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, time

# Test with an apartment and a villa
URLS = [
    "https://www.propertyfinder.ae/en/plp/rent/apartment-for-rent-dubai-the-gardens-the-gardens-buildings-the-gardens-building-73-121104023.html",
    "https://www.propertyfinder.ae/en/plp/rent/villa-for-rent-dubai-jebel-ali-jebel-ali-village-jebel-ali-village-villas-124290008.html",
]

@browser(headless=True, add_arguments=["--no-sandbox", "--disable-dev-shm-usage"])
def debug(driver: Driver, data):
    for url in URLS:
        driver.get(url)
        time.sleep(6)
        soup = soupify(driver)
        nd = json.loads(soup.find('script', {'id': '__NEXT_DATA__'}).string)
        prop = nd['props']['pageProps']['propertyResult']['property']
        print(f"\nURL: {url[-60:]}")
        print(f"  rera:      {prop.get('rera')}")
        print(f"  reference: {prop.get('reference')}")
        print(f"  licenses:  {prop.get('licenses')}")
        print(f"  regulatory_details: {prop.get('regulatory_details')}")

debug()
