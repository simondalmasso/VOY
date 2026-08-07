import { chromium } from '@playwright/test';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const playwrightPackage = require('@playwright/test/package.json');
const resolvedPlaywright = require.resolve('@playwright/test');
if (playwrightPackage.version !== '1.61.1') {
  throw new Error(`unexpected_playwright_version:${playwrightPackage.version}`);
}

const base = process.env.WORKER_URL;
const out = process.env.EVIDENCE_DIR;
if (!base || !out) throw new Error('missing_capture_environment');
const shots = path.join(out, 'screenshots');
fs.mkdirSync(shots, { recursive: true });
fs.writeFileSync(path.join(out, 'playwright-resolution.json'), `${JSON.stringify({
  result: 'PASS',
  version: playwrightPackage.version,
  resolved_entrypoint: resolvedPlaywright,
  script_path: import.meta.url,
  script_inside_repository: import.meta.url.includes('/scripts/issue36-before-capture.mjs')
}, null, 2)}\n`);

const viewports = [
  ['360x800', 360, 800],
  ['390x844', 390, 844],
  ['412x915', 412, 915],
  ['430x932', 430, 932],
  ['768x1024', 768, 1024],
  ['1024x768', 1024, 768],
  ['1280x800', 1280, 800],
  ['1440x900', 1440, 900]
];
const representative = new Set(['390x844', '1440x900']);
const modes = ['app', 'taxi', 'remis', 'walk', 'bike', 'bus'];
const records = [];
const browser = await chromium.launch({ headless: true });

async function snap(page, name, meta = {}) {
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(shots, file), fullPage: true, animations: 'disabled' });
  records.push({ file, ...meta, url: page.url(), title: await page.title() });
}

async function setup(page, { destinationMode = 'normal' } = {}) {
  await page.route('**/api/geocode?*', async route => {
    const q = new URL(route.request().url()).searchParams.get('q') || '';
    const results = q.includes('Origen BEFORE')
      ? [{ id: 'before:origin', name: 'Plaza 25 de Mayo', display_name: 'Plaza 25 de Mayo, Santa Fe', address: 'Santa Fe', lat: -31.633, lon: -60.706 }]
      : destinationMode === 'unverified'
        ? [{ id: 'before:unverified', name: 'Destino sin verificar', display_name: 'Destino sin verificar', address: 'Santa Fe', lat: -31.64, lon: -60.70, verified: false }]
        : [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results }) });
  });
  await page.route('**/api/route', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, source: 'osrm_route', distance_km: 3.2, duration_min: 10.5, geometry: [[-60.706, -31.633], [-60.7, -31.64], [-60.700503, -31.643533]] })
  }));
}

async function gotoApp(context, page) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('app-shell').waitFor({ state: 'visible' });
  await page.getByTestId('destination-input').waitFor({ state: 'visible' });
}

async function selectDestination(page) {
  await page.getByTestId('destination-input').fill('Terminal');
  await page.getByTestId('destination-results').waitFor({ state: 'visible' });
  const verified = page.getByTestId('destination-result-verified').first();
  await verified.waitFor({ state: 'visible' });
  await verified.click();
}

async function setManualOrigin(page) {
  const edit = page.getByTestId('origin-edit');
  if (await edit.count()) await edit.click();
  await page.getByTestId('origin-input').fill('Origen BEFORE');
  await page.getByTestId('origin-apply').click();
  await page.getByTestId('origin-edit').waitFor({ state: 'visible' });
}

async function plan(page) {
  await setManualOrigin(page);
  await selectDestination(page);
  await page.getByTestId('trip-sheet').waitFor({ state: 'visible' });
  await page.getByTestId('map-shell').waitFor({ state: 'visible' });
}

for (const [label, width, height] of viewports) {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, reducedMotion: 'no-preference' });
    const page = await context.newPage();
    await setup(page);
    await gotoApp(context, page);
    await snap(page, `${label}-${scheme}-empty-start`, { viewport: label, scheme, state: 'EMPTY_START' });

    if (representative.has(label)) {
      await page.getByTestId('destination-input').fill('Terminal');
      await page.getByTestId('destination-results').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-search-results`, { viewport: label, scheme, state: 'SEARCH_RESULTS' });
      const verified = page.getByTestId('destination-result-verified').first();
      await verified.click();
      await snap(page, `${label}-${scheme}-destination-selected`, { viewport: label, scheme, state: 'DESTINATION_SELECTED' });

      await context.grantPermissions(['geolocation'], { origin: base });
      await context.setGeolocation({ latitude: -31.633, longitude: -60.706, accuracy: 18 });
      await page.getByTestId('gps-button').click();
      await page.getByTestId('origin-edit').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-gps-origin`, { viewport: label, scheme, state: 'GPS_ORIGIN' });

      await page.getByTestId('origin-edit').click();
      await page.getByTestId('origin-input').fill('Origen BEFORE');
      await page.getByTestId('origin-apply').click();
      await page.getByTestId('trip-sheet').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-manual-origin`, { viewport: label, scheme, state: 'MANUAL_ORIGIN' });
    } else {
      await plan(page);
    }

    await snap(page, `${label}-${scheme}-decision-app`, { viewport: label, scheme, state: 'DECISION_SHEET_APP' });

    if (representative.has(label)) {
      for (const mode of modes) {
        await page.locator(`[data-mode="${mode}"]`).click();
        if (mode === 'bus') await page.getByTestId('provider-bus').waitFor({ state: 'visible' });
        else await page.getByTestId('trip-sheet').waitFor({ state: 'visible' });
        await snap(page, `${label}-${scheme}-mode-${mode}`, { viewport: label, scheme, state: `MODE_${mode.toUpperCase()}` });
      }

      await page.locator('[data-mode="bus"]').click();
      await page.getByTestId('provider-bus').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-bus-unavailable`, { viewport: label, scheme, state: 'UNAVAILABLE_DATA_BUS' });

      await page.locator('[data-mode="app"]').click();
      await page.getByTestId('provider-uber').waitFor({ state: 'visible' });
      await page.getByTestId('provider-uber').click();
      await page.getByTestId('external-confirmation').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-external-confirmation`, { viewport: label, scheme, state: 'EXTERNAL_CONFIRMATION' });
      await page.getByRole('button', { name: 'Cancelar' }).click();

      const voice = page.getByTestId('voice-open');
      if (await voice.count()) {
        await voice.click();
        await page.waitForTimeout(250);
        await snap(page, `${label}-${scheme}-voice`, { viewport: label, scheme, state: 'VOICE_IF_ENABLED' });
      }

      await context.setOffline(true);
      await page.evaluate(() => dispatchEvent(new Event('offline')));
      await page.getByTestId('offline-banner').waitFor({ state: 'visible' });
      await snap(page, `${label}-${scheme}-offline`, { viewport: label, scheme, state: 'OFFLINE' });
      await context.setOffline(false);
      await page.evaluate(() => dispatchEvent(new Event('online')));
    }
    await context.close();
  }
}

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
  const page = await context.newPage();
  await setup(page, { destinationMode: 'unverified' });
  await gotoApp(context, page);
  await page.getByTestId('destination-input').fill('No verificado');
  await page.getByTestId('destination-results').waitFor({ state: 'visible' });
  await snap(page, `390x844-${scheme}-error-unverified`, { viewport: '390x844', scheme, state: 'ERROR_UNVERIFIED_DESTINATION' });
  await context.close();
}

for (const scheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  for (const route of ['/privacy', '/terms', '/sources', '/contact']) {
    const page = await context.newPage();
    await page.goto(base + route, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('legal-view').waitFor({ state: 'visible' });
    await snap(page, `1440x900-${scheme}-legal-${route.slice(1)}`, { viewport: '1440x900', scheme, state: `LEGAL_${route.slice(1).toUpperCase()}` });
    await page.close();
  }
  await context.close();
}

await browser.close();

fs.writeFileSync(path.join(out, 'before-capture-index.json'), `${JSON.stringify({
  result: 'PASS',
  source: 'VERIFIED_PRODUCTION_ASSETS_WITH_DETERMINISTIC_API_FIXTURES',
  production_url: base,
  viewports: viewports.map(v => v[0]),
  themes: ['light', 'dark'],
  applicable_modes: modes,
  auth_enabled_in_primary_shell: false,
  screenshots: records,
  captured_at: new Date().toISOString()
}, null, 2)}\n`);
