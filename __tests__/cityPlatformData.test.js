/* eslint-disable @typescript-eslint/no-require-imports */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', 'public');
const City = require(path.join(root, 'core', 'cityPlatform.js'));
const COMPONENTS = ['profile', 'providers', 'transport', 'fares', 'feature_flags'];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readCity(folder) {
  return Object.fromEntries(COMPONENTS.map((name) => [name, readJson(`cities/${folder}/${name}.json`)]));
}

function allNumbersOrNull(value) {
  if (value === null) return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(allNumbersOrNull);
  if (value && typeof value === 'object') return Object.values(value).every(allNumbersOrNull);
  return true;
}

describe('versioned city datasets', () => {
  const national = readCity('_default');
  const santaFe = readCity('santa-fe');

  test('all ten files exist, parse and use schema version 1', () => {
    for (const city of [national, santaFe]) {
      for (const component of COMPONENTS) assert.equal(city[component].schema_version, 1, component);
    }
  });

  test('component city IDs are coherent', () => {
    for (const component of COMPONENTS) {
      assert.equal(national[component].city_id, '_default');
      assert.equal(santaFe[component].city_id, 'santafe');
    }
  });

  test('profiles and all nested components satisfy the runtime validators', () => {
    assert.equal(City.validateProfile(national.profile, '_default'), true);
    assert.equal(City.validateProviders(national.providers, '_default'), true);
    assert.equal(City.validateTransport(national.transport, '_default'), true);
    assert.equal(City.validateFares(national.fares, '_default'), true);
    assert.equal(City.validateFlags(national.feature_flags, '_default'), true);

    assert.equal(City.validateProfile(santaFe.profile, 'santafe'), true);
    assert.equal(City.validateProviders(santaFe.providers, 'santafe'), true);
    assert.equal(City.validateTransport(santaFe.transport, 'santafe'), true);
    assert.equal(City.validateFares(santaFe.fares, 'santafe'), true);
    assert.equal(City.validateFlags(santaFe.feature_flags, 'santafe'), true);
  });

  test('_default is national_basic and Santa Fe remains partial', () => {
    assert.equal(national.profile.coverage_level, 'national_basic');
    assert.equal(santaFe.profile.coverage_level, 'partial');
    assert.equal(santaFe.providers.providers.uber.availability_status, 'verified_current');
    assert.equal(santaFe.providers.providers.didi.price_status, 'app_only');
    assert.equal(santaFe.providers.providers.maxim.available, false);
    assert.equal(santaFe.fares.fare_registry.bus.status, 'regulated_current');
  });

  test('all feature flags remain disabled', () => {
    for (const payload of [national.feature_flags, santaFe.feature_flags]) {
      assert.deepEqual(payload.flags, City.DEFAULT_FLAGS);
    }
  });

  test('_default contains no Santa Fe territorial content', () => {
    const raw = COMPONENTS.map((name) => fs.readFileSync(path.join(root, 'cities', '_default', `${name}.json`), 'utf8')).join('\n').toLowerCase();
    for (const forbidden of ['santa fe', 'santafe', '-60.7087', 'radiotaxi', 'remisreal', 'taxiapp', 'bajada": 1790']) {
      assert.equal(raw.includes(forbidden), false, forbidden);
    }
    assert.equal(national.profile.bbox, null);
    assert.deepEqual(national.transport.bus_stops, []);
    assert.deepEqual(national.transport.bike_stations, []);
    assert.deepEqual(national.transport.landmarks, []);
    assert.deepEqual(national.providers.taxi_companies, []);
    assert.deepEqual(national.providers.remis_companies, []);
    assert.equal(Object.values(national.providers.providers).some((provider) => provider.available), false);
  });

  test('_default fares are complete and fail closed without fabricated zeroes', () => {
    const registry = national.fares.fare_registry;
    assert.deepEqual(Object.keys(registry).sort(), ['apps', 'bus', 'remis', 'taxi']);
    for (const mode of ['taxi', 'remis']) {
      assert.equal(registry[mode].diurno.bajada, null);
      assert.equal(registry[mode].diurno.ficha, null);
      assert.equal(registry[mode].nocturno.bajada, null);
      assert.equal(registry[mode].nocturno.ficha, null);
      assert.equal(registry[mode].status, 'not_available');
    }
    assert.equal(registry.bus.sube, null);
    assert.equal(registry.bus.cash, null);
    assert.equal(registry.bus.status, 'not_available');
    for (const provider of Object.values(registry.apps)) {
      assert.equal(provider.base, null);
      assert.equal(provider.km, null);
      assert.equal(provider.min, null);
      assert.equal(provider.minFare, null);
      assert.equal(provider.status, 'not_available');
    }
  });

  test('Santa Fe is a structural migration of the legacy profile', () => {
    const legacy = readJson('city_santafe.json');
    assert.deepEqual(santaFe.providers.providers, legacy.providers);
    assert.deepEqual(santaFe.providers.taxi_companies, legacy.taxiCompanies);
    assert.deepEqual(santaFe.providers.remis_companies, legacy.remisCompanies);
    assert.deepEqual(santaFe.transport.bus_stops, legacy.busStops);
    assert.deepEqual(santaFe.transport.bike_stations, legacy.bikeStations);
    assert.deepEqual(santaFe.transport.landmarks, legacy.landmarks);
    assert.deepEqual(santaFe.fares.fare_registry, legacy.fareRegistry);
    assert.deepEqual(santaFe.profile.center, legacy.map.center);
    assert.deepEqual(santaFe.profile.bbox, legacy.map.bbox);
    assert.equal(santaFe.profile.zoom, legacy.map.zoom);
  });

  test('regulated Santa Fe fares and stale private-app policy are preserved', () => {
    const registry = santaFe.fares.fare_registry;
    assert.deepEqual(registry.taxi.diurno, { bajada: 1790, ficha: 179, distFicha: 130 });
    assert.deepEqual(registry.taxi.nocturno, { bajada: 2058, ficha: 206, distFicha: 130 });
    assert.deepEqual(registry.remis.diurno, { bajada: 1600, ficha: 160, distFicha: 130 });
    assert.deepEqual(registry.remis.nocturno, { bajada: 1840, ficha: 184, distFicha: 130 });
    assert.equal(registry.bus.sube, 1900);
    assert.equal(registry.apps.uber.status, 'stale_estimate');
    assert.equal(registry.apps.didi.status, 'stale_estimate');
    assert.equal(registry.apps.maxim.status, 'stale_estimate');
    assert.equal(registry.apps.cabify.status, 'stale_reference');
  });

  test('datasets contain no NaN values', () => {
    assert.equal(allNumbersOrNull(national), true);
    assert.equal(allNumbersOrNull(santaFe), true);
  });
});
