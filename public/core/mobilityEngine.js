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
   * Estimate moto ride (Uber Moto confirmed, DiDi Moto unconfirmed).
   * @param {number} distKm - Distance in km
   * @param {object} fareRegistry - Complete FareRegistry object
   * @returns {object} Moto estimation with per-provider prices and times
   */
  function estimateMoto(distKm, fareRegistry) {
    var durMoto = (distKm / 35) * 60;
    // Use midday hour (12) for base auto price calculation (uber price doesn't depend on hour)
    var autoResult = estimateAuto(distKm, fareRegistry, 12);
    var d = fareRegistry.moto.discount;
    return {
      timeMin: Math.round(durMoto),
      uberMotoTimeMin: Math.round(durMoto * 1.00),
      didiMotoTimeMin: Math.round(durMoto * 1.04),
      uberMotoPrice: autoResult.uberPrice != null ? Math.ceil(autoResult.uberPrice * d) : null,
      didiMotoPrice: null // No confirmado en Santa Fe
    };
  }

  /**
   * Estimate bus route (direct + combinations).
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

    // --- Combination routes ---
    var lines = Object.keys(stopsByLine);
    for (var i = 0; i < lines.length; i++) {
      for (var j = 0; j < lines.length; j++) {
        if (i === j) continue;
        var line1 = lines[i], line2 = lines[j];
        var stops1 = stopsByLine[line1], stops2 = stopsByLine[line2];
        var bestS1 = null, minD1 = Infinity;
        stops1.forEach(function (s) { var d = haversine(origin.lat, origin.lon, s.lat, s.lon); if (d < minD1) { minD1 = d; bestS1 = s; } });
        var bestS2 = null, minD2 = Infinity;
        stops2.forEach(function (s) { var d = haversine(dest.lat, dest.lon, s.lat, s.lon); if (d < minD2) { minD2 = d; bestS2 = s; } });
        var bestTrans1 = null, bestTrans2 = null, minTrans = Infinity;
        stops1.forEach(function (s1) {
          stops2.forEach(function (s2) {
            var d = haversine(s1.lat, s1.lon, s2.lat, s2.lon);
            if (d < minTrans) { minTrans = d; bestTrans1 = s1; bestTrans2 = s2; }
          });
        });
        if (bestS1 && bestS2 && bestTrans1 && bestTrans2 && minTrans < 0.8) {
          var seg1Dist = haversine(bestS1.lat, bestS1.lon, bestTrans1.lat, bestTrans1.lon);
          var seg2Dist = haversine(bestTrans2.lat, bestTrans2.lon, bestS2.lat, bestS2.lon);
          var walkToMin1 = minD1 / 5 * 60 + 3;
          var ride1Min = seg1Dist / 15 * 60;
          var transWalkMin = minTrans / 5 * 60;
          var ride2Min = seg2Dist / 15 * 60;
          var walkFromMin2 = minD2 / 5 * 60 + 5;
          var totalMin = walkToMin1 + ride1Min + transWalkMin + ride2Min + walkFromMin2;
          var price = busFare.sube * 2;
          if (!bestCombo || totalMin < bestCombo.totalMin) {
            bestCombo = {
              linea1: line1, linea2: line2,
              stopOrigen: bestS1, stopTransbordo: bestTrans1, stopTransbordo2: bestTrans2, stopDest: bestS2,
              walkToStopMin: Math.ceil(walkToMin1), ride1Min: Math.ceil(ride1Min),
              transWalkMin: Math.ceil(transWalkMin), ride2Min: Math.ceil(ride2Min),
              walkFromStopMin: Math.ceil(walkFromMin2), totalMin: Math.ceil(totalMin),
              price: price, boletos: 2, combination: true,
              stopOrigenCalles: bestS1.calles, stopTransbordoCalles: bestTrans1.calles
            };
          }
        }
      }
    }

    var chosen = bestCombo || bestDirect;
    if (!chosen) {
      chosen = {
        totalMin: Math.ceil((distKm / 15) * 60 + 8),
        price: busFare.sube, boletos: 1, combination: false,
        linea: '?', stopOrigenCalles: '\u2014', walkToStopMin: 3
      };
    }
    return chosen;
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
  //  4. RECOMMENDATION ENGINE
  // =====================================================================

  /**
   * Get price/time weights from preferences.
   * @param {object} prefs - User preferences object
   * @returns {object} {priceW, timeW}
   */
  function getWeights(prefs) {
    var priceW = 0.6, timeW = 0.4;
    if (prefs.prioritizePrice) { priceW = 0.8; timeW = 0.2; }
    else if (prefs.prioritizeSpeed) { priceW = 0.2; timeW = 0.8; }
    return { priceW: priceW, timeW: timeW };
  }

  /**
   * Compute recommendation across all estimations.
   *
   * Normalizes price and time to [0,1], applies preference penalties,
   * detects ties (<5%), returns explainable results.
   *
   * @param {Array} estimations - Array of estimation objects from runAllEstimations
   * @param {object} prefs - User preferences {avoidMoto, prioritizePrice, ...}
   * @param {object} providers - PROVIDERS registry for availability checks
   * @returns {object|null} {cheapest, fastest, balanced, reason} or null
   */
  function computeRecommendation(estimations, prefs, providers) {
    if (!estimations || !estimations.length) return null;
    var alternatives = [];

    var weights = getWeights(prefs);
    var priceW = weights.priceW;
    var timeW = weights.timeW;

    estimations.forEach(function (est) {
      // Skip walk/bike: free options trivialize price-based recommendations
      if (est.mode === 'walk' || est.mode === 'bike') return;

      if (est.mode === 'bus') {
        if (est.price != null && est.timeMin != null && est.timeMin > 0) {
          var busWalkTo = est.walkToStopMin || 0;
          var busWalkFrom = est.walkFromStopMin || 0;
          var busHasCombo = !!est.combination;
          alternatives.push({
            name: 'Colectivo', price: est.price, time: Math.ceil(est.timeMin),
            mode: 'bus', icon: '\uD83D\uDE8C', walkMin: busWalkTo + busWalkFrom, hasTransfer: busHasCombo
          });
        }
      }

      if (est.mode === 'moto') {
        if (est.uberMotoPrice != null) {
          alternatives.push({
            name: 'Uber Moto', price: est.uberMotoPrice,
            time: est.uberMotoTimeMin || est.timeMin,
            mode: 'moto', icon: '\uD83D\uDEF5'
          });
        }
        // DiDi Moto price=null → excluded (can't score without price)
      }

      if (est.mode === 'auto') {
        var autoProviders = [
          { key: 'uber', name: 'Uber', priceKey: 'uberPrice', timeKey: 'uberTimeMin' },
          { key: 'didi', name: 'DiDi', priceKey: 'didiPrice', timeKey: 'didiTimeMin' },
          { key: 'maxim', name: 'Maxim', priceKey: 'maximPrice', timeKey: 'maximTimeMin' },
          { key: 'cabify', name: 'Cabify', priceKey: 'cabifyPrice', timeKey: null },
          { key: 'taxi', name: 'Radiotaxi', priceKey: 'taxiPrice', timeKey: 'taxiTimeMin' },
          { key: 'remis', name: 'Remises Real', priceKey: 'remisPrice', timeKey: 'remisTimeMin' },
          { key: 'taxiapp', name: 'TaxiApp', priceKey: 'taxiappPrice', timeKey: 'taxiappTimeMin' }
        ];
        autoProviders.forEach(function (p) {
          if (est[p.priceKey] != null && providers && providers[p.key] && providers[p.key].available) {
            var pTime = p.timeKey && est[p.timeKey] ? est[p.timeKey] : est.timeMin;
            alternatives.push({ name: p.name, price: est[p.priceKey], time: pTime, mode: 'auto', icon: '\uD83D\uDE97' });
          }
        });
      }
    });

    // Apply preference: avoidMoto → exclude moto alternatives
    if (prefs.avoidMoto) {
      alternatives = alternatives.filter(function (a) { return a.mode !== 'moto'; });
    }

    if (!alternatives.length) return null;

    // Normalize price and time to [0,1] range
    var prices = alternatives.map(function (a) { return a.price; });
    var times = alternatives.map(function (a) { return a.time; });
    var minPrice = Math.min.apply(null, prices);
    var maxPrice = Math.max.apply(null, prices);
    var minTime = Math.min.apply(null, times);
    var maxTime = Math.max.apply(null, times);

    alternatives.forEach(function (a) {
      var priceNorm = maxPrice > minPrice ? (a.price - minPrice) / (maxPrice - minPrice) : 0;
      var timeNorm = maxTime > minTime ? (a.time - minTime) / (maxTime - minTime) : 0;
      a.score = priceNorm * priceW + timeNorm * timeW;

      // Penalizaciones aditivas (lineales, independientes del score base)
      if (prefs.avoidLongWalks && a.walkMin && a.walkMin > 8) { a.score += 0.20; }
      if (prefs.avoidTransfers && a.hasTransfer) { a.score += 0.25; }
      if (prefs.withLuggage && (a.mode === 'bike' || a.mode === 'walk')) { a.score += 0.30; }
      if (prefs.withChildren && a.mode === 'moto') { a.score += 0.35; }
      // Clamp score to max 1.0
      a.score = Math.min(a.score, 1.0);
    });

    // Sort by each criterion
    var byPrice = alternatives.slice().sort(function (a, b) { return a.price - b.price; });
    var byTime = alternatives.slice().sort(function (a, b) { return a.time - b.time; });
    var byScore = alternatives.slice().sort(function (a, b) { return a.score - b.score; });

    // Tie detection: < 5% difference → empate tecnico
    function getTied(arr, prop) {
      if (!arr.length) return [];
      var best = arr[0];
      var threshold = Math.abs(best[prop]) * 0.05;
      return arr.filter(function (a) { return Math.abs(a[prop] - best[prop]) <= threshold; });
    }

    // Build transparency reasons
    var reasons = [];
    if (prefs.prioritizePrice) reasons.push('prioriz\u00E1s precio');
    else if (prefs.prioritizeSpeed) reasons.push('prioriz\u00E1s velocidad');
    if (prefs.avoidMoto) reasons.push('evit\u00E1s motos');
    if (prefs.withLuggage) reasons.push('viaj\u00E1s con equipaje');
    if (prefs.withChildren) reasons.push('viaj\u00E1s con ni\u00F1os');
    if (prefs.avoidLongWalks) reasons.push('evit\u00E1s caminatas largas');
    if (prefs.avoidTransfers) reasons.push('evit\u00E1s transbordos');
    var reasonText = reasons.length ? 'Motivo: ' + reasons.join(', ') : 'Motivo: configuraci\u00F3n est\u00E1ndar';

    return {
      cheapest: getTied(byPrice, 'price'),
      fastest: getTied(byTime, 'time'),
      balanced: getTied(byScore, 'score'),
      reason: reasonText
    };
  }

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

    // 1. Walk
    var walkMin = (distKm / 5) * 60;
    var walkPri = distKm <= 0.8 ? 1 : 3;
    estimations.push({ mode: 'walk', icon: '\uD83D\uDEB6', title: 'Caminando', timeMin: walkMin, distance: distKm, priority: walkPri });

    // 2. Bus
    var busResult = estimateBus(origin, dest, config.busStops, config.fareRegistry.bus);
    if (busResult) busResult.timeMin = busResult.totalMin;
    estimations.push(Object.assign(
      { mode: 'bus', icon: '\uD83D\uDE8C', title: 'Colectivo', priority: 2, distance: distKm },
      busResult || { timeMin: 0, totalMin: 0, price: 0, boletos: 1, combination: false }
    ));

    // 3. Bike
    var bikeMin = (distKm / 15) * 60;
    var nearBike = findNearestBikeStation(origin, config.bikeStations);
    var nearDestBike = dest ? findNearestBikeStation(dest, config.bikeStations) : null;
    estimations.push({ mode: 'bike', icon: '\uD83D\uDEF2', title: 'Bicicleta', timeMin: bikeMin, distance: distKm, priority: 2, nearStation: nearBike, nearDestStation: nearDestBike });

    // 4. Moto
    var motoResult = estimateMoto(distKm, config.fareRegistry);
    estimations.push(Object.assign({ mode: 'moto', icon: '\uD83D\uDEF5', title: 'Moto', priority: 3, distance: distKm }, motoResult));

    // 5. Auto
    var autoResult = estimateAuto(distKm, config.fareRegistry, hour);
    estimations.push(Object.assign({ mode: 'auto', icon: '\uD83D\uDE97', title: 'Auto', priority: 4, distance: distKm }, autoResult));

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
  //  7. FORMAT HELPERS
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
    estimateMoto: estimateMoto,
    findNearestBikeStation: findNearestBikeStation,
    runAllEstimations: runAllEstimations,

    // Recommendation engine
    getWeights: getWeights,
    computeRecommendation: computeRecommendation,

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
