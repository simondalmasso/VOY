/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const MobilityEngine = require(path.join(root, 'public', 'core', 'mobilityEngine.js'));
const city = JSON.parse(fs.readFileSync(path.join(root, 'public', 'city_santafe.json'), 'utf8'));
const fares = JSON.parse(fs.readFileSync(path.join(root, 'public', 'fares.json'), 'utf8'));
const serviceWorker = fs.readFileSync(path.join(root, 'public', 'sw.js'), 'utf8');

function appFixtures() {
  return {
    uber: { base: 1000, km: 500, min: 65, minFare: 3000 },
    didi: { base: 900, km: 440, min: 55, minFare: 2500 },
    maxim: { base: 855, km: 418, min: 52, minFare: 2375 },
    cabify: { base: 1100, km: 520, min: 70, minFare: 3300 }
  };
}

test('Santa Fe runtime registry publishes the July taxi and June remis tariffs', () => {
  assert.deepEqual(city.fareRegistry.taxi.diurno, { bajada: 1790, ficha: 179, distFicha: 130 });
  assert.deepEqual(city.fareRegistry.taxi.nocturno, { bajada: 2058, ficha: 206, distFicha: 130 });
  assert.equal(city.fareRegistry.taxi.effective_from, '2026-07-11');
  assert.equal(city.fareRegistry.taxi.source, 'Resolución Municipal 217/2026');
  assert.ok(city.fareRegistry.taxi.source_urls.every(url => url.startsWith('https://')));

  assert.deepEqual(city.fareRegistry.remis.diurno, { bajada: 1600, ficha: 160, distFicha: 130 });
  assert.deepEqual(city.fareRegistry.remis.nocturno, { bajada: 1840, ficha: 184, distFicha: 130 });
  assert.equal(city.fareRegistry.remis.effective_from, '2026-06-06');
  assert.equal(city.fareRegistry.remis.source, 'Resolución Municipal 365/2026');
  assert.match(city.fareRegistry.remis.source_url, /^https:\/\//);
});

test('public fare provenance matches the runtime registry', () => {
  assert.equal(fares.taxi.diurno.bajada, city.fareRegistry.taxi.diurno.bajada);
  assert.equal(fares.taxi.diurno.ficha_cada_130m, city.fareRegistry.taxi.diurno.ficha);
  assert.equal(fares.taxi.nocturno.bajada, city.fareRegistry.taxi.nocturno.bajada);
  assert.equal(fares.taxi.nocturno.ficha_cada_130m, city.fareRegistry.taxi.nocturno.ficha);
  assert.equal(fares.remis.diurno.bajada, city.fareRegistry.remis.diurno.bajada);
  assert.equal(fares.remis.nocturno.ficha_cada_130m, city.fareRegistry.remis.nocturno.ficha);
  assert.equal(fares.colectivo.frequent, city.fareRegistry.bus.frequent);
  assert.equal(fares.colectivo.full, city.fareRegistry.bus.full);
  assert.equal(fares.colectivo.effective_from, '2026-05-30');
  assert.equal(city.fareRegistry.bus.effective_from, fares.colectivo.effective_from);
  assert.equal(fares.colectivo.source_url, city.fareRegistry.bus.source_url);
  assert.equal(fares.colectivo.efectivo, null);
  assert.equal(city.fareRegistry.bus.cash, null);
});

test('estimateAuto calculates taxi and remis independently during daytime', () => {
  const result = MobilityEngine.estimateAuto(1, {
    apps: appFixtures(),
    taxi: city.fareRegistry.taxi,
    remis: city.fareRegistry.remis
  }, 12);

  assert.equal(result.taxiPrice, 3043);
  assert.equal(result.taxiappPrice, 3043);
  assert.equal(result.remisPrice, 2720);
  assert.notEqual(result.remisPrice, result.taxiPrice);
});

test('estimateAuto calculates taxi and remis independently at night', () => {
  const result = MobilityEngine.estimateAuto(1, {
    apps: appFixtures(),
    taxi: city.fareRegistry.taxi,
    remis: city.fareRegistry.remis
  }, 23);

  assert.equal(result.taxiPrice, 3500);
  assert.equal(result.taxiappPrice, 3500);
  assert.equal(result.remisPrice, 3128);
});

test('legacy city profiles without a remis registry retain the taxi fallback', () => {
  const result = MobilityEngine.estimateAuto(1, {
    apps: appFixtures(),
    taxi: city.fareRegistry.taxi
  }, 12);

  assert.equal(result.remisPrice, result.taxiPrice);
});

test('dynamic app estimates are explicitly marked stale and never labelled municipal', () => {
  for (const provider of ['uber', 'didi', 'maxim']) {
    assert.equal(fares[provider].status, 'stale_estimate');
    assert.doesNotMatch(fares[provider].source, /Resolución|Decreto|Municipalidad/i);
  }
});

test('service worker rotates the VOY cache after fare engine changes', () => {
  assert.match(serviceWorker, /var CACHE = 'voy-v7-8-fares-1';/);
  assert.doesNotMatch(serviceWorker, /voy-v7-8-security-1/);
});
