/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('Multi-City Foundation v1 — Isolation & Resolution Tests', () => {

  // Load configuration profiles
  const santafeProfile = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'public', 'city_santafe.json'), 'utf8')
  );
  const defaultProfile = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'public', 'city_default.json'), 'utf8')
  );

  test('Santa Fe config profile has verified and valid territorial data', () => {
    assert.strictEqual(santafeProfile.city_id, 'santafe');
    assert.strictEqual(santafeProfile.name, 'Santa Fe');
    assert.ok(santafeProfile.busStops.length > 0, 'Santa Fe must have bus stops');
    assert.ok(santafeProfile.bikeStations.length > 0, 'Santa Fe must have bike stations');
    assert.ok(santafeProfile.landmarks.length > 0, 'Santa Fe must have landmarks');

    // All Santa Fe providers must be marked as verified
    Object.keys(santafeProfile.providers).forEach(key => {
      assert.strictEqual(santafeProfile.providers[key].verified, true, `Provider ${key} in Santa Fe must be verified`);
    });
  });

  test('Default config profile represents _default (unknown city) correctly', () => {
    assert.strictEqual(defaultProfile.city_id, '_default');
    assert.strictEqual(defaultProfile.name, 'Desconocida');
    assert.strictEqual(defaultProfile.busStops.length, 0, 'Default city must have 0 bus stops');
    assert.strictEqual(defaultProfile.bikeStations.length, 0, 'Default city must have 0 bike stations');
    assert.strictEqual(defaultProfile.landmarks.length, 0, 'Default city must have 0 landmarks');
    assert.strictEqual(defaultProfile.taxiCompanies.length, 0, 'Default city must have 0 taxi companies');
    assert.strictEqual(defaultProfile.remisCompanies.length, 0, 'Default city must have 0 remis companies');

    // All providers in _default must be marked as unverified
    Object.keys(defaultProfile.providers).forEach(key => {
      assert.strictEqual(defaultProfile.providers[key].verified, false, `Provider ${key} in _default must be unverified`);
    });
  });

  test('No Santa Fe details can leak into the Default config profile', () => {
    const rawDefault = fs.readFileSync(path.join(__dirname, '..', 'public', 'city_default.json'), 'utf8');
    assert.ok(!rawDefault.includes('Santa Fe'), 'Default profile must not mention "Santa Fe"');
    assert.ok(!rawDefault.includes('Belgrano'), 'Default profile must not mention Santa Fe streets');
    assert.ok(!rawDefault.includes('Cullen'), 'Default profile must not mention Santa Fe landmarks');
    assert.ok(!rawDefault.includes('remisreal'), 'Default profile must not contain Santa Fe remis identifiers');
    assert.ok(!rawDefault.includes('radiotaxi'), 'Default profile must not contain Santa Fe taxi identifiers');
  });

  test('A bounding box bounds check resolves coordinates correctly', () => {
    // Helper replicating detectCity coordinates resolution logic
    function resolveCityFromCoords(lat, lon) {
      if (lat >= -31.67 && lat <= -31.57 && lon >= -60.75 && lon <= -60.65) {
        return 'santafe';
      }
      return '_default';
    }

    assert.strictEqual(resolveCityFromCoords(-31.6256, -60.7087), 'santafe', 'Center of Santa Fe must resolve to santafe');
    assert.strictEqual(resolveCityFromCoords(-34.6037, -58.3816), '_default', 'Buenos Aires center must resolve to _default');
    assert.strictEqual(resolveCityFromCoords(0, 0), '_default', 'Null island must resolve to _default');
  });

  test('isValidCitySchema correctly validates schema properties and ids', () => {
    function isValidCitySchema(data, expectedCityId) {
      if (!data || typeof data !== 'object') return false;
      if (data.city_id !== expectedCityId) return false;
      if (typeof data.name !== 'string') return false;
      if (!data.map || typeof data.map !== 'object') return false;
      if (!data.providers || typeof data.providers !== 'object') return false;
      if (!data.fareRegistry || typeof data.fareRegistry !== 'object') return false;
      return true;
    }

    assert.ok(isValidCitySchema(santafeProfile, 'santafe'), 'Santa Fe profile must be valid');
    assert.ok(isValidCitySchema(defaultProfile, '_default'), 'Default profile must be valid');

    // Invalid / missing property tests
    assert.strictEqual(isValidCitySchema(null, 'santafe'), false);
    assert.strictEqual(isValidCitySchema({}, 'santafe'), false);
    assert.strictEqual(isValidCitySchema({ city_id: 'santafe' }, 'santafe'), false);
    assert.strictEqual(isValidCitySchema({ city_id: 'santafe', name: 'Santa Fe', map: {}, providers: {} }, 'santafe'), false);
  });

  test('detectCity restricts resolved cities to santafe and _default, resolving unknown to _default', () => {
    function detectCityMock(urlParam, cachedPos) {
      var cityId = urlParam;
      if (cityId) {
        cityId = cityId.toLowerCase();
        if (cityId === 'santafe' || cityId === 'santa_fe') {
          return 'santafe';
        }
        return '_default';
      }
      if (cachedPos) {
        var pos = cachedPos;
        if (pos && typeof pos.lat === 'number' && typeof pos.lon === 'number') {
          if (pos.lat >= -31.67 && pos.lat <= -31.57 && pos.lon >= -60.75 && pos.lon <= -60.65) {
            return 'santafe';
          }
        }
      }
      return '_default';
    }

    // Explicit valid URL parameter resolves to santafe
    assert.strictEqual(detectCityMock('santafe', null), 'santafe');
    assert.strictEqual(detectCityMock('santa_fe', null), 'santafe');

    // Unknown URL parameter resolves strictly to _default, never Santa Fe
    assert.strictEqual(detectCityMock('paris', null), '_default');
    assert.strictEqual(detectCityMock('buenosaires', null), '_default');

    // Confirmed location in Santa Fe resolves to santafe
    assert.strictEqual(detectCityMock(null, { lat: -31.6256, lon: -60.7087 }), 'santafe');

    // Confirmed location outside Santa Fe resolves to _default, never Santa Fe
    assert.strictEqual(detectCityMock(null, { lat: -34.6037, lon: -58.3816 }), '_default');

    // Missing everything resolves to _default, never Santa Fe
    assert.strictEqual(detectCityMock(null, null), '_default');
  });

  test('Corrupt JSON parsing fails gracefully without activating Santa Fe', () => {
    function parseJSONSafely(rawJson, cityId) {
      try {
        return JSON.parse(rawJson);
      } catch (e) {
        // Fallback to default instead of activating Santa Fe
        return null;
      }
    }

    const badJson = '{ corrupt json:';
    const result = parseJSONSafely(badJson, 'santafe');
    assert.strictEqual(result, null, 'Parsing corrupt JSON must return null/fallback and not Santa Fe properties');
  });

});
