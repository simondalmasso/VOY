/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const MobilityEngine = require('../public/core/mobilityEngine.js');
const fares = require('../public/cities/santa-fe/fares.json');
const transport = require('../public/cities/santa-fe/transport.json');

test('distance and time outputs are deterministic for identical validated coordinates', () => {
  const origin = { lat: -31.6435, lon: -60.7011 };
  const destination = { lat: -31.6289, lon: -60.6891 };
  const first = MobilityEngine.runAllEstimations(origin, destination, {
    busStops: transport.bus_stops,
    bikeStations: transport.bike_stations,
    fareRegistry: fares.fare_registry
  });
  const second = MobilityEngine.runAllEstimations(origin, destination, {
    busStops: transport.bus_stops,
    bikeStations: transport.bike_stations,
    fareRegistry: fares.fare_registry
  });
  assert.deepEqual(first, second);
  assert.ok(first.length > 0);
  for (const option of first) {
    assert.ok(Number.isFinite(option.distance));
    if (option.timeMin !== undefined) assert.ok(Number.isFinite(option.timeMin));
  }
});

test('app-only prices cannot enter deterministic ranking', () => {
  const auto = MobilityEngine.estimateAuto(4.2, fares.fare_registry, 14);
  assert.equal(auto.uberPrice, null);
  assert.equal(auto.didiPrice, null);
  assert.equal(auto.maximPrice, null);
  assert.equal(auto.cabifyPrice, null);
  const ranked = MobilityEngine.rankProviders(auto, { uber: true, didi: true, maxim: true, cabify: true, taxi: true, remis: true, taxiapp: true });
  assert.ok(ranked.every(provider => !['uber', 'didi', 'maxim', 'cabify'].includes(provider.id)));
});

test('unknown bus route returns null instead of a fabricated fallback', () => {
  const result = MobilityEngine.estimateBus({ lat: -31.62, lon: -60.7 }, { lat: -31.64, lon: -60.68 }, [], fares.fare_registry.bus);
  assert.equal(result, null);
});
