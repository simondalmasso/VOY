/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const contractsPromise = import('../voiceCopilotContracts.mjs');
const dataPromise = import('../voiceCopilotData.mjs');
const conversationPromise = import('../voiceCopilotConversation.mjs');

const fixtureBundle = {
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

const actualSantaFeBundle = {
  transport: JSON.parse(readFileSync(resolve(__dirname, '../public/cities/santa-fe/transport.json'), 'utf8'))
};

describe('Voice destination selection boundary', () => {
  test('normalizes a leading article without inventing a different place', async () => {
    const data = await dataPromise;
    const matches = data.searchTerritorial(fixtureBundle, 'santafe', 'la terminal');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].ref, 'santafe:landmark:terminal');
  });

  test('selects the unique exact name from the real Santa Fe territorial asset', async () => {
    const data = await dataPromise;
    const matches = data.searchTerritorial(actualSantaFeBundle, 'santafe', 'la terminal');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'Terminal de Ómnibus');
    assert.equal(matches[0].city_id, 'santafe');
    assert.equal(matches[0].source, 'local');
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

  test('forces the confirmation tool when the model only lists providers for an open action', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{ id: 'model-call', name: 'list_available_providers', arguments: {} }]
    }, 'Abrime Uber para este destino.', contracts.newSession('santafe'));
    assert.equal(selected.name, 'prepare_external_provider_action');
    assert.deepEqual(selected.arguments, { provider: 'uber' });
  });

  test('forces cancellation for a pending external action', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const session = contracts.newSession('santafe');
    session.pending_confirmation = {
      token: 'token',
      provider: 'uber',
      destination_ref: 'santafe:stop:terminal',
      operation_id: 'operation',
      state_revision: 1,
      expires_at: Date.now() + 60000
    };
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{ id: 'model-call', name: 'list_available_providers', arguments: {} }]
    }, 'Cancelá la acción pendiente.', session);
    assert.equal(selected.name, 'cancel_pending_action');
    assert.deepEqual(selected.arguments, {});
  });

  test('forces explicit comparison intent after a validated destination', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const session = contracts.newSession('santafe');
    session.destination = contracts.sanitizePlaceRef({
      ref: 'santafe:landmark:terminal',
      name: 'Terminal de Ómnibus',
      address: 'Belgrano 2910',
      source: 'local',
      city_id: 'santafe'
    });
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{ id: 'model-call', name: 'list_nearby_stops', arguments: {} }]
    }, 'Compará los modos disponibles sin inventar precios, tiempos ni colectivo.', session);
    assert.equal(selected.name, 'compare_modes');
    assert.deepEqual(selected.arguments, {});
  });

  test('does not replace a different allowlisted model tool with unrelated non-safety fallback arguments', async () => {
    const contracts = await contractsPromise;
    const conversation = await conversationPromise;
    const selected = conversation.__voiceConversationTest.selectToolCall({
      tool_calls: [{ id: 'model-call', name: 'get_current_city', arguments: {} }]
    }, 'Quiero ir a la terminal.', contracts.newSession('santafe'));
    assert.equal(selected.name, 'get_current_city');
    assert.deepEqual(selected.arguments, {});
  });
});