#!/usr/bin/env python3
import argparse
import csv
import html
import random
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

DEFAULT_INPUT = Path("temp_data_aggregated/yearly_suburb_metrics.csv")
DEFAULT_OUTPUT = Path("temp_data_aggregated/openagent_rental_yields.csv")
DEFAULT_FAILURES = Path("temp_data_aggregated/openagent_rental_yields_failures.csv")
DEFAULT_CACHE_DIR = Path("cache/openagent-suburb-profiles")
SOURCE_BASE_URL = "https://www.openagent.com.au/suburb-profiles"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)
TOKEN_PATTERN = r"[-+]?\d+(?:\.\d+)?%|\$[0-9][0-9,]*(?:\.\d+)?[KMB]?|\d+(?:\.\d+)?"


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "noscript"}:
            self._skip_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "noscript"} and self._skip_depth:
            self._skip_depth -= 1

    def handle_data(self, data):
        if not self._skip_depth:
            cleaned = data.strip()
            if cleaned:
                self.parts.append(cleaned)

    def get_text(self):
        return " ".join(self.parts)


def main():
    args = parse_args()
    selected_year = resolve_target_year(args.input, args.year)
    suburbs = load_target_suburbs(args.input, selected_year, args.min_sales)
    if args.limit:
        suburbs = suburbs[: args.limit]
    if not suburbs:
        raise SystemExit("No eligible suburb/postcode rows matched the filter.")

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    rows = []
    failures = []

    for index, suburb in enumerate(suburbs, start=1):
        if index > 1:
            time.sleep(args.delay + random.uniform(0, 0.35))
        try:
            row = fetch_suburb_metrics(suburb, args)
            rows.append(row)
            print(f"[{index}/{len(suburbs)}] OK {suburb['suburb']} ({suburb['postcode']})")
        except Exception as exc:  # noqa: BLE001
            failures.append(build_failure_row(suburb, exc))
            print(f"[{index}/{len(suburbs)}] FAIL {suburb['suburb']} ({suburb['postcode']}): {exc}")

    write_csv(args.output, rows, RESULT_FIELDS)
    write_csv(args.failures_output, failures, FAILURE_FIELDS)

    print(f"Wrote {len(rows)} records to {args.output.resolve()}")
    print(f"Wrote {len(failures)} failures to {args.failures_output.resolve()}")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Fetch OpenAgent suburb profile metrics for suburbs whose latest yearly PSI row "
            "has house and apartment sales counts above the threshold."
        )
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--failures-output", type=Path, default=DEFAULT_FAILURES)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)
    parser.add_argument("--year", default="latest", help='Target year, or "latest" (default).')
    parser.add_argument("--min-sales", type=int, default=20, help="Minimum sales threshold for both houses and apartments.")
    parser.add_argument("--delay", type=float, default=1.2, help="Base delay in seconds between requests.")
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--limit", type=int, help="Optional cap for a smaller run while debugging.")
    parser.add_argument("--refresh", action="store_true", help="Ignore cached HTML and refetch suburb pages.")
    return parser.parse_args()


def resolve_target_year(path, year_arg):
    if str(year_arg).lower() != "latest":
        return int(year_arg)
    latest = None
    with path.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            year = int(row["year"])
            latest = year if latest is None or year > latest else latest
    if latest is None:
        raise ValueError(f"No rows found in {path}")
    return latest


def load_target_suburbs(path, target_year, min_sales):
    latest_by_suburb = {}
    with path.open(newline="", encoding="utf-8-sig") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row.get("granularity") != "suburb":
                continue
            key = row["suburb_key"]
            year = int(row["year"])
            existing = latest_by_suburb.get(key)
            if existing is None or year > existing["year"]:
                latest_by_suburb[key] = {
                    "year": year,
                    "postcode": row["postcode"].strip(),
                    "suburb": normalize_suburb_name(row["suburb"]),
                    "suburb_key": row["suburb_key"],
                    "region_label": row["region_label"].strip(),
                    "sales_count_house": parse_int(row["sales_count_house"]),
                    "sales_count_apartment": parse_int(row["sales_count_apartment"]),
                }

    suburbs = []
    for entry in latest_by_suburb.values():
        if entry["year"] != target_year:
            continue
        if entry["sales_count_house"] <= min_sales or entry["sales_count_apartment"] <= min_sales:
            continue
        if not entry["postcode"] or not re.fullmatch(r"\d{4}", entry["postcode"]):
            continue
        entry["slug"] = slugify(entry["suburb"])
        suburbs.append(entry)

    suburbs.sort(key=lambda row: (row["postcode"], row["suburb"]))
    return suburbs


def fetch_suburb_metrics(suburb, args):
    url = f"{SOURCE_BASE_URL}/{suburb['slug']}-{suburb['postcode']}"
    html_text = load_html(suburb, url, args)
    market = parse_market_metrics(html_text)

    house_price = parse_money(market["house_price"])
    unit_price = parse_money(market["unit_price"])
    house_rent = parse_money(market["house_rent"])
    unit_rent = parse_money(market["unit_rent"])
    # The user asked for yield as average weekly rent divided by median price.
    # This is intentionally not annualized by multiplying rent by 52.

    return {
        "year": suburb["year"],
        "postcode": suburb["postcode"],
        "suburb": suburb["suburb"],
        "suburb_key": suburb["suburb_key"],
        "region_label": suburb["region_label"],
        "source_url": url,
        "sales_count_house_source_csv": suburb["sales_count_house"],
        "sales_count_apartment_source_csv": suburb["sales_count_apartment"],
        "openagent_house_median_price_aud": house_price,
        "openagent_apartment_median_price_aud": unit_price,
        "openagent_house_average_rent_aud": house_rent,
        "openagent_apartment_average_rent_aud": unit_rent,
        "house_rental_yield_ratio": safe_divide(house_rent, house_price),
        "apartment_rental_yield_ratio": safe_divide(unit_rent, unit_price),
        "house_rental_yield_percent": safe_percent(house_rent, house_price),
        "apartment_rental_yield_percent": safe_percent(unit_rent, unit_price),
        "openagent_house_value_change_12m": parse_percent(market["house_value_change"]),
        "openagent_apartment_value_change_12m": parse_percent(market["unit_value_change"]),
        "openagent_house_sold_3m": parse_int(market["house_sold"]),
        "openagent_apartment_sold_3m": parse_int(market["unit_sold"]),
        "openagent_house_days_on_market_12m": parse_float(market["house_days_on_market"]),
        "openagent_apartment_days_on_market_12m": parse_float(market["unit_days_on_market"]),
        "openagent_house_rent_change_12m": parse_percent(market["house_rent_change"]),
        "openagent_apartment_rent_change_12m": parse_percent(market["unit_rent_change"]),
    }


def load_html(suburb, url, args):
    cache_path = args.cache_dir / f"{suburb['slug']}-{suburb['postcode']}.html"
    if cache_path.exists() and not args.refresh:
        return cache_path.read_text(encoding="utf-8")

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }

    last_error = None
    for attempt in range(1, args.retries + 1):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=args.timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                payload = response.read().decode(charset, errors="replace")
                cache_path.write_text(payload, encoding="utf-8")
                return payload
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                raise ValueError(f"Profile page not found: {url}") from exc
            last_error = exc
        except Exception as exc:  # noqa: BLE001
            last_error = exc
        if attempt < args.retries:
            time.sleep(min(5, attempt))

    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def parse_market_metrics(html_text):
    text = html_to_text(html_text)
    compact = re.sub(r"\s+", " ", html.unescape(text)).strip()
    compact = compact.replace("House values have increased", " ")

    marker = "Houses Units"
    if marker not in compact:
        raise ValueError("Could not find the Houses/Units market metrics block in page text.")
    relevant = compact[compact.index(marker) :]

    labels = [
        "Median price",
        "Change in value",
        "Sold",
        "Median days on market",
        "Average rent",
        "Change in rent",
    ]
    values = {}
    for index, label in enumerate(labels):
        start = relevant.find(label)
        if start == -1:
            raise ValueError(f'Could not find "{label}" in market metrics block.')
        start += len(label)
        next_start = len(relevant)
        for later_label in labels[index + 1 :]:
            candidate = relevant.find(later_label, start)
            if candidate != -1:
                next_start = min(next_start, candidate)
        block = relevant[start:next_start]
        values[label] = extract_pair_tokens(block, label)

    return {
        "house_price": values["Median price"][0],
        "unit_price": values["Median price"][1],
        "house_value_change": values["Change in value"][0],
        "unit_value_change": values["Change in value"][1],
        "house_sold": values["Sold"][0],
        "unit_sold": values["Sold"][1],
        "house_days_on_market": values["Median days on market"][0],
        "unit_days_on_market": values["Median days on market"][1],
        "house_rent": values["Average rent"][0],
        "unit_rent": values["Average rent"][1],
        "house_rent_change": values["Change in rent"][0],
        "unit_rent_change": values["Change in rent"][1],
    }


def extract_pair_tokens(block, label):
    cleaned = block
    cleaned = cleaned.replace("Past 3 months", " ")
    cleaned = cleaned.replace("Past 12 months", " ")
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    tokens = re.findall(TOKEN_PATTERN, cleaned)
    if len(tokens) < 2:
        raise ValueError(f'Could not parse house/unit values for "{label}" from "{cleaned}"')
    return tokens[0], tokens[1]


def html_to_text(html_text):
    parser = TextExtractor()
    parser.feed(html_text)
    parser.close()
    return parser.get_text()


def normalize_suburb_name(name):
    cleaned = re.sub(r"\s+", " ", name.strip())
    return cleaned.title()


def slugify(value):
    text = value.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def parse_money(value):
    if value is None:
        return None
    token = value.replace("$", "").replace(",", "").strip().upper()
    multiplier = 1.0
    if token.endswith("K"):
        multiplier = 1_000.0
        token = token[:-1]
    elif token.endswith("M"):
        multiplier = 1_000_000.0
        token = token[:-1]
    elif token.endswith("B"):
        multiplier = 1_000_000_000.0
        token = token[:-1]
    return round(float(token) * multiplier, 2)


def parse_percent(value):
    if value is None:
        return None
    return round(float(value.replace("%", "").strip()), 4)


def parse_int(value):
    if value in (None, ""):
        return 0
    return int(float(str(value).replace(",", "").strip()))


def parse_float(value):
    if value in (None, ""):
        return None
    return round(float(str(value).replace(",", "").strip()), 4)


def safe_divide(numerator, denominator):
    if not numerator or not denominator:
        return None
    return round(numerator / denominator, 8)


def safe_percent(numerator, denominator):
    ratio = safe_divide(numerator, denominator)
    return round(ratio * 100, 6) if ratio is not None else None


def build_failure_row(suburb, exc):
    return {
        "year": suburb["year"],
        "postcode": suburb["postcode"],
        "suburb": suburb["suburb"],
        "suburb_key": suburb["suburb_key"],
        "region_label": suburb["region_label"],
        "source_url": f"{SOURCE_BASE_URL}/{suburb['slug']}-{suburb['postcode']}",
        "error": str(exc),
    }


def write_csv(path, rows, fieldnames):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


RESULT_FIELDS = [
    "year",
    "postcode",
    "suburb",
    "suburb_key",
    "region_label",
    "source_url",
    "sales_count_house_source_csv",
    "sales_count_apartment_source_csv",
    "openagent_house_median_price_aud",
    "openagent_apartment_median_price_aud",
    "openagent_house_average_rent_aud",
    "openagent_apartment_average_rent_aud",
    "house_rental_yield_ratio",
    "apartment_rental_yield_ratio",
    "house_rental_yield_percent",
    "apartment_rental_yield_percent",
    "openagent_house_value_change_12m",
    "openagent_apartment_value_change_12m",
    "openagent_house_sold_3m",
    "openagent_apartment_sold_3m",
    "openagent_house_days_on_market_12m",
    "openagent_apartment_days_on_market_12m",
    "openagent_house_rent_change_12m",
    "openagent_apartment_rent_change_12m",
]

FAILURE_FIELDS = [
    "year",
    "postcode",
    "suburb",
    "suburb_key",
    "region_label",
    "source_url",
    "error",
]


if __name__ == "__main__":
    main()
