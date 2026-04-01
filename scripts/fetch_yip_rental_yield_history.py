#!/usr/bin/env python3
import argparse
import csv
import json
import random
import re
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

DEFAULT_INPUT = Path("temp_data_aggregated/yearly_suburb_metrics.csv")
DEFAULT_OUTPUT = Path("temp_data_aggregated/yip_rental_yield_history.csv")
DEFAULT_FAILURES = Path("temp_data_aggregated/yip_rental_yield_history_failures.csv")
DEFAULT_CACHE_DIR = Path("cache/yip-suburb-pages")
SOURCE_BASE_URL = "https://www.yourinvestmentpropertymag.com.au/top-suburbs/nsw"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)


def main():
    args = parse_args()
    selected_year = resolve_target_year(args.input, args.year)
    suburbs = load_target_suburbs(args.input, selected_year, args.min_sales)
    if args.limit:
        suburbs = suburbs[: args.limit]
    if not suburbs:
        raise SystemExit("No eligible suburb rows matched the filter.")

    args.cache_dir.mkdir(parents=True, exist_ok=True)
    history_rows = []
    failures = []

    for index, suburb in enumerate(suburbs, start=1):
        if index > 1:
            time.sleep(args.delay + random.uniform(0, 0.35))
        try:
            history_rows.extend(fetch_history_rows(suburb, args))
            print(f"[{index}/{len(suburbs)}] OK {suburb['suburb']} ({suburb['postcode']})")
        except Exception as exc:  # noqa: BLE001
            failures.append(build_failure_row(suburb, exc))
            print(f"[{index}/{len(suburbs)}] FAIL {suburb['suburb']} ({suburb['postcode']}): {exc}")

    write_csv(args.output, history_rows, RESULT_FIELDS)
    write_csv(args.failures_output, failures, FAILURE_FIELDS)

    print(f"Wrote {len(history_rows)} history rows to {args.output.resolve()}")
    print(f"Wrote {len(failures)} failures to {args.failures_output.resolve()}")


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Fetch 10-year rental-yield history from YIP suburb pages for suburbs whose latest yearly "
            "PSI row has house and apartment sales counts above the threshold."
        )
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--failures-output", type=Path, default=DEFAULT_FAILURES)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE_DIR)
    parser.add_argument("--year", default="latest", help='Target PSI year, or "latest" (default).')
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


def fetch_history_rows(suburb, args):
    url = f"{SOURCE_BASE_URL}/{suburb['postcode']}-{suburb['slug']}"
    html_text = load_html(suburb, url, args)
    rental_trends = extract_suburb_rental_trends(html_text)
    yearly_series = rental_trends["rental-yield"]["yearly"]

    rows = []
    for property_type in ("houses", "units"):
        for point in yearly_series.get(property_type, []):
            ratio = parse_float(point["value"])
            rows.append(
                {
                    "source_dataset_year": suburb["year"],
                    "postcode": suburb["postcode"],
                    "suburb": suburb["suburb"],
                    "suburb_key": suburb["suburb_key"],
                    "region_label": suburb["region_label"],
                    "property_type": singular_property_type(property_type),
                    "series_window": "10y",
                    "series_granularity": "yearly",
                    "date": point["dateTime"],
                    "rental_yield_ratio": ratio,
                    "rental_yield_percent": round(ratio * 100, 6) if ratio is not None else None,
                    "sales_count_house_source_csv": suburb["sales_count_house"],
                    "sales_count_apartment_source_csv": suburb["sales_count_apartment"],
                    "source_url": url,
                }
            )
    if not rows:
        raise ValueError(f"No yearly rental-yield data found in {url}")
    return rows


def load_html(suburb, url, args):
    cache_path = args.cache_dir / f"{suburb['postcode']}-{suburb['slug']}.html"
    if cache_path.exists() and not args.refresh:
        return cache_path.read_text(encoding="utf-8")

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-AU,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Connection": "close",
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

    try:
        payload = fetch_with_curl(url, args.timeout)
        cache_path.write_text(payload, encoding="utf-8")
        return payload
    except Exception as exc:  # noqa: BLE001
        last_error = exc

    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def extract_suburb_rental_trends(html_text):
    marker = "window.suburbRentalTrends"
    marker_index = html_text.find(marker)
    if marker_index == -1:
        raise ValueError("Could not find window.suburbRentalTrends JSON in page HTML.")
    start_index = html_text.find("{", marker_index)
    if start_index == -1:
        raise ValueError("Could not find opening brace for window.suburbRentalTrends JSON.")

    brace_depth = 0
    in_string = False
    escape_next = False
    for index in range(start_index, len(html_text)):
        char = html_text[index]
        if escape_next:
            escape_next = False
            continue
        if char == "\\" and in_string:
            escape_next = True
            continue
        if char == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if char == "{":
            brace_depth += 1
        elif char == "}":
            brace_depth -= 1
            if brace_depth == 0:
                return json.loads(html_text[start_index : index + 1])

    raise ValueError("Could not find closing brace for window.suburbRentalTrends JSON.")


def fetch_with_curl(url, timeout):
    # curl.exe is a pragmatic fallback when urllib hits intermittent Windows socket issues.
    result = subprocess.run(
        ["curl.exe", "-L", "--fail", "--silent", "--show-error", "--max-time", str(int(timeout)), url],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result.stdout


def normalize_suburb_name(name):
    cleaned = re.sub(r"\s+", " ", name.strip())
    return cleaned.title()


def slugify(value):
    text = value.lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")


def singular_property_type(value):
    return "house" if value == "houses" else "unit"


def parse_int(value):
    if value in (None, ""):
        return 0
    return int(float(str(value).replace(",", "").strip()))


def parse_float(value):
    if value in (None, ""):
        return None
    return round(float(str(value).replace(",", "").strip()), 8)


def build_failure_row(suburb, exc):
    return {
        "source_dataset_year": suburb["year"],
        "postcode": suburb["postcode"],
        "suburb": suburb["suburb"],
        "suburb_key": suburb["suburb_key"],
        "region_label": suburb["region_label"],
        "source_url": f"{SOURCE_BASE_URL}/{suburb['postcode']}-{suburb['slug']}",
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
    "source_dataset_year",
    "postcode",
    "suburb",
    "suburb_key",
    "region_label",
    "property_type",
    "series_window",
    "series_granularity",
    "date",
    "rental_yield_ratio",
    "rental_yield_percent",
    "sales_count_house_source_csv",
    "sales_count_apartment_source_csv",
    "source_url",
]

FAILURE_FIELDS = [
    "source_dataset_year",
    "postcode",
    "suburb",
    "suburb_key",
    "region_label",
    "source_url",
    "error",
]


if __name__ == "__main__":
    main()
