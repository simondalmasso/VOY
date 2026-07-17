var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var WORKER_VERSION = "V7.8.0";
var BUILD_HASH = "__BUILD_HASH__";
var GEOCODE_CITIES = {
  santafe: { viewbox: "-60.75,-31.67,-60.65,-31.57", bbox: { minLat: -31.67, maxLat: -31.57, minLon: -60.75, maxLon: -60.65 } },
  _default: { viewbox: null, bbox: null }
};
var GEOCODE_QUERY_MAX_LENGTH = 120;
function _isValidCoordinateValue(value) {
  if (value === null || value === void 0) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  const num = Number(value);
  if (Number.isNaN(num)) return false;
  if (!Number.isFinite(num)) return false;
  return true;
}
__name(_isValidCoordinateValue, "_isValidCoordinateValue");
var GEOCODE_RATE_LIMIT = 20;
var GEOCODE_RATE_WINDOW_MS = 6e4;
var GEOCODE_CLIENTS_MAX = 1e3;
var GEOCODE_CONTRACT_VERSION = "v2";
var GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1e3;
var NOMINATIM_MIN_INTERVAL_MS = 1100;
var NOMINATIM_MAX_QUEUE = 10;
var NOMINATIM_MAX_WAIT_MS = 1e4;
var NOMINATIM_FETCH_TIMEOUT_MS = 8e3;
var _geocodeClients = /* @__PURE__ */ new Map();
var _geocodeClientSalt = null;
function _getGeocodeClientSalt() {
  if (!_geocodeClientSalt) {
    _geocodeClientSalt = crypto.randomUUID();
  }
  return _geocodeClientSalt;
}
__name(_getGeocodeClientSalt, "_getGeocodeClientSalt");
var EVENT_NORMALIZE = {
  // → estimation
  estimation: "estimation",
  route_calculated: "estimation",
  ride_estimated: "estimation",
  route_selected: "estimation",
  destination_selected: "estimation",
  // → provider_tap
  provider_tap: "provider_tap",
  provider_click: "provider_tap",
  provider_clicked: "provider_tap",
  deeplink_opened: "provider_tap",
  vehicle_viewed: "provider_tap",
  // → search
  search: "search",
  search_performed: "search",
  voice_search: "search"
};
function _loadFilterConfig(env) {
  const list = /* @__PURE__ */ __name((v) => v ? String(v).split(",").map((s) => s.trim()).filter(Boolean) : [], "list");
  return {
    owner_ips: list(env.VOY_OWNER_IPS),
    // SHA-256 hex hashes of owner IPs (hash-based mode — never stores raw IP in config).
    owner_ip_hashes: list(env.VOY_OWNER_IP_HASHES).map((h) => h.toLowerCase()),
    dev_ips: list(env.VOY_DEV_IPS),
    exclude_localhost: env.VOY_EXCLUDE_LOCALHOST !== "false",
    exclude_headless: env.VOY_EXCLUDE_HEADLESS !== "false",
    exclude_bot: env.VOY_EXCLUDE_BOT !== "false",
    exclude_glm: env.VOY_EXCLUDE_GLM !== "false",
    // Additional UA regex patterns (comma-separated, case-insensitive).
    exclude_ua_patterns: list(env.VOY_EXCLUDE_UA_PATTERNS)
  };
}
__name(_loadFilterConfig, "_loadFilterConfig");
var BOT_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
var HEADLESS_UA = /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|chrome-lighthouse|w3c_validator|nightmare|crawly|crawler/i;
var GLM_UA = /^GLM[\s\/\-_:]/i;
var _customUaCache = { sig: null, regexes: [] };
function _compiledUaPatterns(cfg) {
  const sig = cfg.exclude_ua_patterns.join("|");
  if (_customUaCache.sig === sig) return _customUaCache.regexes;
  _customUaCache.regexes = cfg.exclude_ua_patterns.map((p) => {
    try {
      return new RegExp(p, "i");
    } catch (_) {
      return null;
    }
  }).filter(Boolean);
  _customUaCache.sig = sig;
  return _customUaCache.regexes;
}
__name(_compiledUaPatterns, "_compiledUaPatterns");
async function _sha256Hex(text) {
  try {
    const data = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", data);
    const bytes = new Uint8Array(buf);
    let hex = "";
    for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, "0");
    return hex;
  } catch (_) {
    return "";
  }
}
__name(_sha256Hex, "_sha256Hex");
function _shouldExclude(ctx, cfg) {
  if (cfg.exclude_localhost && (ctx.ip === "127.0.0.1" || ctx.ip === "::1" || ctx.ip === "")) return "localhost";
  if (cfg.owner_ips.length && cfg.owner_ips.indexOf(ctx.ip) > -1) return "owner_ip";
  if (cfg.owner_ip_hashes.length && ctx.ipHash && cfg.owner_ip_hashes.indexOf(ctx.ipHash) > -1) return "owner_ip_hash";
  if (cfg.dev_ips.length && cfg.dev_ips.indexOf(ctx.ip) > -1) return "developer_ip";
  if (cfg.exclude_headless && HEADLESS_UA.test(ctx.ua)) return "headless";
  if (cfg.exclude_bot && BOT_UA.test(ctx.ua)) return "bot";
  if (cfg.exclude_glm && GLM_UA.test(ctx.ua)) return "glm_agent";
  const res = _compiledUaPatterns(cfg);
  for (let i = 0; i < res.length; i++) {
    if (res[i].test(ctx.ua)) return "ua_pattern:" + cfg.exclude_ua_patterns[i];
  }
  return null;
}
__name(_shouldExclude, "_shouldExclude");
function _getOrCreateSessionId(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/voy_sid=([^;]+)/);
  if (match) return { sid: match[1], isNew: false };
  return { sid: crypto.randomUUID().slice(0, 8), isNew: true };
}
__name(_getOrCreateSessionId, "_getOrCreateSessionId");
var worker = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const pathLower = url.pathname.toLowerCase();
    if (pathLower === "/voy-lite.html" || pathLower === "/voy-lite") {
      return Response.redirect("/", 301);
    }
    if (pathLower === "/api/geocode" && request.method === "GET") {
      return _handleGeocode(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    if (pathLower === "/api/telemetry" && request.method === "POST") {
      return _handleTelemetry(request, env, ctx);
    }
    if (pathLower === "/api/telemetry" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    if (pathLower === "/api/whoami") {
      const callerIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
      const callerUa = request.headers.get("user-agent") || "";
      const wcfg = _loadFilterConfig(env);
      const ipHash = callerIp && wcfg.owner_ip_hashes.length ? await _sha256Hex(callerIp) : "";
      const excluded = _shouldExclude({ ip: callerIp, ua: callerUa, ipHash }, wcfg);
      return _cors(new Response(JSON.stringify({
        ip: callerIp,
        ip_sha256: ipHash || (callerIp ? await _sha256Hex(callerIp) : ""),
        ua: callerUa.slice(0, 120),
        excluded,
        note: "Visit this endpoint to detect your IP, then set VOY_OWNER_IPS (raw) or VOY_OWNER_IP_HASHES (SHA-256) in wrangler.jsonc vars / CF dashboard."
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (pathLower === "/api/health") {
      const hcfg = _loadFilterConfig(env);
      return _cors(new Response(JSON.stringify({
        ok: true,
        service: "voy-app",
        version: WORKER_VERSION,
        build_hash: BUILD_HASH,
        analytics: !!env.VOY_METRICS,
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
        time: (/* @__PURE__ */ new Date()).toISOString()
      }), { headers: { "Content-Type": "application/json" } }));
    }
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/VOY-Lite.html";
      const resp2 = await env.ASSETS.fetch(new Request(url, request));
      return _htmlNoStore(resp2, request);
    }
    const resp = await env.ASSETS.fetch(request);
    return _cleanHeaders(resp);
  },
  // V7.8 — Cron trigger: recordatorio semanal de revisión de tarifas.
  // Lunes 06:00 UTC. Solo loguea; el hook queda listo para fuente oficial futura.
  async scheduled(event, env, ctx) {
    console.log("[VOY CRON] Recordatorio: verificar tarifas municipales (Resoluci\xF3n N\xB0217/2026). Pr\xF3xima revisi\xF3n: ver fares.json _meta.proxima_revision.");
  }
};
function _geocodeJson(body, status = 200, extraHeaders = {}) {
  return _cors(new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...extraHeaders }
  }));
}
__name(_geocodeJson, "_geocodeJson");
function _normalizedGeocodeQuery(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, GEOCODE_QUERY_MAX_LENGTH + 1);
}
__name(_normalizedGeocodeQuery, "_normalizedGeocodeQuery");
async function _geocodeRateAllowed(request) {
  const now = Date.now();
  for (const [key, entry] of _geocodeClients) {
    if (now - entry.startedAt >= GEOCODE_RATE_WINDOW_MS) _geocodeClients.delete(key);
  }
  const clientIp = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "anonymous").split(",")[0].trim();
  const client = await _sha256Hex(_getGeocodeClientSalt() + ":" + clientIp);
  const current = _geocodeClients.get(client);
  if (!current || now - current.startedAt >= GEOCODE_RATE_WINDOW_MS) {
    if (_geocodeClients.size >= GEOCODE_CLIENTS_MAX) return false;
    _geocodeClients.set(client, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= GEOCODE_RATE_LIMIT;
}
__name(_geocodeRateAllowed, "_geocodeRateAllowed");
function _geocodePrecision(item) {
  const type = String(item.type || "").toLowerCase();
  if (item.address && item.address.house_number) return "house";
  if (type === "intersection") return "intersection";
  if (["road", "street", "residential"].includes(type)) return "street";
  if (["suburb", "neighbourhood", "quarter"].includes(type)) return "neighborhood";
  return ["node", "way", "relation"].includes(String(item.osm_type || "")) ? "poi" : "approximate";
}
__name(_geocodePrecision, "_geocodePrecision");
function _remoteCandidate(item, cityId) {
  const displayName = String(item.display_name || "");
  const osmType = String(item.osm_type || "");
  const osmId = String(item.osm_id || "");
  const parts = displayName.split(",").map((part) => part.trim()).filter(Boolean);
  const structured = item.address && typeof item.address === "object" ? item.address : {};
  const houseNumber = String(structured.house_number || "").trim();
  const road = String(structured.road || structured.pedestrian || structured.residential || structured.footway || structured.path || structured.cycleway || "").trim();
  const city = String(structured.city || structured.town || structured.municipality || structured.village || "").trim();
  const state = String(structured.state || "").trim();
  const countryCode = String(structured.country_code || "").toLowerCase();
  const structuredName = road && houseNumber ? `${road} ${houseNumber}` : "";
  const structuredAddress = [structuredName || road, city, state].filter(Boolean).join(", ");
  const latVal = _isValidCoordinateValue(item.lat) ? Number(item.lat) : null;
  const lonVal = _isValidCoordinateValue(item.lon) ? Number(item.lon) : null;
  return {
    canonicalId: osmType && osmId ? `osm:${osmType}:${osmId}` : "",
    source: "remote",
    type: item.type || item.category || "place",
    name: structuredName || item.name || item.namedetails && (item.namedetails.name || item.namedetails["name:es"]) || parts[0] || "",
    displayName,
    address: structuredAddress || parts.slice(1, 4).join(", "),
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
__name(_remoteCandidate, "_remoteCandidate");
function _insideGeocodeCity(candidate, city) {
  if (!city || !city.bbox) return true;
  return Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon) && candidate.lat >= city.bbox.minLat && candidate.lat <= city.bbox.maxLat && candidate.lon >= city.bbox.minLon && candidate.lon <= city.bbox.maxLon;
}
__name(_insideGeocodeCity, "_insideGeocodeCity");
function _geocodeCacheKey(provider, cityId, query, wide) {
  const normalized = String(query || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
  return [GEOCODE_CONTRACT_VERSION, provider, cityId, wide ? "unbounded" : "bounded", normalized].join("|");
}
__name(_geocodeCacheKey, "_geocodeCacheKey");
async function _handleGeocode(request, env, ctx) {
  const url = new URL(request.url);
  const query = _normalizedGeocodeQuery(url.searchParams.get("q"));
  const cityId = String(url.searchParams.get("city") || "").toLowerCase();
  const wide = url.searchParams.get("wide") === "1";
  if (query.length < 2) return _geocodeJson({ error: "query_too_short", results: [] }, 400);
  if (query.length > GEOCODE_QUERY_MAX_LENGTH) return _geocodeJson({ error: "query_too_long", results: [] }, 400);
  const city = GEOCODE_CITIES[cityId];
  if (!city) return _geocodeJson({ error: "unsupported_city", results: [] }, 400);
  const provider = String(env.VOY_GEOCODE_PROVIDER || "nominatim").toLowerCase();
  const providerBase = String(env.VOY_GEOCODE_PROVIDER_URL || "https://nominatim.openstreetmap.org/search");
  const cache = caches.default;
  const cacheIdentity = _geocodeCacheKey(provider, cityId, query, wide);
  const cacheUrl = new URL("/__voy_geocode_cache", url.origin);
  cacheUrl.search = new URLSearchParams({ key: cacheIdentity }).toString();
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  if (!await _geocodeRateAllowed(request)) return _geocodeJson({ error: "rate_limited", results: [] }, 429, { "Retry-After": "60" });
  if (provider !== "nominatim" && !env.VOY_GEOCODE_PROVIDER_URL) return _geocodeJson({ error: "provider_not_configured", results: [] }, 503);
  if (!env.NOMINATIM_COORDINATOR) return _geocodeJson({ error: "coordinator_unavailable", results: [] }, 503, { "Retry-After": "5" });
  const coordinatorId = env.NOMINATIM_COORDINATOR.idFromName("nominatim-global");
  const coordinator = env.NOMINATIM_COORDINATOR.get(coordinatorId);
  const coordinated = await coordinator.fetch("https://nominatim-coordinator.internal/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cacheIdentity, query, cityId, wide, provider, providerBase, fallbackBase: env.VOY_GEOCODE_FALLBACK_URL || "" })
  });
  if (!coordinated.ok) return coordinated;
  const body = await coordinated.text();
  const result = _geocodeJson(JSON.parse(body), 200, { "Cache-Control": "public, max-age=86400" });
  const stored = result.clone();
  if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(cache.put(cacheKey, stored));
  else await cache.put(cacheKey, stored);
  return result;
}
__name(_handleGeocode, "_handleGeocode");
var NominatimCoordinator = class {
  static {
    __name(this, "NominatimCoordinator");
  }
  constructor(state, env) {
    this.state = state;
    this.env = env || {};
    this.pending = 0;
    this.tail = Promise.resolve();
    this.now = this.env.__clock || (() => Date.now());
    this.sleep = this.env.__sleep || ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.upstreamFetch = this.env.__fetch || fetch;
  }
  async fetch(request) {
    if (request.method !== "POST") return _geocodeJson({ error: "method_not_allowed", results: [] }, 405);
    let payload;
    try {
      payload = await request.json();
    } catch (_) {
      return _geocodeJson({ error: "bad_request", results: [] }, 400);
    }
    if (!payload || !payload.cacheIdentity || !payload.query || !GEOCODE_CITIES[payload.cityId]) return _geocodeJson({ error: "bad_request", results: [] }, 400);
    if (this.pending >= NOMINATIM_MAX_QUEUE) return _geocodeJson({ error: "coordinator_busy", results: [] }, 503, { "Retry-After": "2" });
    this.pending += 1;
    const run = this.tail.then(() => this._resolve(payload), () => this._resolve(payload));
    this.tail = run.catch(() => {
    });
    try {
      return await run;
    } finally {
      this.pending -= 1;
    }
  }
  async _resolve(payload) {
    const cacheStorageKey = "cache:" + payload.cacheIdentity;
    const cached = await this.state.storage.get(cacheStorageKey);
    const now = this.now();
    if (cached && cached.expiresAt > now) return _geocodeJson(cached.body, 200, { "X-VOY-Geocode-Cache": "hit" });
    if (cached) await this.state.storage.delete(cacheStorageKey);
    const nextAllowedAt = Number(await this.state.storage.get("nextAllowedAt")) || 0;
    const waitMs = Math.max(0, nextAllowedAt - now);
    if (waitMs > NOMINATIM_MAX_WAIT_MS) return _geocodeJson({ error: "coordinator_busy", results: [] }, 503, { "Retry-After": String(Math.ceil(waitMs / 1e3)) });
    if (waitMs) await this.sleep(waitMs);
    const startedAt = this.now();
    await this.state.storage.put("nextAllowedAt", startedAt + NOMINATIM_MIN_INTERVAL_MS);
    const city = GEOCODE_CITIES[payload.cityId];
    const upstream = this._providerUrl(payload.providerBase, payload, city);
    let response = await this._fetchWithTimeout(upstream);
    let providerUsed = payload.provider;
    if ((!response || !response.ok) && payload.fallbackBase) {
      response = await this._fetchWithTimeout(this._providerUrl(payload.fallbackBase, payload, city));
      providerUsed = "fallback";
    }
    if (!response) return _geocodeJson({ error: "provider_unavailable", results: [] }, 502);
    if (!response.ok) return _geocodeJson({ error: "provider_error", results: [] }, response.status === 429 ? 429 : 502, response.status === 429 ? { "Retry-After": response.headers.get("Retry-After") || "2" } : {});
    let data;
    try {
      data = await response.json();
    } catch (_) {
      return _geocodeJson({ error: "malformed_provider_response", results: [] }, 502);
    }
    const results = (Array.isArray(data) ? data : []).map((item) => _remoteCandidate(item, payload.cityId)).filter((candidate) => Number.isFinite(candidate.lat) && Number.isFinite(candidate.lon)).filter((candidate) => payload.wide || payload.cityId === "_default" || _insideGeocodeCity(candidate, city));
    const body = { query: payload.query, cityId: payload.cityId, provider: providerUsed, results };
    const storedAt = this.now();
    const expiresAt = storedAt + GEOCODE_CACHE_TTL_MS;
    await this.state.storage.put(cacheStorageKey, { body, storedAt, expiresAt });
    await this.state.storage.put("providerMetadata", { provider: providerUsed, updatedAt: storedAt, contractVersion: GEOCODE_CONTRACT_VERSION });
    if (typeof this.state.storage.getAlarm === "function" && typeof this.state.storage.setAlarm === "function") {
      const currentAlarm = await this.state.storage.getAlarm();
      if (currentAlarm === null || expiresAt < currentAlarm) {
        await this.state.storage.setAlarm(expiresAt);
      }
    }
    return _geocodeJson(body, 200, { "X-VOY-Geocode-Cache": "miss" });
  }
  async alarm() {
    const now = this.now();
    const limit = 50;
    const cursor = await this.state.storage.get("sweepCursor") || void 0;
    const options = { prefix: "cache:", limit };
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
    if (typeof this.state.storage.setAlarm === "function") {
      if (entries.size === limit) {
        await this.state.storage.put("sweepCursor", lastKey + "\0");
        await this.state.storage.setAlarm(this.now() + 1e3);
      } else {
        await this.state.storage.delete("sweepCursor");
        if (nextExpiration !== null) {
          await this.state.storage.setAlarm(nextExpiration);
        }
      }
    }
  }
  _providerUrl(base, payload, city) {
    const upstream = new URL(String(base));
    upstream.searchParams.set("q", payload.query + (payload.cityId === "_default" ? "" : ", Santa Fe, Argentina"));
    upstream.searchParams.set("format", "jsonv2");
    upstream.searchParams.set("limit", "10");
    upstream.searchParams.set("countrycodes", "ar");
    upstream.searchParams.set("addressdetails", "1");
    upstream.searchParams.set("namedetails", "1");
    upstream.searchParams.set("accept-language", "es");
    if (!payload.wide && payload.cityId !== "_default" && city && city.viewbox) {
      upstream.searchParams.set("viewbox", city.viewbox);
      upstream.searchParams.set("bounded", "1");
    }
    return upstream.toString();
  }
  async _fetchWithTimeout(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NOMINATIM_FETCH_TIMEOUT_MS);
    try {
      return await this.upstreamFetch(url, { signal: controller.signal, headers: { Accept: "application/json", "Accept-Language": "es-AR,es;q=0.9", "User-Agent": "VOY/7.8 (https://voy-app.simondalmasso44.workers.dev/)" } });
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
};
var worker_default = worker;
async function _handleEvents(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }));
  }
  const events = body && Array.isArray(body.events) ? body.events : null;
  if (!events) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "no_events" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }));
  }
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  const ipHash = cfg.owner_ip_hashes.length && ip ? await _sha256Hex(ip) : "";
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({
      ok: true,
      received: events.length,
      written: 0,
      excluded: events.length,
      reason: excludeReason
    }), { status: 202, headers: { "Content-Type": "application/json" } }));
  }
  const { sid } = _getOrCreateSessionId(request);
  const normalized = [];
  for (const e of events) {
    const canonical = EVENT_NORMALIZE[e.name];
    if (!canonical) continue;
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
      status: 202,
      headers: { "Content-Type": "application/json" }
    }));
  }
  let aeWritten = 0;
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      for (const e of normalized) {
        try {
          env.VOY_METRICS.writeDataPoint({
            indexes: [e.name],
            // 'estimation' | 'provider_tap' | 'search'
            blobs: [
              e.anon_id,
              // sessionID o anon_id
              String(e.data && e.data.provider || ""),
              // uber|didi|maxim|taxi|bus|...
              String(e.data && e.data.mode || "")
              // auto|moto|bus|walk|bike
            ],
            doubles: [
              Number(e.data && e.data.price) || 0,
              // precio estimado
              Number(e.data && e.data.time_min) || 0,
              // tiempo estimado
              Number(e.data && e.data.distance_km) || 0
              // distancia
            ]
          });
          aeWritten++;
        } catch (_) {
        }
      }
    })());
  }
  return _cors(new Response(JSON.stringify({
    ok: true,
    received: events.length,
    normalized: normalized.length,
    written: aeWritten,
    session_id: sid
  }), { status: 202, headers: { "Content-Type": "application/json" } }));
}
__name(_handleEvents, "_handleEvents");
async function _handleTelemetry(request, env, ctx) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    }));
  }
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  const ipHash = cfg.owner_ip_hashes.length && ip ? await _sha256Hex(ip) : "";
  const excludeReason = _shouldExclude({ ip, ua, ipHash }, cfg);
  if (excludeReason) {
    return _cors(new Response(JSON.stringify({ ok: true, excluded: true, reason: excludeReason }), {
      status: 202,
      headers: { "Content-Type": "application/json" }
    }));
  }
  const event = String(body && body.event || "").slice(0, 40);
  const value = Number(body && body.value) || 0;
  const route = String(body && body.route || "").slice(0, 140);
  const ts = Number(body && body.ts) || Date.now();
  try {
    console.log(JSON.stringify({ telemetry: true, event, value, route, ts }));
  } catch (_) {
  }
  if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
    ctx.waitUntil((async () => {
      try {
        env.VOY_METRICS.writeDataPoint({
          indexes: ["telemetry"],
          blobs: [event, route],
          doubles: [value, ts]
        });
      } catch (_) {
      }
    })());
  }
  return _cors(new Response(JSON.stringify({ ok: true }), { status: 202, headers: { "Content-Type": "application/json" } }));
}
__name(_handleTelemetry, "_handleTelemetry");
function _cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  resp.headers.set("Access-Control-Allow-Headers", "Content-Type");
  resp.headers.delete("x-powered-by");
  return resp;
}
__name(_cors, "_cors");
function _cleanHeaders(resp) {
  try {
    resp.headers.delete("x-powered-by");
    resp.headers.delete("server");
  } catch (_) {
  }
  return resp;
}
__name(_cleanHeaders, "_cleanHeaders");
function _htmlNoStore(resp, request) {
  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("Vary", "Accept-Encoding");
  headers.set("X-VOY-Version", WORKER_VERSION);
  headers.set("X-VOY-Build", BUILD_HASH);
  headers.delete("x-powered-by");
  headers.delete("server");
  const { sid, isNew } = _getOrCreateSessionId(request);
  if (isNew) {
    headers.append("Set-Cookie", `voy_sid=${sid}; Max-Age=2592000; SameSite=Lax; Path=/`);
  }
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers
  });
}
__name(_htmlNoStore, "_htmlNoStore");

// ../home/jules/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../home/jules/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-pL5NRU/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// ../home/jules/.npm/_npx/32026684e21afda6/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-pL5NRU/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker2) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker2;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker2.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker2.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker2,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker2.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker2.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  NominatimCoordinator,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
