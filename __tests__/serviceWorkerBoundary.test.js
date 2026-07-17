/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadServiceWorker(overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  const listeners = {};
  const deleted = [];
  const cacheEntries = new Map();
  const currentCache = {
    async match(request) { return cacheEntries.get(typeof request === 'string' ? request : request.url); },
    async put(request, response) {
      if (overrides.putRejects) throw new Error('quota exceeded');
      cacheEntries.set(typeof request === 'string' ? request : request.url, response);
    }
  };
  const caches = {
    async keys() {
      return overrides.keys || [
        'voy-v7-8',
        'voy-v7-8-security-1',
        'voy-v7-8-fares-1',
        'shared-map-cache'
      ];
    },
    async delete(key) { deleted.push(key); return true; },
    async open() { return currentCache; },
    async match(request) { return currentCache.match(request); }
  };
  let claimed = 0;
  const context = vm.createContext({
    URL,
    Request,
    Response,
    Headers,
    Date,
    Promise,
    console,
    caches,
    fetch: overrides.fetch || (async () => new Response('network', {
      status: 200,
      headers: { 'Content-Type': 'text/plain', Date: new Date().toUTCString() }
    })),
    self: {
      location: { origin: 'https://voy.test' },
      clients: { async claim() { claimed += 1; } },
      async skipWaiting() {},
      addEventListener(type, listener) { listeners[type] = listener; }
    }
  });
  vm.runInContext(source, context, { filename: 'sw.js' });
  return { listeners, deleted, cacheEntries, caches, get claimed() { return claimed; } };
}

async function dispatchLifecycle(listener) {
  let completion;
  listener({ waitUntil(promise) { completion = Promise.resolve(promise); } });
  assert.ok(completion, 'lifecycle handler must call waitUntil');
  await completion;
}

test('activation deletes only obsolete VOY caches and preserves unrelated/current caches', async () => {
  const runtime = loadServiceWorker();
  await dispatchLifecycle(runtime.listeners.activate);

  assert.deepEqual(runtime.deleted, ['voy-v7-8', 'voy-v7-8-security-1']);
  assert.equal(runtime.claimed, 1);
});

test('all same-origin API requests pass through without respondWith', () => {
  const runtime = loadServiceWorker();
  for (const [method, pathname] of [['POST', '/api/estimate'], ['POST', '/api/events'], ['GET', '/api/health']]) {
    let responded = false;
    runtime.listeners.fetch({
      request: new Request(`https://voy.test${pathname}`, { method }),
      respondWith() { responded = true; },
      waitUntil() {}
    });
    assert.equal(responded, false, `${method} ${pathname} must remain network-owned`);
  }
});

test('the residual IndexedDB estimate fallback is absent', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
  assert.doesNotMatch(source, /ESTIMATE_PATH/);
  assert.doesNotMatch(source, /_readLocalHistory/);
  assert.doesNotMatch(source, /indexedDB\.open\(['"]voy-history/);
});

test('static asset caching remains operational when storage quota rejects a write', async () => {
  const runtime = loadServiceWorker({ putRejects: true });
  let responsePromise;
  runtime.listeners.fetch({
    request: new Request('https://voy.test/core/mobilityEngine.js'),
    respondWith(promise) { responsePromise = Promise.resolve(promise); },
    waitUntil() {}
  });

  assert.ok(responsePromise);
  const response = await responsePromise;
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'network');
});

test('stale tile revalidation is attached to event.waitUntil', async () => {
  const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toUTCString();
  const runtime = loadServiceWorker();
  const tileUrl = 'https://a.basemaps.cartocdn.com/light_all/1/1/1.png';
  runtime.cacheEntries.set(tileUrl, new Response('cached-tile', { headers: { Date: oldDate } }));
  let responsePromise;
  let background;
  runtime.listeners.fetch({
    request: new Request(tileUrl),
    respondWith(promise) { responsePromise = Promise.resolve(promise); },
    waitUntil(promise) { background = Promise.resolve(promise); }
  });

  const response = await responsePromise;
  assert.equal(await response.text(), 'cached-tile');
  assert.ok(background, 'stale tile refresh must be lifecycle-bound');
  await background;
});
