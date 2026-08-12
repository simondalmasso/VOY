import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const base = process.env.VOY_BASE_URL || 'http://127.0.0.1:8787';
const out = process.env.VOY_EVIDENCE_DIR || 'test-results/issue36-visual';
const shots = path.join(out, 'screenshots', 'bus-mobile');
fs.mkdirSync(shots, { recursive: true });

const terminal = {
  canonicalId: 'santafe:landmark:terminal-omnibus',
  nombre: 'Terminal de Ómnibus',
  aliases: ['terminal'],
  verified: true,
  source: 'authoritative',
  precision: 'poi',
  lat: -31.643533,
  lon: -60.700503,
  address: 'Belgrano 2910',
  verified_at: '2026-08-05',
  provenance: {
    status: 'authoritative',
    issuer: 'Municipalidad de Santa Fe',
    source_title: 'Estación Terminal de Ómnibus de Santa Fe',
    source_url: 'https://santafeciudad.gov.ar/terminal-de-colectivos/',
    license: 'Información pública institucional; sin licencia de reutilización explícita',
    coordinate_method: 'Dirección oficial municipal cruzada con geodato público gubernamental de la misma dirección',
    coordinate_source_url: 'https://www.bcra.gob.ar/entidades-financieras-filiales-y-cajeros-filtros/?Provincia=SANTA+FE&Tipo=4&Tit=2&bco=AAA10'
  }
};
const transport = { schema_version: 2, city_id: 'santafe', verified_at: '2026-08-05', landmarks: [terminal], bus_routes: [], bus_stops: [], bike_stations: [] };
const viewports = [
  ['360x780', 360, 780],
  ['360x800', 360, 800],
  ['390x844', 390, 844],
  ['412x915', 412, 915]
];
const records = [];
const browser = await chromium.launch({ headless: true });

async function setup(page) {
  await page.route('**/api/health*', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, version: 'V8.0.0', build_hash: process.env.GITHUB_SHA || 'visual', features: { voice: true, auth: false } }) }));
  await page.route('**/cities/santa-fe/transport.json', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(transport) }));
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen BUS QA') ? [{ id: 'qa:bus-origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }] : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] }) }));
}

async function plan(page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('app-shell').waitFor();
  await page.getByTestId('origin-input').fill('Origen BUS QA');
  await page.getByTestId('origin-apply').click();
  await page.getByTestId('origin-edit').waitFor();
  await page.getByTestId('destination-input').fill('Terminal');
  await page.getByTestId('destination-results').waitFor();
  await page.getByTestId('destination-result-verified').first().click();
  await page.getByTestId('trip-sheet').waitFor();
  await page.locator('[data-mode="bus"]').click();
  await page.getByTestId('provider-bus').waitFor();
}

async function inspect(page) {
  return page.getByTestId('provider-bus').evaluate(node => {
    const provider = node;
    const main = provider.querySelector('.provider-main');
    const name = provider.querySelector('.provider-main > strong');
    const detail = provider.querySelector('.provider-main > small');
    const state = provider.querySelector('.provider-unavailable-state');
    if (!(provider instanceof HTMLElement) || !(main instanceof HTMLElement) || !(name instanceof HTMLElement) || !(detail instanceof HTMLElement) || !(state instanceof HTMLElement)) throw new Error('bus_visual_subject_missing');
    const pr = provider.getBoundingClientRect();
    const mr = main.getBoundingClientRect();
    const nr = name.getBoundingClientRect();
    const dr = detail.getBoundingClientRect();
    const sr = state.getBoundingClientRect();
    const nameStyle = getComputedStyle(name);
    const detailStyle = getComputedStyle(detail);
    const stateStyle = getComputedStyle(state);
    const lines = (rect, style) => {
      const lineHeight = parseFloat(style.lineHeight);
      return Number.isFinite(lineHeight) && lineHeight > 0 ? rect.height / lineHeight : 99;
    };
    return {
      page_overflow_px: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      viewport_width: document.documentElement.clientWidth,
      provider_width: pr.width,
      provider_left: pr.left,
      provider_right: pr.right,
      provider_overflow_px: provider.scrollWidth - provider.clientWidth,
      main_width: mr.width,
      main_overflow_px: main.scrollWidth - main.clientWidth,
      name_width: nr.width,
      detail_width: dr.width,
      state_width: sr.width,
      name_lines: lines(nr, nameStyle),
      detail_lines: lines(dr, detailStyle),
      state_lines: lines(sr, stateStyle),
      name_font_px: parseFloat(nameStyle.fontSize),
      state_font_px: parseFloat(stateStyle.fontSize),
      state_word_break: stateStyle.wordBreak,
      state_white_space: stateStyle.whiteSpace,
      price_metric_nodes: provider.querySelectorAll('.provider-meta > strong').length,
      tag_name: provider.tagName,
      disabled_class: provider.classList.contains('disabled'),
      text: provider.textContent || ''
    };
  });
}

function assertMetrics(metrics, label, scheme) {
  const fail = reason => { throw new Error(`bus_visual_gate_failed:${label}:${scheme}:${reason}:${JSON.stringify(metrics)}`); };
  if (metrics.page_overflow_px > 1) fail('page_overflow');
  if (metrics.provider_overflow_px > 1 || metrics.main_overflow_px > 1) fail('provider_overflow');
  if (metrics.provider_left < -1 || metrics.provider_right > metrics.viewport_width + 1) fail('provider_clipped');
  if (metrics.main_width < metrics.provider_width * 0.9) fail('main_column_collapsed');
  if (metrics.name_width < metrics.provider_width * 0.75 || metrics.detail_width < metrics.provider_width * 0.75 || metrics.state_width < metrics.provider_width * 0.75) fail('text_column_too_narrow');
  if (metrics.name_lines > 1.5 || metrics.detail_lines > 4.5 || metrics.state_lines > 2.5) fail('text_wrap_excessive');
  if (!(metrics.state_font_px < metrics.name_font_px)) fail('unavailable_state_not_subordinate');
  if (metrics.state_word_break !== 'normal' || metrics.state_white_space !== 'normal') fail('unsafe_word_wrapping');
  if (metrics.price_metric_nodes !== 0) fail('unavailable_rendered_as_metric');
  if (metrics.tag_name !== 'ARTICLE' || metrics.disabled_class !== true) fail('bus_became_actionable');
  if (!metrics.text.includes('Colectivo') || !metrics.text.includes('Sin recomendación disponible') || !metrics.text.includes('no calcula ni sugiere una línea')) fail('truth_copy_missing');
  if (/(?:Línea|Lin\.)\s*\d/i.test(metrics.text)) fail('fabricated_line');
}

for (const [label, width, height] of viewports) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, serviceWorkers: 'block' });
    const page = await context.newPage();
    await setup(page);
    await plan(page);
    const metrics = await inspect(page);
    assertMetrics(metrics, label, scheme);
    const file = `${label}-${scheme}-bus-unavailable.png`;
    await page.screenshot({ path: path.join(shots, file), fullPage: true, animations: 'disabled' });
    records.push({ file, viewport: label, scheme, state: 'BUS_UNAVAILABLE', metrics });
    await context.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(out, 'bus-mobile-index.json'), `${JSON.stringify({ result: 'PASS', source_sha: process.env.GITHUB_SHA || null, required_viewports: viewports.map(v => v[0]), themes: ['light', 'dark'], captures: records, captured_at: new Date().toISOString() }, null, 2)}\n`);
