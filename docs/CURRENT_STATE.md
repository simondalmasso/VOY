# VOY — Current canonical state

Last reconciled: 2026-08-07

## Authority and active hotfix status

```text
CANONICAL_STATE=GOOGLE_DRIVE
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
PRIMARY_STATE_FILE=docs/CURRENT_STATE.md
CONTROL_ISSUE=32
CANONICAL_PRODUCT_PR=31;MERGED
CANONICAL_HOTFIX_PR=33;OPEN_DRAFT
HOTFIX_BASE_MAIN=ed018f3bc6f6cc276e36d8eeeb91dac2cc11d7d9
PRODUCT_SOURCE_SHA=1f1e1d323ce8c769816c6e1b529639cbf3af98ad
PRODUCT_MERGE_SHA=89e29622f93919829948ea2b7caed16a297a22f1
ACTIVE_ORDER=VOY-POST-RELEASE-MAP-MOBILE-UI-HOTFIX-01
ACTIVE_AUD_BLOCK=ISSUE_32
PREVIOUS_RELEASE_AUD_RESOLUTION=5213861215
PREVIOUS_RELEASE_ARQ_AUTHORIZATION=5213939139
PREVIOUS_CONTROLLING_OWNER_ORDER=5212681430
RELEASE_STATUS=PRODUCTION_V8_STABLE_HOTFIX_CANDIDATE_PENDING
```

Issue #32 is the current material workstream. Production V8 remains the runtime truth while this hotfix is built. Runtime identifiers remain current only when re-queried from Cloudflare/production or retained by immutable release evidence.

## Active post-release hotfix #32

```text
ORDER_ID=VOY-POST-RELEASE-MAP-MOBILE-UI-HOTFIX-01
HOTFIX_BRANCH=hotfix/voy-post-release-map-mobile-ui-01
HOTFIX_PR=33
SOURCE_VALIDATION_RUN_INITIAL=31162952761;SUCCESS
RELEASE_POLICY_RUN_INITIAL=31162952762;SUCCESS
SOURCE_VALIDATION_RUN_WITH_OPERATOR=31163149911;SUCCESS
RELEASE_POLICY_RUN_WITH_OPERATOR=31163149962;SUCCESS
MAP_CAUSE=MAPLIBRE_LOAD_ACCEPTED_WITHOUT_PROVING_RASTER_TILE_SUCCESS_AND_MAP_ERRORS_WERE_IGNORED
MAP_FIX=READY_REQUIRES_STYLE_SOURCE_AND_TILES_LOADED;ERROR_OR_TIMEOUT_SHOWS_EXPLICIT_FALLBACK
BASEMAP=CARTO_LIGHT_RASTER_SUBDOMAINS_A_B_C_D
APP_PROVIDER_PRICE_UI=UBER_DIDI_NONE
APP_PROVIDER_ETA=UBER_DIDI_NULL_UNLESS_PROVIDER_SPECIFIC_VERIFIED_SOURCE_EXISTS
MOBILE_DENSITY=SELECTED_DESTINATION_AND_ORIGIN_COMPACT_WITH_48PX_CONTROLS
CANDIDATE_TARGET=ONE_EXACT_HEAD_HOTFIX_VERSION_AT_0_PERCENT
PRODUCTION_PROMOTION_AUTHORIZED=NO
PRODUCTION_V8_MUST_REMAIN_100_PERCENT=YES
NEXT_OPERATIONAL_STEP=CREATE_AND_VALIDATE_EXACT_HEAD_HOTFIX_CANDIDATE_AT_0_PERCENT_THEN_AUD_POST_HOTFIX_REVIEW
```

The deterministic browser suite now has separate basemap paths: mocked successful raster loading, forced tile failure that must expose a fallback instead of a blank ready map, and a candidate-only real-network CARTO gate. Candidate evidence also records measured destination/origin heights, first-fold map visibility and before/after screenshots. No browser Nominatim or OSRM call is introduced.

## Current production baseline retained during hotfix

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

The exact productive version remains the previously validated candidate `2ee28f09-1aa8-4250-bb2c-ba4684a07791`. The hotfix candidate operator fails closed unless fresh Cloudflare deployment state still has that exact version at 100%, no unexpected nonzero version, and public health `V8.0.0 / 1f1e1d3` before upload.

## Successful V8 release evidence — 2026-08-07

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

The full V8 candidate Voice gate also passed real Workers AI STT/tool execution, forged-session rejection, deterministic comparison without fabricated numerical ranking, cancellation, single-use external confirmation, replay rejection and forbidden-token absence.

## Observability classification

```text
OBSERVABILITY=DEGRADED_NO_EVENTS
TAIL_BYTES=0
EXACT_VERSION_TAIL_EVENTS=0
NON_OK_TAIL_OUTCOMES=0
TAIL_EXCEPTIONS=0
EMPTY_TAIL_IS_RUNTIME_FAILURE=NO
```

AUD resolution `5213861215` reclassified an empty exact-version tail channel as an observability/evidence transport limitation rather than a product failure when direct runtime gates pass and no non-OK outcome or exception is captured. The hotfix candidate operator preserves that rule: non-OK outcomes/exceptions fail, while a genuinely empty tail is recorded as degraded observability and does not fabricate a runtime failure.

## GitHub V8 reconciliation history

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

The V8 merge commit preserved exact productive source ancestry. Post-merge validation passed source/release policy, frozen install, typecheck, lint, tests, build/budgets, Wrangler dry-run, clean-profile local browser gates, read-only production V8 health and production browser smoke.

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
- Uber and DiDi keep internal `APP_ONLY` price truth but expose no price UI or accessible price copy; their ETA is null unless a provider-specific verified source exists. Generic route duration is not an Uber/DiDi ETA.
- External provider actions require explicit, expiring, single-use confirmation.
- AI does not calculate canonical routes, distances, durations, fares, availability or rankings.

## Map truth boundary

- CARTO raster tiles are presentation-only basemap data; they never calculate route, distance, time, fare, availability or ranking.
- Basemap requests use documented `a`/`b`/`c`/`d.basemaps.cartocdn.com` light raster endpoints already allowed by the production CSP.
- Map state is not `ready` merely because the style loaded. Ready requires MapLibre style loaded, basemap source loaded and visible tiles loaded.
- A basemap error or readiness timeout produces an explicit fallback message; deterministic trip comparison remains usable.
- Origin/destination markers and verified OSRM route geometry remain separate deterministic overlay layers.

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

```text
PULL_REQUEST=.github/workflows/pr-validation.yml
MAIN_READ_ONLY_VALIDATION=.github/workflows/deploy.yml
RELEASE_POLICY=.github/workflows/release-policy-check.yml
HOTFIX_ZERO_TRAFFIC_CANDIDATE=.github/workflows/hotfix-map-mobile-candidate.yml
HOTFIX_CANDIDATE_OPERATOR=scripts/run-hotfix-candidate.sh
```

The hotfix candidate workflow is branch-specific and does not run unless the exact branch head commit message contains `[hotfix-candidate]`. It may upload one exact-head Worker version and create a deployment containing current V8 at 100% plus the hotfix at 0%; it contains no production-promotion path.

## Rollback reference

If a future separately authorized production rollback is required, the retained pre-V8 reference is:

```text
ROLLBACK_VERSION_ID=b4f1833a-f2a1-4a44-b351-13ae48972c20
KNOWN_HEALTH=V7.8.0/1374f09
CURRENT_TRAFFIC=0%
```

This reference is not an authorization to execute a rollback. Any future production mutation requires fresh state reconstruction and the applicable ARQ/AUD/owner gates.

## Hotfix safety state before candidate creation

```text
PRODUCTION_CURRENT_HEALTH=REVERIFY_IN_CANDIDATE_PREFLIGHT
PRODUCTION_BUILD_MATCHES_RELEASE_SOURCE=REVERIFY_IN_CANDIDATE_PREFLIGHT
MAIN_BASE_SHA=ed018f3bc6f6cc276e36d8eeeb91dac2cc11d7d9
PR33_SOURCE_AND_BROWSER_CI=PASS_BEFORE_FINAL_TRIGGER
RELEASE_POLICY=PASS_BEFORE_FINAL_TRIGGER
ROLLBACK_REFERENCE=PERSISTED
GOOGLE_DRIVE=V8_TERMINAL_STATE_READ_BEFORE_HOTFIX
SECRETS_EXPOSED=NO
PAYMENTS_OR_CARD_DATA=NO
EVIDENCE_DELETED=NO
UNAUTHORIZED_PERSISTENT_MUTATION=NO
PRODUCTION_PROMOTION=PROHIBITED_PENDING_POSTFIX_AUD_PASS
NEXT_OPERATIONAL_STEP=HOTFIX_CANDIDATE_0_PERCENT_THEN_AUD_POST_HOTFIX_REVIEW
```

Final candidate IDs, exact final source SHA, artifact digest, real-network basemap proof and measured mobile geometry are persisted by the candidate artifact and then mirrored to issue #32, PR #33 and canonical Drive without another source commit, so the candidate remains exact-head.
