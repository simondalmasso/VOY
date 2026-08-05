/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const evidenceDirectory = process.env.VOY_EVIDENCE_DIR || 'test-results/evidence';

async function persist(page, testInfo, evidence) {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const prefix = `${evidenceDirectory}/product-completion-${testInfo.project.name}`;
  await fs.writeFile(`${prefix}-console.json`, JSON.stringify(evidence.console, null, 2));
  await fs.writeFile(`${prefix}-failed-requests.json`, JSON.stringify(evidence.failedRequests, null, 2));
  await fs.writeFile(`${prefix}-pageerrors.json`, JSON.stringify(evidence.pageErrors, null, 2));
  if (!page.isClosed()) await page.screenshot({ path: `${prefix}.png`, fullPage: false });
}

test.describe('VOY internally complete product shell', () => {
  test.beforeEach(async ({ page }) => {
    const evidence = { console: [], failedRequests: [], pageErrors: [], directNominatim: [] };
    page.__productEvidence = evidence;
    page.on('console', message => evidence.console.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => evidence.pageErrors.push(String(error && error.stack || error)));
    page.on('requestfailed', request => {
      const url = request.url();
      if (/tile\.openstreetmap|cartocdn|unpkg|router\.project-osrm/.test(url)) return;
      evidence.failedRequests.push({ method: request.method(), url, failure: request.failure()?.errorText || '' });
    });
    page.on('request', request => {
      if (request.url().includes('nominatim.openstreetmap.org')) evidence.directNominatim.push(request.url());
    });
    await page.route('**/api/geocode**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [] }) }));
    await page.route('**nominatim.openstreetmap.org/**', route => route.abort('blockedbyclient'));
  });

  test.afterEach(async ({ page }, testInfo) => {
    const evidence = page.__productEvidence;
    await persist(page, testInfo, evidence);
    expect(evidence.pageErrors).toEqual([]);
    expect(evidence.directNominatim).toEqual([]);
    expect(evidence.console.filter(entry => entry.type === 'error')).toEqual([]);
    expect(evidence.failedRequests).toEqual([]);
  });

  test('loads Santa Fe, honest provider data, legal sources and disabled auth safely', async ({ page, request }) => {
    test.setTimeout(90_000);
    await page.goto('/?city=santafe', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CURRENT_CITY && window.CURRENT_CITY.city_id === 'santafe' && !document.getElementById('splash'));

    const state = await page.evaluate(() => ({
      city: window.CURRENT_CITY.city_id,
      coverage: window.CURRENT_CITY.coverageLevel,
      providers: Object.fromEntries(Object.entries(window.PROVIDERS).map(([id, value]) => [id, { available: value.available, availability_status: value.availability_status, price_status: value.price_status }])),
      taxi: window.FareRegistry.taxi,
      remis: window.FareRegistry.remis,
      bus: window.FareRegistry.bus,
      apps: window.FareRegistry.apps,
      legal: [...document.querySelectorAll('[data-voy-legal-links] a')].map(a => a.getAttribute('href')),
      freshness: document.querySelector('.voy-data-freshness')?.textContent || '',
      accountButton: Boolean(document.querySelector('.voy-account-open')),
      skip: document.querySelector('[data-voy-skip-link]')?.getAttribute('href') || '',
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
      namedControls: [...document.querySelectorAll('button,input,[role="button"]')].filter(node => {
        const name = node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '';
        return !name.trim();
      }).length
    }));

    expect(state.city).toBe('santafe');
    expect(state.coverage).toBe('partial');
    expect(state.providers.uber).toMatchObject({ available: true, availability_status: 'verified_current', price_status: 'app_only' });
    expect(state.providers.didi).toMatchObject({ available: true, availability_status: 'verified_current', price_status: 'app_only' });
    for (const id of ['maxim', 'cabify', 'radiotaxi', 'taxiapp', 'remisreal']) expect(state.providers[id].available).toBe(false);
    expect(state.taxi.status).toBe('regulated_current');
    expect(state.remis.status).toBe('regulated_current');
    expect(state.bus.status).toBe('regulated_current');
    expect(state.bus.cash).toBeNull();
    for (const app of Object.values(state.apps)) expect(['stale_estimate', 'stale_reference']).toContain(app.status);
    expect(state.legal).toEqual(expect.arrayContaining(['/privacy', '/terms', '/sources', '/contact']));
    expect(state.freshness).toContain('04/08/2026');
    expect(state.accountButton).toBe(false);
    expect(state.skip).toBe('#destInput');
    expect(state.overflow).toBeLessThanOrEqual(1);
    expect(state.namedControls).toBe(0);

    const auth = await request.get('/api/auth/session', { headers: { Origin: new URL(page.url()).origin } });
    expect(auth.ok()).toBeTruthy();
    expect(await auth.json()).toMatchObject({ enabled: false, authenticated: false, persistent_account: false, trip_history_persisted: false });

    for (const route of ['/privacy', '/terms', '/sources', '/contact']) {
      const response = await request.get(route);
      expect(response.ok()).toBeTruthy();
      const text = await response.text();
      expect(text).toContain('4 de agosto de 2026');
      expect(text).toContain('Volver a VOY');
    }
  });

  test('health, manifest and service worker expose final non-secret contracts', async ({ request }) => {
    const healthResponse = await request.get('/api/health');
    expect(healthResponse.ok()).toBeTruthy();
    const health = await healthResponse.json();
    expect(health).toMatchObject({ ok: true, service: 'voy-app' });
    expect(health.features).toMatchObject({ auth: false, core_without_login_voice_ai: true });

    const manifestResponse = await request.get('/manifest.json');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(manifest).toMatchObject({ start_url: '/', scope: '/', display: 'standalone', lang: 'es-AR' });
    expect(manifest.icons.length).toBeGreaterThanOrEqual(4);

    const swResponse = await request.get('/sw.js');
    expect(swResponse.ok()).toBeTruthy();
    const sw = await swResponse.text();
    expect(sw).toContain('voy-product-complete-2026-08-04-v2');
    expect(sw).toContain('cache.addAll(APP_SHELL)');
    expect(sw).toContain("'/sources'");
  });
});
