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

function emptyEvidence() {
  return { console: [], pageerrors: [], requests: [], responses: [], directNominatim: 0 };
}

function isRelevantSameOrigin(url) {
  if (!url.startsWith(baseOrigin)) return false;
  const pathname = new URL(url).pathname;
  return pathname === '/' || pathname === '/VOY-Lite.html' || pathname === '/api/health' ||
    pathname === '/core/cityPlatform.js' || pathname.startsWith('/cities/');
}

async function saveEvidence(page, testInfo, evidence, phase, state) {
  await fs.mkdir(evidenceDirectory, { recursive: true });
  const slug = `${testInfo.project.name}-${phase}`;
  await fs.writeFile(`${evidenceDirectory}/${slug}-console.json`, JSON.stringify(evidence.console, null, 2));
  await fs.writeFile(`${evidenceDirectory}/${slug}-pageerrors.json`, JSON.stringify(evidence.pageerrors, null, 2));
  await fs.writeFile(`${evidenceDirectory}/${slug}-requests.json`, JSON.stringify(evidence.requests, null, 2));
  await fs.writeFile(`${evidenceDirectory}/${slug}-responses.json`, JSON.stringify(evidence.responses, null, 2));
  if (state) await fs.writeFile(`${evidenceDirectory}/${slug}-state.json`, JSON.stringify(state, null, 2));
  await page.screenshot({ path: `${evidenceDirectory}/${slug}.png`, fullPage: false, timeout: 8_000 });
}

function assertRelevantHeaders(evidence) {
  const relevant = evidence.requests.filter(entry => entry.relevant);
  expect(relevant.length).toBeGreaterThan(0);
  for (const request of relevant) {
    expect(request.overrideHeader, `override header for ${request.url}`).toBe(overrideValue);
    expect(request.candidateMarker, `candidate marker for ${request.url}`).toBe(candidateVersionId);
  }
}

async function waitForCandidateHealth(page, probeBase) {
  const attempts = [];
  let consecutive = 0;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const result = await page.evaluate(async ({ url, probe }) => {
      const response = await fetch(`${url}/api/health?candidate_browser_probe=${probe}`, { cache: 'no-store' });
      let body = null;
      try { body = await response.json(); } catch {}
      return { status: response.status, body };
    }, { url: baseURL, probe: `${probeBase}-${attempt}-${Date.now()}` });
    const candidate = result.status === 200 && result.body?.ok === true &&
      result.body?.version === 'V7.8.0' && result.body?.build_hash === expectedHash;
    consecutive = candidate ? consecutive + 1 : 0;
    attempts.push({ attempt, consecutive, candidate, status: result.status, body: result.body, timestamp: new Date().toISOString() });
    if (consecutive >= 3) return { status: result.status, body: result.body, attempts };
    await page.waitForTimeout(1_000);
  }
  throw new Error(`candidate_health_context_did_not_converge:${JSON.stringify(attempts.slice(-5))}`);
}

test.describe('Cloudflare exact-version candidate', () => {
  test('validates exact candidate, reload, territorial transitions and fail-closed fallback', async ({ page }, testInfo) => {
    const evidence = emptyEvidence();

    await page.route('**/*', async route => {
      const request = route.request();
      if (new URL(request.url()).origin === baseOrigin) {
        await route.continue();
        return;
      }
      const headers = { ...request.headers() };
      delete headers['cloudflare-workers-version-overrides'];
      delete headers['x-voy-candidate-smoke'];
      delete headers['cache-control'];
      delete headers.pragma;
      await route.continue({ headers });
    });

    page.on('console', message => evidence.console.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => evidence.pageerrors.push(String(error && error.stack || error)));
    page.on('request', request => {
      const headers = request.headers();
      const url = request.url();
      evidence.requests.push({
        method: request.method(),
        url,
        resourceType: request.resourceType(),
        relevant: isRelevantSameOrigin(url),
        overrideHeader: headers['cloudflare-workers-version-overrides'] || null,
        candidateMarker: headers['x-voy-candidate-smoke'] || null
      });
      if (url.includes('nominatim.openstreetmap.org')) evidence.directNominatim += 1;
    });
    page.on('response', response => {
      const url = response.url();
      if (isRelevantSameOrigin(url)) evidence.responses.push({ url, status: response.status(), headers: response.headers() });
    });

    const probe = Date.now();
    await page.goto(`/?city=_default&candidate_browser_probe=${probe}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.VoyCityPlatform && window.CURRENT_CITY?.city_id === '_default' && !document.getElementById('splash'));

    const health = await waitForCandidateHealth(page, probe);
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({ ok: true, version: 'V7.8.0', build_hash: expectedHash });
    expect(health.attempts.slice(-3).every(entry => entry.candidate && entry.consecutive >= 1)).toBe(true);

    const national = await page.evaluate(() => ({
      inlineVersion: window.VOY_VERSION,
      metaVersion: document.querySelector('meta[name="voy-version"]')?.content || '',
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
      splashPresent: Boolean(document.getElementById('splash')),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));

    expect(national.metaVersion).toBe('V7.8.0');
    expect(national.buildHash).toBe(expectedHash);
    expect(national).toMatchObject({
      cityId: '_default', name: 'Argentina', coverage: 'national_basic', center: [-64, -34], bbox: null,
      stops: 0, bikes: 0, landmarks: 0, companies: 0, activeProviders: 0, splashPresent: false
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

    const initialDefaultParts = evidence.requests.filter(entry => entry.url.includes('/cities/_default/'));
    expect(initialDefaultParts).toHaveLength(5);
    expect(new Set(initialDefaultParts.map(entry => new URL(entry.url).pathname)).size).toBe(5);
    expect(evidence.requests.some(entry => entry.url.includes('/cities/santa-fe/'))).toBe(false);
    const cityPlatformRequest = evidence.requests.find(entry => new URL(entry.url).pathname === '/core/cityPlatform.js');
    expect(cityPlatformRequest).toBeTruthy();
    assertRelevantHeaders(evidence);
    await saveEvidence(page, testInfo, evidence, 'national', { health, national, candidateVersionId, overrideValue });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(expected => (
      window.MC && window.VoyCityPlatform && window.CURRENT_CITY?.city_id === '_default' &&
      window.VOY_BUILD_HASH === expected && !document.getElementById('splash')
    ), expectedHash, { timeout: 10_000 });
    expect(await page.evaluate(() => ({
      buildHash: window.VOY_BUILD_HASH,
      cityId: window.CURRENT_CITY?.city_id,
      splashPresent: Boolean(document.getElementById('splash'))
    }))).toEqual({ buildHash: expectedHash, cityId: '_default', splashPresent: false });

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
      bus: window.FareRegistry.bus.sube,
      splashPresent: Boolean(document.getElementById('splash')),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));
    expect(santaFe.cityId).toBe('santafe');
    expect(santaFe.coverage).toBe('partial');
    expect(santaFe.bbox).not.toBeNull();
    expect(santaFe.stops).toBeGreaterThan(0);
    expect(santaFe.landmarks).toBeGreaterThan(0);
    expect(santaFe.activeProviders).toBeGreaterThan(0);
    expect(santaFe).toMatchObject({ taxi: 1790, remis: 1600, bus: 1900, splashPresent: false });
    expect(santaFe.overflow).toBeLessThanOrEqual(1);

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
      bus: window.FareRegistry.bus.sube,
      splashPresent: Boolean(document.getElementById('splash'))
    }));
    expect(nationalAgain).toMatchObject({
      cityId: '_default', bbox: null, stops: 0, bikes: 0, landmarks: 0,
      activeProviders: 0, taxi: null, remis: null, bus: null, splashPresent: false
    });

    const emergencyLoaded = await page.evaluate(async () => {
      localStorage.removeItem('voy_city_cache_v2_santafe');
      localStorage.removeItem('voy_city_cache_santafe');
      const originalFetch = window.fetch;
      window.fetch = function (input, init) {
        const url = typeof input === 'string' ? input : input.url;
        if (url.includes('cities/santa-fe/providers.json')) {
          return Promise.resolve(new Response('candidate controlled failure', { status: 500, headers: { 'Content-Type': 'text/plain' } }));
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
      splashPresent: Boolean(document.getElementById('splash')),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));
    expect(emergency).toMatchObject({
      cityId: 'santafe', source: 'emergency', stops: 0, bikes: 0,
      landmarks: 0, companies: 0, activeProviders: 0, splashPresent: false
    });
    expect(emergency.bbox).not.toBeNull();
    expect(emergency.fares.taxi.diurno.bajada).toBeNull();
    expect(emergency.fares.remis.diurno.bajada).toBeNull();
    expect(emergency.fares.bus.sube).toBeNull();
    for (const fare of Object.values(emergency.fares.apps)) expect(fare.status).toBe('not_available');
    expect(emergency.overflow).toBeLessThanOrEqual(1);

    assertRelevantHeaders(evidence);
    expect(evidence.pageerrors).toEqual([]);
    expect(evidence.directNominatim).toBe(0);
    expect(evidence.console.filter(entry => entry.type === 'error')).toEqual([]);
    await saveEvidence(page, testInfo, evidence, 'final', {
      health, national, santaFe, nationalAgain, emergency,
      candidateVersionId, overrideValue, expectedHash
    });
  });
});
