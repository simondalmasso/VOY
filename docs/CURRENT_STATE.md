# VOY — Current State

Last updated: 2026-07-21

This file is the canonical operational worklog for VOY. Production, Cloudflare runtime state and remote Git state take precedence when they are verified more recently.

## Last completed productive milestone

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
- Draft PR: `#21` — `feat(city): load versioned territorial profiles`
- PR URL: `https://github.com/simonkey888/VOY/pull/21`
- PR head before this worklog update: `235a6839b150d153ecd573b8d1b9e2168e513ffe`
- Generated runtime commit: `9feaed9a70534de1cfc1be63827f0ffe8db724ec`
- Merge state: not merged
- Candidate deployment: not created
- Production deployment: not authorized

The branch may receive code, tests and documentation. It is not ready for a Cloudflare candidate until final-head PR CI and desktop/mobile browser validation pass.

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

The runtime module is `public/core/cityPlatform.js`. It normalizes city aliases, resolves safe fixed directories, fetches exactly five files with `cache: no-store`, validates them and composes the legacy structure consumed by the current PWA.

Supported city IDs:

- `_default` → national fallback profile
- `santafe` → `public/cities/santa-fe/`

Canonical fallback policy:

```text
remote versioned profile
→ valid v2 cache for the same city
→ valid upgraded legacy cache for the same city
→ fail-closed emergency profile for the same city
```

Superseded territorial loaders are actively aborted. Unknown IDs normalize to `_default` before loading.

## Territorial coverage

### `_default`

- Coverage level: `national_basic`
- Geographic scope: Argentina
- Local providers asserted available: none
- Taxi/remis companies: none
- Local fares: null and `not_available`
- Stops, bike stations and local landmarks: none
- Search bbox: none
- UI communication: national and coverage-neutral

### Santa Fe

- Coverage level: `partial`
- Regulated taxi, remis and bus fares: preserved and verified
- Private app availability: preserved from the existing provider registry
- Private app price models: stale and excluded from recommendations
- Stops, bike stations and landmarks: preserved
- Complete official transport-data traceability: pending
- Emergency fallback: map context only, providers disabled and all fares null

## Validation evidence

Finalization workflow run:

```text
Run ID: 29816118823
Validated source SHA: ed388faa778d80a5b7aaea3bcfcd1fc02606e265
Generated source commit: 9feaed9a70534de1cfc1be63827f0ffe8db724ec
Artifact ID: 8489408144
Artifact digest: sha256:d780edc83b61a26412f2a2ddd13dff75ffdada7bae5b0b1752dd5bdd57a56320
```

Executed gates:

- Bun 1.3.14 frozen dependency installation: PASS
- Generated diff validation: PASS
- ESLint: PASS
- Node tests: 190 pass, 0 fail, 0 skipped
- Wrangler 4.112.0 dry-run: PASS
- Dry-run bindings: `ASSETS`, `VOY_METRICS`, `NOMINATIM_COORDINATOR`
- Evidence manifest and file hashes: generated and inspected
- One-time migration script: removed
- One-time finalization workflow: removed

Diagnostic history:

- Run `29815107967` failed because the old test harness still required legacy `city_*.json` loading and the superseded `_default` fallback policy.
- Run `29815747976` retained artifacts but did not preserve the raw Node output.
- Run `29815995016` proved 190 product tests passed; the only error was Bun discovering a Playwright spec outside the scoped Node suite.
- Run `29816118823` used the repository's scoped Node command and passed all finalization gates.

None of these workflows deployed or promoted a Worker.

## Pending gates

- Run PR CI against the current final head after documentation and cleanup commits.
- Inspect all PR CI jobs and artifacts.
- Run desktop and mobile browser validation for Santa Fe and `_default`.
- Verify zero pageerror, zero relevant console error, zero horizontal overflow and zero direct Nominatim browser requests.
- Verify exactly one `wide=1` request per wide-search flow.
- Create an exact-SHA Cloudflare candidate only after those gates pass.
- Validate the candidate in the Cloudflare runtime.
- Promote only after all promotion gates pass.
- Close PR #1 and PR #2 only after PR #21 is validated as their replacement.

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
- Missing interactive Cloudflare access is an observability limitation, not a code-development blocker.
- Unknown cities normalize to `_default`.
- A known-city failure uses same-city cache and then a same-city fail-closed emergency profile.
- `_default` must never assert local availability, prices, stops or Santa Fe territorial data.
- Experimental features remain disabled.
- Legacy city files remain during this first migration.

## Current readiness

```text
GITHUB_PREFLIGHT=PASS
PRODUCTION_HEALTH=PASS
CITY_PLATFORM_IN_PRODUCTION=NO
CLOUDFLARE_CONTROL_PLANE_SNAPSHOT=UNVERIFIED
BRANCH_MODIFIED=YES
DRAFT_PR=21
FINALIZATION_TESTS=PASS
READY_TO_EDIT=YES
READY_FOR_REVIEW=NO
READY_FOR_CANDIDATE_DEPLOY=NO
READY_FOR_PRODUCTION=NO
```

## Exact next step

Run and inspect PR #21 CI on the current final head, then execute desktop and mobile browser validation for Santa Fe and `_default` without creating or promoting a production deployment.
