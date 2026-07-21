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
- Validated code head before this worklog update: `ea3a3d062c7124e74b6d36739c6262c592e0fd79`
- Generated runtime commit: `9feaed9a70534de1cfc1be63827f0ffe8db724ec`
- Merge state: not merged
- Candidate deployment: not created
- Production deployment: not authorized

This worklog update changes documentation only. The resulting branch head must complete PR CI before an exact-SHA Cloudflare candidate is created.

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

## Finalization evidence

One-time finalization workflow:

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

None of the finalization workflows deployed or promoted a Worker.

## PR and browser evidence

Latest fully inspected PR validation for the runtime code:

```text
Run ID: 29817666470
Head SHA: ea3a3d062c7124e74b6d36739c6262c592e0fd79
Conclusion: success
Artifact ID: 8490072336
Artifact digest: sha256:454eed312509aeacb49b2b46bbe304c6c63fa84b4afb241faeac8a3b245efed4
Artifact size: 3041376 bytes
```

PR gates:

- Frozen dependency installation: PASS
- ESLint: PASS
- Node tests: 190 pass, 0 fail, 0 skipped
- Wrangler dry-run with minification: PASS
- Chromium 1.61.1 installation: PASS
- Local Worker browser smoke: PASS
- Current production health/version baseline: PASS
- Current production browser smoke without deploy: PASS
- Browser evidence upload: PASS

Santa Fe local browser coverage, desktop and mobile:

- local, exact, recent, remote, ambiguous and invalid-result flows: PASS
- regulated taxi and remis fare behavior: PASS
- stale private-app prices remain null and outside ranking: PASS
- verified provider actions remain available where supported: PASS
- exactly one `wide=1` request per wide-search flow: PASS
- direct browser Nominatim requests: 0

`_default` local browser coverage, desktop and mobile:

- exactly five `_default` component requests: PASS
- Santa Fe component requests during national load: 0
- national center and no territorial bbox: PASS
- local providers available: 0
- taxi/remis companies: 0
- stops, bike stations and landmarks: 0
- taxi, remis, bus and app prices: null and `not_available`
- `$0` rendered: 0
- national title, description and footer: PASS
- exactly one `_default` `wide=1` request per viewport: PASS
- horizontal overflow: 0
- direct browser Nominatim requests: 0

Territorial transition coverage, desktop and mobile:

```text
_default → santafe → _default → emergency santafe
```

- context replacement and territorial isolation: PASS
- Santa Fe regulated fares restored on normal Santa Fe load: PASS
- national data restored with no Santa Fe contamination: PASS
- controlled one-part HTTP 500 produces same-city emergency Santa Fe: PASS
- emergency providers, companies and transport lists: empty/disabled
- emergency fares: null and `not_available`
- horizontal overflow: 0

Browser diagnostics:

- City Platform pageerrors: 0 across all local and production scenarios
- City Platform console errors: 0
- controlled fallback warnings: two, one per local viewport
- headless WebGL performance warnings: non-blocking
- all request logs and screenshots: inspected
- production remained the legacy `V7.8.0` / `4a8b91e` baseline throughout

## Diagnostic history

- Run `29815107967` failed because the old test harness still required legacy `city_*.json` loading and the superseded `_default` fallback policy.
- Run `29815747976` retained artifacts but did not preserve the raw Node output.
- Run `29815995016` proved 190 product tests passed; the only error was Bun discovering a Playwright spec outside the scoped Node suite.
- Run `29816118823` used the repository's scoped Node command and passed all finalization gates.
- Run `29816908172` exposed a browser-test harness issue: Service Worker/cache bypassed a Playwright route intended to force a controlled HTTP failure.
- Run `29817308938` passed after deterministic in-page fetch injection, but two City Platform cases overwrote each other's evidence filenames.
- Run `29817666470` passed with unique evidence per scenario and is the final inspected runtime-code validation.

## Pending gates

- Run PR CI against the documentation-only head created by this worklog update.
- Inspect the final-head CI status and artifact.
- Create an exact-SHA Cloudflare candidate only after that run passes.
- Validate the candidate Worker, assets, bindings, APIs, PWA, desktop/mobile UI, `_default`, Santa Fe, fallbacks, logs, security and privacy.
- Promote only after all candidate gates pass.
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
RUNTIME_BROWSER_DESKTOP=PASS
RUNTIME_BROWSER_MOBILE=PASS
DEFAULT_ISOLATION=PASS
SANTAFE_REGRESSION=PASS
READY_TO_EDIT=YES
READY_FOR_REVIEW=PENDING_FINAL_HEAD_CI
READY_FOR_CANDIDATE_DEPLOY=PENDING_FINAL_HEAD_CI
READY_FOR_PRODUCTION=NO
```

## Exact next step

Run and inspect PR #21 CI on the documentation-only final head. If it passes without changing runtime files, create an exact-SHA Cloudflare candidate without promoting production traffic.
