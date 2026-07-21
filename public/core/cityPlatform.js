/*
 * VOY City Platform v1
 *
 * Loads versioned, independently auditable city data while preserving the
 * legacy runtime context consumed by the current PWA.
 *
 * No DOM access, no storage writes and no UI side effects.
 */
(function (global) {
  'use strict';

  var SCHEMA_VERSION = 1;
  var COVERAGE_LEVELS = Object.freeze({
    national_basic: true,
    partial: true,
    verified: true,
    connected: true
  });
  var CITY_FOLDERS = Object.freeze({
    _default: '_default',
    santafe: 'santa-fe'
  });
  var PROVIDER_CATEGORIES = Object.freeze({
    app: true,
    taxi: true,
    remis: true
  });
  var DEFAULT_FLAGS = Object.freeze({
    ai_copilot: false,
    voice_input: false,
    qr_stops: false,
    web_push: false,
    live_transit: false,
    weather_context: false,
    price_history: false
  });
  var APP_PROVIDER_IDS = Object.freeze(['uber', 'didi', 'maxim', 'cabify']);

  function plainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function nullableFiniteNumber(value) {
    return value === null || finiteNumber(value);
  }

  function nonEmptyString(value) {
    return typeof value === 'string' && Boolean(value.trim());
  }

  function nullableString(value) {
    return value === null || typeof value === 'string';
  }

  function validLonLat(lon, lat) {
    return finiteNumber(lon) && finiteNumber(lat) && lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90;
  }

  function validCoordinatePair(value) {
    return Array.isArray(value) && value.length === 2 && validLonLat(value[0], value[1]);
  }

  function normalizeCityId(value) {
    var raw = String(value || '').trim().toLowerCase();
    var compact = raw.normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s_-]+/g, '');

    if (!compact || compact === 'default' || compact === 'argentina' || compact === 'ar') {
      return '_default';
    }
    if (compact === 'santafe') return 'santafe';
    return '_default';
  }

  function cityFolder(cityId) {
    return CITY_FOLDERS[normalizeCityId(cityId)] || CITY_FOLDERS._default;
  }

  function getPaths(cityId) {
    var folder = cityFolder(cityId);
    var root = 'cities/' + folder + '/';
    return Object.freeze({
      profile: root + 'profile.json',
      providers: root + 'providers.json',
      transport: root + 'transport.json',
      fares: root + 'fares.json',
      featureFlags: root + 'feature_flags.json'
    });
  }

  function validateBbox(bbox) {
    if (bbox === null) return true;
    if (!plainObject(bbox)) return false;
    if (!validLonLat(bbox.minLon, bbox.minLat) || !validLonLat(bbox.maxLon, bbox.maxLat)) return false;
    return bbox.minLat < bbox.maxLat && bbox.minLon < bbox.maxLon;
  }

  function validateViewbox(value) {
    if (value === undefined) return true;
    if (!nonEmptyString(value)) return false;
    var parts = value.split(',').map(Number);
    return parts.length === 4 && parts.every(finiteNumber) &&
      validLonLat(parts[0], parts[1]) && validLonLat(parts[2], parts[3]);
  }

  function validateProfile(profile, expectedCityId) {
    var cityId = normalizeCityId(expectedCityId);
    if (!plainObject(profile)) return false;
    if (profile.schema_version !== SCHEMA_VERSION || profile.city_id !== cityId) return false;
    if (profile.slug !== cityFolder(cityId)) return false;
    if (!nonEmptyString(profile.name) || !nonEmptyString(profile.display_name)) return false;
    if (profile.country !== 'AR' || !validCoordinatePair(profile.center)) return false;
    if (!finiteNumber(profile.zoom) || profile.zoom < 0 || profile.zoom > 22) return false;
    if (!validateBbox(profile.bbox)) return false;
    if (profile.bbox) {
      var lon = profile.center[0];
      var lat = profile.center[1];
      if (lat < profile.bbox.minLat || lat > profile.bbox.maxLat || lon < profile.bbox.minLon || lon > profile.bbox.maxLon) return false;
    }
    if (!validateViewbox(profile.viewbox)) return false;
    if (profile.recent_center !== undefined && !validCoordinatePair(profile.recent_center)) return false;
    if (!nonEmptyString(profile.timezone) || !COVERAGE_LEVELS[profile.coverage_level]) return false;
    if (profile.coverage_notes !== undefined &&
        (!Array.isArray(profile.coverage_notes) || !profile.coverage_notes.every(nonEmptyString))) return false;
    if (profile.source !== undefined && !nonEmptyString(profile.source)) return false;
    if (profile.verified_at !== undefined && !nullableString(profile.verified_at)) return false;
    return true;
  }

  function validateProvider(provider) {
    if (!plainObject(provider) || !nonEmptyString(provider.name)) return false;
    if (typeof provider.available !== 'boolean' || typeof provider.verified !== 'boolean') return false;
    if (!PROVIDER_CATEGORIES[provider.category]) return false;
    if (provider.color !== undefined && !nonEmptyString(provider.color)) return false;
    return true;
  }

  function validateCompany(company) {
    if (!plainObject(company) || !nonEmptyString(company.id) || !nonEmptyString(company.name)) return false;
    return ['whatsapp', 'app', 'web', 'phone'].every(function (key) {
      return company[key] === undefined || nullableString(company[key]);
    });
  }

  function validateProviders(payload, expectedCityId) {
    if (!plainObject(payload) || payload.schema_version !== SCHEMA_VERSION) return false;
    if (payload.city_id !== normalizeCityId(expectedCityId) || !plainObject(payload.providers)) return false;
    if (!Object.keys(payload.providers).every(function (key) {
      return nonEmptyString(key) && validateProvider(payload.providers[key]);
    })) return false;
    if (!Array.isArray(payload.taxi_companies) || !payload.taxi_companies.every(validateCompany)) return false;
    if (!Array.isArray(payload.remis_companies) || !payload.remis_companies.every(validateCompany)) return false;
    return payload.taxi_companies.concat(payload.remis_companies).every(function (company) {
      return Boolean(payload.providers[company.id]);
    });
  }

  function validateTerritorialPoint(point, kind) {
    if (!plainObject(point)) return false;
    var name = point.nombre || point.name;
    if (!nonEmptyString(name) || !validLonLat(point.lon, point.lat)) return false;
    if (point.calles !== undefined && !nonEmptyString(point.calles)) return false;
    if (point.address !== undefined && !nonEmptyString(point.address)) return false;
    if (kind === 'bus' && point.linea !== undefined && !nonEmptyString(String(point.linea))) return false;
    if (point.verified !== undefined && typeof point.verified !== 'boolean') return false;
    return true;
  }

  function validateTransport(payload, expectedCityId) {
    return plainObject(payload) &&
      payload.schema_version === SCHEMA_VERSION &&
      payload.city_id === normalizeCityId(expectedCityId) &&
      Array.isArray(payload.bus_stops) && payload.bus_stops.every(function (point) { return validateTerritorialPoint(point, 'bus'); }) &&
      Array.isArray(payload.bike_stations) && payload.bike_stations.every(function (point) { return validateTerritorialPoint(point, 'bike'); }) &&
      Array.isArray(payload.landmarks) && payload.landmarks.every(function (point) { return validateTerritorialPoint(point, 'landmark'); });
  }

  function validateMeterFare(value) {
    if (!plainObject(value) || !plainObject(value.diurno) || !plainObject(value.nocturno)) return false;
    return ['diurno', 'nocturno'].every(function (period) {
      var fare = value[period];
      return nullableFiniteNumber(fare.bajada) && nullableFiniteNumber(fare.ficha) &&
        finiteNumber(fare.distFicha) && fare.distFicha > 0;
    });
  }

  function validateBusFare(value) {
    if (!plainObject(value) || !nullableFiniteNumber(value.sube) || !nullableFiniteNumber(value.cash)) return false;
    return ['frequent', 'full'].every(function (key) {
      return value[key] === undefined || nullableFiniteNumber(value[key]);
    });
  }

  function validateAppFare(value) {
    if (!plainObject(value)) return false;
    if (!['base', 'km', 'min', 'minFare'].every(function (key) { return nullableFiniteNumber(value[key]); })) return false;
    return value.status === undefined || nonEmptyString(value.status);
  }

  function validateFares(payload, expectedCityId) {
    if (!plainObject(payload) || payload.schema_version !== SCHEMA_VERSION) return false;
    if (payload.city_id !== normalizeCityId(expectedCityId) || !plainObject(payload.fare_registry)) return false;
    var registry = payload.fare_registry;
    if (!validateMeterFare(registry.taxi) || !validateMeterFare(registry.remis)) return false;
    if (!validateBusFare(registry.bus) || !plainObject(registry.apps)) return false;
    return APP_PROVIDER_IDS.every(function (providerId) {
      return validateAppFare(registry.apps[providerId]);
    });
  }

  function validateFlags(payload, expectedCityId) {
    if (!plainObject(payload) || payload.schema_version !== SCHEMA_VERSION) return false;
    if (payload.city_id !== normalizeCityId(expectedCityId) || !plainObject(payload.flags)) return false;
    var expectedKeys = Object.keys(DEFAULT_FLAGS).sort();
    var actualKeys = Object.keys(payload.flags).sort();
    if (expectedKeys.length !== actualKeys.length) return false;
    for (var i = 0; i < expectedKeys.length; i++) {
      if (expectedKeys[i] !== actualKeys[i] || typeof payload.flags[expectedKeys[i]] !== 'boolean') return false;
    }
    return true;
  }

  function copyObject(value) {
    return Object.assign({}, value);
  }

  function composeCity(parts, expectedCityId) {
    var cityId = normalizeCityId(expectedCityId);
    if (!parts || !validateProfile(parts.profile, cityId)) throw new TypeError('invalid_city_profile');
    if (!validateProviders(parts.providers, cityId)) throw new TypeError('invalid_city_providers');
    if (!validateTransport(parts.transport, cityId)) throw new TypeError('invalid_city_transport');
    if (!validateFares(parts.fares, cityId)) throw new TypeError('invalid_city_fares');
    if (!validateFlags(parts.featureFlags, cityId)) throw new TypeError('invalid_city_feature_flags');

    var profile = parts.profile;
    var map = {
      center: profile.center.slice(),
      zoom: profile.zoom,
      bbox: profile.bbox ? copyObject(profile.bbox) : null
    };
    if (profile.viewbox) map.viewbox = profile.viewbox;
    if (Array.isArray(profile.recent_center)) map.recentCenter = profile.recent_center.slice();

    return {
      schemaVersion: SCHEMA_VERSION,
      city_id: cityId,
      slug: profile.slug,
      name: profile.name,
      displayName: profile.display_name,
      country: profile.country,
      timezone: profile.timezone,
      coverageLevel: profile.coverage_level,
      coverageNotes: Array.isArray(profile.coverage_notes) ? profile.coverage_notes.slice() : [],
      map: map,
      busStops: parts.transport.bus_stops.slice(),
      bikeStations: parts.transport.bike_stations.slice(),
      landmarks: parts.transport.landmarks.slice(),
      providers: copyObject(parts.providers.providers),
      taxiCompanies: parts.providers.taxi_companies.slice(),
      remisCompanies: parts.providers.remis_companies.slice(),
      fareRegistry: copyObject(parts.fares.fare_registry),
      featureFlags: Object.assign({}, DEFAULT_FLAGS, parts.featureFlags.flags),
      dataFreshness: {
        profile: profile.verified_at || null,
        providers: parts.providers.verified_at || null,
        transport: parts.transport.verified_at || null,
        fares: parts.fares.verified_at || null,
        featureFlags: parts.featureFlags.verified_at || null
      },
      dataSources: {
        profile: profile.source || null,
        providers: parts.providers.source || null,
        transport: parts.transport.source || null,
        fares: parts.fares.source || null
      }
    };
  }

  function isValidComposedCity(data, expectedCityId) {
    var cityId = normalizeCityId(expectedCityId);
    if (!plainObject(data) || data.city_id !== cityId || data.schemaVersion !== SCHEMA_VERSION) return false;
    if (!nonEmptyString(data.name) || !nonEmptyString(data.displayName) || data.slug !== cityFolder(cityId)) return false;
    if (!plainObject(data.map) || !validCoordinatePair(data.map.center) || !finiteNumber(data.map.zoom)) return false;
    if (!validateBbox(data.map.bbox === undefined ? null : data.map.bbox)) return false;
    if (!plainObject(data.providers) || !plainObject(data.fareRegistry) || !plainObject(data.featureFlags)) return false;
    if (!COVERAGE_LEVELS[data.coverageLevel]) return false;
    return Array.isArray(data.busStops) && Array.isArray(data.bikeStations) && Array.isArray(data.landmarks) &&
      Array.isArray(data.taxiCompanies) && Array.isArray(data.remisCompanies);
  }

  async function fetchJson(fetchImpl, url, signal) {
    var response = await fetchImpl(url, {
      signal: signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response || !response.ok) {
      var error = new Error('city_part_http_' + (response ? response.status : 'unknown'));
      error.status = response ? response.status : 0;
      error.url = url;
      throw error;
    }
    try {
      return await response.json();
    } catch (cause) {
      var parseError = new Error('city_part_invalid_json');
      parseError.url = url;
      parseError.cause = cause;
      throw parseError;
    }
  }

  async function loadCity(cityId, options) {
    var normalized = normalizeCityId(cityId);
    var paths = getPaths(normalized);
    var opts = options || {};
    var fetchImpl = opts.fetch || global.fetch;
    if (typeof fetchImpl !== 'function') throw new TypeError('fetch_required');

    var values = await Promise.all([
      fetchJson(fetchImpl, paths.profile, opts.signal),
      fetchJson(fetchImpl, paths.providers, opts.signal),
      fetchJson(fetchImpl, paths.transport, opts.signal),
      fetchJson(fetchImpl, paths.fares, opts.signal),
      fetchJson(fetchImpl, paths.featureFlags, opts.signal)
    ]);

    return composeCity({
      profile: values[0],
      providers: values[1],
      transport: values[2],
      fares: values[3],
      featureFlags: values[4]
    }, normalized);
  }

  function unavailableMeterFare() {
    return {
      diurno: { bajada: null, ficha: null, distFicha: 130 },
      nocturno: { bajada: null, ficha: null, distFicha: 130 },
      source: 'Sin verificar',
      status: 'not_available'
    };
  }

  function unavailableAppFare() {
    return { base: null, km: null, min: null, minFare: null, source: 'Sin verificar', status: 'not_available' };
  }

  function normalizeLegacyFareRegistry(registry) {
    var source = plainObject(registry) ? registry : {};
    var apps = plainObject(source.apps) ? copyObject(source.apps) : {};
    APP_PROVIDER_IDS.forEach(function (providerId) {
      if (!plainObject(apps[providerId])) apps[providerId] = unavailableAppFare();
    });
    return {
      taxi: plainObject(source.taxi) ? source.taxi : unavailableMeterFare(),
      remis: plainObject(source.remis) ? source.remis : unavailableMeterFare(),
      bus: plainObject(source.bus) ? source.bus : { sube: null, cash: null, source: 'Sin verificar', status: 'not_available' },
      apps: apps
    };
  }

  function upgradeLegacyCity(data, expectedCityId) {
    var cityId = normalizeCityId(expectedCityId);
    if (!plainObject(data) || data.city_id !== cityId) return null;
    if (!plainObject(data.map) || !plainObject(data.providers) || !plainObject(data.fareRegistry)) return null;

    var upgraded = Object.assign({}, data, {
      schemaVersion: SCHEMA_VERSION,
      city_id: cityId,
      slug: cityFolder(cityId),
      displayName: nonEmptyString(data.displayName) ? data.displayName : (cityId === 'santafe' ? 'Santa Fe, Argentina' : 'Argentina'),
      country: 'AR',
      timezone: cityId === 'santafe' ? 'America/Argentina/Cordoba' : 'America/Argentina/Buenos_Aires',
      coverageLevel: cityId === 'santafe' ? 'partial' : 'national_basic',
      coverageNotes: ['legacy_cache_upgraded'],
      busStops: Array.isArray(data.busStops) ? data.busStops : [],
      bikeStations: Array.isArray(data.bikeStations) ? data.bikeStations : [],
      landmarks: Array.isArray(data.landmarks) ? data.landmarks : [],
      taxiCompanies: Array.isArray(data.taxiCompanies) ? data.taxiCompanies : [],
      remisCompanies: Array.isArray(data.remisCompanies) ? data.remisCompanies : [],
      fareRegistry: normalizeLegacyFareRegistry(data.fareRegistry),
      featureFlags: Object.assign({}, DEFAULT_FLAGS),
      dataFreshness: {},
      dataSources: { profile: 'legacy_cache' }
    });
    return isValidComposedCity(upgraded, cityId) ? upgraded : null;
  }

  var api = Object.freeze({
    SCHEMA_VERSION: SCHEMA_VERSION,
    DEFAULT_FLAGS: DEFAULT_FLAGS,
    normalizeCityId: normalizeCityId,
    cityFolder: cityFolder,
    getPaths: getPaths,
    validateProfile: validateProfile,
    validateProviders: validateProviders,
    validateTransport: validateTransport,
    validateFares: validateFares,
    validateFlags: validateFlags,
    composeCity: composeCity,
    isValidComposedCity: isValidComposedCity,
    loadCity: loadCity,
    normalizeLegacyFareRegistry: normalizeLegacyFareRegistry,
    upgradeLegacyCity: upgradeLegacyCity
  });

  global.VoyCityPlatform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
