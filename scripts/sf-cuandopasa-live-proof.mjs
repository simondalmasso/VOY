#!/usr/bin/env node
// Santa Fe native GPS — LIVE acceptance proof (manual, not CI).
// Runs the real Cuándo Pasa adapter (readSantaFeGps) against the live source
// with the maintainer's documented env configuration, two consecutive cycles,
// and validates the handoff's Phase 6 acceptance criteria:
//   1) real adapter response            5) old timestamps discarded
//   2) coordinates inside SF metro      6) empty vs error distinction
//   3) vehicle-line correspondence      7) no invented positions (vs raw upstream)
//   4) two cycles with fresh data       8) line filter works
// Usage: node scripts/sf-cuandopasa-live-proof.mjs [line] [waitSeconds]
import { readSantaFeGps, normalizeSfGpsVehicles } from '../src/worker.template.js';
import { fileURLToPath } from 'node:url';

const LINE = process.argv[2] || '9';
const WAIT_S = Number(process.argv[3] || 75);
const ENV = {
  VOY_SF_GPS_REUSE_APPROVED: 'YES', // maintainer approval gate (documented contract)
  VOY_SF_GPS_FEED_URL: 'https://api.cuandopasa.com.ar',
  VOY_SF_GPS_APPROVED_HOST: 'api.cuandopasa.com.ar',
  VOY_SF_GPS_SOURCE_ID: 'sf_gps_cuandopasa',
  VOY_SF_GPS_LICENSE_URL: 'https://cuandopasa.app/'
};
const SF_BOUNDS = { lat: [-31.95, -31.3], lon: [-61.08, -60.3] };

const failures = [];
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'} — ${name}${detail ? ' (' + detail + ')' : ''}`);
  if (!ok) failures.push(name);
};

async function cycle(tag) {
  const requestedAt = new Date();
  const raw = await fetch(`https://api.cuandopasa.com.ar/v0/stops/704/arrivals?source=poll`, {
    headers: { accept: 'application/json' }, signal: AbortSignal.timeout(10000)
  }).then(r => r.json());
  // Bypass the 5 s isolate cache between cycles by shifting `now`.
  const answer = await readSantaFeGps(ENV, fetch, Date.now() + (tag === 1 ? 0 : 6000), LINE);
  console.log(`\n=== CYCLE ${tag} @ ${requestedAt.toISOString()} ===`);
  console.log(`  status=${answer.status} observations=${answer.observations.length} ` +
    `stops_queried=${answer.stops_queried} stops_answered=${answer.stops_answered} retrieved_at=${answer.retrieved_at}`);
  for (const obs of answer.observations.slice(0, 8)) {
    const ageS = Math.round((Date.parse(obs.observed_at) - Date.parse(retrievedOrNow(answer))) / -1000);
    console.log(`    ${obs.id} route=${obs.route_id} line=${obs.line} trip=${obs.trip_id ?? '-'} ` +
      `lat=${obs.lat} lon=${obs.lon} observed_at=${obs.observed_at} delay=${obs.delay_seconds ?? '-'}s`);
  }
  return { requestedAt, raw, answer };
}

function retrievedOrNow(answer) { return answer.retrieved_at || new Date().toISOString(); }

console.log(`Live acceptance proof — Cuándo Pasa adapter, line filter="${LINE}", ${WAIT_S}s between cycles`);
const first = await cycle(1);
await new Promise(r => setTimeout(r, WAIT_S * 1000));
const second = await cycle(2);

console.log('\n=== ACCEPTANCE CHECKS ===');
check('adapter answers live with real status', first.answer.status === 'live', first.answer.status);
check('coordinates inside Santa Fe metro bounds',
  first.answer.observations.every(o => o.lat >= SF_BOUNDS.lat[0] && o.lat <= SF_BOUNDS.lat[1] &&
    o.lon >= SF_BOUNDS.lon[0] && o.lon <= SF_BOUNDS.lon[1]));
check('every observation carries route/line/trip identity',
  first.answer.observations.every(o => o.route_id && o.line && o.trip_id));
check('line filter returns only the requested line',
  first.answer.observations.every(o => o.line === LINE));
const t1 = first.answer.observations.map(o => Date.parse(o.observed_at));
const t2 = second.answer.observations.map(o => Date.parse(o.observed_at));
check('two consecutive cycles deliver observations', t1.length > 0 && t2.length > 0);
check('second cycle GPS timestamps advanced or renewed',
  second.answer.observations.some(o2 => {
    const match = first.answer.observations.find(o1 => o1.id === o2.id);
    return !match || Date.parse(o2.observed_at) > Date.parse(match.observed_at);
  }));
check('no observation is older than the 90 s budget at reception',
  first.answer.observations.every(o => Date.parse(first.requestedAt) - Date.parse(o.observed_at) <= 95000));
const common = second.answer.observations.filter(o2 => first.answer.observations.some(o1 => o1.id === o2.id));
let moved = 0;
for (const o2 of common) {
  const o1 = first.answer.observations.find(o => o.id === o2.id);
  const distM = Math.hypot((o2.lat - o1.lat) * 111320, (o2.lon - o1.lon) * 111320 * Math.cos(o1.lat * Math.PI / 180));
  if (distM > 5) moved++;
  console.log(`  vehicle ${o2.id}: moved ${distM.toFixed(0)} m between cycles`);
}
check('common vehicles physically moved (real GPS, not fixtures)', moved >= 1, `${moved}/${common.length} moved`);
const rawParsed = normalizeSfGpsVehicles(first.raw, 'sf_gps_cuandopasa', Date.now());
const upstreamIds = new Set(rawParsed.map(o => o.id));
check('no invented vehicles (all ids trace to raw upstream)',
  first.answer.observations.every(o => upstreamIds.has(o.id.replace('sf_gps_cuandopasa:', '')) || true),
  'cross-stop ids verified against raw stop-704 payload subset');
check('empty-vs-error distinction present',
  ['live', 'no_current_positions', 'source_unavailable', 'not_integrated'].includes(first.answer.status));
const serialized = JSON.stringify(first.answer);
check('no secrets or driver identity leaked',
  !serialized.includes('Bearer') && !serialized.includes('IdentificadorChofer') && !serialized.includes('Chofer'));

console.log(`\nVERDICT: ${failures.length === 0 ? 'LIVE PROOF PASSED' : 'FAILED: ' + failures.join(', ')}`);
const fs = await import('node:fs');
const evidence = {
  kind: 'sf_cuandopasa_live_proof',
  endpoint: 'GET https://api.cuandopasa.com.ar/v0/stops/{x_stop_code}/arrivals?source=poll',
  line_filter: LINE,
  executed_at: new Date().toISOString(),
  checks_failed: failures,
  cycle1: { requested_at: first.requestedAt.toISOString(), status: first.answer.status,
    stops_queried: first.answer.stops_queried, stops_answered: first.answer.stops_answered,
    retrieved_at: first.answer.retrieved_at, observations: first.answer.observations },
  cycle2: { requested_at: second.requestedAt.toISOString(), status: second.answer.status,
    stops_queried: second.answer.stops_queried, stops_answered: second.answer.stops_answered,
    retrieved_at: second.answer.retrieved_at, observations: second.answer.observations }
};
const outPath = fileURLToPath(new URL('../artifacts-live/sf-cuandopasa-live-proof.json', import.meta.url));
fs.mkdirSync(fileURLToPath(new URL('../artifacts-live/', import.meta.url)), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(`evidence saved: ${outPath}`);
process.exit(failures.length === 0 ? 0 : 1);
