/* eslint-disable @typescript-eslint/no-require-imports */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const utilsPromise = import('../voiceCopilotApiUtils.mjs');
const entryPromise = import('../worker-entry.js');

function request(ip = '198.51.100.42') {
  return new Request('https://voy.test/api/voice/chat', { headers: { 'cf-connecting-ip': ip } });
}

function storage() {
  const values = new Map();
  return {
    async get(key) { return values.get(key); },
    async put(key, value) { values.set(key, structuredClone(value)); },
    async delete(key) { values.delete(key); },
    values
  };
}

describe('Issue39 durable Voice quota', () => {
  test('product mode fails closed when the global coordinator binding is absent', async () => {
    const utils = await utilsPromise;
    assert.equal(await utils.voiceRateAllowed(request(), { VOY_VOICE_ENABLED: 'true' }, 'chat', 200), false);
  });

  test('API limiter routes only a hashed client key through the existing singleton coordinator', async () => {
    const utils = await utilsPromise;
    let idName = null;
    let body = null;
    const env = {
      NOMINATIM_COORDINATOR: {
        idFromName(name) { idName = name; return 'singleton'; },
        get() {
          return {
            async fetch(_url, options) {
              body = JSON.parse(options.body);
              return new Response(JSON.stringify({ ok: true, allowed: true, count: 1 }), { status: 200 });
            }
          };
        }
      }
    };
    assert.equal(await utils.voiceRateAllowed(request('203.0.113.7'), env, 'stt', 30), true);
    assert.equal(idName, 'nominatim-global');
    assert.match(body.key, /^[a-f0-9]{24}$/);
    assert.equal(body.kind, 'stt');
    assert.equal(body.limit, 30);
    assert.equal(JSON.stringify(body).includes('203.0.113.7'), false);
  });

  test('durable endpoint counts globally and resets the same bounded key on a new day', async () => {
    const { NominatimCoordinator } = await entryPromise;
    const s = storage();
    const coordinator = new NominatimCoordinator({ storage: s }, {});
    const call = day => coordinator.fetch(new Request('https://nominatim-coordinator.internal/voice-quota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: '0123456789abcdef01234567', kind: 'chat', day, limit: 2 })
    }));
    let response = await call(100);
    let body = await response.json();
    assert.equal(body.allowed, true);
    response = await call(100);
    body = await response.json();
    assert.equal(body.allowed, true);
    response = await call(100);
    body = await response.json();
    assert.equal(body.allowed, false);
    response = await call(101);
    body = await response.json();
    assert.equal(body.allowed, true);
    assert.equal([...s.values.keys()].filter(key => key.startsWith('voice-rate:')).length, 1);
  });
});
