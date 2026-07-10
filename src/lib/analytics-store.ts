/**
 * VOY Analytics Store — In-memory aggregator + filters (VOY_ANALYTICS_V2)
 *
 * Mirrors the worker.js logic for local dev testing. In production, the
 * Cloudflare Worker handles /api/events and /api/analytics/reports directly.
 * This module is the dev-time equivalent so the frontend can test the full
 * event → filter → aggregate → report flow on localhost.
 *
 * Filters (defense-in-depth — client-side eventBus.js is the first line):
 *   exclude_owner_ip, exclude_developer_ip, exclude_localhost,
 *   exclude_headless, exclude_bot
 *
 * Store: in-memory (resets on server restart). Production uses Cloudflare
 * Analytics Engine for durable storage + this in-memory aggregator for
 * real-time dashboard feedback.
 */

// ---- Types ----
export interface VoyEvent {
  v?: string;
  name: string;
  data?: Record<string, unknown>;
  anon_id?: string;
  ts?: number;
  session_age_ms?: number;
  geo?: string;
}

export interface FilterResult {
  filtered: boolean;
  reason: string | null;
}

// ---- Filters ----
function parseIpList(str: string | undefined | null): Set<string> {
  if (!str) return new Set();
  return new Set(
    String(str)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function isLocalhostIP(ip: string): boolean {
  if (!ip) return false;
  const i = ip.toLowerCase().trim();
  return i === '127.0.0.1' || i === '::1' || i === '0.0.0.0' || i === 'localhost';
}

function isHeadlessUA(ua: string): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return /headlesschrome|phantomjs|slimerjs|puppeteer|playwright|webdriver|selenium|electron|awesomium/i.test(u);
}

function isBotUA(ua: string): boolean {
  if (!ua) return false;
  const u = ua.toLowerCase();
  return /bot|crawl|spider|scraper|slurp|baiduspider|yandexbot|googlebot|bingbot|duckduckbot|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|applebot|semrush|ahrefs|mj12bot|dotbot|petalbot/i.test(u);
}

export function checkFilters(
  ip: string,
  ua: string,
  ownerIps?: string,
  devIps?: string
): FilterResult {
  if (isLocalhostIP(ip)) return { filtered: true, reason: 'localhost' };

  const ownerSet = parseIpList(ownerIps);
  if (ownerSet.size && ownerSet.has(ip)) return { filtered: true, reason: 'owner_ip' };

  const devSet = parseIpList(devIps);
  if (devSet.size && devSet.has(ip)) return { filtered: true, reason: 'developer_ip' };

  if (isHeadlessUA(ua)) return { filtered: true, reason: 'headless' };
  if (isBotUA(ua)) return { filtered: true, reason: 'bot' };

  return { filtered: false, reason: null };
}

// ---- In-memory aggregator ----
interface AggState {
  totalEvents: number;
  filteredEvents: number;
  dailyUsers: Record<string, Set<string>>;
  providerUsage: Record<string, number>;
  searchCount: number;
  cities: Record<string, number>;
  retention: Record<string, Set<string>>;
  eventCounts: Record<string, number>;
  firstSeen: Record<string, string>;
}

// Use globalThis to survive hot reloads in dev
const globalForAgg = globalThis as unknown as { __voyAgg?: AggState };

if (!globalForAgg.__voyAgg) {
  globalForAgg.__voyAgg = {
    totalEvents: 0,
    filteredEvents: 0,
    dailyUsers: {},
    providerUsage: {},
    searchCount: 0,
    cities: {},
    retention: {},
    eventCounts: {},
    firstSeen: {},
  };
}

const _agg = globalForAgg.__voyAgg;

function dayKey(ts?: number): string {
  return new Date(ts || Date.now()).toISOString().slice(0, 10);
}

export function updateAgg(e: VoyEvent): void {
  _agg.totalEvents++;
  const name = String(e.name || 'unknown');
  _agg.eventCounts[name] = (_agg.eventCounts[name] || 0) + 1;

  const day = dayKey(e.ts);
  const aid = String(e.anon_id || 'anon');

  if (!_agg.dailyUsers[day]) _agg.dailyUsers[day] = new Set();
  _agg.dailyUsers[day].add(aid);

  if (!_agg.firstSeen[aid]) _agg.firstSeen[aid] = day;
  if (!_agg.retention[day]) _agg.retention[day] = new Set();
  _agg.retention[day].add(aid);

  if (name === 'provider_click' && e.data && e.data.provider) {
    const p = String(e.data.provider).slice(0, 30);
    _agg.providerUsage[p] = (_agg.providerUsage[p] || 0) + 1;
  }

  if (name === 'search') _agg.searchCount++;

  if (e.geo) {
    const c = String(e.geo).slice(0, 50);
    _agg.cities[c] = (_agg.cities[c] || 0) + 1;
  }
}

export function incrementFiltered(count: number): void {
  _agg.filteredEvents += count;
}

export interface VoyReports {
  totalEvents: number;
  filteredEvents: number;
  eventCounts: Record<string, number>;
  dailyUsers: Record<string, number>;
  providerUsage: Array<{ provider: string; count: number }>;
  searches: number;
  cities: Array<{ cluster: string; count: number }>;
  retention: Record<string, { new: number; returning: number; total: number }>;
  generatedAt: string;
}

export function buildReports(): VoyReports {
  const dailyUsers: Record<string, number> = {};
  Object.keys(_agg.dailyUsers).forEach((day) => {
    dailyUsers[day] = _agg.dailyUsers[day].size;
  });

  const retention: Record<string, { new: number; returning: number; total: number }> = {};
  Object.keys(_agg.retention)
    .sort()
    .forEach((day) => {
      let newUserCount = 0;
      let returningCount = 0;
      _agg.retention[day].forEach((aid) => {
        if (_agg.firstSeen[aid] === day) newUserCount++;
        else returningCount++;
      });
      retention[day] = {
        new: newUserCount,
        returning: returningCount,
        total: newUserCount + returningCount,
      };
    });

  const citiesArr = Object.keys(_agg.cities)
    .map((c) => ({ cluster: c, count: _agg.cities[c] }))
    .sort((a, b) => b.count - a.count);

  const providerArr = Object.keys(_agg.providerUsage)
    .map((p) => ({ provider: p, count: _agg.providerUsage[p] }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEvents: _agg.totalEvents,
    filteredEvents: _agg.filteredEvents,
    eventCounts: _agg.eventCounts,
    dailyUsers,
    providerUsage: providerArr,
    searches: _agg.searchCount,
    cities: citiesArr,
    retention,
    generatedAt: new Date().toISOString(),
  };
}
