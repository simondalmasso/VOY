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

  function getMemoryKey() {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    return 'voy_memory_' + cityId;
  }

  function getRecentKey() {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    return (_config.recentKey || 'voy_recent_searches') + '_' + cityId;
  }

  function resetMemoryState() {
    _memory.favorites = {
      casa: null,
      trabajo: null,
      custom: []
    };
    _memory.history = [];
    _memory.metrics = {
      favTrips: 0,
      histTrips: 0,
      providerTrips: 0,
      totalCreated: 0,
      byType: { casa: 0, trabajo: 0, custom: 0 },
      userCreatedFav: false
    };
  }

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
    profile: null,
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
   * @param {object} [config.profile]     - city profile object reference
   * @param {Array}  config.busStops     - BUS_STOPS array
   * @param {Array}  config.bikeStations - BIKE_STATIONS array
   * @param {Array}  config.landmarks    - LANDMARKS array
   * @param {object} config.fareRegistry - FareRegistry object
   * @param {object} config.providers    - PROVIDERS registry
   * @param {string} [config.recentKey]  - localStorage key for recent searches
   * @param {string} [config.prefsKey]   - localStorage key for preferences
   */
  function init(config) {
    if (config.profile) _config.profile = config.profile;
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

  function setProfile(config) {
    if (!config || !config.preparedMemoryState) {
      throw new Error('preparedMemoryState is required');
    }

    _config.profile = config.profile || { city_id: '_default' };
    _config.busStops = config.busStops || [];
    _config.bikeStations = config.bikeStations || [];
    _config.landmarks = config.landmarks || [];
    _config.providers = config.providers || {};
    _config.fareRegistry = config.fareRegistry || {};

    // Clear and reset obsolete states síncronamente
    _origin = null;
    _dest = null;
    _estimations = null;
    _originManual = false;
    _searchCache = {};
    _lastSearchTime = 0;
    if (_searchTimer) {
      clearTimeout(_searchTimer);
      _searchTimer = null;
    }

    // Apply pre-resolved preparedMemoryState directly (strictly no storage reads!)
    resetMemoryState();
    var parsed = config.preparedMemoryState;
    if (parsed) {
      if (parsed.favorites) {
        if (parsed.favorites.casa) _memory.favorites.casa = parsed.favorites.casa;
        if (parsed.favorites.trabajo) _memory.favorites.trabajo = parsed.favorites.trabajo;
        if (parsed.favorites.custom && Array.isArray(parsed.favorites.custom)) {
          _memory.favorites.custom = parsed.favorites.custom.slice(0, CUSTOM_FAV_MAX);
        }
      }
      if (parsed.history && Array.isArray(parsed.history)) {
        _memory.history = parsed.history.slice(0, HISTORY_MAX);
      }
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
    // V7: the engine's rankProviders uses short IDs 'taxi'/'remis', but the view's
    // PROVIDERS object uses 'radiotaxi'/'remisreal'. We pass alias providers so the
    // engine's filter finds them, then remap the IDs back to PROVIDERS keys so the
    // view's _modeMatches() + buildAppLink() resolve correctly. This fixes the V7
    // transport mode selector (taxi/remis modes were showing empty heroes).
    if (_estimations && typeof MobilityEngine.rankProviders === 'function' && _config.providers) {
      var _engineProviders = _config.providers;
      // Build alias map only if the short IDs are missing from PROVIDERS
      if (!_config.providers.taxi && _config.providers.radiotaxi) {
        _engineProviders = {};
        for (var k in _config.providers) { _engineProviders[k] = _config.providers[k]; }
        _engineProviders.taxi = _config.providers.radiotaxi;
        _engineProviders.remis = _config.providers.remisreal;
      }
      for (var i = 0; i < _estimations.length; i++) {
        if (_estimations[i].mode === 'auto') {
          _estimations[i].rankedProviders = MobilityEngine.rankProviders(_estimations[i], _engineProviders);
          // Remap engine short IDs → PROVIDERS keys
          if (_estimations[i].rankedProviders && _estimations[i].rankedProviders.length) {
            _estimations[i].rankedProviders.forEach(function (p) {
              if (p.id === 'taxi' && _config.providers.radiotaxi) {
                p.id = 'radiotaxi'; p.name = _config.providers.radiotaxi.name;
              } else if (p.id === 'remis' && _config.providers.remisreal) {
                p.id = 'remisreal'; p.name = _config.providers.remisreal.name;
              }
            });
          }
          break;
        }
      }
    }
    return _estimations;
  }

  // =====================================================================
  //  4b. BUS LINE RANKING — VOY_COLLECTIVE_ENGINE_V1
  //  line_score = 0.35*proximity_to_user + 0.25*direction_alignment
  //             + 0.20*destination_coverage + 0.10*frequency_confidence
  //             + 0.10*manual_bias
  //  Pure computation over injected busStops + fareRegistry. No DOM, no fetch.
  //  Engine stays untouched (estimation primitives live in mobilityEngine; the
  //  multi-line ranking/scoring model is a controller concern).
  // =====================================================================

  /**
   * Rank ALL plausible bus lines that could serve the origin→destination trip.
   *
   * Scoring (VOY_COLLECTIVE_ENGINE_V1):
   *  - proximity_to_user:     how close the line's boarding stop is to origin
   *  - direction_alignment:   does the ride segment actually head toward dest?
   *                           (cosine similarity of board→alight vs origin→dest)
   *  - destination_coverage:  how close the alighting stop is to dest
   *  - frequency_confidence:  reliability proxy — more stops on the line = denser
   *                           service coverage = higher confidence the line is real
   *  - manual_bias:           1.0 if the user typed this line number, 0 otherwise
   *
   * @returns {Array} [{linea, stopOrigen, stopDest, walkToStopMin, rideMin,
   *                    walkFromStopMin, totalMin, price, stopOrigenCalles,
   *                    stopDestCalles, score, directionAlignment, stopCount}, ...]
   *                    sorted by score desc.
   */
  function rankBusLines() {
    if (!_origin || !_dest || !_config.busStops || !_config.fareRegistry || !_config.fareRegistry.bus) return [];
    var origin = _origin, dest = _dest;
    var busStops = _config.busStops;
    var busFare = _config.fareRegistry.bus;
    var haversine = MobilityEngine.haversine;

    // Group stops by line
    var stopsByLine = {};
    busStops.forEach(function (s) {
      if (!stopsByLine[s.linea]) stopsByLine[s.linea] = [];
      stopsByLine[s.linea].push(s);
    });

    // Detect manual line bias: if origin/dest name contains "linea N" or "lin N"
    var manualLine = null;
    var nameCombo = ((origin.name || '') + ' ' + (dest.name || '')).toLowerCase();
    var m = nameCombo.match(/(?:linea|lin\.?)\s*(\d+)/);
    if (m) manualLine = m[1];

    // Desired travel direction (origin → dest), as a unit vector in lon/lat space.
    // Used to test whether each candidate line actually goes the user's way.
    var tripVec = { dx: dest.lon - origin.lon, dy: dest.lat - origin.lat };
    var tripMag = Math.hypot(tripVec.dx, tripVec.dy) || 1e-9;
    tripVec.dx /= tripMag; tripVec.dy /= tripMag;

    var candidates = [];
    Object.keys(stopsByLine).forEach(function (linea) {
      var stops = stopsByLine[linea];
      if (stops.length < 2) return;

      // Nearest stop to origin (boarding) and nearest distinct stop to dest (alighting).
      // Prefer a distinct alighting stop so the ride segment is meaningful; only fall
      // back to the same stop when the line has exactly one useful stop.
      var nearOrig = null, nearDest = null, minDO = Infinity, minDD = Infinity;
      stops.forEach(function (s) {
        var dO = haversine(origin.lat, origin.lon, s.lat, s.lon);
        var dD = haversine(dest.lat, dest.lon, s.lat, s.lon);
        if (dO < minDO) { minDO = dO; nearOrig = s; }
        if (dD < minDD) { minDD = dD; nearDest = s; }
      });
      // If boarding == alighting, pick the 2nd-nearest stop to dest to form a ride.
      if (nearOrig === nearDest && stops.length >= 2) {
        var second = null, minD2 = Infinity;
        stops.forEach(function (s) {
          if (s === nearOrig) return;
          var dD = haversine(dest.lat, dest.lon, s.lat, s.lon);
          if (dD < minD2) { minD2 = dD; second = s; }
        });
        if (second) { nearDest = second; minDD = minD2; }
      }

      var rideDist = haversine(nearOrig.lat, nearOrig.lon, nearDest.lat, nearDest.lon);
      var walkToStopMin = minDO / 5 * 60 + 3;
      var rideMin = rideDist / 15 * 60;
      var walkFromStopMin = minDD / 5 * 60 + 5;
      var totalMin = walkToStopMin + rideMin + walkFromStopMin;

      // --- Score components (each 0..1) ---
      // proximity_to_user: boarding stop within 0km=1, 1km+=0
      var proximity_to_user = Math.max(0, Math.min(1, 1 - minDO / 1.0));
      // destination_coverage: alighting stop within 0km=1, 1km+=0
      var destination_coverage = Math.max(0, Math.min(1, 1 - minDD / 1.0));
      // direction_alignment: cosine similarity of (board→alight) vs (origin→dest).
      // Range -1..1 → normalize to 0..1 via (cos+1)/2. A line going the wrong way
      // (cos<0) scores below 0.5; a line going the right way scores above 0.5.
      // When the ride segment is degenerate (same stop / ~0 length), alignment=0.
      var directionAlignment = 0;
      if (rideDist > 0.02) {
        var rideVec = { dx: nearDest.lon - nearOrig.lon, dy: nearDest.lat - nearOrig.lat };
        var rideMag = Math.hypot(rideVec.dx, rideVec.dy) || 1e-9;
        var cos = (rideVec.dx / rideMag) * tripVec.dx + (rideVec.dy / rideMag) * tripVec.dy;
        directionAlignment = Math.max(0, Math.min(1, (cos + 1) / 2));
      }
      // frequency_confidence: more stops on the line = denser, more reliable service.
      // 6+ stops → 1.0; scales linearly below that.
      var frequency_confidence = Math.min(1, stops.length / 6);
      // manual_bias: 1.0 if the user explicitly named this line, else 0.
      var manual_bias = (manualLine && String(linea) === String(manualLine)) ? 1 : 0;

      var score = 0.35 * proximity_to_user
                + 0.25 * directionAlignment
                + 0.20 * destination_coverage
                + 0.10 * frequency_confidence
                + 0.10 * manual_bias;

      candidates.push({
        linea: linea,
        stopOrigen: nearOrig,
        stopDest: nearDest,
        walkToStopMin: Math.ceil(walkToStopMin),
        rideMin: Math.ceil(rideMin),
        walkFromStopMin: Math.ceil(walkFromStopMin),
        totalMin: Math.ceil(totalMin),
        price: busFare.sube,
        stopOrigenCalles: nearOrig.calles,
        stopDestCalles: nearDest.calles,
        directionAlignment: Math.round(directionAlignment * 1000) / 1000,
        score: Math.round(score * 1000) / 1000,
        stopCount: stops.length
      });
    });

    candidates.sort(function (a, b) { return b.score - a.score; });
    return candidates;
  }

  // =====================================================================
  //  4c. BUS LINE GEOMETRY (P6) — ordered stop coordinates for route overlay
  //  Returns [lon,lat] array sorted to approximate a path (no GTFS shapes).
  //  Clearly "estimated" — the view labels it as such.
  // =====================================================================

  function getBusLineGeometry(linea) {
    if (!_config.busStops) return [];
    var stops = _config.busStops.filter(function (s) { return String(s.linea) === String(linea); });
    if (stops.length < 2) return [];
    // V7.1 (Gemini AC-8): nearest-neighbor chain seeded from the stop closest to the
    // user's origin. Replaces the old lon/lat zigzag with a coherent path approximation.
    var origin = getOrigin();
    var remaining = stops.slice();
    var seedIdx = 0;
    if (origin) {
      var best = Infinity;
      for (var i = 0; i < remaining.length; i++) {
        var dSeed = Math.hypot(remaining[i].lat - origin.lat, remaining[i].lon - origin.lon);
        if (dSeed < best) { best = dSeed; seedIdx = i; }
      }
    }
    var ordered = [remaining.splice(seedIdx, 1)[0]];
    while (remaining.length) {
      var last = ordered[ordered.length - 1];
      var bi = 0, bd = Infinity;
      for (var j = 0; j < remaining.length; j++) {
        var dd = Math.hypot(remaining[j].lat - last.lat, remaining[j].lon - last.lon);
        if (dd < bd) { bd = dd; bi = j; }
      }
      ordered.push(remaining.splice(bi, 1)[0]);
    }
    return ordered.map(function (s) { return [s.lon, s.lat]; });
  }

  function getBusLineStops(linea) {
    if (!_config.busStops) return [];
    return _config.busStops.filter(function (s) { return String(s.linea) === String(linea); });
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
    // P1/F1: normalize cache key (lowercase + strip accents) so "Belgrano" and "Bélgrano" share cache
    var key = MobilityEngine.normalize(q).trim();
    if (!key) return [];
    if (_searchCache[key]) return _searchCache[key];

    // P1/F1: removed the 1100ms blocking rate-limiter — it returned [] on rapid typing,
    // which broke mobile destination search. The 250ms debounce in the view + aggressive
    // per-query caching is sufficient to respect Nominatim's usage policy for low-traffic demo use.
    // If Nominatim returns 429, the catch returns [] and local results still render.
    _lastSearchTime = Date.now();

    try {
      var profile = _config.profile || { city_id: '_default', displayName: 'Ciudad Desconocida', map: {} };
      var isDefault = (profile.city_id === '_default');

      var queryText = q;
      if (!isDefault && profile.displayName) {
        queryText = q + ', ' + profile.displayName;
      }

      var url = 'https://nominatim.openstreetmap.org/search?' +
        'q=' + encodeURIComponent(queryText) +
        '&format=json&limit=10&accept-language=es';

      if (!isDefault && profile.map && profile.map.viewbox) {
        url += '&viewbox=' + profile.map.viewbox + '&bounded=1';
      }
      url += '&addressdetails=1';

      var r = await fetch(url, { headers: { 'User-Agent': 'MovilidadAsistente/1.0' } });
      if (!r.ok) return [];
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
      var recent = JSON.parse(localStorage.getItem(getRecentKey()) || '[]');
      var displayName = result.display_name || result.name || '';
      var name = displayName.split(',')[0];
      var entry = { name: name, lat: result.lat, lon: result.lon, display: displayName };
      var filtered = recent.filter(function (r) { return r.name !== entry.name; });
      localStorage.setItem(getRecentKey(), JSON.stringify([entry].concat(filtered).slice(0, 10)));
    } catch (e) { /* silent */ }
  }

  function getRecentSearches() {
    try { return JSON.parse(localStorage.getItem(getRecentKey()) || '[]'); }
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
      var activeCityId = (_config.profile && _config.profile.city_id) || '_default';
      if (activeCityId !== 'santafe') {
        return;
      }

      if (localStorage.getItem('voy_memory_legacy_migrated_v1')) {
        return;
      }

      // If voy_memory_santafe already exists, no migration needed
      if (localStorage.getItem('voy_memory_santafe')) return;

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
      localStorage.setItem('voy_memory_santafe', JSON.stringify(migrated));

      // Verify the target write before deleting any legacy source data.
      var verification = JSON.parse(localStorage.getItem('voy_memory_santafe'));
      if (!verification || !verification.favorites) {
        throw new Error('Legacy memory verification failed');
      }

      // Clean up legacy keys
      localStorage.removeItem(_config.favsKey);
      localStorage.removeItem(_config.favMetricsKey);
      localStorage.removeItem(_config.historyKey);
      localStorage.removeItem(_config.historyMetricsKey);

      // Write one-time migrated flag
      localStorage.setItem('voy_memory_legacy_migrated_v1', '1');

    } catch (e) { /* silent — if migration fails, start fresh */ }
  }

  /**
   * Load unified memory from localStorage.
   * Handles migration from legacy keys on first load.
   */
  function loadMemory() {
    resetMemoryState();
    try {
      // Try migration first
      _migrateLegacyMemory();

      var saved = localStorage.getItem(getMemoryKey());
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
    try { localStorage.setItem(getMemoryKey(), JSON.stringify(_memory)); }
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
  //  V5 EXTENSIONS — IndexedDB (AES-GCM encrypted) + inference + fare
  //  confidence + ranked search. Additive only; existing API preserved.
  // =====================================================================

  var _db = null;
  var DB_NAME = 'voy_v5';
  var DB_VERSION = 1;
  var _cryptoKey = null;
  var CRYPTO_KEY_NAME = 'voy_v5_key';
  var RECENT_MAX_V5 = 20;
  var TRIP_MAX_V5 = 200;

  function _supportsSubtle() {
    return typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.encrypt === 'function';
  }

  async function _getCryptoKey() {
    if (_cryptoKey) return _cryptoKey;
    if (!_supportsSubtle()) return null;
    try {
      var raw = null;
      try { raw = localStorage.getItem(CRYPTO_KEY_NAME); } catch (e) {}
      if (!raw) {
        var key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
        var exported = await crypto.subtle.exportKey('raw', key);
        raw = _bytesToB64(new Uint8Array(exported));
        try { localStorage.setItem(CRYPTO_KEY_NAME, raw); } catch (e) {}
      }
      var bytes = _b64ToBytes(raw);
      _cryptoKey = await crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
      return _cryptoKey;
    } catch (e) { return null; }
  }

  function _bytesToB64(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  }
  function _b64ToBytes(b64) {
    var s = atob(b64); var arr = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }

  async function _encrypt(plain) {
    var key = await _getCryptoKey();
    if (!key) return { __plain: true, v: plain };
    try {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      var enc = new TextEncoder().encode(JSON.stringify(plain));
      var cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc);
      var combined = new Uint8Array(iv.length + cipher.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(cipher), iv.length);
      return { __enc: true, v: _bytesToB64(combined) };
    } catch (e) { return { __plain: true, v: plain }; }
  }

  async function _decrypt(wrapped) {
    if (!wrapped) return null;
    if (wrapped.__plain) return wrapped.v;
    if (!wrapped.__enc) return wrapped; // legacy/raw value
    var key = await _getCryptoKey();
    if (!key) return null;
    try {
      var combined = _b64ToBytes(wrapped.v);
      var iv = combined.slice(0, 12);
      var cipher = combined.slice(12);
      var plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, cipher);
      return JSON.parse(new TextDecoder().decode(plain));
    } catch (e) { return null; }
  }

  function openDB() {
    return new Promise(function (resolve) {
      if (typeof indexedDB === 'undefined') { resolve(null); return; }
      if (_db) { resolve(_db); return; }
      try {
        var req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = function (e) {
          var d = e.target.result;
          if (!d.objectStoreNames.contains('recents')) d.createObjectStore('recents', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('favorites')) d.createObjectStore('favorites', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('trips')) d.createObjectStore('trips', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'key' });
        };
        req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
        req.onerror = function () { resolve(null); };
      } catch (e) { resolve(null); }
    });
  }

  function dbPut(store, value) {
    return openDB().then(function (d) {
      if (!d) return false;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(store, 'readwrite');
          tx.objectStore(store).put(value);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    });
  }

  function dbGetAll(store) {
    return openDB().then(function (d) {
      if (!d) return [];
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(store, 'readonly');
          var req = tx.objectStore(store).getAll();
          req.onsuccess = function () { resolve(req.result || []); };
          req.onerror = function () { resolve([]); };
        } catch (e) { resolve([]); }
      });
    });
  }

  function dbDelete(store, id) {
    return openDB().then(function (d) {
      if (!d) return false;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(store, 'readwrite');
          tx.objectStore(store).delete(id);
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    });
  }

  function dbClear(store) {
    return openDB().then(function (d) {
      if (!d) return false;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction(store, 'readwrite');
          tx.objectStore(store).clear();
          tx.oncomplete = function () { resolve(true); };
          tx.onerror = function () { resolve(false); };
        } catch (e) { resolve(false); }
      });
    });
  }

  // Encrypted put/get wrappers
  async function encPut(store, value) {
    var wrapped = await _encrypt(value);
    return dbPut(store, { id: value.id, __wrapped: wrapped });
  }
  async function encGetAll(store) {
    var rows = await dbGetAll(store);
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].__wrapped) {
        var v = await _decrypt(rows[i].__wrapped);
        if (v) out.push(v);
      } else if (rows[i] && !rows[i].__wrapped && rows[i].id) {
        out.push(rows[i]);
      }
    }
    return out;
  }

  function cityMetaKey(baseKey) {
    if (baseKey === 'lastTransport' || baseKey === 'preferredProvider') {
      var cityId = (_config.profile && _config.profile.city_id) || '_default';
      return baseKey + '_' + cityId;
    }
    return baseKey;
  }

  function dbMetaGet(key) {
    var targetKey = cityMetaKey(key);
    return openDB().then(function (d) {
      if (!d) return null;
      return new Promise(function (resolve) {
        try {
          var tx = d.transaction('meta', 'readonly');
          var req = tx.objectStore('meta').get(targetKey);
          req.onsuccess = function () { resolve(req.result ? req.result.value : null); };
          req.onerror = function () { resolve(null); };
        } catch (e) { resolve(null); }
      });
    });
  }
  function dbMetaSet(key, value) {
    var targetKey = cityMetaKey(key);
    return dbPut('meta', { key: targetKey, value: value });
  }

  // ---- Recents ----
  async function v5AddRecent(place) {
    if (!place || place.lat == null || place.lon == null) return;
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var entry = {
      id: cityId + '_r_' + Math.round(place.lat * 10000) + '_' + Math.round(place.lon * 10000),
      name: place.name || '',
      lat: place.lat, lon: place.lon,
      ts: Date.now()
    };
    await encPut('recents', entry);
    var all = await encGetAll('recents');
    all = all.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
    all.sort(function (a, b) { return b.ts - a.ts; });
    if (all.length > RECENT_MAX_V5) {
      for (var i = RECENT_MAX_V5; i < all.length; i++) await dbDelete('recents', all[i].id);
    }
  }
  async function v5GetRecents(limit) {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var all = await encGetAll('recents');
    all = all.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
    all.sort(function (a, b) { return b.ts - a.ts; });
    return all.slice(0, limit || 10);
  }
  async function v5ClearRecents() { return dbClear('recents'); }

  // ---- Favorites ----
  async function v5AddFavorite(place, label) {
    if (!place || place.lat == null || place.lon == null) return false;
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var entry = {
      id: cityId + '_f_' + Math.round(place.lat * 10000) + '_' + Math.round(place.lon * 10000),
      name: place.name || '',
      label: label || '',
      lat: place.lat, lon: place.lon,
      ts: Date.now()
    };
    return encPut('favorites', entry);
  }
  async function v5GetFavorites() {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var all = await encGetAll('favorites');
    return all.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
  }
  async function v5RemoveFavorite(id) { return dbDelete('favorites', id); }

  // ---- Trip logging (drives inference + frequent) ----
  async function v5LogTrip(origin, dest, mode, provider) {
    if (!origin || !dest) return;
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var entry = {
      id: cityId + '_t_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      ts: Date.now(),
      origin: { lat: origin.lat, lon: origin.lon, name: origin.name || '' },
      dest: { lat: dest.lat, lon: dest.lon, name: dest.name || '' },
      mode: mode || 'auto',
      provider: provider || ''
    };
    await encPut('trips', entry);
    await dbMetaSet('lastTransport', mode || 'auto');
    if (provider) await dbMetaSet('preferredProvider', provider);
    // Trim
    var all = await encGetAll('trips');
    all = all.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
    all.sort(function (a, b) { return b.ts - a.ts; });
    if (all.length > TRIP_MAX_V5) {
      for (var i = TRIP_MAX_V5; i < all.length; i++) await dbDelete('trips', all[i].id);
    }
  }

  // ---- Home/Work inference ----
  async function v5InferHomeWork() {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var trips = await encGetAll('trips');
    trips = trips.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
    if (!trips.length) return { home: null, work: null };
    var night = {}, day = {};
    trips.forEach(function (t) {
      if (!t.dest) return;
      var h = new Date(t.ts).getHours();
      var key = Math.round(t.dest.lat * 1000) + '_' + Math.round(t.dest.lon * 1000);
      var bucket = (h >= 20 || h < 8) ? night : (h >= 9 && h < 18) ? day : null;
      if (!bucket) return;
      if (!bucket[key]) bucket[key] = { count: 0, dest: t.dest };
      bucket[key].count++;
    });
    function top(b) {
      var best = null, max = 0;
      Object.keys(b).forEach(function (k) { if (b[k].count > max) { max = b[k].count; best = b[k]; } });
      return best && best.count >= 2 ? best.dest : null;
    }
    return { home: top(night), work: top(day) };
  }

  // ---- Frequent destinations ----
  async function v5GetFrequent(limit) {
    var cityId = (_config.profile && _config.profile.city_id) || '_default';
    var trips = await encGetAll('trips');
    trips = trips.filter(function (x) { return x.id && x.id.indexOf(cityId + '_') === 0; });
    var counts = {};
    trips.forEach(function (t) {
      if (!t.dest) return;
      var key = Math.round(t.dest.lat * 1000) + '_' + Math.round(t.dest.lon * 1000);
      if (!counts[key]) counts[key] = { count: 0, dest: t.dest };
      counts[key].count++;
    });
    var arr = Object.keys(counts).map(function (k) { return counts[k]; });
    arr.sort(function (a, b) { return b.count - a.count; });
    return arr.slice(0, limit || 5).map(function (x) { return x.dest; });
  }

  async function v5GetMeta(key) { return dbMetaGet(key); }

  // ---- Erase everything (privacy: user can erase everything) ----
  async function v5EraseAll() {
    await dbClear('recents');
    await dbClear('favorites');
    await dbClear('trips');
    await dbClear('meta');
    try { localStorage.removeItem(CRYPTO_KEY_NAME); } catch (e) {}
    _cryptoKey = null;
    return true;
  }

  // ---- Fare confidence + range ----
  function v5FareConfidence(distanceKm, timeMin) {
    var distFactor = Math.max(0.55, 1 - distanceKm / 40);
    var timeFactor = Math.max(0.7, 1 - timeMin / 90);
    return Math.round(Math.min(0.95, distFactor * timeFactor) * 100) / 100;
  }
  function v5FareRange(price, confidence) {
    var spread = (1 - confidence) * 0.3;
    return {
      low: Math.round(price * (1 - spread)),
      high: Math.round(price * (1 + spread))
    };
  }

  // ---- V6 Fare Engine: per-provider confidence + surge logic ----
  // fare_engine_v2.json: uber 0.85 (dynamic), didi 0.88 (semi_dynamic), maxim 0.75 (fixed_or_scheduled)
  var V6_PROVIDER_CONFIDENCE = {
    uber: 0.85,
    didi: 0.88,
    maxim: 0.75,
    taxi: 0.82,
    remis: 0.78
  };
  function v6FareConfidence(provider, distanceKm, timeMin) {
    var base = V6_PROVIDER_CONFIDENCE[provider] || 0.80;
    // Distance decay: longer routes = slightly less predictable
    var distFactor = Math.max(0.92, 1 - distanceKm / 60);
    // Time decay
    var timeFactor = Math.max(0.94, 1 - timeMin / 120);
    var conf = base * distFactor * timeFactor;
    return Math.round(Math.min(0.95, Math.max(0.55, conf)) * 100) / 100;
  }
  // Surge: night hours (22-06) trigger multiplier. Conservative range (1.0-1.3).
  // Full 2.5x requires rain/demand data we don't have; night is the reliable signal.
  function v6SurgeMultiplier(provider) {
    var hour = new Date().getHours();
    var isNight = hour >= 22 || hour < 6;
    if (!isNight) return 1.0;
    // Dynamic providers surge more; fixed/scheduled less
    if (provider === 'uber') return 1.3;
    if (provider === 'didi') return 1.2;
    if (provider === 'maxim') return 1.1;
    if (provider === 'taxi') return 1.25; // nocturno tariff
    if (provider === 'remis') return 1.15;
    return 1.0;
  }
  function v6SurgeLabel(provider) {
    var m = v6SurgeMultiplier(provider);
    if (m > 1.0) return 'Hora pico';
    return '';
  }
  // V6 fare range with surge-aware spread
  function v6FareRange(price, confidence, surgeMultiplier) {
    var baseSpread = (1 - confidence) * 0.25;
    var surge = surgeMultiplier || 1.0;
    return {
      low: Math.round(price * (1 - baseSpread)),
      high: Math.round(price * surge * (1 + baseSpread))
    };
  }

  // ---- Ranked search: favorites → recents → home/work → local → (remote by caller) ----
  async function v5SearchLocalRanked(query, gpsOrigin) {
    var q = MobilityEngine.normalize(query || '').trim();
    if (q.length < 2) return [];
    var results = [];

    var favs = await v5GetFavorites();
    favs.forEach(function (f) {
      var s = MobilityEngine.fuzzyScore(q, f.name || '');
      if (s > 0) results.push({ type: 'favorite', name: f.name, lat: f.lat, lon: f.lon, score: s + 55, label: f.label });
    });

    var hw = await v5InferHomeWork();
    if (hw.home) {
      var sh = MobilityEngine.fuzzyScore(q, 'casa');
      if (sh > 0) results.push({ type: 'home', name: 'Casa', lat: hw.home.lat, lon: hw.home.lon, score: sh + 50 });
    }
    if (hw.work) {
      var sw = MobilityEngine.fuzzyScore(q, 'trabajo');
      if (sw > 0) results.push({ type: 'work', name: 'Trabajo', lat: hw.work.lat, lon: hw.work.lon, score: sw + 50 });
    }

    var recents = await v5GetRecents(12);
    recents.forEach(function (r) {
      var s = MobilityEngine.fuzzyScore(q, r.name || '');
      if (s > 0) results.push({ type: 'recent', name: r.name, lat: r.lat, lon: r.lon, score: s + 45 });
    });

    var local = searchLocal(query);
    local.forEach(function (r) {
      if (r && r.lat != null) results.push(r);
    });

    if (gpsOrigin) {
      results.forEach(function (r) {
        if (r.lat != null && r.lon != null) {
          var d = MobilityEngine.haversine(gpsOrigin.lat, gpsOrigin.lon, r.lat, r.lon);
          r.gpsBias = Math.max(0, 1 - d / 5);
          r.score = (r.score || 0) + r.gpsBias * 20;
        }
      });
    }

    results.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return results.slice(0, 8);
  }

  // ---- Session token (for remote search dedup) ----
  var _v5SessionToken = null;
  function v5NewSessionToken() {
    _v5SessionToken = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    return _v5SessionToken;
  }
  function v5GetSessionToken() { return _v5SessionToken; }

  // =====================================================================
  //  EXPORTS
  // =====================================================================

  var MobilityController = {
    // Initialization
    init: init,
    setProfile: setProfile,

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

    // P5/P6: Bus line ranking + geometry (view calls these for the bus mini-block)
    rankBusLines: rankBusLines,
    getBusLineGeometry: getBusLineGeometry,
    getBusLineStops: getBusLineStops,

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
    trackProviderTrip: trackProviderTrip,

    // V5 Extensions — IndexedDB (AES-GCM encrypted) + inference + fare
    v5AddRecent: v5AddRecent,
    v5GetRecents: v5GetRecents,
    v5ClearRecents: v5ClearRecents,
    v5AddFavorite: v5AddFavorite,
    v5GetFavorites: v5GetFavorites,
    v5RemoveFavorite: v5RemoveFavorite,
    v5LogTrip: v5LogTrip,
    v5InferHomeWork: v5InferHomeWork,
    v5GetFrequent: v5GetFrequent,
    v5GetMeta: v5GetMeta,
    v5EraseAll: v5EraseAll,
    v5FareConfidence: v5FareConfidence,
    v5FareRange: v5FareRange,
    v6FareConfidence: v6FareConfidence,
    v6SurgeMultiplier: v6SurgeMultiplier,
    v6SurgeLabel: v6SurgeLabel,
    v6FareRange: v6FareRange,
    v5SearchLocalRanked: v5SearchLocalRanked,
    v5NewSessionToken: v5NewSessionToken,
    v5GetSessionToken: v5GetSessionToken
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
