#!/usr/bin/env python3
import argparse
import csv
import json
import re
from pathlib import Path


DEFAULT_MARKET_PATH = Path("src/data/generated/wealthPropertyMarket.json")
DEFAULT_OUTPUT = Path("public/data/generated/suburbBoundariesManifest.json")
DEFAULT_CHUNK_DIR = Path("public/data/generated/suburb-boundaries")
DEFAULT_LOOKUP_OUTPUT = Path("src/data/generated/wealthSuburbLookup.json")
DEFAULT_SUBURB_CSV = Path("australia_suburbs_population_gt_1000_abs_2021.csv")
SAL_PREFIX_TO_STATE = {
    "1": "NSW",
    "2": "VIC",
    "3": "QLD",
    "4": "SA",
    "5": "WA",
    "6": "TAS",
    "7": "NT",
    "8": "ACT",
}


def main():
    args = parse_args()
    market_payload = load_json(args.market)
    market_suburbs = market_payload.get("suburbs", {}) if isinstance(market_payload, dict) else {}
    csv_lookup = load_suburb_csv_lookup(args.suburbs_csv)
    suburb_lookup_payload = build_market_lookup_payload(
        market_suburbs,
        csv_lookup,
        market_payload.get("metadata", {}).get("generatedAt"),
    )
    market_by_sal = {
        item["salCode2021"]: item
        for item in suburb_lookup_payload["suburbsBySlug"].values()
        if item.get("salCode2021")
    }

    boundary_payload = load_json(args.boundaries)
    features = list(iter_features(boundary_payload))
    chunks = {}
    suburb_lookup = {}
    states = {}

    for feature in features:
        props = feature.setdefault("properties", {})
        sal_code = str(
            props.get("salCode2021")
            or props.get("SAL_CODE21")
            or props.get("sal_code_2021")
            or ""
        ).strip().upper()
        if not sal_code:
            continue

        state = str(
            props.get("state")
            or props.get("STATE_CODE")
            or props.get("STE_NAME21")
            or props.get("state_code")
            or ""
        ).strip().upper()
        if not state:
            state = infer_state_from_sal(sal_code)

        name = str(
            props.get("name")
            or props.get("SAL_NAME21")
            or props.get("suburb")
            or ""
        ).strip()
        chunk_id = slugify(state or "unknown")
        market_suburb = market_by_sal.get(sal_code)
        bbox = props.get("bbox") or feature_bbox(feature.get("geometry"))
        centroid = props.get("centroid") or feature_centroid(feature.get("geometry"))
        has_market_data = market_suburb is not None

        cleaned_feature = {
            "type": "Feature",
            "properties": {
                "salCode2021": sal_code,
                "name": name,
                "state": state,
                "bbox": bbox,
                "centroid": centroid,
                "hasMarketData": has_market_data,
            },
            "geometry": simplify_geometry(feature.get("geometry"), args.decimal_places),
        }
        chunks.setdefault(chunk_id, []).append(cleaned_feature)
        states[state] = {
            "code": state,
            "name": state,
            "chunk": chunk_id,
        }
        suburb_lookup[sal_code] = {
            "salCode2021": sal_code,
            "name": name,
            "state": state,
            "chunk": chunk_id,
            "bbox": bbox,
            "centroid": centroid,
            "hasMarketData": has_market_data,
        }

    args.chunk_dir.mkdir(parents=True, exist_ok=True)
    manifest_chunks = {}
    for chunk_id, chunk_features in sorted(chunks.items()):
        output_path = args.chunk_dir / f"{chunk_id}.geojson"
        feature_collection = {"type": "FeatureCollection", "features": chunk_features}
        output_path.write_text(json.dumps(feature_collection, separators=(",", ":")) + "\n", encoding="utf-8")
        chunk_state = chunk_features[0].get("properties", {}).get("state") if chunk_features else None
        manifest_chunks[chunk_id] = {
            "id": chunk_id,
            "state": chunk_state,
            "path": "/" + output_path.relative_to(Path("public")).as_posix(),
            "featureCount": len(chunk_features),
            "bbox": collection_bbox(chunk_features),
        }

    manifest = {
        "generatedAt": market_payload.get("metadata", {}).get("generatedAt"),
        "source": str(args.boundaries),
        "chunks": manifest_chunks,
        "states": [states[key] for key in sorted(states)],
        "suburbs": suburb_lookup,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    hydrate_lookup_with_geometry(suburb_lookup_payload, suburb_lookup)
    args.lookup_output.parent.mkdir(parents=True, exist_ok=True)
    args.lookup_output.write_text(json.dumps(suburb_lookup_payload, indent=2) + "\n", encoding="utf-8")


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--boundaries", type=Path, required=True, help="ABS SAL GeoJSON file")
    parser.add_argument("--market", type=Path, default=DEFAULT_MARKET_PATH)
    parser.add_argument("--suburbs-csv", type=Path, default=DEFAULT_SUBURB_CSV)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--chunk-dir", type=Path, default=DEFAULT_CHUNK_DIR)
    parser.add_argument("--lookup-output", type=Path, default=DEFAULT_LOOKUP_OUTPUT)
    parser.add_argument("--decimal-places", type=int, default=5)
    return parser.parse_args()


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def load_suburb_csv_lookup(path):
    lookup = {}
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            suburb = clean_suburb_name(str(row.get("suburb") or ""))
            sal_code = str(row.get("sal_code_2021") or "").strip().upper()
            if not suburb or not sal_code:
                continue
            state = SAL_PREFIX_TO_STATE.get(sal_code[3:4], "")
            if not state:
                continue
            lookup[(normalise_name(suburb), state)] = sal_code
    return lookup


def build_market_lookup_payload(market_suburbs, csv_lookup, generated_at):
    suburbs_by_slug = {}
    for slug, suburb in market_suburbs.items():
        if not isinstance(suburb, dict):
            continue
        suburb_name = str(suburb.get("suburb") or "").strip()
        state = str(suburb.get("state") or "").strip().upper()
        if not suburb_name or not state:
            continue
        sal_code = csv_lookup.get((normalise_name(suburb_name), state))
        if not sal_code:
            continue
        suburbs_by_slug[slug] = {
            "slug": slug,
            "suburb": suburb_name,
            "state": state,
            "postcode": suburb.get("postcode"),
            "label": suburb.get("label"),
            "salCode2021": sal_code,
            "centroid": None,
            "geometryChunk": None,
        }
    return {
        "generatedAt": generated_at,
        "suburbsBySlug": suburbs_by_slug,
    }


def hydrate_lookup_with_geometry(lookup_payload, suburb_lookup):
    by_sal = {entry["salCode2021"]: entry for entry in lookup_payload.get("suburbsBySlug", {}).values()}
    for sal_code, geometry in suburb_lookup.items():
        target = by_sal.get(sal_code)
        if not target:
            continue
        target["centroid"] = geometry.get("centroid")
        target["geometryChunk"] = geometry.get("chunk")


def clean_suburb_name(value):
    value = re.sub(r"\s+\([^)]*\)$", "", str(value).strip())
    return re.sub(r"\s+", " ", value)


def normalise_name(value):
    cleaned = clean_suburb_name(value).lower()
    return re.sub(r"[^a-z0-9]+", "", cleaned)


def iter_features(payload):
    if payload.get("type") == "FeatureCollection":
        return payload.get("features", [])
    return payload.get("features", [])


def infer_state_from_sal(sal_code):
    prefixes = {
        "1": "NSW",
        "2": "VIC",
        "3": "QLD",
        "4": "SA",
        "5": "WA",
        "6": "TAS",
        "7": "NT",
        "8": "ACT",
    }
    return prefixes.get(sal_code[3:4], "")


def slugify(value):
    text = "".join(ch.lower() if ch.isalnum() else "-" for ch in str(value))
    return "-".join(part for part in text.split("-") if part)


def simplify_geometry(geometry, decimal_places):
    if not isinstance(geometry, dict):
        return geometry
    return {
        **geometry,
        "coordinates": round_coordinates(geometry.get("coordinates"), decimal_places),
    }


def round_coordinates(value, decimal_places):
    if isinstance(value, list):
        if value and all(isinstance(item, (int, float)) for item in value[:2]):
            return [round(float(item), decimal_places) for item in value]
        return [round_coordinates(item, decimal_places) for item in value]
    return value


def feature_bbox(geometry):
    coords = list(flatten_coordinates(geometry.get("coordinates") if isinstance(geometry, dict) else []))
    if not coords:
        return None
    xs = [point[0] for point in coords]
    ys = [point[1] for point in coords]
    return [min(xs), min(ys), max(xs), max(ys)]


def feature_centroid(geometry):
    coords = list(flatten_coordinates(geometry.get("coordinates") if isinstance(geometry, dict) else []))
    if not coords:
        return None
    x = sum(point[0] for point in coords) / len(coords)
    y = sum(point[1] for point in coords) / len(coords)
    return [round(x, 6), round(y, 6)]


def flatten_coordinates(value):
    if isinstance(value, list):
        if value and all(isinstance(item, (int, float)) for item in value[:2]):
            yield [float(value[0]), float(value[1])]
            return
        for item in value:
            yield from flatten_coordinates(item)


def collection_bbox(features):
    boxes = [feature.get("properties", {}).get("bbox") for feature in features]
    boxes = [box for box in boxes if isinstance(box, list) and len(box) == 4]
    if not boxes:
        return None
    return [
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    ]


if __name__ == "__main__":
    raise SystemExit(main())
