/**
 * VOY v2 — UI Mobility Controller
 *
 * Orchestration layer between DOM/UI and core/mobilityEngine.
 *
 * RESPONSIBILITIES:
 *   1. UI State:        _origin, _dest, _estimations, search cache/timers
 *   2. Estimation:      calls MobilityEngine.runAllEstimations(), stores result
 *   3. Search:          coordinates searchLocal + searchNominatim + dedup + recent
 *   4. Bridge:          setOrigin, setDest, getEstimation, clearState
 *   5. Memory Layer:    unified favorites + history in single voy_memory localStorage key
 *
 * THIS FILE DOES NOT:
 *   - Calculate or estimate anything (delegates to MobilityEngine)
 *   - Manipulate DOM or render HTML
 *   - Access map objects or markers
 *   - Handle events (clicks, touch, drag)
 *   - Decide business logic or scoring
 *
 * @module MobilityController
 * @version 2.1.0
 */
(function (global) {
  'use strict';

  // =====================================================================
  //  INTERNAL STATE
  // =====================================================================

  var _origin = null;           // {lat, lon, name, source}
  var _dest = null;             // {lat, lon, name, source}
  var _originManual = false;    // true = user typed/searched origin manually (GPS won't override)
  var _estimations = null;      // Array of estimation objects from MobilityEngine

  // Search state
  var _searchCache = {};        // cache Nominatim results: key=query, value=results
  var _lastSearchTime = 0;      // rate limiter for Nominatim API
  var _searchTimer = null;      // debounce timer handle

  // =====================================================================
  //  MEMORY LAYER — Unified favorites + history
  // =====================================================================

  var MEMORY_KEY = 'voy_memory';
  var HISTORY_MAX = 10;
  var CUSTOM_FAV_MAX = 3;

  var _memory = {
    favorites: {
      casa: null,      // { nombre, lat, lon, direccion } | null
      trabajo: null,   // { nombre, lat, lon, direccion } | null
      custom: []       // [{ id, nombre, lat, lon, direccion }] max 3
    },
    history: [],       // [{ id, ts, origin:{lat,lon,name}, dest:{lat,lon,name}, mode, provider }] max 10
    metrics: {
      favTrips: 0,          // trips started from favorite tap
      histTrips: 0,         // trips started from history tap
      providerTrips: 0,     // total confirmed provider taps (history save triggers)
      totalCreated: 0,      // total favorites created
      byType: { casa: 0, trabajo: 0, custom: 0 },
      userCreatedFav: false  // has user ever created a favorite
    }
  };

  // Config (injected via init)
  var _config = {
    busStops: [],
    bikeStations: [],
    landmarks: [],
    fareRegistry: null,
    providers: null,
    recentKey: 'voy_recent_searches',
    prefsKey: 'voy_prefs',
    // Legacy keys (for migration only)
    favsKey: 'voy_favorites',
    favMetricsKey: 'voy_fav_metrics',
    historyKey: 'voy_history',
    historyMetricsKey: 'voy_history_metrics'
  };

  // =====================================================================
  //  1. INITIALIZATION
  // =====================================================================

  /**
   * Initialize the controller with data configuration.
   * Must be called before any other method.
   *
   * @param {object} config
   * @param {Array}  config.busStops     - BUS_STOPS array
   * @param {Array}  config.bikeStations - BIKE_STATIONS array
   * @param {Array}  config.landmarks    - LANDMARKS array
   * @param {object} config.fareRegistry - FareRegistry object
   * @param {object} config.providers    - PROVIDERS registry
   * @param {string} [config.recentKey]  - localStorage key for recent searches
   * @param {string} [config.prefsKey]   - localStorage key for preferences
   */
  function init(config) {
    _config.busStops = config.busStops || [];
    _config.bikeStations = config.bikeStations || [];
    _config.landmarks = config.landmarks || [];
    _config.fareRegistry = config.fareRegistry || null;
    _config.providers = config.providers || null;
    if (config.recentKey) _config.recentKey = config.recentKey;
    if (config.prefsKey) _config.prefsKey = config.prefsKey;
    // Store legacy keys for migration
    if (config.favsKey) _config.favsKey = config.favsKey;
    if (config.favMetricsKey) _config.favMetricsKey = config.favMetricsKey;
    if (config.historyKey) _config.historyKey = config.historyKey;
    if (config.historyMetricsKey) _config.historyMetricsKey = config.historyMetricsKey;
  }

  // =====================================================================
  //  2. STATE ACCESSORS (Bridge)
  // =====================================================================

  function getOrigin() { return _origin; }
  function getDest() { return _dest; }
  function getEstimations() { return _estimations; }

  function setEstimations(estimations) { _estimations = estimations; }
  function isOriginManual() { return _originManual; }

  // =====================================================================
  //  3. STATE MUTATORS (Bridge)
  // =====================================================================

  function setOrigin(lat, lon, name, source) {
    _origin = { lat: lat, lon: lon, name: name || '', source: source || 'manual' };
    return !!(_origin && _dest);
  }

  function setDest(lat, lon, name, source) {
    _dest = { lat: lat, lon: lon, name: name || '', source: source || 'manual' };
    return !!(_origin && _dest);
  }

  function setOriginName(name) { if (_origin) _origin.name = name; }
  function setDestName(name) { if (_dest) _dest.name = name; }
  function setOriginManual(val) { _originManual = !!val; }

  function clearOrigin() { _origin = null; _estimations = null; }
  function clearDest() { _dest = null; _estimations = null; }

  function clearState() {
    _origin = null;
    _dest = null;
    _originManual = false;
    _estimations = null;
    _searchCache = {};
    _lastSearchTime = 0;
    if (_searchTimer) { clearTimeout(_searchTimer); _searchTimer = null; }
  }

  // =====================================================================
  //  4. ESTIMATION ORCHESTRATION
  // =====================================================================

  function runEstimations() {
    if (!_origin || !_dest) return null;
    _estimations = MobilityEngine.runAllEstimations(
      _origin, _dest,
      { busStops: _config.busStops, bikeStations: _config.bikeStations, fareRegistry: _config.fareRegistry }
    );
    // MOBILITY_CORE_RANKING_V1: attach contextual_score ranked providers to auto estimation.
    // The view layer reads est.rankedProviders instead of re-sorting by price.
    if (_estimations && typeof MobilityEngine.rankProviders === 'function' && _config.providers) {
      for (var i = 0; i < _estimations.length; i++) {
        if (_estimations[i].mode === 'auto') {
          _estimations[i].rankedProviders = MobilityEngine.rankProviders(_estimations[i], _config.providers);
          break;
        }
      }
    }
    return _estimations;
  }

  // =====================================================================
  //  5. SEARCH COORDINATION
  // =====================================================================

  function searchLocal(q) {
    return MobilityEngine.searchLocal(q, _config.busStops, _config.bikeStations, _config.landmarks);
  }

  function dedupResults(results) {
    return MobilityEngine.dedupResults(results);
  }

  async function searchNominatim(q) {
    var key = q.toLowerCase().trim();
    if (_searchCache[key]) return _searchCache[key];

    var now = Date.now();
    if (now - _lastSearchTime < 1100) return [];
    _lastSearchTime = now;

    try {
      var url = 'https://nominatim.openstreetmap.org/search?' +
        'q=' + encodeURIComponent(q + ', Santa Fe, Argentina') +
        '&format=json&limit=10&accept-language=es' +
        '&viewbox=-60.85,-31.5,-60.55,-31.75&bounded=1&addressdetails=1';
      var r = await fetch(url, { headers: { 'User-Agent': 'MovilidadAsistente/1.0' } });
      var data = await r.json();

      var localResults = searchLocal(q);
      var remoteResults = (data || []).map(function (d, i) {
        return {
          type: 'place',
          name: d.display_name.split(',').slice(0, 2).join(', '),
          sub: d.display_name.split(',').slice(2, 4).join(', ').trim(),
          lat: parseFloat(d.lat),
          lon: parseFloat(d.lon),
          score: 70 - i * 5,
          display_name: d.display_name
        };
      });

      var all = localResults.concat(remoteResults);
      all.sort(function (a, b) { return b.score - a.score; });
      var deduped = dedupResults(all);
      _searchCache[key] = deduped;
      return deduped;
    } catch (e) {
      return [];
    }
  }

  function getSearchTimer() { return _searchTimer; }
  function setSearchTimer(timer) { if (_searchTimer) clearTimeout(_searchTimer); _searchTimer = timer; }

  function saveRecentSearch(result) {
    try {
      var recent = JSON.parse(localStorage.getItem(_config.recentKey) || '[]');
      var displayName = result.display_name || result.name || '';
      var name = displayName.split(',')[0];
      var entry = { name: name, lat: result.lat, lon: result.lon, display: displayName };
      var filtered = recent.filter(function (r) { return r.name !== entry.name; });
      localStorage.setItem(_config.recentKey, JSON.stringify([entry].concat(filtered).slice(0, 10)));
    } catch (e) { /* silent */ }
  }

  function getRecentSearches() {
    try { return JSON.parse(localStorage.getItem(_config.recentKey) || '[]'); }
    catch (e) { return []; }
  }

  function clearSearchCache() { _searchCache = {}; }

  // =====================================================================
  //  6. MEMORY LAYER — Core (unified storage)
  // =====================================================================

  /**
   * Migrate from legacy separate localStorage keys to unified voy_memory.
   * Called once on load. Cleans up old keys after successful migration.
   */
  function _migrateLegacyMemory() {
    try {
      // If voy_memory already exists, no migration needed
      if (localStorage.getItem(MEMORY_KEY)) return;

      var migrated = {
        favorites: { casa: null, trabajo: null, custom: [] },
        history: [],
        metrics: {
          favTrips: 0, histTrips: 0, providerTrips: 0,
          totalCreated: 0, byType: { casa: 0, trabajo: 0, custom: 0 }, userCreatedFav: false
        }
      };

      // Migrate favorites
      var oldFavs = localStorage.getItem(_config.favsKey);
      if (oldFavs) {
        var parsed = JSON.parse(oldFavs);
        if (parsed.casa) migrated.favorites.casa = parsed.casa;
        if (parsed.trabajo) migrated.favorites.trabajo = parsed.trabajo;
        if (parsed.custom && Array.isArray(parsed.custom)) migrated.favorites.custom = parsed.custom.slice(0, CUSTOM_FAV_MAX);
      }

      // Migrate history
      var oldHistory = localStorage.getItem(_config.historyKey);
      if (oldHistory) {
        var parsedH = JSON.parse(oldHistory);
        if (Array.isArray(parsedH)) migrated.history = parsedH.slice(0, HISTORY_MAX);
      }

      // Migrate fav metrics
      var oldFavMetrics = localStorage.getItem(_config.favMetricsKey);
      if (oldFavMetrics) {
        var parsedFM = JSON.parse(oldFavMetrics);
        if (parsedFM.tripsFromFavorite != null) migrated.metrics.favTrips = parsedFM.tripsFromFavorite;
        if (parsedFM.totalCreated != null) migrated.metrics.totalCreated = parsedFM.totalCreated;
        if (parsedFM.byType) {
          if (parsedFM.byType.casa != null) migrated.metrics.byType.casa = parsedFM.byType.casa;
          if (parsedFM.byType.trabajo != null) migrated.metrics.byType.trabajo = parsedFM.byType.trabajo;
          if (parsedFM.byType.custom != null) migrated.metrics.byType.custom = parsedFM.byType.custom;
        }
        if (parsedFM.userCreatedFav != null) migrated.metrics.userCreatedFav = parsedFM.userCreatedFav;
      }

      // Migrate history metrics
      var oldHistMetrics = localStorage.getItem(_config.historyMetricsKey);
      if (oldHistMetrics) {
        var parsedHM = JSON.parse(oldHistMetrics);
        if (parsedHM.totalTripsFromHistory != null) migrated.metrics.histTrips = parsedHM.totalTripsFromHistory;
        if (parsedHM.totalTripsWithProvider != null) migrated.metrics.providerTrips = parsedHM.totalTripsWithProvider;
      }

      // Save unified memory
      localStorage.setItem(MEMORY_KEY, JSON.stringify(migrated));

      // Clean up legacy keys
      localStorage.removeItem(_config.favsKey);
      localStorage.removeItem(_config.favMetricsKey);
      localStorage.removeItem(_config.historyKey);
      localStorage.removeItem(_config.historyMetricsKey);

    } catch (e) { /* silent — if migration fails, start fresh */ }
  }

  /**
   * Load unified memory from localStorage.
   * Handles migration from legacy keys on first load.
   */
  function loadMemory() {
    try {
      // Try migration first
      _migrateLegacyMemory();

      var saved = localStorage.getItem(MEMORY_KEY);
      if (saved) {
        var parsed = JSON.parse(saved);
        // Favorites
        if (parsed.favorites) {
          if (parsed.favorites.casa) _memory.favorites.casa = parsed.favorites.casa;
          if (parsed.favorites.trabajo) _memory.favorites.trabajo = parsed.favorites.trabajo;
          if (parsed.favorites.custom && Array.isArray(parsed.favorites.custom)) {
            _memory.favorites.custom = parsed.favorites.custom.slice(0, CUSTOM_FAV_MAX);
          }
        }
        // History
        if (parsed.history && Array.isArray(parsed.history)) {
          _memory.history = parsed.history.slice(0, HISTORY_MAX);
        }
        // Metrics
        if (parsed.metrics) {
          var m = parsed.metrics;
          if (m.favTrips != null) _memory.metrics.favTrips = m.favTrips;
          if (m.histTrips != null) _memory.metrics.histTrips = m.histTrips;
          if (m.providerTrips != null) _memory.metrics.providerTrips = m.providerTrips;
          if (m.totalCreated != null) _memory.metrics.totalCreated = m.totalCreated;
          if (m.byType) {
            if (m.byType.casa != null) _memory.metrics.byType.casa = m.byType.casa;
            if (m.byType.trabajo != null) _memory.metrics.byType.trabajo = m.byType.trabajo;
            if (m.byType.custom != null) _memory.metrics.byType.custom = m.byType.custom;
          }
          if (m.userCreatedFav != null) _memory.metrics.userCreatedFav = m.userCreatedFav;
        }
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Persist unified memory to localStorage.
   */
  function saveMemory() {
    try { localStorage.setItem(MEMORY_KEY, JSON.stringify(_memory)); }
    catch (e) { /* silent */ }
  }

  // =====================================================================
  //  7. MEMORY LAYER — Favorites API
  // =====================================================================

  function getFavorites() { return _memory.favorites; }

  function canAddFavorite(type) {
    if (type === 'casa') return !_memory.favorites.casa;
    if (type === 'trabajo') return !_memory.favorites.trabajo;
    if (type === 'custom') return _memory.favorites.custom.length < CUSTOM_FAV_MAX;
    return false;
  }

  function customSlotsAvailable() { return CUSTOM_FAV_MAX - _memory.favorites.custom.length; }

  function addFavorite(type, nombre, lat, lon, direccion, id) {
    var entry = { nombre: nombre, lat: lat, lon: lon, direccion: direccion || '' };

    if (type === 'casa') {
      var wasNew = !_memory.favorites.casa;
      _memory.favorites.casa = entry;
      saveMemory();
      if (wasNew) _trackFavCreation('casa');
      return true;
    }
    if (type === 'trabajo') {
      var wasNew2 = !_memory.favorites.trabajo;
      _memory.favorites.trabajo = entry;
      saveMemory();
      if (wasNew2) _trackFavCreation('trabajo');
      return true;
    }
    if (type === 'custom') {
      if (id) {
        var found = _memory.favorites.custom.find(function (f) { return f.id === id; });
        if (found) {
          found.nombre = nombre; found.lat = lat; found.lon = lon; found.direccion = direccion || '';
          saveMemory();
          return true;
        }
      }
      if (_memory.favorites.custom.length >= CUSTOM_FAV_MAX) return false;
      var newId = 'fav_' + Date.now();
      _memory.favorites.custom.push(Object.assign({ id: newId }, entry));
      saveMemory();
      _trackFavCreation('custom');
      return true;
    }
    return false;
  }

  function updateFavorite(slot, nombre, lat, lon, direccion) {
    return addFavorite(
      slot === 'casa' ? 'casa' : slot === 'trabajo' ? 'trabajo' : 'custom',
      nombre, lat, lon, direccion,
      slot !== 'casa' && slot !== 'trabajo' ? slot : undefined
    );
  }

  function removeFavorite(slot) {
    if (slot === 'casa') { _memory.favorites.casa = null; saveMemory(); return true; }
    if (slot === 'trabajo') { _memory.favorites.trabajo = null; saveMemory(); return true; }
    var idx = _memory.favorites.custom.findIndex(function (f) { return f.id === slot; });
    if (idx >= 0) { _memory.favorites.custom.splice(idx, 1); saveMemory(); return true; }
    return false;
  }

  function findMatchingFavorite(lat, lon) {
    var threshold = 0.001; // ~111m
    if (_memory.favorites.casa && Math.abs(_memory.favorites.casa.lat - lat) < threshold && Math.abs(_memory.favorites.casa.lon - lon) < threshold) {
      return { type: 'casa', fav: _memory.favorites.casa };
    }
    if (_memory.favorites.trabajo && Math.abs(_memory.favorites.trabajo.lat - lat) < threshold && Math.abs(_memory.favorites.trabajo.lon - lon) < threshold) {
      return { type: 'trabajo', fav: _memory.favorites.trabajo };
    }
    for (var i = 0; i < _memory.favorites.custom.length; i++) {
      var c = _memory.favorites.custom[i];
      if (Math.abs(c.lat - lat) < threshold && Math.abs(c.lon - lon) < threshold) {
        return { type: 'custom', fav: c };
      }
    }
    return null;
  }

  function hasFavorites() {
    return !!_memory.favorites.casa || !!_memory.favorites.trabajo || _memory.favorites.custom.length > 0;
  }

  function favoritesCount() {
    var count = 0;
    if (_memory.favorites.casa) count++;
    if (_memory.favorites.trabajo) count++;
    count += _memory.favorites.custom.length;
    return count;
  }

  // =====================================================================
  //  8. MEMORY LAYER — History API
  // =====================================================================

  function getHistory() { return _memory.history; }
  function hasHistory() { return _memory.history.length > 0; }

  function addToHistory(origin, dest, mode, provider) {
    if (!origin || !dest) return false;

    var entry = {
      id: 'h_' + Date.now(),
      ts: Date.now(),
      origin: {
        lat: Math.round(origin.lat * 10000) / 10000,
        lon: Math.round(origin.lon * 10000) / 10000,
        name: origin.name || ''
      },
      dest: {
        lat: Math.round(dest.lat * 10000) / 10000,
        lon: Math.round(dest.lon * 10000) / 10000,
        name: dest.name || ''
      },
      mode: mode || 'auto',
      provider: provider || ''
    };

    // Deduplicate: check if the most recent entry is identical
    if (_memory.history.length > 0) {
      var last = _memory.history[0];
      if (last.origin.lat === entry.origin.lat &&
          last.origin.lon === entry.origin.lon &&
          last.dest.lat === entry.dest.lat &&
          last.dest.lon === entry.dest.lon &&
          last.provider === entry.provider) {
        return false; // Consecutive duplicate, skip
      }
    }

    // Add to front (newest first)
    _memory.history.unshift(entry);

    // FIFO: trim to max 10
    if (_memory.history.length > HISTORY_MAX) {
      _memory.history = _memory.history.slice(0, HISTORY_MAX);
    }

    saveMemory();
    return true;
  }

  function clearHistory() {
    _memory.history = [];
    saveMemory();
  }

  function getHistoryEntry(id) {
    return _memory.history.find(function (h) { return h.id === id; }) || null;
  }

  // =====================================================================
  //  9. MEMORY LAYER — Metrics
  // =====================================================================

  function _trackFavCreation(type) {
    _memory.metrics.totalCreated++;
    if (_memory.metrics.byType[type] != null) _memory.metrics.byType[type]++;
    _memory.metrics.userCreatedFav = true;
    saveMemory();
  }

  /**
   * Track a trip started from a favorite tap.
   */
  function trackFavTrip() {
    _memory.metrics.favTrips++;
    saveMemory();
  }

  /**
   * Track a trip started from a history tap.
   */
  function trackHistoryReuse() {
    _memory.metrics.histTrips++;
    saveMemory();
  }

  /**
   * Track a confirmed provider tap (triggers history save).
   */
  function trackProviderTrip() {
    _memory.metrics.providerTrips++;
    saveMemory();
  }

  /**
   * Track a generic trip estimation (kept for backward compat).
   * @param {boolean} fromFavorite - Whether origin/dest came from a favorite
   */
  function trackTrip(fromFavorite) {
    if (fromFavorite) _memory.metrics.favTrips++;
    saveMemory();
  }

  /**
   * Check if current trip uses a favorite as origin or destination.
   */
  function isTripFromFavorite() {
    if (!_origin || !_dest) return false;
    return !!(findMatchingFavorite(_origin.lat, _origin.lon) || findMatchingFavorite(_dest.lat, _dest.lon));
  }

  /**
   * Get unified memory metrics with computed rates.
   */
  function getMemoryMetrics() {
    var m = _memory.metrics;
    var pt = m.providerTrips || 1; // avoid div/0
    return {
      // Raw counts
      favTrips: m.favTrips,
      histTrips: m.histTrips,
      providerTrips: m.providerTrips,
      totalCreated: m.totalCreated,
      byType: Object.assign({}, m.byType),
      userCreatedFav: m.userCreatedFav,
      // Computed rates (%)
      memory_favorite_usage_rate: Math.round((m.favTrips / pt) * 100),
      memory_history_usage_rate: Math.round((m.histTrips / pt) * 100),
      memory_to_action_rate: Math.round(((m.favTrips + m.histTrips) / pt) * 100)
    };
  }

  /**
   * Get favorites metrics (backward compat — delegates to getMemoryMetrics).
   */
  function getFavMetrics() {
    var mm = getMemoryMetrics();
    return {
      totalCreated: mm.totalCreated,
      byType: mm.byType,
      userCreatedFav: mm.userCreatedFav,
      tripsFromFavorite: mm.favTrips,
      totalTrips: mm.providerTrips,
      favorite_trip_rate: mm.memory_favorite_usage_rate,
      favorites_created: mm.totalCreated,
      favorite_creation_rate: mm.userCreatedFav ? 1 : 0
    };
  }

  /**
   * Get history metrics (backward compat — delegates to getMemoryMetrics).
   */
  function getHistoryMetrics() {
    var mm = getMemoryMetrics();
    return {
      totalTripsFromHistory: mm.histTrips,
      totalTripsWithProvider: mm.providerTrips,
      history_trip_rate: mm.memory_history_usage_rate,
      history_reuse_count: mm.histTrips
    };
  }

  // Legacy compat shims — these now delegate to loadMemory
  function loadFavorites() { /* no-op: handled by loadMemory() */ }
  function loadFavMetrics() { /* no-op: handled by loadMemory() */ }
  function loadHistory() { /* no-op: handled by loadMemory() */ }
  function loadHistoryMetrics() { /* no-op: handled by loadMemory() */ }
  function saveFavorites() { saveMemory(); }
  function saveHistory() { saveMemory(); }

  // =====================================================================
  //  EXPORTS
  // =====================================================================

  var MobilityController = {
    // Initialization
    init: init,

    // State accessors (Bridge)
    getOrigin: getOrigin,
    getDest: getDest,
    getEstimations: getEstimations,
    setEstimations: setEstimations,
    isOriginManual: isOriginManual,

    // State mutators (Bridge)
    setOrigin: setOrigin,
    setDest: setDest,
    setOriginName: setOriginName,
    setDestName: setDestName,
    setOriginManual: setOriginManual,
    clearOrigin: clearOrigin,
    clearDest: clearDest,
    clearState: clearState,

    // Estimation orchestration
    runEstimations: runEstimations,

    // Search coordination
    searchLocal: searchLocal,
    dedupResults: dedupResults,
    searchNominatim: searchNominatim,
    getSearchTimer: getSearchTimer,
    setSearchTimer: setSearchTimer,
    saveRecentSearch: saveRecentSearch,
    getRecentSearches: getRecentSearches,
    clearSearchCache: clearSearchCache,

    // Memory Layer — unified
    loadMemory: loadMemory,
    saveMemory: saveMemory,
    getMemoryMetrics: getMemoryMetrics,

    // Memory Layer — Favorites API
    loadFavorites: loadFavorites,       // legacy compat shim
    saveFavorites: saveFavorites,       // legacy compat shim
    getFavorites: getFavorites,
    canAddFavorite: canAddFavorite,
    customSlotsAvailable: customSlotsAvailable,
    addFavorite: addFavorite,
    updateFavorite: updateFavorite,
    removeFavorite: removeFavorite,
    findMatchingFavorite: findMatchingFavorite,
    hasFavorites: hasFavorites,
    favoritesCount: favoritesCount,

    // Memory Layer — Favorites metrics
    loadFavMetrics: loadFavMetrics,     // legacy compat shim
    getFavMetrics: getFavMetrics,
    trackTrip: trackTrip,
    isTripFromFavorite: isTripFromFavorite,
    trackFavTrip: trackFavTrip,

    // Memory Layer — History API
    loadHistory: loadHistory,           // legacy compat shim
    saveHistory: saveHistory,           // legacy compat shim
    getHistory: getHistory,
    hasHistory: hasHistory,
    addToHistory: addToHistory,
    clearHistory: clearHistory,
    getHistoryEntry: getHistoryEntry,

    // Memory Layer — History metrics
    loadHistoryMetrics: loadHistoryMetrics, // legacy compat shim
    getHistoryMetrics: getHistoryMetrics,
    trackHistoryReuse: trackHistoryReuse,
    trackProviderTrip: trackProviderTrip
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.MobilityController = MobilityController;
  }
  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilityController;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
