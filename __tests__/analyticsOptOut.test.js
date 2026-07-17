/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let modulePromise;

function loadBoundary() {
  if (!modulePromise) {
    modulePromise = import(pathToFileURL(path.join(__dirname, '..', 'securityBoundary.mjs')).href);
  }
  return modulePromise;
}

function createBaseWorker() {
  const calls = [];
  return {
    calls,
    async fetch(request) {
      calls.push(request);
      return new Response(JSON.stringify({ ok: true, written: 1 }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

function request(pathname, headers) {
  return new Request(`https://voy.test${pathname}`, {
    method: 'POST',
    headers: {
      Origin: 'https://voy.test',
      'Content-Type': 'application/json',
      ...headers
    },
    body: JSON.stringify({
      events: [{ name: 'search', data: { provider: 'uber' } }],
      event: 'lcp',
      value: 1500,
      route: '/'
    })
  });
}

const signals = [
  ['Sec-GPC', 'global_privacy_control'],
  ['DNT', 'do_not_track'],
  ['X-VOY-Test', 'test_traffic']
];

for (const [header, reason] of signals) {
  test(`${header}: 1 excludes analytics before the base Worker`, async () => {
    const { createSecurityBoundary } = await loadBoundary();
    const base = createBaseWorker();
    const worker = createSecurityBoundary(base);

    for (const pathname of ['/api/events', '/api/telemetry']) {
      const response = await worker.fetch(request(pathname, { [header]: '1' }), {}, {});
      assert.equal(response.status, 202);
      assert.deepEqual(await response.json(), {
        ok: true,
        received: 0,
        written: 0,
        excluded: true,
        reason
      });
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://voy.test');
    }

    assert.equal(base.calls.length, 0);
  });
}

test('privacy signals suppress the analytics session cookie on HTML', async () => {
  const { createSecurityBoundary } = await loadBoundary();

  for (const [header, reason] of signals) {
    const base = {
      async fetch() {
        return new Response('<!doctype html><title>VOY</title>', {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Set-Cookie': 'voy_sid=12345678; Max-Age=86400; SameSite=Lax; Path=/; Secure; HttpOnly'
          }
        });
      }
    };
    const worker = createSecurityBoundary(base);
    const response = await worker.fetch(new Request('https://voy.test/', {
      headers: { [header]: '1' }
    }), {}, {});

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Set-Cookie'), null);
    assert.equal(response.headers.get('X-VOY-Analytics'), `excluded; reason=${reason}`);
  }
});

test('privacy-signal values other than 1 do not bypass schema processing', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);

  const response = await worker.fetch(request('/api/events', {
    'Sec-GPC': '0',
    DNT: '0',
    'X-VOY-Test': 'false'
  }), {}, {});

  assert.equal(response.status, 202);
  assert.equal(base.calls.length, 1);
});

test('preflight advertises privacy and test headers', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const response = await worker.fetch(new Request('https://voy.test/api/events', {
    method: 'OPTIONS',
    headers: { Origin: 'https://voy.test' }
  }), {}, {});

  assert.equal(response.status, 204);
  const headers = response.headers.get('Access-Control-Allow-Headers') || '';
  assert.match(headers, /Sec-GPC/);
  assert.match(headers, /DNT/);
  assert.match(headers, /X-VOY-Test/);
  assert.equal(base.calls.length, 0);
});
