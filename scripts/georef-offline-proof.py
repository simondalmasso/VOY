from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PINNED = ROOT / "order056" / "georef" / "official-v2-pinned"
DEFAULT_CORPUS = ROOT / "order056" / "corpus" / "destination-corpus-v2.json"
DEFAULT_ROWS = ROOT / "order056" / "benchmarks" / "final-resolver-rows.json"
DEFAULT_OUT = ROOT / "order056" / "benchmarks" / "final-resolver-offline-authority.json"
DEFAULT_MANIFEST = ROOT / "order056" / "georef" / "OFFLINE_AUTHORITY_MANIFEST.json"

spec = importlib.util.spec_from_file_location("georef_runtime_generator", ROOT / "scripts" / "generate-georef-runtime-authority.py")
gen = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(gen)


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def canonical(value) -> str:
    return gen.fold(value)


def load_provenance_resources() -> dict[str, dict]:
    boundary = read_json(PINNED / "provenance-boundaries.json")
    localities = read_json(PINNED / "provenance-localities.json")
    resources = []
    resources.extend(boundary.get("resources", []) if isinstance(boundary, dict) else boundary)
    resources.extend(localities.get("resources", []) if isinstance(localities, dict) else localities)
    by_file = {item["file"]: item for item in resources}
    required = ["provincias.zip", "departamentos.zip", "municipios.zip", "localidades-censales.geojson", "localidades.geojson"]
    for filename in required:
        item = by_file.get(filename)
        if not item:
            raise SystemExit(f"missing provenance: {filename}")
        actual = gen.sha256(PINNED / filename)
        if actual != str(item.get("sha256", "")).lower():
            raise SystemExit(f"sha256 mismatch: {filename}")
    return {name: by_file[name] for name in required}


def load_shapes(zip_name: str):
    with zipfile.ZipFile(PINNED / zip_name) as archive:
        names = archive.namelist()
        shp = archive.read(next(n for n in names if n.lower().endswith(".shp")))
        dbf = archive.read(next(n for n in names if n.lower().endswith(".dbf")))
    rows = gen.parse_dbf(dbf)
    shapes = gen.parse_shp(shp)
    if len(rows) != len(shapes):
        raise SystemExit(f"shape/dbf count mismatch for {zip_name}: {len(shapes)}/{len(rows)}")
    return list(zip(rows, shapes))


def point_in_ring(lon: float, lat: float, ring) -> bool:
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if ((yi > lat) != (yj > lat)) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def contains(shape: dict, lon: float, lat: float) -> bool:
    xmin, ymin, xmax, ymax = shape["bbox"]
    if lon < xmin or lon > xmax or lat < ymin or lat > ymax:
        return False
    inside = False
    for ring in shape["rings"]:
        if point_in_ring(lon, lat, ring):
            inside = not inside
    return inside


def build_spatial_index(records):
    return {str(row.get("IN1") or "").strip(): {"row": row, "shape": shape} for row, shape in records if str(row.get("IN1") or "").strip()}


def province_at(province_records, lon: float, lat: float):
    matches = []
    for row, shape in province_records:
        if contains(shape, lon, lat):
            matches.append({"id": str(row.get("IN1") or "").strip(), "name": str(row.get("NAM") or "").strip()})
    return matches[0] if len(matches) == 1 else None


def locality_records():
    out: dict[str, list[dict]] = {}
    for filename in ("localidades-censales.geojson", "localidades.geojson"):
        data = read_json(PINNED / filename)
        for feature in data.get("features", []):
            props = feature.get("properties") or {}
            province = props.get("provincia") or {}
            pid = str(province.get("id") or "").zfill(2)
            names = []
            name = str(props.get("nombre") or "").strip()
            if name:
                names.append(name)
            census = props.get("localidad_censal") or {}
            census_name = str(census.get("nombre") or "").strip()
            if census_name:
                names.append(census_name)
            for locality_name in names:
                out.setdefault(f"{pid}|{canonical(locality_name)}", []).append({
                    "name": locality_name,
                    "province": province,
                    "municipio": props.get("municipio") or {},
                    "departamento": props.get("departamento") or {},
                    "source_file": filename,
                    "entity_id": props.get("id"),
                })
    return out


def prove_locality(suggestion: dict, province_records, municipality_by_id, department_by_id, official_localities):
    coords = suggestion.get("coordinates") or {}
    try:
        lat, lon = float(coords["lat"]), float(coords["lon"])
    except Exception:
        return {"status": "unproven", "reason": "invalid_coordinates"}
    asserted_province = suggestion.get("province") or {}
    asserted_pid = str(asserted_province.get("id") or "")
    spatial_province = province_at(province_records, lon, lat)
    if not spatial_province:
        return {"status": "unproven", "reason": "province_spatial_ambiguous_or_missing"}
    if asserted_pid and asserted_pid != spatial_province["id"]:
        return {"status": "mismatch", "reason": "asserted_province_disagrees_with_official_polygon", "official_province": spatial_province}
    locality = suggestion.get("locality")
    if not locality or not str(locality.get("name") or "").strip():
        return {"status": "no_locality_asserted", "reason": "fail_closed", "official_province": spatial_province}
    locality_name = str(locality.get("name") or "").strip()
    key = f"{spatial_province['id']}|{canonical(locality_name)}"
    entities = official_localities.get(key, [])
    if not entities:
        return {"status": "unproven", "reason": "locality_name_province_pair_absent_from_official_snapshot", "official_province": spatial_province}
    if spatial_province["id"] == "02" and canonical(locality_name) == canonical("Ciudad Autónoma de Buenos Aires"):
        return {"status": "proven", "method": "province_coextensive_census_locality", "official_province": spatial_province, "official_locality": locality_name}
    attempts = []
    for entity in entities:
        municipio = entity.get("municipio") or {}
        departamento = entity.get("departamento") or {}
        mid = str(municipio.get("id") or "")
        did = str(departamento.get("id") or "")
        if mid and mid in municipality_by_id:
            attempts.append({"kind": "municipio", "id": mid})
            if contains(municipality_by_id[mid]["shape"], lon, lat):
                return {"status": "proven", "method": "official_locality_pair_plus_municipio_polygon", "official_province": spatial_province, "official_locality": entity["name"], "parent": {"kind": "municipio", "id": mid, "name": municipio.get("nombre")}}
        if did and did in department_by_id:
            attempts.append({"kind": "departamento", "id": did})
            if contains(department_by_id[did]["shape"], lon, lat):
                return {"status": "proven", "method": "official_locality_pair_plus_departamento_polygon", "official_province": spatial_province, "official_locality": entity["name"], "parent": {"kind": "departamento", "id": did, "name": departamento.get("nombre")}}
    return {"status": "unproven", "reason": "coordinate_not_inside_official_locality_parent", "official_province": spatial_province, "official_locality": locality_name, "attempted_parents": attempts}


def pct(n, d):
    return round((100.0 * n / d) if d else 100.0, 2)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=Path, default=DEFAULT_ROWS)
    parser.add_argument("--corpus", type=Path, default=DEFAULT_CORPUS)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    args = parser.parse_args()

    provenance = load_provenance_resources()
    province_records = load_shapes("provincias.zip")
    department_by_id = build_spatial_index(load_shapes("departamentos.zip"))
    municipality_by_id = build_spatial_index(load_shapes("municipios.zip"))
    official_localities = locality_records()
    rows = read_json(args.rows)
    corpus = read_json(args.corpus)
    cases = {case["id"]: case for case in corpus["cases"]}

    locality_assertions = 0
    locality_proven = 0
    locality_unproven = 0
    locality_mismatch = 0
    no_locality_asserted = 0
    province_mismatch = 0
    authority_checks = 0
    proof_methods: dict[str, int] = {}

    for row in rows:
        for suggestion in row.get("suggestions", []):
            authority_checks += 1
            proof = prove_locality(suggestion, province_records, municipality_by_id, department_by_id, official_localities)
            suggestion["offline_authority"] = proof
            status = proof["status"]
            if suggestion.get("locality") and str((suggestion.get("locality") or {}).get("name") or "").strip():
                locality_assertions += 1
                if status == "proven":
                    locality_proven += 1
                    method = proof.get("method", "unknown")
                    proof_methods[method] = proof_methods.get(method, 0) + 1
                elif status == "mismatch":
                    locality_mismatch += 1
                else:
                    locality_unproven += 1
            else:
                no_locality_asserted += 1
            if proof.get("reason") == "asserted_province_disagrees_with_official_polygon":
                province_mismatch += 1

    local_case_ids = [c["id"] for c in corpus["cases"] if c.get("expected_top") and not c.get("explicit_geography") and not c.get("no_result_acceptable")]
    explicit_ids = [c["id"] for c in corpus["cases"] if c.get("explicit_geography")]
    no_result_ids = [c["id"] for c in corpus["cases"] if c.get("no_result_acceptable")]
    by_id = {row["id"]: row for row in rows}
    top1 = pct(sum(1 for cid in local_case_ids if by_id[cid].get("top1_match")), len(local_case_ids))
    top3 = pct(sum(1 for cid in local_case_ids if by_id[cid].get("top3_match")), len(local_case_ids))
    wrong = 0
    for cid in local_case_ids:
        row = by_id[cid]
        expected = cases[cid]["expected_top"]["province"]
        actual = row.get("top1_province")
        if actual and canonical(actual) != canonical(expected):
            wrong += 1
    wrong_pct = pct(wrong, len(local_case_ids))
    explicit = pct(sum(1 for cid in explicit_ids if by_id[cid].get("top1_match")), len(explicit_ids))
    fail_closed = pct(sum(1 for cid in no_result_ids if by_id[cid].get("fail_closed")), len(no_result_ids))
    latencies = sorted(float(row.get("latency_ms") or 0) for row in rows)
    median = latencies[(len(latencies) - 1) // 2] if latencies else None
    p95 = latencies[int((len(latencies) - 1) * 0.95)] if latencies else None

    metrics = {
        "local_intent_top1_relevance_pct": top1,
        "top3_acceptable_recall_pct": top3,
        "wrong_province_top1_rate_pct": wrong_pct,
        "explicit_geography_respect_pct": explicit,
        "no_result_fail_closed_pct": fail_closed,
        "false_locality_invention_count": locality_mismatch + locality_unproven,
        "locality_assertions": locality_assertions,
        "locality_assertions_officially_proven": locality_proven,
        "locality_unproven": locality_unproven,
        "locality_mismatch": locality_mismatch,
        "locality_not_asserted_fail_closed": no_locality_asserted,
        "province_spatial_mismatch": province_mismatch,
        "authority_checks": authority_checks,
        "median_latency_ms": median,
        "p95_latency_ms": p95,
        "http_success_pct": pct(sum(1 for row in rows if row.get("status") == 200), len(rows)),
    }
    qg = corpus["quality_gates"]
    gates = {
        "local_intent_top1_relevance": top1 >= qg["local_intent_top1_relevance_min"] * 100,
        "top3_acceptable_recall": top3 >= qg["top3_acceptable_recall_min"] * 100,
        "wrong_province_top1_rate": wrong_pct <= qg["wrong_province_top1_rate_max"] * 100,
        "explicit_geography_respect": explicit >= qg["explicit_geography_respect_min"] * 100,
        "no_result_fail_closed": fail_closed >= qg["no_result_fail_closed_min"] * 100,
        "false_locality_invention": locality_mismatch == 0 and locality_unproven == 0 and locality_proven == locality_assertions,
        "province_spatial_consistency": province_mismatch == 0,
        "authority_coverage": authority_checks == sum(len(row.get("suggestions", [])) for row in rows),
        "median_latency": median is not None and median <= 600,
        "p95_latency": p95 is not None and p95 <= 1200,
    }

    manifest = {
        "authority": "PINNED_OFFICIAL_GEOREF_SNAPSHOT",
        "dataset_identity": "Datos Argentina / GeoRef — modernizacion dataset 7 — Servicio de normalización de datos geográficos",
        "source_urls": [provenance[name]["source_url"] for name in provenance],
        "retrieval_timestamps": {name: provenance[name].get("retrieved_at") for name in provenance},
        "sha256": {name: provenance[name]["sha256"] for name in provenance},
        "dataset_resources": {name: {"distribution": provenance[name].get("distribution"), "identity": provenance[name].get("identity") or f"GeoRef {name}"} for name in provenance},
        "geometry_crs": {
            "provincias.zip": "SHP PolygonZ; WGS84 / EPSG:4326",
            "departamentos.zip": "SHP PolygonZ; WGS84 / EPSG:4326",
            "municipios.zip": "SHP PolygonZ; WGS84 / EPSG:4326",
            "localidades-censales.geojson": "GeoJSON Point centroids + official province/municipio/departamento entity relations; WGS84 / EPSG:4326",
            "localidades.geojson": "GeoJSON Point centroids + official locality-censal/province/municipio/departamento entity relations; WGS84 / EPSG:4326",
        },
        "validation_algorithm": [
            "Use unsimplified official province PolygonZ point-in-polygon as province authority for every emitted coordinate.",
            "If locality is null/unknown, treat it as fail-closed and make no locality truth claim.",
            "For each asserted locality, require an exact accent-insensitive official locality-name + province-id entity pair from localidades-censales/localidades.",
            "Require the emitted coordinate to lie inside the exact official municipio polygon referenced by that locality entity; if unavailable, require its exact referenced departamento polygon.",
            "For Ciudad Autónoma de Buenos Aires only, the province polygon plus the official coextensive census-locality entity proves locality.",
            "Any asserted locality without a proving official entity/parent containment is UNPROVEN and fails the false-locality gate; any province polygon contradiction is a mismatch and fails.",
        ],
        "coverage": {
            "corpus_cases": len(corpus["cases"]),
            "emitted_suggestions_checked": authority_checks,
            "locality_assertions": locality_assertions,
            "locality_assertions_proven": locality_proven,
            "locality_not_asserted_fail_closed": no_locality_asserted,
            "locality_unproven": locality_unproven,
            "locality_mismatch": locality_mismatch,
            "province_mismatch": province_mismatch,
            "proof_methods": proof_methods,
        },
        "runtime_authority_generator": "scripts/generate-georef-runtime-authority.py",
        "offline_validator": "scripts/georef-offline-proof.py",
    }
    args.manifest.parent.mkdir(parents=True, exist_ok=True)
    args.manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest_sha = gen.sha256(args.manifest)
    output = {
        "benchmark": "ORDER056_FINAL_RESOLVER_PINNED_OFFICIAL_GEOREF_AUTHORITY",
        "generated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "corpus_id": corpus.get("corpus_id"),
        "corpus_sha256": corpus.get("corpus_sha256"),
        "case_count": len(corpus["cases"]),
        "provider": "photon_georef_contextual",
        "false_locality_authority": "PINNED_OFFICIAL_GEOREF_SNAPSHOT",
        "offline_authority_manifest": str(args.manifest.relative_to(ROOT)).replace("\\", "/"),
        "offline_authority_manifest_sha256": manifest_sha,
        "metrics": metrics,
        "gates": gates,
        "quality_gate_pass": all(gates.values()),
        "rows": rows,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"metrics": metrics, "gates": gates, "quality_gate_pass": output["quality_gate_pass"], "manifest_sha256": manifest_sha}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
