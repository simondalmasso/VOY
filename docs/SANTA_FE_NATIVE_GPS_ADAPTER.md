# VOY — Santa Fe native GPS adapter (P0 public recovery)

## Runtime truth

The worker has a same-origin `GET /api/transit/santa-fe/vehicles` integration boundary.
No source is activated by checking an APK or an undocumented mobile backend. The default production response is:
`{"ok":true,"status":"not_integrated","source_id":null,"observations":[]}`.

The adapter only activates **after the maintainer explicitly confirms reuse rights and configures a documented, approved source**. Do not set these bindings speculatively.

## Activation contract (Worker environment bindings, not browser config)

- `VOY_SF_GPS_REUSE_APPROVED=YES`: explicit maintainer approval **after** confirming contract and license.
- `VOY_SF_GPS_FEED_URL`: HTTPS JSON endpoint; no user info, URL query credentials or fragments.
- `VOY_SF_GPS_APPROVED_HOST`: exact approved host, must match endpoint.
- `VOY_SF_GPS_SOURCE_ID`: stable `sf_gps_...` identifier from the source registry review.
- `VOY_SF_GPS_LICENSE_URL`: published written authorization/terms URL, HTTPS.

Do not put authentication tokens, account credentials or endpoint URL with embedded secrets in the frontend, Git or documentation. Authenticated sources require a separate source-specific approved adapter with a secret binding and additional tests. The generic adapter intentionally does not accept authenticated URLs.

## Provider JSON schema v1

```json
{
  "vehicles": [
    {"id":"public-pseudonym","lat":-31.63,"lon":-60.7,
     "observed_at":"2026-10-08T18:00:00Z","route_id":"3","line":"3","trip_id":"optional"}
  ]
}
```

This is a **contract example**, not an observation from a real vehicle and not the documented schema of Cuándo Pasa. The Worker uses source-owned pseudonymous IDs and does not expose raw source credentials.

## Truth and budgets

- Only WGS84 numeric positions inside bounded Santa Fe metro latitude [-31.95,-31.3], longitude [-61.08,-60.3].
- Timestamp is an explicit ISO datetime, age <= 20 seconds, future skew <= 5 seconds; stale, invalid or missing positions are discarded.
- Max 256 upstream entries, 16 current accepted vehicles, <= 160 kB response, <= 2.5 s upstream timeout, a 5 s in-isolate cache and a 15 s browser poll (only while visible in local coverage).
- Failure yields `source_unavailable`; empty/expired yields `no_current_positions`. No inferred vehicle activity, ETA or route coverage.
- 2D/3D may render the **observed GPS point only**, without snapping/interpolation absent independently verified geometry. Other unverified realtime movement remains prohibited.
- Browser stops polling entirely when endpoint reports `not_integrated`. Worker responses are `cache-control:no-store`.
- Static published bus lines and external Cuándo Pasa handoff remain separate.

## Acceptance pending

Document source owner, API format, terms and operational consent. Adapt the provider schema only on evidence. Test two fresh consecutive real observation cycles, 2D/3D, source loss, stale, reduced motion, Chrome/Edge, SW update and exact-SHA deploy. No readiness or realtime declaration prior to proven feed.

Reference: `docs/SANTA_FE_GPS_APK_EVIDENCE.md` is static binary analysis and **not proof of authorized API access**.
