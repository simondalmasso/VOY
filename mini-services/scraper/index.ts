/**
 * ============================================================================
 *  voy-scraper — Legal-only, non-intrusive taxi/remis directory scraper.
 * ============================================================================
 *
 *  LEGAL-ONLY POLICY (HARD CONSTRAINT — DO NOT REMOVE)
 *  ---------------------------------------------------
 *  This service MUST only collect publicly-published provider information
 *  from sources that have been cleared by legal review:
 *
 *    - public municipal websites
 *    - official WhatsApp catalogs (public link references only)
 *    - published phone directories
 *
 *  It MUST NOT:
 *    - bypass authentication, paywalls, captchas, or anti-bot protections
 *      (no_auth_bypass: true, no_bypass: true)
 *    - send credentials, cookies, Authorization headers, or any session token
 *    - use headless browsers, JS rendering, or DOM emulation
 *    - impersonate a logged-in user
 *    - poll faster than 1 request / second per host
 *    - ignore robots.txt intent
 *
 *  Strategy: non-intrusive HTTP polling with a polite User-Agent and plain
 *  GET requests only.
 *
 *  Skeleton mode (current): runScrapeCycle() does NOT perform any outbound
 *  HTTP request. It normalizes SEED_PROVIDERS from sources.ts and writes the
 *  result to data/taxis.json + data/remises.json. Real fetching against any
 *  URL in SOURCE_REGISTRY is gated behind `enabled: true` AND legal sign-off
 *  (see README.md). Until then, politeFetch() is available as a ready-to-use
 *  helper that enforces every constraint above, but it is intentionally not
 *  invoked against real URLs.
 *
 *  Frequency: 24h (see runScrapeCycle doc). The skeleton does not auto-schedule;
 *  operators should trigger `POST /api/scrape` from a cron job once a day.
 * ============================================================================
 */

import { SOURCE_REGISTRY, SEED_PROVIDERS, getEnabledSources, type RawProviderRecord } from "./sources.ts";
import { normalizeBatch, type Provider } from "./normalizer.ts";
import { readRemises, readTaxis, writeProviders } from "./store.ts";

// Hardcoded per spec — NOT env-driven.
const PORT = 3007;

const POLITE_UA = "voy-scraper/0.1 (+https://voy.is-a.dev; legal-only; non-intrusive; contact: ops@voy.is-a.dev)";
const SAME_HOST_DELAY_MS = 1500; // 1.5s between requests to the same host
const lastRequestByHost = new Map<string, number>();

/**
 * Polite, legal-only HTTP GET helper.
 *
 * Enforces the no-bypass / no-auth-bypass policy at the request layer:
 *   - GET method only
 *   - No Cookie header, no Authorization header, no credentials sent
 *   - No proxying, no JS rendering, no headless browser
 *   - Single polite User-Agent identifying the bot + contact
 *   - At least SAME_HOST_DELAY_MS between successive requests to the same host
 *   - Honors `Disallow` in robots.txt at the intent level (operator must
 *     pre-clear each URL — see README.md "How to add a real source")
 *
 * Returns the response text on 2xx, throws on non-2xx.
 *
 * NOTE: In skeleton mode this function is exported and ready, but is NOT
 * called against any real URL. It exists so that when legal clearance lands,
 * the fetcher can be wired up without touching the policy layer.
 */
export async function politeFetch(url: string, opts: { signal?: AbortSignal } = {}): Promise<{ status: number; text: string; url: string }> {
  const u = new URL(url);

  // Host-level rate limiting (1.5s between same-host requests).
  const now = Date.now();
  const last = lastRequestByHost.get(u.host) ?? 0;
  const elapsed = now - last;
  if (elapsed < SAME_HOST_DELAY_MS) {
    const wait = SAME_HOST_DELAY_MS - elapsed;
    await new Promise((r) => setTimeout(r, wait));
  }
  lastRequestByHost.set(u.host, Date.now());

  // Enforce no-auth-bypass at the headers layer: explicitly strip any auth
  // surface. Even if a future caller passes a headers object, we override.
  const headers: Record<string, string> = {
    "User-Agent": POLITE_UA,
    "Accept": "application/json, text/html;q=0.9, */*;q=0.5",
    "Accept-Language": "es-AR,es;q=0.9,en;q=0.5",
    // Explicitly empty — never send cookies or auth tokens.
    "Cookie": "",
    "Authorization": "",
  };

  const res = await fetch(url, {
    method: "GET",
    headers,
    redirect: "follow",
    // Never send credentials.
    credentials: "omit",
    signal: opts.signal,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`politeFetch ${url} → HTTP ${res.status}`);
  }
  return { status: res.status, text, url };
}

function ts(): string {
  return new Date().toISOString();
}

function logCycle(msg: string): void {
  // Each cycle logs to console with an ISO timestamp prefix.
  console.log(`[${ts()}] [scrape] ${msg}`);
}

/**
 * Run a single scrape cycle.
 *
 * NON-INTRUSIVE:
 *   - Uses seed data only in skeleton mode (no outbound HTTP).
 *   - When legal clearance is granted for a source, the operator sets
 *     `enabled: true` in SOURCE_REGISTRY and adds a per-source adapter that
 *     calls politeFetch() — that adapter is the ONLY place real fetching
 *     happens, and it inherits every legal-only constraint from politeFetch().
 *
 * Idempotent: re-running with the same seed produces the same normalized
 * output (modulo updated_at timestamps).
 *
 * @returns counts of written taxis and remises
 */
export async function runScrapeCycle(): Promise<{ taxis: number; remises: number; source: string }> {
  logCycle("cycle start");

  // 1) In skeleton mode, no source is enabled. We use seed data.
  const enabled = getEnabledSources();
  let raws: RawProviderRecord[];
  let sourceTag: string;

  if (enabled.length === 0) {
    logCycle(`no enabled sources (${SOURCE_REGISTRY.length} descriptors, all disabled) — using seed data`);
    raws = SEED_PROVIDERS;
    sourceTag = "seed";
  } else {
    // FUTURE: per-source adapters live here. They MUST use politeFetch().
    // Until each adapter is implemented + legally cleared, we fall back to
    // seed data even if a source is marked enabled, to avoid silent
    // half-fetching.
    logCycle(`WARNING: ${enabled.length} source(s) enabled but no adapter implemented yet — using seed data`);
    raws = SEED_PROVIDERS;
    sourceTag = "seed";
  }

  // 2) Normalize raw records into the output schema.
  const now = new Date();
  const { taxis, remises } = normalizeBatch(raws, now);
  logCycle(`normalized: taxis=${taxis.length} remises=${remises.length}`);

  // 3) Persist to data/taxis.json + data/remises.json.
  await writeProviders(taxis, remises);
  logCycle(`wrote data/taxis.json (${taxis.length}) + data/remises.json (${remises.length})`);

  logCycle("cycle end");
  return { taxis: taxis.length, remises: remises.length, source: sourceTag };
}

/**
 * Boot-time: ensure the data files exist. If missing, run one seed cycle so
 * /api/taxis and /api/remises return a non-empty payload on first start.
 */
async function ensureSeedData(): Promise<void> {
  const [taxis, remises] = await Promise.all([readTaxis(), readRemises()]);
  if (taxis.length === 0 && remises.length === 0) {
    logCycle("boot: no data files found — seeding from SEED_PROVIDERS");
    await runScrapeCycle();
  } else {
    logCycle(`boot: existing data loaded (taxis=${taxis.length}, remises=${remises.length})`);
  }
}

/** JSON response helper. */
function json(res: Response | undefined, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { pathname } = url;
  const method = req.method.toUpperCase();

  // GET /health
  if (pathname === "/health" && method === "GET") {
    return json(undefined, { ok: true, service: "voy-scraper", port: PORT });
  }

  // GET /api/taxis
  if (pathname === "/api/taxis" && method === "GET") {
    const taxis: Provider[] = await readTaxis();
    return json(undefined, taxis);
  }

  // GET /api/remises
  if (pathname === "/api/remises" && method === "GET") {
    const remises: Provider[] = await readRemises();
    return json(undefined, remises);
  }

  // POST /api/scrape
  if (pathname === "/api/scrape" && method === "POST") {
    const result = await runScrapeCycle();
    return json(undefined, {
      ok: true,
      scraped: { taxis: result.taxis, remises: result.remises },
      source: result.source,
    });
  }

  // 404
  return json(undefined, { error: "not_found", path: pathname }, 404);
}

// --- Boot --------------------------------------------------------------------

const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`[${ts()}] [boot] voy-scraper listening on http://localhost:${server.port}`);
console.log(`[${ts()}] [boot] legal_only=true | no_bypass=true | no_auth_bypass=true`);
console.log(`[${ts()}] [boot] endpoints: GET /health, GET /api/taxis, GET /api/remises, POST /api/scrape`);

// Ensure seed data exists on boot (writes data/*.json if missing).
await ensureSeedData();

// NOTE: 24h frequency is the operator's responsibility (cron → POST /api/scrape).
// This skeleton does not auto-schedule, to keep the process simple + inspectable.
