/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function json(rel) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')); }

const profile = json('public/cities/santa-fe/profile.json');
const fares = json('public/cities/santa-fe/fares.json');
const providers = json('public/cities/santa-fe/providers.json');
const transport = json('public/cities/santa-fe/transport.json');

const expectedDestinations = new Map([
  ['santafe:landmark:terminal-omnibus', { address: 'Belgrano 2910', lat: -31.643533, lon: -60.700503 }],
  ['santafe:landmark:estacion-belgrano', { address: 'Bv. Gálvez 1150', lat: -31.638849, lon: -60.686789 }],
  ['santafe:landmark:puente-colgante', { address: 'Costanera Oeste–Este, Laguna Setúbal', lat: -31.639764, lon: -60.682736 }]
]);

test('Santa Fe declares bounded partial city coverage with dated verification', () => {
  assert.equal(profile.coverage_level, 'partial');
  assert.match(profile.verified_at, /^2026-/);
  assert.ok(Array.isArray(profile.coverage_notes));
});

test('regulated fares declare issuer, effective date, verification and current status', () => {
  for (const mode of ['taxi', 'remis', 'bus']) {
    const fare = fares.fare_registry[mode];
    assert.match(fare.source, /Resolución|Decreto|Municipalidad/);
    assert.match(fare.effective_from, /^2026-/);
    assert.match(fare.verified_at, /^2026-/);
    assert.equal(fare.status, 'regulated_current');
  }
  assert.equal(fares.fare_registry.bus.cash, null);
});

test('private app availability and price truth fail closed', () => {
  for (const id of ['uber', 'didi']) {
    assert.equal(providers.providers[id].available, true);
    assert.equal(providers.providers[id].availability_status, 'verified_current');
    assert.equal(providers.providers[id].price_status, 'app_only');
    assert.match(providers.providers[id].source_url, /^https:\/\//);
  }
  for (const id of ['maxim', 'cabify', 'radiotaxi', 'taxiapp', 'remisreal']) {
    assert.equal(providers.providers[id].available, false, id);
    assert.match(providers.providers[id].availability_status, /unverified|reference/);
  }
  assert.deepEqual(providers.taxi_companies, []);
  assert.deepEqual(providers.remis_companies, []);
  for (const app of Object.values(fares.fare_registry.apps)) {
    assert.ok(!['current', 'verified', 'active', 'estimated_current'].includes(app.status));
  }
});

test('transport runtime exposes only authoritative destinations and no operational bus or bike feed', () => {
  assert.equal(transport.status, 'runtime_authoritative_destinations_only_no_bus_or_bike_operational_data');
  assert.equal(transport.verified_at, '2026-08-05');
  assert.equal(transport.schema_version, 2);
  assert.equal(transport.landmarks.length, expectedDestinations.size);
  assert.deepEqual(transport.bus_routes, []);
  assert.deepEqual(transport.bus_stops, []);
  assert.deepEqual(transport.bike_stations, []);
  assert.equal(transport.components.landmarks.status, 'operational_authoritative_only');
  assert.equal(transport.components.bus_routes.status, 'unavailable');
  assert.equal(transport.components.bus_stops.status, 'unavailable');
  assert.equal(transport.components.bike_stations.status, 'unavailable');
});

test('each operational destination carries complete authoritative provenance', () => {
  for (const landmark of transport.landmarks) {
    const expected = expectedDestinations.get(landmark.canonicalId);
    assert.ok(expected, landmark.canonicalId);
    assert.equal(landmark.verified, true);
    assert.equal(landmark.source, 'authoritative');
    assert.equal(landmark.precision, 'poi');
    assert.equal(landmark.address, expected.address);
    assert.equal(landmark.lat, expected.lat);
    assert.equal(landmark.lon, expected.lon);
    assert.equal(landmark.verified_at, '2026-08-05');
    assert.equal(landmark.provenance.status, 'authoritative');
    assert.ok(landmark.provenance.issuer);
    assert.ok(landmark.provenance.source_title);
    assert.match(landmark.provenance.source_url, /^https:\/\//);
    assert.ok(landmark.provenance.license);
    assert.ok(landmark.provenance.coordinate_method);
    assert.match(landmark.provenance.coordinate_source_url, /^https:\/\//);
  }
});
