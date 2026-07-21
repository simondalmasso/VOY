# VOY — Current State

Last updated: 2026-07-21

This file is the canonical operational worklog for VOY. Production, Cloudflare runtime state and remote Git state take precedence when they are verified more recently.

## Last completed milestone

PR #20, `fix(fares): exclude stale app prices from recommendations`, was merged to `main` and deployed successfully.

## Production

- Worker: `voy-app`
- URL: `https://voy-app.simondalmasso44.workers.dev/`
- Health URL: `https://voy-app.simondalmasso44.workers.dev/api/health`
- Application version: `V7.8.0`
- Productive Git SHA: `4a8b91e605597989b3db19860a745c21472a3a14`
- Productive build hash: `4a8b91e`
- Last direct health verification: 2026-07-21 07:56:51 UTC
- Last known successful deploy run: `29611590151`
- Last known rollback state: not executed
- Cloudflare deployment ID: unverified in the current session
- Cloudflare version ID: unverified in the current session
- Active traffic percentage: unverified in the current session
- `CLOUDFLARE_CONTROL_PLANE_SNAPSHOT=UNVERIFIED`

The health endpoint returned `ok: true`, `version: V7.8.0` and `build_hash: 4a8b91e`. Production still serves the legacy city files and does not serve `core/cityPlatform.js?v=1`.

## Active development

- Phase: City Platform V1
- Branch: `feat/voy-city-platform-v1`
- Base: `main@4a8b91e605597989b3db19860a745c21472a3a14`
- Current branch head at this worklog revision: `35a09dda3321ff60e2334032da6c4f66910106db`
- Pull request: not opened yet
- Merge state: not merged
- Candidate deployment: not created
- Production deployment: not authorized

The branch is allowed to receive code, tests and documentation. It is not ready for a Cloudflare candidate until the final branch validation passes.

## Productive architecture

- Cloudflare Worker with static assets under `public/`
- Worker entrypoint: `worker-entry.js`
- Worker name: `voy-app`
- Analytics Engine binding declared as `VOY_METRICS`
- Durable Object binding declared as `NOMINATIM_COORDINATOR`
- Weekly fare-review cron declared as `0 6 * * 1`
- Direct browser calls to Nominatim are prohibited
- PWA remains a lightweight single-page application

No bindings, secrets, KV, Durable Objects, cron, DNS or production traffic were changed during City Platform V1 development.

## City Platform V1 architecture

Each supported territory is split into five versioned JSON files:

- `profile.json`
- `providers.json`
- `transport.json`
- `fares.json`
- `feature_flags.json`

The runtime module is `public/core/cityPlatform.js`. It normalizes city aliases, resolves safe fixed directories, fetches the five files with `cache: no-store`, validates them and composes the legacy structure consumed by the current PWA.

Supported city IDs:

- `_default` → national fallback profile
- `santafe` → `public/cities/santa-fe/`

## Territorial coverage

### `_default`

- Coverage level: `national_basic`
- Geographic scope: Argentina
- Local providers asserted available: none
- Local fares: none
- Stops, bike stations and local landmarks: none
- Search bbox: none

### Santa Fe

- Coverage level: `partial`
- Regulated taxi, remis and bus fares: preserved and verified
- Private app availability: preserved from the existing provider registry
- Private app price models: stale and excluded from recommendations
- Stops, bike stations and landmarks: preserved; complete official traceability remains pending

## Validation status

Completed:

- Remote Git preflight
- Current production health check
- PR #1 and PR #2 historical audit
- Static branch audit
- City Platform schema hardening
- Unit test source added
- Territorial data test source added
- HTML loader and fallback test source added

Pending:

- Materialize the final HTML loader and national communication changes
- Normalize `_default/fares.json`
- Run the complete Node test suite
- Run ESLint
- Run Wrangler dry-run
- Run desktop and mobile browser validation
- Open a Draft PR
- Inspect CI artifacts
- Create and validate an exact-SHA Cloudflare candidate
- Promote only after all gates pass

No test is recorded as PASS here until it has executed against the final branch head.

## Known risks and open debt

- Cloudflare control-plane snapshot remains unverified in this session.
- City Platform V1 is not deployed.
- The legacy files `public/city_default.json` and `public/city_santafe.json` remain required for compatibility and rollback.
- Santa Fe transport data is curated and not yet fully traceable to an official complete dataset.
- The inline application version discrepancy inherited from `main` requires a separate controlled review.
- PR #1 and PR #2 remain open until the replacement implementation is validated.

## Decisions in force

- GitHub remains the source of traceable code.
- Cloudflare must build and validate the exact candidate SHA before production completion.
- Unknown cities normalize to `_default`.
- A known city failure uses same-city cache and then a same-city fail-closed emergency profile.
- `_default` must never assert local availability, prices, stops or Santa Fe territorial data.
- Experimental features remain disabled.
- Legacy files remain during this first migration.

## Exact next step

Materialize the hardened City Platform loader and generated territorial files, execute the full validation suite, and update this file with the final branch SHA and Draft PR number.
