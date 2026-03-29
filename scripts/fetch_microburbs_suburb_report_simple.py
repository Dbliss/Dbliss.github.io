#!/usr/bin/env python3
import argparse
import html
import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36"


def main():
    args = parse_args()
    suburb_param = f"{args.suburb} ({args.state})"
    shell_url = f"https://www.microburbs.com.au/report_generator/v3/suburb-report?suburb={urllib.parse.quote_plus(suburb_param)}"
    report_url = f"https://www.microburbs.com.au/report_generator/suburb-report?suburb={urllib.parse.quote_plus(suburb_param)}"

    report_html = fetch_text(report_url, referer=shell_url)
    token = search_group(r"const token = '([^']+)'", report_html)
    report_suburb = search_group(r"const sal = `([^`]+)`", report_html) or suburb_param

    if not token:
        raise SystemExit("Could not find Microburbs token in report HTML.")

    endpoints = {}
    for endpoint in ("msp", "mrp", "yield", "vacancy"):
        endpoints[endpoint] = fetch_graph_json(endpoint, report_suburb, token, shell_url)

    parsed = {
        "suburb": report_suburb,
        "shellUrl": shell_url,
        "reportUrl": report_url,
        "tokenFound": bool(token),
        "house": {
            "medianSalePrice": nested(endpoints["msp"], "house", "suburb", "msp"),
            "saleGrowth1y": normalize_ratio(nested(endpoints["msp"], "house", "suburb", "1y_g")),
            "medianRent": nested(endpoints["mrp"], "house", "suburb", "mrp"),
            "rentGrowth1y": normalize_ratio(nested(endpoints["mrp"], "house", "suburb", "1y_g")),
            "yield": normalize_ratio(nested(endpoints["yield"], "house", "suburb", "yield")),
            "vacancy": normalize_ratio(nested(endpoints["vacancy"], "house", "suburb", "vacancy")),
        },
        "unit": {
            "medianSalePrice": nested(endpoints["msp"], "unit", "suburb", "msp"),
            "saleGrowth1y": normalize_ratio(nested(endpoints["msp"], "unit", "suburb", "1y_g")),
            "medianRent": nested(endpoints["mrp"], "unit", "suburb", "mrp"),
            "rentGrowth1y": normalize_ratio(nested(endpoints["mrp"], "unit", "suburb", "1y_g")),
            "yield": normalize_ratio(nested(endpoints["yield"], "unit", "suburb", "yield")),
            "vacancy": normalize_ratio(nested(endpoints["vacancy"], "unit", "suburb", "vacancy")),
        },
        "rawSummary": summarize_raw(endpoints),
    }

    if args.html_out:
        args.html_out.parent.mkdir(parents=True, exist_ok=True)
        args.html_out.write_text(build_html_report(parsed), encoding="utf-8")

    print(json.dumps(parsed, indent=2))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--suburb", required=True, help='Example: "Manly"')
    parser.add_argument("--state", required=True, help='Example: "NSW"')
    parser.add_argument("--html-out", type=Path, help='Optional HTML output path, e.g. "tmp/manly-report.html"')
    return parser.parse_args()


def fetch_graph_json(endpoint, report_suburb, token, referer):
    url = (
        f"https://www.microburbs.com.au/report_generator/suburb_report/graphs/"
        f"{endpoint}/{urllib.parse.quote(report_suburb)}"
        f"?suburb={urllib.parse.quote(report_suburb)}&token={urllib.parse.quote(token)}&blur=true"
    )
    raw = fetch_text(url, referer=referer, accept="application/json, text/plain, */*")
    return json.loads(raw)


def fetch_text(url, referer=None, accept="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"):
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": accept,
        "Accept-Language": "en-AU,en;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
    }
    if referer:
        headers["Referer"] = referer
        headers["Origin"] = "https://www.microburbs.com.au"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        charset = response.headers.get_content_charset() or "utf-8"
        return response.read().decode(charset, errors="replace")


def search_group(pattern, text):
    match = re.search(pattern, text, flags=re.I)
    return match.group(1) if match else None


def nested(mapping, *keys):
    current = mapping
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def normalize_ratio(value):
    if value is None:
        return None
    value = float(value)
    if abs(value) > 1:
        value /= 100
    return round(value, 4)


def build_html_report(parsed):
    suburb = html.escape(parsed["suburb"])
    shell_url = html.escape(parsed["shellUrl"])
    report_url = html.escape(parsed["reportUrl"])
    raw_json = html.escape(json.dumps(parsed["rawSummary"], indent=2))
    house = parsed["house"]
    unit = parsed["unit"]
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Microburbs Debug Report: {suburb}</title>
  <style>
    :root {{
      --bg: #f5f1e8;
      --panel: #fffdf8;
      --ink: #1a1a1a;
      --muted: #6b675f;
      --line: #d9d1c3;
      --accent: #0f5c4d;
    }}
    body {{
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(180deg, #efe7d7 0%, var(--bg) 100%);
      color: var(--ink);
    }}
    .wrap {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 48px;
    }}
    h1, h2 {{
      margin: 0 0 12px;
      line-height: 1.1;
    }}
    p {{
      margin: 0 0 12px;
      color: var(--muted);
    }}
    .hero {{
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 24px;
      margin-bottom: 20px;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }}
    .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 18px;
    }}
    .metric {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 0;
      border-top: 1px solid var(--line);
    }}
    .metric:first-of-type {{
      border-top: 0;
    }}
    .label {{
      color: var(--muted);
    }}
    .value {{
      font-weight: 700;
    }}
    a {{
      color: var(--accent);
    }}
    details {{
      background: var(--panel);
      border: 1px solid var(--line);
      padding: 18px;
    }}
    pre {{
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      margin: 12px 0 0;
    }}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <h1>{suburb}</h1>
      <p>This is a local debug view of what the simple Microburbs scraper pulled.</p>
      <p>Shell page: <a href="{shell_url}">{shell_url}</a></p>
      <p>Report page: <a href="{report_url}">{report_url}</a></p>
    </section>
    <section class="grid">
      {build_metric_card("House", house)}
      {build_metric_card("Unit", unit)}
    </section>
    <details>
      <summary>Raw endpoint summary</summary>
      <pre>{raw_json}</pre>
    </details>
  </div>
</body>
</html>
"""


def build_metric_card(title, data):
    rows = []
    for label, key in (
        ("Median sale price", "medianSalePrice"),
        ("1y sale growth", "saleGrowth1y"),
        ("Median rent", "medianRent"),
        ("1y rent growth", "rentGrowth1y"),
        ("Yield", "yield"),
        ("Vacancy", "vacancy"),
    ):
        rows.append(
            f'<div class="metric"><div class="label">{html.escape(label)}</div><div class="value">{html.escape(format_value(data.get(key), key))}</div></div>'
        )
    return f'<article class="card"><h2>{html.escape(title)}</h2>{"".join(rows)}</article>'


def format_value(value, key):
    if value is None:
        return "-"
    if "Price" in key:
        return f"${value:,.0f}"
    if key == "medianRent":
        return f"${value:,.0f}/wk"
    if key in {"saleGrowth1y", "rentGrowth1y", "yield", "vacancy"}:
        return f"{value * 100:.2f}%"
    return str(value)


def summarize_raw(endpoints):
    summary = {}
    for endpoint, payload in endpoints.items():
        summary[endpoint] = {}
        for property_type in ("house", "unit"):
            node = payload.get(property_type, {}) if isinstance(payload, dict) else {}
            suburb_node = node.get("suburb", {}) if isinstance(node, dict) else {}
            summary[endpoint][property_type] = {
                key: value
                for key, value in suburb_node.items()
                if key != "html"
            }
    return summary


if __name__ == "__main__":
    main()
