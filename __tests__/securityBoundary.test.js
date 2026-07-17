/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let boundaryModule;

async function loadBoundary() {
  if (!boundaryModule) {
    boundaryModule = await import(pathToFileURL(path.join(__dirname, '..', 'securityBoundary.mjs')).href);
  }
  return boundaryModule;
}

function createBaseWorker(handler) {
  const calls = [];
  const scheduled = async () => 'scheduled';
  return {
    calls,
    scheduled,
    async fetch(request, env, ctx) {
      const body = request.method === 'POST' ? await request.clone().json() : null;
      calls.push({ request, env, ctx, body });
      if (handler) return handler(request, body, env, ctx);
      return new Response(JSON.stringify({ ok: true, session_id: 'private-session' }), {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  };
}

function jsonRequest(pathname, body, headers = {}) {
  return new Request(`https://voy.test${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://voy.test', ...headers },
    body: JSON.stringify(body)
  });
}

test('operator diagnostics are closed by default and hidden as 404', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const response = await worker.fetch(new Request('https://voy.test/api/whoami', {
    headers: { 'cf-connecting-ip': '192.0.2.5' }
  }), {}, {});

  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'not_found');
  assert.equal(base.calls.length, 0);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('operator diagnostics require the feature flag and an owner/dev allowlist match', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker(() => new Response(JSON.stringify({ ip: '192.0.2.5' }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  }));
  const worker = createSecurityBoundary(base);
  const request = () => new Request('https://voy.test/api/whoami', {
    headers: { 'cf-connecting-ip': '192.0.2.5' }
  });

  const denied = await worker.fetch(request(), { VOY_OPERATOR_DIAGNOSTICS: 'true' }, {});
  assert.equal(denied.status, 404);
  assert.equal(base.calls.length, 0);

  const allowed = await worker.fetch(request(), {
    VOY_OPERATOR_DIAGNOSTICS: 'true',
    VOY_OWNER_IPS: '192.0.2.5'
  }, {});
  assert.equal(allowed.status, 200);
  assert.equal(base.calls.length, 1);
  assert.equal(allowed.headers.get('Cache-Control'), 'no-store');
});

test('cross-origin analytics writes are rejected before reaching the base Worker', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const response = await worker.fetch(jsonRequest('/api/events', {
    events: [{ name: 'search', data: {} }]
  }, { Origin: 'https://malicious.invalid' }), {}, {});

  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'origin_not_allowed');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal(base.calls.length, 0);
});

test('an explicitly allowlisted origin receives a narrow CORS response', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const origin = 'https://voy.is-a.dev';
  const request = jsonRequest('/api/events', { events: [{ name: 'search', data: {} }] }, { Origin: origin });
  const response = await worker.fetch(request, { VOY_ALLOWED_ORIGINS: origin }, { waitUntil() {} });

  assert.equal(response.status, 202);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
  assert.match(response.headers.get('Vary') || '', /Origin/);
});

test('product analytics are minimized before forwarding and never return the session id', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const response = await worker.fetch(jsonRequest('/api/events', {
    events: [{
      name: 'destination_selected',
      anon_id: 'user-controlled-identifier',
      geo: '-31.632,-60.699 exact',
      ts: 1,
      data: {
        provider: 'Uber',
        mode: 'AUTO',
        price: 4500,
        time_min: 12,
        distance_km: 4.2,
        destination: 'Mi domicilio particular',
        nested: { private: true }
      }
    }]
  }), {}, { waitUntil() {} });

  assert.equal(response.status, 202);
  assert.equal(base.calls.length, 1);
  assert.deepEqual(base.calls[0].body, {
    events: [{
      name: 'destination_selected',
      data: { provider: 'uber', mode: 'auto', price: 4500, time_min: 12, distance_km: 4.2 }
    }]
  });
  const body = await response.json();
  assert.equal(Object.hasOwn(body, 'session_id'), false);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://voy.test');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('analytics request count and byte limits are enforced', async () => {
  const { createSecurityBoundary, securityBoundaryContract } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);

  const tooMany = await worker.fetch(jsonRequest('/api/events', {
    events: Array.from({ length: securityBoundaryContract.maxEventsPerRequest + 1 }, () => ({ name: 'search' }))
  }), {}, {});
  assert.equal(tooMany.status, 400);
  assert.equal((await tooMany.json()).error, 'invalid_events');

  const oversized = new Request('https://voy.test/api/events', {
    method: 'POST',
    headers: { Origin: 'https://voy.test', 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [{ name: 'search', data: { padding: 'x'.repeat(securityBoundaryContract.eventBodyMaxBytes) } }] })
  });
  const largeResponse = await worker.fetch(oversized, {}, {});
  assert.equal(largeResponse.status, 413);
  assert.equal((await largeResponse.json()).error, 'body_too_large');
  assert.equal(base.calls.length, 0);
});

test('telemetry accepts only known events and reduces arbitrary routes to a safe pathname', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);

  const response = await worker.fetch(jsonRequest('/api/telemetry', {
    event: 'js_error',
    value: 1,
    route: 'https://example.invalid/private/address?q=secret',
    message: 'full private error content'
  }), {}, { waitUntil() {} });

  assert.equal(response.status, 202);
  assert.equal(base.calls.length, 1);
  assert.equal(base.calls[0].body.event, 'js_error');
  assert.equal(base.calls[0].body.route, '/');
  assert.equal(base.calls[0].body.value, 1);
  assert.equal(Object.hasOwn(base.calls[0].body, 'message'), false);

  const invalid = await worker.fetch(jsonRequest('/api/telemetry', {
    event: 'address_searched', value: 1, route: '/'
  }), {}, {});
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'invalid_telemetry_event');
});

test('preflight is handled without forwarding a request body', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  const request = new Request('https://voy.test/api/telemetry', {
    method: 'OPTIONS',
    headers: { Origin: 'https://voy.test', 'Access-Control-Request-Method': 'POST' }
  });
  const response = await worker.fetch(request, {}, {});

  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://voy.test');
  assert.equal(base.calls.length, 0);
});

test('HTML receives report-only CSP and a one-day Secure HttpOnly session cookie', async () => {
  const { createSecurityBoundary, securityBoundaryContract } = await loadBoundary();
  const base = createBaseWorker(() => new Response('<!doctype html><title>VOY</title>', {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': 'voy_sid=12345678; Max-Age=2592000; SameSite=Lax; Path=/'
    }
  }));
  const worker = createSecurityBoundary(base);
  const response = await worker.fetch(new Request('https://voy.test/'), {}, {});

  const cookie = response.headers.get('Set-Cookie');
  assert.match(cookie, new RegExp(`Max-Age=${securityBoundaryContract.sessionMaxAgeSeconds}`));
  assert.match(cookie, /Secure/);
  assert.match(cookie, /HttpOnly/);
  assert.doesNotMatch(cookie, /Max-Age=2592000/);
  assert.equal(response.headers.get('Content-Security-Policy-Report-Only'), securityBoundaryContract.cspReportOnly);
  assert.doesNotMatch(securityBoundaryContract.cspReportOnly, /unsafe-eval/);
  assert.equal(response.headers.get('X-Frame-Options'), 'DENY');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('base Worker lifecycle methods remain available through the wrapper', async () => {
  const { createSecurityBoundary } = await loadBoundary();
  const base = createBaseWorker();
  const worker = createSecurityBoundary(base);
  assert.equal(worker.scheduled, base.scheduled);
  assert.equal(await worker.scheduled(), 'scheduled');
});
