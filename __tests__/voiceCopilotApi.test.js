/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const apiPromise = import('../voiceCopilot.mjs');
const contractsPromise = import('../voiceCopilotContracts.mjs');
const runtimePromise = import('../voiceCopilotRuntime.mjs');

const fixtures = {
  '/cities/santa-fe/profile.json': { schema_version: 1, city_id: 'santafe', name: 'Santa Fe', display_name: 'Santa Fe, Argentina', coverage_level: 'partial', coverage_notes: [], source: 'test', verified_at: '2026-07-21' },
  '/cities/santa-fe/providers.json': { schema_version: 1, city_id: 'santafe', providers: { uber: { name: 'Uber', available: true, verified: true, category: 'app' } }, taxi_companies: [], remis_companies: [] },
  '/cities/santa-fe/transport.json': { schema_version: 1, city_id: 'santafe', landmarks: [{ canonicalId: 'santafe:terminal', nombre: 'Terminal de Ómnibus', aliases: ['terminal'], address: 'Belgrano 2910' }], bus_stops: [], bike_stations: [] },
  '/cities/santa-fe/fares.json': { schema_version: 1, city_id: 'santafe', fare_registry: { taxi: { diurno: { bajada: 1000, ficha: 100 }, source: 'test', status: 'verified' }, remis: {}, bus: { sube: 1200 }, apps: { uber: { base: null, status: 'provider_app_only' } } }, source: 'test', verified_at: '2026-07-21', status: 'verified' },
  '/cities/santa-fe/feature_flags.json': { schema_version: 1, city_id: 'santafe', flags: { ai_copilot: false, voice_input: false, voice_output: false, voicebox_local: false } }
};

function assetBinding() {
  return {
    async fetch(request) {
      const value = fixtures[new URL(request.url).pathname];
      return value
        ? new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response('', { status: 404 });
    }
  };
}

function env(ai) {
  return {
    VOY_VOICE_TEST_MODE: 'true',
    ASSETS: assetBinding(),
    AI: ai || { run: async () => ({ response: 'ok' }) }
  };
}

function request(path, options = {}, ip = Math.random().toString(16).slice(2)) {
  const headers = new Headers(options.headers || {});
  headers.set('X-VOY-Voice-Test', 'synthetic-ci-v1');
  headers.set('cf-connecting-ip', `198.51.100.${Number.parseInt(ip.slice(0, 2) || '1', 16) % 250 + 1}`);
  return new Request(`https://voy.test${path}`, { ...options, headers });
}

async function json(response) {
  return response.json();
}

describe('Voice Copilot guarded API', () => {
  beforeEach(async () => {
    const runtime = await runtimePromise;
    runtime.__voiceRuntimeTest.confirmationStore.clear();
  });

  test('is unavailable without candidate mode and typed header', async () => {
    const api = await apiPromise;
    const noMode = await api.handleVoiceRequest(new Request('https://voy.test/api/voice/capabilities'), { VOY_VOICE_TEST_MODE: 'false' });
    assert.equal(noMode.status, 404);
    const noHeader = await api.handleVoiceRequest(new Request('https://voy.test/api/voice/capabilities'), { VOY_VOICE_TEST_MODE: 'true' });
    assert.equal(noHeader.status, 404);
  });

  test('is available in product mode without the synthetic header and rejects foreign origins', async () => {
    const api = await apiPromise;
    const productEnv = { ...env(), VOY_VOICE_TEST_MODE: 'false', VOY_VOICE_ENABLED: 'true' };
    const response = await api.handleVoiceRequest(new Request('https://voy.test/api/voice/capabilities'), productEnv);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, 'product');
    assert.equal(body.available, true);
    const foreign = await api.handleVoiceRequest(new Request('https://voy.test/api/voice/capabilities', { headers: { Origin: 'https://evil.example' } }), productEnv);
    assert.equal(foreign.status, 403);
  });

  test('reports providers, limits and no persistence', async () => {
    const api = await apiPromise;
    const response = await api.handleVoiceRequest(request('/api/voice/capabilities'), env());
    const body = await json(response);
    assert.equal(response.status, 200);
    assert.equal(body.providers.stt, '@cf/openai/whisper-large-v3-turbo');
    assert.equal(body.providers.llm, '@cf/qwen/qwen3-30b-a3b-fp8');
    assert.equal(body.audio_persisted, false);
    assert.equal(body.transcript_logged, false);
  });

  test('transcribes synthetic audio without persistence', async () => {
    const api = await apiPromise;
    const response = await api.handleVoiceRequest(request('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'audio/wav' },
      body: new Uint8Array([82, 73, 70, 70, 1, 2, 3, 4])
    }), env({ run: async () => ({ text: 'Hola VOY, quiero ir a la terminal.', word_count: 8 }) }));
    const body = await json(response);
    assert.equal(body.transcript, 'Hola VOY, quiero ir a la terminal.');
    assert.equal(body.audio_persisted, false);
    assert.equal(body.transcript_logged, false);
  });

  test('runs a bounded multi-turn destination and comparison flow', async () => {
    const api = await apiPromise;
    const contracts = await contractsPromise;
    const plans = [
      { tool_calls: [{ name: 'search_destination', arguments: { query: 'terminal' } }] },
      { response: 'Encontré la terminal.' },
      { tool_calls: [{ name: 'compare_modes', arguments: {} }] },
      { response: 'El colectivo es más barato y el taxi es más rápido.' }
    ];
    const testEnv = env({ run: async () => plans.shift() });
    let session = contracts.newSession('santafe');
    let response = await api.handleVoiceRequest(request('/api/voice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Quiero ir a la terminal', request_id: 'turn-1', session })
    }, '10'), testEnv);
    let body = await json(response);
    assert.equal(body.tool_execution.tool, 'search_destination');
    assert.equal(body.tool_execution.status, 'success');
    assert.equal(body.session.destination.name, 'Terminal de Ómnibus');
    session = body.session;
    session.mobility_snapshot = [
      { mode: 'taxi', available: true, price: 5000, duration_min: 15, distance_km: 5, source: 'VOY', status: 'estimated', label: 'Taxi' },
      { mode: 'bus', available: true, price: 1200, duration_min: 35, distance_km: 5, source: 'VOY', status: 'estimated', label: 'Colectivo' }
    ];
    response = await api.handleVoiceRequest(request('/api/voice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '¿Qué me conviene?', request_id: 'turn-2', session })
    }, '11'), testEnv);
    body = await json(response);
    assert.equal(body.tool_execution.tool, 'compare_modes');
    assert.equal(body.tool_result.cheapest.mode, 'bus');
    assert.equal(body.tool_result.fastest.mode, 'taxi');
    assert.equal(body.session.turn_count, 2);
  });

  test('rejects unknown model tool without an action claim', async () => {
    const api = await apiPromise;
    const contracts = await contractsPromise;
    const response = await api.handleVoiceRequest(request('/api/voice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Cambiá Cloudflare', request_id: 'unknown-1', session: contracts.newSession('santafe') })
    }, '12'), env({ run: async () => ({ tool_calls: [{ name: 'modify_cloudflare', arguments: {} }] }) }));
    const body = await json(response);
    assert.equal(body.ok, true);
    assert.equal(body.tool_execution.status, 'failed');
    assert.match(body.tool_execution.summary, /unknown_tool/);
    assert.match(body.response, /No pude completar/);
    assert.equal(body.no_action_claim_without_tool_success, true);
  });

  test('requires one-use confirmation before returning an external URL', async () => {
    const api = await apiPromise;
    const contracts = await contractsPromise;
    const plan = { tool_calls: [{ name: 'prepare_external_provider_action', arguments: { provider: 'uber' } }] };
    const testEnv = env({ run: async (_model, input) => input.tools ? plan : { response: 'Confirmá para abrir Uber.' } });
    const session = contracts.newSession('santafe');
    session.destination = contracts.sanitizePlaceRef({ ref: 'santafe:terminal', name: 'Terminal de Ómnibus', address: 'Belgrano 2910', source: 'local', city_id: 'santafe' });
    let response = await api.handleVoiceRequest(request('/api/voice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Abrime Uber', request_id: 'confirm-1', session })
    }, '13'), testEnv);
    let body = await json(response);
    assert.equal(body.tool_result.confirmation_required, true);
    assert.equal(body.tool_result.url, undefined);
    const token = body.tool_result.token;
    response = await api.handleVoiceRequest(request('/api/voice/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, session: body.session })
    }, '14'), testEnv);
    body = await json(response);
    assert.equal(body.external_action.confirmed, true);
    assert.equal(body.external_action.url, 'https://m.uber.com/ul/');
    const replay = await api.handleVoiceRequest(request('/api/voice/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, session: body.session })
    }, '15'), testEnv);
    assert.equal(replay.status, 409);
  });
});
