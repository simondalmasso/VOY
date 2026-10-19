# Buenos Aires open-data transport API — access pending

**Status:** WAITING_FOR_OFFICIAL_REGISTRATION_REPLY  
**Recorded:** 2026-10-19  
**Project:** VOY — multi-city bus/train tracking  
**GitHub tracking issue:** https://github.com/simondalmasso/VOY/issues/102  
**Owner-reported action:** Free registration in BA Data has already been submitted; the owner is waiting for a reply.

## Candidate API surface reported by the owner

Base URL: `https://datosabiertos-transporte-apis.buenosaires.gob.ar`

| Mode/service | Candidate endpoint | Intended use |
|---|---|---|
| Colectivos | `GET /colectivos/vehiclePositions` | Full GTFS-Realtime vehicle-position feed; reported route/agency filters |
| Colectivos | `GET /colectivos/vehiclePositionsSimple` | Simplified vehicle-position response; first candidate to evaluate for VOY |
| Trenes | `GET /trenes/vehiclePositions` | Train vehicle positions |
| Trenes | `GET /trenes/tripUpdates` | Train trip updates |
| Trenes | `GET /trenes/serviceAlerts` | Train service alerts |
| Subtes | `GET /subtes/feed-gtfs` | GTFS / realtime feed |
| Subtes | `GET /subtes/forecastGTFS` | Realtime forecast |
| Subtes | `GET /subtes/serviceAlerts` | Service alerts |
| Ecobici | `GET /ecobici/gbfs/*` | GBFS bike-share station/status data (bonus scope) |

## Important verification boundary

The endpoint names and behavior above are a **user-provided lead, not yet independently verified official documentation**. Registration was submitted, but approval, credentials, rate limits, schema, freshness, attribution, licensing, production use, and redistribution rights are **pending confirmation**.

Do not store credentials, tokens, API keys, or registration secrets in this file, Git history, logs, screenshots, or issue comments. Do not make authenticated calls until credentials are delivered through an approved secure channel. Keep any future credentials in the project's approved secret store.

## Next actions when the registration reply arrives

1. Record the response date and approval scope without recording secret values.
2. Read the official docs and confirm the exact base URL, authentication method, endpoint paths, query parameters, response schemas, rate limits, and error behavior.
3. Confirm terms for caching, display, attribution, commercial use, and redistribution.
4. Probe one simple endpoint using approved credentials from a secure runtime; capture status code, response schema, observation timestamp, and source timestamp without logging secrets or unnecessary personal data.
5. Integrate through a server-side adapter; never expose credentials in browser code.
6. Add a per-feed health/freshness contract and tests. UI labels must distinguish live, stale, scheduled, unavailable, and unverified data.
7. Evaluate `/colectivos/vehiclePositionsSimple` first only if its official schema and terms are confirmed; then assess rail endpoints independently.
8. Keep EcoBici as a separate optional integration so it cannot block bus/train delivery.

## Related VOY scope

Target cities: Santa Fe, Paraná, Rosario, Mendoza, Buenos Aires. Target modes: colectivos and trains, with other modes only when explicitly scoped. A city or mode must not be marked live merely because its static routes, stations, or timetables are available.

## Follow-up trigger

**Trigger:** reply from BA Data / Buenos Aires open-data registration.  
**Action:** resume the verification checklist above; do not let this item disappear behind the map/UI work.
