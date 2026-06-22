/**
 * VOY Pricing Engine v2 — Santa Fe, Argentina
 *
 * Spec: multi_variable_bayes_estimation
 *   inputs: distance, time, historical_fare, provider_variance
 *   formula: base + (km * rate_km) + (min * rate_min)
 *   surge: time_based + weather_based + demand_proxy
 *
 * This module is PURE (no DOM, no fetch, no side effects).
 * It is additive to MobilityEngine — existing estimateAuto/estimateBus are untouched.
 * The view layer MAY use these functions for richer confidence + surge-aware ranges,
 * but the legacy estimation path remains the source of truth when this module is absent.
 *
 * @module PricingEngineV2
 * @version 2.0.0
 */
(function (global) {
  'use strict';

  // ---- Provider base confidence (prior) — from fare_engine_v2.json ----
  var PROVIDER_CONFIDENCE = {
    uber: 0.85,
    didi: 0.88,
    maxim: 0.75,
    taxi: 0.82,
    remis: 0.78
  };

  // Provider variance σ² (how much real fares deviate from estimate).
  // Higher variance → lower posterior confidence. Empirical defaults.
  var PROVIDER_VARIANCE = {
    uber: 0.10,
    didi: 0.09,
    maxim: 0.16,
    taxi: 0.14,
    remis: 0.18
  };

  // ---- Surge multipliers (conservative; no real demand/weather feed yet) ----
  // time_based: night hours (22:00–06:00) → 1.1–1.3x per provider class
  // weather_based: rain flag (caller-supplied) → 1.15x (capped)
  // demand_proxy: special-events flag (caller-supplied) → 1.2x (capped)
  // Combined surge is clamped to [1.0, 2.5] per fare_engine_v2.json surge range.
  var SURGE_MAX = 2.5;
  var SURGE_MIN = 1.0;

  function _hourOf(ts) {
    var d = ts ? new Date(ts) : new Date();
    return d.getHours();
  }

  /**
   * Time-based surge multiplier.
   * Night (22–06): 1.1x base, rising to 1.3x in the 2–5am dead zone.
   * Day: 1.0x (no surge).
   */
  function timeSurge(ts) {
    var h = _hourOf(ts);
    if (h >= 2 && h < 5) return 1.3;
    if (h >= 22 || h < 6) return 1.1;
    return 1.0;
  }

  /**
   * Weather-based surge. Caller passes a weather context:
   *   { rain: bool, heavy: bool }
   * Rain → 1.15x; heavy rain → 1.25x (capped by SURGE_MAX on combine).
   */
  function weatherSurge(weather) {
    if (!weather) return 1.0;
    if (weather.heavy) return 1.25;
    if (weather.rain) return 1.15;
    return 1.0;
  }

  /**
   * Demand-proxy surge. Caller passes an event context:
   *   { event: bool, rush_hour: bool }
   * Special event → 1.2x; rush hour → 1.1x.
   */
  function demandSurge(demand) {
    if (!demand) return 1.0;
    if (demand.event) return 1.2;
    if (demand.rush_hour) return 1.1;
    return 1.0;
  }

  /**
   * Combined surge multiplier, clamped to [1.0, 2.5].
   * Multiplies the three factors (time × weather × demand).
   */
  function surgeMultiplier(provider, ctx) {
    var t = timeSurge(ctx && ctx.now);
    var w = weatherSurge(ctx && ctx.weather);
    var d = demandSurge(ctx && ctx.demand);
    var m = t * w * d;
    // Provider class adjustment: apps surge more aggressively than taxis.
    var adj = (provider === 'uber' || provider === 'didi') ? 1.0
            : (provider === 'maxim') ? 0.97
            : 1.0; // taxi/remis mostly fixed tariff
    var combined = m * adj;
    return Math.max(SURGE_MIN, Math.min(SURGE_MAX, combined));
  }

  /**
   * Human surge label for the UI.
   * Returns '' when no surge, or a short label otherwise.
   */
  function surgeLabel(provider, ctx) {
    var m = surgeMultiplier(provider, ctx);
    if (m <= 1.01) return '';
    if (ctx && ctx.weather && ctx.weather.heavy) return 'Clima';
    if (ctx && ctx.demand && ctx.demand.event) return 'Demanda';
    if (ctx && ctx.demand && ctx.demand.rush_hour) return 'Hora pico';
    var h = _hourOf(ctx && ctx.now);
    if (h >= 2 && h < 5) return 'Noche';
    if (h >= 22 || h < 6) return 'Noche';
    return 'Demanda';
  }

  // ---- Bayesian confidence estimation ----
  //
  // Posterior confidence ≈ prior (provider base) updated by a Gaussian likelihood
  // over the observed (distance, time) vs the historical fare expectation.
  //
  // Simplified model (transparent, no hidden state):
  //   likelihood = exp( -0.5 * (deviation² / (σ² + provider_variance)) )
  //     where deviation = |observed_fare - historical_fare| / historical_fare
  //   posterior = (prior * likelihood) / (prior*likelihood + (1-prior)*(1-likelihood)*0.5)
  //
  // Distance factor: very short (<1km) or very long (>25km) trips reduce confidence.
  // Time factor: if observed ETA differs >40% from historical, reduce confidence.

  function _clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  function _distanceFactor(km) {
    if (km == null) return 0.9;
    if (km < 1) return 0.8;     // minimum fare dominates, less predictable
    if (km <= 12) return 1.0;   // sweet spot
    if (km <= 25) return 0.92;
    return 0.82;                // long trips, traffic variance grows
  }

  function _timeFactor(min) {
    if (min == null) return 0.9;
    if (min <= 30) return 1.0;
    if (min <= 60) return 0.93;
    return 0.85;
  }

  /**
   * Multi-variable Bayesian fare confidence.
   *
   * @param {string} provider   uber|didi|maxim|taxi|remis
   * @param {object} obs        { distanceKm, timeMin, fare, historicalFare? }
   * @returns {number}          confidence 0..1 (clamped 0.55..0.95)
   */
  function fareConfidence(provider, obs) {
    var prior = PROVIDER_CONFIDENCE[provider] || 0.8;
    var variance = PROVIDER_VARIANCE[provider] || 0.14;

    var distF = _distanceFactor(obs && obs.distanceKm);
    var timeF = _timeFactor(obs && obs.timeMin);

    // Likelihood from fare deviation vs historical (if available).
    var likelihood = 0.9;
    if (obs && obs.historicalFare && obs.historicalFare > 0 && obs.fare > 0) {
      var dev = Math.abs(obs.fare - obs.historicalFare) / obs.historicalFare;
      // Gaussian-ish: small deviation → likelihood near 1, large → near 0.5
      likelihood = Math.exp(-0.5 * (dev * dev) / (variance + 0.04));
      likelihood = _clamp(likelihood, 0.5, 0.99);
    }

    // Bayesian update (simplified, normalized).
    var posterior = (prior * likelihood) /
      (prior * likelihood + (1 - prior) * (1 - likelihood) * 0.5 + 1e-6);

    // Blend with distance/time factors (they gate confidence geometrically).
    var blended = posterior * 0.6 + distF * 0.25 + timeF * 0.15;

    return _clamp(blended, 0.55, 0.95);
  }

  /**
   * Surge-aware fare range.
   * Low end = base estimate; high end = estimate * surge (rounded).
   * Spread widens when confidence is lower.
   *
   * @param {number} price      point estimate (ARS)
   * @param {number} confidence 0..1
   * @param {number} surge      multiplier (1.0 = no surge)
   * @returns {{low:number, high:number, point:number}}
   */
  function fareRange(price, confidence, surge) {
    if (!price || price <= 0) return { low: 0, high: 0, point: 0 };
    var c = _clamp(confidence == null ? 0.8 : confidence, 0.55, 0.95);
    var s = _clamp(surge == null ? 1 : surge, 1.0, SURGE_MAX);
    // Lower confidence → wider spread (±5%..±12%).
    var spread = (1 - c) * 0.30 + 0.05; // 5%..~20%
    var low = Math.round(price * (1 - spread));
    var high = Math.round(price * (1 + spread) * s);
    if (high < low) high = low;
    return { low: low, high: high, point: Math.round(price) };
  }

  // ---- Taxi municipal rates (daily_refresh stub) ----
  //
  // Real Santa Fe taxi tariffs are set by municipal resolution (bajada + ficha).
  // The FareRegistry in the HTML holds the authoritative values (updated manually
  // per Resolución). This function returns the active tariff for a given hour,
  // so the view can label day/night correctly. "daily_refresh" is a TODO: the
  // scraper mini-service could publish a tariffs.json that this reads — but only
  // from official municipal sources (legal_only).

  function taxiTariff(fareRegistry, ts) {
    if (!fareRegistry || !fareRegistry.taxi) return null;
    var t = fareRegistry.taxi;
    var h = _hourOf(ts);
    var nocturno = (h >= 22 || h < 6);
    return {
      bajada: nocturno ? t.nocturno.bajada : t.diurno.bajada,
      ficha: nocturno ? t.nocturno.ficha : t.diurno.ficha,
      distFicha: t.diurno.distFicha,
      mode: nocturno ? 'nocturno' : 'diurno',
      source: t.source,
      updated_at: t.updated_at
    };
  }

  // ---- Exports ----
  var api = {
    PROVIDER_CONFIDENCE: PROVIDER_CONFIDENCE,
    PROVIDER_VARIANCE: PROVIDER_VARIANCE,
    SURGE_MIN: SURGE_MIN,
    SURGE_MAX: SURGE_MAX,
    timeSurge: timeSurge,
    weatherSurge: weatherSurge,
    demandSurge: demandSurge,
    surgeMultiplier: surgeMultiplier,
    surgeLabel: surgeLabel,
    fareConfidence: fareConfidence,
    fareRange: fareRange,
    taxiTariff: taxiTariff
  };

  global.PricingEngineV2 = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
