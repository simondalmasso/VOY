import { NextRequest, NextResponse } from 'next/server';
import { report, V2_EVENTS } from '@/lib/voy-analytics-store';

/**
 * VOY Analytics — /api/reports (DEV MIRROR of worker.js _handleReports)
 * ------------------------------------------------------------
 * Serves the 5 V2 reports from the in-memory aggregate store (dev mirror of
 * the Durable Object). In production the Worker handles this at the edge.
 *
 * Reports: daily_users, provider_usage, searches, cities, retention
 *   GET /api/reports                    → summary (all 5 reports)
 *   GET /api/reports?type=daily_users   → single report
 *   GET /api/reports?type=searches&days=7 → last 7 days
 */

export const runtime = 'nodejs';

function cors(resp: NextResponse) {
  resp.headers.set('Access-Control-Allow-Origin', '*');
  resp.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  resp.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return resp;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get('type') || 'summary';
  const daysParam = request.nextUrl.searchParams.get('days') || '30';
  const days = Math.min(parseInt(daysParam, 10) || 30, 90);

  const valid = ['summary', 'daily_users', 'provider_usage', 'searches', 'cities', 'retention'];
  if (!valid.includes(type)) {
    return cors(NextResponse.json({
      ok: false, error: 'invalid_type', valid_types: valid,
    }, { status: 400 }));
  }

  const result = report(type, days);
  return cors(NextResponse.json({
    ok: true, type, days, result, v2_canonical: V2_EVENTS, dev_mirror: true,
  }));
}
