// ============================================================
//  VOY — Cloudflare Worker (FINAL DEPLOY ARCHITECTURE)
//
//  Canonical origin:  https://voy.is-a.dev
//  Strategy:          cloudflare_worker_static_assets
//  Internal entry:    /VOY-Lite.html  (rewritten from /, never user-facing)
//
//  Rules (evaluated in order):
//   1. /VOY-Lite.html  → 301 → https://voy.is-a.dev/   (hide internal path)
//   2. *.workers.dev / *simondalmasso* hosts → 301 → https://voy.is-a.dev{path}{search}
//      (CNAME'd traffic keeps Host = voy.is-a.dev → served by rules 3/4, never redirected)
//   3. /  → internal rewrite → /VOY-Lite.html  (browser URL stays /)
//   4. everything else → ASSETS binding (core/, ui/, logo.svg, robots.txt, …)
//
//  Header cleanup (best-effort):
//   - x-powered-by: deleted from the worker response.
//   - server / cf-ray: INJECTED by the Cloudflare edge AFTER the worker returns
//     and CANNOT be removed from a Worker (would require Enterprise / custom edge
//     config). They are stripped here for intent; the edge re-adds its own.
//
//  Directory listing: Workers Assets never lists directories. not_found_handling
//  is set to "none" so unknown paths return a plain 404 (no SPA fallback, no
//  directory enumeration).
// ============================================================

const CANONICAL_ORIGIN = "https://voy.is-a.dev";

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

    // 3) Root → internal rewrite to VOY-Lite.html (browser URL stays /).
    if (url.pathname === "/" || url.pathname === "") {
      url.pathname = "/VOY-Lite.html";
      const resp = await env.ASSETS.fetch(new Request(url, request));
      return _cleanHeaders(resp);
    }

    // 4) All other paths → static assets (with header cleanup).
    const resp = await env.ASSETS.fetch(request);
    return _cleanHeaders(resp);
  }
};

export default worker;

function _cleanHeaders(resp) {
  try {
    resp.headers.delete("x-powered-by");
    // Best-effort: the edge re-adds its own `server` after the worker returns.
    resp.headers.delete("server");
  } catch (_) {}
  return resp;
}
