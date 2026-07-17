/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let modulePromise;
function loadBoundary() {
  if (!modulePromise) {
    modulePromise = import(pathToFileURL(path.join(__dirname, '..', 'analyticsOptOutBoundary.mjs')).href);
  }
  return modulePromise;
}

function createBaseWorker() {
  const calls = [];
  return {
    calls,
    scheduled: async () => 'scheduled',
    async fetch(request) {
      calls.push({
        dnt: request.headers.get('DNT'),
        cookie: request.headers.get('Cookie'),
        method: request.method,
        body: request.method === 'POST' ? await request.clone().text() : ''
      });
      return new Response('ok');
    }
  };
}

test('voy_analytics=off maps to an internal DNT signal without changing the request body', async () => {
  const { createAnalyticsOptOutBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createAnalyticsOptOutBoundary(base);
  const body = JSON.stringify({ events: [{ name: 'search' }] });

  const response = await worker.fetch(new Request('https://voy.test/api/events', {
    method: 'POST',
    headers: { Cookie: 'other=1; voy_analytics=off; theme=dark', 'Content-Type': 'application/json' },
    body
  }), {}, {});

  assert.equal(response.status, 200);
  assert.equal(base.calls.length, 1);
  assert.equal(base.calls[0].dnt, '1');
  assert.equal(base.calls[0].body, body);
});

test('other cookie values do not opt out analytics', async () => {
  const { createAnalyticsOptOutBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createAnalyticsOptOutBoundary(base);

  await worker.fetch(new Request('https://voy.test/', {
    headers: { Cookie: 'voy_analytics=on' }
  }), {}, {});

  assert.equal(base.calls[0].dnt, null);
});

test('an existing GPC or DNT signal is preserved', async () => {
  const { createAnalyticsOptOutBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createAnalyticsOptOutBoundary(base);

  await worker.fetch(new Request('https://voy.test/', {
    headers: { Cookie: 'voy_analytics=off', 'Sec-GPC': '1' }
  }), {}, {});
  assert.equal(base.calls[0].dnt, null);

  await worker.fetch(new Request('https://voy.test/', {
    headers: { Cookie: 'voy_analytics=off', DNT: '1' }
  }), {}, {});
  assert.equal(base.calls[1].dnt, '1');
});

test('base Worker lifecycle methods remain available', async () => {
  const { createAnalyticsOptOutBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createAnalyticsOptOutBoundary(base);
  assert.equal(worker.scheduled, base.scheduled);
  assert.equal(await worker.scheduled(), 'scheduled');
});
