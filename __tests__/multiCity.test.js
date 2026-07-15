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

});
