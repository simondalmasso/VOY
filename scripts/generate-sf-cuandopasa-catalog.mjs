#!/usr/bin/env node
// ORDER: Santa Fe native GPS (Cuándo Pasa) — stop catalog generator.
// Downloads the published static bundle (data_v2) from the source API and emits
// src/sf-cuandopasa-stops.generated.js with per-route x_stop_code lists.
// The catalog is EMBEDDED at build time (no runtime data_v2 fetch), matching the
// rail-stations.generated.js authority pattern.
// Usage:
//   node scripts/generate-sf-cuandopasa-catalog.mjs              # fetch from source
//   node scripts/generate-sf-cuandopasa-catalog.mjs --file path  # use local JSON
import { writeFileSync } from 'node:fs';
import { argv, exit } from 'node:process';

const DATA_URL = 'https://api.cuandopasa.app/data_v2';
const OUT = 'src/sf-cuandopasa-stops.generated.js';

function fileArg() {
  const i = argv.indexOf('--file');
  return i > 0 ? argv[i + 1] : null;
}

async function loadData() {
  const file = fileArg();
  if (file) {
    const { readFile } = await import('node:fs/promises');
    return { version: 'local-file', data: JSON.parse(await readFile(file, 'utf8')) };
  }
  const response = await fetch(DATA_URL, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`data_v2 fetch failed: HTTP ${response.status}`);
  return { version: null, data: await response.json() };
}

const { version, data } = await loadData();
const bundleVersion = version || data.version;
if (!bundleVersion || !data.routes || !data.stops) throw new Error('data_v2 schema unexpected');

const routes = [];
let stopCodeCount = 0;
for (const [routeId, route] of Object.entries(data.routes)) {
  const codes = [];
  const seen = new Set();
  for (const stop of Object.values(data.stops)) {
    for (const raw of stop.raw_stops || []) {
      if ((raw.route_ids || []).includes(routeId)) {
        const code = String(raw.x_stop_code);
        if (code && !seen.has(code)) { seen.add(code); codes.push(code); }
      }
    }
  }
  stopCodeCount += codes.length;
  routes.push({
    id: routeId,
    short_name: String(route.route_short_name),
    x_line_code: String(route.x_line_code),
    x_stop_codes: codes
  });
}
routes.sort((a, b) => a.id.localeCompare(b.id));

const generatedAt = new Date().toISOString();
const meta = {
  source: DATA_URL,
  bundle_version: bundleVersion,
  generated_at: generatedAt,
  route_count: routes.length,
  x_stop_code_entries: stopCodeCount
};

const body = `// GENERATED FILE — do not edit by hand. Regenerate with:
//   node scripts/generate-sf-cuandopasa-catalog.mjs
// Source: ${DATA_URL} (bundle version ${bundleVersion}, generated ${generatedAt}).
// Static published stop catalog used by the Santa Fe Cuándo Pasa GPS adapter to
// poll per-stop live arrivals. Stop codes are source-owned identifiers.
export const SF_CUANDOPASA_STOPS_META = ${JSON.stringify(meta)};
export const SF_CUANDOPASA_ROUTES = ${JSON.stringify(routes)};
`;

writeFileSync(OUT, body);
console.log(`[sf-cuandopasa-catalog] routes=${routes.length} x_stop_codes=${stopCodeCount} version=${bundleVersion}`);
console.log(`[sf-cuandopasa-catalog] wrote ${OUT} (${Buffer.byteLength(body)} bytes)`);
exit(0);
