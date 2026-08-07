/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const htmlPromise = import('../voiceCopilotHtml.mjs');

function pageResponse() {
  return new Response('<!doctype html><html><head><title>VOY</title></head><body>app</body></html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': '82' }
  });
}

describe('Voice candidate HTML injection', () => {
  test('preserves canonical root HTML without the typed candidate header', async () => {
    const { maybeInjectVoiceCopilotHtml } = await htmlPromise;
    const request = new Request('https://voy.test/');
    const response = await maybeInjectVoiceCopilotHtml(request, pageResponse(), { VOY_VOICE_TEST_MODE: 'true' });
    const body = await response.text();
    assert.equal(body.includes('data-voy-voice-copilot'), false);
    assert.match(body, /<title>VOY<\/title>/);
  });

  test('injects the final product UI when Voice is explicitly enabled and AI is bound', async () => {
    const { maybeInjectVoiceCopilotHtml } = await htmlPromise;
    const response = await maybeInjectVoiceCopilotHtml(new Request('https://voy.test/'), pageResponse(), { VOY_VOICE_ENABLED: 'true', AI: {} });
    const body = await response.text();
    assert.match(body, /window\.VOY_VOICE_ENABLED=true/);
    assert.match(body, /window\.VOY_VOICE_TEST_MODE=false/);
    assert.match(body, /voiceCopilot\.js/);
  });

  test('injects candidate UI only with test mode and exact typed header', async () => {
    const { maybeInjectVoiceCopilotHtml } = await htmlPromise;
    const request = new Request('https://voy.test/', {
      headers: { 'X-VOY-Voice-Test': 'synthetic-ci-v1' }
    });
    const response = await maybeInjectVoiceCopilotHtml(request, pageResponse(), { VOY_VOICE_TEST_MODE: 'true' });
    const body = await response.text();
    assert.match(body, /data-voy-voice-copilot/);
    assert.match(body, /\/core\/voiceCopilot\.js\?v=1/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('content-length'), null);
  });

  test('does not inject when runtime test mode is disabled', async () => {
    const { maybeInjectVoiceCopilotHtml } = await htmlPromise;
    const request = new Request('https://voy.test/', {
      headers: { 'X-VOY-Voice-Test': 'synthetic-ci-v1' }
    });
    const response = await maybeInjectVoiceCopilotHtml(request, pageResponse(), { VOY_VOICE_TEST_MODE: 'false' });
    assert.equal((await response.text()).includes('data-voy-voice-copilot'), false);
  });
});
