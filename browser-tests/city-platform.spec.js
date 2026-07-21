/* eslint-disable @typescript-eslint/no-require-imports */
const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');

const evidenceDirectory = process.env.VOY_EVIDENCE_DIR || 'test-results/evidence';
const productionHost = 'voy-app.simondalmasso44.workers.dev';

function unavailableFareAssertions() {
  return ({ fareRegistry }) => ({
    taxiDay: fareRegistry.taxi.diurno.bajada,
    taxiNight: fareRegistry.taxi.nocturno.bajada,
    remisDay: fareRegistry.remis.diurno.bajada,
    remisNight: fareRegistry.remis.nocturno.bajada,
    bus: fareRegistry.bus.sube,
    apps: Object.fromEntries(Object.entries(fareRegistry.apps).map(([id, fare]) => [id, {
      base: fare.base,
      km: fare.km,
      min: fare.min,
      minFare: fare.minFare,
      status: fare.status
    }]))
  });
}

test.describe('City Platform V1 browser smoke', () => {
  test.beforeEach(async ({ page }) => {
    const requestLog = [];
    const consoleLog = [];
    const pageErrors = [];
    let nominatimCalls = 0;

    page.__cityEvidence = {
      requestLog,
      consoleLog,
      pageErrors,
      get nominatimCalls() { return nominatimCalls; }
    };

    page.on('console', message => consoleLog.push({ type: message.type(), text: message.text() }));
    page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
    page.on('request', request => {
      requestLog.push({ method: request.method(), url: request.url() });
      if (request.url().includes('nominatim.openstreetmap.org')) nominatimCalls += 1;
    });
    await page.route('**nominatim.openstreetmap.org/**', route => route.abort('blockedbyclient'));
    await page.route('**/api/geocode**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ results: [] })
    }));
  });

  test.afterEach(async ({ page }, testInfo) => {
    await fs.mkdir(evidenceDirectory, { recursive: true });
    const evidence = page.__cityEvidence || { consoleLog: [], requestLog: [], pageErrors: [], nominatimCalls: 0 };
    const slug = `city-platform-${testInfo.project.name}`;
    await fs.writeFile(`${evidenceDirectory}/${slug}-console.json`, JSON.stringify(evidence.consoleLog, null, 2));
    await fs.writeFile(`${evidenceDirectory}/${slug}-requests.json`, JSON.stringify(evidence.requestLog, null, 2));
    await fs.writeFile(`${evidenceDirectory}/${slug}-pageerrors.json`, JSON.stringify(evidence.pageErrors, null, 2));
    if (!page.isClosed()) await page.screenshot({ path: `${evidenceDirectory}/${slug}.png`, fullPage: false });

    expect(evidence.pageErrors, 'fatal page errors').toEqual([]);
    expect(evidence.nominatimCalls, 'direct browser Nominatim requests').toBe(0);
    const relevantErrors = evidence.consoleLog.filter(entry => entry.type === 'error');
    expect(relevantErrors, 'relevant console errors').toEqual([]);
  });

  test('national profile is fail-closed, neutral and unbounded', async ({ page }) => {
    await page.goto('/?city=_default', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.CURRENT_CITY && window.CURRENT_CITY.city_id === '_default' && !document.getElementById('splash'));

    const hasPlatform = await page.evaluate(() => Boolean(window.VoyCityPlatform));
    if (!hasPlatform) {
      expect(new URL(page.url()).hostname).toBe(productionHost);
      expect(await page.evaluate(() => window.CURRENT_CITY.city_id)).toBe('_default');
      return;
    }

    const state = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY.city_id,
      name: window.CURRENT_CITY.name,
      coverageLevel: window.CURRENT_CITY.coverageLevel,
      bbox: window.CURRENT_CITY.map.bbox,
      center: window.CURRENT_CITY.map.center,
      busStops: window.BUS_STOPS.length,
      bikeStations: window.BIKE_STATIONS.length,
      landmarks: window.LANDMARKS.length,
      taxiCompanies: window.TAXI_COMPANIES.length,
      remisCompanies: window.REMIS_COMPANIES.length,
      activeProviders: Object.entries(window.PROVIDERS).filter(([, provider]) => provider.available).map(([id]) => id),
      fareRegistry: window.FareRegistry,
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content || '',
      footer: document.querySelector('.footer')?.textContent || '',
      bodyText: document.body.innerText,
      bodyCityId: document.body.getAttribute('data-city-id'),
      bodyCoverage: document.body.getAttribute('data-coverage-level'),
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth
    }));

    expect(state).toMatchObject({
      cityId: '_default',
      name: 'Argentina',
      coverageLevel: 'national_basic',
      bbox: null,
      center: [-64, -34],
      busStops: 0,
      bikeStations: 0,
      landmarks: 0,
      taxiCompanies: 0,
      remisCompanies: 0,
      activeProviders: [],
      bodyCityId: '_default',
      bodyCoverage: 'national_basic'
    });
    expect(state.title).toBe('VOY — Movilidad en Argentina');
    expect(state.description).toContain('cobertura territorial verificada');
    expect(state.description).not.toContain('Santa Fe');
    expect(state.footer).toContain('Cobertura nacional básica');
    expect(state.footer).toContain('Sin tarifas locales verificadas');
    expect(state.bodyText).not.toContain('$0');
    expect(state.overflow).toBeLessThanOrEqual(1);

    const fares = unavailableFareAssertions()(state);
    expect(fares).toMatchObject({
      taxiDay: null,
      taxiNight: null,
      remisDay: null,
      remisNight: null,
      bus: null
    });
    for (const app of Object.values(fares.apps)) {
      expect(app).toMatchObject({ base: null, km: null, min: null, minFare: null, status: 'not_available' });
    }

    const defaultRequests = page.__cityEvidence.requestLog.filter(entry => entry.url.includes('/cities/_default/'));
    expect(defaultRequests).toHaveLength(5);
    expect(new Set(defaultRequests.map(entry => new URL(entry.url).pathname)).size).toBe(5);
    expect(page.__cityEvidence.requestLog.some(entry => entry.url.includes('/cities/santa-fe/'))).toBe(false);

    await page.evaluate(() => window.MC.searchRemote('Belgrano', { wide: true }));
    const wideRequests = page.__cityEvidence.requestLog.filter(entry => entry.url.includes('/api/geocode') && entry.url.includes('wide=1'));
    expect(wideRequests).toHaveLength(1);
    expect(wideRequests[0].url).toContain('city=_default');
  });

  test('territorial transitions isolate data and same-city emergency remains fail-closed', async ({ page }) => {
    await page.goto('/?city=_default', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.MC && window.CURRENT_CITY && window.CURRENT_CITY.city_id === '_default' && !document.getElementById('splash'));

    const hasPlatform = await page.evaluate(() => Boolean(window.VoyCityPlatform));
    if (!hasPlatform) {
      expect(new URL(page.url()).hostname).toBe(productionHost);
      return;
    }

    expect(await page.evaluate(() => window.loadCityProfile('santafe'))).toBe(true);
    const santaFe = await page.evaluate(() => ({
      cityId: window.CURRENT_CITY.city_id,
      bbox: window.CURRENT_CITY.map.bbox,
      stops: window.BUS_STOPS.length,
      landmarks: window.LANDMARKS.length,
      activeProviders: Object.values(window.PROVIDERS).filter(provider => provider.available).length,
      taxi: window.FareRegistry.taxi.diurno.bajada,
      remis: window.FareRegistry.remis.diurno.bajada,
      bus: window.FareRegistry.bus.sube
    }));
    expect(santaFe.cityId).toBe('santafe');
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
      fares: window.FareRegistry
    }));
    expect(nationalAgain).toMatchObject({ cityId: '_default', bbox: null, stops: 0, bikes: 0, landmarks: 0, activeProviders: 0 });
    expect(nationalAgain.fares.taxi.diurno.bajada).toBeNull();
    expect(nationalAgain.fares.remis.diurno.bajada).toBeNull();
    expect(nationalAgain.fares.bus.sube).toBeNull();

    await page.evaluate(() => {
      localStorage.removeItem('voy_city_cache_v2_santafe');
      localStorage.removeItem('voy_city_cache_santafe');
    });
    await page.route('**/cities/santa-fe/providers.json', route => route.fulfill({ status: 500, body: 'controlled failure' }));
    expect(await page.evaluate(() => window.loadCityProfile('santafe'))).toBe(true);

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

    expect(emergency.cityId).toBe('santafe');
    expect(emergency.source).toBe('emergency');
    expect(emergency.bbox).not.toBeNull();
    expect(emergency).toMatchObject({ stops: 0, bikes: 0, landmarks: 0, companies: 0, activeProviders: 0 });
    expect(emergency.fares.taxi.diurno.bajada).toBeNull();
    expect(emergency.fares.remis.diurno.bajada).toBeNull();
    expect(emergency.fares.bus.sube).toBeNull();
    for (const fare of Object.values(emergency.fares.apps)) expect(fare.status).toBe('not_available');
    expect(emergency.overflow).toBeLessThanOrEqual(1);
  });
});
