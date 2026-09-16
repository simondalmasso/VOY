from __future__ import annotations

import hashlib
import json
import math
import struct
import unicodedata
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PINNED = ROOT / "order056" / "georef" / "official-v2-pinned"
OUT = ROOT / "src" / "georef-authority.generated.js"
SIMPLIFY_EPSILON_DEGREES = 0.0005
INTEGRATED_LOCALITIES = [
    ("82", "Santa Fe"), ("82", "Rosario"), ("14", "Córdoba"), ("50", "Mendoza"),
    ("66", "Salta"), ("02", "Ciudad Autónoma de Buenos Aires"), ("94", "Ushuaia"),
    ("22", "Resistencia"), ("34", "Formosa"), ("46", "La Rioja"),
]


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def fold(value: object) -> str:
    text = str(value or "").strip()
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    return " ".join(text.lower().split())


def load_provenance() -> dict:
    boundary = json.loads((PINNED / "provenance-boundaries.json").read_text(encoding="utf-8-sig"))
    localities = json.loads((PINNED / "provenance-localities.json").read_text(encoding="utf-8-sig"))
    resources = []
    resources.extend(boundary.get("resources", []) if isinstance(boundary, dict) else boundary)
    resources.extend(localities.get("resources", []) if isinstance(localities, dict) else localities)
    by_file = {r["file"]: r for r in resources}
    required = ["provincias.zip", "departamentos.zip", "municipios.zip", "localidades-censales.geojson", "localidades.geojson"]
    for name in required:
        if name not in by_file:
            raise SystemExit(f"missing provenance for {name}")
        actual = sha256(PINNED / name)
        expected = str(by_file[name]["sha256"]).lower()
        if actual != expected:
            raise SystemExit(f"sha256 mismatch for {name}: {actual} != {expected}")
    return {"boundary": boundary, "localities": localities, "resources": [by_file[n] for n in required]}


def parse_dbf(data: bytes) -> list[dict[str, str]]:
    count = struct.unpack_from("<I", data, 4)[0]
    header_len = struct.unpack_from("<H", data, 8)[0]
    record_len = struct.unpack_from("<H", data, 10)[0]
    fields: list[tuple[str, int]] = []
    pos = 32
    while pos < header_len and data[pos] != 0x0D:
        desc = data[pos : pos + 32]
        name = desc[:11].split(b"\0", 1)[0].decode("latin1").strip()
        fields.append((name, desc[16]))
        pos += 32
    rows: list[dict[str, str]] = []
    pos = header_len
    for _ in range(count):
        record = data[pos : pos + record_len]
        pos += record_len
        if not record or record[:1] == b"*":
            continue
        col = 1
        row: dict[str, str] = {}
        for name, width in fields:
            row[name] = record[col : col + width].decode("latin1", "replace").strip()
            col += width
        rows.append(row)
    return rows


def parse_shp(data: bytes) -> list[dict]:
    out: list[dict] = []
    pos = 100
    while pos + 8 <= len(data):
        _record_no, words = struct.unpack_from(">2i", data, pos)
        pos += 8
        content = data[pos : pos + words * 2]
        pos += words * 2
        if len(content) < 44:
            continue
        shape_type = struct.unpack_from("<i", content, 0)[0]
        if shape_type not in (5, 15, 25):
            continue
        bbox = struct.unpack_from("<4d", content, 4)
        part_count, point_count = struct.unpack_from("<2i", content, 36)
        parts = list(struct.unpack_from(f"<{part_count}i", content, 44))
        point_offset = 44 + 4 * part_count
        points = [struct.unpack_from("<2d", content, point_offset + 16 * i) for i in range(point_count)]
        rings = []
        for i, start in enumerate(parts):
            end = parts[i + 1] if i + 1 < len(parts) else len(points)
            ring = points[start:end]
            if len(ring) >= 4:
                rings.append(ring)
        out.append({"bbox": bbox, "rings": rings})
    return out


def perpendicular_distance(point, start, end) -> float:
    x, y = point
    x1, y1 = start
    x2, y2 = end
    dx, dy = x2 - x1, y2 - y1
    if dx == 0 and dy == 0:
        return math.hypot(x - x1, y - y1)
    return abs(dy * x - dx * y + x2 * y1 - y2 * x1) / math.hypot(dx, dy)


def rdp(points, epsilon: float):
    if len(points) <= 2:
        return points
    start, end = points[0], points[-1]
    index = -1
    max_distance = -1.0
    for i, point in enumerate(points[1:-1], 1):
        distance = perpendicular_distance(point, start, end)
        if distance > max_distance:
            max_distance = distance
            index = i
    if max_distance > epsilon:
        left = rdp(points[: index + 1], epsilon)
        right = rdp(points[index:], epsilon)
        return left[:-1] + right
    return [start, end]


def simplify_ring(ring, epsilon: float):
    points = list(ring)
    if points[0] == points[-1]:
        points = points[:-1]
    if len(points) < 4:
        return list(ring)
    cx = sum(x for x, _ in points) / len(points)
    cy = sum(y for _, y in points) / len(points)
    pivot = max(range(len(points)), key=lambda i: (points[i][0] - cx) ** 2 + (points[i][1] - cy) ** 2)
    sequence = points[pivot:] + points[:pivot] + [points[pivot]]
    simplified = rdp(sequence, epsilon)
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return simplified


def locality_map() -> dict[str, str]:
    canonical: dict[str, str] = {}
    for filename in ("localidades-censales.geojson", "localidades.geojson"):
        data = json.loads((PINNED / filename).read_text(encoding="utf-8"))
        for feature in data.get("features", []):
            props = feature.get("properties") or {}
            province = props.get("provincia") or {}
            pid = str(province.get("id") or "").zfill(2)
            name = str(props.get("nombre") or "").strip()
            if not pid or not name:
                continue
            key = f"{pid}|{fold(name)}"
            canonical.setdefault(key, name)
            census = props.get("localidad_censal") or {}
            census_name = str(census.get("nombre") or "").strip()
            if census_name:
                canonical.setdefault(f"{pid}|{fold(census_name)}", census_name)
    return dict(sorted(canonical.items()))


def province_boundaries() -> list:
    with zipfile.ZipFile(PINNED / "provincias.zip") as archive:
        names = archive.namelist()
        shp = archive.read(next(n for n in names if n.lower().endswith(".shp")))
        dbf = archive.read(next(n for n in names if n.lower().endswith(".dbf")))
    rows = parse_dbf(dbf)
    shapes = parse_shp(shp)
    if len(rows) != 24 or len(shapes) != 24:
        raise SystemExit(f"unexpected province row/shape count {len(rows)}/{len(shapes)}")
    out = []
    for row, shape in zip(rows, shapes):
        rings = []
        for ring in shape["rings"]:
            simplified = simplify_ring(ring, SIMPLIFY_EPSILON_DEGREES)
            rings.append([[round(x, 6), round(y, 6)] for x, y in simplified])
        out.append([
            row.get("IN1", ""),
            row.get("NAM", ""),
            [round(v, 6) for v in shape["bbox"]],
            rings,
        ])
    out.sort(key=lambda item: item[0])
    return out


def load_shape_records(zip_name: str):
    with zipfile.ZipFile(PINNED / zip_name) as archive:
        names = archive.namelist()
        shp = archive.read(next(n for n in names if n.lower().endswith(".shp")))
        dbf = archive.read(next(n for n in names if n.lower().endswith(".dbf")))
    rows = parse_dbf(dbf)
    shapes = parse_shp(shp)
    if len(rows) != len(shapes):
        raise SystemExit(f"shape/dbf count mismatch for {zip_name}: {len(rows)}/{len(shapes)}")
    return list(zip(rows, shapes))


def runtime_shape(row: dict, shape: dict, kind: str):
    rings = []
    for ring in shape["rings"]:
        simplified = simplify_ring(ring, SIMPLIFY_EPSILON_DEGREES)
        rings.append([[round(x, 6), round(y, 6)] for x, y in simplified])
    return [kind, str(row.get("IN1") or "").strip(), str(row.get("NAM") or "").strip(), [round(v, 6) for v in shape["bbox"]], rings]


def integration_parent_boundaries() -> dict[str, list]:
    locality_entities: dict[str, list[dict]] = {}
    for filename in ("localidades-censales.geojson", "localidades.geojson"):
        data = json.loads((PINNED / filename).read_text(encoding="utf-8"))
        for feature in data.get("features", []):
            props = feature.get("properties") or {}
            province = props.get("provincia") or {}
            pid = str(province.get("id") or "").zfill(2)
            names = [str(props.get("nombre") or "").strip()]
            census = props.get("localidad_censal") or {}
            names.append(str(census.get("nombre") or "").strip())
            for name in {n for n in names if n}:
                locality_entities.setdefault(f"{pid}|{fold(name)}", []).append(props)
    municipalities = {str(row.get("IN1") or "").strip(): (row, shape) for row, shape in load_shape_records("municipios.zip")}
    departments = {str(row.get("IN1") or "").strip(): (row, shape) for row, shape in load_shape_records("departamentos.zip")}
    out: dict[str, list] = {}
    for pid, name in INTEGRATED_LOCALITIES:
        key = f"{pid}|{fold(name)}"
        if pid == "02":
            out[key] = []
            continue
        entities = locality_entities.get(key, [])
        municipality_ids = sorted({str((e.get("municipio") or {}).get("id") or "") for e in entities if str((e.get("municipio") or {}).get("id") or "") in municipalities})
        department_ids = sorted({str((e.get("departamento") or {}).get("id") or "") for e in entities if str((e.get("departamento") or {}).get("id") or "") in departments})
        shapes = []
        if municipality_ids:
            for ident in municipality_ids:
                row, shape = municipalities[ident]
                shapes.append(runtime_shape(row, shape, "municipio"))
        else:
            for ident in department_ids:
                row, shape = departments[ident]
                shapes.append(runtime_shape(row, shape, "departamento"))
        if not shapes:
            raise SystemExit(f"no official parent boundary for integrated locality {key}")
        out[key] = shapes
    return dict(sorted(out.items()))


def main() -> None:
    provenance = load_provenance()
    localities = locality_map()
    provinces = province_boundaries()
    integration_boundaries = integration_parent_boundaries()
    meta = {
        "authority": "Datos Argentina / GeoRef official pinned snapshot",
        "dataset_id": "modernizacion/dataset/7 Servicio de normalización de datos geográficos",
        "crs": "WGS84 / EPSG:4326",
        "province_geometry": "official SHP PolygonZ simplified deterministically with RDP epsilon 0.0005 degrees for runtime province classification",
        "locality_authority": "official localidades-censales + localidades name/province pairs; locality remains null when pair is absent",
        "resources": provenance["resources"],
        "province_count": len(provinces),
        "official_locality_pair_count": len(localities),
        "integration_parent_boundary_count": sum(len(v) for v in integration_boundaries.values()),
        "integration_parent_authority": "official municipio polygon where available; exact referenced departamento polygon only when municipio geometry is unavailable",
        "generator": "scripts/generate-georef-runtime-authority.py",
        "simplify_epsilon_degrees": SIMPLIFY_EPSILON_DEGREES,
    }
    parts = [
        "// GENERATED from pinned official GeoRef resources. Do not hand-edit.\n",
        "export const OFFICIAL_GEOREF_RUNTIME_AUTHORITY_META=Object.freeze(" + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ");\n",
        "export const OFFICIAL_LOCALITY_CANON=Object.freeze(" + json.dumps(localities, ensure_ascii=False, separators=(",", ":")) + ");\n",
        "export const OFFICIAL_PROVINCE_BOUNDARIES=Object.freeze(" + json.dumps(provinces, ensure_ascii=False, separators=(",", ":")) + ");\n",
        "export const OFFICIAL_LOCALITY_PARENT_BOUNDARIES=Object.freeze(" + json.dumps(integration_boundaries, ensure_ascii=False, separators=(",", ":")) + ");\n",
    ]
    OUT.write_text("".join(parts), encoding="utf-8", newline="\n")
    print(json.dumps({"out": str(OUT), "bytes": OUT.stat().st_size, "province_count": len(provinces), "locality_pairs": len(localities), "sha256": sha256(OUT)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
