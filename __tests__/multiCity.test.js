/* eslint-disable @typescript-eslint/no-require-imports */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const publicRoot = path.join(root, 'public');
const html = fs.readFileSync(path.join(publicRoot, 'VOY-Lite.html'), 'utf8');
const City = require(path.join(publicRoot, 'core', 'cityPlatform.js'));

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(publicRoot, relativePath), 'utf8'));
}

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    clear() { values.clear(); },
    snapshot() { return Object.fromEntries(values); }
  };
}

function createControllerRuntime() {
  const localStorage = createStorage();
  let requestedUrl = null;
  const context = {
    window: null,
    global: null,
    module: { exports: {} },
    exports: {},
    localStorage,
    fetch: async (url) => {
      requestedUrl = String(url);
      return { ok: true, json: async () => [] };
    },
    console: { log() {}, warn() {}, error() {} },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Number,
    URLSearchParams,
    TextEncoder,
    TextDecoder
  };
  context.window = context;
  context.global = context;
  const sandbox = vm.createContext(context);
  for (const relativePath of [
    'core/mobilityEngine.js',
    'core/destinationResolver.js',
    'ui/mobilityController.js'
  ]) {
    vm.runInContext(fs.readFileSync(path.join(publicRoot, relativePath), 'utf8'), sandbox);
  }
  return {
    MC: context.MobilityController,
    localStorage,
    requestedUrl: () => requestedUrl
  };
}

function emptyMemory(favoriteName = null) {
  return {
    favorites: {
      casa: favoriteName ? { nombre: favoriteName, lat: 1, lon: 1, direccion: 'Test' } : null,
      trabajo: null,
      custom: []
    },
    history: [],
    metrics: {
      favTrips: 0,
      histTrips: 0,
      providerTrips: 0,
      totalCreated: 0,
      byType: { casa: 0, trabajo: 0, custom: 0 },
      userCreatedFav: false
    }
  };
}

describe('City Platform V1 compatibility bridge', () => {
  test('legacy city files remain present for rollback and cache migration', () => {
    assert.equal(fs.existsSync(path.join(publicRoot, 'city_default.json')), true);
    assert.equal(fs.existsSync(path.join(publicRoot, 'city_santafe.json')), true);
  });

  test('the HTML loader no longer fetches legacy city files directly', () => {
    assert.match(html, /core\/cityPlatform\.js\?v=1/);
    assert.match(html, /VoyCityPlatform\.loadCity/);
    assert.doesNotMatch(html, /fetch\(['"]city_/);
    assert.doesNotMatch(html, /city__default\.json/);
  });

  test('unknown cities resolve to the national profile without path injection', () => {
    assert.equal(City.normalizeCityId('rosario'), '_default');
    assert.equal(City.normalizeCityId('../../santa-fe'), '_default');
    assert.deepEqual(City.getPaths('../../santa-fe'), {
      profile: 'cities/_default/profile.json',
      providers: 'cities/_default/providers.json',
      transport: 'cities/_default/transport.json',
      fares: 'cities/_default/fares.json',
      featureFlags: 'cities/_default/feature_flags.json'
    });
  });

  test('Santa Fe aliases resolve to the versioned Santa Fe directory', () => {
    for (const alias of ['santafe', 'santa-fe', 'santa_fe', 'santa fe', 'Santa Fé']) {
      assert.equal(City.normalizeCityId(alias), 'santafe');
      assert.equal(City.cityFolder(alias), 'santa-fe');
    }
  });

  test('the national split profile is neutral and unbounded', () => {
    const profile = readJson('cities/_default/profile.json');
    const providers = readJson('cities/_default/providers.json');
    const transport = readJson('cities/_default/transport.json');
    const fares = readJson('cities/_default/fares.json');

    assert.deepEqual(profile.center, [-64, -34]);
    assert.equal(profile.bbox, null);
    assert.equal(profile.coverage_level, 'national_basic');
    assert.equal(Object.values(providers.providers).some((provider) => provider.available), false);
    assert.deepEqual(transport.bus_stops, []);
    assert.deepEqual(transport.bike_stations, []);
    assert.deepEqual(transport.landmarks, []);
    assert.equal(fares.fare_registry.taxi.diurno.bajada, null);
    assert.equal(fares.fare_registry.remis.diurno.bajada, null);
    assert.equal(fares.fare_registry.bus.sube, null);
  });

  test('Santa Fe split data remains a structural copy of the productive legacy profile', () => {
    const legacy = readJson('city_santafe.json');
    const profile = readJson('cities/santa-fe/profile.json');
    const providers = readJson('cities/santa-fe/providers.json');
    const transport = readJson('cities/santa-fe/transport.json');
    const fares = readJson('cities/santa-fe/fares.json');

    assert.deepEqual(profile.center, legacy.map.center);
    assert.deepEqual(profile.bbox, legacy.map.bbox);
    assert.equal(profile.zoom, legacy.map.zoom);
    assert.deepEqual(providers.providers, legacy.providers);
    assert.deepEqual(providers.taxi_companies, legacy.taxiCompanies);
    assert.deepEqual(providers.remis_companies, legacy.remisCompanies);
    assert.deepEqual(transport.bus_stops, legacy.busStops);
    assert.deepEqual(transport.bike_stations, legacy.bikeStations);
    assert.deepEqual(transport.landmarks, legacy.landmarks);
    assert.deepEqual(fares.fare_registry, legacy.fareRegistry);
  });

  test('the initial HTML shell is territorially neutral before JavaScript resolves a city', () => {
    assert.match(html, /<title>VOY — Movilidad urbana<\/title>/);
    assert.match(html, /Cobertura según ciudad/);
    assert.doesNotMatch(html, /<meta name="description" content="[^"]*Santa Fe/);
    assert.doesNotMatch(html, /<footer class="footer">[^<]*Movilidad Santa Fe/);
  });

  test('national UI and share copy do not enumerate unverified providers', () => {
    const updateStart = html.indexOf('function updateCityUI() {');
    const updateEnd = html.indexOf('let cityLoadGeneration = 0;', updateStart);
    const updateCityUI = html.slice(updateStart, updateEnd);
    const shareStart = html.indexOf('function shareApp(){');
    const shareEnd = html.indexOf('function supportCreator(){', shareStart);
    const shareApp = html.slice(shareStart, shareEnd);

    assert.match(updateCityUI, /Sin tarifas locales verificadas/);
    assert.match(updateCityUI, /coverageLevel/);
    assert.doesNotMatch(updateCityUI, /Uber, DiDi, Maxim/);
    assert.doesNotMatch(shareApp, /Compará Uber, DiDi, Maxim, taxi, remis y colectivo/);
  });
});

describe('MobilityController territorial isolation', () => {
  test('switching profiles replaces in-memory favorites rather than mixing cities', () => {
    const runtime = createControllerRuntime();
    runtime.MC.init({ profile: { city_id: '_default' } });
    runtime.MC.addFavorite('casa', 'Casa nacional', 1, 1, 'Test');
    assert.equal(runtime.MC.getFavorites().casa.nombre, 'Casa nacional');

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      busStops: [], bikeStations: [], landmarks: [], providers: {}, fareRegistry: {},
      preparedMemoryState: emptyMemory('Casa Santa Fe')
    });
    assert.equal(runtime.MC.getFavorites().casa.nombre, 'Casa Santa Fe');

    runtime.MC.setProfile({
      profile: { city_id: '_default' },
      busStops: [], bikeStations: [], landmarks: [], providers: {}, fareRegistry: {},
      preparedMemoryState: emptyMemory('Casa nacional')
    });
    assert.equal(runtime.MC.getFavorites().casa.nombre, 'Casa nacional');
  });

  test('setProfile clears origin, destination, estimates and manual-origin state', () => {
    const runtime = createControllerRuntime();
    runtime.MC.init({ profile: { city_id: '_default' } });
    runtime.MC.setOrigin(1, 1, 'Origen', 'manual');
    runtime.MC.setOriginManual(true);
    runtime.MC.setDest(2, 2, 'Destino', 'search');
    runtime.MC.setEstimations([{ mode: 'taxi', price: 1 }]);

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      busStops: [], bikeStations: [], landmarks: [], providers: {}, fareRegistry: {},
      preparedMemoryState: emptyMemory()
    });

    assert.equal(runtime.MC.getOrigin(), null);
    assert.equal(runtime.MC.getDest(), null);
    assert.equal(runtime.MC.getEstimations(), null);
    assert.equal(runtime.MC.isOriginManual(), false);
  });

  test('remote search is proxied through the Worker with the canonical city ID', async () => {
    const runtime = createControllerRuntime();
    runtime.MC.init({ profile: { city_id: '_default' } });
    await runtime.MC.searchRemote('Belgrano');
    assert.equal(runtime.requestedUrl(), '/api/geocode?q=Belgrano&city=_default');
    assert.equal(runtime.requestedUrl().includes('nominatim.openstreetmap.org'), false);
    assert.equal(runtime.requestedUrl().includes('-60.75'), false);

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      busStops: [], bikeStations: [], landmarks: [], providers: {}, fareRegistry: {},
      preparedMemoryState: emptyMemory()
    });
    runtime.MC.clearSearchCache();
    await runtime.MC.searchRemote('Belgrano', { wide: true });
    assert.equal(runtime.requestedUrl(), '/api/geocode?q=Belgrano&city=santafe&wide=1');
  });

  test('local search uses only the active territorial catalog', () => {
    const runtime = createControllerRuntime();
    runtime.MC.init({
      profile: { city_id: '_default', map: { bbox: null } },
      landmarks: [], busStops: [], bikeStations: []
    });
    assert.deepEqual(runtime.MC.searchLocal('Puente Colgante'), []);

    runtime.MC.setProfile({
      profile: { city_id: 'santafe', map: { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } } },
      landmarks: [{ nombre: 'Puente Colgante', lat: -31.639764, lon: -60.682736 }],
      busStops: [], bikeStations: [], providers: {}, fareRegistry: {},
      preparedMemoryState: emptyMemory()
    });
    const results = runtime.MC.searchLocal('Puente Colgante');
    assert.equal(results.length, 1);
    assert.equal(results[0].name, 'Puente Colgante');
  });
});

describe('Migration safety contracts', () => {
  test('legacy _default cache upgrades with national timezone and complete null fares', () => {
    const legacy = readJson('city_default.json');
    const upgraded = City.upgradeLegacyCity(legacy, '_default');
    assert.equal(upgraded.timezone, 'America/Argentina/Buenos_Aires');
    assert.ok(upgraded.fareRegistry.remis);
    assert.equal(upgraded.fareRegistry.remis.diurno.bajada, null);
    assert.deepEqual(Object.keys(upgraded.fareRegistry.apps).sort(), ['cabify', 'didi', 'maxim', 'uber']);
  });

  test('a cache with a different city ID cannot be upgraded into the requested city', () => {
    const legacySantaFe = readJson('city_santafe.json');
    assert.equal(City.upgradeLegacyCity(legacySantaFe, '_default'), null);
  });

  test('all experimental flags remain disabled in both territories', () => {
    for (const file of ['cities/_default/feature_flags.json', 'cities/santa-fe/feature_flags.json']) {
      assert.deepEqual(readJson(file).flags, City.DEFAULT_FLAGS);
    }
  });

  test('package identity remains unchanged', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    assert.equal(pkg.name, 'nextjs_tailwind_shadcn_ts');
  });
});
