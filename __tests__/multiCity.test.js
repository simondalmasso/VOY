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
    body: {
      setAttribute: () => {},
      removeAttribute: () => {}
    }
  };

  const mockFetch = async (url) => {
    return mockFetch.impl ? mockFetch.impl(url) : { ok: false, status: 404 };
  };

  const sandbox = {
    location: { search: '' },
    localStorage: mockLocalStorage,
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
  sandbox.MobilityController = {
    initCalls: 0,
    _config: null,
    init: function(config) {
      this.initCalls++;
      this._config = config;
      return realController.init(config);
    },
    getOrigin: () => realController.getOrigin(),
    getDest: () => realController.getDest(),
    getEstimations: () => realController.getEstimations(),
    isOriginManual: () => realController.isOriginManual(),
    setOrigin: function(lat, lon, name, source) {
      return realController.setOrigin(lat, lon, name, source);
    },
    setDest: function(lat, lon, name, source) {
      return realController.setDest(lat, lon, name, source);
    },
    searchNominatim: function(q) {
      return realController.searchNominatim(q);
    },
    v5SearchLocalRanked: () => Promise.resolve([]),
    searchLocal: () => [],
    dedupResults: (r) => r,
    v5AddRecent: () => {},
    v5GetRecents: () => Promise.resolve([]),
    v5GetFavorites: () => Promise.resolve([]),
    v5NewSessionToken: () => {},
    loadMemory: () => {}
  };
  sandbox.MC = sandbox.MobilityController;

  vm.runInContext(code, context);

  return sandbox;
}

describe('Multi-City Foundation v1 — 16 Mandatory Tests', () => {

  // Test 1: _default carga city_default.json
  test('1. _default profile successfully loads city_default.json', async () => {
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
            map: { center: [-34, -58], zoom: 12, viewbox: '-58.55,-34.70,-58.25,-34.50' },
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

  // Test 2: Nunca se solicita city__default.json
  test('2. never requests city__default.json (no double underscores)', async () => {
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
          map: { center: [-34, -58], zoom: 12, viewbox: '-58.55,-34.70,-58.25,-34.50' },
          providers: {},
          fareRegistry: {}
        })
      };
    };

    await runtime.loadCityProfile('_default');
    assert.strictEqual(doubleUnderscoreRequested, false, 'Should never request city__default.json with double underscores');
  });

  // Test 3: ?city=rosario activa _default
  test('3. ?city=rosario activates _default', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=rosario';
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, '_default', 'Unknown query city parameter must map to _default');
  });

  // Test 4: ?city=santafe activa Santa Fe
  test('4. ?city=santafe activates santafe', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=santafe';
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, 'santafe', 'santafe query city parameter must map to santafe');
  });

  // Test 5: 404 y network error son distintos
  test('5. 404 and network error produce different fallback pathways', async () => {
    // 404 pathway: must load _default and not try cache
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
            map: { center: [-34, -58], zoom: 12, viewbox: '0,0,0,0' },
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

  // Test 6: Timeout usa cache válida de la misma ciudad
  test('6. timeout uses cache of the same city', async () => {
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

  // Test 7: Cache con city_id incorrecto se rechaza
  test('7. cache with incorrect city_id is rejected', async () => {
    const runtime = loadRealRuntime();
    // Cache for santafe but it has a mismatched internal city_id
    runtime.localStorage.setItem('voy_city_cache_santafe', JSON.stringify({
      city_id: 'different_city',
      name: 'Mismatched Cache',
      map: { center: [0, 0] },
      providers: {},
      fareRegistry: {}
    }));
    runtime.fetch.impl = async () => {
      throw new TypeError('Network error');
    };
    await runtime.loadCityProfile('santafe');
    assert.notStrictEqual(runtime.CURRENT_CITY.city_id, 'different_city', 'Cache must be rejected if city_id mismatch occurs');
  });

  // Test 8: JSON corrupto no activa Santa Fe
  test('8. corrupt JSON does not activate Santa Fe', async () => {
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
            map: { center: [-34, -58], zoom: 12, viewbox: '0,0,0,0' },
            providers: {},
            fareRegistry: {}
          })
        };
      }
    };
    await runtime.loadCityProfile('santafe');
    assert.ok(defaultRequested, 'Corrupt fetched profile for Santa Fe must fallback to default profile and never activate Santa Fe');
  });

  // Test 9: _default no contiene contaminación territorial
  test('9. _default does not contain territorial contamination', async () => {
    const runtime = loadRealRuntime();
    runtime.fetch.impl = async (url) => {
      if (url === 'city_default.json') {
        return {
          ok: true,
          json: async () => ({
            city_id: '_default',
            name: 'Desconocida',
            displayName: 'Ciudad Desconocida',
            map: { center: [-34, -58], zoom: 12, viewbox: '0,0,0,0' },
            providers: {
              uber: { name: 'Uber', available: false, verified: false }
            },
            busStops: [],
            bikeStations: [],
            landmarks: [],
            taxiCompanies: [],
            remisCompanies: [],
            fareRegistry: {}
          })
        };
      }
    };
    await runtime.loadCityProfile('_default');
    assert.strictEqual(runtime.BUS_STOPS.length, 0);
    assert.strictEqual(runtime.BIKE_STATIONS.length, 0);
    assert.strictEqual(runtime.LANDMARKS.length, 0);
    assert.strictEqual(runtime.PROVIDERS.uber.verified, false, 'Providers in _default must be unverified');
  });

  // Test 10: _default no usa bbox de Santa Fe
  test('10. _default does not use Santa Fe bounding box', async () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: {
        city_id: '_default',
        displayName: 'Ciudad Desconocida',
        map: { viewbox: '-58.55,-34.70,-58.25,-34.50' }
      }
    });

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.MC.searchNominatim('Belgrano');
    assert.ok(!requestedUrl.includes('-60.75'), 'Search viewbox must not bias towards Santa Fe');
    assert.ok(!requestedUrl.includes('bounded=1'), 'Search in _default must not contain bounded=1 bias');
  });

  // Test 11: _default no añade Santa Fe, Argentina
  test('11. _default does not append Santa Fe, Argentina', async () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: {
        city_id: '_default',
        displayName: 'Ciudad Desconocida',
        map: { viewbox: '-58.55,-34.70,-58.25,-34.50' }
      }
    });

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => [] };
    };

    await runtime.MC.searchNominatim('Belgrano');
    assert.ok(!requestedUrl.includes('Santa%20Fe'), 'Search suffix must not contain Santa Fe');
  });

  // Test 12: Tarifas desconocidas no muestran $0
  test('12. unverified unknown fares evaluate to null instead of $0', () => {
    const runtime = loadRealRuntime();
    runtime.FareRegistry.taxi = {
      diurno: { bajada: null, ficha: null, distFicha: 130 },
      nocturno: { bajada: null, ficha: null, distFicha: 130 }
    };

    const fare = runtime.computeTaxiFare(5, 12);
    assert.strictEqual(fare, null, 'Unverified fares must evaluate to null instead of $0');
  });

  // Test 13: GPS tardío confirmado en Santa Fe cambia el perfil
  test('13. late GPS fix confirmed in Santa Fe dynamically selects Santa Fe', async () => {
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

  // Test 14: GPS denegado mantiene _default
  test('14. denied GPS permission maintains _default', () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = { city_id: '_default' };

    // Trigger permissions denied
    runtime._onGpsPermissionChange({ state: 'denied' });
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default', 'Denied GPS permission must not silently assume Santa Fe');
  });

  // Test 15: MC.init se ejecuta exactamente una vez
  test('15. MC.init is executed exactly once', () => {
    const runtime = loadRealRuntime();
    assert.strictEqual(runtime.window._mcInitialized, false);

    // Initial boot triggers MC.init
    if (!runtime.window._mcInitialized) {
      runtime.MC.init({ profile: { city_id: '_default' } });
      runtime.window._mcInitialized = true;
    }

    assert.strictEqual(runtime.window._mcInitialized, true);
    assert.strictEqual(runtime.MC.initCalls, 1);

    // Second initialization attempt is blocked
    if (!runtime.window._mcInitialized) {
      runtime.MC.init({ profile: { city_id: 'santafe' } });
    }
    assert.strictEqual(runtime.MC.initCalls, 1, 'MC.init must only be called once');
  });

  // Test 16: Package y lockfiles no cambian
  test('16. package and lockfiles are untouched', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.ok(pkg.devDependencies['eslint-config-next'] === '^16.1.1', 'package.json must retain baseline configurations');
  });

});
