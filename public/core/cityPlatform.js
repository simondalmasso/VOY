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
  var COVERAGE_LEVELS = {
    national_basic: true,
    partial: true,
    verified: true,
    connected: true
  };
  var CITY_FOLDERS = {
    _default: '_default',
    santafe: 'santa-fe'
  };
  var DEFAULT_FLAGS = Object.freeze({
    ai_copilot: false,
    voice_input: false,
    qr_stops: false,
    web_push: false,
    live_transit: false,
    weather_context: false,
    price_history: false
  });

  function plainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
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

  function validateProfile(profile, expectedCityId) {
    if (!plainObject(profile)) return false;
    if (profile.schema_version !== SCHEMA_VERSION) return false;
    if (profile.city_id !== normalizeCityId(expectedCityId)) return false;
    if (typeof profile.name !== 'string' || !profile.name.trim()) return false;
    if (typeof profile.display_name !== 'string' || !profile.display_name.trim()) return false;
    if (profile.country !== 'AR') return false;
    if (!Array.isArray(profile.center) || profile.center.length !== 2 || !profile.center.every(finiteNumber)) return false;
    if (!finiteNumber(profile.zoom)) return false;
    if (profile.bbox !== null) {
      if (!plainObject(profile.bbox)) return false;
      for (var key of ['minLat', 'maxLat', 'minLon', 'maxLon']) {
        if (!finiteNumber(profile.bbox[key])) return false;
      }
      if (profile.bbox.minLat >= profile.bbox.maxLat || profile.bbox.minLon >= profile.bbox.maxLon) return false;
    }
    if (typeof profile.timezone !== 'string' || !profile.timezone) return false;
    if (!COVERAGE_LEVELS[profile.coverage_level]) return false;
    return true;
  }

  function validateProviders(payload, expectedCityId) {
    return plainObject(payload) &&
      payload.schema_version === SCHEMA_VERSION &&
      payload.city_id === normalizeCityId(expectedCityId) &&
      plainObject(payload.providers) &&
      Array.isArray(payload.taxi_companies) &&
      Array.isArray(payload.remis_companies);
  }

  function validateTransport(payload, expectedCityId) {
    return plainObject(payload) &&
      payload.schema_version === SCHEMA_VERSION &&
      payload.city_id === normalizeCityId(expectedCityId) &&
      Array.isArray(payload.bus_stops) &&
      Array.isArray(payload.bike_stations) &&
      Array.isArray(payload.landmarks);
  }

  function validateFares(payload, expectedCityId) {
    return plainObject(payload) &&
      payload.schema_version === SCHEMA_VERSION &&
      payload.city_id === normalizeCityId(expectedCityId) &&
      plainObject(payload.fare_registry);
  }

  function validateFlags(payload, expectedCityId) {
    if (!plainObject(payload) || payload.schema_version !== SCHEMA_VERSION) return false;
    if (payload.city_id !== normalizeCityId(expectedCityId) || !plainObject(payload.flags)) return false;
    for (var key of Object.keys(DEFAULT_FLAGS)) {
      if (typeof payload.flags[key] !== 'boolean') return false;
    }
    return true;
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
      bbox: profile.bbox
    };
    if (profile.viewbox) map.viewbox = profile.viewbox;
    if (Array.isArray(profile.recent_center)) map.recentCenter = profile.recent_center.slice();

    return {
      schemaVersion: SCHEMA_VERSION,
      city_id: cityId,
      slug: profile.slug || cityFolder(cityId),
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
      providers: Object.assign({}, parts.providers.providers),
      taxiCompanies: parts.providers.taxi_companies.slice(),
      remisCompanies: parts.providers.remis_companies.slice(),
      fareRegistry: Object.assign({}, parts.fares.fare_registry),
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
    if (!plainObject(data) || data.city_id !== cityId) return false;
    if (data.schemaVersion !== SCHEMA_VERSION) return false;
    if (typeof data.name !== 'string' || !plainObject(data.map)) return false;
    if (!plainObject(data.providers) || !plainObject(data.fareRegistry)) return false;
    if (!plainObject(data.featureFlags) || !COVERAGE_LEVELS[data.coverageLevel]) return false;
    return Array.isArray(data.busStops) && Array.isArray(data.bikeStations) && Array.isArray(data.landmarks);
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

  function upgradeLegacyCity(data, expectedCityId) {
    var cityId = normalizeCityId(expectedCityId);
    if (!plainObject(data) || data.city_id !== cityId) return null;
    if (!plainObject(data.map) || !plainObject(data.providers) || !plainObject(data.fareRegistry)) return null;

    var upgraded = Object.assign({}, data, {
      schemaVersion: SCHEMA_VERSION,
      city_id: cityId,
      slug: cityFolder(cityId),
      country: 'AR',
      timezone: 'America/Argentina/Cordoba',
      coverageLevel: cityId === 'santafe' ? 'partial' : 'national_basic',
      coverageNotes: ['legacy_cache_upgraded'],
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
    upgradeLegacyCity: upgradeLegacyCity
  });

  global.VoyCityPlatform = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
