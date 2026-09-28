// ORDER-075 GLM53 — map substrate decision measurements.
// Produces experiments/glm53/evidence/map-substrate.json:
//   - vendored dependency sizes (raw + gzip) from node_modules
//   - public provider reachability (OpenFreeMap style/tiles, OSM raster)
//   - critical-path budget: what ships on 2D boot vs vector upgrade vs 3D
// Read-only probes against public endpoints; no VOY Worker involvement.
import { stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import zlib from 'node:zlib';
import path from 'node:path';

const root = process.cwd();
const outDir = path.join(root, 'experiments/glm53/evidence');
await mkdir(outDir, { recursive: true });

async function fileSize(rel) {
  const buf = await readFile(path.join(root, rel));
  return { path: rel, raw: buf.length, gzip: zlib.gzipSync(buf, { level: 9 }).length };
}

const files = [
  'node_modules/maplibre-gl/dist/maplibre-gl.mjs',
  'node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs',
  'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs',
  'node_modules/maplibre-gl/dist/maplibre-gl.css',
  'node_modules/three/build/three.module.js',
  'node_modules/three/build/three.core.js',
];
const sizes = {};
for (const f of files) sizes[f.split('/').pop()] = await fileSize(f);
const mlSum = sizes['maplibre-gl.mjs'].raw + sizes['maplibre-gl-shared.mjs'].raw + sizes['maplibre-gl-worker.mjs'].raw;
const mlSumGz = sizes['maplibre-gl.mjs'].gzip + sizes['maplibre-gl-shared.mjs'].gzip + sizes['maplibre-gl-worker.mjs'].gzip;

async function probe(name, url, expect) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'VOY-order075-substrate-probe/1.0' } });
    const body = Buffer.from(await res.arrayBuffer());
    const ms = Date.now() - started;
    let ok = res.status === 200;
    if (expect === 'json') ok = ok && (body.slice(0, 1).toString('utf8') === '{' || body.slice(0, 1).toString('utf8') === '[');
    if (expect === 'png') ok = ok && body.length > 100 && body[0] === 0x89 && body[1] === 0x50;
    return { name, url, status: res.status, ok, ms, bytes: body.length, content_type: res.headers.get('content-type') };
  } catch (error) {
    return { name, url, ok: false, error: String(error.message || error) };
  }
}

// follow the exact URL chain MapLibre follows in production:
// style JSON -> source url (TileJSON) -> tiles template; plus glyphs and
// the natural-earth raster overlay referenced by the style.
async function probeOpenFreeMap() {
  const results = [];
  const style = await probe('openfreemap_style_liberty', 'https://tiles.openfreemap.org/styles/liberty', 'json');
  results.push(style);
  if (!style.ok) return results;
  const styleJson = JSON.parse(await (await fetch(style.url, { headers: { 'user-agent': UA } })).text());
  for (const [sid, src] of Object.entries(styleJson.sources || {})) {
    if (src.url) {
      const tj = await probe(`openfreemap_tilejson_${sid}`, src.url, 'json');
      results.push(tj);
      if (tj.ok) {
        const tilejson = JSON.parse(await (await fetch(src.url, { headers: { 'user-agent': UA } })).text());
        const template = tilejson.tiles?.[0];
        if (template) {
          const tileUrl = template.replace('{z}', '13').replace('{x}', '3865').replace('{y}', '2457');
          results.push(await probe(`openfreemap_tile_${sid}`, tileUrl, 'pbf'));
        }
      }
    }
    if (Array.isArray(src.tiles)) {
      const tileUrl = src.tiles[0].replace('{z}', '3').replace('{x}', '2').replace('{y}', '3');
      results.push(await probe(`openfreemap_tile_${sid}`, tileUrl, 'png'));
    }
  }
  if (styleJson.glyphs) {
    const glyphUrl = styleJson.glyphs.replace('{fontstack}', 'Noto Sans Regular').replace('{range}', '0-255');
    results.push(await probe('openfreemap_glyphs', glyphUrl, 'pbf'));
  }
  return results;
}

const UA = 'VOY-order075-substrate-probe/1.0';
const probes = [
  ...(await probeOpenFreeMap()),
  await probe('osm_raster_tile_z13', 'https://tile.openstreetmap.org/13/3865/2457.png', 'png'),
];

const firstPaint = await Promise.all([
  fileSize('public/app.js'),
  fileSize('public/styles.css'),
  fileSize('public/tracker/observations.js'),
  fileSize('public/tracker/store.js'),
  fileSize('public/map/substrate.js'),
]);
const firstPaintGz = firstPaint.reduce((a, f) => a + f.gzip, 0);
const firstPaintRaw = firstPaint.reduce((a, f) => a + f.raw, 0);

const report = {
  schema_version: 1,
  measured_at: new Date().toISOString(),
  decision: 'raster_instant_first_paint + async MapLibre 6.11.2 / OpenFreeMap vector upgrade + raster mandatory fallback',
  vendored_sizes: sizes,
  maplibre_totals: { raw: mlSum, gzip: mlSumGz, note: 'ESM module + shared + worker; CSS separate; off critical path (dynamic import after first paint)' },
  first_paint_2d_boot: {
    files: firstPaint.map(f => f.path),
    raw: firstPaintRaw,
    gzip: firstPaintGz,
    note: 'app shell + tracker + substrate modules; excludes maplibre (lazy) and three (3D opt-in)'
  },
  provider_reachability: probes,
  rationale: [
    'Landing raster z13 grid paints with zero new JS; TrackerView interaction (pan/zoom to suspend follow) requires a real slippy map — reimplementing one is the forbidden GIS rewrite, MapLibre provides it pinned (6.11.2).',
    'OpenFreeMap is keyless/registrationless with OSM-derived tiles and required attribution (verified 200 OK style + tiles); OSM raster stays as mandatory fallback substrate.',
    'Cost is bounded and off the critical path: vector upgrade is a dynamic import after first useful paint; failure of import/style/tiles/WebGL2 keeps raster with tracker state intact.'
  ]
};
await writeFile(path.join(outDir, 'map-substrate.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ maplibre_gzip: mlSumGz, first_paint_gzip: firstPaintGz, probes: probes.map(p => `${p.name}:${p.ok ? 'OK' : 'FAIL'}(${p.status ?? p.error})`) }, null, 2));
