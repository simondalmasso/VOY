# City Platform V1

## Purpose

City Platform V1 separates territorial data from the VOY interface and mobility engine without changing the productive Worker/PWA architecture. It is a structural migration, not a hidden expansion of city coverage or a new pricing model.

## Schema

Every territorial component uses:

```json
{
  "schema_version": 1,
  "city_id": "_default or santafe"
}
```

A city consists of exactly five files:

```text
public/cities/<folder>/profile.json
public/cities/<folder>/providers.json
public/cities/<folder>/transport.json
public/cities/<folder>/fares.json
public/cities/<folder>/feature_flags.json
```

`public/core/cityPlatform.js` loads and validates those components, then composes the legacy runtime shape consumed by the PWA.

## Supported territories

| Canonical ID | Accepted aliases | Folder | Coverage |
| --- | --- | --- | --- |
| `_default` | empty, `_default`, `default`, `argentina`, `ar`, unknown IDs | `_default` | `national_basic` |
| `santafe` | `santafe`, `santa-fe`, `santa_fe`, `santa fe`, accented variants | `santa-fe` | `partial` |

Folder paths are selected from a fixed map. User input is never interpolated directly into filesystem paths.

## Components

### Profile

Declares identity, display name, country, map center, zoom, optional bbox/viewbox, timezone, coverage level, coverage notes, source and verification date.

Validation includes:

- schema and city ID match;
- canonical slug;
- finite geographic coordinates in legal ranges;
- finite zoom from 0 through 22;
- ordered bbox with the center inside it;
- accepted coverage level;
- non-empty descriptive strings.

### Providers

Declares provider availability and the taxi/remis company registries. Availability is a boolean assertion, not a fare.

Validation includes:

- non-empty provider IDs and names;
- boolean `available` and `verified` fields;
- category restricted to `app`, `taxi` or `remis`;
- company IDs that resolve to declared providers;
- string or null external-action fields.

### Transport

Declares bus stops, bike stations and landmarks.

Validation includes finite latitude/longitude values, legal coordinate ranges and non-empty names. Empty arrays are valid and are required for `_default`.

### Fares

Declares taxi, remis, bus and private-app fare records. The schema requires all four sections even when local prices are unavailable.

Unavailable prices use `null` and `status: not_available`. Zero is not used as an unknown-price sentinel.

Private app records may remain present for migration compatibility, but stale states are excluded by the canonical mobility engine policy.

### Feature flags

The exact V1 flags are:

```text
ai_copilot
voice_input
qr_stops
web_push
live_transit
weather_context
price_history
```

All are disabled in City Platform V1. Unknown flags and non-boolean values fail validation.

## Loading

`VoyCityPlatform.loadCity()`:

1. normalizes the requested city ID;
2. resolves one fixed folder;
3. starts exactly five concurrent fetches;
4. sends `cache: no-store` and one shared abort signal;
5. rejects any HTTP or JSON error;
6. validates every component;
7. composes one deterministic city context.

The module does not read or write the DOM, localStorage, IndexedDB or map state.

## Loader generation and cancellation

The HTML loader maintains a monotonically increasing generation number and one active `AbortController`.

Starting a new territorial load:

1. increments the generation;
2. aborts the previous controller;
3. creates a new controller;
4. rejects stale completions before any context commit.

This prevents a slower old request from overwriting a newer city selection and avoids continuing obsolete network work.

## Canonical fallback policy

For a normalized requested city:

```text
remote five-file profile
→ valid v2 cache for the same city
→ valid upgraded legacy cache for the same city
→ fail-closed emergency profile for the same city
```

Unknown city IDs normalize to `_default` before this sequence begins.

The Santa Fe emergency profile retains only territorial map context. Providers are unavailable, company lists and transport lists are empty, and all fares are null with `not_available`. It must never display `$0` or activate app recommendations.

The `_default` emergency profile uses the national map, no bbox, no local providers, no local transport and no local fares.

## Cache

V2 key:

```text
voy_city_cache_v2_<city_id>
```

Legacy key:

```text
voy_city_cache_<city_id>
```

Cache rules:

- only the requested city key is read;
- invalid or corrupt v2 entries are removed;
- legacy entries are upgraded only when their `city_id` matches;
- a successful upgrade is written to the v2 key;
- no cache from another city may be used;
- successful remote profiles are cached only after full validation.

Memory and recent-search storage remain namespaced by city.

## National communication

Before a city profile loads, title, description and footer are territorially neutral.

For `_default`, the interface states national-basic coverage and explicitly avoids asserting local fares, stops, providers or transport availability.

For Santa Fe, the interface states partial coverage and does not imply that the stop/station dataset is an officially complete real-time source.

## Legacy compatibility

The following files remain during V1:

```text
public/city_default.json
public/city_santafe.json
```

They support cache migration, rollback and comparison tests. They must not be removed until all consumers are identified, the Cloudflare candidate is validated and a separate retirement plan exists.

## Data provenance

| Territory | Component | Source | Verification state | Limitation |
| --- | --- | --- | --- | --- |
| `_default` | profile | VOY national fallback profile | 2026-07-17 | No local-service assertion |
| `_default` | providers | No national provider availability asserted | 2026-07-17 | All providers unavailable |
| `_default` | transport | No national local-transport dataset | 2026-07-17 | Empty by design |
| `_default` | fares | No national local fare asserted | 2026-07-17 | Null, fail-closed values |
| Santa Fe | profile | VOY curated Santa Fe profile | 2026-07-17 | Coverage remains partial |
| Santa Fe | providers | Existing VOY provider registry | Verification date pending | Source hardening pending |
| Santa Fe | transport | Existing curated VOY dataset | Verification date pending | Not an officially complete dataset |
| Santa Fe | fares | Municipal resolutions and versioned VOY registry | 2026-07-17 | Private app prices remain stale and unranked |

## Feature rollout

City Platform V1 does not include a visual selector, new cities, AI, voice, QR, push, live transit, weather or price history. Those require separate feature-flagged PRs after V1 is stable in production.

## Candidate and promotion gates

A candidate must be built from the exact PR SHA and pass:

```text
frozen dependency installation
lint
tests
Wrangler dry-run
desktop browser
mobile browser
health and schema checks
Santa Fe regression checks
_default isolation checks
pageerror 0
console error 0
direct browser Nominatim 0
```

Production promotion is prohibited until all gates pass. The final GitHub record must include SHA, Cloudflare version ID, deployment ID, traffic, smokes, artifact manifest/digest and rollback state.

## Rollback

Code rollback restores the previous Git commit/deployment. It does not automatically revert KV, Durable Objects or other persistent state. City Platform V1 does not migrate those systems.

The legacy city files remain available during V1 specifically to support a controlled code rollback.
