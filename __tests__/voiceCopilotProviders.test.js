/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const providersPromise = import('../voiceCopilotProviders.mjs');
const contractsPromise = import('../voiceCopilotContracts.mjs');

describe('Voice Copilot provider adapters', () => {
  test('normalizes Workers AI and OpenAI-compatible tool calls', async () => {
    const providers = await providersPromise;
    assert.deepEqual(providers.normalizeToolCalls({
      tool_calls: [{ id: 'one', name: 'get_current_city', arguments: {} }]
    }), [{ id: 'one', name: 'get_current_city', arguments: {} }]);
    assert.deepEqual(providers.normalizeToolCalls({
      choices: [{ message: { tool_calls: [{ id: 'two', function: { name: 'search_destination', arguments: '{"query":"Terminal"}' } }] } }]
    }), [{ id: 'two', name: 'search_destination', arguments: { query: 'Terminal' } }]);
  });

  test('Workers AI LLM adapter returns bounded plan and narration', async () => {
    const providers = await providersPromise;
    const contracts = await contractsPromise;
    const calls = [];
    const ai = {
      async run(model, input) {
        calls.push({ model, input });
        if (calls.length === 1) {
          return { tool_calls: [{ name: 'get_current_city', arguments: {} }], usage: { total_tokens: 12 } };
        }
        return { response: 'La ciudad activa es Santa Fe.' };
      }
    };
    const provider = new providers.WorkersAILlmProvider(ai);
    const plan = await provider.plan([{ role: 'user', content: '¿Dónde estoy?' }], contracts.TOOL_DEFINITIONS);
    assert.equal(plan.tool_calls[0].name, 'get_current_city');
    const narration = await provider.narrate([{ role: 'user', content: '¿Dónde estoy?' }], plan.tool_calls[0], { city_id: 'santafe' });
    assert.equal(narration.text, 'La ciudad activa es Santa Fe.');
    assert.equal(calls[0].model, contracts.VOICE_MODELS.llm);
  });

  test('Workers AI STT adapter rejects empty or oversized audio', async () => {
    const providers = await providersPromise;
    const contracts = await contractsPromise;
    const provider = new providers.WorkersAISttProvider({ run: async () => ({ text: 'hola' }) });
    await assert.rejects(provider.transcribe(new Uint8Array()), /audio_size_invalid/);
    await assert.rejects(provider.transcribe(new Uint8Array(contracts.VOICE_LIMITS.maxAudioBytes + 1)), /audio_size_invalid/);
  });

  test('Workers AI STT adapter returns transcript without storage', async () => {
    const providers = await providersPromise;
    const contracts = await contractsPromise;
    let observed;
    const provider = new providers.WorkersAISttProvider({
      async run(model, input) {
        observed = { model, input };
        return { text: 'Hola VOY, quiero ir a la terminal.', word_count: 8 };
      }
    });
    const transcript = await provider.transcribe(new Uint8Array([82, 73, 70, 70]), { language: 'es' });
    assert.equal(transcript.text, 'Hola VOY, quiero ir a la terminal.');
    assert.equal(observed.model, contracts.VOICE_MODELS.stt);
    assert.equal(observed.input.language, 'es');
    assert.equal(typeof observed.input.audio, 'string');
  });
});
