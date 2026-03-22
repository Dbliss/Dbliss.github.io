#!/usr/bin/env python3
import argparse
import html
import http.cookiejar
import json
import random
import re
import ssl
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_OUTPUT = Path("src/data/generated/wealthPropertyMarket.json")
DEFAULT_CACHE_DIR = Path("cache/wealth-property-market")
SYDNEY_SUBURBS_URL = "https://en.wikipedia.org/wiki/List_of_Sydney_suburbs"
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
]
BROWSER_PROFILES = [
    {
        "user_agent": USER_AGENTS[0],
        "headers": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9,en-US;q=0.8",
            "Cache-Control": "max-age=0",
            "Pragma": "no-cache",
            "Sec-CH-UA": '"Google Chrome";v="133", "Chromium";v="133", "Not(A:Brand";v="24"',
            "Sec-CH-UA-Mobile": "?0",
            "Sec-CH-UA-Platform": '"Windows"',
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        },
    },
    {
        "user_agent": USER_AGENTS[1],
        "headers": {
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-AU,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Upgrade-Insecure-Requests": "1",
        },
    },
]
VACANCY_BASE = {"NSW": 0.015, "VIC": 0.017, "QLD": 0.009, "WA": 0.006, "SA": 0.008, "ACT": 0.014, "NT": 0.008, "TAS": 0.004}
STRATA_MULT = {1: 0.9, 2: 1.0, 3: 1.15, 4: 1.3, 5: 1.45}
WORD_TO_BED = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}


def main():
    args = parse_args()
    suburbs = load_suburbs(args)
    if not suburbs:
        raise SystemExit('No suburbs supplied. Use --sydney, --suburb "Rhodes NSW 2138", or --input suburbs.json.')
    rows, failures = [], []
    for i, suburb in enumerate(suburbs):
        if i:
            time.sleep(args.delay + random.uniform(0, 0.5))
        try:
            rows.append(fetch_market(suburb, args))
            print(f"Fetched {suburb['slug']}")
        except Exception as exc:  # noqa: BLE001
            failures.append({"suburb": label_suburb(suburb), "slug": suburb["slug"], "error": str(exc)})
            print(f"Failed {suburb['slug']}: {exc}", file=sys.stderr)
    payload = build_payload(rows, failures)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(rows)} suburb records to {args.output.resolve()}")
    return 0 if rows else 1


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sydney", action="store_true")
    parser.add_argument("--suburb", action="append", default=[])
    parser.add_argument("--input", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)
    parser.add_argument("--prefer-cache", action="store_true")
    parser.add_argument("--delay", type=float, default=1.6)
    parser.add_argument("--timeout", type=float, default=30)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--save-suburbs", type=Path)
    parser.add_argument("--engine", choices=["auto", "session", "urllib"], default="auto")
    parser.add_argument("--cookie-file", type=Path, help="Optional Netscape/Mozilla cookie jar exported from your real browser session.")
    parser.add_argument("--cookie-header", help="Optional raw Cookie header copied from a working browser request.")
    return parser.parse_args()


def load_suburbs(args):
    suburbs = []
    if args.sydney:
        suburbs.extend(discover_sydney_suburbs(args))
    for raw in args.suburb:
        suburbs.append(normalize_suburb(raw))
    if args.input:
        for entry in json.loads(args.input.read_text(encoding="utf-8")):
            suburbs.append(normalize_suburb(entry))
    deduped, seen = [], set()
    for suburb in suburbs:
        if suburb["slug"] in seen:
            continue
        seen.add(suburb["slug"])
        deduped.append(suburb)
    if args.save_suburbs:
        args.save_suburbs.parent.mkdir(parents=True, exist_ok=True)
        args.save_suburbs.write_text(json.dumps(deduped, indent=2) + "\n", encoding="utf-8")
    return deduped


def discover_sydney_suburbs(args):
    raw = fetch_text(SYDNEY_SUBURBS_URL, args.timeout, args.retries, args)
    titles = re.findall(r'<a [^>]*title="([^"]+)"[^>]*>', raw, flags=re.I)
    suburbs, seen = [], set()
    for title in titles:
        name = html.unescape(title).strip()
        if not valid_suburb_name(name):
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        suburbs.append({"suburb": title_case(name), "state": "NSW", "postcode": None, "slug": f"{slugify(name)}-nsw"})
    return suburbs


def valid_suburb_name(name):
    if len(name) < 3 or len(name) > 45 or re.search(r"\(|\)|\d{4}", name):
        return False
    banned = ("Sydney", "New South Wales", "List of", "Category:", "Template:", "Help:", "File:", "Special:")
    return bool(re.fullmatch(r"[A-Za-z][A-Za-z' .-]+", name)) and not any(token in name for token in banned)


def normalize_suburb(raw):
    if isinstance(raw, str):
        cleaned = re.sub(r"\s+", " ", raw.strip())
        match = re.match(r"^(?P<suburb>.+?)[,\s]+(?P<state>NSW|VIC|QLD|SA|WA|TAS|ACT|NT)(?:[,\s]+(?P<postcode>\d{4}))?$", cleaned, flags=re.I)
        if not match:
            raise ValueError(f'Could not parse suburb "{raw}". Use "Rhodes NSW 2138".')
        suburb, state, postcode = title_case(match.group("suburb").rstrip(", ")), match.group("state").upper(), match.group("postcode")
        slug = f"{slugify(suburb)}-{state.lower()}" + (f"-{postcode}" if postcode else "")
        return {"suburb": suburb, "state": state, "postcode": postcode, "slug": slug}
    if isinstance(raw, dict):
        suburb = title_case(str(raw.get("suburb") or raw.get("name") or "").strip())
        state = str(raw.get("state") or "").upper().strip()
        postcode = str(raw.get("postcode")).strip() if raw.get("postcode") is not None else None
        if not suburb or not state:
            raise ValueError(f"Invalid suburb object: {raw}")
        slug = f"{slugify(suburb)}-{state.lower()}" + (f"-{postcode}" if postcode else "")
        return {"suburb": suburb, "state": state, "postcode": postcode, "slug": slug}
    raise ValueError(f"Unsupported suburb input: {raw!r}")


def fetch_market(suburb, args):
    url = build_url(suburb)
    raw_html = load_html(suburb, url, args)
    if is_bot_challenge(raw_html):
        cache_hint = args.cache_dir / f"{suburb['slug']}.html"
        raise ValueError(
            f"Bot challenge page returned from {url}. "
            f"Try rerunning with --engine session plus --cookie-file or --cookie-header, "
            f"or save the solved page HTML into {cache_hint} and rerun with --prefer-cache."
        )
    text = compact(html_to_text(raw_html))
    if "Property market insights" not in text:
        raise ValueError(f"Unexpected response from {url}")
    summary = parse_summary(text)
    house_prices = parse_block(text, "price")
    house_rents = parse_block(text, "rent")
    postcode = suburb["postcode"] or search_group(r"\bNSW\s+(\d{4})\b", text)
    if postcode and suburb["postcode"] is None:
        suburb = dict(suburb)
        suburb["postcode"] = postcode
        suburb["slug"] = f"{slugify(suburb['suburb'])}-{suburb['state'].lower()}-{postcode}"
    house = build_property(suburb, "house", summary, house_prices, house_rents)
    apartment = build_property(suburb, "apartment", summary, None, None)
    return {
        "slug": suburb["slug"],
        "suburb": suburb["suburb"],
        "state": suburb["state"],
        "postcode": suburb["postcode"],
        "label": label_suburb(suburb),
        "region": parse_region(text),
        "roomDemandRatio": parse_ratio(text),
        "sourceUrl": url,
        "source": "property.com.au",
        "propertyTypes": {k: v for k, v in {"house": house, "apartment": apartment}.items() if v},
    }


def load_html(suburb, url, args):
    cache_path = args.cache_dir / f"{suburb['slug']}.html"
    if args.prefer_cache and cache_path.exists():
        return cache_path.read_text(encoding="utf-8")
    try:
        raw = fetch_text(url, args.timeout, args.retries, args)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(raw, encoding="utf-8")
        return raw
    except Exception as exc:  # noqa: BLE001
        if cache_path.exists():
            return cache_path.read_text(encoding="utf-8")
        if "HTTP 429" in str(exc):
            raise RuntimeError(f"HTTP 429 Too Many Requests from {url}. Save the suburb page HTML to {cache_path} and rerun with --prefer-cache.") from exc
        raise


def fetch_text(url, timeout, retries, engine="auto"):
    args = engine if isinstance(engine, argparse.Namespace) else None
    engine_name = args.engine if args else engine
    if engine_name == "session":
        return fetch_text_session(url, timeout, retries, args)
    if engine_name == "urllib":
        return fetch_text_urllib(url, timeout, retries)
    try:
        return fetch_text_session(url, timeout, retries, args)
    except Exception:
        return fetch_text_urllib(url, timeout, retries)


def fetch_text_session(url, timeout, retries, args):
    last_error = None
    ssl_context = ssl._create_unverified_context()
    for attempt in range(retries + 1):
        profile = random.choice(BROWSER_PROFILES)
        try:
            opener = build_browser_opener(profile, ssl_context, args)
            warmed = warmup_session(opener, timeout, profile, url)
            if "Property market insights" in warmed or is_bot_challenge(warmed):
                return warmed
            return read_url(opener, url, timeout, profile, referer="https://www.property.com.au/")
        except urllib.error.HTTPError as exc:
            last_error = RuntimeError(f"HTTP {exc.code} {exc.reason}")
            if exc.code in {403, 429}:
                raise last_error
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        if attempt < retries:
            time.sleep((2 ** attempt) + random.uniform(0.5, 1.4))
    raise RuntimeError(str(last_error)) if last_error else RuntimeError(f"Failed to fetch {url}")


def build_browser_opener(profile, ssl_context, args):
    cookie_jar = http.cookiejar.CookieJar()
    if args and args.cookie_file:
        cookie_jar = http.cookiejar.MozillaCookieJar(str(args.cookie_file))
        cookie_jar.load(ignore_discard=True, ignore_expires=True)
    handlers = [urllib.request.HTTPCookieProcessor(cookie_jar), urllib.request.HTTPSHandler(context=ssl_context)]
    opener = urllib.request.build_opener(*handlers)
    if args and args.cookie_header:
        opener.addheaders = [("Cookie", args.cookie_header)]
    return opener


def warmup_session(opener, timeout, profile, target_url):
    steps = [
        ("https://www.property.com.au/", None),
        ("https://www.property.com.au/buy/", "https://www.property.com.au/"),
        (target_url, "https://www.property.com.au/buy/"),
    ]
    final_body = ""
    for index, (step_url, referer) in enumerate(steps):
        final_body = read_url(opener, step_url, timeout, profile, referer=referer)
        if step_url == target_url or "Property market insights" in final_body or is_bot_challenge(final_body):
            return final_body
        if index < len(steps) - 1:
            time.sleep(random.uniform(0.6, 1.7))
    return final_body


def read_url(opener, url, timeout, profile, referer=None):
    headers = {"User-Agent": profile["user_agent"], **profile["headers"]}
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    with opener.open(request, timeout=timeout) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def fetch_text_urllib(url, timeout, retries):
    last_error = None
    ssl_context = ssl._create_unverified_context()
    for attempt in range(retries + 1):
        request = urllib.request.Request(url, headers={
            "User-Agent": random.choice(USER_AGENTS),
            "Accept-Language": "en-AU,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        })
        try:
            with urllib.request.urlopen(request, timeout=timeout, context=ssl_context) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace")
        except urllib.error.HTTPError as exc:
            last_error = RuntimeError(f"HTTP {exc.code} {exc.reason}")
            if exc.code in {403, 429}:
                raise last_error
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        if attempt < retries:
            time.sleep((2 ** attempt) + random.uniform(0.2, 0.8))
    raise RuntimeError(str(last_error)) if last_error else RuntimeError(f"Failed to fetch {url}")


def build_url(suburb):
    suffix = f"-{suburb['postcode']}" if suburb["postcode"] else ""
    return f"https://www.property.com.au/{suburb['state'].lower()}/{slugify(suburb['suburb'])}{suffix}/"


def html_to_text(raw):
    text = re.sub(r"<script\b[^>]*>[\s\S]*?</script>", " ", raw, flags=re.I)
    text = re.sub(r"<style\b[^>]*>[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<noscript\b[^>]*>[\s\S]*?</noscript>", " ", text, flags=re.I)
    text = re.sub(r"</?(?:br|p|div|section|article|h[1-6]|li|tr)\b[^>]*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    return html.unescape(text)


def is_bot_challenge(raw):
    markers = ("KPSDK", "ips.js", "Access Denied", "captcha", "verify you are human")
    return any(marker.lower() in raw.lower() for marker in markers)


def compact(value):
    return re.sub(r"\s+", " ", value).strip()


def parse_summary(text):
    growth = re.search(r"compound growth rate of (?P<house>-?[\d.]+)% for houses and (?P<unit>-?[\d.]+)% for units", text, flags=re.I)
    house_price = re.search(r"The median house price in .*? is currently (?P<value>\$[\d.,]+(?:m|k)?)", text, flags=re.I)
    house_rent = re.search(r"the median rent for houses in .*? is (?P<value>\$[\d.,]+(?:m|k)?) per week", text, flags=re.I)
    house_yield = re.search(r"median rent for houses .*? annual rental yield of (?P<value>[\d.]+)%", text, flags=re.I)
    house_rent_growth = re.search(r"annual rental yield of [\d.]+%\. The median rent has (?P<dir>increased|decreased|fallen|risen) (?P<value>[\d.]+)% over the last 12 months", text, flags=re.I)
    apt_price = re.search(r"The median price of apartments and units for sale in .*? is (?P<value>\$[\d.,]+(?:m|k)?) which has (?P<dir>increased|decreased|fallen|risen) (?P<change>[\d.]+)% since the same time last year", text, flags=re.I)
    apt_rent = re.search(r"The median rental price for units and apartments in .*? is (?P<value>\$[\d.,]+(?:m|k)?) per week, which is a rental yield of (?P<yield>[\d.]+)%", text, flags=re.I)
    return {
        "houseMedianPrice": money(group(house_price, "value")),
        "houseAnnualGrowthRate": pct(group(growth, "house")),
        "houseMedianWeeklyRent": money(group(house_rent, "value")),
        "houseRentYield": pct(group(house_yield, "value")),
        "houseRentGrowthRate": directional(group(house_rent_growth, "dir"), pct(group(house_rent_growth, "value"))),
        "apartmentMedianPrice": money(group(apt_price, "value")),
        "apartmentAnnualGrowthRate": directional(group(apt_price, "dir"), pct(group(apt_price, "change") or group(growth, "unit"))),
        "apartmentMedianWeeklyRent": money(group(apt_rent, "value")),
        "apartmentRentYield": pct(group(apt_rent, "yield")),
        "apartmentBedroomPrices": parse_word_beds(text, r"(?P<word>One|Two|Three|Four|Five)-bedroom apartments have (?:a median sale price of|a median price of|sold for a median price of) (?P<value>\$[\d.,]+(?:m|k)?)"),
        "apartmentBedroomRents": parse_word_beds(text, r"(?P<word>One|Two|Three|Four|Five)-bedroom apartments have a median rental price of (?P<value>\$[\d.,]+(?:m|k)?) per week"),
    }


def parse_block(text, block_type):
    if block_type == "price":
        pattern = r"Median price trend for houses\s+Based on (?P<count>[\d,]+) sales in the preceding 12 months\s+(?P<median>\$[\d.,]+(?:m|k)?)\s+Past 12 month growth:(?P<growth>-?[\d.]+)%\s+(?P<beds>.+?)\s+Median rent trend for houses"
        match = re.search(pattern, text, flags=re.I)
        if not match:
            return None
        return {"salesCount12m": number(group(match, "count")), "medianPrice": money(group(match, "median")), "annualGrowthRate": pct(group(match, "growth")), "bedroomPrices": parse_numeric_beds(group(match, "beds") or "")}
    pattern = r"Median rent trend for houses\s+Based on (?P<count>[\d,]+) listings in the preceding 12 months\s+(?P<median>\$[\d.,]+(?:m|k)?)\s+per week\s+Past 12 month growth:(?P<growth>-?[\d.]+)%\s+(?P<beds>.+?)\s+The median house price in"
    match = re.search(pattern, text, flags=re.I)
    if not match:
        return None
    return {"rentListingsCount12m": number(group(match, "count")), "medianWeeklyRent": money(group(match, "median")), "rentGrowthRate": pct(group(match, "growth")), "bedroomRents": parse_numeric_beds(group(match, "beds") or "")}


def parse_numeric_beds(text):
    output = {}
    for match in re.finditer(r"(?P<label>\d\+?|\d)\s*BED\s+(?P<value>\$[\d.,]+(?:m|k)?)", text, flags=re.I):
        label = group(match, "label") or ""
        bedrooms = 5 if label.startswith("5") else int(label.replace("+", ""))
        output[str(bedrooms)] = money(group(match, "value"))
    return output


def parse_word_beds(text, pattern):
    output = {}
    for match in re.finditer(pattern, text, flags=re.I):
        bedrooms = WORD_TO_BED.get((group(match, "word") or "").lower())
        if bedrooms:
            output[str(bedrooms)] = money(group(match, "value"))
    return output


def build_property(suburb, property_type, summary, house_prices, house_rents):
    if property_type == "house":
        overall = {
            "medianPrice": value(house_prices, "medianPrice") or summary["houseMedianPrice"],
            "annualGrowthRate": summary["houseAnnualGrowthRate"] if summary["houseAnnualGrowthRate"] is not None else value(house_prices, "annualGrowthRate"),
            "medianWeeklyRent": value(house_rents, "medianWeeklyRent") or summary["houseMedianWeeklyRent"],
            "rentGrowthRate": value(house_rents, "rentGrowthRate") if value(house_rents, "rentGrowthRate") is not None else summary["houseRentGrowthRate"],
            "rentYield": summary["houseRentYield"],
            "salesCount12m": value(house_prices, "salesCount12m"),
            "rentListingsCount12m": value(house_rents, "rentListingsCount12m"),
        }
        bedroom_prices, bedroom_rents = value(house_prices, "bedroomPrices") or {}, value(house_rents, "bedroomRents") or {}
    else:
        overall = {
            "medianPrice": summary["apartmentMedianPrice"],
            "annualGrowthRate": summary["apartmentAnnualGrowthRate"],
            "medianWeeklyRent": summary["apartmentMedianWeeklyRent"],
            "rentGrowthRate": None,
            "rentYield": summary["apartmentRentYield"],
            "salesCount12m": None,
            "rentListingsCount12m": None,
        }
        bedroom_prices, bedroom_rents = summary["apartmentBedroomPrices"], summary["apartmentBedroomRents"]
    if not overall["medianPrice"] and not bedroom_prices:
        return None
    vacancy = estimate_vacancy(suburb["state"], overall["annualGrowthRate"], overall["rentGrowthRate"], property_type)
    bedroom_keys = sorted({*bedroom_prices.keys(), *bedroom_rents.keys()}, key=int)
    bedrooms = {}
    for key in bedroom_keys:
        bed_count = int(key)
        median_price = bedroom_prices.get(key) or overall["medianPrice"]
        weekly_rent = bedroom_rents.get(key) or derive_rent(median_price, overall["rentYield"])
        bedrooms[key] = {
            "bedrooms": bed_count,
            "medianPrice": median_price,
            "annualGrowthRate": overall["annualGrowthRate"],
            "medianWeeklyRent": weekly_rent,
            "rentYield": yield_from(median_price, weekly_rent, overall["rentYield"]),
            "vacancyRate": vacancy,
            "annualStrata": estimate_strata(median_price, bed_count) if property_type == "apartment" else 0,
            "estimateQuality": estimate_quality(bedroom_prices.get(key) is not None, bedroom_rents.get(key) is not None, overall["annualGrowthRate"] is not None, overall["rentYield"] is not None, property_type),
        }
    return {
        "propertyType": property_type,
        "medianPrice": overall["medianPrice"],
        "annualGrowthRate": overall["annualGrowthRate"],
        "medianWeeklyRent": overall["medianWeeklyRent"],
        "rentGrowthRate": overall["rentGrowthRate"],
        "rentYield": overall["rentYield"],
        "vacancyRate": vacancy,
        "annualStrata": estimate_strata(overall["medianPrice"], 2) if property_type == "apartment" else 0,
        "salesCount12m": overall["salesCount12m"],
        "rentListingsCount12m": overall["rentListingsCount12m"],
        "bedrooms": bedrooms,
    }


def estimate_vacancy(state, annual_growth, rent_growth, property_type):
    vacancy = VACANCY_BASE.get(state, 0.012)
    if rent_growth is not None:
        vacancy += -0.001 if rent_growth >= 0.08 else 0.001 if rent_growth <= 0 else 0
    if annual_growth is not None:
        vacancy += -0.0005 if annual_growth >= 0.12 else 0.0005 if annual_growth < 0 else 0
    if property_type == "apartment":
        vacancy += 0.0005
    return max(0.003, min(0.04, round(vacancy, 4)))


def derive_rent(median_price, rent_yield):
    if not median_price or not rent_yield:
        return None
    return int(round((median_price * rent_yield) / 52))


def yield_from(median_price, weekly_rent, fallback):
    if median_price and weekly_rent:
        return round((weekly_rent * 52) / median_price, 4)
    return fallback


def estimate_strata(median_price, bedrooms):
    if not median_price:
        return None
    base_estimate = 600 + (median_price * 0.00592)
    return int(round(base_estimate * STRATA_MULT.get(bedrooms, 1.0)))


def estimate_quality(direct_price, direct_rent, direct_growth, direct_yield, property_type):
    direct_fields = sum([direct_price, direct_rent, direct_growth, direct_yield])
    if property_type == "house" and direct_fields >= 4:
        return "direct"
    if direct_fields >= 2:
        return "mixed"
    return "heuristic"


def build_payload(suburbs, failures):
    records = []
    for suburb in suburbs:
        for property_type, property_data in suburb.get("propertyTypes", {}).items():
            for bedroom_data in property_data.get("bedrooms", {}).values():
                records.append({
                    "key": f"{suburb['slug']}:{property_type}:{bedroom_data['bedrooms']}",
                    "suburbSlug": suburb["slug"],
                    "suburb": suburb["suburb"],
                    "state": suburb["state"],
                    "postcode": suburb["postcode"],
                    "region": suburb["region"],
                    "propertyType": property_type,
                    "bedrooms": bedroom_data["bedrooms"],
                    "medianPrice": bedroom_data["medianPrice"],
                    "annualGrowthRate": bedroom_data["annualGrowthRate"],
                    "medianWeeklyRent": bedroom_data["medianWeeklyRent"],
                    "rentYield": bedroom_data["rentYield"],
                    "vacancyRate": bedroom_data["vacancyRate"],
                    "annualStrata": bedroom_data["annualStrata"],
                    "estimateQuality": bedroom_data["estimateQuality"],
                    "sourceUrl": suburb["sourceUrl"],
                })
    records.sort(key=lambda row: row["key"])
    return {
        "metadata": {
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "generatedFor": "wealth defaults property lookup",
            "sources": [
                {"label": "property.com.au suburb profile pages", "notes": "Primary market source for prices, growth, rent, and yield."},
                {"label": "Wikipedia list of Sydney suburbs", "url": SYDNEY_SUBURBS_URL, "notes": "Used to discover Sydney suburb names for the one-off batch run."},
            ],
            "caveats": [
                "property.com.au can rate-limit scripted requests, so the script caches raw HTML, supports cache-first mode, and can reuse browser cookies.",
                "Vacancy is estimated rather than directly scraped.",
                "Apartment strata is heuristic, not a scraped suburb median.",
            ],
            "suburbCount": len(suburbs),
            "recordCount": len(records),
            "failureCount": len(failures),
        },
        "failures": failures,
        "suburbs": {suburb["slug"]: suburb for suburb in suburbs},
        "records": records,
    }


def parse_region(text):
    return search_group(r"\b(?:in|above)\s+(Greater\s+[A-Z][A-Za-z]+|Canberra|Darwin)\b", text)


def parse_ratio(text):
    value = search_group(r"Supply and demand\s+([\d.]+)\s*:\s*1\s+People looking per room listed", text)
    return float(value) if value else None


def search_group(pattern, text):
    match = re.search(pattern, text, flags=re.I)
    return match.group(1) if match else None


def group(match, key):
    return match.groupdict().get(key) if match else None


def value(mapping, key):
    return mapping.get(key) if mapping else None


def money(raw):
    if not raw:
        return None
    cleaned = raw.lower().replace("$", "").replace(",", "").strip()
    multiplier = 1_000_000 if cleaned.endswith("m") else 1_000 if cleaned.endswith("k") else 1
    cleaned = cleaned[:-1] if cleaned.endswith(("m", "k")) else cleaned
    try:
        return int(round(float(cleaned) * multiplier))
    except ValueError:
        return None


def pct(raw):
    try:
        return round(float(raw) / 100, 4) if raw is not None else None
    except ValueError:
        return None


def number(raw):
    try:
        return int(str(raw).replace(",", "")) if raw is not None else None
    except ValueError:
        return None


def directional(direction, value):
    if value is None:
        return None
    return -abs(value) if direction and re.search(r"decreased|fallen", direction, flags=re.I) else abs(value)


def title_case(value):
    parts = re.split(r"([\s-]+)", value.lower())
    titled = "".join(part.capitalize() if re.fullmatch(r"[a-z]+", part) else part for part in parts)
    return re.sub(r"\bMc([a-z])", lambda m: "Mc" + m.group(1).upper(), titled)


def slugify(value):
    value = re.sub(r"[^\w\s-]", "", value.lower().strip())
    value = re.sub(r"[\s_]+", "-", value)
    return re.sub(r"-+", "-", value).strip("-")


def label_suburb(suburb):
    return f"{suburb['suburb']}, {suburb['state']} {suburb['postcode']}" if suburb.get("postcode") else f"{suburb['suburb']}, {suburb['state']}"


if __name__ == "__main__":
    raise SystemExit(main())
