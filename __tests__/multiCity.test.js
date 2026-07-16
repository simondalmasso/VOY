/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Robust loader of the real codebase inside a controlled mock sandbox context
function loadRealRuntime() {
  const htmlPath = path.join(__dirname, '..', 'public', 'VOY-Lite.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Robustly extract the main inline script block from VOY-Lite.html
  const mainScriptStart = html.indexOf('// ===================== V7 VERSION PIN');
  const scriptStart = html.indexOf('<script>', mainScriptStart - 50);
  const scriptEnd = html.indexOf('</script>', scriptStart);
  let code = html.substring(scriptStart + 8, scriptEnd);

  // Inject a test hook programmatically for Test E (sandbox only, never in production!)
  code = code.replace(
    'var preparedMemoryState = prepareMemoryStateForCity(cityId);',
    'if (window.__testHarness_failPrepare) { throw new Error("Sandbox Preparation Failed"); } var preparedMemoryState = prepareMemoryStateForCity(cityId);'
  );

  // Controlled sandbox environment with mock browser globals
  const localStorageStore = {};
  const mockLocalStorage = {
    getItem: (key) => localStorageStore[key] || null,
    setItem: (key, val) => { localStorageStore[key] = String(val); },
    removeItem: (key) => { delete localStorageStore[key]; },
    clear: () => { for (let k in localStorageStore) delete localStorageStore[k]; }
  };

  const idbStores = {
    recents: [],
    favorites: [],
    trips: [],
    meta: []
  };

  const mapCalls = [];
  const mapSources = new Map();
  const mapLayers = new Set();
  const mockMap = {
    setCenter: (c) => { mapCalls.push({ type: 'setCenter', center: c }); },
    setZoom: (z) => { mapCalls.push({ type: 'setZoom', zoom: z }); },
    flyTo: (opt) => { mapCalls.push({ type: 'flyTo', opt }); },
    fitBounds: (bounds, opt) => { mapCalls.push({ type: 'fitBounds', bounds, opt }); },
    getCenter: () => ({ lng: 0, lat: 0 }),
    getZoom: () => 12,
    getSource: (id) => mapSources.get(id) || null,
    getLayer: (id) => mapLayers.has(id) ? { id } : null,
    addSource: (id, source) => {
      const storedSource = {
        ...source,
        setData: (data) => {
          storedSource.data = data;
          mapCalls.push({ type: 'setData', id });
        }
      };
      mapSources.set(id, storedSource);
      mapCalls.push({ type: 'addSource', id });
    },
    addLayer: (layer) => {
      mapLayers.add(layer.id);
      mapCalls.push({ type: 'addLayer', id: layer.id });
    },
    removeSource: (id) => {
      mapSources.delete(id);
      mapCalls.push({ type: 'removeSource', id });
    },
    removeLayer: (id) => {
      mapLayers.delete(id);
      mapCalls.push({ type: 'removeLayer', id });
    }
  };

  const domState = {};
  const createMockElement = (id) => {
    const el = {
      id: id,
      setAttribute: (k, v) => { domState[id + '_attr_' + k] = v; },
      removeAttribute: (k) => { delete domState[id + '_attr_' + k]; },
      addEventListener: () => {},
      appendChild: () => {},
      remove: () => { domState[id + '_removed'] = true; },
      classList: {
        add: (c) => { domState[id + '_class_' + c] = true; },
        remove: (c) => { delete domState[id + '_class_' + c]; },
        toggle: (c, state) => {
          if (state !== undefined) {
            if (state) domState[id + '_class_' + c] = true;
            else delete domState[id + '_class_' + c];
          } else {
            if (domState[id + '_class_' + c]) delete domState[id + '_class_' + c];
            else domState[id + '_class_' + c] = true;
          }
        }
      },
      childNodes: [],
      value: '',
      innerHTML: '',
      style: {}
    };
    return el;
  };

  const elementCache = {};
  const getCachedElement = (id) => {
    if (!elementCache[id]) {
      elementCache[id] = createMockElement(id);
    }
    return elementCache[id];
  };

  const mockDocument = {
    title: '',
    readyState: 'complete',
    querySelector: (sel) => {
      return getCachedElement(sel.replace(/[^a-zA-Z0-9]/g, '_'));
    },
    getElementById: (id) => getCachedElement(id),
    querySelectorAll: () => [],
    addEventListener: () => {},
    createElement: (tag) => getCachedElement('created_' + tag),
    body: createMockElement('body')
  };

  const mockFetch = async (url) => {
    return mockFetch.impl ? mockFetch.impl(url) : { ok: false, status: 404 };
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

  const markerCalls = [];
  let markerSequence = 0;
  const mockMaplibre = {
    Marker: function() {
      const markerId = ++markerSequence;
      const marker = {
        setLngLat: (coords) => {
          markerCalls.push({ type: 'setLngLat', markerId, coords });
          return marker;
        },
        addTo: () => {
          markerCalls.push({ type: 'addTo', markerId });
          return marker;
        },
        remove: () => {
          markerCalls.push({ type: 'remove', markerId });
        }
      };
      return marker;
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
    URLSearchParams: URLSearchParams,
    Date: Date,
    JSON: JSON,
    Number: Number,
    __testHarness_failPrepare: false,
    maplibregl: mockMaplibre
  };

  sandbox.window = sandbox;
  sandbox.document = mockDocument;

  const engineCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'mobilityEngine.js'), 'utf8');
  const controllerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui', 'mobilityController.js'), 'utf8');

  const context = vm.createContext(sandbox);
  vm.runInContext(engineCode, context);
  vm.runInContext(controllerCode, context);

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
        this._config.profile = profile.profile;
      }
      return realController.setProfile ? realController.setProfile(profile) : undefined;
    }
  };

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

  sandbox._map = mockMap;

  sandbox.__testState = {
    localStorageStore: localStorageStore,
    idbStores: idbStores,
    mapCalls: mapCalls,
    mapSources: mapSources,
    mapLayers: mapLayers,
    markerCalls: markerCalls,
    domState: domState,
    elementCache: elementCache
  };

  sandbox.captureTerritorialSnapshot = () => {
    return {
      CURRENT_CITY: sandbox.CURRENT_CITY ? JSON.stringify(sandbox.CURRENT_CITY) : null,
      BUS_STOPS: JSON.stringify(sandbox.BUS_STOPS),
      BIKE_STATIONS: JSON.stringify(sandbox.BIKE_STATIONS),
      LANDMARKS: JSON.stringify(sandbox.LANDMARKS),
      PROVIDERS: JSON.stringify(sandbox.PROVIDERS),
      TAXI_COMPANIES: JSON.stringify(sandbox.TAXI_COMPANIES),
      REMIS_COMPANIES: JSON.stringify(sandbox.REMIS_COMPANIES),
      FareRegistry: JSON.stringify(sandbox.FareRegistry),
      MC_origin: sandbox.MC ? JSON.stringify(sandbox.MC.getOrigin()) : null,
      MC_dest: sandbox.MC ? JSON.stringify(sandbox.MC.getDest()) : null,
      MC_estimations: sandbox.MC ? JSON.stringify(sandbox.MC.getEstimations()) : null,
      MC_originManual: sandbox.MC ? sandbox.MC.isOriginManual() : null,
      MC_searchTimerActive: sandbox.MC ? sandbox.MC.getSearchTimer() !== null : null,
      localStorage: JSON.stringify(localStorageStore),
      idbStores: JSON.stringify(idbStores),
      domState: JSON.stringify(domState),
      mapCalls: JSON.stringify(mapCalls),
      mapSources: JSON.stringify(Array.from(mapSources.keys()).sort()),
      mapLayers: JSON.stringify(Array.from(mapLayers).sort()),
      markerCalls: JSON.stringify(markerCalls)
    };
  };

  return sandbox;
}

describe('Multi-City Foundation v1 — Complete Integration, Isolation & Fallback Tests', () => {

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

  test('?city=rosario activates _default', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=rosario';
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, '_default', 'Unknown query city parameter must map to _default');
  });

  test('?city=santafe activates Santa Fe', () => {
    const runtime = loadRealRuntime();
    runtime.window.location.search = '?city=santafe';
    // Mock valid unexpired voy_last_pos timestamp inside Santa Fe bounds
    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70, timestamp: Date.now() - 1000 }));
    const resolvedCity = runtime.detectCity();
    assert.strictEqual(resolvedCity, 'santafe', '?city=santafe query parameter must map to santafe');
  });

  test('404 and network error produce different fallback pathways', async () => {
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

  test('_default profile contains NO territorial coordinates of Santa Fe or Buenos Aires (fully neutral [0,0] map)', () => {
    const defaultProfile = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'public', 'city_default.json'), 'utf8'));
    assert.strictEqual(defaultProfile.city_id, '_default');
    assert.deepStrictEqual(defaultProfile.map.center, [0, 0]);
    assert.strictEqual(defaultProfile.map.zoom, 2);
    assert.strictEqual(defaultProfile.map.bbox, undefined);
    assert.strictEqual(defaultProfile.map.viewbox, undefined);
    assert.strictEqual(defaultProfile.map.recentCenter, undefined);
  });

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

  test('unknown/unverified fares do not show $0', () => {
    const runtime = loadRealRuntime();
    runtime.FareRegistry.taxi = {
      diurno: { bajada: null, ficha: null, distFicha: 130 },
      nocturno: { bajada: null, ficha: null, distFicha: 130 }
    };

    const fare = runtime.computeTaxiFare(5, 12);
    assert.strictEqual(fare, null, 'Unverified fares must evaluate to null instead of $0');
  });

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

    await runtime._handleGpsPosition(-31.6256, -60.7087);
    assert.ok(santafeFetched, 'Late GPS fix inside Santa Fe bounding box must dynamically select and fetch Santa Fe');
  });

  test('GPS denegado maintains _default', () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = { city_id: '_default' };
    runtime._onGpsPermissionChange({ state: 'denied' });
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default', 'GPS denied must retain the _default city profile');
  });

  test('MC.init is executed exactly once, and MC.setProfile does not re-execute init', () => {
    const runtime = loadRealRuntime();
    assert.strictEqual(runtime.window._mcInitialized, false);

    if (!runtime.window._mcInitialized) {
      runtime.MC.init({ profile: { city_id: '_default' } });
      runtime.window._mcInitialized = true;
    }

    assert.strictEqual(runtime.window._mcInitialized, true);
    assert.strictEqual(runtime.MC.initCalls, 1);

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      preparedMemoryState: { favorites: {}, history: [], metrics: {} }
    });
    assert.strictEqual(runtime.MC.initCalls, 1, 'MC.init must not be called again when setProfile runs');
  });

  test('package and lockfiles remain completely intact', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    assert.strictEqual(pkg.name, 'nextjs_tailwind_shadcn_ts');
  });

  test('switching profiles does not mix memory (localStorage isolation)', () => {
    const runtime = loadRealRuntime();

    runtime.MC.init({
      profile: { city_id: '_default' },
      recentKey: 'voy_recent_searches',
      favsKey: 'voy_favorites',
      favMetricsKey: 'voy_fav_metrics',
      historyKey: 'voy_history',
      historyMetricsKey: 'voy_history_metrics'
    });
    runtime.MC.loadMemory();
    assert.strictEqual(runtime.MC.getFavorites().casa, null);

    runtime.MC.addFavorite('casa', 'Default Casa', 10, 10, 'Calle Falsa 123');
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Default Casa');

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      preparedMemoryState: { favorites: { casa: null }, history: [], metrics: {} }
    });
    assert.strictEqual(runtime.MC.getFavorites().casa, null, 'Previous city memory must be discarded/swapped out');

    runtime.MC.addFavorite('casa', 'Santafe Casa', 20, 20, 'Calle Verdadera 123');
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Santafe Casa');

    runtime.MC.setProfile({
      profile: { city_id: '_default' },
      preparedMemoryState: { favorites: { casa: { nombre: 'Default Casa', lat: 10, lon: 10 } }, history: [], metrics: {} }
    });
    assert.strictEqual(runtime.MC.getFavorites().casa.nombre, 'Default Casa', 'Switching back to _default must load _default favorites');
  });

  test('IndexedDB does not return records from another city (strict ID isolation)', async () => {
    const runtime = loadRealRuntime();

    runtime.MC.init({
      profile: { city_id: '_default' },
      recentKey: 'voy_recent_searches',
      favsKey: 'voy_favorites',
      favMetricsKey: 'voy_fav_metrics',
      historyKey: 'voy_history',
      historyMetricsKey: 'voy_history_metrics'
    });

    await runtime.MC.v5AddRecent({ lat: 1, lon: 1, name: 'Place Default' });
    let recentsDefault = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsDefault.length, 1);
    assert.strictEqual(recentsDefault[0].name, 'Place Default');

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      preparedMemoryState: { favorites: {}, history: [], metrics: {} }
    });
    let recentsSantaFe = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsSantaFe.length, 0, 'IndexedDB recents of Santa Fe must be clean on first load');

    await runtime.MC.v5AddRecent({ lat: 2, lon: 2, name: 'Place Santa Fe' });
    recentsSantaFe = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsSantaFe.length, 1);
    assert.strictEqual(recentsSantaFe[0].name, 'Place Santa Fe');

    runtime.MC.setProfile({
      profile: { city_id: '_default' },
      preparedMemoryState: { favorites: {}, history: [], metrics: {} }
    });
    recentsDefault = await runtime.MC.v5GetRecents();
    assert.strictEqual(recentsDefault.length, 1);
    assert.strictEqual(recentsDefault[0].name, 'Place Default', 'IndexedDB must strictly isolate records by city_id');
  });

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

  test('fallbackGeocode on _default has no bias, viewbox, bounded, or Santa Fe suffix contamination', async () => {
    const runtime = loadRealRuntime();
    runtime.showToast = () => {};
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

  // =====================================================================
  //  10 MANDATORY BEHAVIORAL SCENARIOS A-J
  // =====================================================================

  test('A. _default lento / santafe rápido', async () => {
    const runtime = loadRealRuntime();
    const dDefault = deferred();
    const dSantafe = deferred();

    runtime.fetch.impl = async (url) => {
      if (url === 'city_default.json') return dDefault.promise;
      if (url === 'city_santafe.json') return dSantafe.promise;
      return { ok: false, status: 404 };
    };

    const p1 = runtime.loadCityProfile('_default');
    const p2 = runtime.loadCityProfile('santafe');

    dSantafe.resolve({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60.7087, -31.6256], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res2 = await p2;
    assert.strictEqual(res2, true);
    assert.strictEqual(runtime.CURRENT_CITY.city_id, 'santafe');

    dDefault.resolve({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res1 = await p1;
    assert.strictEqual(res1, false);
    assert.strictEqual(runtime.CURRENT_CITY.city_id, 'santafe');
  });

  test('B. santafe lento / _default rápido', async () => {
    const runtime = loadRealRuntime();
    const dSantafe = deferred();
    const dDefault = deferred();

    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') return dSantafe.promise;
      if (url === 'city_default.json') return dDefault.promise;
      return { ok: false, status: 404 };
    };

    const p1 = runtime.loadCityProfile('santafe');
    const p2 = runtime.loadCityProfile('_default');

    dDefault.resolve({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res2 = await p2;
    assert.strictEqual(res2, true);
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default');

    dSantafe.resolve({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60.7087, -31.6256], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res1 = await p1;
    assert.strictEqual(res1, false);
    assert.strictEqual(runtime.CURRENT_CITY.city_id, '_default');
  });

  test('C. fallback viejo conserva su generación', async () => {
    const runtime = loadRealRuntime();
    const dSantafe1 = deferred();
    const dDefaultFallback = deferred();
    const dSantafe2 = deferred();

    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') {
        if (runtime.window.cityLoadGeneration === 1) return dSantafe1.promise;
        return dSantafe2.promise;
      }
      if (url === 'city_default.json') {
        return dDefaultFallback.promise;
      }
      return { ok: false, status: 404 };
    };

    const p1 = runtime.loadCityProfile('santafe');
    dSantafe1.resolve({ ok: false, status: 404 });

    await new Promise(r => setTimeout(r, 0));

    const p2 = runtime.loadCityProfile('santafe');

    dDefaultFallback.resolve({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res1 = await p1;
    assert.strictEqual(res1, false);

    dSantafe2.resolve({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe 2',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60.7087, -31.6256], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    const res2 = await p2;
    assert.strictEqual(res2, true);
    assert.strictEqual(runtime.CURRENT_CITY.name, 'Santa Fe 2');
  });

  test('D. stale result tiene cero side effects', async () => {
    const runtime = loadRealRuntime();
    const dSantafe = deferred();
    const dDefault = deferred();

    runtime.CURRENT_CITY = {
      city_id: '_default',
      name: 'Desconocida',
      displayName: 'Ciudad Desconocida',
      map: { center: [0, 0], zoom: 2 }
    };
    runtime.BUS_STOPS.push({ linea: '1', lat: 1, lon: 1 });
    runtime.MC.setOrigin(10, 10, 'Origen Inicial', 'manual');
    runtime.MC.setDest(11, 11, 'Destino Inicial', 'search');
    runtime.MC.setEstimations([{ mode: 'taxi', price: 123 }]);
    runtime.__testState.idbStores.meta.push({ key: 'sentinel', value: 'unchanged' });
    runtime.document.getElementById('destInput').value = 'Destino Inicial';
    runtime.document.getElementById('destDropdown').innerHTML = '<div>Resultado</div>';
    runtime.updateOriginUI();
    runtime.updateMapMarkers();

    const snapshot = runtime.captureTerritorialSnapshot();

    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') return dSantafe.promise;
      if (url === 'city_default.json') return dDefault.promise;
      return { ok: false, status: 404 };
    };

    const p1 = runtime.loadCityProfile('santafe');
    const p2 = runtime.loadCityProfile('_default');

    dSantafe.resolve({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe Obsoleto',
        displayName: 'Santa Fe Obsoleto, Argentina',
        map: { center: [-60, -31], zoom: 13 },
        providers: { x: 1 },
        fareRegistry: { y: 2 }
      })
    });

    assert.strictEqual(await p1, false);

    const after = runtime.captureTerritorialSnapshot();
    assert.deepStrictEqual(after, snapshot);

    dDefault.resolve({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });
    assert.strictEqual(await p2, true);
  });

  test('E. fallo de preparación preserva el contexto anterior', async () => {
    const runtime = loadRealRuntime();

    runtime.fetch.impl = async () => ({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });
    await runtime.loadCityProfile('_default');

    const before = runtime.captureTerritorialSnapshot();

    // Enable sandbox-only test failure programmatically
    runtime.window.__testHarness_failPrepare = true;

    runtime.fetch.impl = async () => ({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60, -31], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    const result = await runtime.loadCityProfile('santafe');

    const after = runtime.captureTerritorialSnapshot();

    assert.strictEqual(result, false);
    assert.deepStrictEqual(after, before);
  });

  test('F. legacy no migra hacia _default', () => {
    const runtime = loadRealRuntime();

    runtime.localStorage.setItem('voy_favorites', JSON.stringify({ casa: { lat: 1, lon: 1, name: 'Mi Casa' } }));

    runtime.MC.init({
      profile: { city_id: '_default' },
      recentKey: 'voy_recent_searches',
      favsKey: 'voy_favorites',
      favMetricsKey: 'voy_fav_metrics',
      historyKey: 'voy_history',
      historyMetricsKey: 'voy_history_metrics'
    });
    runtime.MC.loadMemory();

    assert.strictEqual(runtime.localStorage.getItem('voy_memory__default'), null);
    assert.strictEqual(runtime.localStorage.getItem('voy_memory_legacy_migrated_v1'), null);
    assert.ok(runtime.localStorage.getItem('voy_favorites'));
  });

  test('G. legacy migra una sola vez hacia santafe', async () => {
    const runtime = loadRealRuntime();

    runtime.localStorage.setItem(
      'voy_favorites',
      JSON.stringify({
        casa: {
          nombre: 'Casa legacy',
          lat: -31.62,
          lon: -60.70,
          direccion: 'Dirección legacy'
        },
        trabajo: null,
        custom: []
      })
    );

    runtime.fetch.impl = async () => ({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60.7087, -31.6256], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    await runtime.loadCityProfile('santafe');

    assert.strictEqual(
      runtime.MC.getFavorites().casa.nombre,
      'Casa legacy'
    );

    assert.ok(runtime.localStorage.getItem('voy_memory_santafe'));
    assert.strictEqual(
      runtime.localStorage.getItem('voy_memory_legacy_migrated_v1'),
      '1'
    );

    assert.strictEqual(
      runtime.localStorage.getItem('voy_favorites'),
      null
    );

    const firstStoredMemory = runtime.localStorage.getItem('voy_memory_santafe');

    await runtime.loadCityProfile('_default');
    await runtime.loadCityProfile('santafe');

    assert.strictEqual(
      runtime.localStorage.getItem('voy_memory_santafe'),
      firstStoredMemory
    );
  });

  test('H. voy_last_pos sin timestamp se ignora', () => {
    const runtime = loadRealRuntime();

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70 }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70, timestamp: 'invalid' }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: 91, lon: -60.70, timestamp: Date.now() }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -181, timestamp: Date.now() }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70, timestamp: Date.now() - 31 * 60 * 1000 }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70, timestamp: Date.now() + 6 * 60 * 1000 }));
    assert.strictEqual(runtime.detectCity(), '_default');

    runtime.localStorage.setItem('voy_last_pos', JSON.stringify({ lat: -31.62, lon: -60.70, timestamp: Date.now() - 10 * 1000 }));
    assert.strictEqual(runtime.detectCity(), 'santafe');
  });

  test('I. preferredProvider y lastTransport se aíslan por cityId', async () => {
    const runtime = loadRealRuntime();

    runtime.MC.init({
      profile: { city_id: '_default' },
      recentKey: 'voy_recent_searches',
      favsKey: 'voy_favorites',
      favMetricsKey: 'voy_fav_metrics',
      historyKey: 'voy_history',
      historyMetricsKey: 'voy_history_metrics'
    });
    // Create initial memory structure in localStorage so v5LogTrip can read it during setProfile fallback
    runtime.localStorage.setItem('voy_memory__default', JSON.stringify({
      favorites: { casa: null, trabajo: null, custom: [] },
      history: [],
      metrics: {}
    }));
    runtime.localStorage.setItem('voy_memory_santafe', JSON.stringify({
      favorites: { casa: null, trabajo: null, custom: [] },
      history: [],
      metrics: {}
    }));

    await runtime.MC.v5LogTrip({ lat: 1, lon: 1 }, { lat: 2, lon: 2 }, 'car', 'uber');

    let lastTransportDef = await runtime.MC.v5GetMeta('lastTransport');
    let preferredProviderDef = await runtime.MC.v5GetMeta('preferredProvider');

    assert.strictEqual(lastTransportDef, 'car');
    assert.strictEqual(preferredProviderDef, 'uber');

    runtime.MC.setProfile({
      profile: { city_id: 'santafe' },
      preparedMemoryState: { favorites: {}, history: [], metrics: {} }
    });
    await runtime.MC.v5LogTrip({ lat: 10, lon: 10 }, { lat: 20, lon: 20 }, 'bus', 'didi');

    let lastTransportSF = await runtime.MC.v5GetMeta('lastTransport');
    let preferredProviderSF = await runtime.MC.v5GetMeta('preferredProvider');

    assert.strictEqual(lastTransportSF, 'bus');
    assert.strictEqual(preferredProviderSF, 'didi');

    runtime.MC.setProfile({
      profile: { city_id: '_default' },
      preparedMemoryState: { favorites: {}, history: [], metrics: {} }
    });
    lastTransportDef = await runtime.MC.v5GetMeta('lastTransport');
    preferredProviderDef = await runtime.MC.v5GetMeta('preferredProvider');

    assert.strictEqual(lastTransportDef, 'car');
    assert.strictEqual(preferredProviderDef, 'uber');
    assert.deepStrictEqual(
      runtime.__testState.idbStores.meta.map((row) => row.key).sort(),
      [
        'lastTransport__default',
        'lastTransport_santafe',
        'preferredProvider__default',
        'preferredProvider_santafe'
      ]
    );
  });

  test('J. cambio de ciudad limpia estado, DOM, búsqueda, rutas y marcadores', async () => {
    const runtime = loadRealRuntime();
    let searchFetches = 0;

    runtime.MC.init({
      profile: { city_id: '_default' },
      recentKey: 'voy_recent_searches',
      favsKey: 'voy_favorites',
      favMetricsKey: 'voy_fav_metrics',
      historyKey: 'voy_history',
      historyMetricsKey: 'voy_history_metrics'
    });
    runtime.MC.setOrigin(1, 1, 'My Origin', 'manual');
    runtime.MC.setOriginManual(true);
    runtime.MC.setDest(2, 2, 'My Dest', 'search');
    runtime.MC.setEstimations([{ mode: 'car', price: 100 }]);

    const destInput = runtime.document.getElementById('destInput');
    const destDropdown = runtime.document.getElementById('destDropdown');
    const originPill = runtime.document.getElementById('originPill');
    const originText = runtime.document.getElementById('opText');
    assert.notStrictEqual(destInput, destDropdown);
    assert.notStrictEqual(originPill, originText);

    destInput.value = 'My Dest';
    destDropdown.innerHTML = '<div>Cached result</div>';
    destDropdown.classList.remove('hidden');
    runtime.updateOriginUI();

    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') {
        return {
          ok: true,
          json: async () => ({
            city_id: 'santafe',
            name: 'Santa Fe',
            displayName: 'Santa Fe, Argentina',
            map: { center: [-60.7087, -31.6256], zoom: 13 },
            providers: {},
            fareRegistry: {}
          })
        };
      }
      if (String(url).includes('nominatim')) {
        searchFetches++;
        return {
          ok: true,
          json: async () => [{ place_id: 1, lat: '-31.62', lon: '-60.70', display_name: 'Cached result' }]
        };
      }
      return { ok: false, status: 404 };
    };

    await runtime.MC.searchNominatim('cache probe');
    await runtime.MC.searchNominatim('cache probe');
    assert.strictEqual(searchFetches, 1, 'precondition: the search result is cached');

    runtime.MC.setSearchTimer(setTimeout(() => {}, 60_000));
    runtime.updateMapMarkers();
    runtime.__testState.mapSources.set('bus-route-src', { data: {} });
    runtime.__testState.mapLayers.add('bus-route-shadow');
    runtime.__testState.mapLayers.add('bus-route-line');

    assert.ok(runtime.MC.getOrigin());
    assert.ok(runtime.MC.getDest());
    assert.ok(runtime.MC.getEstimations());
    assert.strictEqual(runtime.MC.isOriginManual(), true);
    assert.notStrictEqual(runtime.MC.getSearchTimer(), null);
    assert.ok(runtime.__testState.mapSources.has('route-src'));
    assert.ok(runtime.__testState.mapLayers.has('route-shadow'));
    assert.ok(runtime.__testState.mapLayers.has('route-line'));
    assert.strictEqual(
      runtime.__testState.markerCalls.filter((call) => call.type === 'addTo').length,
      2
    );

    assert.strictEqual(await runtime.loadCityProfile('santafe'), true);

    assert.strictEqual(runtime.MC.getOrigin(), null);
    assert.strictEqual(runtime.MC.getDest(), null);
    assert.strictEqual(runtime.MC.getEstimations(), null);
    assert.strictEqual(runtime.MC.isOriginManual(), false);
    assert.strictEqual(runtime.MC.getSearchTimer(), null);
    assert.strictEqual(destInput.value, '');
    assert.strictEqual(destDropdown.innerHTML, '');
    assert.strictEqual(runtime.__testState.domState.destDropdown_class_hidden, true);
    assert.strictEqual(runtime.__testState.domState.originPill_class_show, undefined);
    assert.strictEqual(originText.textContent, 'Ubicándote…');
    assert.strictEqual(runtime.__testState.mapSources.has('route-src'), false);
    assert.strictEqual(runtime.__testState.mapSources.has('bus-route-src'), false);
    assert.strictEqual(runtime.__testState.mapLayers.has('route-shadow'), false);
    assert.strictEqual(runtime.__testState.mapLayers.has('route-line'), false);
    assert.strictEqual(runtime.__testState.mapLayers.has('bus-route-shadow'), false);
    assert.strictEqual(runtime.__testState.mapLayers.has('bus-route-line'), false);
    assert.strictEqual(
      runtime.__testState.markerCalls.filter((call) => call.type === 'remove').length,
      2
    );

    await runtime.MC.searchNominatim('cache probe');
    assert.strictEqual(searchFetches, 2, 'city switch must empty the real search cache');
  });

  test('Late GPS committed guard behavior', async () => {
    const runtime = loadRealRuntime();
    const dSantafe = deferred();
    const dDefault = deferred();
    runtime.CURRENT_CITY = { city_id: '_default' };

    runtime.fetch.impl = async (url) => {
      if (url === 'city_santafe.json') return dSantafe.promise;
      if (url === 'city_default.json') return dDefault.promise;
      return { ok: false, status: 404 };
    };

    const productionLoadCityProfile = runtime.loadCityProfile;
    let lateGpsLoad;
    runtime.loadCityProfile = (cityId) => {
      const promise = productionLoadCityProfile(cityId);
      if (cityId === 'santafe') lateGpsLoad = promise;
      return promise;
    };

    runtime._handleGpsPosition(-31.6256, -60.7087);
    assert.ok(lateGpsLoad, 'late GPS must start the Santa Fe profile load');
    const beforeStaleResolution = runtime.captureTerritorialSnapshot();

    const newerLoad = productionLoadCityProfile('_default');

    dSantafe.resolve({
      ok: true,
      json: async () => ({
        city_id: 'santafe',
        name: 'Santa Fe stale',
        displayName: 'Santa Fe, Argentina',
        map: { center: [-60.7087, -31.6256], zoom: 13 },
        providers: {},
        fareRegistry: {}
      })
    });

    assert.strictEqual(await lateGpsLoad, false);
    await Promise.resolve();

    assert.deepStrictEqual(runtime.captureTerritorialSnapshot(), beforeStaleResolution);
    assert.strictEqual(runtime.MC.getOrigin(), null);
    assert.strictEqual(runtime.MC.getEstimations(), null);

    dDefault.resolve({
      ok: true,
      json: async () => ({
        city_id: '_default',
        name: 'Desconocida',
        displayName: 'Ciudad Desconocida',
        map: { center: [0, 0], zoom: 2 },
        providers: {},
        fareRegistry: {}
      })
    });

    assert.strictEqual(await newerLoad, true);
  });

});
