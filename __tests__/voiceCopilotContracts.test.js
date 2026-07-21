/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const contractsPromise = import('../voiceCopilotContracts.mjs');

function validSession(contracts, overrides = {}) {
  const now = Date.now();
  return {
    ...contracts.newSession('santafe', now),
    ...overrides
  };
}

describe('Voice Copilot closed contracts', () => {
  test('declares exact providers, states and closed tool allowlist', async () => {
    const contracts = await contractsPromise;
    assert.equal(contracts.VOICE_MODELS.stt, '@cf/openai/whisper-large-v3-turbo');
    assert.equal(contracts.VOICE_MODELS.llm, '@cf/qwen/qwen3-30b-a3b-fp8');
    assert.equal(contracts.VOICE_MODELS.tts, 'browser:speechSynthesis');
    assert.equal(contracts.TOOL_NAMES.length, 15);
    assert.ok(contracts.TOOL_NAMES.includes('prepare_external_provider_action'));
    assert.ok(contracts.PROHIBITED_TOOL_NAMES.includes('arbitrary_fetch'));
    assert.ok(contracts.VOICE_STATES.includes('awaiting_confirmation'));
  });

  test('rejects unknown tools and unknown arguments', async () => {
    const contracts = await contractsPromise;
    assert.throws(() => contracts.validateToolCall('arbitrary_fetch', {}), /unknown_tool/);
    assert.throws(() => contracts.validateToolCall('get_current_city', { url: 'https://example.com' }), /unknown_tool_argument/);
    assert.throws(() => contracts.validateToolCall('search_destination', { query: 'Terminal', extra: true }), /invalid_search_destination_args/);
  });

  test('accepts strict destination and provider arguments', async () => {
    const contracts = await contractsPromise;
    assert.deepEqual(contracts.validateToolCall('search_destination', { query: '  Terminal   de ómnibus ' }), { query: 'Terminal de ómnibus' });
    assert.deepEqual(contracts.validateToolCall('prepare_external_provider_action', { provider: 'uber' }), { provider: 'uber' });
  });

  test('enforces session expiry, turn and inference limits', async () => {
    const contracts = await contractsPromise;
    const now = Date.now();
    assert.throws(() => contracts.validateSession(validSession(contracts, { expires_at: now - 1 }), now), /session_expired_or_invalid/);
    assert.throws(() => contracts.validateSession(validSession(contracts, { turn_count: contracts.VOICE_LIMITS.maxTurns }), now), /session_turn_limit/);
    assert.throws(() => contracts.validateSession(validSession(contracts, { inference_count: contracts.VOICE_LIMITS.maxSessionInference }), now), /session_inference_limit/);
  });

  test('rejects unknown session and chat keys', async () => {
    const contracts = await contractsPromise;
    const session = validSession(contracts);
    assert.throws(() => contracts.validateSession({ ...session, secret: 'x' }), /invalid_session_shape/);
    assert.throws(() => contracts.validateChatPayload({ message: 'hola', request_id: 'r1', session, raw_prompt: 'x' }), /invalid_chat_payload/);
  });

  test('minimizes place references and removes exact coordinates', async () => {
    const contracts = await contractsPromise;
    const place = contracts.sanitizePlaceRef({
      canonicalId: 'santafe:landmark:terminal',
      name: 'Terminal',
      address: 'Belgrano 2910',
      source: 'local',
      cityId: 'santafe',
      lat: -31.6435,
      lon: -60.7011
    });
    assert.deepEqual(Object.keys(place).sort(), ['address', 'city_id', 'name', 'ref', 'source']);
    assert.equal('lat' in place, false);
    assert.equal('lon' in place, false);
  });

  test('emits typed bounded events', async () => {
    const contracts = await contractsPromise;
    const event = contracts.makeEvent('tool_completed', 'request-1', 3, { tool: 'get_current_city' });
    assert.equal(event.type, 'tool_completed');
    assert.equal(event.request_id, 'request-1');
    assert.equal(event.sequence, 3);
    assert.throws(() => contracts.makeEvent('repository_changed', 'r', 1), /unknown_event/);
  });
});
