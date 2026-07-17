/* eslint-disable @typescript-eslint/no-require-imports */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Helper to load worker classes
function loadWorkerAndCoordinator() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
    .replace('export class NominatimCoordinator', 'class NominatimCoordinator')
    .replace(/export default worker;/, 'globalThis.__Coordinator = NominatimCoordinator; globalThis.__worker = worker;');
  const context = vm.createContext({
    URL, URLSearchParams, Request, Response, Headers, TextEncoder, Uint8Array,
    AbortController, crypto, console, setTimeout, clearTimeout, fetch: async () => new Response('[]'),
    caches: { default: { async match() {}, async put() {} } }
  });
  vm.runInContext(source, context, { filename: 'worker.js' });
  return { Coordinator: context.__Coordinator, worker: context.__worker };
}

// Robust loader of the real codebase inside a controlled mock sandbox context (adapted from multiCity.test.js)
function loadRealRuntime() {
  const htmlPath = path.join(__dirname, '..', 'public', 'VOY-Lite.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const mainScriptStart = html.indexOf('// ===================== V7 VERSION PIN');
  const scriptStart = html.indexOf('<script>', mainScriptStart - 50);
  const scriptEnd = html.indexOf('</script>', scriptStart);
  let code = html.substring(scriptStart + 8, scriptEnd);

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
        transaction: function(storeName) {
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

  const mockMaplibre = {
    Marker: function() {
      return {
        setLngLat: () => { return this; },
        addTo: () => { return this; },
        remove: () => {}
      };
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
    maplibregl: mockMaplibre
  };

  sandbox.window = sandbox;
  sandbox.document = mockDocument;

  const engineCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'mobilityEngine.js'), 'utf8');
  const resolverCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'core', 'destinationResolver.js'), 'utf8');
  const controllerCode = fs.readFileSync(path.join(__dirname, '..', 'public', 'ui', 'mobilityController.js'), 'utf8');

  const context = vm.createContext(sandbox);
  vm.runInContext(engineCode, context);
  vm.runInContext(resolverCode, context);
  vm.runInContext(controllerCode, context);
  vm.runInContext(code, context);

  sandbox._map = mockMap;

  return sandbox;
}

describe('VOY Destination Resolution V2 - Review Blockers Tests', () => {

  test('/api/geocode accepts _default', async () => {
    const { worker } = loadWorkerAndCoordinator();
    const env = {
      VOY_GEOCODE_PROVIDER: 'nominatim',
      VOY_GEOCODE_PROVIDER_URL: 'https://nominatim.openstreetmap.org/search',
      NOMINATIM_COORDINATOR: {
        idFromName: () => 'global-id',
        get: () => {
          return {
            fetch: async (req) => {
              return new Response(JSON.stringify({ query: 'Candioti', cityId: '_default', results: [] }));
            }
          };
        }
      }
    };
    const req = new Request('https://voy.test/api/geocode?q=Candioti&city=_default');
    const res = await worker.fetch(req, env, { waitUntil: () => {} });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.cityId, '_default');
  });

  test('_default does not add viewbox nor bounded', () => {
    const { Coordinator } = loadWorkerAndCoordinator();
    const state = { storage: { get: async () => null, put: async () => {}, delete: async () => {} } };
    const coord = new Coordinator(state, {});
    const city = { viewbox: null, bbox: null };

    // Bounded search payload
    const payload = {
      cacheIdentity: 'v2|nominatim|_default|bounded|candioti',
      query: 'Candioti',
      cityId: '_default',
      wide: false,
      provider: 'nominatim'
    };

    const urlStr = coord._providerUrl('https://nominatim.test/search', payload, city);
    const url = new URL(urlStr);

    assert.equal(url.searchParams.get('q'), 'Candioti'); // No suffix appended
    assert.equal(url.searchParams.get('countrycodes'), 'ar');
    assert.equal(url.searchParams.get('viewbox'), null);
    assert.equal(url.searchParams.get('bounded'), null);
  });

  test('GPS denegado / perfil _default retains remote search functionality', async () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = {
      city_id: '_default',
      name: 'Desconocida',
      displayName: 'Ciudad Desconocida',
      map: { center: [0, 0], zoom: 2 }
    };
    runtime._onGpsPermissionChange({ state: 'denied' });

    let fetchedUrl = '';
    runtime.fetch.impl = async (url) => {
      fetchedUrl = url;
      return {
        ok: true,
        json: async () => ({ results: [{ lat: -31.6, lon: -60.7, name: 'Candioti', display_name: 'Candioti, Argentina' }] })
      };
    };

    await runtime.fallbackGeocode('Candioti');
    assert.ok(fetchedUrl.includes('/api/geocode?q=Candioti&city=_default'));
  });

  test('Bus stop appears by name, line or street in local search', () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: { city_id: 'santafe' },
      busStops: [
        { linea: '14', nombre: 'Terminal de Omnibus', calles: 'Belgrano y Freyre', lat: -31.64, lon: -60.70 }
      ],
      bikeStations: [],
      landmarks: []
    });

    // Search by name
    const byName = runtime.MC.searchLocal('Terminal');
    assert.ok(byName.length > 0);
    assert.equal(byName[0].type, 'bus');

    // Search by line
    const byLine = runtime.MC.searchLocal('14');
    assert.ok(byLine.length > 0);
    assert.equal(byLine[0].type, 'bus');

    // Search by street
    const byStreet = runtime.MC.searchLocal('Belgrano');
    assert.ok(byStreet.length > 0);
    assert.equal(byStreet[0].type, 'bus');
  });

  test('Bike station appears by name or street in local search', () => {
    const runtime = loadRealRuntime();
    runtime.MC.init({
      profile: { city_id: 'santafe' },
      busStops: [],
      bikeStations: [
        { nombre: 'Plaza Constituyentes', calles: 'Rivadavia y Tucumán', lat: -31.64, lon: -60.70 }
      ],
      landmarks: []
    });

    // Search by name
    const byName = runtime.MC.searchLocal('Constituyentes');
    assert.ok(byName.length > 0);
    assert.equal(byName[0].type, 'bike');

    // Search by street
    const byStreet = runtime.MC.searchLocal('Rivadavia');
    assert.ok(byStreet.length > 0);
    assert.equal(byStreet[0].type, 'bike');
  });

  test('Click on "Buscar más resultados" generates request with wide=1', async () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = {
      city_id: 'santafe',
      map: { bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } }
    };

    let requestedUrl = '';
    runtime.fetch.impl = async (url) => {
      requestedUrl = url;
      return { ok: true, json: async () => ({ results: [] }) };
    };

    await runtime.fallbackGeocode('Candioti', { wide: true });
    assert.ok(requestedUrl.includes('wide=1'));
  });

  test('Cache keys for bounded and wide are separate', async () => {
    const runtime = loadRealRuntime();
    runtime.CURRENT_CITY = { city_id: 'santafe' };

    let fetchedUrls = [];
    runtime.fetch.impl = async (url) => {
      fetchedUrls.push(url);
      return { ok: true, json: async () => ({ results: [] }) };
    };

    await runtime.MC.searchRemote('Belgrano');
    await runtime.MC.searchRemote('Belgrano', { wide: true });

    assert.equal(fetchedUrls.length, 2);
    assert.ok(!fetchedUrls[0].includes('wide=1'));
    assert.ok(fetchedUrls[1].includes('wide=1'));
  });

  test('DO Alarm sweep deletes expired entries, preserves unexpired, and handles continuation', async () => {
    const { Coordinator } = loadWorkerAndCoordinator();
    const store = new Map();
    const storage = {
      async get(key) { return store.get(key); },
      async put(key, val) { store.set(key, val); },
      async delete(key) { store.delete(key); },

      // Alarm mock
      alarmTime: null,
      async getAlarm() { return this.alarmTime; },
      async setAlarm(ts) { this.alarmTime = ts; },

      // List mock
      async list(options) {
        const prefix = options.prefix;
        const limit = options.limit;
        const start = options.start;
        const results = new Map();

        let foundStart = !start;
        let count = 0;
        for (const [k, v] of store.entries()) {
          if (!k.startsWith(prefix)) continue;
          if (!foundStart) {
            if (k === start) {
              foundStart = true;
            } else {
              continue;
            }
          }
          results.set(k, v);
          count++;
          if (count >= limit) break;
        }
        return results;
      }
    };

    let now = 1000;
    const coord = new Coordinator({ storage }, {
      __clock: () => now
    });

    // Seed storage with 1 expired entry and 1 valid entry
    await storage.put('cache:expired', { expiresAt: 500, body: {} });
    await storage.put('cache:valid', { expiresAt: 2000, body: {} });

    await coord.alarm();

    assert.equal(store.has('cache:expired'), false, 'Expired entry must be deleted');
    assert.equal(store.has('cache:valid'), true, 'Valid entry must be kept');
    assert.equal(storage.alarmTime, 2000, 'Alarm must be rescheduled for nearest unexpired entry expiration');

    // Test pagination/continuation
    // Add 50 more unexpired entries
    for (let i = 0; i < 50; i++) {
      await storage.put(`cache:many_${i}`, { expiresAt: 3000 + i, body: {} });
    }

    await coord.alarm();

    assert.equal(store.has('sweepCursor'), true, 'Continuator sweepCursor must be stored when list hits limit (50)');
    assert.equal(storage.alarmTime, now + 1000, 'Continuation alarm must be scheduled soon');
  });

  test('Coordinate validity: reject invalid coordinates in remote candidate processing and accept legit numeric zero', () => {
    const { worker } = loadWorkerAndCoordinator();

    // In worker.js, _remoteCandidate processes items.
    // Let's call NominatimCoordinator._remoteCandidate or equivalent.
    // We can define mock items and test `_remoteCandidate` directly.
    // Wait, let's load worker source to extract/run _remoteCandidate or test it via integration.
    // Let's test using vm context.
    const context = vm.createContext({
      Number, String, Math,
      _isValidCoordinateValue: null,
      _remoteCandidate: null,
      _geocodePrecision: () => 'poi'
    });
    const src = fs.readFileSync(path.join(__dirname, '..', 'worker.js'), 'utf8')
      .replace('export class NominatimCoordinator', 'class NominatimCoordinator')
      .replace(/export default worker;/, '');
    vm.runInContext(src, context);

    const check = context._isValidCoordinateValue;
    const process = context._remoteCandidate;

    // Coordinate validation unit tests
    assert.equal(check(null), false, 'null is invalid');
    assert.equal(check(undefined), false, 'undefined is invalid');
    assert.equal(check(''), false, 'empty string is invalid');
    assert.equal(check('   '), false, 'spaces string is invalid');
    assert.equal(check(NaN), false, 'NaN is invalid');
    assert.equal(check(Infinity), false, 'Infinity is invalid');

    assert.equal(check(0), true, 'numeric 0 is valid');
    assert.equal(check('0'), true, 'string "0" is valid');
    assert.equal(check(-31.62), true, 'legitimate negative numeric value is valid');

    // Test process with null lat/lon
    const badCandidate = process({ lat: null, lon: '', display_name: 'test' }, 'santafe');
    assert.equal(badCandidate.lat, null, 'null lat becomes null, not 0');
    assert.equal(badCandidate.lon, null, 'empty lon becomes null, not 0');

    // Test process with legitimate zero
    const zeroCandidate = process({ lat: 0, lon: '0', display_name: 'test' }, 'santafe');
    assert.equal(zeroCandidate.lat, 0, 'lat 0 is preserved');
    assert.equal(zeroCandidate.lon, 0, 'lon "0" is converted to numeric 0');
  });

});
