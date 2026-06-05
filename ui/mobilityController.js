/**
 * VOY v2 — UI Mobility Controller
 *
 * Orchestration layer between DOM/UI and core/mobilityEngine.
 *
 * RESPONSIBILITIES:
 *   1. UI State:        _origin, _dest, _estimations, _prefs, search cache/timers
 *   2. Estimation:      calls MobilityEngine.runAllEstimations(), stores result
 *   3. Recommendation:  calls MobilityEngine.computeRecommendation(), passes prefs
 *   4. Search:          coordinates searchLocal + searchNominatim + dedup + recent
 *   5. Prefs:           load/save/toggle with localStorage persistence
 *   6. Bridge:          setOrigin, setDest, getEstimation, getRecommendation, clearState
 *
 * THIS FILE DOES NOT:
 *   - Calculate or estimate anything (delegates to MobilityEngine)
 *   - Manipulate DOM or render HTML
 *   - Access map objects or markers
 *   - Handle events (clicks, touch, drag)
 *   - Decide business logic or scoring
 *
 * @module MobilityController
 * @version 2.0.0
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

  var _prefs = {
    avoidMoto: false,
    prioritizePrice: false,
    prioritizeSpeed: false,
    avoidLongWalks: false,
    avoidTransfers: false,
    withLuggage: false,
    withChildren: false
  };

  // Search state
  var _searchCache = {};        // cache Nominatim results: key=query, value=results
  var _lastSearchTime = 0;      // rate limiter for Nominatim API
  var _searchTimer = null;      // debounce timer handle

  // Favorites state
  var _favorites = {
    casa: null,      // { nombre, lat, lon, direccion } | null
    trabajo: null,   // { nombre, lat, lon, direccion } | null
    custom: []       // [{ id, nombre, lat, lon, direccion }] max 3
  };
  var _favMetrics = {
    totalCreated: 0,
    byType: { casa: 0, trabajo: 0, custom: 0 },
    tripsFromFavorite: 0,
    totalTrips: 0,
    userCreatedFav: false
  };

  // History state
  var _history = [];              // [{ id, ts, origin:{lat,lon,name}, dest:{lat,lon,name}, mode, provider }] max 20
  var _historyMetrics = {
    totalTripsFromHistory: 0,     // times user tapped a history item to start a trip
    totalTripsWithProvider: 0     // total trips where user tapped a provider (history save triggers)
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
   * @param {string} [config.historyKey] - localStorage key for trip history
   * @param {string} [config.historyMetricsKey] - localStorage key for history metrics
   */
  function init(config) {
    _config.busStops = config.busStops || [];
    _config.bikeStations = config.bikeStations || [];
    _config.landmarks = config.landmarks || [];
    _config.fareRegistry = config.fareRegistry || null;
    _config.providers = config.providers || null;
    if (config.recentKey) _config.recentKey = config.recentKey;
    if (config.prefsKey) _config.prefsKey = config.prefsKey;
    if (config.favsKey) _config.favsKey = config.favsKey;
    if (config.favMetricsKey) _config.favMetricsKey = config.favMetricsKey;
    if (config.historyKey) _config.historyKey = config.historyKey;
    if (config.historyMetricsKey) _config.historyMetricsKey = config.historyMetricsKey;
  }

  // =====================================================================
  //  2. STATE ACCESSORS (Bridge)
  // =====================================================================

  /**
   * Get current origin.
   * @returns {object|null} {lat, lon, name, source}
   */
  function getOrigin() {
    return _origin;
  }

  /**
   * Get current destination.
   * @returns {object|null} {lat, lon, name, source}
   */
  function getDest() {
    return _dest;
  }

  /**
   * Get current estimations.
   * @returns {Array|null}
   */
  function getEstimations() {
    return _estimations;
  }

  /**
   * Set estimations (used by drag-and-drop reordering from DOM).
   * @param {Array} estimations
   */
  function setEstimations(estimations) {
    _estimations = estimations;
  }

  /**
   * Get current preferences.
   * @returns {object}
   */
  function getPrefs() {
    return _prefs;
  }

  /**
   * Check if origin was set manually by user.
   * @returns {boolean}
   */
  function isOriginManual() {
    return _originManual;
  }

  // =====================================================================
  //  3. STATE MUTATORS (Bridge)
  // =====================================================================

  /**
   * Set origin point.
   * @param {number} lat
   * @param {number} lon
   * @param {string} name
   * @param {string} source - 'gps'|'cache'|'search'|'map'
   * @returns {boolean} true if both origin and dest are now set
   */
  function setOrigin(lat, lon, name, source) {
    _origin = { lat: lat, lon: lon, name: name || '', source: source || 'manual' };
    return !!(_origin && _dest);
  }

  /**
   * Set destination point.
   * @param {number} lat
   * @param {number} lon
   * @param {string} name
   * @param {string} source - 'search'|'map'
   * @returns {boolean} true if both origin and dest are now set
   */
  function setDest(lat, lon, name, source) {
    _dest = { lat: lat, lon: lon, name: name || '', source: source || 'manual' };
    return !!(_origin && _dest);
  }

  /**
   * Update origin name (e.g. after reverse geocode).
   * @param {string} name
   */
  function setOriginName(name) {
    if (_origin) _origin.name = name;
  }

  /**
   * Update destination name (e.g. after reverse geocode).
   * @param {string} name
   */
  function setDestName(name) {
    if (_dest) _dest.name = name;
  }

  /**
   * Set whether origin was manually set by user.
   * @param {boolean} val
   */
  function setOriginManual(val) {
    _originManual = !!val;
  }

  /**
   * Clear origin and estimations.
   */
  function clearOrigin() {
    _origin = null;
    _estimations = null;
  }

  /**
   * Clear destination and estimations.
   */
  function clearDest() {
    _dest = null;
    _estimations = null;
  }

  /**
   * Reset all state to initial values.
   */
  function clearState() {
    _origin = null;
    _dest = null;
    _originManual = false;
    _estimations = null;
    _searchCache = {};
    _lastSearchTime = 0;
    if (_searchTimer) {
      clearTimeout(_searchTimer);
      _searchTimer = null;
    }
  }

  // =====================================================================
  //  4. ESTIMATION ORCHESTRATION
  // =====================================================================

  /**
   * Run all estimations via MobilityEngine.
   * Stores result internally and returns it.
   *
   * @returns {Array|null} Estimations array or null if origin/dest missing
   */
  function runEstimations() {
    if (!_origin || !_dest) return null;
    _estimations = MobilityEngine.runAllEstimations(
      _origin,
      _dest,
      {
        busStops: _config.busStops,
        bikeStations: _config.bikeStations,
        fareRegistry: _config.fareRegistry
      }
    );
    return _estimations;
  }

  // =====================================================================
  //  5. RECOMMENDATION ORCHESTRATION
  // =====================================================================

  /**
   * Compute recommendation via MobilityEngine.
   * Passes current estimations, prefs and providers.
   *
   * @returns {object|null} {cheapest, fastest, balanced, reason} or null
   */
  function computeRecommendation() {
    return MobilityEngine.computeRecommendation(
      _estimations,
      _prefs,
      _config.providers
    );
  }

  // =====================================================================
  //  6. SEARCH COORDINATION
  // =====================================================================

  /**
   * Search local catalog via MobilityEngine.
   * @param {string} q - Search query
   * @returns {Array} Scored local results
   */
  function searchLocal(q) {
    return MobilityEngine.searchLocal(q, _config.busStops, _config.bikeStations, _config.landmarks);
  }

  /**
   * Deduplicate search results via MobilityEngine.
   * @param {Array} results
   * @returns {Array} Deduped, max 3
   */
  function dedupResults(results) {
    return MobilityEngine.dedupResults(results);
  }

  /**
   * Search Nominatim API + merge with local results.
   * Handles caching, rate limiting, and deduplication.
   *
   * @param {string} q - Search query
   * @returns {Promise<Array>} Merged and deduped results
   */
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

      // Merge local results with remote
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

  /**
   * Get the debounce timer handle (for clearTimeout from outside).
   * @returns {number|null}
   */
  function getSearchTimer() {
    return _searchTimer;
  }

  /**
   * Set the debounce timer handle.
   * @param {number|null} timer
   */
  function setSearchTimer(timer) {
    if (_searchTimer) clearTimeout(_searchTimer);
    _searchTimer = timer;
  }

  /**
   * Save a search result to recent searches (localStorage).
   * @param {object} result - {lat, lon, display_name}
   */
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

  /**
   * Get recent searches from localStorage.
   * @returns {Array}
   */
  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem(_config.recentKey) || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Invalidate search cache (e.g. when data changes).
   */
  function clearSearchCache() {
    _searchCache = {};
  }

  // =====================================================================
  //  7. PREFERENCES MANAGEMENT
  // =====================================================================

  /**
   * Load preferences from localStorage.
   * Merges with defaults (only known keys).
   */
  function loadPrefs() {
    try {
      var saved = localStorage.getItem(_config.prefsKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        Object.keys(_prefs).forEach(function (k) {
          if (k in parsed) _prefs[k] = !!parsed[k];
        });
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Save current preferences to localStorage.
   */
  function savePrefs() {
    try {
      localStorage.setItem(_config.prefsKey, JSON.stringify(_prefs));
    } catch (e) { /* silent */ }
  }

  /**
   * Toggle a preference by key.
   * Handles mutually exclusive pairs: prioritizePrice ↔ prioritizeSpeed.
   *
   * @param {string} key - Preference key to toggle
   * @returns {object} Updated prefs object
   */
  function togglePref(key) {
    if (!(key in _prefs)) return _prefs;

    _prefs[key] = !_prefs[key];

    // Mutually exclusive: price vs speed
    if (key === 'prioritizePrice' && _prefs.prioritizePrice) {
      _prefs.prioritizeSpeed = false;
    }
    if (key === 'prioritizeSpeed' && _prefs.prioritizeSpeed) {
      _prefs.prioritizePrice = false;
    }

    savePrefs();
    return _prefs;
  }

  /**
   * Check if any preference is active.
   * @returns {boolean}
   */
  function hasActivePrefs() {
    return Object.keys(_prefs).some(function (k) { return _prefs[k]; });
  }

  /**
   * Count active preferences.
   * @returns {number}
   */
  function countActivePrefs() {
    return Object.keys(_prefs).filter(function (k) { return _prefs[k]; }).length;
  }

  // =====================================================================
  //  8. FAVORITES MANAGEMENT
  // =====================================================================

  /**
   * Load favorites from localStorage.
   * Merges with defaults to handle schema evolution.
   */
  function loadFavorites() {
    try {
      var saved = localStorage.getItem(_config.favsKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.casa) _favorites.casa = parsed.casa;
        if (parsed.trabajo) _favorites.trabajo = parsed.trabajo;
        if (parsed.custom && Array.isArray(parsed.custom)) {
          _favorites.custom = parsed.custom.slice(0, 3);
        }
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Persist current favorites to localStorage.
   */
  function saveFavorites() {
    try {
      localStorage.setItem(_config.favsKey, JSON.stringify(_favorites));
    } catch (e) { /* silent */ }
  }

  /**
   * Get current favorites.
   * @returns {object} { casa, trabajo, custom }
   */
  function getFavorites() {
    return _favorites;
  }

  /**
   * Check if a favorite slot is available for a given type.
   * @param {string} type - 'casa'|'trabajo'|'custom'
   * @returns {boolean}
   */
  function canAddFavorite(type) {
    if (type === 'casa') return !_favorites.casa;
    if (type === 'trabajo') return !_favorites.trabajo;
    if (type === 'custom') return _favorites.custom.length < 3;
    return false;
  }

  /**
   * Get count of available custom favorite slots.
   * @returns {number}
   */
  function customSlotsAvailable() {
    return 3 - _favorites.custom.length;
  }

  /**
   * Add or overwrite a favorite.
   * @param {string} type - 'casa'|'trabajo'|'custom'
   * @param {string} nombre - Display name
   * @param {number} lat
   * @param {number} lon
   * @param {string} direccion - Visible address
   * @param {string} [id] - For custom, existing id to update
   * @returns {boolean} true if saved successfully
   */
  function addFavorite(type, nombre, lat, lon, direccion, id) {
    var entry = { nombre: nombre, lat: lat, lon: lon, direccion: direccion || '' };

    if (type === 'casa') {
      var wasNew = !_favorites.casa;
      _favorites.casa = entry;
      saveFavorites();
      if (wasNew) trackFavCreation('casa');
      return true;
    }
    if (type === 'trabajo') {
      var wasNew2 = !_favorites.trabajo;
      _favorites.trabajo = entry;
      saveFavorites();
      if (wasNew2) trackFavCreation('trabajo');
      return true;
    }
    if (type === 'custom') {
      if (id) {
        // Update existing custom favorite
        var found = _favorites.custom.find(function (f) { return f.id === id; });
        if (found) {
          found.nombre = nombre;
          found.lat = lat;
          found.lon = lon;
          found.direccion = direccion || '';
          saveFavorites();
          return true;
        }
      }
      // Add new custom favorite (max 3)
      if (_favorites.custom.length >= 3) return false;
      var newId = 'fav_' + Date.now();
      _favorites.custom.push(Object.assign({ id: newId }, entry));
      saveFavorites();
      trackFavCreation('custom');
      return true;
    }
    return false;
  }

  /**
   * Update an existing favorite by slot.
   * @param {string} slot - 'casa'|'trabajo'|custom id
   * @param {string} nombre
   * @param {number} lat
   * @param {number} lon
   * @param {string} direccion
   * @returns {boolean}
   */
  function updateFavorite(slot, nombre, lat, lon, direccion) {
    return addFavorite(slot === 'casa' ? 'casa' : slot === 'trabajo' ? 'trabajo' : 'custom',
      nombre, lat, lon, direccion, slot !== 'casa' && slot !== 'trabajo' ? slot : undefined);
  }

  /**
   * Remove a favorite by slot.
   * @param {string} slot - 'casa'|'trabajo'|custom id
   * @returns {boolean}
   */
  function removeFavorite(slot) {
    if (slot === 'casa') {
      _favorites.casa = null;
      saveFavorites();
      return true;
    }
    if (slot === 'trabajo') {
      _favorites.trabajo = null;
      saveFavorites();
      return true;
    }
    // Custom: find by id
    var idx = _favorites.custom.findIndex(function (f) { return f.id === slot; });
    if (idx >= 0) {
      _favorites.custom.splice(idx, 1);
      saveFavorites();
      return true;
    }
    return false;
  }

  /**
   * Check if a point is near an existing favorite (within ~100m).
   * @param {number} lat
   * @param {number} lon
   * @returns {object|null} The matching favorite or null
   */
  function findMatchingFavorite(lat, lon) {
    var threshold = 0.001; // ~111m
    if (_favorites.casa && Math.abs(_favorites.casa.lat - lat) < threshold && Math.abs(_favorites.casa.lon - lon) < threshold) {
      return { type: 'casa', fav: _favorites.casa };
    }
    if (_favorites.trabajo && Math.abs(_favorites.trabajo.lat - lat) < threshold && Math.abs(_favorites.trabajo.lon - lon) < threshold) {
      return { type: 'trabajo', fav: _favorites.trabajo };
    }
    for (var i = 0; i < _favorites.custom.length; i++) {
      var c = _favorites.custom[i];
      if (Math.abs(c.lat - lat) < threshold && Math.abs(c.lon - lon) < threshold) {
        return { type: 'custom', fav: c };
      }
    }
    return null;
  }

  /**
   * Check if there are any favorites saved.
   * @returns {boolean}
   */
  function hasFavorites() {
    return !!_favorites.casa || !!_favorites.trabajo || _favorites.custom.length > 0;
  }

  /**
   * Get total count of favorites.
   * @returns {number}
   */
  function favoritesCount() {
    var count = 0;
    if (_favorites.casa) count++;
    if (_favorites.trabajo) count++;
    count += _favorites.custom.length;
    return count;
  }

  // =====================================================================
  //  9. FAVORITES METRICS
  // =====================================================================

  /**
   * Load favorites metrics from localStorage.
   */
  function loadFavMetrics() {
    try {
      var saved = localStorage.getItem(_config.favMetricsKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.totalCreated != null) _favMetrics.totalCreated = parsed.totalCreated;
        if (parsed.byType) {
          if (parsed.byType.casa != null) _favMetrics.byType.casa = parsed.byType.casa;
          if (parsed.byType.trabajo != null) _favMetrics.byType.trabajo = parsed.byType.trabajo;
          if (parsed.byType.custom != null) _favMetrics.byType.custom = parsed.byType.custom;
        }
        if (parsed.tripsFromFavorite != null) _favMetrics.tripsFromFavorite = parsed.tripsFromFavorite;
        if (parsed.totalTrips != null) _favMetrics.totalTrips = parsed.totalTrips;
        if (parsed.userCreatedFav != null) _favMetrics.userCreatedFav = parsed.userCreatedFav;
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Persist favorites metrics to localStorage.
   */
  function saveFavMetrics() {
    try {
      localStorage.setItem(_config.favMetricsKey, JSON.stringify(_favMetrics));
    } catch (e) { /* silent */ }
  }

  /**
   * Get current favorites metrics.
   * @returns {object}
   */
  function getFavMetrics() {
    var metrics = Object.assign({}, _favMetrics);
    metrics.favorite_creation_rate = _favMetrics.userCreatedFav ? 1 : 0;
    metrics.favorites_created = _favMetrics.totalCreated;
    metrics.favorite_trip_rate = _favMetrics.totalTrips > 0
      ? Math.round((_favMetrics.tripsFromFavorite / _favMetrics.totalTrips) * 100)
      : 0;
    metrics.byType = Object.assign({}, _favMetrics.byType);
    return metrics;
  }

  /**
   * Track creation of a favorite.
   * @param {string} type - 'casa'|'trabajo'|'custom'
   */
  function trackFavCreation(type) {
    _favMetrics.totalCreated++;
    if (_favMetrics.byType[type] != null) _favMetrics.byType[type]++;
    _favMetrics.userCreatedFav = true;
    saveFavMetrics();
  }

  /**
   * Track a trip estimation (called on every runEstimations).
   * @param {boolean} fromFavorite - Whether origin or dest came from a favorite
   */
  function trackTrip(fromFavorite) {
    _favMetrics.totalTrips++;
    if (fromFavorite) _favMetrics.tripsFromFavorite++;
    saveFavMetrics();
  }

  /**
   * Check if current trip uses a favorite as origin or destination.
   * @returns {boolean}
   */
  function isTripFromFavorite() {
    if (!_origin || !_dest) return false;
    var oMatch = findMatchingFavorite(_origin.lat, _origin.lon);
    var dMatch = findMatchingFavorite(_dest.lat, _dest.lon);
    return !!(oMatch || dMatch);
  }

  // =====================================================================
  //  10. HISTORY MANAGEMENT
  // =====================================================================

  /**
   * Load trip history from localStorage.
   */
  function loadHistory() {
    try {
      var saved = localStorage.getItem(_config.historyKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          _history = parsed.slice(0, 20);
        }
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Persist trip history to localStorage.
   */
  function saveHistory() {
    try {
      localStorage.setItem(_config.historyKey, JSON.stringify(_history));
    } catch (e) { /* silent */ }
  }

  /**
   * Get trip history (newest first).
   * @returns {Array}
   */
  function getHistory() {
    return _history;
  }

  /**
   * Check if there are any history entries.
   * @returns {boolean}
   */
  function hasHistory() {
    return _history.length > 0;
  }

  /**
   * Add a trip to history.
   * Deduplicates consecutive identical trips (same origin, dest, provider).
   * FIFO: oldest entries removed when limit (20) exceeded.
   *
   * @param {object} origin - {lat, lon, name}
   * @param {object} dest - {lat, lon, name}
   * @param {string} mode - 'auto'|'moto'|'bus'|'walk'|'bike'
   * @param {string} provider - 'uber'|'didi'|'maxim'|'cabify'|'taxi'|'remis'|'taxiapp'|'colectivo'|etc.
   * @returns {boolean} true if added (not a duplicate)
   */
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
    if (_history.length > 0) {
      var last = _history[0];
      if (last.origin.lat === entry.origin.lat &&
          last.origin.lon === entry.origin.lon &&
          last.dest.lat === entry.dest.lat &&
          last.dest.lon === entry.dest.lon &&
          last.provider === entry.provider) {
        return false; // Consecutive duplicate, skip
      }
    }

    // Add to front (newest first)
    _history.unshift(entry);

    // FIFO: trim to max 20
    if (_history.length > 20) {
      _history = _history.slice(0, 20);
    }

    saveHistory();
    return true;
  }

  /**
   * Clear all trip history.
   */
  function clearHistory() {
    _history = [];
    saveHistory();
  }

  /**
   * Get a specific history entry by id.
   * @param {string} id - History entry id
   * @returns {object|null}
   */
  function getHistoryEntry(id) {
    return _history.find(function (h) { return h.id === id; }) || null;
  }

  // =====================================================================
  //  11. HISTORY METRICS
  // =====================================================================

  /**
   * Load history metrics from localStorage.
   */
  function loadHistoryMetrics() {
    try {
      var saved = localStorage.getItem(_config.historyMetricsKey);
      if (saved) {
        var parsed = JSON.parse(saved);
        if (parsed.totalTripsFromHistory != null) _historyMetrics.totalTripsFromHistory = parsed.totalTripsFromHistory;
        if (parsed.totalTripsWithProvider != null) _historyMetrics.totalTripsWithProvider = parsed.totalTripsWithProvider;
      }
    } catch (e) { /* silent */ }
  }

  /**
   * Persist history metrics to localStorage.
   */
  function saveHistoryMetrics() {
    try {
      localStorage.setItem(_config.historyMetricsKey, JSON.stringify(_historyMetrics));
    } catch (e) { /* silent */ }
  }

  /**
   * Get current history metrics.
   * @returns {object}
   */
  function getHistoryMetrics() {
    var metrics = Object.assign({}, _historyMetrics);
    metrics.history_trip_rate = _historyMetrics.totalTripsWithProvider > 0
      ? Math.round((_historyMetrics.totalTripsFromHistory / _historyMetrics.totalTripsWithProvider) * 100)
      : 0;
    metrics.history_reuse_count = _historyMetrics.totalTripsFromHistory;
    return metrics;
  }

  /**
   * Track a trip that was started from history (user tapped a history item).
   */
  function trackHistoryReuse() {
    _historyMetrics.totalTripsFromHistory++;
    saveHistoryMetrics();
  }

  /**
   * Track a trip where the user tapped a provider button (triggers history save).
   */
  function trackProviderTrip() {
    _historyMetrics.totalTripsWithProvider++;
    saveHistoryMetrics();
  }

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
    getPrefs: getPrefs,
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

    // Recommendation orchestration
    computeRecommendation: computeRecommendation,

    // Search coordination
    searchLocal: searchLocal,
    dedupResults: dedupResults,
    searchNominatim: searchNominatim,
    getSearchTimer: getSearchTimer,
    setSearchTimer: setSearchTimer,
    saveRecentSearch: saveRecentSearch,
    getRecentSearches: getRecentSearches,
    clearSearchCache: clearSearchCache,

    // Preferences management
    loadPrefs: loadPrefs,
    savePrefs: savePrefs,
    togglePref: togglePref,
    hasActivePrefs: hasActivePrefs,
    countActivePrefs: countActivePrefs,

    // Favorites management
    loadFavorites: loadFavorites,
    saveFavorites: saveFavorites,
    getFavorites: getFavorites,
    canAddFavorite: canAddFavorite,
    customSlotsAvailable: customSlotsAvailable,
    addFavorite: addFavorite,
    updateFavorite: updateFavorite,
    removeFavorite: removeFavorite,
    findMatchingFavorite: findMatchingFavorite,
    hasFavorites: hasFavorites,
    favoritesCount: favoritesCount,

    // Favorites metrics
    loadFavMetrics: loadFavMetrics,
    getFavMetrics: getFavMetrics,
    trackTrip: trackTrip,
    isTripFromFavorite: isTripFromFavorite,

    // History management
    loadHistory: loadHistory,
    saveHistory: saveHistory,
    getHistory: getHistory,
    hasHistory: hasHistory,
    addToHistory: addToHistory,
    clearHistory: clearHistory,
    getHistoryEntry: getHistoryEntry,

    // History metrics
    loadHistoryMetrics: loadHistoryMetrics,
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
