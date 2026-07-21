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
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function unavailableMeterFare() {
  return {
    diurno: { bajada: null, ficha: null, distFicha: 130 },
    nocturno: { bajada: null, ficha: null, distFicha: 130 },
    source: 'Sin verificar',
    updated_at: '',
    status: 'not_available'
  };
}

function unavailableAppFare() {
  return {
    base: null,
    km: null,
    min: null,
    minFare: null,
    source: 'Sin verificar',
    updated_at: '',
    status: 'not_available'
  };
}

const defaultFareRegistry = {
  taxi: unavailableMeterFare(),
  remis: unavailableMeterFare(),
  bus: {
    sube: null,
    cash: null,
    source: 'Sin verificar',
    updated_at: '',
    status: 'not_available'
  },
  apps: {
    uber: unavailableAppFare(),
    didi: unavailableAppFare(),
    maxim: unavailableAppFare(),
    cabify: unavailableAppFare()
  }
};

await writeJson('cities/_default/profile.json', {
  schema_version: 1,
  city_id: '_default',
  slug: '_default',
  name: 'Argentina',
  display_name: 'Argentina',
  country: 'AR',
  center: [-64, -34],
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
  fare_registry: defaultFareRegistry,
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
  '<meta name="description" content="VOY — Asistente de movilidad urbana para Santa Fe. Compará Uber, DiDi, Maxim, taxi, remis y colectivo en un solo lugar.">',
  '<meta name="description" content="VOY — Comparador de movilidad urbana. La disponibilidad, las tarifas y el transporte se muestran según la cobertura territorial verificada.">',
  'neutral initial description'
);
html = replaceExactlyOnce(
  html,
  '<title>VOY — Movilidad Santa Fe</title>',
  '<title>VOY — Movilidad urbana</title>',
  'neutral initial title'
);
html = replaceExactlyOnce(
  html,
  '<span class="footer-mark" aria-hidden="true"></span>VOY · Movilidad Santa Fe · Datos informativos<button',
  '<span class="footer-mark" aria-hidden="true"></span>VOY · Movilidad urbana · Cobertura según ciudad · Datos informativos<button',
  'neutral initial footer'
);

const updateCityUI = `function updateCityUI() {
  if (!CURRENT_CITY) return;
  var cityId = CURRENT_CITY.city_id || '_default';
  var coverageLevel = CURRENT_CITY.coverageLevel || 'national_basic';
  var isNational = cityId === '_default' || coverageLevel === 'national_basic';
  var title;
  var description;
  var footerText;

  if (isNational) {
    title = 'VOY — Movilidad en Argentina';
    description = 'VOY — Comparador de movilidad urbana en Argentina. La disponibilidad, las tarifas y el transporte se muestran sólo donde existe cobertura territorial verificada.';
    footerText = 'VOY · Argentina · Cobertura nacional básica · Sin tarifas locales verificadas';
  } else if (cityId === 'santafe') {
    title = 'VOY — Movilidad Santa Fe';
    description = 'VOY — Movilidad urbana en Santa Fe. Cobertura parcial con tarifas reguladas verificadas y datos de transporte informativos.';
    footerText = 'VOY · Movilidad Santa Fe · Cobertura parcial · Datos informativos';
  } else {
    title = 'VOY — Movilidad ' + CURRENT_CITY.name;
    description = 'VOY — Movilidad urbana en ' + CURRENT_CITY.name + '. Cobertura: ' + coverageLevel + '.';
    footerText = 'VOY · Movilidad ' + CURRENT_CITY.name + ' · Cobertura ' + coverageLevel;
  }

  document.title = title;
  document.body.setAttribute('data-city-id', cityId);
  document.body.setAttribute('data-coverage-level', coverageLevel);
  var metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', description);

  var mapEl = document.getElementById('map');
  if (mapEl) mapEl.setAttribute('aria-label', isNational ? 'Mapa de Argentina' : 'Mapa de ' + CURRENT_CITY.name);

  var footer = document.querySelector('.footer');
  if (footer) {
    for (var i = 0; i < footer.childNodes.length; i++) {
      var node = footer.childNodes[i];
      if (node.nodeType === Node.TEXT_NODE && node.nodeValue.indexOf('VOY') >= 0) {
        node.nodeValue = footerText;
        break;
      }
    }
  }
}

`;
html = replaceBetween(html, 'function updateCityUI() {', 'let cityLoadGeneration = 0;', updateCityUI, 'coverage-aware city UI');

const loader = `let cityLoadGeneration = 0;
var activeCityLoadController = null;
window.cityLoadGeneration = 0;

async function loadCityProfile(cityId) {
  var generation = ++cityLoadGeneration;
  window.cityLoadGeneration = cityLoadGeneration;
  if (activeCityLoadController) activeCityLoadController.abort();
  var controller = new AbortController();
  activeCityLoadController = controller;
  return loadCityProfileForGeneration(cityId, generation, controller);
}

async function loadCityProfileForGeneration(cityId, generation, controller) {
  if (generation !== cityLoadGeneration) return false;
  cityId = window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';

  var timeoutId = setTimeout(function() { controller.abort(); }, 5000);
  var data = null;
  var profileSource = 'remote';

  try {
    if (!window.VoyCityPlatform) throw new Error('city_platform_unavailable');
    data = await VoyCityPlatform.loadCity(cityId, { signal: controller.signal });
    if (generation !== cityLoadGeneration) return false;
    if (!isValidCitySchema(data, cityId)) throw new Error('invalid_composed_city');
  } catch (error) {
    if (generation !== cityLoadGeneration) return false;
    console.warn('[loadCityProfile] Versioned city load failed for ' + cityId, error);
    data = getValidCache(cityId);
    profileSource = data ? 'cache' : 'emergency';
    if (!data) data = createEmergencyDefault(cityId);
  } finally {
    clearTimeout(timeoutId);
    if (activeCityLoadController === controller) activeCityLoadController = null;
  }

  if (generation !== cityLoadGeneration) return false;
  if (!isValidCitySchema(data, cityId)) {
    data = createEmergencyDefault(cityId);
    profileSource = 'emergency';
  }

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

function getValidCache(cityId) {
  cityId = window.VoyCityPlatform ? VoyCityPlatform.normalizeCityId(cityId) : '_default';
  var v2Key = 'voy_city_cache_v2_' + cityId;
  var legacyKey = 'voy_city_cache_' + cityId;
  var cached = localStorage.getItem(v2Key);

  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      if (isValidCitySchema(parsed, cityId)) return parsed;
    } catch (error) {
      console.error('[loadCityProfile] Invalid v2 city cache for ' + cityId, error);
    }
    localStorage.removeItem(v2Key);
  }

  var legacy = localStorage.getItem(legacyKey);
  if (legacy && window.VoyCityPlatform) {
    try {
      var upgraded = VoyCityPlatform.upgradeLegacyCity(JSON.parse(legacy), cityId);
      if (upgraded) {
        try { localStorage.setItem(v2Key, JSON.stringify(upgraded)); } catch (cacheWriteErr) {}
        return upgraded;
      }
    } catch (error) {
      console.error('[loadCityProfile] Invalid legacy city cache for ' + cityId, error);
    }
    localStorage.removeItem(legacyKey);
  }

  return null;
}

`;
html = replaceBetween(html, 'let cityLoadGeneration = 0;', 'function prepareMemoryStateForCity(targetCityId) {', loader, 'abortable fail-closed city loader');

const shareApp = `function shareApp(){
  var url=window.location.href;
  var city=CURRENT_CITY||createEmergencyDefault('_default');
  var isNational=city.coverageLevel==='national_basic'||city.city_id==='_default';
  var title=isNational?'VOY — Movilidad urbana':'VOY — Movilidad '+city.name;
  var text=isNational
    ?'Consultá opciones de movilidad con cobertura territorial clara y verificable.'
    :'Consultá opciones de movilidad en '+city.name+'. Cobertura '+city.coverageLevel+'.';
  var shareData={title:title,text:text,url:url};
  if(navigator.share){
    navigator.share(shareData).then(function(){v5event('share_app',{via:'native'})}).catch(function(e){
      if(e&&e.name==='AbortError')return;
      if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo compartir','error')}
    });
  }else if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){showToast('Enlace copiado','success');v5event('share_app',{via:'clipboard'})}).catch(function(){
      if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo copiar el enlace','error')}
    });
  }else{
    if(_fallbackCopy(url)){showToast('Enlace copiado','success');v5event('share_app',{via:'copy_fallback'})}else{showToast('No se pudo copiar el enlace','error')}
  }
  closeFooterMenu();
}
`;
html = replaceBetween(html, 'function shareApp(){', 'function supportCreator(){', shareApp, 'coverage-aware share copy');

await writeFile(htmlUrl, html, 'utf8');
