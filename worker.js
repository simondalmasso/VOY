// ============================================================
//  VOY — Cloudflare Worker (V7.8: WAE analytics + sessionID + cron)
//
//  Canonical origin:  https://voy.is-a.dev  (is-a.dev PR #41619 open)
//  Worker name:       voy-app  (updates the EXISTING production worker)
//
//  Rules (evaluated in order):
//   1. /VOY-Lite.html  → 301 → /  (same-host relative redirect; hides internal path)
//   2. CANONICAL REDIRECT DISABLED until voy.is-a.dev is registered.
//   3. /api/events  → POST → Analytics Engine (VOY_METRICS) + 202 (fire-and-forget)
//   4. /  → internal rewrite → /VOY-Lite.html  (browser URL stays /)
//   5. everything else → ASSETS binding (core/, ui/, icons/, manifest.json, …)
//
//  Analytics (V7.8 — 3 eventos, WAE only):
//   - 3 eventos canónicos: 'estimation', 'provider_tap', 'search'
//   - Nombres legacy se normalizan a estos 3 (ver EVENT_NORMALIZE).
//   - WAE writeDataPoint via ctx.waitUntil() — no bloquea la respuesta.
//   - sessionID via cookie (voy_sid) — sin auth, distingue sesiones únicas.
//   - DATA_POLICY: no_personal_identifiable_storage · route_only_event_aggregation · geo_approximation_only.
//     (anon_id only; WAE stores provider/mode/price/time/distance + ~500m geo cluster; no raw lat/lon, no email/name.)
//   - Filtros de exclusión (ANALYTICS_SYSTEM_SETUP V7.8.1):
//       · localhost, headless, bot      (env: VOY_EXCLUDE_LOCALHOST/HEADLESS/BOT)
//       · glm_agent (GLM_* UA filter)   (env: VOY_EXCLUDE_GLM)
//       · owner_ip / owner_ip_hash      (env: VOY_OWNER_IPS / VOY_OWNER_IP_HASHES — SIMON_DEVICE rule)
//       · dev_ip                         (env: VOY_DEV_IPS)
//       · custom UA patterns             (env: VOY_EXCLUDE_UA_PATTERNS — comma-separated regex)
//   - /api/whoami: owner self-detects IP + SHA-256 to populate exclusion vars (USER_IP_DETECTED).
//   - /api/health: exposes filter counts (not values) for verification.
//   - Si VOY_METRICS está ausente (dry-run), devuelve 202 gracefully.
// ============================================================

const CANONICAL_ORIGIN = "https://voy.is-a.dev"; // disabled until is-a.dev is live
const WORKER_VERSION = "V7.8.0"; // V7.8 = analytics simplificado (3 eventos WAE + sessionID cookie + cron tarifas). DO + /api/reports eliminados. 0 código muerto.
// __BUILD_HASH__ is replaced by CI at deploy time (scripts/inject-build-hash.mjs).
// verify-production.sh checks /api/health.build_hash === git short SHA.
const BUILD_HASH = "__BUILD_HASH__";

const GEOCODE_CITIES = {
  santafe: { viewbox: '-60.75,-31.67,-60.65,-31.57', bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } },
  _default: { viewbox: null, bbox: null }
};
const GEOCODE_QUERY_MAX_LENGTH = 120;

function _isValidCoordinateValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  if (!Number.isFinite(num)) return false;
  return true;
}
const GEOCODE_RATE_LIMIT = 20;
const GEOCODE_RATE_WINDOW_MS = 60000;
const GEOCODE_CLIENTS_MAX = 1000;
const GEOCODE_CONTRACT_VERSION = 'v2';
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const NOMINATIM_MIN_INTERVAL_MS = 1100;
const NOMINATIM_MAX_QUEUE = 10;
const NOMINATIM_MAX_WAIT_MS = 10000;
const NOMINATIM_FETCH_TIMEOUT_MS = 8000;
const _geocodeClients = new Map();
let _geocodeClientSalt = null;

function _getGeocodeClientSalt() {
  if (!_geocodeClientSalt) {
    _geocodeClientSalt = crypto.randomUUID();
  }
  return _geocodeClientSalt;
}

// V7.8 — 3 eventos canónicos. Nombres legacy se mapean a estos.
const V2_EVENTS = ['estimation', 'provider_tap', 'search'];
const EVENT_NORMALIZE = {
  // → estimation
  estimation: 'estimation',
  route_calculated: 'estimation',
  ride_estimated: 'estimation',
  route_selected: 'estimation',
  destination_selected: 'estimation',
  // → provider_tap
  provider_tap: 'provider_tap',
  provider_click: 'provider_tap',
  provider_clicked: 'provider_tap',
  deeplink_opened: 'provider_tap',
  vehicle_viewed: 'provider_tap',
  // → search
  search: 'search',
  search_performed: 'search',
  voice_search: 'search',
};

// V7.8.1 — ANALYTICS_SYSTEM_SETUP: filtros de exclusión ampliados.
//   - localhost / headless / bot (heredados)
//   - GLM_* user-agent (GLM_AGENT rule — excludes z-ai/GLM automated agents)
//   - owner_ip + owner_ip_hash (SIMON_DEVICE rule — hash-based OR direct IP)
//   - dev_ip
//   - custom UA patterns (VOY_EXCLUDE_UA_PATTERNS, comma-separated regex)
// All rules are opt-in/opt-out via env vars (dashboard or wrangler.jsonc vars).
function _loadFilterConfig(env) {
  const list = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
  return {
    owner_ips: list(env.VOY_OWNER_IPS),
    // SHA-256 hex hashes of owner IPs (hash-based mode — never stores raw IP in config).
    owner_ip_hashes: list(env.VOY_OWNER_IP_HASHES).map(h => h.toLowerCase()),
    dev_ips: list(env.VOY_DEV_IPS),
    exclude_localhost: env.VOY_EXCLUDE_LOCALHOST !== 'false',
    exclude_headless: env.VOY_EXCLUDE_HEADLESS !== 'false',
    exclude_bot: env.VOY_EXCLUDE_BOT !== 'false',
    exclude_glm: env.VOY_EXCLUDE_GLM !== 'false',
    // Additional UA regex patterns (comma-separated, case-insensitive).
    exclude_ua_patterns: list(env.VOY_EXCLUDE_UA_PATTERNS)
  };
}

const BOT_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
const HEADLESS_UA = /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|chrome-lighthouse|w3c_validator|nightmare|crawly|crawler/i;
// GLM_AGENT rule — excludes UAs starting with "GLM" (z-ai/GLM automated agents, e.g. "GLM/4.6", "GLM-agent", "GLM_bot"). Spec: GLM_*
const GLM_UA = /^GLM[\s\/\-_:]/i;

// Cache compiled custom UA regexes per config signature (avoid recompiling on every request).
let _customUaCache = { sig: null, regexes: [] };
function _compiledUaPatterns(cfg) {
  const sig = cfg.exclude_ua_patterns.join('|');
  if (_customUaCache.sig === sig) return _customUaCache.regexes;
  _customUaCache.regexes = cfg.exclude_ua_patterns
    .map(p => { try { return new RegExp(p, 'i'); } catch (_) { return null; } })
    .filter(Boolean);
  _customUaCache.sig = sig;
  return _customUaCache.regexes;
}

// SHA-256 hex of a string (Web Crypto, available in Workers). Used for hash-based IP exclusion.
async function _sha256Hex(text) {
  try {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', data);
    const bytes = new Uint8Array(buf);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
    return hex;
  } catch (_) { return ''; }
}

// ctx may include { ip, ua, ipHash } — ipHash is pre-computed by caller only when
// owner_ip_hashes is non-empty (avoids hashing every request unnecessarily).
function _shouldExclude(ctx, cfg) {
  if (cfg.exclude_localhost && (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '')) return 'localhost';
  // SIMON_DEVICE — direct IP match (mode: ip_exclusion)
  if (cfg.owner_ips.length && cfg.owner_ips.indexOf(ctx.ip) > -1) return 'owner_ip';
  // SIMON_DEVICE — hash-based match (mode: hash_based). More privacy-friendly: config stores only the hash.
  if (cfg.owner_ip_hashes.length && ctx.ipHash && cfg.owner_ip_hashes.indexOf(ctx.ipHash) > -1) return 'owner_ip_hash';
  if (cfg.dev_ips.length && cfg.dev_ips.indexOf(ctx.ip) > -1) return 'developer_ip';
  if (cfg.exclude_headless && HEADLESS_UA.test(ctx.ua)) return 'headless';
  if (cfg.exclude_bot && BOT_UA.test(ctx.ua)) return 'bot';
  // GLM_AGENT — user_agent_filter, value: GLM_*
  if (cfg.exclude_glm && GLM_UA.test(ctx.ua)) return 'glm_agent';
  // Custom UA patterns (extensible)
  const res = _compiledUaPatterns(cfg);
  for (let i = 0; i < res.length; i++) {
    if (res[i].test(ctx.ua)) return 'ua_pattern:' + cfg.exclude_ua_patterns[i];
  }
  return null;
}

// V7.8 — sessionID via cookie. Sin auth, distingue sesiones únicas para retención.
function _getOrCreateSessionId(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/voy_sid=([^;]+)/);
  if (match) return { sid: match[1], isNew: false };
  return { sid: crypto.randomUUID().slice(0, 8), isNew: true };
}

const worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const pathLower = url.pathname.toLowerCase();

    // 1) Hide internal entry path → same-host root (relative 301).
    if (pathLower === "/voy-lite.html" || pathLower === "/voy-lite") {
      return Response.redirect("/", 301);
    }

    // 2) CANONICAL REDIRECT — DISABLED until voy.is-a.dev is registered.
    // if (host.endsWith(".workers.dev") || host.includes("simondalmasso")) {
    //   const target = CANONICAL_ORIGIN + url.pathname + url.search;
    //   return Response.redirect(target, 301);
    // }

    // 3) Analytics ingestion endpoint — 3 eventos → WAE.
    if (pathLower === "/api/geocode" && request.method === "GET") {
      return _handleGeocode(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    // V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — /api/telemetry: Beacon API ingestion (fire-and-forget).
    //   Accepts {event, value, route, ts}. Receives LCP + JS errors + unhandled promise rejections
    //   from VoyHealthMonitor (client). Same exclusion filters as /api/events (no bot/localhost/owner noise).
    //   Logs to wrangler tail; writes a 'telemetry' WAE datapoint if VOY_METRICS is bound (queryable separately).
    if (pathLower === "/api/telemetry" && request.method === "POST") {
      return _handleTelemetry(request, env, ctx);
    }
    if (pathLower === "/api/telemetry" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    // ANALYTICS_SYSTEM_SETUP — /api/whoami: lets the OWNER detect their own IP + SHA-256
    // so they can populate VOY_OWNER_IPS (direct) or VOY_OWNER_IP_HASHES (hash-based).
    // Returns ONLY the caller's own info (no cross-user data, no PII stored server-side).
    // Also reports whether the caller would currently be excluded → instant config feedback.
    if (pathLower === "/api/whoami") {
      const callerIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const callerUa = request.headers.get("user-agent") || "";
      const wcfg = _loadFilterConfig(env);
      const ipHash = (callerIp && wcfg.owner_ip_hashes.length) ? await _sha256Hex(callerIp) : '';
      const excluded = _shouldExclude({ ip: callerIp, ua: callerUa, ipHash }, wcfg);
      return _cors(new Response(JSON.stringify({
        ip: callerIp,
        ip_sha256: ipHash || (callerIp ? await _sha256Hex(callerIp) : ''),
        ua: callerUa.slice(0, 120),
        excluded: excluded,
        note: "Visit this endpoint to detect your IP, then set VOY_OWNER_IPS (raw) or VOY_OWNER_IP_HASHES (SHA-256) in wrangler.jsonc vars / CF dashboard."
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (pathLower === "/api/health") {
      const hcfg = _loadFilterConfig(env);
      return _cors(new Response(JSON.stringify({
        ok: true, service: "voy-app", version: WORKER_VERSION, build_hash: BUILD_HASH,
        analytics: !!(env.VOY_METRICS),
        // Expose active filter COUNTS (not values) for verification — no PII leak.
        filters: {
          owner_ips: hcfg.owner_ips.length,
          owner_ip_hashes: hcfg.owner_ip_hashes.length,
          dev_ips: hcfg.dev_ips.length,
          exclude_localhost: hcfg.exclude_localhost,
          exclude_headless: hcfg.exclude_headless,
          exclude_bot: hcfg.exclude_bot,
          exclude_glm: hcfg.exclude_glm,
          exclude_ua_patterns: hcfg.exclude_ua_patterns.length
        },
        time: new Date().toISOString()
      }), { headers: { "Content-Type": "application/json" } }));
    }

    // 4) Root → internal rewrite to VOY-Lite.html.
    //    Cache-Control: no-store on HTML so edge never serves stale UI.
    //    Set-Cookie: voy_sid on first visit (sessionID for analytics).
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/VOY-Lite.html";
      const resp = await env.ASSETS.fetch(new Request(url, request));
      return _htmlNoStore(resp, request);
    }

    // 5) All other paths → static assets (with header cleanup).
    const resp = await env.ASSETS.fetch(request);
    return _cleanHeaders(resp);
  },

  // V7.8 — Cron trigger: recordatorio semanal de revisión de tarifas.
  // Lunes 06:00 UTC. Solo loguea; el hook queda listo para fuente oficial futura.
  async scheduled(event, env, ctx) {
    console.log('[VOY CRON] Recordatorio: verificar tarifas municipales (Resolución N°217/2026). Próxima revisión: ver fares.json _meta.proxima_revision.');
  }
};

function _geocodeJson(body, status = 200, extraHeaders = {}) {
  return _cors(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  }));
}

function _normalizedGeocodeQuery(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, GEOCODE_QUERY_MAX_LENGTH + 1);
}

async function _geocodeRateAllowed(request) {
  const now = Date.now();
  for (const [key, entry] of _geocodeClients) {
    if (now - entry.startedAt >= GEOCODE_RATE_WINDOW_MS) _geocodeClients.delete(key);
  }
  const clientIp = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'anonymous').split(',')[0].trim();
  const client = await _sha256Hex(_getGeocodeClientSalt() + ':' + clientIp);
  const current = _geocodeClients.get(client);
  if (!current || now - current.startedAt >= GEOCODE_RATE_WINDOW_MS) {
    if (_geocodeClients.size >= GEOCODE_CLIENTS_MAX) return false;
    _geocodeClients.set(client, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= GEOCODE_RATE_LIMIT;
}

function _geocodePrecision(item) {
  const type = String(item.type || '').toLowerCase();
  if (item.address && item.address.house_number) return 'house';
  if (type === 'intersection') return 'intersection';
  if (['road', 'street', 'residential'].includes(type)) return 'street';
  if (['suburb', 'neighbourhood', 'quarter'].includes(type)) return 'neighborhood';
  return ['node', 'way', 'relation'].includes(String(item.osm_type || '')) ? 'poi' : 'approximate';
}

function _remoteCandidate(item, cityId) {
  const displayName = String(item.display_name || '');
  const osmType = String(item.osm_type || '');
  const osmId = String(item.osm_id || '');
  const parts = displayName.split(',').map(part => part.trim()).filter(Boolean);
  const structured = item.address && typeof item.address === 'object' ? item.address : {};
  const houseNumber = String(structured.house_number || '').trim();
  const road = String(structured.road || structured.pedestrian || structured.residential || structured.footway || structured.path || structured.cycleway || '').trim();
  const city = String(structured.city || structured.town || structured.municipality || structured.village || '').trim();
  const state = String(structured.state || '').trim();
  const countryCode = String(structured.country_code || '').toLowerCase();
  const structuredName = road && houseNumber ? `${road} ${houseNumber}` : '';
  const structuredAddress = [structuredName || road, city, state].filter(Boolean).join(', ');

  const latVal = _isValidCoordinateValue(item.lat) ? Number(item.lat) : null;
  const lonVal = _isValidCoordinateValue(item.lon) ? Number(item.lon) : null;

  return {
    canonicalId: osmType && osmId ? `osm:${osmType}:${osmId}` : '',
    source: 'remote',
    type: item.type || item.category || 'place',
    name: structuredName || item.name || (item.namedetails && (item.namedetails.name || item.namedetails['name:es'])) || parts[0] || '',
    displayName,
    address: structuredAddress || parts.slice(1, 4).join(', '),
    lat: latVal,
    lon: lonVal,
    cityId,
    precision: _geocodePrecision(item),
    confidence: Math.max(0, Math.min(1, Number(item.importance) || 0)),
    verified: false,
    aliases: [],
    osmType,
    osmId,
    houseNumber,
    road,
    city,
    state,
    countryCode
  };
}

function _insideGeocodeCity(candidate, city) {
  if (!city || !city.bbox) return true;
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon) && candidate.lat >= city.bbox.minLat && candidate.lat <= city.bbox.maxLat && candidate.lon >= city.bbox.minLon && candidate.lon <= city.bbox.maxLon;
}

function _geocodeCacheKey(provider, cityId, query, wide) {
  const normalized = String(query || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
  return [GEOCODE_CONTRACT_VERSION, provider, cityId, wide ? 'unbounded' : 'bounded', normalized].join('|');
}

async function _handleGeocode(request, env, ctx) {
  const url = new URL(request.url);
  const query = _normalizedGeocodeQuery(url.searchParams.get('q'));
  const cityId = String(url.searchParams.get('city') || '').toLowerCase();
  const wide = url.searchParams.get('wide') === '1';
  if (query.length < 2) return _geocodeJson({ error: 'query_too_short', results: [] }, 400);
  if (query.length > GEOCODE_QUERY_MAX_LENGTH) return _geocodeJson({ error: 'query_too_long', results: [] }, 400);
  const city = GEOCODE_CITIES[cityId];
  if (!city) return _geocodeJson({ error: 'unsupported_city', results: [] }, 400);

  const provider = String(env.VOY_GEOCODE_PROVIDER || 'nominatim').toLowerCase();
  const providerBase = String(env.VOY_GEOCODE_PROVIDER_URL || 'https://nominatim.openstreetmap.org/search');
  const cache = caches.default;
  const cacheIdentity = _geocodeCacheKey(provider, cityId, query, wide);
  const cacheUrl = new URL('/__voy_geocode_cache', url.origin);
  cacheUrl.search = new URLSearchParams({ key: cacheIdentity }).toString();
  const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  if (!(await _geocodeRateAllowed(request))) return _geocodeJson({ error: 'rate_limited', results: [] }, 429, { 'Retry-After': '60' });
  if (provider !== 'nominatim' && !env.VOY_GEOCODE_PROVIDER_URL) return _geocodeJson({ error: 'provider_not_configured', results: [] }, 503);

  if (!env.NOMINATIM_COORDINATOR) return _geocodeJson({ error: 'coordinator_unavailable', results: [] }, 503, { 'Retry-After': '5' });
  const coordinatorId = env.NOMINATIM_COORDINATOR.idFromName('nominatim-global');
  const coordinator = env.NOMINATIM_COORDINATOR.get(coordinatorId);
  const coordinated = await coordinator.fetch('https://nominatim-coordinator.internal/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cacheIdentity, query, cityId, wide, provider, providerBase, fallbackBase: env.VOY_GEOCODE_FALLBACK_URL || '' })
  });
  if (!coordinated.ok) return coordinated;
  const body = await coordinated.text();
  const result = _geocodeJson(JSON.parse(body), 200, { 'Cache-Control': 'public, max-age=86400' });
  const stored = result.clone();
  if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(cache.put(cacheKey, stored));
  else await cache.put(cacheKey, stored);
  return result;
}

export class NominatimCoordinator {
  constructor(state, env) {
    this.state = state;
    this.env = env || {};
    this.pending = 0;
    this.tail = Promise.resolve();
    this.now = this.env.__clock || (() => Date.now());
    this.sleep = this.env.__sleep || (ms => new Promise(resolve => setTimeout(resolve, ms)));
    this.upstreamFetch = this.env.__fetch || fetch;
  }

  async fetch(request) {
    if (request.method !== 'POST') return _geocodeJson({ error: 'method_not_allowed', results: [] }, 405);
    let payload;
    try { payload = await request.json(); } catch (_) { return _geocodeJson({ error: 'bad_request', results: [] }, 400); }
    if (!payload || !payload.cacheIdentity || !payload.query || !GEOCODE_CITIES[payload.cityId]) return _geocodeJson({ error: 'bad_request', results: [] }, 400);
    if (this.pending >= NOMINATIM_MAX_QUEUE) return _geocodeJson({ error: 'coordinator_busy', results: [] }, 503, { 'Retry-After': '2' });
    this.pending += 1;
    const run = this.tail.then(() => this._resolve(payload), () => this._resolve(payload));
    this.tail = run.catch(() => {});
    try { return await run; } finally { this.pending -= 1; }
  }

  async _resolve(payload) {
    const cacheStorageKey = 'cache:' + payload.cacheIdentity;
    const cached = await this.state.storage.get(cacheStorageKey);
    const now = this.now();
    if (cached && cached.expiresAt > now) return _geocodeJson(cached.body, 200, { 'X-VOY-Geocode-Cache': 'hit' });
    if (cached) await this.state.storage.delete(cacheStorageKey);

    const nextAllowedAt = Number(await this.state.storage.get('nextAllowedAt')) || 0;
    const waitMs = Math.max(0, nextAllowedAt - now);
    if (waitMs > NOMINATIM_MAX_WAIT_MS) return _geocodeJson({ error: 'coordinator_busy', results: [] }, 503, { 'Retry-After': String(Math.ceil(waitMs / 1000)) });
    if (waitMs) await this.sleep(waitMs);
    const startedAt = this.now();
    await this.state.storage.put('nextAllowedAt', startedAt + NOMINATIM_MIN_INTERVAL_MS);

    const city = GEOCODE_CITIES[payload.cityId];
    const upstream = this._providerUrl(payload.providerBase, payload, city);
    let response = await this._fetchWithTimeout(upstream);
    let providerUsed = payload.provider;
    if ((!response || !response.ok) && payload.fallbackBase) {
      response = await this._fetchWithTimeout(this._providerUrl(payload.fallbackBase, payload, city));
      providerUsed = 'fallback';
    }
    if (!response) return _geocodeJson({ error: 'provider_unavailable', results: [] }, 502);
    if (!response.ok) return _geocodeJson({ error: 'provider_error', results: [] }, response.status === 429 ? 429 : 502, response.status === 429 ? { 'Retry-After': response.headers.get('Retry-After') || '2' } : {});
    let data;
    try { data = await response.json(); } catch (_) { return _geocodeJson({ error: 'malformed_provider_response', results: [] }, 502); }
    const results = (Array.isArray(data) ? data : []).map(item => _remoteCandidate(item, payload.cityId))
      .filter(candidate => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon))
      .filter(candidate => payload.wide || payload.cityId === '_default' || _insideGeocodeCity(candidate, city));
    const body = { query: payload.query, cityId: payload.cityId, provider: providerUsed, results };
    const storedAt = this.now();
    const expiresAt = storedAt + GEOCODE_CACHE_TTL_MS;
    await this.state.storage.put(cacheStorageKey, { body, storedAt, expiresAt });
    await this.state.storage.put('providerMetadata', { provider: providerUsed, updatedAt: storedAt, contractVersion: GEOCODE_CONTRACT_VERSION });

    if (typeof this.state.storage.getAlarm === 'function' && typeof this.state.storage.setAlarm === 'function') {
      const currentAlarm = await this.state.storage.getAlarm();
      if (currentAlarm === null || expiresAt < currentAlarm) {
        await this.state.storage.setAlarm(expiresAt);
      }
    }

    return _geocodeJson(body, 200, { 'X-VOY-Geocode-Cache': 'miss' });
  }

  async alarm() {
    const now = this.now();
    const limit = 50;
    const cursor = await this.state.storage.get('sweepCursor') || undefined;

    const options = { prefix: 'cache:', limit };
    if (cursor) {
      options.start = cursor;
    }
    const entries = await this.state.storage.list(options);

    let lastKey = null;
    let nextExpiration = null;

    for (const [key, value] of entries.entries()) {
      lastKey = key;
      if (value && value.expiresAt) {
        if (value.expiresAt <= now) {
          await this.state.storage.delete(key);
        } else {
          if (nextExpiration === null || value.expiresAt < nextExpiration) {
            nextExpiration = value.expiresAt;
          }
        }
      }
    }

    if (typeof this.state.storage.setAlarm === 'function') {
      if (entries.size === limit) {
        await this.state.storage.put('sweepCursor', lastKey + '\0');
        await this.state.storage.setAlarm(this.now() + 1000);
      } else {
        await this.state.storage.delete('sweepCursor');
        if (nextExpiration !== null) {
          await this.state.storage.setAlarm(nextExpiration);
        }
      }
    }
  }

  _providerUrl(base, payload, city) {
    const upstream = new URL(String(base));
    upstream.searchParams.set('q', payload.query + (payload.cityId === '_default' ? '' : ', Santa Fe, Argentina'));
    upstream.searchParams.set('format', 'jsonv2');
    upstream.searchParams.set('limit', '10');
    upstream.searchParams.set('countrycodes', 'ar');
    upstream.searchParams.set('addressdetails', '1');
    upstream.searchParams.set('namedetails', '1');
    upstream.searchParams.set('accept-language', 'es');
    if (!payload.wide && payload.cityId !== '_default' && city && city.viewbox) {
      upstream.searchParams.set('viewbox', city.viewbox);
      upstream.searchParams.set('bounded', '1');
    }
    return upstream.toString();
  }

  async _fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOMINATIM_FETCH_TIMEOUT_MS);
    try {
      return await this.upstreamFetch(url, { signal: controller.signal, headers: { Accept: 'application/json', 'Accept-Language': 'es-AR,es;q=0.9', 'User-Agent': 'VOY/7.8 (https://voy-app.simondalmasso44.workers.dev/)' } });
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export default worker;

// ---------------- Analytics handler (V7.8 — 3 eventos, WAE only) ----------------
async function _handleEvents(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }

  const events = body && Array.isArray(body.events) ? body.events : null;
  if (!events) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "no_events" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }

  // --- filtros de exclusión (localhost / headless / bot / glm_agent / owner_ip / owner_ip_hash / dev_ip / ua_pattern) ---
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  // Hash-based owner-IP check — only compute SHA-256 when owner_ip_hashes is configured
  // (avoids the digest cost on every request otherwise).
  const ipHash = (cfg.owner_ip_hashes.length && ip) ? await _sha256Hex(ip) : '';
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({
      ok: true, received: events.length, written: 0, excluded: events.length, reason: excludeReason
    }), { status: 202, headers: { "Content-Type": "application/json" } }));
  }

  // --- sessionID (cookie-based, sin auth) ---
  const { sid } = _getOrCreateSessionId(request);

  // --- normalización: legacy → 3 eventos canónicos ---
  const normalized = [];
  for (const e of events) {
    const canonical = EVENT_NORMALIZE[e.name];
    if (!canonical) continue; // drop non-canonical events
    normalized.push({
      name: canonical,
      anon_id: String(e.anon_id || sid).slice(0, 64),
      ts: Number(e.ts) || Date.now(),
      geo: String(e.geo || "").slice(0, 60),
      data: e.data || {}
    });
  }
  if (!normalized.length) {
    return _cors(new Response(JSON.stringify({ ok: true, received: events.length, written: 0, note: "no_canonical_events" }), {
      status: 202, headers: { "Content-Type": "application/json" }
    }));
  }

  // --- WAE write (fire-and-forget via ctx.waitUntil) ---
  let aeWritten = 0;
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      for (const e of normalized) {
        try {
          env.VOY_METRICS.writeDataPoint({
            indexes: [e.name],              // 'estimation' | 'provider_tap' | 'search'
            blobs: [
              e.anon_id,                     // sessionID o anon_id
              String(e.data && e.data.provider || ''),  // uber|didi|maxim|taxi|bus|...
              String(e.data && e.data.mode || '')       // auto|moto|bus|walk|bike
            ],
            doubles: [
              Number(e.data && e.data.price) || 0,      // precio estimado
              Number(e.data && e.data.time_min) || 0,   // tiempo estimado
              Number(e.data && e.data.distance_km) || 0 // distancia
            ]
          });
          aeWritten++;
        } catch (_) { /* WAE failure never breaks the app */ }
      }
    })());
  }

  return _cors(new Response(JSON.stringify({
    ok: true, received: events.length, normalized: normalized.length,
    written: aeWritten, session_id: sid
  }), { status: 202, headers: { "Content-Type": "application/json" } }));
}

// ---------------- V7.7 Telemetry handler (Beacon API: LCP + JS errors + promise rejections) ----------------
// Fire-and-forget ingestion endpoint. Never blocks unload (sendBeacon). Schema: {event, value, route, ts}.
// Reuses the same exclusion model as /api/events so owner/bot/localhost noise never reaches the log.
async function _handleTelemetry(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400, headers: { "Content-Type": "application/json" }
    }));
  }
  // Exclusion filters (same model as /api/events — never log bot/localhost/owner noise).
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  const ipHash = (cfg.owner_ip_hashes.length && ip) ? await _sha256Hex(ip) : '';
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({ ok: true, excluded: true, reason: excludeReason }), {
      status: 202, headers: { "Content-Type": "application/json" }
    }));
  }
  const event = String(body && body.event || "").slice(0, 40);
  const value = Number(body && body.value) || 0;
  const route = String(body && body.route || "").slice(0, 140);
  const ts = Number(body && body.ts) || Date.now();
  // Fire-and-forget log (visible via `wrangler tail`).
  try { console.log(JSON.stringify({ telemetry: true, event, value, route, ts })); } catch (_) {}
  // Optional WAE persistence (index 'telemetry' keeps it queryable separately from product events).
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      try {
        env.VOY_METRICS.writeDataPoint({
          indexes: ["telemetry"],
          blobs: [event, route],
          doubles: [value, ts]
        });
      } catch (_) { /* WAE failure never breaks telemetry */ }
    })());
  }
  return _cors(new Response(JSON.stringify({ ok: true }), { status: 202, headers: { "Content-Type": "application/json" } }));
}

function _cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  resp.headers.delete("x-powered-by");
  return resp;
}

function _cleanHeaders(resp) {
  try {
    resp.headers.delete("x-powered-by");
    resp.headers.delete("server");
  } catch (_) {}
  return resp;
}

// V7.8: HTML responses get Cache-Control: no-store + sessionID cookie.
function _htmlNoStore(resp, request) {
  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("Vary", "Accept-Encoding");
  headers.set("X-VOY-Version", WORKER_VERSION);
  headers.set("X-VOY-Build", BUILD_HASH);
  headers.delete("x-powered-by");
  headers.delete("server");

  // Set-Cookie: voy_sid on first visit (30-day retention window).
  const { sid, isNew } = _getOrCreateSessionId(request);
  if (isNew) {
    headers.append("Set-Cookie", `voy_sid=${sid}; Max-Age=2592000; SameSite=Lax; Path=/`);
  }

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: headers
  });
}
