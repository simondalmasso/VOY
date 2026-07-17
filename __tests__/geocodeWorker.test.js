/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const Resolver = require('../public/core/destinationResolver.js');

function loadWorker(fetchImpl, cryptoImpl = crypto) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
    .replace('export class NominatimCoordinator', 'class NominatimCoordinator')
    .replace(/export default worker;/, 'globalThis.__worker = worker; globalThis.__NominatimCoordinator = NominatimCoordinator; globalThis.__geocodeClients = _geocodeClients; globalThis.__geocodeRateAllowed = _geocodeRateAllowed; globalThis.__geocodeClientsMax = GEOCODE_CLIENTS_MAX;');
  const stored = new Map();
  const cache = {
    async match(request) { const response = stored.get(request.url); return response ? response.clone() : undefined; },
    async put(request, response) { stored.set(request.url, response.clone()); }
  };
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, Headers, TextEncoder, Uint8Array, AbortController,
    crypto: cryptoImpl, console, setTimeout, clearTimeout, fetch: fetchImpl, caches: { default: cache }
  });
  vm.runInContext(source, context, { filename: 'worker.js' });
  const durableData = new Map();
  const storage = {
    async get(key) { return durableData.get(key); },
    async put(key, value) { durableData.set(key, structuredClone(value)); },
    async delete(key) { durableData.delete(key); }
  };
  let now = 0;
  const coordinator = new context.__NominatimCoordinator({ storage }, { __fetch: fetchImpl, __clock: () => now, __sleep: async ms => { now += ms; } });
  const env = {
    NOMINATIM_COORDINATOR: {
      idFromName(name) { assert.equal(name, 'nominatim-global'); return name; },
      get() { return { fetch: (url, options) => coordinator.fetch(new Request(url, options)) }; }
    }
  };
  return { worker: context.__worker, cache, env, storage, durableData, Coordinator: context.__NominatimCoordinator, clients: context.__geocodeClients, rateAllowed: context.__geocodeRateAllowed, clientsMax: context.__geocodeClientsMax };
}

function realisticAddress(overrides = {}) {
  return {
    display_name: '1150, Bulevar Gálvez, Santa Fe, La Capital, Santa Fe, Argentina',
    lat: '-31.639764', lon: '-60.682736', osm_type: 'node', osm_id: 123456,
    category: 'place', type: 'house', importance: 0.05,
    address: { house_number: '1150', road: 'Bulevar Gálvez', city: 'Santa Fe', state: 'Santa Fe', country: 'Argentina', country_code: 'ar' },
    namedetails: {}, ...overrides
  };
}

function providerResult(overrides = {}) {
  return {
    display_name: 'San Martín 2000, Santa Fe, La Capital, Argentina', name: 'San Martín 2000',
    lat: '-31.633', lon: '-60.701', osm_type: 'node', osm_id: 42, type: 'house',
    importance: 0.7, address: { house_number: '2000', city: 'Santa Fe' }, ...overrides
  };
}

test('geocode endpoint normalizes query, applies territorial provider parameters and returns canonical candidates', async () => {
  const calls = [];
  const { worker, env } = loadWorker(async (url, options) => {
    calls.push({ url: new URL(url), options });
    return new Response(JSON.stringify([providerResult()]), { status: 200 });
  });
  const response = await worker.fetch(new Request('https://voy.test/api/geocode?q=%20%20San%20%20Mart%C3%ADn%202000%20&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.1' } }), env, { waitUntil() {} });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.query, 'San Martín 2000');
  assert.equal(body.results[0].canonicalId, 'osm:node:42');
  assert.equal(body.results[0].precision, 'house');
  assert.equal(calls[0].url.searchParams.get('countrycodes'), 'ar');
  assert.equal(calls[0].url.searchParams.get('bounded'), '1');
  assert.equal(calls[0].url.searchParams.get('addressdetails'), '1');
  assert.equal(calls[0].url.searchParams.get('namedetails'), '1');
  assert.match(calls[0].options.headers['User-Agent'], /VOY/);
});

test('geocode cache prevents a repeated upstream request', async () => {
  let calls = 0;
  const { worker, env } = loadWorker(async () => { calls += 1; return new Response(JSON.stringify([providerResult()])); });
  const request = () => new Request('https://voy.test/api/geocode?q=Hospital%20Cullen&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.2' } });
  const context = { waitUntil(promise) { return promise; } };
  assert.equal((await worker.fetch(request(), env, context)).status, 200);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal((await worker.fetch(request(), env, context)).status, 200);
  assert.equal(calls, 1);
});

test('geocode endpoint rejects short queries and rate limits a client', async () => {
  const { worker, env } = loadWorker(async () => new Response(JSON.stringify([providerResult()])));
  assert.equal((await worker.fetch(new Request('https://voy.test/api/geocode?q=x&city=santafe'), env, {})).status, 400);
  let last;
  for (let index = 0; index < 21; index += 1) {
    last = await worker.fetch(new Request(`https://voy.test/api/geocode?q=Terminal%20${index}&city=santafe`, { headers: { 'cf-connecting-ip': '192.0.2.3' } }), env, { waitUntil() {} });
  }
  assert.equal(last.status, 429);
});

test('configured fallback provider is used after a primary provider failure', async () => {
  const calls = [];
  const { worker, env } = loadWorker(async url => {
    calls.push(String(url));
    if (String(url).startsWith('https://primary.example/')) return new Response('unavailable', { status: 503 });
    return new Response(JSON.stringify([providerResult()]));
  });
  Object.assign(env, { VOY_GEOCODE_PROVIDER: 'configurable', VOY_GEOCODE_PROVIDER_URL: 'https://primary.example/search', VOY_GEOCODE_FALLBACK_URL: 'https://fallback.example/search' });
  const response = await worker.fetch(new Request('https://voy.test/api/geocode?q=Bv.%20G%C3%A1lvez%201150&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.4' } }), env, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].startsWith('https://fallback.example/'));
});

test('territorial search filters malformed and outside-city provider results', async () => {
  const { worker, env } = loadWorker(async () => new Response(JSON.stringify([
    providerResult(), providerResult({ osm_id: 2, lat: '-34.6', lon: '-58.4' }), providerResult({ osm_id: 3, lat: 'bad' })
  ])));
  const response = await worker.fetch(new Request('https://voy.test/api/geocode?q=San%20Mart%C3%ADn&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.5' } }), env, { waitUntil() {} });
  const body = await response.json();
  assert.equal(body.results.length, 1);
});

test('realistic Nominatim house shape maps structurally and resolves boulevard variants independent of importance', async () => {
  const { worker, env } = loadWorker(async () => new Response(JSON.stringify([realisticAddress()])));
  const response = await worker.fetch(new Request('https://voy.test/api/geocode?q=Bv.%20G%C3%A1lvez%201150&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.20' } }), env, { waitUntil() {} });
  const candidate = (await response.json()).results[0];
  assert.deepEqual({ name: candidate.name, address: candidate.address, houseNumber: candidate.houseNumber, road: candidate.road, city: candidate.city, state: candidate.state, countryCode: candidate.countryCode }, {
    name: 'Bulevar Gálvez 1150', address: 'Bulevar Gálvez 1150, Santa Fe, Santa Fe', houseNumber: '1150', road: 'Bulevar Gálvez', city: 'Santa Fe', state: 'Santa Fe', countryCode: 'ar'
  });
  for (const query of ['Bv. Gálvez 1150', 'Bulevar Gálvez 1150', 'Bv Gálvez 1150']) {
    assert.equal(Resolver.resolve(query, [candidate], { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } }).status, 'resolved', query);
  }
  assert.notEqual(Resolver.resolve('Bv. Gálvez 1151', [candidate], { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } }).status, 'resolved');
  assert.notEqual(Resolver.resolve('Bv. Pellegrini 1150', [candidate], { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } }).status, 'resolved');
});

test('house without structured number is not exact and close distinct OSM addresses require choice', async () => {
  const { worker, env } = loadWorker(async () => new Response(JSON.stringify([
    realisticAddress({ osm_id: 1, address: { road: 'Bulevar Gálvez', city: 'Santa Fe', state: 'Santa Fe', country_code: 'ar' } }),
    realisticAddress({ osm_id: 2, lon: '-60.68270' }),
    realisticAddress({ osm_id: 3, lon: '-60.68265' })
  ])));
  const response = await worker.fetch(new Request('https://voy.test/api/geocode?q=Bv.%20G%C3%A1lvez%201150&city=santafe', { headers: { 'cf-connecting-ip': '192.0.2.21' } }), env, { waitUntil() {} });
  const candidates = (await response.json()).results;
  const options = { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } };
  assert.equal(Resolver.structuredAddressMatch('Bv. Gálvez 1150', candidates[0]), false);
  assert.notEqual(Resolver.resolve('Bv. Gálvez 1150', [candidates[0]], options).status, 'resolved');
  assert.equal(Resolver.resolve('Bv. Gálvez 1150', candidates.slice(1), options).status, 'choose');
});

test('client rate map hashes keys, isolates clients, prunes expired windows and resets them', async () => {
  const { clients, rateAllowed } = loadWorker(async () => new Response('[]'));
  const requestA = new Request('https://voy.test/', { headers: { 'cf-connecting-ip': '192.0.2.31' } });
  const requestB = new Request('https://voy.test/', { headers: { 'cf-connecting-ip': '192.0.2.32' } });
  assert.equal(await rateAllowed(requestA), true);
  assert.equal(await rateAllowed(requestB), true);
  assert.equal(clients.size, 2);
  assert.ok([...clients.keys()].every(key => !key.includes('192.0.2.')));
  for (const entry of clients.values()) entry.startedAt = Date.now() - 60001;
  assert.equal(await rateAllowed(requestA), true);
  assert.equal(clients.size, 1);
  assert.equal([...clients.values()][0].count, 1);
});

test('geocode client salt is initialized lazily once per isolate and never stores raw IP keys', async () => {
  let randomUUIDCalls = 0;
  const cryptoImpl = {
    subtle: crypto.subtle,
    randomUUID() {
      randomUUIDCalls += 1;
      return '11111111-1111-4111-8111-111111111111';
    }
  };
  const { clients, rateAllowed } = loadWorker(async () => new Response('[]'), cryptoImpl);
  assert.equal(randomUUIDCalls, 0);
  const firstIp = '192.0.2.41';
  const secondIp = '192.0.2.42';
  assert.equal(await rateAllowed(new Request('https://voy.test/', { headers: { 'cf-connecting-ip': firstIp } })), true);
  assert.equal(randomUUIDCalls, 1);
  assert.equal(await rateAllowed(new Request('https://voy.test/', { headers: { 'cf-connecting-ip': secondIp } })), true);
  assert.equal(randomUUIDCalls, 1);
  assert.equal(clients.size, 2);
  assert.equal(new Set(clients.keys()).size, 2);
  assert.ok([...clients.keys()].every(key => key !== firstIp && key !== secondIp && !key.includes('192.0.2.')));
});

test('client rate map has an explicit maximum and rejects new clients after deterministic pruning', async () => {
  const { clients, rateAllowed, clientsMax } = loadWorker(async () => new Response('[]'));
  const now = Date.now();
  for (let index = 0; index < clientsMax; index += 1) clients.set('hash-' + index, { startedAt: now, count: 1 });
  const allowed = await rateAllowed(new Request('https://voy.test/', { headers: { 'cf-connecting-ip': '198.51.100.10' } }));
  assert.equal(allowed, false);
  assert.equal(clients.size, clientsMax);
});
