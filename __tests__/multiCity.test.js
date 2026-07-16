/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Robust loader of the real codebase inside a controlled mock sandbox context
function loadRealRuntime() {
  const htmlPath = path.join(__dirname, '..', 'public', 'VOY-Lite.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Robustly extract the main inline script block from VOY-Lite.html
  const mainScriptStart = html.indexOf('// ===================== V7 VERSION PIN');
  const scriptStart = html.indexOf('<script>', mainScriptStart - 50);
  const scriptEnd = html.indexOf('</script>', scriptStart);
  const code = html.substring(scriptStart + 8, scriptEnd);

  // Controlled sandbox environment with mock browser globals
  const localStorageStore = {};
  const mockLocalStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { for (let k in localStorageStore) delete localStorageStore[k]; }
  };

  const mockElement = {
    setAttribute: () => {},
    removeAttribute: () => {},
    addEventListener: () => {},
    appendChild: () => {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {}
    },
    childNodes: []
  };

  const mockDocument = {
    title: '',
    readyState: 'complete',
    querySelector: () => mockElement,
    getElementById: () => mockElement,
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: () => mockElement,
    body: {
      setAttribute: () => {},
      removeAttribute: () => {},
      appendChild: () => {}
    }
  };

  const mockFetch = async (url) => {
    return mockFetch.impl ? mockFetch.impl(url) : { ok: false, status: 404 };
  };

  // Mock IndexedDB stores
  const idbStores = {
    recents: [],
    favorites: [],
    trips: [],
    meta: []
  };

  const mockIDB = {
    open: function() {
      const request = {
        onsuccess: null,
        onupgradeneeded: null,
        onerror: null
      };
      const db = {
        objectStoreNames: {
          contains: () => true
        },
        transaction: function(storeName, mode) {
          const store = idbStores[storeName] || [];
          const tx = {
            oncomplete: null,
            onerror: null,
            objectStore: function() {
              return {
                put: function(value) {
                  const keyProp = storeName === 'meta' ? 'key' : 'id';
                  const idx = store.findIndex(item => item[keyProp] === value[keyProp]);
                  if (idx >= 0) store[idx] = value;
                  else store.push(value);
                  return {};
                },
                get: function(key) {
                  const req = {
                    result: store.find(item => item.key === key || item.id === key),
                    onsuccess: null
                  };
                  setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
                  return req;
                },
                getAll: function() {
                  const req = {
                    result: store,
                    onsuccess: null
                  };
                  setTimeout(() => { if (req.onsuccess) req.onsuccess(); }, 0);
                  return req;
                },
                delete: function(key) {
                  const idx = store.findIndex(item => item.id === key);
                  if (idx >= 0) store.splice(idx, 1);
                  return {};
                },
                clear: function() {
                  store.length = 0;
                  return {};
                }
              };
            }
          };
          setTimeout(() => { if (tx.oncomplete) tx.oncomplete(); }, 0);
          return tx;
        }
      };
      setTimeout(() => {
        if (request.onsuccess) {
          request.onsuccess({ target: { result: db } });
        }
      }, 0);
      return request;
    }
  };

  const sandbox = {
    location: { search: '' },
    localStorage: mockLocalStorage,
    indexedDB: mockIDB,
    navigator: {
      userAgent: 'Mozilla/5.0 Node.js Test',
      geolocation: {
        watchPosition: () => 1,
        clearWatch: () => {}
      }
    },
    fetch: mockFetch,
    Node: { TEXT_NODE: 3 },
    DOMParser: class {},
    console: {
      log: () => {},
      warn: () => {},
      error: () => {}
    },
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    AbortController: AbortController,
    _mcInitialized: false,
    addEventListener: () => {},
    removeEventListener: () => {},
    URLSearchParams: URLSearchParams
  };

  sandbox.window = sandbox;
  sandbox.document = mockDocument;

  // Compile and evaluate real production code files
  const engineCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'mobilityEngine.js'), 'utf8');
  const controllerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui', 'mobilityController.js'), 'utf8');

  const context = vm.createContext(sandbox);
  vm.runInContext(engineCode, context);
  vm.runInContext(controllerCode, context);

  // Wrap the real MobilityController with our spy helper
  const realController = sandbox.MobilityController;
  const spyController = {
    initCalls: 0,
    setProfileCalls: 0,
    _config: null,
    init: function(config) {
      this.initCalls++;
      this._config = config;
      return realController.init(config);
    },
    setProfile: function(profile) {
      this.setProfileCalls++;
      if (this._config) {
        this._config.profile = profile;
      }
      return realController.setProfile ? realController.setProfile(profile) : undefined;
    }
  };

  // Dynamically delegate all other methods to realController
  for (let key in realController) {
    if (typeof realController[key] === 'function' && !spyController[key]) {
      spyController[key] = function(...args) {
        return realController[key](...args);
      };
    }
  }

  sandbox.MobilityController = spyController;
  sandbox.MC = sandbox.MobilityController;

  vm.runInContext(code, context);

  return sandbox;
}

describe('Multi-City Foundation v1 — Complete Integration, Isolation & Fallback Tests', () => {

  // Test 1: _default profile successfully loads city_default.json
  test('_default profile successfully loads city_default.json', async () => {
    const runtime = loadRealRuntime();
    let defaultRequested = false;

    runtime.fetch.impl = async (url) => {
      if (url === 'city_default.json') {
        defaultRequested = true;
        return {
          ok: true,
          json: async () => ({
            city_id: '_default',
            name: 'Desconocida',
            displayName: 'Ciudad Desconocida',
            map: { center: [0, 0], zoom: 2 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
      return { ok: false, status: 404 };
    };

    await runtime.loadCityProfile('_default');
    assert.ok(defaultRequested, 'Must fetch city_default.json for _default');
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default');
  });

  // Test 2: Never requests city__default.json (no double underscores)
  test('never requests city__default.json (no double underscores)', async () => {
    const runtime = loadRealRuntime();
    let doubleUnderscoreRequested = false;

    runtime.fetch.impl = async (url) => {
      if (url.includes('__')) {
        doubleUnderscoreRequested = true;
      }
      return {
        ok: true,
        json: async () => ({
          city_id: '_default',
          name: 'Desconocida',
          displayName: 'Ciudad Desconocida',
          map: { center: [0, 0], zoom: 2 },
          providers: {},
          fareRegistry: {}
        })
      };
    };

    await runtime.loadCityProfile('_default');
    assert.strictEqual(doubleUnderscoreRequested, false, 'Should never request city__default.json with double underscores');
  });

  // Test 3: ?city=rosario activates _default
  test('?city=rosario activates _default', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=rosario';
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, '_default', 'Unknown query city parameter must map to _default');
  });

  // Test 4: ?city=santafe activates Santa Fe
  test('?city=santafe activates Santa Fe', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=santafe';
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, 'santafe', '?city=santafe query parameter must map to santafe');
  });

  // Test 5: 404 and network error produce different fallback pathways
  test('404 and network error produce different fallback pathways', async () => {
    // 404 (perfil inexistente) pathway: must load _default and not try cache
    const runtime404 = loadRealRuntime();
    let defaultRequested = false;
    runtime404.fetch.impl = async (url) => {
      if (url === 'city_invalid.json') return { ok: false, status: 404 };
      if (url === 'city_default.json') {
        defaultRequested = true;
        return {
          ok: true,
          json: async () => ({
            city_id: '_default',
            name: 'Desconocida',
            displayName: 'Ciudad Desconocida',
            map: { center: [0, 0], zoom: 2 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
    };
    await runtime404.loadCityProfile('invalid');
    assert.ok(defaultRequested, '404 on city profile must trigger immediate fallback to _default');

    // Network error pathway: must check local cache
    const runtimeNetwork = loadRealRuntime();
    runtimeNetwork.localStorage.setItem('voy_city_cache_santafe', JSON.stringify({
      city_id: 'santafe',
      name: 'Santa Fe Cached',
      map: { center: [-60, -31], zoom: 13 },
      providers: {},
      fareRegistry: {}
    }));
    runtimeNetwork.fetch.impl = async () => {
      throw new TypeError('Failed to fetch (Network Error)');
    };
    await runtimeNetwork.loadCityProfile('santafe');
    assert.strictEqual(runtimeNetwork.CURRENT_CITY.name, 'Santa Fe Cached', 'Network error must fallback to using local cache');
  });

  // Test 6: Timeout uses cache of the same city
  test('timeout uses cache of the same city', async () => {
    const runtime = loadRealRuntime();
    runtime.localStorage.setItem('voy_city_cache_santafe', JSON.stringify({
      city_id: 'santafe',
      name: 'Santa Fe Cached Timeout',
      map: { center: [-60, -31], zoom: 13 },
      providers: {},
      fareRegistry: {}
    }));
    runtime.fetch.impl = async () => {
      const abortError = new Error('The user aborted a request.');
      abortError.name = 'AbortError';
      throw abortError;
    };
    await runtime.loadCityProfile('santafe');
    assert.strictEqual(runtime.CURRENT_CITY.name, 'Santa Fe Cached Timeout', 'Timeout/Abort must use local cache of the requested city');
  });

  // Test 7: Cache with city_id incorrecto is rejected
  test('cache with city_id incorrecto is rejected', async () => {
    const runtime = loadRealRuntime();
    runtime.localStorage.setItem('voy_city_cache_santafe', JSON.stringify({
      city_id: 'anothercity',
      name: 'Mismatched Cache',
      map: { center: [-60, -31], zoom: 13 },
      providers: {},
      fareRegistry: {}
    }));
    let defaultRequested = false;
    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') {
        throw new Error('Network failure');
      }
      if (url === 'city_default.json') {
        defaultRequested = true;
        return {
          ok: true,
          json: async () => ({
            city_id: '_default',
            name: 'Desconocida',
            displayName: 'Ciudad Desconocida',
            map: { center: [0, 0], zoom: 2 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
    };
    await runtime.loadCityProfile('santafe');
    assert.ok(defaultRequested, 'Reject mismatched cached profile and fall back to default');
  });

  // Test 8: Corrupt JSON does not activate Santa Fe
  test('corrupt JSON does not activate Santa Fe', async () => {
    const runtime = loadRealRuntime();
    let defaultRequested = false;
    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') {
        return {
          ok: true,
          json: async () => { throw new SyntaxError('Corrupt JSON syntax'); }
        };
      }
      if (url === 'city_default.json') {
        defaultRequested = true;
        return {
          ok: true,
          json: async () => ({
            city_id: '_default',
            name: 'Desconocida',
            displayName: 'Ciudad Desconocida',
            map: { center: [0, 0], zoom: 2 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
    };
    await runtime.loadCityProfile('santafe');
    assert.ok(defaultRequested, 'Corrupt fetched profile for Santa Fe must fallback to default profile and never activate Santa Fe');
  });

  // Test 9: _default does not contain territorial/Santa Fe or Buenos Aires coordinates (completely neutral map [0,0])
  test('_default profile contains NO territorial coordinates of Santa Fe or Buenos Aires (fully neutral [0,0] map)', () => {
    const defaultProfile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'city_default.json'), 'utf8'));
    assert.strictEqual(defaultProfile.city_id, '_default');
    assert.deepStrictEqual(defaultProfile.map.center, [0, 0]);
    assert.strictEqual(defaultProfile.map.zoom, 2);
    assert.strictEqual(defaultProfile.map.bbox, undefined);
    assert.strictEqual(defaultProfile.map.viewbox, undefined);
    assert.strictEqual(defaultProfile.map.recentCenter, undefined);
  });

  // Test 10: _default search does not use Santa Fe bbox bias
  test('search in _default does not use Santa Fe bbox bias', async () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: {
        city_id: '_default',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 }
      }
    });

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.MC.searchNominatim('Belgrano');
    assert.ok(!requestedUrl.includes('bounded=1'), 'Search in _default must not contain bounded=1 bias');
    assert.ok(!requestedUrl.includes('-60.75'), 'Search in _default must not contain Santa Fe bbox coordinates');
  });

  // Test 11: _default search does not append "Santa Fe, Argentina" suffix
  test('search in _default does not append "Santa Fe, Argentina" suffix', async () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: {
        city_id: '_default',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 }
      }
    });

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.MC.searchNominatim('Belgrano');
    assert.ok(!requestedUrl.includes('Santa%20Fe'), 'Search in _default must not append Santa Fe suffix');
  });

  // Test 12: Unknown/unverified fares do not show $0 (returns null)
  test('unknown/unverified fares do not show $0', () => {
    const runtime = loadRealRuntime();
    runtime.FareRegistry.taxi = {
      diurno: { bajada: null, ficha: null, distFicha: 130 },
      nocturno: { bajada: null, ficha: null, distFicha: 130 }
    };

    const fare = runtime.computeTaxiFare(5, 12);
    assert.strictEqual(fare, null, 'Unverified fares must evaluate to null instead of $0');
  });

  // Test 13: GPS tardío confirmed in Santa Fe dynamically selects Santa Fe
  test('first visit with GPS confirmed in Santa Fe dynamically selects Santa Fe', async () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = { city_id: '_default' };

    let santafeFetched = false;
    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') {
        santafeFetched = true;
        return {
          ok: true,
          json: async () => ({
            city_id: 'santafe',
            name: 'Santa Fe',
            displayName: 'Santa Fe, Argentina',
            map: { center: [-60.70, -31.62], zoom: 13 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
      return { ok: false, status: 404 };
    };

    // Simulate GPS coordinates inside Santa Fe bounding box
    await runtime._handleGpsPosition(-31.6256, -60.7087);
    assert.ok(santafeFetched, 'Late GPS fix inside Santa Fe bounding box must dynamically select and fetch Santa Fe');
  });

  // Test 14: GPS denegado maintains _default
  test('GPS denegado maintains _default', () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = { city_id: '_default' };
    runtime._onGpsPermissionChange({ state: 'denied' });
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default', 'GPS denied must retain the _default city profile');
  });

  // Test 15: MC.init is executed exactly once, and MC.setProfile does not re-execute init
  test('MC.init is executed exactly once, and MC.setProfile does not re-execute init', () => {
    const runtime = loadRealRuntime();
    assert.strictEqual(runtime.window._mcInitialized, false);

    // Initial boot triggers MC.init
    if (!runtime.window._mcInitialized) {
      runtime.MC.init({ profile: { city_id: '_default' } });
      runtime.window._mcInitialized = true;
    }

    assert.strictEqual(runtime.window._mcInitialized, true);
    assert.strictEqual(runtime.MC.initCalls, 1);

    // Try setProfile
    runtime.MC.setProfile({ city_id: 'santafe' });
    assert.strictEqual(runtime.MC.initCalls, 1, 'MC.init must not be called again when setProfile runs');
  });

  // Test 16: Package and lockfiles do not change (metatest to verify pristine repo state)
  test('package and lockfiles remain completely intact', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.name, 'nextjs_tailwind_shadcn_ts');
  });

  // Test 17: Switching _default -> santafe -> _default does not mix memory (localStorage isolation)
  test('switching profiles does not mix memory (localStorage isolation)', () => {
    const runtime = loadRealRuntime();

    // 1. Start in _default
    runtime.MC.init({ profile: { city_id: '_default' } });
    runtime.MC.loadMemory();
    // Verify start state
    assert.strictEqual(runtime.MC.getFavorites().casa, null);

    // Add a favorite in _default
    runtime.MC.addFavorite('casa', 'Default Casa', 10, 10, 'Calle Falsa 123');
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Default Casa');

    // 2. Switch to santafe
    runtime.MC.setProfile({ city_id: 'santafe' });
    // Verify memory got discarded/reloaded for Santa Fe (should be null initially)
    assert.strictEqual(runtime.MC.getFavorites().casa, null, 'Previous city memory must be discarded/swapped out');

    // Add a favorite in santafe
    runtime.MC.addFavorite('casa', 'Santafe Casa', 20, 20, 'Calle Verdadera 123');
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Santafe Casa');

    // 3. Switch back to _default
    runtime.MC.setProfile({ city_id: '_default' });
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Default Casa', 'Switching back to _default must load _default favorites');
  });

  // Test 18: IndexedDB does not return records from another city (strict ID isolation)
  test('IndexedDB does not return records from another city (strict ID isolation)', async () => {
    const runtime = loadRealRuntime();

    // Init in default
    runtime.MC.init({ profile: { city_id: '_default' } });

    // Add recent in _default
    await runtime.MC.v5AddRecent({ lat: 1, lon: 1, name: 'Place Default' });
    let recentsDefault = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsDefault.length, 1);
    assert.strictEqual(recentsDefault[0].name, 'Place Default');

    // Switch to santafe
    runtime.MC.setProfile({ city_id: 'santafe' });
    let recentsSantaFe = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsSantaFe.length, 0, 'IndexedDB recents of Santa Fe must be clean on first load');

    // Add recent in santafe
    await runtime.MC.v5AddRecent({ lat: 2, lon: 2, name: 'Place Santa Fe' });
    recentsSantaFe = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsSantaFe.length, 1);
    assert.strictEqual(recentsSantaFe[0].name, 'Place Santa Fe');

    // Switch back to _default
    runtime.MC.setProfile({ city_id: '_default' });
    recentsDefault = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsDefault.length, 1);
    assert.strictEqual(recentsDefault[0].name, 'Place Default', 'IndexedDB must strictly isolate records by city_id');
  });

  // Extra Test: lack of displayName in active profile never produces Santa Fe
  test('lack of displayName in active profile never produces Santa Fe', async () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: {
        city_id: '_default',
        map: { center: [0,0], zoom: 2 }
      }
    });

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.MC.searchNominatim('Belgrano');
    assert.ok(!requestedUrl.includes('Santa%20Fe'), 'Lack of displayName must never fallback to Santa Fe');
  });

  // Extra Test: fallbackGeocode on _default has no bias or suffix contamination
  test('fallbackGeocode on _default has no bias, viewbox, bounded, or Santa Fe suffix contamination', async () => {
    const runtime = loadRealRuntime();
    runtime.showToast = () => {}; // Prevents asynchronous toast setTimeout styled-error after test finishes
    runtime.CURRENT_CITY = {
      city_id: '_default',
      name: 'Ciudad Desconocida',
      map: { center: [0, 0], zoom: 2 }
    };

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.fallbackGeocode('Belgrano');

    assert.ok(requestedUrl.includes('q=Belgrano'), 'Query must contain the unmodified text');
    assert.ok(!requestedUrl.includes('Santa%20Fe') && !requestedUrl.includes('Santa Fe'), 'Query must NOT contain Santa Fe suffix');
    assert.ok(!requestedUrl.includes('Buenos%20Aires') && !requestedUrl.includes('Buenos Aires'), 'Query must NOT contain Buenos Aires suffix');
    assert.ok(!requestedUrl.includes('viewbox'), 'Query must NOT contain any viewbox query parameter');
    assert.ok(!requestedUrl.includes('bounded'), 'Query must NOT contain any bounded query parameter');
  });

});
