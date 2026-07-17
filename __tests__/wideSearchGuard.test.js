/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadGuard(options = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'destinationResolver.js'), 'utf8');
  let clickListener = null;
  const calls = {
    remote: [],
    local: 0,
    render: [],
    toasts: [],
    fallback: 0,
    select: 0
  };
  const input = { value: options.query || 'Puente Colgante' };
  const context = vm.createContext({
    console,
    document: {
      addEventListener(type, listener, capture) {
        if (type === 'click' && capture === true) clickListener = listener;
      },
      getElementById(id) { return id === 'destInput' ? input : null; }
    },
    MC: {
      getOrigin() { return { lat: -31.63, lon: -60.69 }; },
      async v5SearchLocalRanked() {
        calls.local += 1;
        return options.local || [];
      },
      async searchRemote(query, searchOptions) {
        calls.remote.push({ query, options: searchOptions });
        return options.remote || [{
          canonicalId: 'osm:way:1',
          source: 'remote',
          type: 'poi',
          name: 'Puente Colgante',
          displayName: 'Puente Colgante, Santa Fe',
          address: 'Santa Fe',
          lat: -31.639764,
          lon: -60.682736,
          cityId: 'santafe',
          precision: 'poi',
          confidence: 0.99,
          verified: true,
          aliases: [],
          osmType: 'way',
          osmId: '1'
        }];
      },
      dedupResults(results) { return results; }
    },
    renderSearchDropdown(results, isRecent, isSearching, lowConfidence) {
      calls.render.push({ results, isRecent, isSearching, lowConfidence });
    },
    showToast(message, level) { calls.toasts.push({ message, level }); },
    fallbackGeocode() { calls.fallback += 1; },
    selectDestinationCandidate() { calls.select += 1; }
  });
  vm.runInContext(source, context, { filename: 'destinationResolver.js' });
  assert.equal(typeof clickListener, 'function', 'wide-search capture listener must be installed');
  return { context, clickListener, calls, input };
}

function wideClickEvent() {
  const state = { prevented: 0, immediateStopped: 0 };
  return {
    state,
    event: {
      target: { closest(selector) { return selector === '#searchMoreResults' ? { id: 'searchMoreResults' } : null; } },
      preventDefault() { state.prevented += 1; },
      stopImmediatePropagation() { state.immediateStopped += 1; }
    }
  };
}

test('wide results click makes exactly one wide request and always requires explicit choice', async () => {
  const runtime = loadGuard();
  const { event, state } = wideClickEvent();

  await runtime.clickListener(event);

  assert.equal(state.prevented, 1);
  assert.equal(state.immediateStopped, 1);
  assert.equal(runtime.calls.remote.length, 1);
  assert.equal(runtime.calls.remote[0].query, 'Puente Colgante');
  assert.deepEqual(runtime.calls.remote[0].options, { wide: true });
  assert.equal(runtime.calls.local, 1);
  assert.equal(runtime.calls.fallback, 0, 'legacy fallback handler must not run through bubbling');
  assert.equal(runtime.calls.select, 0, 'even a high-confidence resolved candidate must not be auto-selected');
  assert.equal(runtime.calls.render.length, 1);
  assert.equal(runtime.calls.render[0].results.length, 1);
  assert.deepEqual(runtime.calls.render[0].results[0].canonicalId, 'osm:way:1');
  assert.deepEqual(runtime.calls.toasts.at(-1), { message: 'Elegí el destino correcto', level: 'info' });
});

test('wide click renders a recoverable empty state without a second request', async () => {
  const runtime = loadGuard({ query: 'Destino inexistente', remote: [] });
  const { event } = wideClickEvent();

  await runtime.clickListener(event);

  assert.equal(runtime.calls.remote.length, 1);
  assert.equal(runtime.calls.render.length, 1);
  assert.deepEqual(runtime.calls.render[0].results, []);
  assert.deepEqual(runtime.calls.toasts.at(-1), { message: 'No se encontraron más resultados', level: 'warn' });
});

test('unrelated clicks and short queries do not trigger remote geocoding', async () => {
  const unrelated = loadGuard();
  await unrelated.clickListener({
    target: { closest() { return null; } },
    preventDefault() { throw new Error('must not prevent unrelated clicks'); },
    stopImmediatePropagation() { throw new Error('must not stop unrelated clicks'); }
  });
  assert.equal(unrelated.calls.remote.length, 0);

  const short = loadGuard({ query: 'A' });
  const { event, state } = wideClickEvent();
  await short.clickListener(event);
  assert.equal(state.prevented, 1);
  assert.equal(state.immediateStopped, 1);
  assert.equal(short.calls.remote.length, 0);
});

test('guard installs only once per page', () => {
  const runtime = loadGuard();
  assert.equal(runtime.context.__voyWideSearchGuardInstalled, true);
  const source = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'destinationResolver.js'), 'utf8');
  vm.runInContext(source, runtime.context, { filename: 'destinationResolver-second-load.js' });
  assert.equal(runtime.context.__voyWideSearchGuardInstalled, true);
});
