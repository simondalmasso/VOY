/* eslint-disable @typescript-eslint/no-require-imports */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const htmlPath = path.join(__dirname, '..', 'public', 'VOY-Lite.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractBetween(start, end) {
  const startIndex = html.indexOf(start);
  assert.notEqual(startIndex, -1, `missing start marker: ${start}`);
  const endIndex = html.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `missing end marker: ${end}`);
  return html.slice(startIndex, endIndex);
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const reads = [];
  const removals = [];
  return {
    reads,
    removals,
    getItem(key) { reads.push(key); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { removals.push(key); values.delete(key); },
    value(key) { return values.get(key); }
  };
}

function emergencyCity(cityId) {
  const santaFe = cityId === 'santafe';
  return {
    schemaVersion: 1,
    city_id: cityId,
    slug: santaFe ? 'santa-fe' : '_default',
    name: santaFe ? 'Santa Fe' : 'Argentina',
    displayName: santaFe ? 'Santa Fe, Argentina' : 'Argentina',
    coverageLevel: santaFe ? 'partial' : 'national_basic',
    map: { center: santaFe ? [-60.7087, -31.6256] : [-64, -34], zoom: santaFe ? 13 : 4, bbox: null },
    busStops: [], bikeStations: [], landmarks: [], providers: {}, taxiCompanies: [], remisCompanies: [],
    fareRegistry: {}, featureFlags: {}, dataFreshness: {}, dataSources: { profile: 'test' }
  };
}

function loadLoaderRuntime(options = {}) {
  const storage = options.storage || createStorage();
  const commits = [];
  const platform = {
    DEFAULT_FLAGS: {},
    normalizeCityId(value) {
      const compact = String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
      return compact === 'santafe' ? 'santafe' : '_default';
    },
    isValidComposedCity(value, cityId) { return Boolean(value && value.city_id === cityId && value.schemaVersion === 1); },
    upgradeLegacyCity(value, cityId) {
      if (!value || value.city_id !== cityId) return null;
      return { ...emergencyCity(cityId), ...value, schemaVersion: 1, slug: cityId === 'santafe' ? 'santa-fe' : '_default', coverageLevel: cityId === 'santafe' ? 'partial' : 'national_basic' };
    },
    loadCity: options.loadCity || (async (cityId) => ({ ...emergencyCity(cityId), dataSources: { profile: 'remote-test' } }))
  };

  const context = {
    window: null,
    VoyCityPlatform: platform,
    localStorage: storage,
    AbortController,
    setTimeout: options.setTimeout || setTimeout,
    clearTimeout: options.clearTimeout || clearTimeout,
    console: { warn() {}, error() {} },
    prepareMemoryStateForCity() { return { favorites: { casa: null, trabajo: null, custom: [] }, history: [], metrics: {} }; },
    commitCityContext(value) { commits.push(value.profile); },
    createEmergencyDefault: emergencyCity
  };
  context.window = context;

  const validator = extractBetween('function isValidCitySchema(data, expectedCityId) {', 'function detectCity() {');
  const loader = extractBetween('let cityLoadGeneration = 0;', 'function prepareMemoryStateForCity(targetCityId) {');
  vm.runInContext(`${validator}\n${loader}`, vm.createContext(context));
  return { context, storage, commits };
}

describe('City Platform HTML integration contract', () => {
  test('loads the versioned platform before the mobility engine', () => {
    const cityIndex = html.indexOf('core/cityPlatform.js?v=1');
    const engineIndex = html.indexOf('core/mobilityEngine.js?v=12');
    assert.ok(cityIndex >= 0 && cityIndex < engineIndex);
  });

  test('uses the versioned loader and territorial cache v2', () => {
    assert.match(html, /VoyCityPlatform\.loadCity/);
    assert.match(html, /voy_city_cache_v2_/);
    assert.match(html, /voy_city_cache_/);
  });

  test('does not fetch legacy city files directly from the loader', () => {
    assert.doesNotMatch(html, /fetch\(['"]city_/);
    assert.doesNotMatch(html, /['"]city_['"]\s*\+\s*fileId/);
  });

  test('initial metadata and footer are territorially neutral', () => {
    assert.match(html, /<title>VOY — Movilidad urbana<\/title>/);
    assert.match(html, /Cobertura según ciudad/);
    assert.doesNotMatch(html, /<meta name="description" content="[^"]*Santa Fe/);
    assert.doesNotMatch(html, /<footer class="footer">[^<]*Movilidad Santa Fe/);
  });

  test('national communication is coverage-aware and does not enumerate providers', () => {
    const updateCityUI = extractBetween('function updateCityUI() {', 'let cityLoadGeneration = 0;');
    assert.match(updateCityUI, /national_basic/);
    assert.match(updateCityUI, /Sin tarifas locales verificadas/);
    assert.doesNotMatch(updateCityUI, /Uber, DiDi, Maxim/);
    const shareApp = extractBetween('function shareApp(){', 'function supportCreator(){');
    assert.match(shareApp, /coverageLevel/);
    assert.doesNotMatch(shareApp, /Compará Uber, DiDi, Maxim, taxi, remis y colectivo/);
  });

  test('superseded loaders are actively aborted', () => {
    assert.match(html, /activeCityLoadController\.abort\(\)/);
  });

  test('fallback policy is same-city cache then same-city emergency', () => {
    const loader = extractBetween('let cityLoadGeneration = 0;', 'function prepareMemoryStateForCity(targetCityId) {');
    assert.match(loader, /getValidCache\(cityId\)/);
    assert.match(loader, /createEmergencyDefault\(cityId\)/);
    assert.doesNotMatch(loader, /loadCityProfileForGeneration\('_default'/);
  });

  test('MobilityController initialization remains singular', () => {
    assert.ok((html.match(/\bMC\.init\(/g) || []).length <= 1);
  });
});

describe('City Platform loader fallbacks', () => {
  test('network failure without cache commits the requested city emergency profile', async () => {
    const runtime = loadLoaderRuntime({ loadCity: async () => { throw new TypeError('network'); } });
    assert.equal(await runtime.context.loadCityProfile('santafe'), true);
    assert.equal(runtime.commits.at(-1).city_id, 'santafe');
    assert.equal(runtime.commits.at(-1).dataSources.profile, 'test');
  });

  test('a valid same-city v2 cache wins over emergency fallback', async () => {
    const cached = { ...emergencyCity('santafe'), name: 'Santa Fe Cached' };
    const storage = createStorage({ voy_city_cache_v2_santafe: JSON.stringify(cached) });
    const runtime = loadLoaderRuntime({ storage, loadCity: async () => { throw new TypeError('network'); } });
    await runtime.context.loadCityProfile('santafe');
    assert.equal(runtime.commits.at(-1).name, 'Santa Fe Cached');
  });

  test('corrupt v2 cache is removed and valid legacy cache is migrated', async () => {
    const legacy = { ...emergencyCity('santafe'), schemaVersion: undefined, name: 'Legacy Santa Fe' };
    const storage = createStorage({
      voy_city_cache_v2_santafe: '{broken',
      voy_city_cache_santafe: JSON.stringify(legacy)
    });
    const runtime = loadLoaderRuntime({ storage, loadCity: async () => { throw new TypeError('network'); } });
    await runtime.context.loadCityProfile('santafe');
    assert.ok(storage.removals.includes('voy_city_cache_v2_santafe'));
    assert.equal(runtime.commits.at(-1).name, 'Legacy Santa Fe');
    assert.ok(storage.value('voy_city_cache_v2_santafe'));
  });

  test('cache from another city is never read', async () => {
    const storage = createStorage({ voy_city_cache_v2_santafe: JSON.stringify(emergencyCity('santafe')) });
    const runtime = loadLoaderRuntime({ storage, loadCity: async () => { throw new TypeError('network'); } });
    await runtime.context.loadCityProfile('_default');
    assert.equal(storage.reads.includes('voy_city_cache_v2_santafe'), false);
    assert.equal(runtime.commits.at(-1).city_id, '_default');
  });

  test('superseding a pending loader aborts it and only commits the newest city', async () => {
    const runtime = loadLoaderRuntime({
      loadCity(cityId, { signal }) {
        if (cityId === '_default') return Promise.resolve(emergencyCity('_default'));
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      }
    });
    const first = runtime.context.loadCityProfile('santafe');
    const second = runtime.context.loadCityProfile('_default');
    assert.equal(await first, false);
    assert.equal(await second, true);
    assert.deepEqual(runtime.commits.map((city) => city.city_id), ['_default']);
  });

  test('timeout abort falls back without activating remote data', async () => {
    const runtime = loadLoaderRuntime({
      setTimeout(callback) { queueMicrotask(callback); return 1; },
      clearTimeout() {},
      loadCity(cityId, { signal }) {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('timeout');
            error.name = 'AbortError';
            reject(error);
          }, { once: true });
        });
      }
    });
    assert.equal(await runtime.context.loadCityProfile('santafe'), true);
    assert.equal(runtime.commits.at(-1).city_id, 'santafe');
  });

  test('sequential _default and Santa Fe loads remain territorially isolated', async () => {
    const runtime = loadLoaderRuntime();
    await runtime.context.loadCityProfile('_default');
    await runtime.context.loadCityProfile('santafe');
    await runtime.context.loadCityProfile('_default');
    assert.deepEqual(runtime.commits.map((city) => city.city_id), ['_default', 'santafe', '_default']);
  });
});
