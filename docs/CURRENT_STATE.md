# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and terminal release status

```text
CANONICAL_STATE=GITHUB_MAIN_AND_VERIFIED_PRODUCTION
PRIMARY_STATE_FILE=docs/CURRENT_STATE.md
CONTROL_ISSUE=30
CANONICAL_PRODUCT_PR=31;MERGED
PRODUCT_SOURCE_SHA=1f1e1d323ce8c769816c6e1b529639cbf3af98ad
PRODUCT_MERGE_SHA=89e29622f93919829948ea2b7caed16a297a22f1
AUD_RESOLUTION=5213861215
ARQ_AUTHORIZATION=5213939139
CONTROLLING_OWNER_ORDER=5212681430
RELEASE_STATUS=TERMINAL_PRODUCTION_PASS
```

Production was promoted only after the exact product SHA, same prevalidated Cloudflare version, fresh post-rollback state, direct runtime contracts and clean-profile browser gates were reconstructed. Runtime identifiers remain current only when re-queried from Cloudflare/production or retained by immutable release evidence.

## Current production

```text
APPLICATION_VERSION=V8.0.0
BUILD_HASH=1f1e1d3
PRODUCTIVE_VERSION_ID=2ee28f09-1aa8-4250-bb2c-ba4684a07791
PRODUCTIVE_TRAFFIC=100%
PRODUCTIVE_DEPLOYMENT_ID=9414609d-236d-4297-b767-683be6e46e8c
ROLLBACK_VERSION_ID=b4f1833a-f2a1-4a44-b351-13ae48972c20
ROLLBACK_TRAFFIC=0%
PRE_RELEASE_DEPLOYMENT_ID=0902bb57-6240-4894-8e4e-fd78b7b5c5e4
ROLLBACK_EXECUTED_IN_SUCCESSFUL_RETRY=NO
```

The exact productive version was the already validated candidate `2ee28f09-1aa8-4250-bb2c-ba4684a07791`; no replacement candidate or product rebuild was created for the successful retry.

## Successful release evidence — 2026-08-07

```text
RELEASE_RUN=31158304765;SUCCESS
RELEASE_JOB=92802631707;SUCCESS
RELEASE_ARTIFACT_ID=8986154968
RELEASE_ARTIFACT_SHA256=e81860a54725fa6bec7c3598d38afa82148bc7021f2a3d883dab5d99b49d02ca
RELEASE_MANIFEST_DIGEST=e605bc81121ff3c5c3f300c2e570978a0c108f0dca77f70385443b8a9a33c247
PRODUCTION_CONVERGENCE=20_CONSECUTIVE_PASS
PRODUCTION_CONVERGENCE_ELAPSED_MS=173345
PRODUCTION_CONVERGENCE_FINAL_ROUND=25
CANDIDATE_BROWSER=35_PASS;1_DESKTOP_ONLY_SKIP
PRODUCTION_BROWSER=35_PASS;1_DESKTOP_ONLY_SKIP
PRODUCTION_CONTRACTS=PASS
RETIRED_PUBLIC_ROUTES=9/9_PASS_410
AUTH_SAFE_DISABLED=PASS
VOICE_CAPABILITIES_PRIVACY=PASS
ROUTE_INVALID_GATE=PASS
ROUTE_TERRITORY_GATE=PASS
ROUTE_REAL_GATE=PASS
ROOT_BUILD_CSP_COOKIE_GATE=PASS
```

The full candidate Voice gate also passed real Workers AI STT/tool execution, forged-session rejection, deterministic comparison without fabricated numerical ranking, cancellation, single-use external confirmation, replay rejection and forbidden-token absence.

## Observability classification

```text
OBSERVABILITY=DEGRADED_NO_EVENTS
TAIL_BYTES=0
EXACT_VERSION_TAIL_EVENTS=0
NON_OK_TAIL_OUTCOMES=0
TAIL_EXCEPTIONS=0
EMPTY_TAIL_IS_RUNTIME_FAILURE=NO
```

AUD resolution `5213861215` explicitly reclassified an empty exact-version tail channel as an observability/evidence transport limitation rather than a product failure when direct runtime gates pass and no non-OK outcome or exception is captured. The successful retry therefore remained productive. No rollback was executed.

## GitHub reconciliation

```text
PR31=MERGED
PR31_EXACT_HEAD=1f1e1d323ce8c769816c6e1b529639cbf3af98ad
PRODUCT_MERGE_SHA=89e29622f93919829948ea2b7caed16a297a22f1
PRODUCT_SHA_PRESERVED_AS_MERGE_PARENT=YES
POST_MERGE_RELEASE_POLICY_RUN=31158923948;SUCCESS
POST_MERGE_MAIN_VALIDATION_RUN=31158923995;SUCCESS
PR23=CLOSED_AS_INTEGRATED_BY_ANCESTRY
PR24=CLOSED_SUPERSEDED_UNMERGED
PR27=CLOSED_SUPERSEDED_UNMERGED
```

The merge commit has parents `d31f7497f963ddd761ed3392a634f8017f85ad13` and exact product SHA `1f1e1d323ce8c769816c6e1b529639cbf3af98ad`, preserving release ancestry. Post-merge main validation passed source/release policy, frozen install, typecheck, lint, tests, production build/budgets, Wrangler dry-run, clean-profile local browser gates, read-only production V8 health and production browser smoke.

## Canonical architecture

```text
UI=SVELTE_5
LANGUAGE=TYPESCRIPT_STRICT
BUILD=VITE
RUNTIME=CLOUDFLARE_WORKER_TYPESCRIPT_AND_ASSETS
APP=SPA_PWA
SSR=NO
SVELTEKIT=NO
TAILWIND=NO
MONOLITHIC_HTML_RUNTIME=INACTIVE
PUBLIC_ASSET_POLICY=config/production-assets.json
PRIMARY_VIEWPORTS=360;390;412;430
```

MapLibre, Voice and Auth are optional capabilities. Core destination selection, comparison and truthful unavailable states work without account, microphone or AI. Auth is currently disabled in production.

## Public asset truth boundary

- Every runtime source file under `public/` is classified by `config/production-assets.json`.
- Only the ten current territorial JSON files, PWA/service-worker assets, product mark and approved icon set may be copied from `public/`.
- Generated `index.html` and Vite-hashed JavaScript/CSS are the canonical application bundle.
- Missing, duplicate, retired, unclassified or forbidden legacy product files fail validation.
- Retired legacy routes are intercepted before `ASSETS` and return the exact safe HTTP `410` response.
- Historical product bytes remain in Git history only, not in a Worker-served namespace.

## Product truth boundaries

- The browser does not call Nominatim or OSRM directly.
- A destination becomes operational only with complete authoritative per-item provenance, correct address, validated coordinates, precision and verification date.
- Current authoritative Santa Fe destinations are Terminal de Ómnibus, Estación Belgrano and Puente Colgante; see `docs/data/santa-fe-destination-provenance-2026-08-05.md`.
- Unverified destination results remain visible but disabled and cannot trigger route, fare, map, comparison or provider actions.
- Bus line/stop/direction/frequency/wait/route recommendations remain disabled until current authoritative operational data exists.
- Straight-line distance is labeled as reference and is never represented as a street/walking/cycling route.
- Taxi/remis values are regulated estimates with source and verification date.
- Uber and DiDi numerical price/duration/distance remain `APP_ONLY`/unavailable unless supplied by an allowed verified source; VOY does not fabricate them or numerical cheapest/fastest rankings.
- External provider actions require explicit, expiring, single-use confirmation.
- AI does not calculate canonical routes, distances, durations, fares, availability or rankings.

## Voice and privacy boundaries

```text
VOICE_ENABLED=YES
AUTH_ENABLED=NO
CORE_WITHOUT_LOGIN_VOICE_AI=YES
AUDIO_PERSISTED=NO
TRANSCRIPT_LOGGED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
COLLECTIVE_RECOMMENDATIONS=NO
```

Voice uses typed allowlisted tools and the same fail-closed destination provenance boundary as the UI. No action claim is accepted without successful tool execution. Client-forged mobility snapshots are rejected. Provider confirmation tokens are single-use.

## Validation control plane

Permanent product validation remains repository-defined and auditable:

```text
BRANCH_EXACT_HEAD=.github/workflows/svelte-validation.yml
PULL_REQUEST=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
FINAL_ZERO_TRAFFIC_CANDIDATE=.github/workflows/master-final-candidate.yml
```

The successful production retry used a separately isolated operator workflow on `ops/voy-owner-v4-production-release-01`. Its repair changed only `.github/workflows/voy-owner-v4-production-release.yml`; the product SHA and candidate were unchanged. That operator is release evidence, not product source authority.

## Rollback reference

If a future separately authorized production rollback is required, the retained pre-V8 reference is:

```text
ROLLBACK_VERSION_ID=b4f1833a-f2a1-4a44-b351-13ae48972c20
KNOWN_HEALTH=V7.8.0/1374f09
CURRENT_TRAFFIC=0%
```

This reference is not an authorization to execute a rollback. Any future production mutation requires fresh state reconstruction and the applicable ARQ/AUD/owner gates.

## Terminal state

```text
PRODUCTION_CURRENT_HEALTH=PASS_AT_RELEASE_AND_POST_MERGE_VALIDATION
PRODUCTION_BUILD_MATCHES_RELEASE_SOURCE=PASS
MAIN_CONTAINS_PRODUCTIVE_SHA=PASS
MAIN_CI=PASS_ON_PRODUCT_MERGE
RELEASE_POLICY=PASS
ROLLBACK_REFERENCE=PERSISTED
CURRENT_STATE=RECONCILED
SECRETS_EXPOSED=NO
PAYMENTS_OR_CARD_DATA=NO
EVIDENCE_DELETED=NO
UNAUTHORIZED_PERSISTENT_MUTATION=NO
NEXT_OPERATIONAL_STEP=NONE_FOR_THIS_RELEASE
```

Future work must begin by re-reading this file and re-verifying GitHub, Cloudflare and production rather than treating any runtime identifier here as indefinitely current.
