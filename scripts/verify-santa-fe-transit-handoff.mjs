import { readFile } from 'node:fs/promises';

const target = 'https://santafeciudad.gov.ar/secretaria-de-gobierno-control-movilidad-seguridadciudadana/colectivos/';
const expectedHost = 'santafeciudad.gov.ar';
const sourcePath = new URL('../src/features/providers/officialHandoffs.ts', import.meta.url);

const source = await readFile(sourcePath, 'utf8');
if (!source.includes(target)) throw new Error('official_handoff_code_target_drift');

const response = await fetch(target, {
  redirect: 'follow',
  signal: AbortSignal.timeout(15_000),
  headers: { 'user-agent': 'VOY-source-freshness/1.0 (+https://github.com/simonkey888/VOY)' }
});
if (!response.ok) throw new Error(`official_handoff_unreachable:${response.status}`);
const finalUrl = new URL(response.url);
if (finalUrl.protocol !== 'https:' || finalUrl.hostname !== expectedHost) throw new Error(`official_handoff_redirect_not_allowlisted:${finalUrl.href}`);
const body = await response.text();
if (!/Colectivos/i.test(body)) throw new Error('official_handoff_transit_surface_missing');
if (!/Cu(?:á|&aacute;|&#225;|a)ndo\s+pasa/i.test(body)) throw new Error('official_handoff_current_information_reference_missing');

process.stdout.write(`${JSON.stringify({
  result: 'PASS',
  target,
  final_url: finalUrl.href,
  authority: 'Municipalidad de Santa Fe',
  transit_surface: true,
  current_information_reference: true,
  checked_at: new Date().toISOString(),
  stale_substitution: false
}, null, 2)}\n`);
