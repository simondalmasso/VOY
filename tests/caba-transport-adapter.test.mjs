import test from 'node:test';
import assert from 'node:assert/strict';
import { createCabaTransportAdapter, CABA_TRANSPORT_ENDPOINTS } from '../src/caba-transport-adapter.js';

const FAKE_ENV = {
  CABA_TRANSPORT_CLIENT_ID: 'test-client-id-not-real',
  CABA_TRANSPORT_CLIENT_SECRET: 'test-client-secret-not-real'
};

function jsonResponse(data, status = 200) {
  const body = JSON.stringify(data);
  return new Response(body, {
    status,
    headers: { 'content-type': 'application/json', 'content-length': String(new TextEncoder().encode(body).byteLength) }
  });
}

test('CABA adapter fails closed when either credential is missing and makes no request', async () => {
  let calls = 0;
  const fetchImpl = async () => { calls++; return jsonResponse({ entity: [] }); };
  for (const env of [{}, { CABA_TRANSPORT_CLIENT_ID: FAKE_ENV.CABA_TRANSPORT_CLIENT_ID }]) {
    const adapter = createCabaTransportAdapter({ env, fetchImpl });
    assert.equal((await adapter.readBuses()).reason, 'credentials_missing');
    assert.equal((await adapter.readTrains()).reason, 'credentials_missing');
  }
  assert.equal(calls, 0);
});

test('CABA bus endpoint uses simulated credentials without claiming live positions from an empty feed', async () => {
  let requested;
  const adapter = createCabaTransportAdapter({
    env: FAKE_ENV,
    now: () => Date.parse('2026-10-19T12:00:00.000Z'),
    fetchImpl: async (url, init) => {
      requested = { url: new URL(url), init };
      return jsonResponse({ header: { gtfs_realtime_version: '2.0' }, entity: [] });
    }
  });
  const result = await adapter.readBuses();
  assert.equal(requested.url.pathname, CABA_TRANSPORT_ENDPOINTS.buses);
  assert.equal(requested.url.searchParams.get('client_id'), FAKE_ENV.CABA_TRANSPORT_CLIENT_ID);
  assert.equal(requested.url.searchParams.get('client_secret'), FAKE_ENV.CABA_TRANSPORT_CLIENT_SECRET);
  assert.equal(requested.init.method, 'GET');
  assert.equal(result.available, true);
  assert.equal(result.temporal_state, 'unknown');
  assert.equal(result.fetched_at, '2026-10-19T12:00:00.000Z');
  assert.deepEqual(result.data.entity, []);
  assert.equal(result.cache_hit, false);
});

test('CABA train endpoint is independently addressable', async () => {
  let pathname = '';
  const adapter = createCabaTransportAdapter({
    env: FAKE_ENV,
    fetchImpl: async url => {
      pathname = new URL(url).pathname;
      return jsonResponse({ entity: [{ id: 'fixture-only' }] });
    }
  });
  const result = await adapter.readTrains();
  assert.equal(pathname, CABA_TRANSPORT_ENDPOINTS.trains);
  assert.equal(result.available, true);
  assert.equal(result.mode, 'trains');
  assert.equal(result.temporal_state, 'unknown');
});

test('CABA adapter fails closed on HTTP errors, invalid JSON and non-JSON content', async t => {
  await t.test('HTTP error', async () => {
    const adapter = createCabaTransportAdapter({
      env: FAKE_ENV, fetchImpl: async () => jsonResponse({ error: 'denied' }, 401)
    });
    assert.equal((await adapter.readBuses()).reason, 'upstream_http_error');
  });
  await t.test('invalid JSON', async () => {
    const adapter = createCabaTransportAdapter({
      env: FAKE_ENV,
      fetchImpl: async () => new Response('{bad', { status: 200, headers: { 'content-type': 'application/json' } })
    });
    assert.equal((await adapter.readTrains()).reason, 'upstream_json_invalid');
  });
  await t.test('wrong content type', async () => {
    const adapter = createCabaTransportAdapter({
      env: FAKE_ENV,
      fetchImpl: async () => new Response('ok', { status: 200, headers: { 'content-type': 'text/plain' } })
    });
    assert.equal((await adapter.readBuses()).reason, 'upstream_content_type_invalid');
  });
});

test('CABA adapter rejects non-allowlisted upstream hosts before network access', () => {
  assert.throws(() => createCabaTransportAdapter({ baseUrl: 'https://attacker.example' }), /not_allowlisted/);
});

test('CABA adapter bounds response size', async () => {
  const adapter = createCabaTransportAdapter({
    env: FAKE_ENV,
    maxResponseBytes: 8,
    fetchImpl: async () => new Response(JSON.stringify({ entity: [] }), {
      status: 200, headers: { 'content-type': 'application/json' }
    })
  });
  assert.equal((await adapter.readBuses()).reason, 'upstream_payload_too_large');
});

test('CABA adapter reports network failure without exposing credentials', async () => {
  const adapter = createCabaTransportAdapter({
    env: FAKE_ENV,
    fetchImpl: async () => { throw new Error('request failed'); }
  });
  const result = await adapter.readTrains();
  assert.deepEqual(result, {
    available: false, source_status: 'unavailable', reason: 'source_unavailable',
    fetched_at: null, temporal_state: 'unknown', data: null
  });
  assert.equal(JSON.stringify(result).includes(FAKE_ENV.CABA_TRANSPORT_CLIENT_SECRET), false);
});
