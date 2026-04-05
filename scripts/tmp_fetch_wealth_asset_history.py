from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import pathlib
import ssl
import sys
import urllib.parse
import urllib.request
from collections import OrderedDict


ASSET_SPECS = [
    {
        "key": "qqq",
        "label": "QQQ",
        "ticker": "QQQ",
        "max_lookback_years": 30,
        "currency": "USD",
        "source_url": "https://finance.yahoo.com/quote/QQQ/history/",
    },
    {
        "key": "asx200",
        "label": "ASX200",
        "ticker": "STW.AX",
        "max_lookback_years": 30,
        "currency": "AUD",
        "source_url": "https://finance.yahoo.com/quote/STW.AX/history/",
    },
    {
        "key": "vgs",
        "label": "International Developed Markets",
        "ticker": "VGS.AX",
        "max_lookback_years": 30,
        "currency": "AUD",
        "source_url": "https://finance.yahoo.com/quote/VGS.AX/history/",
    },
    {
        "key": "vge",
        "label": "Emerging Markets",
        "ticker": "VGE.AX",
        "max_lookback_years": 30,
        "currency": "AUD",
        "source_url": "https://finance.yahoo.com/quote/VGE.AX/history/",
    },
    {
        "key": "dbp",
        "label": "Gold & Silver",
        "ticker": "DBP",
        "max_lookback_years": 30,
        "currency": "USD",
        "source_url": "https://finance.yahoo.com/quote/DBP/history/",
    },
    {
        "key": "bonds",
        "label": "Bonds",
        "ticker": "VAF.AX",
        "max_lookback_years": 30,
        "currency": "AUD",
        "source_url": "https://finance.yahoo.com/quote/VAF.AX/history/",
    },
    {
        "key": "cash",
        "label": "High Interest Cash",
        "ticker": "AAA.AX",
        "max_lookback_years": 30,
        "currency": "AUD",
        "source_url": "https://finance.yahoo.com/quote/AAA.AX/history/",
    },
    {
        "key": "bitcoin",
        "label": "Bitcoin",
        "ticker": "BTC-USD",
        "max_lookback_years": 5,
        "currency": "USD",
        "source_url": "https://finance.yahoo.com/quote/BTC-USD/history/",
    },
]


def build_chart_url(ticker: str, range_value: str) -> str:
    encoded_ticker = urllib.parse.quote(ticker)
    return (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{encoded_ticker}"
        f"?interval=1d&range={range_value}&includeAdjustedClose=true&events=div%2Csplits"
    )


def fetch_chart_payload(ticker: str, range_value: str) -> dict:
    request = urllib.request.Request(
        build_chart_url(ticker, range_value),
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        },
    )
    ssl_context = ssl._create_unverified_context()
    with urllib.request.urlopen(request, timeout=30, context=ssl_context) as response:
        return json.loads(response.read().decode("utf-8"))


def extract_daily_adjusted_closes(payload: dict) -> list[tuple[dt.date, float]]:
    result = ((payload or {}).get("chart") or {}).get("result") or []
    if not result:
        error = ((payload or {}).get("chart") or {}).get("error") or {}
        raise ValueError(error.get("description") or "Yahoo Finance chart payload returned no results.")

    chart = result[0]
    timestamps = chart.get("timestamp") or []
    adjclose = (((chart.get("indicators") or {}).get("adjclose") or [{}])[0]).get("adjclose") or []

    rows: list[tuple[dt.date, float]] = []
    for timestamp, close in zip(timestamps, adjclose):
        if close is None or not math.isfinite(close):
            continue
        rows.append((dt.datetime.fromtimestamp(timestamp, dt.UTC).date(), float(close)))

    if len(rows) < 2:
        raise ValueError("Not enough adjusted-close rows to calculate monthly returns.")

    return rows


def collapse_to_month_end(daily_rows: list[tuple[dt.date, float]]) -> list[tuple[str, dt.date, float]]:
    month_map: "OrderedDict[str, tuple[dt.date, float]]" = OrderedDict()
    current_month = dt.date.today().strftime("%Y-%m")

    for date_value, close in daily_rows:
        month_key = date_value.strftime("%Y-%m")
        month_map[month_key] = (date_value, close)

    if current_month in month_map:
        month_map.pop(current_month, None)

    return [(month_key, date_value, close) for month_key, (date_value, close) in month_map.items()]


def build_monthly_returns(month_rows: list[tuple[str, dt.date, float]]) -> list[dict]:
    monthly_returns: list[dict] = []
    for index in range(1, len(month_rows)):
        previous_month, _, previous_close = month_rows[index - 1]
        month_key, date_value, close = month_rows[index]
        if previous_close <= 0:
            continue
        monthly_returns.append(
            {
                "month": month_key,
                "monthEnd": date_value.isoformat(),
                "previousMonth": previous_month,
                "totalReturn": round((close / previous_close) - 1, 8),
            }
        )
    if len(monthly_returns) < 24:
        raise ValueError("Not enough monthly returns after aggregation.")
    return monthly_returns


def trim_monthly_returns(monthly_returns: list[dict], max_lookback_years: int) -> list[dict]:
    safe_max_years = max(1, int(max_lookback_years))
    max_months = safe_max_years * 12
    if len(monthly_returns) <= max_months:
        return monthly_returns
    return monthly_returns[-max_months:]


def resolve_range_value(spec: dict) -> str:
    max_lookback_years = int(spec["max_lookback_years"])
    return f"{max_lookback_years}y" if max_lookback_years <= 4 else "max"


def fetch_asset_history(spec: dict) -> dict:
    payload = fetch_chart_payload(spec["ticker"], resolve_range_value(spec))
    daily_rows = extract_daily_adjusted_closes(payload)
    month_rows = collapse_to_month_end(daily_rows)
    monthly_returns = trim_monthly_returns(build_monthly_returns(month_rows), spec["max_lookback_years"])

    return {
        "key": spec["key"],
        "label": spec["label"],
        "ticker": spec["ticker"],
        "currency": spec["currency"],
        "lookbackYears": round(len(monthly_returns) / 12, 1),
        "source": "Yahoo Finance chart API",
        "sourceUrl": spec["source_url"],
        "startMonth": monthly_returns[0]["month"],
        "endMonth": monthly_returns[-1]["month"],
        "months": len(monthly_returns),
        "monthlyReturns": monthly_returns,
    }


def build_dataset() -> dict:
    assets = {}
    for spec in ASSET_SPECS:
        assets[spec["key"]] = fetch_asset_history(spec)

    return {
        "generatedAt": dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "monthsPerSimulationYear": 12,
        "assets": assets,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch historical monthly total-return data for Wealth Pathways bootstrap simulations."
    )
    parser.add_argument(
        "--output",
        default="src/data/generated/wealthAssetBootstrap.json",
        help="Output JSON path relative to the repo root.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = pathlib.Path(__file__).resolve().parents[1]
    output_path = (repo_root / args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    dataset = build_dataset()
    output_path.write_text(json.dumps(dataset, indent=2) + "\n", encoding="utf-8")

    asset_summaries = ", ".join(
        f"{asset['label']} ({asset['months']} months)"
        for asset in dataset["assets"].values()
    )
    print(f"Wrote {output_path}")
    print(asset_summaries)
    return 0


if __name__ == "__main__":
    sys.exit(main())
