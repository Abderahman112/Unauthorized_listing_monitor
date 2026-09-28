"""
Dubizzle stage 2 scraper — visits each listing URL and extracts full details.
Extracts DLD permit number from __NEXT_DATA__ and DOM fallbacks.
Output: output/dubizzle_listings_full.json

Run: python3 detail_scrape.py
"""

from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

DEBUG = True  # Must run non-headless — Dubizzle uses Incapsula bot detection that blocks headless Chrome
               # On the server use: xvfb-run -a python3 -u detail_scrape.py

INPUT_FILE  = os.path.join(os.path.dirname(__file__), "output", "dubizzle_listings.json")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "output", "dubizzle_listings_full.json")


def load_listings():
    with open(INPUT_FILE) as f:
        return json.load(f).get("listings", [])


def load_done():
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE) as f:
            data = json.load(f)
        return {d["url"]: d for d in data}
    return {}


def save(done):
    with open(OUTPUT_FILE, "w") as f:
        json.dump(list(done.values()), f, indent=2, ensure_ascii=False)


def get_next_data(soup):
    try:
        script = soup.find("script", {"id": "__NEXT_DATA__"})
        if script:
            return json.loads(script.string)
    except Exception:
        pass
    return None


def extract_from_next_data(nd):
    """Pull all fields from __NEXT_DATA__ JSON."""
    result = {}
    try:
        # Dubizzle Next.js structure varies — try common paths
        page_props = nd.get("props", {}).get("pageProps", {})

        # Try listing detail path
        listing = (
            page_props.get("listing")
            or page_props.get("ad")
            or page_props.get("property")
            or {}
        )

        result["title"]       = listing.get("title") or listing.get("name")
        result["description"] = listing.get("description") or listing.get("body")
        result["property_type"] = listing.get("category", {}).get("name") if isinstance(listing.get("category"), dict) else listing.get("category")

        # Price
        price = listing.get("price") or listing.get("rent") or {}
        if isinstance(price, dict):
            result["price_value"]  = price.get("value") or price.get("amount")
            result["price_period"] = price.get("period") or price.get("frequency")
        else:
            result["price_value"] = price

        # Location
        loc = listing.get("location") or listing.get("address") or {}
        if isinstance(loc, dict):
            result["location"]  = loc.get("name") or loc.get("address") or loc.get("full_name")
            result["community"] = loc.get("neighborhood") or loc.get("community")
            result["latitude"]  = loc.get("lat") or loc.get("latitude")
            result["longitude"] = loc.get("lng") or loc.get("longitude")
        else:
            result["location"] = loc

        # Specs — try attributes array first
        attrs = listing.get("attributes") or listing.get("details") or []
        if isinstance(attrs, list):
            for attr in attrs:
                k = (attr.get("key") or attr.get("name") or "").lower()
                v = attr.get("value") or attr.get("val")
                if "bed" in k:
                    result["beds"] = v
                elif "bath" in k:
                    result["baths"] = v
                elif "area" in k or "size" in k or "sqft" in k or "sqm" in k:
                    result["area"] = v
                elif "permit" in k or "dld" in k or "rera" in k:
                    result["permit_number"] = str(v) if v else None
                elif "reference" in k or "ref" in k:
                    result["reference"] = str(v) if v else None
                elif "furnish" in k:
                    result["furnishing"] = v
                elif "type" in k and not result.get("property_type"):
                    result["property_type"] = v

        # Direct field fallbacks
        if not result.get("beds"):
            result["beds"]  = listing.get("beds") or listing.get("bedrooms")
        if not result.get("baths"):
            result["baths"] = listing.get("baths") or listing.get("bathrooms")
        if not result.get("area"):
            result["area"]  = listing.get("area") or listing.get("size") or listing.get("area_sqft")

        # Permit — try dedicated fields
        if not result.get("permit_number"):
            result["permit_number"] = (
                listing.get("permit_number")
                or listing.get("dld_permit_no")
                or listing.get("rera_permit")
                or listing.get("permit")
            )

        # Agent / agency
        agent = listing.get("agent") or listing.get("broker") or listing.get("user") or {}
        if isinstance(agent, dict):
            result["agent_name"]    = agent.get("name") or agent.get("display_name")
            result["agent_phone"]   = agent.get("phone") or agent.get("mobile")
            agency = agent.get("agency") or agent.get("company") or {}
            result["agency_name"]   = agency.get("name") if isinstance(agency, dict) else agency
        else:
            result["agent_name"] = agent

        # Photos
        photos = listing.get("photos") or listing.get("images") or []
        if isinstance(photos, list):
            result["photos"] = [
                (p.get("url") or p.get("src") or p) for p in photos[:10]
                if isinstance(p, (str, dict))
            ]

    except Exception as e:
        result["_next_data_error"] = str(e)

    return result


def get_text(soup, *testids):
    for testid in testids:
        el = soup.select_one(f'[data-testid="{testid}"]')
        if el:
            return el.get_text(strip=True)
    return None


def extract_permit_from_dom(soup):
    """Scan page text for DLD permit number patterns."""
    # Try testids
    for testid in ["dld-permit-no", "permit-number", "listing-permit", "rera-permit",
                   "dld_permit_no", "permit_number"]:
        val = get_text(soup, testid)
        if val:
            return val

    # Look for label+value pairs in the page
    for label_el in soup.find_all(string=re.compile(r'(permit|DLD|RERA|تصريح)', re.I)):
        parent = label_el.parent
        # Check siblings or next element for the value
        for sibling in [parent.find_next_sibling(), parent.parent.find_next_sibling()]:
            if sibling:
                text = sibling.get_text(strip=True)
                if text and re.search(r'\d{5,}', text):
                    return text

    # Scan page text for 7-15 digit permit numbers near "permit" keyword
    page_text = soup.get_text()
    match = re.search(r'(?:permit|DLD|RERA)[^\d]{0,30}(\d{7,15})', page_text, re.I)
    if match:
        return match.group(1)

    return None


def extract_photos_from_dom(soup):
    imgs = soup.select('img[data-testid*="photo"], img[data-testid*="image"], img[data-testid*="gallery"]')
    if not imgs:
        imgs = soup.select('img[src*="dubizzle"], img[src*="openh"], img[src*="static"]')
    seen, photos = set(), []
    for img in imgs:
        src = img.get("src") or img.get("data-src") or ""
        if src and src not in seen and src.startswith("http"):
            seen.add(src)
            photos.append(src)
    return photos[:10]


@browser(
    headless=not DEBUG,
    add_arguments=["--no-sandbox", "--disable-dev-shm-usage",
                   "--disable-blink-features=AutomationControlled"],
)
def scrape_details(driver: Driver, data):
    listings = load_listings()
    done = load_done()

    remaining = [l for l in listings if l["url"] not in done]
    print(f"Total: {len(listings)} | Already done: {len(done)} | To scrape: {len(remaining)}")

    for i, listing in enumerate(remaining):
        url = listing["url"]
        print(f"\n[{i+1}/{len(remaining)}] {url[-80:]}")

        try:
            driver.get(url)
            time.sleep(3)
            soup = soupify(driver)

            # Try __NEXT_DATA__ first
            nd = get_next_data(soup)
            nd_fields = extract_from_next_data(nd) if nd else {}

            # DOM fallbacks for anything missing
            permit = nd_fields.get("permit_number") or extract_permit_from_dom(soup)
            photos = nd_fields.get("photos") or extract_photos_from_dom(soup)

            result = {
                **listing,
                "title":          nd_fields.get("title")          or get_text(soup, "listing-title", "listing-card-title"),
                "description":    nd_fields.get("description")     or get_text(soup, "listing-description", "description"),
                "property_type":  nd_fields.get("property_type")   or get_text(soup, "listing-type"),
                "price_value":    nd_fields.get("price_value"),
                "price_period":   nd_fields.get("price_period"),
                "location":       nd_fields.get("location")        or get_text(soup, "listing-location", "location"),
                "community":      nd_fields.get("community"),
                "beds":           nd_fields.get("beds")            or get_text(soup, "listing-card-beds", "beds"),
                "baths":          nd_fields.get("baths")           or get_text(soup, "listing-card-baths", "baths"),
                "area":           nd_fields.get("area")            or get_text(soup, "listing-card-size", "area"),
                "furnishing":     nd_fields.get("furnishing"),
                "permit_number":  permit,
                "reference":      nd_fields.get("reference"),
                "agent_name":     nd_fields.get("agent_name")      or get_text(soup, "agent-name", "broker-name"),
                "agent_phone":    nd_fields.get("agent_phone"),
                "agency_name":    nd_fields.get("agency_name")     or get_text(soup, "agency-name", "broker-agency"),
                "latitude":       nd_fields.get("latitude"),
                "longitude":      nd_fields.get("longitude"),
                "photos":         photos,
            }

            print(f"  Price: {result['price_value']} | Permit: {result['permit_number']} | Agent: {result['agent_name']}")

            done[url] = result
            if (i + 1) % 20 == 0:
                save(done)

        except Exception as e:
            print(f"  ERROR: {e}")
            done[url] = {**listing, "error": str(e)}

        time.sleep(1)

    save(done)
    print(f"\nDone. {len(done)} listings saved → {OUTPUT_FILE}")
    return list(done.values())


if __name__ == "__main__":
    scrape_details()
