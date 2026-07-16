(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DestinationResolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SOURCES = ['curated', 'favorite', 'recent', 'remote', 'manual_map', 'gps'];
  var PRECISION_WEIGHT = { house: 0.11, intersection: 0.1, poi: 0.09, street: 0.05, neighborhood: 0.04, approximate: 0 };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\b(?:boulevard|bulevar|bvd)\b/g, 'bv')
      .replace(/\bavenida\b/g, 'av')
      .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }

  function finiteNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function toCanonicalCandidate(raw, source, cityId) {
    raw = raw || {};
    source = SOURCES.indexOf(source) >= 0 ? source : (SOURCES.indexOf(raw.source) >= 0 ? raw.source : 'remote');
    var lat = finiteNumber(raw.lat);
    var lon = finiteNumber(raw.lon != null ? raw.lon : raw.lng);
    var osmType = raw.osmType || raw.osm_type || '';
    var osmId = raw.osmId || raw.osm_id || '';
    var canonicalId = raw.canonicalId || ((osmType && osmId) ? 'osm:' + osmType + ':' + osmId : '');
    var name = raw.name || raw.nombre || raw.displayName || raw.display_name || '';
    var address = raw.address || raw.calles || raw.sub || '';
    return {
      canonicalId: String(canonicalId || ''),
      source: source,
      type: raw.type || (raw.precision === 'house' ? 'address' : 'poi'),
      name: String(name),
      displayName: String(raw.displayName || raw.display_name || name),
      address: typeof address === 'string' ? address : '',
      lat: lat,
      lon: lon,
      cityId: String(raw.cityId || cityId || ''),
      precision: raw.precision || 'approximate',
      confidence: Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : 0,
      verified: raw.verified === true,
      aliases: Array.isArray(raw.aliases) ? raw.aliases.slice() : [],
      osmType: String(osmType || ''),
      osmId: String(osmId || '')
    };
  }

  function validateCandidate(candidate, options) {
    options = options || {};
    var lat = finiteNumber(candidate && candidate.lat);
    var lon = finiteNumber(candidate && candidate.lon);
    if (lat === null || lon === null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return { valid: false, reason: 'invalid_coordinates' };
    var bbox = options.bbox;
    if (bbox && !options.allowOutside) {
      var west, south, east, north;
      if (Array.isArray(bbox)) { west = bbox[0]; south = bbox[1]; east = bbox[2]; north = bbox[3]; }
      else {
        west = bbox.west != null ? bbox.west : bbox.minLon;
        south = bbox.south != null ? bbox.south : bbox.minLat;
        east = bbox.east != null ? bbox.east : bbox.maxLon;
        north = bbox.north != null ? bbox.north : bbox.maxLat;
      }
      if ([west, south, east, north].every(Number.isFinite) && (lon < west || lon > east || lat < south || lat > north)) return { valid: false, reason: 'outside_city' };
    }
    return { valid: true, reason: '' };
  }

  function haversineMeters(aLat, aLon, bLat, bLon) {
    var rad = Math.PI / 180;
    var dLat = (bLat - aLat) * rad;
    var dLon = (bLon - aLon) * rad;
    var x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
    return 12742000 * Math.asin(Math.sqrt(x));
  }

  function matchKind(query, candidate) {
    var q = normalizeText(query);
    var name = normalizeText(candidate.name);
    if (q && q === name) return 'exact';
    if ((candidate.aliases || []).some(function (alias) { return normalizeText(alias) === q; })) return 'alias';
    if (name.indexOf(q) >= 0 || q.indexOf(name) >= 0) return 'partial';
    var tokens = q.split(' ').filter(Boolean);
    var haystack = normalizeText([candidate.name, candidate.address].concat(candidate.aliases || []).join(' '));
    if (tokens.length && tokens.every(function (token) { return haystack.indexOf(token) >= 0; })) return 'tokens';
    return 'none';
  }

  function scoreCandidate(query, candidate, options) {
    options = options || {};
    var kind = matchKind(query, candidate);
    var score = kind === 'exact' ? 0.52 : kind === 'alias' ? 0.47 : kind === 'tokens' ? 0.3 : kind === 'partial' ? 0.24 : 0;
    if (candidate.verified) score += 0.18;
    if (candidate.canonicalId) score += 0.06;
    score += PRECISION_WEIGHT[candidate.precision] || 0;
    if (validateCandidate(candidate, options).valid) score += 0.08;
    if (candidate.source === 'curated') score += 0.05;
    if (candidate.source === 'favorite' && candidate.canonicalId) score += 0.035;
    if (candidate.source === 'recent') score -= candidate.canonicalId ? 0.03 : 0.11;
    if (candidate.source === 'remote') score += Math.min(0.08, Math.max(0, candidate.confidence || 0) * 0.1);
    if (options.gpsOrigin && kind !== 'exact' && validateCandidate(options.gpsOrigin, { allowOutside: true }).valid) {
      var distance = haversineMeters(options.gpsOrigin.lat, options.gpsOrigin.lon, candidate.lat, candidate.lon);
      score += Math.max(0, 0.015 - distance / 1000000);
    }
    return Math.max(0, Math.min(1, score));
  }

  function rankCandidates(query, candidates, options) {
    return (candidates || []).map(function (candidate) {
      var copy = Object.assign({}, candidate);
      copy.confidence = scoreCandidate(query, copy, options);
      return copy;
    }).filter(function (candidate) { return matchKind(query, candidate) !== 'none'; })
      .sort(function (a, b) {
        if (b.confidence !== a.confidence) return b.confidence - a.confidence;
        if (a.source === 'curated' && b.source !== 'curated') return -1;
        if (b.source === 'curated' && a.source !== 'curated') return 1;
        return a.name.localeCompare(b.name);
      });
  }

  function deduplicateCandidates(candidates, thresholdMeters) {
    thresholdMeters = thresholdMeters || 80;
    var out = [];
    (candidates || []).forEach(function (candidate) {
      var duplicate = out.findIndex(function (existing) {
        if (candidate.canonicalId && existing.canonicalId === candidate.canonicalId) return true;
        if (candidate.osmType && candidate.osmId && existing.osmType === candidate.osmType && existing.osmId === candidate.osmId) return true;
        return normalizeText(candidate.name) === normalizeText(existing.name) &&
          validateCandidate(candidate, { allowOutside: true }).valid && validateCandidate(existing, { allowOutside: true }).valid &&
          haversineMeters(candidate.lat, candidate.lon, existing.lat, existing.lon) < thresholdMeters;
      });
      if (duplicate < 0) out.push(candidate);
      else if ((candidate.confidence || 0) > (out[duplicate].confidence || 0)) out[duplicate] = candidate;
    });
    return out;
  }

  function searchLocalSources(query, sources) {
    sources = sources || {};
    var cityId = sources.cityId || '';
    var all = [];
    (sources.landmarks || []).forEach(function (item) { all.push(toCanonicalCandidate(item, 'curated', cityId)); });
    (sources.favorites || []).forEach(function (item) { all.push(toCanonicalCandidate(item, 'favorite', cityId)); });
    (sources.recents || []).forEach(function (item) { all.push(toCanonicalCandidate(item, 'recent', cityId)); });
    return Promise.resolve(deduplicateCandidates(rankCandidates(query, all, sources)));
  }

  function isCompleteAddress(query) {
    var normalized = normalizeText(query);
    return /\b\d{1,5}\b/.test(normalized) && normalized.split(' ').length >= 3;
  }

  function resolve(query, candidates, options) {
    options = options || {};
    var valid = (candidates || []).filter(function (candidate) { return validateCandidate(candidate, options).valid; });
    var ranked = deduplicateCandidates(rankCandidates(query, valid, options));
    if (!ranked.length) return { status: 'none', candidates: [] };
    var first = ranked[0];
    var second = ranked[1];
    var close = second && first.confidence - second.confidence < 0.09;
    var exactVerified = first.verified && (matchKind(query, first) === 'exact' || matchKind(query, first) === 'alias') && first.confidence >= 0.82;
    var address = first.source === 'remote' && isCompleteAddress(query) && first.precision === 'house' && first.confidence >= 0.72;
    if ((exactVerified || address) && !close) return { status: 'resolved', candidate: first, candidates: ranked };
    return { status: 'choose', candidates: ranked };
  }

  function reconcileRecents(recents, landmarks, options) {
    options = options || {};
    var verified = (landmarks || []).filter(function (item) { return item.verified === true && item.canonicalId; });
    var changed = false;
    var output = (recents || []).map(function (recent) {
      var key = normalizeText(recent.name || recent.nombre);
      var match = verified.find(function (item) {
        return normalizeText(item.nombre || item.name) === key || (item.aliases || []).some(function (alias) { return normalizeText(alias) === key; });
      });
      if (!match) return recent;
      var copy = Object.assign({}, recent);
      var distance = validateCandidate(recent, { allowOutside: true }).valid ? haversineMeters(recent.lat, recent.lon, match.lat, match.lon) : Infinity;
      if (distance > 100) {
        copy.previousCoordinates = { lat: recent.lat, lon: recent.lon };
        copy.lat = match.lat;
        copy.lon = match.lon;
      }
      if (copy.canonicalId !== match.canonicalId || distance > 100) changed = true;
      copy.canonicalId = match.canonicalId;
      copy.reconciledAt = options.now || Date.now();
      copy.cityId = options.cityId || copy.cityId || '';
      copy.verified = true;
      copy.precision = match.precision;
      copy.address = match.address;
      return copy;
    });
    return { changed: changed, recents: output };
  }

  return {
    normalizeText: normalizeText,
    toCanonicalCandidate: toCanonicalCandidate,
    validateCandidate: validateCandidate,
    haversineMeters: haversineMeters,
    rankCandidates: rankCandidates,
    deduplicateCandidates: deduplicateCandidates,
    searchLocalSources: searchLocalSources,
    reconcileRecents: reconcileRecents,
    resolve: resolve
  };
});
