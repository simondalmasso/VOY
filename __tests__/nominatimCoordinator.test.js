/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadCoordinator() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
    .replace('export class NominatimCoordinator', 'class NominatimCoordinator')
    .replace(/export default worker;/, 'globalThis.__Coordinator = NominatimCoordinator;');
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, Headers, TextEncoder, Uint8Array,
    AbortController, crypto, console, setTimeout, clearTimeout, fetch: async () => new Response('[]'),
    caches: { default: { async match() {}, async put() {} } }
  });
  vm.runInContext(source, context, { filename: 'worker.js' });
  return context.__Coordinator;
}

const Coordinator = loadCoordinator();

function storageHarness(seed) {
  const data = seed || new Map();
  return {
    data,
    storage: {
      async get(key) { return data.get(key); },
      async put(key, value) { data.set(key, structuredClone(value)); },
      async delete(key) { data.delete(key); }
    }
  };
}

function providerResult(id = 1) {
  return { display_name: 'Lugar, Santa Fe, Argentina', name: 'Lugar', lat: '-31.63', lon: '-60.70', osm_type: 'node', osm_id: id, type: 'poi', importance: 0.8 };
}

function payload(query = 'Lugar', suffix = 'lugar') {
  return {
    cacheIdentity: `v2|nominatim|santafe|bounded|${suffix}`,
    query, cityId: 'santafe', wide: false, provider: 'nominatim',
    providerBase: 'https://provider.test/search', fallbackBase: ''
  };
}

function request(body) {
  return new Request('https://coordinator.test/geocode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

function createHarness(options = {}) {
  const durable = storageHarness(options.data);
  let now = options.now || 0;
  const starts = [];
  let fetchCalls = 0;
  const fetchImpl = options.fetchImpl || (async () => {
    fetchCalls += 1;
    starts.push(now);
    return new Response(JSON.stringify([providerResult(fetchCalls)]));
  });
  const env = {
    __clock: () => now,
    __sleep: async ms => { now += ms; },
    __fetch: fetchImpl
  };
  const coordinator = new Coordinator({ storage: durable.storage }, env);
  return {
    coordinator, data: durable.data, starts,
    get fetchCalls() { return fetchCalls; },
    setNow(value) { now = value; },
    getNow() { return now; },
    recreate() { return new Coordinator({ storage: durable.storage }, env); }
  };
}

test('concurrent distinct requests serialize with at least 1100ms between upstream starts', async () => {
  const harness = createHarness();
  const [first, second] = await Promise.all([
    harness.coordinator.fetch(request(payload('Lugar A', 'a'))),
    harness.coordinator.fetch(request(payload('Lugar B', 'b')))
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.deepEqual(harness.starts, [0, 1100]);
  assert.ok(harness.starts[1] - harness.starts[0] >= 1100);
});

test('identical concurrent queries produce exactly one upstream fetch', async () => {
  const harness = createHarness();
  const [first, second] = await Promise.all([
    harness.coordinator.fetch(request(payload())),
    harness.coordinator.fetch(request(payload()))
  ]);
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(harness.fetchCalls, 1);
});

test('durable cache hit skips upstream and expired cache refreshes it', async () => {
  const harness = createHarness();
  await harness.coordinator.fetch(request(payload()));
  assert.equal(harness.fetchCalls, 1);
  await harness.coordinator.fetch(request(payload()));
  assert.equal(harness.fetchCalls, 1);
  harness.setNow(24 * 60 * 60 * 1000 + 1);
  await harness.coordinator.fetch(request(payload()));
  assert.equal(harness.fetchCalls, 2);
});

test('cache and nextAllowedAt persist after coordinator instance recreation', async () => {
  const harness = createHarness();
  await harness.coordinator.fetch(request(payload()));
  const recreated = harness.recreate();
  const response = await recreated.fetch(request(payload()));
  assert.equal(response.status, 200);
  assert.equal(harness.fetchCalls, 1);
  assert.equal(harness.data.get('nextAllowedAt'), 1100);
});

test('upstream error does not contaminate cache and later retry is allowed', async () => {
  let calls = 0;
  const harness = createHarness({ fetchImpl: async () => {
    calls += 1;
    return calls === 1 ? new Response('failure', { status: 500 }) : new Response(JSON.stringify([providerResult()]));
  } });
  assert.equal((await harness.coordinator.fetch(request(payload()))).status, 502);
  assert.equal([...harness.data.keys()].some(key => key.startsWith('cache:')), false);
  assert.equal((await harness.coordinator.fetch(request(payload()))).status, 200);
  assert.equal(calls, 2);
  assert.equal(harness.data.has('cache:' + payload().cacheIdentity), true);
});

test('different query uses the same persisted global rate window', async () => {
  const harness = createHarness();
  await harness.coordinator.fetch(request(payload('A', 'a')));
  const recreated = harness.recreate();
  await recreated.fetch(request(payload('B', 'b')));
  assert.deepEqual(harness.starts, [0, 1100]);
});

test('storage excludes IP, GPS origin, cookies and user identifiers', async () => {
  const harness = createHarness();
  await harness.coordinator.fetch(request({
    ...payload(), ip: '203.0.113.99', origin: { lat: -31.6, lon: -60.7 }, cookie: 'voy_sid=private', userId: 'person-1'
  }));
  const persisted = JSON.stringify([...harness.data.entries()]);
  assert.doesNotMatch(persisted, /203\.0\.113\.99|voy_sid|person-1|"origin"/);
});

test('excessive persisted wait returns structured 503 with Retry-After', async () => {
  const data = new Map([['nextAllowedAt', 20000]]);
  const harness = createHarness({ data });
  const response = await harness.coordinator.fetch(request(payload()));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('Retry-After'), '20');
  assert.deepEqual(await response.json(), { error: 'coordinator_busy', results: [] });
  assert.equal(harness.fetchCalls, 0);
});

test('queue overflow returns structured 503 without starting another upstream call', async () => {
  let release;
  let calls = 0;
  const harness = createHarness({ fetchImpl: async () => {
    calls += 1;
    return new Promise(resolve => { release = resolve; });
  } });
  const queued = Array.from({ length: 10 }, () => harness.coordinator.fetch(request(payload())));
  while (!release) await Promise.resolve();
  const overflow = await harness.coordinator.fetch(request(payload()));
  assert.equal(overflow.status, 503);
  assert.equal(overflow.headers.get('Retry-After'), '2');
  assert.deepEqual(await overflow.json(), { error: 'coordinator_busy', results: [] });
  assert.equal(calls, 1);
  release(new Response(JSON.stringify([providerResult()])));
  const completed = await Promise.all(queued);
  assert.ok(completed.every(response => response.status === 200));
  assert.equal(calls, 1);
});
