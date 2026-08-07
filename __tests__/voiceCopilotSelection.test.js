/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const contractsPromise = import('../voiceCopilotContracts.mjs');
const dataPromise = import('../voiceCopilotData.mjs');
const conversationPromise = import('../voiceCopilotConversation.mjs');

const trustedTerminal = {
  canonicalId: 'santafe:landmark:terminal-omnibus',
  nombre: 'Terminal de Ómnibus',
  aliases: ['terminal'],
  address: 'Belgrano 2910',
  lat: -31.643533,
  lon: -60.700503,
  verified: true,
  source: 'authoritative',
  precision: 'poi',
  verified_at: '2026-08-05',
  provenance: {
    status: 'authoritative',
    issuer: 'Municipalidad de Santa Fe',
    source_title: 'Estación Terminal de Ómnibus de Santa Fe',
    source_url: 'https://santafeciudad.gov.ar/terminal-de-colectivos/',
    license: 'Información pública institucional',
    coordinate_method: 'Dirección oficial cruzada con geodato gubernamental',
    coordinate_source_url: 'https://www.bcra.gob.ar/entidades-financieras-filiales-y-cajeros-filtros/?Provincia=SANTA+FE&Tipo=4&Tit=2&bco=AAA10'
  }
};

const fixtureBundle = {
  transport: {
    landmarks: [trustedTerminal],
    bus_stops: [{ nombre: 'Terminal', calles: 'Belgrano y Freyre' }],
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
    assert.equal(matches[0].ref, 'santafe:landmark:terminal-omnibus');
  });

  test('selects the unique authoritative destination from the real Santa Fe asset', async () => {
    const data = await dataPromise;
    const matches = data.searchTerritorial(actualSantaFeBundle, 'santafe', 'la terminal');
    assert.equal(matches.length, 1);
    assert.equal(matches[0].name, 'Terminal de Ómnibus');
    assert.equal(matches[0].address, 'Belgrano 2910');
    assert.equal(matches[0].city_id, 'santafe');
    assert.equal(matches[0].source, 'local');
  });

  test('fails closed for an unverified destination even when its name and address look plausible', async () => {
    const data = await dataPromise;
    const bundle = {
      transport: {
        landmarks: [{ ...trustedTerminal, verified: false, source: 'curated', provenance: undefined }],
        bus_stops: [],
        bike_stations: []
      }
    };
    assert.deepEqual(data.searchTerritorial(bundle, 'santafe', 'terminal'), []);
  });

  test('fails closed for a forged former address and missing authoritative provenance', async () => {
    const data = await dataPromise;
    const forged = { ...trustedTerminal, address: 'Belgrano y Freyre' };
    delete forged.provenance;
    const bundle = { transport: { landmarks: [forged], bus_stops: [], bike_stations: [] } };
    assert.deepEqual(data.searchTerritorial(bundle, 'santafe', 'terminal'), []);
    assert.equal(data.toPlaceRef(forged, 'santafe', 'landmark'), null);
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
      destination_ref: 'santafe:landmark:terminal-omnibus',
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
      ref: 'santafe:landmark:terminal-omnibus',
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
