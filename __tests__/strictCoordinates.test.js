/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const DestinationResolver = require('../public/core/destinationResolver.js');

function loadWorkerCoordinateParser() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
    .replace('export class NominatimCoordinator', 'class NominatimCoordinator')
    .replace(/export default worker;/, 'globalThis.__parseCoordinate = _parseValidCoordinateValue;');
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, Headers, TextEncoder, Uint8Array,
    AbortController, crypto, console, setTimeout, clearTimeout,
    fetch: async () => new Response('[]'),
    caches: { default: { async match() {}, async put() {} } }
  });
  vm.runInContext(source, context, { filename: 'worker.js' });
  return context.__parseCoordinate;
}

const invalidValues = [null, undefined, '', '   ', true, false, [], [0], {}, NaN, Infinity, -Infinity, 'abc', '1e3', '--1'];

test('worker coordinate parser rejects coercive values and accepts finite decimal zero forms', () => {
  const parse = loadWorkerCoordinateParser();
  for (const value of invalidValues) {
    assert.equal(parse(value), null, `expected invalid coordinate: ${String(value)}`);
  }

  assert.equal(parse(0), 0);
  assert.equal(Object.is(parse(-0), -0), true);
  assert.equal(parse('0'), 0);
  assert.equal(Object.is(parse('-0'), -0), true);
  assert.equal(parse('-31.6325'), -31.6325);
  assert.equal(parse('+.5'), 0.5);
  assert.equal(parse('60.7000'), 60.7);
});

test('canonical resolver rejects malformed coordinate types without Number coercion', () => {
  for (const value of invalidValues) {
    const candidate = DestinationResolver.toCanonicalCandidate({ name: 'Parada', lat: value, lon: -60.7 }, 'curated', 'santafe');
    assert.equal(candidate.lat, null, `expected canonical rejection for: ${String(value)}`);
    assert.equal(DestinationResolver.validateCandidate(candidate, { allowOutside: true }).valid, false);
  }

  const zero = DestinationResolver.toCanonicalCandidate({ name: 'Origen cero', lat: '0', lon: '-0' }, 'curated', '_default');
  assert.equal(zero.lat, 0);
  assert.equal(Object.is(zero.lon, -0), true);
  assert.equal(DestinationResolver.validateCandidate(zero, { allowOutside: true }).valid, true);
});

test('all local ranking paths exclude empty identity and malformed coordinates', () => {
  const candidates = [
    DestinationResolver.toCanonicalCandidate({ name: 'Terminal', lat: -31.64, lon: -60.7, type: 'bus' }, 'curated', 'santafe'),
    DestinationResolver.toCanonicalCandidate({ name: 'Terminal inválida', lat: '', lon: -60.7, type: 'bus' }, 'curated', 'santafe'),
    DestinationResolver.toCanonicalCandidate({ name: 'Terminal booleana', lat: true, lon: false, type: 'bus' }, 'curated', 'santafe'),
    DestinationResolver.toCanonicalCandidate({ name: '', lat: -31.64, lon: -60.7, type: 'bike' }, 'curated', 'santafe')
  ];
  const ranked = DestinationResolver.rankCandidates('Terminal', candidates, {
    bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 }
  });

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].name, 'Terminal');
  assert.equal(ranked[0].type, 'bus');
});
