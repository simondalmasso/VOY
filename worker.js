// ============================================================
//  VOY — Cloudflare Worker (FINAL DEPLOY ARCHITECTURE + Analytics)
//
//  Canonical origin:  https://voy.is-a.dev
//  Worker name:       voy-core
//  Strategy:          cloudflare_worker_static_assets + /api/events endpoint
//  Internal entry:    /VOY-Lite.html  (rewritten from /, never user-facing)
//
//  Rules (evaluated in order):
//   1. /VOY-Lite.html  → 301 → https://voy.is-a.dev/   (hide internal path)
//   2. *.workers.dev / *simondalmasso* hosts → 301 → https://voy.is-a.dev{path}{search}
//      (CNAME'd traffic keeps Host = voy.is-a.dev → served by rules 3/4, never redirected)
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

const CANONICAL_ORIGIN = "https://voy.is-a.dev";
const WORKER_VERSION = "V7.0.0";
// __BUILD_HASH__ is replaced by CI at deploy time (scripts/inject-build-hash.mjs).
// verify-production.sh checks /api/health.build_hash === git short SHA.
const BUILD_HASH = "__BUILD_HASH__";

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const pathLower = url.pathname.toLowerCase();

    // 1) Hide internal entry path on ANY host → canonical root (single hop).
    if (pathLower === "/voy-lite.html" || pathLower === "/voy-lite") {
      return Response.redirect(CANONICAL_ORIGIN + "/", 301);
    }

    // 2) Redirect edge: workers.dev hosts + legacy simondalmasso host → canonical.
    //    Preserves deep-link path + query so bookmarked URLs keep working.
    //    CNAME'd requests (Host = voy.is-a.dev) do NOT match → served below.
    if (host.endsWith(".workers.dev") || host.includes("simondalmasso")) {
      const target = CANONICAL_ORIGIN + url.pathname + url.search;
      return Response.redirect(target, 301);
    }

    // 3) Analytics ingestion endpoint (event_spec v1.4 transport: cloudflare).
    if (pathLower === "/api/events" && request.method === "POST") {
      return _handleEvents(request, env);
    }
    if (pathLower === "/api/events" && request.method === "OPTIONS") {
      return _cors(new Response(null, { status: 204 }));
    }
    if (pathLower === "/api/health") {
      return _cors(new Response(JSON.stringify({
        ok: true, service: "voy-core", version: WORKER_VERSION, build_hash: BUILD_HASH,
        analytics: !!(env.VOY_METRICS), time: new Date().toISOString()
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

// ---------------- Analytics handler ----------------
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

  // Analytics Engine write (best-effort). If VOY_METRICS binding is missing
  // (e.g. local preview, dry-run), we still acknowledge so the client never blocks.
  let written = 0;
  try {
    if (env.VOY_METRICS && typeof env.VOY_METRICS.writeDataPoint === "function") {
      for (const e of events) {
        // Data point schema (blobs < 512B each, doubles = numbers, indexes = low-cardinality):
        //   index1: event name (low cardinality)
        //   blob1:  anon_id (coarse)
        //   blob2:  geo cluster (coarse, client-supplied)
        //   double1: session_age_ms
        //   double2: estimated_fare (if present)
        //   double3: route_distance_km (if present)
        env.VOY_METRICS.writeDataPoint({
          index1: String(e.name || 'unknown').slice(0, 100),
          blob1: String(e.anon_id || '').slice(0, 100),
          blob2: String(e.geo || '').slice(0, 100),
          doubles: [
            Number(e.session_age_ms) || 0,
            Number(e.data && e.data.estimated_fare) || 0,
            Number(e.data && e.data.route_distance) || 0
          ]
        });
        written++;
      }
    }
  } catch (e) {
    // Analytics failure must NEVER break the app. Acknowledge and move on.
    return _cors(new Response(JSON.stringify({ ok: true, written: 0, note: "analytics_unavailable" }), {
      status: 202, headers: { "Content-Type": "application/json" }
    }));
  }

  return _cors(new Response(JSON.stringify({ ok: true, received: events.length, written: written }), {
    status: 202, headers: { "Content-Type": "application/json" }
  }));
}

function _cors(resp) {
  resp.headers.set("Access-Control-Allow-Origin", "*");
  resp.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
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
