// V7.7 PERFORMANCE_AUDIT_AND_TELEMETRY — dev mirror of the Cloudflare Worker /api/telemetry route.
// Accepts Beacon API payloads {event, value, route, ts} from VoyHealthMonitor (LCP + JS errors +
// unhandled promise rejections). Fire-and-forget: logs to server console + returns 202.
// In production the Cloudflare Worker (worker.js → _handleTelemetry) handles this endpoint instead.
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  const b = (body || {}) as { event?: string; value?: number; route?: string; ts?: number };
  const event = String(b.event || '').slice(0, 40);
  const value = Number(b.value) || 0;
  const route = String(b.route || '').slice(0, 140);
  const ts = Number(b.ts) || Date.now();

  // Fire-and-forget log (visible in dev server console / dev.log).
  console.log(JSON.stringify({ telemetry: true, event, value, route, ts }));

  return NextResponse.json({ ok: true }, { status: 202 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
