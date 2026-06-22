/**
 * VOY v2 — Core Mobility Engine
 *
 * Pure computational module for urban mobility estimation and recommendation.
 *
 * NO DOM manipulation, NO map logic, NO event listeners, NO UI rendering,
 * NO localStorage, NO fetch/API calls, NO HTML strings.
 *
 * All data dependencies are injected via parameters.
 * All functions are pure: same inputs → same outputs.
 * Fully deterministic and testable.
 *
 * @module MobilityEngine
 * @version 2.0.0
 */
(function (global) {
  'use strict';

  // =====================================================================
  //  1. PURE UTILITIES
  // =====================================================================

  /**
   * Haversine distance between two geo points.
   * @param {number} lat1
   * @param {number} lon1
   * @param {number} lat2
   * @param {number} lon2
   * @returns {number} Distance in kilometers
   */
  function haversine(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Format price in Argentine pesos.
   * @param {number} n
   * @returns {string} e.g. "$1.900"
   */
  function formatPrice(n) {
    return '$' + n.toLocaleString('es-AR');
  }

  /**
   * Format minutes with ceiling.
   * @param {number} m
   * @returns {string} e.g. "15 min"
   */
  function formatMin(m) {
    return Math.ceil(m) + ' min';
  }

  /**
   * Normalize string for fuzzy matching (remove diacritics, lowercase).
   * @param {string} s
   * @returns {string}
   */
  function normalize(s) {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  /**
   * Fuzzy score for search matching.
   * @param {string} query
   * @param {string} target
   * @returns {number} 0 = no match, higher = better
   */
  function fuzzyScore(query, target) {
    var nq = normalize(query);
    var nt = normalize(target);
    var idx = nt.indexOf(nq);
    if (idx >= 0) {
      return idx === 0 ? 100 : 80; // substring match, higher at start
    }
    // character-by-character matching
    var qi = 0, score = 0;
    for (var ti = 0; ti < nt.length && qi < nq.length; ti++) {
      if (nt[ti] === nq[qi]) {
        score += 10;
        if (ti === 0 || nt[ti - 1] === ' ') score += 5; // word boundary bonus
        qi++;
      }
    }
    return qi === nq.length ? score : 0;
  }

  // =====================================================================
  //  2. FARE SYSTEM
  // =====================================================================

  /**
   * Calculate ride-hailing app price from fare config.
   * @param {object} fareConfig - e.g. FareRegistry.apps.uber
   * @param {number} distKm - Distance in km
   * @param {number} timeMin - Estimated ride time in minutes
   * @returns {number|null} Price in ARS, or null if unavailable
   */
  function calcAppPrice(fareConfig, distKm, timeMin) {
    if (!fareConfig || fareConfig.base === null) return null;
    var price = fareConfig.base + fareConfig.km * distKm + fareConfig.min * timeMin;
    return Math.max(price, fareConfig.minFare);
  }

  /**
   * Calculate taxi fare (diurno/nocturno).
   * @param {number} distKm - Distance in km
   * @param {object} taxiFare - FareRegistry.taxi object
   * @param {number} hour - Current hour (0-23) for diurno/nocturno
   * @returns {number} Price in ARS
   */
  function estimateTaxi(distKm, taxiFare, hour) {
    var t = (hour >= 6 && hour < 22) ? taxiFare.diurno : taxiFare.nocturno;
    var fichas = Math.floor(distKm * 1000 / t.distFicha);
    return t.bajada + fichas * t.ficha;
  }

  // =====================================================================
  //  3. ESTIMATION FUNCTIONS (pure, no DOM, no map)
  // =====================================================================

  // MOBILITY_CORE_RANKING_V1: bike is tertiary suggestion, only viable under 3km.
  var BIKE_MAX_DISTANCE_KM = 3;

  /**
   * Estimate auto ride with all providers.
   * @param {number} distKm - Distance in km
   * @param {object} fareRegistry - Complete FareRegistry object
   * @param {number} hour - Current hour (0-23) for taxi day/night
   * @returns {object} Auto estimation with per-provider prices and times
   */
  function estimateAuto(distKm, fareRegistry, hour) {
    var durCar = (distKm / 25) * 60;
    var apps = fareRegistry.apps;
    var uberPrice = calcAppPrice(apps.uber, distKm, durCar);
    var didiPrice = calcAppPrice(apps.didi, distKm, durCar);
    var maximPrice = calcAppPrice(apps.maxim, distKm, durCar);
    var cabifyPrice = calcAppPrice(apps.cabify, distKm, durCar); // null
    var taxiPrice = estimateTaxi(distKm, fareRegistry.taxi, hour);
    var remisPrice = taxiPrice;
    var taxiappPrice = taxiPrice;
    return {
      timeMin: Math.round(durCar),
      uberTimeMin: Math.round(durCar * 1.00),
      didiTimeMin: Math.round(durCar * 1.03),
      maximTimeMin: Math.round(durCar * 1.05),
      taxiTimeMin: Math.round(durCar * 1.10),
      remisTimeMin: Math.round(durCar * 1.08),
      taxiappTimeMin: Math.round(durCar * 1.07),
      uberPrice: uberPrice,
      didiPrice: didiPrice,
      maximPrice: maximPrice,
      cabifyPrice: cabifyPrice,
      taxiPrice: taxiPrice,
      remisPrice: remisPrice,
      taxiappPrice: taxiappPrice
    };
  }

  /**
   * Estimate bus route (direct only). Combinations removed in VOY Lite.
   * Returns null when no real stops are available (no fake fallback).
   * @param {object} origin - {lat, lon}
   * @param {object} dest - {lat, lon}
   * @param {Array} busStops - BUS_STOPS array
   * @param {object} busFare - FareRegistry.bus object
   * @returns {object} Bus estimation with stops, times, price
   */
  function estimateBus(origin, dest, busStops, busFare) {
    var distKm = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    var stopsByLine = {};
    busStops.forEach(function (s) {
      if (!stopsByLine[s.linea]) stopsByLine[s.linea] = [];
      stopsByLine[s.linea].push(s);
    });

    var bestDirect = null;
    var bestCombo = null;

    // --- Direct routes ---
    Object.keys(stopsByLine).forEach(function (linea) {
      var stops = stopsByLine[linea];
      var nearOrig = null, nearDest = null;
      var minDO = Infinity, minDD = Infinity;
      stops.forEach(function (s) {
        var dO = haversine(origin.lat, origin.lon, s.lat, s.lon);
        var dD = haversine(dest.lat, dest.lon, s.lat, s.lon);
        if (dO < minDO) { minDO = dO; nearOrig = s; }
        if (dD < minDD) { minDD = dD; nearDest = s; }
      });
      if (nearOrig && nearDest && stops.length >= 2) {
        var rideDist = haversine(nearOrig.lat, nearOrig.lon, nearDest.lat, nearDest.lon);
        var walkToMin = minDO / 5 * 60 + 3;
        var rideMin = rideDist / 15 * 60;
        var walkFromMin = minDD / 5 * 60 + 5;
        var totalMin = walkToMin + rideMin + walkFromMin;
        var price = busFare.sube;
        if (!bestDirect || totalMin < bestDirect.totalMin) {
          bestDirect = {
            linea: linea, stopOrigen: nearOrig, stopDest: nearDest,
            walkToStopMin: Math.ceil(walkToMin), rideMin: Math.ceil(rideMin),
            walkFromStopMin: Math.ceil(walkFromMin), totalMin: Math.ceil(totalMin),
            price: price, boletos: 1, combination: false,
            stopOrigenCalles: nearOrig.calles, stopDestCalles: nearDest.calles
          };
        }
      }
    });

    // VOY Lite: no fake fallback. Return null when no direct route exists.
    return bestDirect;
  }

  /**
   * Find nearest bike station to a point.
   * @param {object} point - {lat, lon}
   * @param {Array} bikeStations - BIKE_STATIONS array
   * @returns {object|null} Nearest station or null
   */
  function findNearestBikeStation(point, bikeStations) {
    var best = null, minD = Infinity;
    bikeStations.forEach(function (s) {
      var d = haversine(point.lat, point.lon, s.lat, s.lon);
      if (d < minD) { minD = d; best = s; }
    });
    return best;
  }

  // =====================================================================
  //  4. RECOMMENDATION ENGINE — REMOVED in VOY Lite
  // =====================================================================

  // =====================================================================
  //  5. ORCHESTRATOR — runAllEstimations
  // =====================================================================

  /**
   * Run all transport mode estimations for a given origin-destination pair.
   * This is the main entry point for the estimation pipeline.
   *
   * @param {object} origin - {lat, lon, name?}
   * @param {object} dest - {lat, lon, name?}
   * @param {object} config - {busStops, bikeStations, fareRegistry}
   * @returns {Array|null} Sorted array of estimation objects, or null
   */
  function runAllEstimations(origin, dest, config) {
    if (!origin || !dest) return null;
    var distKm = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    var hour = new Date().getHours();
    var estimations = [];

    // 1. Rideshare (auto) — primary card
    var autoResult = estimateAuto(distKm, config.fareRegistry, hour);
    estimations.push(Object.assign({ mode: 'auto', icon: '\uD83D\uDE97', title: 'Auto', priority: 1, distance: distKm }, autoResult));

    // 2. Bus — only if real stops exist (no fake fallback)
    var busResult = estimateBus(origin, dest, config.busStops, config.fareRegistry.bus);
    if (busResult) {
      busResult.timeMin = busResult.totalMin;
      estimations.push(Object.assign(
        { mode: 'bus', icon: '\uD83D\uDE8C', title: 'Colectivo', priority: 2, distance: distKm },
        busResult
      ));
    }

    // 3. Bike — MOBILITY_CORE_RANKING_V1: only_if_under_3km (tertiary suggestion only)
    var bikeMin = (distKm / 15) * 60;
    var nearBike = findNearestBikeStation(origin, config.bikeStations);
    var nearDestBike = dest ? findNearestBikeStation(dest, config.bikeStations) : null;
    if (distKm <= BIKE_MAX_DISTANCE_KM) {
      estimations.push({ mode: 'bike', icon: '\uD83D\uDEF2', title: 'Bicicleta', timeMin: bikeMin, distance: distKm, priority: 9, nearStation: nearBike, nearDestStation: nearDestBike });
    }

    // Sort by priority, then by time
    estimations.sort(function (a, b) { return a.priority - b.priority || a.timeMin - b.timeMin; });

    return estimations;
  }

  // =====================================================================
  //  6. SEARCH UTILITIES (pure, no fetch)
  // =====================================================================

  /**
   * Search local catalog (bus stops, bike stations, landmarks).
   * @param {string} q - Search query
   * @param {Array} busStops - BUS_STOPS array
   * @param {Array} bikeStations - BIKE_STATIONS array
   * @param {Array} landmarks - LANDMARKS array
   * @returns {Array} Scored local results
   */
  function searchLocal(q, busStops, bikeStations, landmarks) {
    var localResults = [];
    busStops.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles), fuzzyScore(q, 'L\u00EDnea ' + s.linea));
      if (score > 0) localResults.push({ type: 'bus', name: 'L\u00EDnea ' + s.linea + ' \u2013 ' + s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    bikeStations.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles));
      if (score > 0) localResults.push({ type: 'bike', name: '\uD83D\uDEF2 ' + s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    landmarks.forEach(function (s) {
      var score = Math.max(fuzzyScore(q, s.nombre), fuzzyScore(q, s.calles));
      if (score > 0) localResults.push({ type: 'place', name: s.nombre, sub: s.calles, lat: s.lat, lon: s.lon, score: score, display_name: s.nombre + ', ' + s.calles });
    });
    return localResults;
  }

  /**
   * Deduplicate search results by normalized name.
   * @param {Array} results - Search results array
   * @returns {Array} Deduped, max 3
   */
  function dedupResults(results) {
    var seen = {};
    var deduped = [];
    results.forEach(function (r) {
      var key = normalize(r.name || r.display_name || '');
      if (!seen[key]) { seen[key] = true; deduped.push(r); }
    });
    return deduped.slice(0, 3);
  }

  // =====================================================================
  //  7. CONTEXTUAL RANKING (MOBILITY_CORE_RANKING_V1)
  // =====================================================================

  /**
   * Rank ride-hailing providers by contextual_score: weighted blend of
   * price (70%) and time (30%). Lower score = better rank.
   * Pure function: same inputs → same outputs. No DOM, no fetch.
   *
   * @param {object} autoResult - estimateAuto() output with per-provider prices/times
   * @param {object} providers - PROVIDERS registry (availability filter)
   * @returns {Array} Sorted provider objects: [{id,name,price,timeMin,score}, ...]
   */
  function rankProviders(autoResult, providers) {
    if (!autoResult) return [];
    var list = [
      { id: 'uber', name: 'Uber', price: autoResult.uberPrice, timeMin: autoResult.uberTimeMin },
      { id: 'didi', name: 'DiDi', price: autoResult.didiPrice, timeMin: autoResult.didiTimeMin },
      { id: 'maxim', name: 'Maxim', price: autoResult.maximPrice, timeMin: autoResult.maximTimeMin },
      { id: 'taxiapp', name: 'TaxiApp', price: autoResult.taxiappPrice, timeMin: autoResult.taxiappTimeMin },
      { id: 'taxi', name: 'Radiotaxi', price: autoResult.taxiPrice, timeMin: autoResult.taxiTimeMin },
      { id: 'remis', name: 'Remises Real', price: autoResult.remisPrice, timeMin: autoResult.remisTimeMin }
    ].filter(function (p) {
      return p.price != null && providers && providers[p.id] && providers[p.id].available;
    });
    if (list.length === 0) return [];

    // Normalize price and time to 0-1 range for cross-factor comparison.
    var prices = list.map(function (p) { return p.price; });
    var times = list.map(function (p) { return p.timeMin; });
    var minPrice = Math.min.apply(null, prices), maxPrice = Math.max.apply(null, prices);
    var minTime = Math.min.apply(null, times), maxTime = Math.max.apply(null, times);

    list.forEach(function (p) {
      var normPrice = maxPrice > minPrice ? (p.price - minPrice) / (maxPrice - minPrice) : 0;
      var normTime = maxTime > minTime ? (p.timeMin - minTime) / (maxTime - minTime) : 0;
      // contextual_score: 0.7 price + 0.3 time (lower = better)
      p.score = 0.7 * normPrice + 0.3 * normTime;
    });

    list.sort(function (a, b) { return a.score - b.score; });
    return list;
  }

  // =====================================================================
  //  8. FORMAT HELPERS
  // =====================================================================

  /**
   * Format bus estimation into human-readable text.
   * @param {object} r - Bus estimation result
   * @param {function} [formatPriceFn] - Optional price formatter
   * @returns {string} Multi-line description
   */
  function formatBusText(r, formatPriceFn) {
    var fp = formatPriceFn || formatPrice;
    if (!r.combination) {
      return 'La L\u00EDnea ' + r.linea + ' te lleva directo.\n' +
        'Subite a ' + r.walkToStopMin + ' min, en ' + r.stopOrigenCalles + '.\n' +
        'En ' + r.totalMin + ' min lleg\u00E1s. Te sale ' + fp(r.price) + '.';
    } else {
      return 'Pod\u00E9s combinar la L\u00EDnea ' + r.linea1 + ' con la L\u00EDnea ' + r.linea2 + ' para llegar.\n' +
        'Subite a la ' + r.linea1 + ' en ' + r.stopOrigenCalles + '.\n' +
        'Pasate a la ' + r.linea2 + ' en ' + r.stopTransbordoCalles + '.\n' +
        'En total ' + r.totalMin + ' min. Te sale ' + fp(r.price) + ' (' + r.boletos + ' boletos).';
    }
  }

  // =====================================================================
  //  EXPORTS
  // =====================================================================

  var MobilityEngine = {
    // Pure utilities
    haversine: haversine,
    formatPrice: formatPrice,
    formatMin: formatMin,
    normalize: normalize,
    fuzzyScore: fuzzyScore,

    // Fare calculations
    calcAppPrice: calcAppPrice,
    estimateTaxi: estimateTaxi,

    // Estimation functions
    estimateBus: estimateBus,
    estimateAuto: estimateAuto,
    findNearestBikeStation: findNearestBikeStation,
    runAllEstimations: runAllEstimations,

    // MOBILITY_CORE_RANKING_V1: contextual_score ranking
    rankProviders: rankProviders,
    BIKE_MAX_DISTANCE_KM: BIKE_MAX_DISTANCE_KM,

    // Search utilities (pure, no fetch)
    searchLocal: searchLocal,
    dedupResults: dedupResults,

    // Format helpers
    formatBusText: formatBusText
  };

  // Browser global
  if (typeof window !== 'undefined') {
    window.MobilityEngine = MobilityEngine;
  }
  // Node.js / CommonJS
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MobilityEngine;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
