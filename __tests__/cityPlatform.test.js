/* eslint-disable @typescript-eslint/no-require-imports */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sourcePath = path.join(__dirname, '..', 'public', 'core', 'cityPlatform.js');
const City = require(sourcePath);

function makeFlags(cityId = '_default') {
  return { schema_version: 1, city_id: cityId, flags: { ...City.DEFAULT_FLAGS } };
}

function makeProfile(cityId = '_default') {
  const santaFe = cityId === 'santafe';
  return {
    schema_version: 1,
    city_id: cityId,
    slug: santaFe ? 'santa-fe' : '_default',
    name: santaFe ? 'Santa Fe' : 'Argentina',
    display_name: santaFe ? 'Santa Fe, Argentina' : 'Argentina',
    country: 'AR',
    center: santaFe ? [-60.7087, -31.6256] : [-64, -34],
    zoom: santaFe ? 13 : 4,
    bbox: santaFe ? { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } : null,
    viewbox: santaFe ? '-60.75,-31.67,-60.65,-31.57' : undefined,
    timezone: santaFe ? 'America/Argentina/Cordoba' : 'America/Argentina/Buenos_Aires',
    coverage_level: santaFe ? 'partial' : 'national_basic',
    coverage_notes: ['test fixture']
  };
}

function makeProviders(cityId = '_default') {
  return {
    schema_version: 1,
    city_id: cityId,
    providers: {
      uber: { name: 'Uber', available: false, verified: false, category: 'app', color: '#111111' }
    },
    taxi_companies: [],
    remis_companies: []
  };
}

function makeTransport(cityId = '_default') {
  return { schema_version: 1, city_id: cityId, bus_stops: [], bike_stations: [], landmarks: [] };
}

function unavailableMeterFare() {
  return {
    diurno: { bajada: null, ficha: null, distFicha: 130 },
    nocturno: { bajada: null, ficha: null, distFicha: 130 },
    status: 'not_available'
  };
}

function makeFares(cityId = '_default') {
  const app = { base: null, km: null, min: null, minFare: null, status: 'not_available' };
  return {
    schema_version: 1,
    city_id: cityId,
    fare_registry: {
      taxi: unavailableMeterFare(),
      remis: unavailableMeterFare(),
      bus: { sube: null, cash: null, status: 'not_available' },
      apps: {
        uber: { ...app },
        didi: { ...app },
        maxim: { ...app },
        cabify: { ...app }
      }
    }
  };
}

function makeParts(cityId = '_default') {
  return {
    profile: makeProfile(cityId),
    providers: makeProviders(cityId),
    transport: makeTransport(cityId),
    fares: makeFares(cityId),
    featureFlags: makeFlags(cityId)
  };
}

function legacyCity(cityId = '_default') {
  return {
    city_id: cityId,
    name: cityId === 'santafe' ? 'Santa Fe' : 'Desconocida',
    displayName: cityId === 'santafe' ? 'Santa Fe, Argentina' : 'Ciudad Desconocida',
    map: { center: cityId === 'santafe' ? [-60.7087, -31.6256] : [0, 0], zoom: cityId === 'santafe' ? 13 : 2 },
    busStops: [],
    bikeStations: [],
    landmarks: [],
    providers: {},
    taxiCompanies: [],
    remisCompanies: [],
    fareRegistry: { taxi: unavailableMeterFare(), bus: { sube: null, cash: null }, apps: {} }
  };
}

describe('VoyCityPlatform normalization and paths', () => {
  test('_default normalizes correctly', () => assert.equal(City.normalizeCityId('_default'), '_default'));
  test('default normalizes to _default', () => assert.equal(City.normalizeCityId('default'), '_default'));
  test('argentina normalizes to _default', () => assert.equal(City.normalizeCityId('argentina'), '_default'));
  test('santafe normalizes correctly', () => assert.equal(City.normalizeCityId('santafe'), 'santafe'));
  test('santa-fe normalizes to santafe', () => assert.equal(City.normalizeCityId('santa-fe'), 'santafe'));
  test('santa_fe normalizes to santafe', () => assert.equal(City.normalizeCityId('santa_fe'), 'santafe'));
  test('santa fe normalizes to santafe', () => assert.equal(City.normalizeCityId('santa fe'), 'santafe'));
  test('accented Santa Fé normalizes to santafe', () => assert.equal(City.normalizeCityId('Santa Fé'), 'santafe'));
  test('unknown city normalizes to _default', () => assert.equal(City.normalizeCityId('rosario'), '_default'));
  test('folder for _default is stable', () => assert.equal(City.cityFolder('_default'), '_default'));
  test('folder for Santa Fe is santa-fe', () => assert.equal(City.cityFolder('santa fe'), 'santa-fe'));
});

describe('VoyCityPlatform loading and composition', () => {
  test('loadCity performs exactly five no-store fetches and propagates the signal', async () => {
    const expected = makeParts('santafe');
    const payloads = new Map([
      ['cities/santa-fe/profile.json', expected.profile],
      ['cities/santa-fe/providers.json', expected.providers],
      ['cities/santa-fe/transport.json', expected.transport],
      ['cities/santa-fe/fares.json', expected.fares],
      ['cities/santa-fe/feature_flags.json', expected.featureFlags]
    ]);
    const signal = new AbortController().signal;
    const calls = [];
    const city = await City.loadCity('santa-fe', {
      signal,
      fetch: async (url, options) => {
        calls.push({ url, options });
        return { ok: true, status: 200, json: async () => structuredClone(payloads.get(url)) };
      }
    });

    assert.equal(city.city_id, 'santafe');
    assert.equal(calls.length, 5);
    assert.deepEqual(calls.map((call) => call.url).sort(), [...payloads.keys()].sort());
    for (const call of calls) {
      assert.equal(call.options.cache, 'no-store');
      assert.equal(call.options.signal, signal);
      assert.deepEqual(call.options.headers, { Accept: 'application/json' });
    }
  });

  test('valid parts compose deterministically', () => {
    const city = City.composeCity(makeParts('santafe'), 'santafe');
    assert.equal(city.schemaVersion, 1);
    assert.equal(city.city_id, 'santafe');
    assert.equal(city.slug, 'santa-fe');
    assert.equal(city.coverageLevel, 'partial');
    assert.equal(City.isValidComposedCity(city, 'santafe'), true);
  });

  test('HTTP failures reject with status and URL', async () => {
    await assert.rejects(
      City.loadCity('_default', { fetch: async () => ({ ok: false, status: 404 }) }),
      (error) => error.status === 404 && error.url === 'cities/_default/profile.json'
    );
  });

  test('corrupt JSON rejects without composing a city', async () => {
    await assert.rejects(
      City.loadCity('_default', {
        fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('bad json'); } })
      }),
      /city_part_invalid_json/
    );
  });
});

describe('VoyCityPlatform strict schemas', () => {
  test('rejects invalid profile coordinates', () => {
    const value = makeProfile();
    value.center = [500, 100];
    assert.equal(City.validateProfile(value, '_default'), false);
  });
  test('rejects profile city ID mismatch', () => assert.equal(City.validateProfile(makeProfile('santafe'), '_default'), false));
  test('rejects profile schema mismatch', () => {
    const value = makeProfile();
    value.schema_version = 2;
    assert.equal(City.validateProfile(value, '_default'), false);
  });
  test('rejects invalid providers', () => {
    const value = makeProviders();
    value.providers.uber.available = 'yes';
    assert.equal(City.validateProviders(value, '_default'), false);
  });
  test('rejects invalid transport coordinates', () => {
    const value = makeTransport();
    value.landmarks.push({ nombre: 'Invalid', lat: Number.NaN, lon: -60 });
    assert.equal(City.validateTransport(value, '_default'), false);
  });
  test('rejects incomplete fares', () => {
    const value = makeFares();
    delete value.fare_registry.remis;
    assert.equal(City.validateFares(value, '_default'), false);
  });
  test('rejects unknown or non-boolean feature flags', () => {
    const unknown = makeFlags();
    unknown.flags.extra = false;
    assert.equal(City.validateFlags(unknown, '_default'), false);
    const invalid = makeFlags();
    invalid.flags.web_push = 'false';
    assert.equal(City.validateFlags(invalid, '_default'), false);
  });
  test('compose reports which territorial part is invalid', () => {
    const cases = [
      ['profile', 'invalid_city_profile'],
      ['providers', 'invalid_city_providers'],
      ['transport', 'invalid_city_transport'],
      ['fares', 'invalid_city_fares'],
      ['featureFlags', 'invalid_city_feature_flags']
    ];
    for (const [key, message] of cases) {
      const value = makeParts();
      value[key].city_id = 'santafe';
      assert.throws(() => City.composeCity(value, '_default'), new RegExp(message));
    }
  });
});

describe('VoyCityPlatform legacy migration and side effects', () => {
  test('legacy _default uses the national timezone and complete fail-closed fares', () => {
    const upgraded = City.upgradeLegacyCity(legacyCity(), '_default');
    assert.equal(upgraded.timezone, 'America/Argentina/Buenos_Aires');
    assert.ok(upgraded.fareRegistry.remis);
    assert.deepEqual(Object.keys(upgraded.fareRegistry.apps).sort(), ['cabify', 'didi', 'maxim', 'uber']);
  });
  test('legacy Santa Fe keeps the Córdoba timezone', () => {
    const upgraded = City.upgradeLegacyCity(legacyCity('santafe'), 'santafe');
    assert.equal(upgraded.timezone, 'America/Argentina/Cordoba');
  });
  test('legacy city ID mismatch is rejected', () => assert.equal(City.upgradeLegacyCity(legacyCity('santafe'), '_default'), null));
  test('default feature flags remain disabled', () => {
    assert.deepEqual(City.DEFAULT_FLAGS, {
      ai_copilot: false,
      voice_input: false,
      qr_stops: false,
      web_push: false,
      live_transit: false,
      weather_context: false,
      price_history: false
    });
  });
  test('module loads without DOM or storage globals', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const context = vm.createContext({ module: { exports: {} }, exports: {}, globalThis: {} });
    vm.runInContext(source, context);
    assert.equal(typeof context.module.exports.loadCity, 'function');
    assert.equal(context.globalThis.document, undefined);
    assert.equal(context.globalThis.localStorage, undefined);
  });
});
