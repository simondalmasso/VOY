# VOY — Current State

Last updated: 2026-07-21

This file is the canonical operational worklog for VOY. Verified production, Cloudflare runtime state and remote Git state take precedence over older entries.

## Last completed productive milestone

PR #20, `fix(fares): exclude stale app prices from recommendations`, was merged to `main` and deployed successfully.

## Production

- Worker: `voy-app`
- URL: `https://voy-app.simondalmasso44.workers.dev/`
- Health URL: `https://voy-app.simondalmasso44.workers.dev/api/health`
- Application version: `V7.8.0`
- Productive Git SHA: `4a8b91e605597989b3db19860a745c21472a3a14`
- Productive build hash: `4a8b91e`
- Stable Cloudflare version ID: `9508254e-6bbe-48ee-a126-d57d405b70a6`
- Stable traffic: `100%`
- Last known rollback state: not executed

Production remained on `V7.8.0` / `4a8b91e` throughout City Platform candidate validation. No production promotion, rollback, binding mutation, secret change, KV migration, Durable Object migration, cron change or DNS change was performed.

## Active development

- Phase: City Platform V1
- Branch: `feat/voy-city-platform-v1`
- Base: `main@4a8b91e605597989b3db19860a745c21472a3a14`
- Draft PR: `#21` — `feat(city): load versioned territorial profiles`
- PR URL: `https://github.com/simonkey888/VOY/pull/21`
- Branch head before this worklog update: `5741221f7366cca03ec44f06db6e13b1de5868c5`
- Generated runtime commit: `9feaed9a70534de1cfc1be63827f0ffe8db724ec`
- Merge state: not merged
- Production deployment: not authorized

The branch contains the final City Platform runtime, territorial files, unit/integration/browser tests, candidate browser harness and one guarded candidate workflow. One-time diagnostic and repair workflows have been removed.

## Productive architecture

- Cloudflare Worker with static assets under `public/`
- Worker entrypoint: `worker-entry.js`
- Worker name: `voy-app`
- Static Assets binding: `ASSETS`
- Analytics Engine binding: `VOY_METRICS`
- Durable Object binding: `NOMINATIM_COORDINATOR`
- Weekly fare-review cron: `0 6 * * 1`
- Direct browser calls to Nominatim are prohibited
- PWA remains a lightweight single-page application

## City Platform V1

Each supported territory is split into five versioned JSON files:

- `profile.json`
- `providers.json`
- `transport.json`
- `fares.json`
- `feature_flags.json`

Runtime module: `public/core/cityPlatform.js`.

The module:

- normalizes controlled city aliases;
- maps city IDs to fixed directories;
- issues exactly five concurrent `cache: no-store` requests;
- propagates one AbortSignal;
- validates profiles, providers, transport, fares and flags;
- composes the legacy runtime contract consumed by the PWA;
- actively aborts superseded loaders;
- keeps caches and memory namespaced by city.

Supported city IDs:

- `_default` → national fallback profile;
- `santafe` → `public/cities/santa-fe/`.

Canonical fallback policy:

```text
remote versioned profile
→ valid v2 cache for the same city
→ valid upgraded legacy cache for the same city
→ fail-closed emergency profile for the same city
```

Unknown IDs normalize to `_default`. A Santa Fe failure never silently imports national data or stale data from another territory.

## Territorial coverage

### `_default`

- Coverage level: `national_basic`
- Geographic scope: Argentina
- Search bbox: none
- Available local providers: none
- Taxi/remis companies: none
- Stops, bike stations and landmarks: none
- Taxi, remis, bus and private-app amounts: `null`
- Fare status: `not_available`
- UI copy: national and coverage-neutral

### Santa Fe

- Coverage level: `partial`
- Taxi, remis and bus regulated values: preserved
- Private-provider availability and deeplinks: preserved
- Stale private-app price models: excluded from ranking and recommendations
- Stops, bike stations and landmarks: preserved
- Complete official transport-data traceability: pending
- Emergency fallback: Santa Fe map context only; providers disabled, lists empty and fares unavailable

## Local and PR validation

Finalization run `29816118823`:

```text
Validated source SHA: ed388faa778d80a5b7aaea3bcfcd1fc02606e265
Generated runtime commit: 9feaed9a70534de1cfc1be63827f0ffe8db724ec
Artifact ID: 8489408144
Artifact digest: sha256:d780edc83b61a26412f2a2ddd13dff75ffdada7bae5b0b1752dd5bdd57a56320
```

Executed gates:

- Bun 1.3.14 frozen install: PASS
- ESLint: PASS
- Node tests: 190 pass, 0 fail, 0 skipped
- Wrangler 4.112.0 dry-run: PASS
- Declared bindings: `ASSETS`, `VOY_METRICS`, `NOMINATIM_COORDINATOR`
- One-time migration script: removed
- One-time finalization workflow: removed

Fully inspected local/PR browser run `29818843692`:

```text
Head SHA: bfd09baaea85fc231ad968bc21a3b46aed9ba763
Artifact ID: 8490526891
Artifact digest: sha256:bcad0a2ed3f1e0a9a70ceb386ea7d7850e380f38686dc89c170393490c49ca7f
```

- Local Worker desktop/mobile: PASS
- Production baseline desktop/mobile without deploy: PASS
- `_default`, Santa Fe, transitions and same-city emergency fallback: PASS
- Page errors: 0
- Relevant console errors: 0
- Direct browser Nominatim requests: 0
- Horizontal overflow: 0

## Cloudflare candidate validation completed before final-head replacement

Validated candidate source SHA:

```text
fa4833100b681d86aa151e3c69da93bf7554b929
```

Cloudflare state:

```text
Deployment ID: d7406cfe-8e70-4087-ac59-1480f26b2e84
Stable version ID: 9508254e-6bbe-48ee-a126-d57d405b70a6
Stable traffic: 100%
Candidate version ID: 63c18a47-fb7b-4034-bf5c-326d94a7d10a
Candidate traffic: 0%
```

The candidate and stable versions exposed the same 13-resource binding contract. Required bindings `ASSETS`, `VOY_METRICS` and `NOMINATIM_COORDINATOR` were present.

### Override isolation

Diagnostic run `29823944114`:

```text
Artifact ID: 8492507825
Artifact digest: sha256:bf77df49e14dcf8e146134eb7807822300fc71f58454c94e7421824a489a936e
```

Three independent rounds compared normal and overridden requests for health, HTML, City Platform and territorial assets.

- Exact header: `Cloudflare-Workers-Version-Overrides: voy-app="63c18a47-fb7b-4034-bf5c-326d94a7d10a"`
- Normal health: `4a8b91e` in all rounds
- Override health: `fa48331` in all rounds
- Normal City Platform assets: not present in productive version
- Override City Platform assets: candidate responses
- Candidate tail version proof: exact candidate version ID only
- Tail outcomes: all `ok`
- Classification: `OVERRIDE_WORKER_PASS`

Root cause of the first failed candidate smoke: validation began before the new split deployment had converged globally. It was not a City Platform defect and not an invalid override header.

Cloudflare did not generate a Versioned Preview URL because VOY implements a Durable Object. Candidate identity was proven independently through exact build hash, request comparison and `wrangler tail --version-id`.

### Candidate desktop/mobile browser

Successful run `29825187499`:

```text
Validated existing candidate version: 63c18a47-fb7b-4034-bf5c-326d94a7d10a
Artifact ID: 8493017815
Artifact digest: sha256:e9e8bed3022c2c746a7774e1c01079ccc1c20e1c6c84942fbc1791da6f92bc14
```

- Frozen install: PASS
- ESLint: PASS
- Node tests: 190 pass, 0 fail, 0 skipped
- Wrangler dry-run: PASS
- Candidate preflight health: `fa48331` in three rounds
- Playwright desktop: PASS
- Playwright mobile: PASS
- Full reload against candidate: PASS
- `_default`: PASS
- Santa Fe: PASS
- `_default → santafe → _default → emergency santafe`: PASS
- Same-origin relevant requests carrying exact override: PASS
- Candidate tail events: 11
- Observed candidate version IDs: exact candidate only
- Tail non-`ok` outcomes: 0
- Page errors: 0
- Console errors: 0
- Direct browser Nominatim requests: 0
- Horizontal overflow: 0
- Production health after browser: `4a8b91e`

Custom candidate headers are stripped from cross-origin map resources to avoid introducing CORS preflights. All same-origin Worker, HTML, City Platform and territorial requests retain the exact override header.

## Candidate replacement policy

The validated `fa48331` candidate proved the runtime and candidate test path. It must be replaced before review completion because PR #21 accumulated documentation, test-harness and workflow cleanup commits afterward.

The final candidate workflow must:

1. validate the exact final PR head;
2. preserve stable version `9508254e-6bbe-48ee-a126-d57d405b70a6` at `100%`;
3. upload exactly one new version from that SHA;
4. verify binding parity;
5. replace the previous 0% candidate with the new candidate at `0%`;
6. wait for deterministic override convergence;
7. validate curl, desktop, mobile, reload, territorial transitions and fallback;
8. verify normal production remains `4a8b91e`;
9. preserve manifests, screenshots, logs, hashes, version ID and deployment ID.

## Known risks and open debt

- City Platform V1 is not in normal production traffic.
- Legacy files `public/city_default.json` and `public/city_santafe.json` remain for compatibility and rollback.
- Santa Fe transport data remains curated and is not yet fully traceable to a complete official dataset.
- The inline `window.VOY_VERSION` discrepancy inherited from `main` remains separate debt; canonical meta/health version is `V7.8.0`.
- PR #1 and PR #2 remain open until PR #21 is explicitly merged or selected as their replacement.

## Decisions in force

- GitHub is the source of traceable code.
- Cloudflare validates the exact candidate SHA before production completion.
- Candidate validation may create a version and deployment at 0%; it may not promote normal traffic.
- `_default` must not assert local availability, prices, stops or Santa Fe data.
- Known-city failure remains same-city and fail-closed.
- Experimental features remain disabled.
- Legacy city files remain during this first migration.

## Current readiness

```text
GITHUB_PREFLIGHT=PASS
PRODUCTION_HEALTH=PASS
CITY_PLATFORM_IN_PRODUCTION=NO
CLOUDFLARE_CONTROL_PLANE_SNAPSHOT=PASS
BRANCH_MODIFIED=YES
DRAFT_PR=21
FINALIZATION_TESTS=PASS
LOCAL_BROWSER_DESKTOP=PASS
LOCAL_BROWSER_MOBILE=PASS
OVERRIDE_CURL=PASS
VERSION_ID_PROOF=PASS
VALIDATED_CANDIDATE_BROWSER_DESKTOP=PASS
VALIDATED_CANDIDATE_BROWSER_MOBILE=PASS
READY_TO_EDIT=YES
READY_FOR_REVIEW=PENDING_EXACT_FINAL_HEAD_CANDIDATE
READY_FOR_PRODUCTION=PENDING_EXACT_FINAL_HEAD_CANDIDATE
ROLLBACK_EXECUTED=NO
PRODUCTION_PROMOTED=NO
```

## Exact next step

Execute the guarded final candidate workflow from the final PR head. Replace only the previous 0% candidate, keep production stable at 100%, inspect the complete artifact, and then mark PR #21 ready for review without merging or promoting traffic.
