import { NextRequest, NextResponse } from 'next/server';
import { NAME_NORMALIZE, V2_EVENTS, ingest, type NormalizedEvent } from '@/lib/voy-analytics-store';

/**
 * VOY Analytics — /api/events (DEV MIRROR of worker.js _handleEvents)
 * ------------------------------------------------------------
 * Mirrors the Cloudflare Worker logic so the Next.js dev server can ingest
 * events locally. In production, this route is NEVER hit — the Worker
 * (worker.js) handles /api/events at the edge before Next.js runs.
 *
 * V7.7 VOY_ANALYTICS_V2:
 *   - 5 exclusion filters (owner_ip, developer_ip, localhost, headless, bot)
 *   - name normalization → 6 V2 canonical events
 *   - dual store: (1) Analytics Engine [prod only], (2) aggregate store [here: in-memory]
 *
 * Dev test hooks (NOT in worker.js — dev only):
 *   X-VOY-Dev-Bypass-Filters: true   → skip all 5 filters (happy-path testing)
 *   X-VOY-Test-IP: <ip>              → override the client IP for filter testing
 *   X-VOY-Test-UA: <ua>              → override the User-Agent for filter testing
 */

export const runtime = 'nodejs';

const BOT_UA = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|sogou|exabot|facebot|facebookexternalhit|ia_archiver|applebot|twitterbot|linkedinbot|semrushbot|ahrefsbot|mj12bot|dotbot|petalbot/i;
const HEADLESS_UA = /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|chrome-lighthouse|w3c_validator|nightmare|crawly|crawler/i;

function loadFilterConfig() {
  const list = (v?: string) => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : []);
  return {
    owner_ips: list(process.env.VOY_OWNER_IPS),
    dev_ips: list(process.env.VOY_DEV_IPS),
    exclude_localhost: process.env.VOY_EXCLUDE_LOCALHOST !== 'false',
    exclude_headless: process.env.VOY_EXCLUDE_HEADLESS !== 'false',
    exclude_bot: process.env.VOY_EXCLUDE_BOT !== 'false',
  };
}

function shouldExclude(ip: string, ua: string, cfg: ReturnType<typeof loadFilterConfig>): string | null {
  if (cfg.exclude_localhost && (ip === '127.0.0.1' || ip === '::1' || ip === '')) return 'localhost';
  if (cfg.owner_ips.length && cfg.owner_ips.indexOf(ip) > -1) return 'owner_ip';
  if (cfg.dev_ips.length && cfg.dev_ips.indexOf(ip) > -1) return 'developer_ip';
  if (cfg.exclude_headless && HEADLESS_UA.test(ua)) return 'headless';
  if (cfg.exclude_bot && BOT_UA.test(ua)) return 'bot';
  return null;
}

function cors(resp: NextResponse) {
  resp.headers.set('Access-Control-Allow-Origin', '*');
  resp.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  resp.headers.set('Access-Control-Allow-Headers', 'Content-Type, X-VOY-Dev-Bypass-Filters, X-VOY-Test-IP, X-VOY-Test-UA');
  return resp;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return cors(NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }));
  }

  const events = body && Array.isArray(body.events) ? body.events : null;
  if (!events) {
    return cors(NextResponse.json({ ok: false, error: 'no_events' }, { status: 400 }));
  }

  // --- 5 exclusion filters ---
  const bypass = request.headers.get('x-voy-dev-bypass-filters') === 'true';
  const cfg = loadFilterConfig();
  const ip = (request.headers.get('x-voy-test-ip') || request.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ua = request.headers.get('x-voy-test-ua') || request.headers.get('user-agent') || '';
  const reason = bypass ? null : shouldExclude(ip, ua, cfg);
  if (reason) {
    return cors(NextResponse.json({
      ok: true, received: events.length, written: 0, excluded: events.length, reason,
    }, { status: 202 }));
  }

  // --- name normalization → 6 V2 canonical events ---
  const normalized: NormalizedEvent[] = [];
  for (const e of events) {
    const canonical = NAME_NORMALIZE[e.name];
    if (!canonical) continue;
    normalized.push({
      name: canonical,
      anon_id: String(e.anon_id || '').slice(0, 64),
      ts: Number(e.ts) || Date.now(),
      geo: String(e.geo || '').slice(0, 60),
      data: e.data || {},
    });
  }
  if (!normalized.length) {
    return cors(NextResponse.json({
      ok: true, received: events.length, written: 0, note: 'no_canonical_events', v2_events: V2_EVENTS,
    }, { status: 202 }));
  }

  // --- dual store: dev mirror writes only to the in-memory aggregate store.
  //     (Analytics Engine is prod-only; in dev we emulate both via the singleton.)
  const aggWritten = ingest(normalized);

  return cors(NextResponse.json({
    ok: true,
    received: events.length,
    normalized: normalized.length,
    written: aggWritten,
    stores: { analytics_engine: 0, durable_object: aggWritten, dev_mirror: true },
  }, { status: 202 }));
}

// dev-only: GET /api/events → raw event log (capped) for inspection
export async function GET() {
  const { rawLog } = await import('@/lib/voy-analytics-store');
  return cors(NextResponse.json({ ok: true, events: rawLog(), v2_canonical: V2_EVENTS }));
}
