/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const contractsPromise = import('../voiceCopilotContracts.mjs');
const dataPromise = import('../voiceCopilotData.mjs');
const conversationPromise = import('../voiceCopilotConversation.mjs');

const bundle = {
  transport: {
    landmarks: [
      { canonicalId: 'santafe:landmark:terminal', nombre: 'Terminal de Ómnibus', aliases: ['terminal'], address: 'Belgrano 2910' }
    ],
    bus_stops: [
      { nombre: 'Terminal', calles: 'Belgrano y Freyre' }
    ],
    bike_stations: []
  }
};

describe('Voice destination selection boundary', () => {
  test('normalizes a leading article without inventing a different place', async () => {
    const data = await dataPromise;
    const matches = data.searchTerritorial(bundle, 'santafe', 'la terminal');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].ref, 'santafe:landmark:terminal');
  });

  test('preserves the model tool name but replaces generated search arguments with bounded user intent', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{
        id: 'model-call',
        name: 'search_destination',
        arguments: { query: 'Terminal de larga distancia de Santa Fe inventada por el modelo' }
      }]
    }, 'Quiero ir a la terminal.', contracts.newSession('santafe'));
    assert.equal(selected.name, 'search_destination');
    assert.equal(selected.arguments.query, 'la terminal');
  });

  test('does not replace a different allowlisted model tool with unrelated fallback arguments', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{ id: 'model-call', name: 'get_current_city', arguments: {} }]
    }, 'Quiero ir a la terminal.', contracts.newSession('santafe'));
    assert.equal(selected.name, 'get_current_city');
    assert.deepEqual(selected.arguments, {});
  });
});
