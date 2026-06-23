// ============================================================
//  VOY — Cloudflare Worker (FINAL DEPLOY ARCHITECTURE + Analytics)
//
//  Canonical origin:  https://voy.is-a.dev  (NOT YET LIVE — is-a.dev PR pending)
//  Worker name:       voy-app  (updates the EXISTING production worker)
//  Strategy:          cloudflare_worker_static_assets + /api/events endpoint
//  Internal entry:    /VOY-Lite.html  (rewritten from /, never user-facing)
//
//  Rules (evaluated in order):
//   1. /VOY-Lite.html  → 301 → /  (same-host relative redirect; hides internal path)
//   2. CANONICAL REDIRECT DISABLED until voy.is-a.dev is registered.
//      Re-enable rule 2 (workers.dev → voy.is-a.dev) after the is-a.dev PR merges
//      and DNS propagates. See DEPLOY_V7.md Step E + scripts/prepare-isadev-pr.mjs.
//   3. /api/events  → POST → Analytics Engine (VOY_METRICS) + 202 (fire-and-forget)
//   4. /  → internal rewrite → /VOY-Lite.html  (browser URL stays /)
//   5. everything else → ASSETS binding (core/, ui/, icons/, manifest.json, logo.svg, …)
//
//  Header cleanup (best-effort):
//   - x-powered-by: deleted from the worker response.
//   - server / cf-ray: injected by the Cloudflare edge AFTER the worker returns
//     and CANNOT be removed from a Worker (documented platform limitation).
//
//  Analytics (event_spec v1.4 + cloudflare_analytics_engine):
//   - Receives { events: [{name,data,anon_id,ts,geo}] } from the frontend eventBus.
//   - Writes one Analytics Engine data point per event into the VOY_METRICS dataset.
//   - Privacy: anon_id only (no PII), coarse geo cluster, no raw IP stored
//     (CF Analytics Engine hashes/derives geo at the edge; we never log cf-ipcountry
//     as a stored field — only the coarse client-supplied cluster).
//   - If the VOY_METRICS binding is absent (e.g. local dry-run), events are still
//     acknowledged with 202 so the frontend never blocks on analytics.
// ============================================================

const CANONICAL_ORIGIN = "https://voy.is-a.dev"; // disabled until is-a.dev is live
const WORKER_VERSION = "V7.7.0"; // V7.7 = VOY_ANALYTICS_V2 (6 canonical events + 5 exclusion filters + dual store [Analytics Engine + Durable Object] + /api/reports with 5 reports). Frontend eventBus allow-list expanded; worker normalizes legacy v1.4 names → V2 names. MobilityEngine/PricingEngine/MobilityController untouched.
// __BUILD_HASH__ is replaced by CI at deploy time (scripts/inject-build-hash.mjs).
// verify-production.sh checks /api/health.build_hash === git short SHA.
const BUILD_HASH = "__BUILD_HASH__";

// VOY_ANALYTICS_V2 — 6 canonical event names. Legacy v1.4 names normalize to these.
const V2_EVENTS = ['search', 'provider_click', 'route_selected', 'voice_search', 'share', 'navigation_start'];
const NAME_NORMALIZE = {
  // v1.4 → V2
  search_performed: 'search',
  provider_clicked: 'provider_click',
  destination_selected: 'route_selected',
  // v5 legacy → V2
  share_app: 'share',
  // already-canonical pass-through
  search: 'search', provider_click: 'provider_click', route_selected: 'route_selected',
  voice_search: 'voice_search', share: 'share', navigation_start: 'navigation_start'
};

// VOY_ANALYTICS_V2 — 5 exclusion filters. Each is configurable via env so the
// owner can tune without redeploying logic. Unknown/non-V2 events are dropped
// (they still get acknowledged with 202 so the client never blocks).
function _loadFilterConfig(env) {
  const list = (v) => (v ? String(v).split(',').map(s => s.trim()).filter(Boolean) : []);
  return {
    owner_ips: list(env.VOY_OWNER_IPS),       // exclude_owner_ip
    dev_ips: list(env.VOY_DEV_IPS),           // exclude_developer_ip
    exclude_localhost: env.VOY_EXCLUDE_LOCALHOST !== 'false', // default true
    exclude_headless: env.VOY_EXCLUDE_HEADLESS !== 'false',   // default true
    exclude_bot: env.VOY_EXCLUDE_BOT !== 'false'              // default true
  };
}

const BOT_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
const HEADLESS_UA = /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|chrome-lighthouse|w3c_validator|nightmare|crawly|crawler/i;

function _shouldExclude(ctx, cfg) {
  // 1. exclude_localhost
  if (cfg.exclude_localhost && (ctx.ip === '127.0.0.1' || ctx.ip === '::1' || ctx.ip === '')) return 'localhost';
  // 2. exclude_owner_ip
  if (cfg.owner_ips.length && cfg.owner_ips.indexOf(ctx.ip) > -1) return 'owner_ip';
  // 3. exclude_developer_ip
  if (cfg.dev_ips.length && cfg.dev_ips.indexOf(ctx.ip) > -1) return 'developer_ip';
  // 4. exclude_headless
  if (cfg.exclude_headless && HEADLESS_UA.test(ctx.ua)) return 'headless';
  // 5. exclude_bot
  if (cfg.exclude_bot && BOT_UA.test(ctx.ua)) return 'bot';
  return null;
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const pathLower = url.pathname.toLowerCase();

    // 1) Hide internal entry path → same-host root (relative 301).
    //    V7.1: was CANONICAL_ORIGIN + "/"; now relative so it works on any host
    //    (workers.dev OR voy.is-a.dev once live). Bookmark cleanup, not domain hop.
    if (pathLower === "/voy-lite.html" || pathLower === "/voy-lite") {
      return Response.redirect("/", 301);
    }

    // 2) CANONICAL REDIRECT — DISABLED.
    //    Was: workers.dev / simondalmasso hosts → 301 → voy.is-a.dev.
    //    Reason: voy.is-a.dev is NOT registered yet (is-a.dev PR not merged).
    //    Deploying the redirect would break voy-app.simondalmasso44.workers.dev.
    //    Re-enable this block AFTER scripts/prepare-isadev-pr.mjs completes + DNS.
    // if (host.endsWith(".workers.dev") || host.includes("simondalmasso")) {
    //   const target = CANONICAL_ORIGIN + url.pathname + url.search;
    //   return Response.redirect(target, 301);
    // }

    // 3) Analytics ingestion endpoint (event_spec v1.4 transport: cloudflare).
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    // VOY_ANALYTICS_V2 — /api/reports: 5 reports from the Durable Object aggregate store.
    if (pathLower === "/api/reports" && request.method === "GET") {
      return _handleReports(request, env);
    }
    if (pathLower === "/api/reports" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    if (pathLower === "/api/health") {
      return _cors(new Response(JSON.stringify({
        ok: true, service: "voy-app", version: WORKER_VERSION, build_hash: BUILD_HASH,
        analytics: !!(env.VOY_METRICS), aggregate: !!(env.VOY_AGG), time: new Date().toISOString()
      }), { headers: { "Content-Type": "application/json" } }));
    }

    // 4) Root → internal rewrite to VOY-Lite.html (browser URL stays /).
    //    V7: Cache-Control: no-store on HTML ONLY so the edge never serves a
    //    stale UI build. Static assets (JS/CSS/icons) keep their own cache
    //    headers + are cache-busted via ?v=9 query strings.
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/VOY-Lite.html";
      const resp = await env.ASSETS.fetch(new Request(url, request));
      return _htmlNoStore(resp);
    }

    // 5) All other paths → static assets (with header cleanup).
    const resp = await env.ASSETS.fetch(request);
    return _cleanHeaders(resp);
  }
};

export default worker;
export { VoyAnalytics } from './analytics-do.js';

// ---------------- Analytics handler (V7.7 VOY_ANALYTICS_V2) ----------------
// 5 exclusion filters + name normalization → 6 V2 canonical events + dual store
// (Analytics Engine raw data points + Durable Object hot aggregates).
async function _handleEvents(request, env) {
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

  // --- 5 exclusion filters (owner_ip, developer_ip, localhost, headless, bot) ---
  const cfg = _loadFilterConfig(env);
  const ip = (request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "";
  const excludeReason = _shouldExclude({ ip, ua }, cfg);
  if (excludeReason) {
    // Excluded traffic is acknowledged (202) so the client never blocks, but
    // nothing is written to either store. excluded_count is returned for observability.
    return _cors(new Response(JSON.stringify({
      ok: true, received: events.length, written: 0, excluded: events.length, reason: excludeReason
    }), { status: 202, headers: { "Content-Type": "application/json" } }));
  }

  // --- name normalization: legacy v1.4 / v5 names → 6 V2 canonical names ---
  const normalized = [];
  for (const e of events) {
    const canonical = NAME_NORMALIZE[e.name];
    if (!canonical) continue; // drop non-V2 events (spec compliance)
    normalized.push({
      name: canonical,
      anon_id: String(e.anon_id || "").slice(0, 64),
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

  // --- dual store ---
  // Store 1: Analytics Engine (raw data points, long-term, SQL-queryable).
  let aeWritten = 0;
  try {
    if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
      for (const e of normalized) {
        env.VOY_METRICS.writeDataPoint({
          index1: e.name,
          blob1: e.anon_id,
          blob2: e.geo,
          doubles: [
            Number(e.data && e.data.session_age_ms) || 0,
            Number(e.data && e.data.estimated_fare) || 0,
            Number(e.data && e.data.route_distance) || 0
          ]
        });
        aeWritten++;
      }
    }
  } catch (e) {
    // Analytics Engine failure must NEVER break the app.
  }

  // Store 2: Durable Object (hot aggregates for /api/reports).
  let aggWritten = 0;
  try {
    if (env.VOY_AGG) {
      const id = env.VOY_AGG.idFromName("voy-analytics-singleton");
      const stub = env.VOY_AGG.get(id);
      const r = await stub.fetch(new Request("https://do/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: normalized })
      }));
      if (r.ok) {
        const j = await r.json();
        aggWritten = (j && j.ingested) || 0;
      }
    }
  } catch (e) {
    // DO failure must NEVER break the app.
  }

  return _cors(new Response(JSON.stringify({
    ok: true, received: events.length, normalized: normalized.length,
    written: Math.max(aeWritten, aggWritten),
    stores: { analytics_engine: aeWritten, durable_object: aggWritten }
  }), { status: 202, headers: { "Content-Type": "application/json" } }));
}

// ---------------- Reports handler (V7.7 VOY_ANALYTICS_V2) ----------------
// 5 reports: daily_users, provider_usage, searches, cities, retention.
// Reads from the Durable Object aggregate store (instant; no SQL API hit).
async function _handleReports(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "summary";
  const days = url.searchParams.get("days") || "30";
  if (!env.VOY_AGG) {
    return _cors(new Response(JSON.stringify({
      ok: false, error: "aggregate_store_unavailable",
      note: "VOY_AGG Durable Object binding not configured. See wrangler.jsonc."
    }), { status: 503, headers: { "Content-Type": "application/json" } }));
  }
  try {
    const id = env.VOY_AGG.idFromName("voy-analytics-singleton");
    const stub = env.VOY_AGG.get(id);
    const r = await stub.fetch(new Request("https://do/report?type=" + encodeURIComponent(type) + "&days=" + encodeURIComponent(days)));
    const body = await r.text();
    return _cors(new Response(body, { status: r.status, headers: { "Content-Type": "application/json" } }));
  } catch (e) {
    return _cors(new Response(JSON.stringify({ ok: false, error: "report_failed", detail: String(e && e.message || e) }), {
      status: 500, headers: { "Content-Type": "application/json" }
    }));
  }
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
    // Best-effort: the edge re-adds its own `server` after the worker returns.
    resp.headers.delete("server");
  } catch (_) {}
  return resp;
}

// V7: HTML responses get Cache-Control: no-store so the edge NEVER serves a
// stale UI build. This is the core fix for the "local ≠ edge" desync: even if
// CF cache has a HIT for the HTML, no-store forces revalidation on every request.
// We rebuild the Response with a fresh mutable Headers object (ASSETS responses
// may have immutable headers).
function _htmlNoStore(resp) {
  const headers = new Headers(resp.headers);
  headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  headers.set("Vary", "Accept-Encoding");
  headers.set("X-VOY-Version", WORKER_VERSION);
  headers.set("X-VOY-Build", BUILD_HASH);
  headers.delete("x-powered-by");
  headers.delete("server");
  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: headers
  });
}
