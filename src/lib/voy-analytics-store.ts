/**
 * VOY Analytics — in-memory aggregate store (DEV MIRROR of the Durable Object)
 * ------------------------------------------------------------
 * Mirrors the aggregate logic of analytics-do.js (VoyAnalytics class) so the
 * Next.js dev server can serve /api/reports locally without a Durable Object
 * binding. Single-process singleton; resets on server restart (dev only).
 *
 * Production uses the Durable Object (strong consistency, persisted). This
 * module is ONLY imported by the dev API routes (src/app/api/events+reports).
 */

// V2 canonical event names (must match worker.js NAME_NORMALIZE values)
export const V2_EVENTS = ['search', 'provider_click', 'route_selected', 'voice_search', 'share', 'navigation_start'] as const;
export type V2Event = typeof V2_EVENTS[number];

export const NAME_NORMALIZE: Record<string, V2Event> = {
  search_performed: 'search',
  provider_clicked: 'provider_click',
  destination_selected: 'route_selected',
  share_app: 'share',
  search: 'search', provider_click: 'provider_click', route_selected: 'route_selected',
  voice_search: 'voice_search', share: 'share', navigation_start: 'navigation_start',
};

export interface NormalizedEvent {
  name: V2Event;
  anon_id: string;
  ts: number;
  geo: string;
  data: Record<string, unknown>;
}

interface DayBucket {
  users: Record<string, true>;
  searches: number;
  provider_clicks: number;
  routes: number;
  voices: number;
  shares: number;
  navs: number;
}

interface StoreState {
  days: Record<string, DayBucket>;
  providers: Record<string, number>;
  geos: Record<string, number>;
  cohorts: Record<string, string>;      // anon_id → first-seen day
  returns: Record<string, Record<number, number>>; // cohort day → {offset: count}
  raw: NormalizedEvent[];               // dev-only: raw event log for inspection
}

const store: StoreState = {
  days: {}, providers: {}, geos: {}, cohorts: {}, returns: {}, raw: [],
};

function dayKey(ts: number): string {
  const d = new Date(ts);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}
function dayOffset(a: string, b: string): number {
  return Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);
}

export function ingest(events: NormalizedEvent[]): number {
  let count = 0;
  for (const e of events) {
    const day = dayKey(e.ts);
    if (!store.days[day]) {
      store.days[day] = { users: {}, searches: 0, provider_clicks: 0, routes: 0, voices: 0, shares: 0, navs: 0 };
    }
    const d = store.days[day];
    if (e.anon_id) d.users[e.anon_id] = true;
    switch (e.name) {
      case 'search': d.searches++; break;
      case 'provider_click':
        d.provider_clicks++;
        const p = String((e.data as any)?.provider || 'unknown').slice(0, 32);
        store.providers[p] = (store.providers[p] || 0) + 1;
        break;
      case 'route_selected': d.routes++; break;
      case 'voice_search': d.voices++; break;
      case 'share': d.shares++; break;
      case 'navigation_start': d.navs++; break;
    }
    if (e.geo) store.geos[e.geo] = (store.geos[e.geo] || 0) + 1;
    if (e.anon_id) {
      if (!store.cohorts[e.anon_id]) {
        store.cohorts[e.anon_id] = day;
      } else if (store.cohorts[e.anon_id] !== day) {
        const off = dayOffset(store.cohorts[e.anon_id], day);
        if (off >= 1 && off <= 30) {
          if (!store.returns[store.cohorts[e.anon_id]]) store.returns[store.cohorts[e.anon_id]] = {};
          store.returns[store.cohorts[e.anon_id]][off] = (store.returns[store.cohorts[e.anon_id]][off] || 0) + 1;
        }
      }
    }
    store.raw.push(e);
    if (store.raw.length > 1000) store.raw.shift(); // cap dev log
    count++;
  }
  return count;
}

export function report(type: string, days: number) {
  switch (type) {
    case 'daily_users': return rDailyUsers(days);
    case 'provider_usage': return rProviders();
    case 'searches': return rSearches(days);
    case 'cities': return rCities();
    case 'retention': return rRetention(days);
    case 'summary':
    default:
      return {
        daily_users: rDailyUsers(days),
        provider_usage: rProviders(),
        searches: rSearches(days),
        cities: rCities(),
        retention: rRetention(days),
      };
  }
}

function rDailyUsers(days: number) {
  const out: { day: string; users: number; searches: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(Date.now() - i * 86400000);
    const d = store.days[day];
    out.push({ day, users: d ? Object.keys(d.users).length : 0, searches: d ? d.searches : 0 });
  }
  return out;
}
function rProviders() {
  return Object.keys(store.providers)
    .map(p => ({ provider: p, clicks: store.providers[p] }))
    .sort((a, b) => b.clicks - a.clicks);
}
function rSearches(days: number) {
  let total = 0;
  const series: { day: string; searches: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = dayKey(Date.now() - i * 86400000);
    const c = store.days[day]?.searches || 0;
    total += c;
    series.push({ day, searches: c });
  }
  return { total, series };
}
function rCities() {
  return Object.keys(store.geos)
    .map(g => ({ cluster: g, events: store.geos[g] }))
    .sort((a, b) => b.events - a.events)
    .slice(0, 15);
}
function rRetention(days: number) {
  const cohortsByDay: Record<string, number> = {};
  for (const anon in store.cohorts) {
    const d = store.cohorts[anon];
    cohortsByDay[d] = (cohortsByDay[d] || 0) + 1;
  }
  const out: { cohort: string; size: number; retention: { day: number; count: number; rate: number }[] }[] = [];
  const cutoff = Date.now() - days * 86400000;
  for (const day in cohortsByDay) {
    if (new Date(day).getTime() < cutoff) continue;
    const size = cohortsByDay[day];
    const ret = store.returns[day] || {};
    const offsets = [];
    for (let o = 1; o <= 7; o++) {
      offsets.push({ day: o, count: ret[o] || 0, rate: size ? +(((ret[o] || 0) / size) * 100).toFixed(1) : 0 });
    }
    out.push({ cohort: day, size, retention: offsets });
  }
  return out.sort((a, b) => (a.cohort < b.cohort ? 1 : -1)).slice(0, 14);
}

// dev-only: raw event log (capped) for inspection / verification
export function rawLog(): NormalizedEvent[] { return store.raw.slice(-100); }
export function reset(): void {
  store.days = {}; store.providers = {}; store.geos = {}; store.cohorts = {}; store.returns = {}; store.raw = [];
}
