import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../public/', import.meta.url);
const legacyDefault = JSON.parse(await readFile(new URL('city_default.json', root), 'utf8'));
const legacySantaFe = JSON.parse(await readFile(new URL('city_santafe.json', root), 'utf8'));
const verifiedAt = '2026-07-17';
const flags = {
  ai_copilot: false,
  voice_input: false,
  qr_stops: false,
  web_push: false,
  live_transit: false,
  weather_context: false,
  price_history: false
};

async function writeJson(relativePath, value) {
  const url = new URL(relativePath, root);
  await mkdir(new URL('./', url), { recursive: true });
  await writeFile(url, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

await writeJson('cities/_default/profile.json', {
  schema_version: 1,
  city_id: '_default',
  slug: '_default',
  name: 'Argentina',
  display_name: 'Argentina',
  country: 'AR',
  center: [-64.0, -34.0],
  zoom: 4,
  bbox: null,
  timezone: 'America/Argentina/Buenos_Aires',
  coverage_level: 'national_basic',
  coverage_notes: [
    'Geocodificación nacional sin datos locales inventados.',
    'Precios, paradas, bicicletas y disponibilidad por ciudad se muestran sólo cuando existen perfiles territoriales.'
  ],
  source: 'VOY national fallback profile',
  verified_at: verifiedAt
});
await writeJson('cities/_default/providers.json', {
  schema_version: 1,
  city_id: '_default',
  providers: legacyDefault.providers,
  taxi_companies: [],
  remis_companies: [],
  source: 'No national provider availability asserted',
  verified_at: verifiedAt,
  status: 'national_basic'
});
await writeJson('cities/_default/transport.json', {
  schema_version: 1,
  city_id: '_default',
  bus_stops: [],
  bike_stations: [],
  landmarks: [],
  source: 'No national local-transport dataset',
  verified_at: verifiedAt,
  status: 'not_available'
});
await writeJson('cities/_default/fares.json', {
  schema_version: 1,
  city_id: '_default',
  fare_registry: legacyDefault.fareRegistry,
  source: 'No national local fare asserted',
  verified_at: verifiedAt,
  status: 'not_available'
});
await writeJson('cities/_default/feature_flags.json', {
  schema_version: 1,
  city_id: '_default',
  flags,
  verified_at: verifiedAt
});

await writeJson('cities/santa-fe/profile.json', {
  schema_version: 1,
  city_id: 'santafe',
  slug: 'santa-fe',
  name: legacySantaFe.name,
  display_name: legacySantaFe.displayName,
  country: 'AR',
  center: legacySantaFe.map.center,
  zoom: legacySantaFe.map.zoom,
  bbox: legacySantaFe.map.bbox,
  viewbox: legacySantaFe.map.viewbox,
  recent_center: legacySantaFe.map.recentCenter,
  timezone: 'America/Argentina/Cordoba',
  coverage_level: 'partial',
  coverage_notes: [
    'Tarifas reguladas verificadas.',
    'Disponibilidad de proveedores preservada del registro existente.',
    'Paradas y estaciones curadas pendientes de trazabilidad oficial completa.'
  ],
  source: 'VOY curated Santa Fe profile',
  verified_at: verifiedAt
});
await writeJson('cities/santa-fe/providers.json', {
  schema_version: 1,
  city_id: 'santafe',
  providers: legacySantaFe.providers,
  taxi_companies: legacySantaFe.taxiCompanies,
  remis_companies: legacySantaFe.remisCompanies,
  source: 'VOY legacy city provider registry; source hardening pending',
  verified_at: null,
  status: 'partial'
});
await writeJson('cities/santa-fe/transport.json', {
  schema_version: 1,
  city_id: 'santafe',
  bus_stops: legacySantaFe.busStops,
  bike_stations: legacySantaFe.bikeStations,
  landmarks: legacySantaFe.landmarks,
  source: 'VOY curated Santa Fe transport dataset',
  verified_at: null,
  status: 'partial'
});
await writeJson('cities/santa-fe/fares.json', {
  schema_version: 1,
  city_id: 'santafe',
  fare_registry: legacySantaFe.fareRegistry,
  source: 'Municipal resolutions and versioned VOY fare registry',
  verified_at: verifiedAt,
  status: 'verified_regulated_fares'
});
await writeJson('cities/santa-fe/feature_flags.json', {
  schema_version: 1,
  city_id: 'santafe',
  flags,
  verified_at: verifiedAt
});

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`${label}: expected text not found`);
  if (source.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`${label}: expected exactly once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceBetween(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`${label}: start marker not found`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`${label}: end marker not found`);
  return source.slice(0, start) + replacement + source.slice(end);
}

const htmlUrl = new URL('VOY-Lite.html', root);
let html = await readFile(htmlUrl, 'utf8');
html = replaceExactlyOnce(
  html,
  '<script src="core/mobilityEngine.js?v=12"></script>',
  '<script src="core/cityPlatform.js?v=1"></script>\n<script src="core/mobilityEngine.js?v=12"></script>',
  'city platform asset'
);

html = replaceBetween(
  html,
  'function isValidCitySchema(data, expectedCityId) {',
  'function detectCity() {',
  `function isValidCitySchema(data, expectedCityId) {
  return Boolean(window.VoyCityPlatform) && VoyCityPlatform.isValidComposedCity(data, expectedCityId);
}

`,
  'schema validator'
);

html = replaceExactlyOnce(
  html,
  `  if (cityId) {
    cityId = cityId.toLowerCase();
    if (cityId === 'santafe' || cityId === 'santa_fe') {
      return 'santafe';
    }
    return '_default';
  }`,
  `  if (cityId) {
    return window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';
  }`,
  'query city normalization'
);

const emergency = `function createEmergencyDefault(cityId) {
  var normalized = window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';
  var isSF = normalized === 'santafe';
  return {
    schemaVersion: 1,
    city_id: normalized,
    slug: isSF ? 'santa-fe' : '_default',
    name: isSF ? 'Santa Fe' : 'Argentina',
    displayName: isSF ? 'Santa Fe, Argentina' : 'Argentina',
    country: 'AR',
    timezone: isSF ? 'America/Argentina/Cordoba' : 'America/Argentina/Buenos_Aires',
    coverageLevel: isSF ? 'partial' : 'national_basic',
    coverageNotes: ['emergency_offline_profile'],
    map: isSF ? {
      center: [-60.7087, -31.6256],
      zoom: 13,
      bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 },
      viewbox: '-60.75,-31.67,-60.65,-31.57',
      recentCenter: [-60.70, -31.61]
    } : {
      center: [-64, -34],
      zoom: 4,
      bbox: null
    },
    busStops: [],
    bikeStations: [],
    landmarks: [],
    providers: {
      uber: {name:'Uber',available:false,color:'#111111',category:'app',verified:false},
      didi: {name:'DiDi',available:false,color:'#FF6B00',category:'app',verified:false},
      maxim: {name:'Maxim',available:false,color:'#7C3AED',category:'app',verified:false},
      cabify: {name:'Cabify',available:false,color:'#00A99D',category:'app',verified:false}
    },
    taxiCompanies: [],
    remisCompanies: [],
    fareRegistry: {
      taxi: { diurno: {bajada:null,ficha:null,distFicha:130}, nocturno: {bajada:null,ficha:null,distFicha:130}, source:'Sin verificar', status:'not_available' },
      remis: { diurno: {bajada:null,ficha:null,distFicha:130}, nocturno: {bajada:null,ficha:null,distFicha:130}, source:'Sin verificar', status:'not_available' },
      bus: { sube:null, cash:null, source:'Sin verificar', status:'not_available' },
      apps: {
        uber: {base:null,km:null,min:null,minFare:null,source:'Sin verificar',status:'not_available'},
        didi: {base:null,km:null,min:null,minFare:null,source:'Sin verificar',status:'not_available'},
        maxim: {base:null,km:null,min:null,minFare:null,source:'Sin verificar',status:'not_available'},
        cabify: {base:null,km:null,min:null,minFare:null,source:'Sin verificar',status:'not_available'}
      }
    },
    featureFlags: Object.assign({}, window.VoyCityPlatform ? VoyCityPlatform.DEFAULT_FLAGS : {}),
    dataFreshness: {},
    dataSources: { profile: 'emergency' }
  };
}

`;
html = replaceBetween(html, 'function createEmergencyDefault(cityId) {', 'function updateCityUI() {', emergency, 'emergency profile');

const loader = `async function loadCityProfileForGeneration(cityId, generation) {
  if (generation !== cityLoadGeneration) return false;
  cityId = window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';

  var controller = new AbortController();
  var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
  var data = null;
  var profileSource = 'remote';

  try {
    if (!window.VoyCityPlatform) throw new Error('city_platform_unavailable');
    data = await VoyCityPlatform.loadCity(cityId, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (generation !== cityLoadGeneration) return false;
    if (!isValidCitySchema(data, cityId)) throw new Error('invalid_composed_city');
  } catch (error) {
    clearTimeout(timeoutId);
    if (generation !== cityLoadGeneration) return false;
    console.warn('[loadCityProfile] Versioned city load failed for ' + cityId, error);
    data = getValidCache(cityId);
    profileSource = data ? 'cache' : 'emergency';
    if (!data && cityId !== '_default') {
      return loadCityProfileForGeneration('_default', generation);
    }
    if (!data) data = createEmergencyDefault('_default');
  }

  if (generation !== cityLoadGeneration) return false;
  var preparedMemoryState = prepareMemoryStateForCity(data.city_id);
  var nextContext = {
    profile: data,
    busStops: data.busStops || [],
    bikeStations: data.bikeStations || [],
    landmarks: data.landmarks || [],
    providers: data.providers || {},
    taxiCompanies: data.taxiCompanies || [],
    remisCompanies: data.remisCompanies || [],
    fareRegistry: data.fareRegistry || {},
    preparedMemoryState: preparedMemoryState
  };

  if (profileSource === 'remote') {
    try {
      localStorage.setItem('voy_city_cache_v2_' + data.city_id, JSON.stringify(data));
    } catch (cacheWriteErr) {}
  }

  var memKey = 'voy_memory_' + data.city_id;
  if (!localStorage.getItem(memKey)) {
    try { localStorage.setItem(memKey, JSON.stringify(preparedMemoryState)); } catch (e) {}
  }

  if (generation !== cityLoadGeneration) return false;
  commitCityContext(nextContext);
  return true;
}

`;
html = replaceBetween(html, 'async function loadCityProfileForGeneration(cityId, generation) {', 'function getValidCache(cityId) {', loader, 'city loader');

const cache = `function getValidCache(cityId) {
  cityId = window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';
  try {
    var cached = localStorage.getItem('voy_city_cache_v2_' + cityId);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (isValidCitySchema(parsed, cityId)) return parsed;
      localStorage.removeItem('voy_city_cache_v2_' + cityId);
    }

    var legacy = localStorage.getItem('voy_city_cache_' + cityId);
    if (legacy && window.VoyCityPlatform) {
      var upgraded = VoyCityPlatform.upgradeLegacyCity(JSON.parse(legacy), cityId);
      if (upgraded) {
        try { localStorage.setItem('voy_city_cache_v2_' + cityId, JSON.stringify(upgraded)); } catch (e) {}
        return upgraded;
      }
    }
  } catch (error) {
    console.error('[loadCityProfile] Cache retrieval or migration failed', error);
  }
  return null;
}

`;
html = replaceBetween(html, 'function getValidCache(cityId) {', 'function prepareMemoryStateForCity(targetCityId) {', cache, 'city cache');

for (const forbidden of ["'city_' + fileId + '.json'", "fetch(url, { signal: controller.signal })"]) {
  if (html.includes(forbidden)) throw new Error(`legacy city fetch remains: ${forbidden}`);
}
for (const required of ['VoyCityPlatform.loadCity', 'voy_city_cache_v2_', 'core/cityPlatform.js?v=1']) {
  if (!html.includes(required)) throw new Error(`city platform integration missing: ${required}`);
}
await writeFile(htmlUrl, html, 'utf8');
console.log('city platform v1 generated and integrated');
