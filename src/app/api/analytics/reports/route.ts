/**
 * VOY Analytics Reports Endpoint — Dev mirror (VOY_ANALYTICS_V2)
 *
 * Returns live aggregates: daily_users, provider_usage, searches, cities, retention.
 * In production, the Cloudflare Worker handles GET /api/analytics/reports.
 */

import { NextResponse } from 'next/server';
import { buildReports } from '@/lib/analytics-store';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function GET() {
  const reports = buildReports();
  return NextResponse.json(
    {
      ok: true,
      version: 'V7.6.0-dev',
      store: 'in_memory',
      reports,
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
