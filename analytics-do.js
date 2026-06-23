// ============================================================
//  VOY Analytics Durable Object — VOY_ANALYTICS_V2
// ------------------------------------------------------------
//  Maintains real-time aggregates for the 5 reports so /api/reports
//  returns instantly without querying the Analytics Engine SQL API.
//
//  Dual store (with worker.js):
//    Store 1: Workers Analytics Engine (VOY_METRICS)  — raw data points
//    Store 2: THIS Durable Object (VOY_AGG)           — hot aggregates
//
//  State (persisted via ctx.storage, transactional):
//    days:   { "2026-01-01": { users: Set<anon_id>, searches: n, ... } }
//    providers: { uber: n, didi: n, ... }
//    geos:    { "cluster_x_y": n, ... }
//    cohorts: { anon_id: "2026-01-01" }   (first-seen day → retention)
//    returns: { "2026-01-01": { "0": n, "1": n, ... } }  (cohort→dayOffset→count)
//
//  Privacy: anon_id only (hashed client-side), coarse geo cluster, no IP.
// ============================================================

export class VoyAnalytics {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    // POST /ingest — batch of normalized events
    if (request.method === 'POST' && url.pathname.endsWith('/ingest')) {
      let body;
      try { body = await request.json(); } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: 'bad_json' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const events = Array.isArray(body && body.events) ? body.events : [];
      const n = await this._ingest(events);
      return new Response(JSON.stringify({ ok: true, ingested: n }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // GET /report?type=<report>&days=<n>
    if (request.method === 'GET' && url.pathname.endsWith('/report')) {
      const type = url.searchParams.get('type') || 'summary';
      const days = Math.min(parseInt(url.searchParams.get('days') || '30', 10) || 30, 90);
      const result = await this._report(type, days);
      return new Response(JSON.stringify({ ok: true, type, days, result }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // ---- ingest: update all aggregates for a batch ----
  async _ingest(events) {
    if (!events.length) return 0;

    // Load current state (transactional, strongly consistent in a DO)
    let [days, providers, geos, cohorts, returns] = await Promise.all([
      this.state.storage.get('days') || {},
      this.state.storage.get('providers') || {},
      this.state.storage.get('geos') || {},
      this.state.storage.get('cohorts') || {},
      this.state.storage.get('returns') || {}
    ]);

    let count = 0;
    for (const e of events) {
      const name = e.name;        // already normalized to V2 canonical by the worker
      const anon = String(e.anon_id || '').slice(0, 64);
      const ts = Number(e.ts) || Date.now();
      const day = this._dayKey(ts);
      const geo = String(e.geo || '').slice(0, 60);

      // ensure day bucket
      if (!days[day]) days[day] = { users: {}, searches: 0, provider_clicks: 0, routes: 0, voices: 0, shares: 0, navs: 0 };
      const d = days[day];

      // daily unique user
      if (anon) d.users[anon] = true;

      // per-event counters
      switch (name) {
        case 'search': d.searches++; break;
        case 'provider_click':
          d.provider_clicks++;
          const p = String((e.data && e.data.provider) || 'unknown').slice(0, 32);
          providers[p] = (providers[p] || 0) + 1;
          break;
        case 'route_selected': d.routes++; break;
        case 'voice_search': d.voices++; break;
        case 'share': d.shares++; break;
        case 'navigation_start': d.navs++; break;
      }

      // geo distribution (coarse cluster only)
      if (geo) geos[geo] = (geos[geo] || 0) + 1;

      // retention: record first-seen day per anon_id, then mark a return for today
      if (anon) {
        if (!cohorts[anon]) {
          cohorts[anon] = day;
        } else if (cohorts[anon] !== day) {
          // returning user on a different day → record cohort return offset
          const offset = this._dayOffset(cohorts[anon], day);
          if (offset >= 1 && offset <= 30) {
            if (!returns[cohorts[anon]]) returns[cohorts[anon]] = {};
            returns[cohorts[anon]][offset] = (returns[cohorts[anon]][offset] || 0) + 1;
          }
        }
      }
      count++;
    }

    // persist
    await Promise.all([
      this.state.storage.put('days', days),
      this.state.storage.put('providers', providers),
      this.state.storage.put('geos', geos),
      this.state.storage.put('cohorts', cohorts),
      this.state.storage.put('returns', returns)
    ]);

    return count;
  }

  // ---- reports ----
  async _report(type, days) {
    const [allDays, providers, geos, cohorts, returns] = await Promise.all([
      this.state.storage.get('days') || {},
      this.state.storage.get('providers') || {},
      this.state.storage.get('geos') || {},
      this.state.storage.get('cohorts') || {},
      this.state.storage.get('returns') || {}
    ]);

    switch (type) {
      case 'daily_users': return this._rDailyUsers(allDays, days);
      case 'provider_usage': return this._rProviders(providers);
      case 'searches': return this._rSearches(allDays, days);
      case 'cities': return this._rCities(geos);
      case 'retention': return this._rRetention(cohorts, returns, days);
      case 'summary':
      default:
        return {
          daily_users: this._rDailyUsers(allDays, days),
          provider_usage: this._rProviders(providers),
          searches: this._rSearches(allDays, days),
          cities: this._rCities(geos),
          retention: this._rRetention(cohorts, returns, days)
        };
    }
  }

  _rDailyUsers(allDays, days) {
    const out = [];
    const today = this._dayKey(Date.now());
    for (let i = days - 1; i >= 0; i--) {
      const day = this._dayKey(Date.now() - i * 86400000);
      const d = allDays[day];
      out.push({ day, users: d ? Object.keys(d.users).length : 0, searches: d ? d.searches : 0 });
      if (day === today) break;
    }
    return out;
  }

  _rProviders(providers) {
    return Object.keys(providers)
      .map(p => ({ provider: p, clicks: providers[p] }))
      .sort((a, b) => b.clicks - a.clicks);
  }

  _rSearches(allDays, days) {
    let total = 0;
    const series = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = this._dayKey(Date.now() - i * 86400000);
      const d = allDays[day];
      const c = d ? d.searches : 0;
      total += c;
      series.push({ day, searches: c });
    }
    return { total, series };
  }

  _rCities(geos) {
    // "cities" is a coarse geo-cluster distribution (no raw coords). Top N.
    return Object.keys(geos)
      .map(g => ({ cluster: g, events: geos[g] }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 15);
  }

  _rRetention(cohorts, returns, days) {
    // cohort = first-seen day; retention[cohort][offset] = # users who returned on day offset
    const cohortsByDay = {};
    for (const anon in cohorts) {
      const d = cohorts[anon];
      cohortsByDay[d] = (cohortsByDay[d] || 0) + 1;
    }
    const out = [];
    const cutoff = Date.now() - days * 86400000;
    for (const day in cohortsByDay) {
      if (new Date(day).getTime() < cutoff) continue;
      const size = cohortsByDay[day];
      const ret = returns[day] || {};
      const offsets = [];
      for (let o = 1; o <= 7; o++) {
        offsets.push({ day: o, count: ret[o] || 0, rate: size ? +(((ret[o] || 0) / size) * 100).toFixed(1) : 0 });
      }
      out.push({ cohort: day, size, retention: offsets });
    }
    return out.sort((a, b) => a.cohort < b.cohort ? 1 : -1).slice(0, 14);
  }

  // ---- date helpers (UTC day keys; events carry their own ts) ----
  _dayKey(ts) {
    const d = new Date(ts);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
  }
  _dayOffset(dayA, dayB) {
    const a = new Date(dayA + 'T00:00:00Z').getTime();
    const b = new Date(dayB + 'T00:00:00Z').getTime();
    return Math.round((b - a) / 86400000);
  }
}
