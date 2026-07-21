/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const baseURL = process.env.VOY_BASE_URL;
const candidateVersionId = process.env.VOY_CANDIDATE_VERSION_ID;
const expectedHash = process.env.VOY_EXPECTED_BUILD_HASH;
const workerName = process.env.VOY_WORKER_NAME || 'voy-app';
const evidenceDirectory = process.env.VOY_EVIDENCE_DIR || 'test-results/cloudflare-candidate';
const baseOrigin = new URL(baseURL).origin;
const overrideValue = `${workerName}="${candidateVersionId}"`;

function emptyCounts() {
  return { console: [], pageerrors: [], requests: [], directNominatim: 0 };
}

async function saveEvidence(page, testInfo, evidence, phase) {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const slug = `${testInfo.project.name}-${phase}`;
  await fs.writeFile(`${evidenceDirectory}/${slug}-console.json`, JSON.stringify(evidence.console, null, 2));
  await fs.writeFile(`${evidenceDirectory}/${slug}-pageerrors.json`, JSON.stringify(evidence.pageerrors, null, 2));
  await fs.writeFile(`${evidenceDirectory}/${slug}-requests.json`, JSON.stringify(evidence.requests, null, 2));
  await page.screenshot({ path: `${evidenceDirectory}/${slug}.png`, fullPage: false, timeout: 8_000 });
}

test.describe('Cloudflare exact-version candidate', () => {
  test('validates national, Santa Fe and fail-closed fallback', async ({ page }, testInfo) => {
    const evidence = emptyCounts();

    await page.route(`${baseOrigin}/**`, async route => {
      const headers = {
        ...route.request().headers(),
        'Cloudflare-Workers-Version-Overrides': overrideValue,
        'X-VOY-Candidate-Smoke': candidateVersionId
      };
      await route.continue({ headers });
    });

    page.on('console', message => evidence.console.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => evidence.pageerrors.push(String(error && error.stack || error)));
    page.on('request', request => {
      evidence.requests.push({ method: request.method(), url: request.url() });
      if (request.url().includes('nominatim.openstreetmap.org')) evidence.directNominatim += 1;
    });

    await page.goto('/?city=_default', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.VoyCityPlatform && window.CURRENT_CITY?.city_id === '_default' && !document.getElementById('splash'));

    const national = await page.evaluate(() => ({
      version: window.VOY_VERSION,
      buildHash: window.VOY_BUILD_HASH,
      cityId: window.CURRENT_CITY.city_id,
      name: window.CURRENT_CITY.name,
      coverage: window.CURRENT_CITY.coverageLevel,
      center: window.CURRENT_CITY.map.center,
      bbox: window.CURRENT_CITY.map.bbox,
      stops: window.BUS_STOPS.length,
      bikes: window.BIKE_STATIONS.length,
      landmarks: window.LANDMARKS.length,
      companies: window.TAXI_COMPANIES.length + window.REMIS_COMPANIES.length,
      activeProviders: Object.values(window.PROVIDERS).filter(provider => provider.available).length,
      fares: window.FareRegistry,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      footer: document.querySelector('.footer')?.textContent || '',
      bodyText: document.body.innerText,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));

    expect(national.version).toBe('V7.8.0');
    expect(national.buildHash).toBe(expectedHash);
    expect(national).toMatchObject({
      cityId: '_default',
      name: 'Argentina',
      coverage: 'national_basic',
      center: [-64, -34],
      bbox: null,
      stops: 0,
      bikes: 0,
      landmarks: 0,
      companies: 0,
      activeProviders: 0
    });
    expect(national.title).toBe('VOY — Movilidad en Argentina');
    expect(national.description).toContain('cobertura territorial verificada');
    expect(national.description).not.toContain('Santa Fe');
    expect(national.footer).toContain('Cobertura nacional básica');
    expect(national.bodyText).not.toContain('$0');
    expect(national.overflow).toBeLessThanOrEqual(1);
    expect(national.fares.taxi.diurno.bajada).toBeNull();
    expect(national.fares.remis.diurno.bajada).toBeNull();
    expect(national.fares.bus.sube).toBeNull();
    for (const fare of Object.values(national.fares.apps)) {
      expect(fare).toMatchObject({ base: null, km: null, min: null, minFare: null, status: 'not_available' });
    }

    const defaultParts = evidence.requests.filter(entry => entry.url.includes('/cities/_default/'));
    expect(defaultParts).toHaveLength(5);
    expect(new Set(defaultParts.map(entry => new URL(entry.url).pathname)).size).toBe(5);
    expect(evidence.requests.some(entry => entry.url.includes('/cities/santa-fe/'))).toBe(false);
    await saveEvidence(page, testInfo, evidence, 'national');

    expect(await page.evaluate(() => window.loadCityProfile('santafe'))).toBe(true);
    const santaFe = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY.city_id,
      coverage: window.CURRENT_CITY.coverageLevel,
      bbox: window.CURRENT_CITY.map.bbox,
      stops: window.BUS_STOPS.length,
      landmarks: window.LANDMARKS.length,
      activeProviders: Object.values(window.PROVIDERS).filter(provider => provider.available).length,
      taxi: window.FareRegistry.taxi.diurno.bajada,
      remis: window.FareRegistry.remis.diurno.bajada,
      bus: window.FareRegistry.bus.sube
    }));
    expect(santaFe.cityId).toBe('santafe');
    expect(santaFe.coverage).toBe('partial');
    expect(santaFe.bbox).not.toBeNull();
    expect(santaFe.stops).toBeGreaterThan(0);
    expect(santaFe.landmarks).toBeGreaterThan(0);
    expect(santaFe.activeProviders).toBeGreaterThan(0);
    expect(santaFe).toMatchObject({ taxi: 1790, remis: 1600, bus: 1900 });

    expect(await page.evaluate(() => window.loadCityProfile('_default'))).toBe(true);
    const nationalAgain = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY.city_id,
      bbox: window.CURRENT_CITY.map.bbox,
      stops: window.BUS_STOPS.length,
      bikes: window.BIKE_STATIONS.length,
      landmarks: window.LANDMARKS.length,
      activeProviders: Object.values(window.PROVIDERS).filter(provider => provider.available).length,
      taxi: window.FareRegistry.taxi.diurno.bajada,
      remis: window.FareRegistry.remis.diurno.bajada,
      bus: window.FareRegistry.bus.sube
    }));
    expect(nationalAgain).toMatchObject({
      cityId: '_default', bbox: null, stops: 0, bikes: 0, landmarks: 0,
      activeProviders: 0, taxi: null, remis: null, bus: null
    });

    const emergencyLoaded = await page.evaluate(async () => {
      localStorage.removeItem('voy_city_cache_v2_santafe');
      localStorage.removeItem('voy_city_cache_santafe');
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('cities/santa-fe/providers.json')) {
          return Promise.resolve(new Response('candidate controlled failure', {
            status: 500,
            headers: { 'Content-Type': 'text/plain' }
          }));
        }
        return originalFetch.call(window, input, init);
      };
      try {
        return await window.loadCityProfile('santafe');
      } finally {
        window.fetch = originalFetch;
      }
    });
    expect(emergencyLoaded).toBe(true);

    const emergency = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY.city_id,
      source: window.CURRENT_CITY.dataSources.profile,
      bbox: window.CURRENT_CITY.map.bbox,
      stops: window.BUS_STOPS.length,
      bikes: window.BIKE_STATIONS.length,
      landmarks: window.LANDMARKS.length,
      companies: window.TAXI_COMPANIES.length + window.REMIS_COMPANIES.length,
      activeProviders: Object.values(window.PROVIDERS).filter(provider => provider.available).length,
      fares: window.FareRegistry,
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));
    expect(emergency).toMatchObject({
      cityId: 'santafe', source: 'emergency', stops: 0, bikes: 0,
      landmarks: 0, companies: 0, activeProviders: 0
    });
    expect(emergency.bbox).not.toBeNull();
    expect(emergency.fares.taxi.diurno.bajada).toBeNull();
    expect(emergency.fares.remis.diurno.bajada).toBeNull();
    expect(emergency.fares.bus.sube).toBeNull();
    for (const fare of Object.values(emergency.fares.apps)) expect(fare.status).toBe('not_available');
    expect(emergency.overflow).toBeLessThanOrEqual(1);

    expect(evidence.pageerrors).toEqual([]);
    expect(evidence.directNominatim).toBe(0);
    expect(evidence.console.filter(entry => entry.type === 'error')).toEqual([]);
    await saveEvidence(page, testInfo, evidence, 'final');
  });
});
