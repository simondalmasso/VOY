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
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env, ctx);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
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
