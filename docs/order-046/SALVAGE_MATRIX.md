# ORDER-046 — National salvage matrix

Status: canonical execution evidence for `feat/order-046-serious-product`.

## Frozen baseline

```text
ORDER=46
BASE_MAIN=224403d8729eee6ffcb4fe1b6d183ac40526853c
WORK_BRANCH=feat/order-046-serious-product
WORK_BRANCH_AT_FREEZE=224403d8729eee6ffcb4fe1b6d183ac40526853c
WORK_BRANCH_VS_MAIN=IDENTICAL
HISTORICAL_BRANCH=feat/argentina-national-product-01
HISTORICAL_HEAD=698319bab86143555b9e4150ee35b43bdc9b847d
HISTORICAL_MERGE_BASE=ce83145c3e9a2bb08d100472c771ebdbcab3f68a
HISTORICAL_COMMITS=22
HISTORICAL_FILES_DELTA=35
BLIND_MERGE=NO
```

## Reconstructed production / Cloudflare anchor before editing

Evidence chain:

```text
PRODUCTIVE_SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
PRODUCTIVE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PRODUCTIVE_DEPLOYMENT_ID=5097c615-e19c-43ff-8b93-f9eb6115713c
PRODUCTIVE_TRAFFIC=100%
APPLICATION_VERSION=V8.0.0
PRODUCTIVE_BUILD_HASH=796c935
ROLLBACK_REFERENCE=9273abef-69ab-451f-b2f0-ace4c8fd3bdd@0%
```

The exact productive source's `wrangler.jsonc` declares:

```text
ASSETS=Workers static assets binding
AI=Workers AI binding
VOY_METRICS=Analytics Engine dataset voy_metrics
NOMINATIM_COORDINATOR=Durable Object NominatimCoordinator
VOY_VOICE_ENABLED=true
CRON=0 6 * * 1
```

The candidate for this exact source recorded `BINDING_PARITY=PASS`; the later production promotion recorded `NO_BINDING_CHANGE=YES`. Fresh public runtime observation in Issue #46 handoff 5355881091 reports `build_hash=796c935`, `voice:true`, `auth:false`, `robots.txt=200`, and Santa-Fe packaging. Therefore source/version/deployment/public build identity are mutually consistent at this freeze point.

Observed drift versus the initial prose in Issue #46 is real, but its cause is **NO_VERIFICADA**. The issue's earlier architecture statement names `VOICE_COPILOT`, `DB`, and `AI_RATE_LIMIT`, whereas the exact productive source and current main declare `ASSETS`, `AI`, `VOY_METRICS`, and `NOMINATIM_COORDINATOR`. Do not attribute that mismatch to either interrupted ARQ: neither persisted ORDER-046 product commits. Historical release/reconciliation evidence shows later Map-First production activity, but this matrix records only the verified state transition evidence, not an inferred causal narrative.

## Commit salvage classification

| # | Historical commit | Classification | Reason / ORDER-046 treatment |
|---|---|---|---|
| 1 | `960c81fade80bbf10da18ef461156b2b7ad6c945` `feat(issue43): establish Argentina territorial core` | PORT | Core 24-jurisdiction/territorial architecture remains canonical; port onto fresh main rather than merge history. |
| 2 | `4ed06b7dce41d49c4916bd02e712011cc3fc3ddd` `ci(issue43): add exact-head national validation gate` | REWRITE | Preserve fail-closed exact-head intent, rename/reconcile for ORDER-046 and current test inventory. |
| 3 | `fe8a710797c1042bb31f78d241337ed42a0c91c3` `ci(issue43): persist exact-head validation result` | DROP_WITH_REASON | Result is evidence for an obsolete historical head, not executable product truth for ORDER-046. Historical Git commit remains immutable evidence. |
| 4 | `4b7feb23cde8ce7c89d3464c361a8f4da124f92c` `fix(issue43): correct territory test fetch typing` | PORT | Fold the type-correct behavior into the ported territory tests. |
| 5 | `143f13ee5a8811d38af37811589be01894527bd4` `test(issue43): isolate national route geometry rejection` | PORT | Adversarial route-geometry rejection remains required. |
| 6 | `bbb402fa563494272cb2f07437fccfcffb718229` `feat(issue43): nationalize client territory and coverage isolation` | PORT | Preserve territorial context and no cross-city leakage; adapt to current Map-First UI. |
| 7 | `0dc1a9ac7f90bd9bce6432128b9a89c07db00608` `fix(issue43): accept derived coverage key at provider boundary` | PORT | Required for deterministic territorial provider boundary; retain explicit truth state. |
| 8 | `111417f08b0b35082daa231489ef7cc65c85168f` `test(issue43): pin provider truth to explicit territory` | PORT | Directly supports no-fake-availability invariant. |
| 9 | `884d5406d9ba3ec970f04a436a63cf3ab59ab410` `fix(issue43): keep app-only copy free of price implication` | PORT | Directly preserves APP_ONLY/no-fake-price truth. |
| 10 | `1819364d682d6248090742bcfc9f817d9de86009` `feat(issue43): nationalize public packaging and coverage truth` | REWRITE | National positioning is retained, but ORDER-046 supersedes identity, trust surfaces and metadata details. |
| 11 | `f742016d5e8b2c97732263775cbee09b8428bcc3` `feat(issue43): default map context to Argentina` | PORT | National map context is required; preserve Santa Fe as validated overlay rather than product boundary. |
| 12 | `f3e0eeec9089717c9ee9a91cf1bd9e3b4ff313ba` `fix(issue43): scope voice session to active territorial overlay` | REWRITE | Intent remains valid; current voice runtime/topology differs and must be integrated against current main. |
| 13 | `ce7a45d922bb01331225bd7fb0f1eb7759d5cd9b` `fix(issue43): derive voice territory from active coverage` | REWRITE | Same territorial safety invariant, rewritten to current voice contract and feature flags. |
| 14 | `22a95def1ece45a4b0e99ad9f787473fce85706b` `test(issue43): add national territory matrix` | PORT | Required 24/24 jurisdiction matrix; expand to ORDER-046 ambiguity/adversarial cases. |
| 15 | `fb8b821ffda7d7b7d89e30c89d64b23d1dfa0cff` `test(issue43): add national browser and Santa Fe regression gate` | REWRITE | Preserve national + Santa Fe regression coverage, but rebuild on current interaction contract and remove retired-selector assumptions. |
| 16 | `6447adcc9d0262f8abea8e3b842aeac8f5f99919` `test(issue43): gate national packaging truth` | REWRITE | Keep assertions but update expected manifest/brand/public surfaces to ORDER-046. |
| 17 | `3b492b98f22a88885f9ef915eec70dbdc87a8e62` `ci(issue43): gate national browser and Santa Fe regression` | REWRITE | Reconcile into one ORDER-046 full matrix, not a parallel historical workflow. |
| 18 | `5ddf8047558ffb39e290ad27e9cdcaf27bb8d379` `fix(issue43): decouple browser harness Wrangler runtime` | REWRITE | Preserve deterministic harness isolation only where still required by current pinned tooling. |
| 19 | `581257fb524dd711d72c1adac8ae743cf39c654e` `fix(issue43): pin compatible Wrangler for national browser harness` | REWRITE | Do not carry an old tool workaround blindly; pin/reconcile current compatible toolchain after frozen install. |
| 20 | `0154e7a3f73fb0c8e5322bf078d000995015d231` `fix(issue43): avoid retaining exact route coordinates in memory` | PORT | Privacy invariant is still mandatory and becomes part of ORDER-046 storage/analytics tests. |
| 21 | `787dd1b645e0438351132fe0fc5ec04ddcf028a2` `test(issue43): nationalize candidate runtime API gate` | REWRITE | Preserve runtime API assertions and add auth/trust/public-surface/order46 schemas. |
| 22 | `698319bab86143555b9e4150ee35b43bdc9b847d` `ci(issue43): add fail-closed national candidate zero workflow` | REWRITE | Preserve candidate-at-0% discipline, but bind it to ORDER-046 exact head/current bindings/full matrix. |

## File salvage classification

| Historical delta | Classification | Reason / treatment |
|---|---|---|
| `.env` removal | PORT | Remove tracked local env; add safe `.env.example`; no history rewrite absent a live-secret finding. |
| `.github/workflows/issue43-national-candidate.yml` | REWRITE | ORDER-046 exact-head 0% candidate workflow. |
| `.github/workflows/issue43-national-validation.yml` | REWRITE | ORDER-046 full reconciled validation workflow. |
| `README.md` | REWRITE | Professional national README, actual runtime/truth/privacy/coverage only. |
| `browser-tests/issue43-national.spec.ts` | REWRITE | Current interaction contract, 8 viewport matrix, account/auth states, Santa Fe regression. |
| `browser-tests/playwright.config.ts` | REWRITE | Integrate current Map-First harness without historical tool assumptions. |
| `config/production-assets.json` | REWRITE | National public/runtime asset registry; retain truthful local overlays only. |
| `docs/research/argentina-national-mobility-source-matrix-2026-08-20.md` | PORT | Preserve as research evidence; volatile operational claims remain non-operational until freshly verified. |
| `index.html` | REWRITE | VOY Argentina metadata, canonical/local SVG identity, social metadata. |
| `public/manifest.json` | REWRITE | National PWA positioning/icons/description. |
| `public/social-card.svg` | REWRITE | Rebuild from canonical VOY vector identity/product UI. |
| `scripts/svelte-candidate-api-gate.mjs` | REWRITE | Expand to ORDER-046 runtime schemas and exact-head truth. |
| `src/App.svelte` | REWRITE | Current Map-First composition wins; integrate territory/trust/account surfaces without reverting UI. |
| `src/components/DestinationSearch.svelte` | REWRITE | Port national resolution behavior into current interaction contract. |
| `src/components/MapViewport.svelte` | REWRITE | Retain proven real-map fixes and add national context; never wholesale overwrite current main. |
| `src/components/OriginControl.svelte` | REWRITE | Preserve current progressive-origin contract; add territory behavior safely. |
| `src/components/TripDecisionSheet.svelte` | REWRITE | Integrate territorial truth/capability states without regressing current decision hierarchy. |
| `src/components/VoiceAssistant.svelte` | REWRITE | Apply minimal assistant identity and current feature-flag/runtime contract. |
| `src/core/coordinates.ts` | PORT | Replace Santa-Fe-only boundary with Argentina/territory-safe deterministic validation. |
| `src/core/territory.ts` | PORT | Canonical territorial model/registry base. |
| `src/features/destination/destination.service.ts` | PORT | National deterministic destination resolution; adapt current service contracts. |
| `src/features/destination/destination.types.ts` | PORT | Territory/provenance fields retained and reconciled. |
| `src/features/providers/provider.registry.ts` | REWRITE | Build territorial capability broker and canonical fare/quote classes; no implicit brand availability. |
| `src/features/trip/trip.service.ts` | PORT | Territory-safe routing/comparison integration; canonical deterministic values only. |
| `src/features/voice/voice.client.ts` | REWRITE | Current feature flags/territory context/assistant identity. |
| `tests/nationalPackaging.test.ts` | REWRITE | ORDER-046 national branding/PWA/public surface expectations. |
| `tests/nationalTerritoryMatrix.test.ts` | PORT | 24/24 and representative-locality matrix; expand adversarial coverage. |
| `tests/providerRegistry.test.ts` | REWRITE | Capability broker/truth/fare classes/unknown-vs-unavailable. |
| `tests/routeWorker.test.ts` | PORT | National route boundary, malformed/timeout/upstream truth cases. |
| `tests/territory.test.ts` | PORT | Territory registry/ambiguity/CABA-vs-PBA tests. |
| `worker/index.ts` | REWRITE | Register current ORDER-046 APIs while preserving current runtime routes/security. |
| `worker/lib/georef.ts` | PORT | GeoRef V2 normalization/territorial identity; keep mobility availability separate. |
| `worker/routes/geocode.ts` | PORT | Worker-only AR geocode boundary/ambiguity/provenance. |
| `worker/routes/route.ts` | PORT | Remove Santa-Fe global bbox assumptions; maintain server-side OSRM boundary and honest failure states. |
| `worker/routes/territory.ts` | PORT | Typed territory endpoint/registry boundary. |

## Salvage invariants

```text
OLD_BRANCH_WHOLESALE_MERGE=PROHIBITED
CURRENT_MAIN_MAP_FIRST_UI=BASELINE
SANTA_FE_VALIDATED_OVERLAY=PRESERVE
NATIONAL_ARCHITECTURE_DOES_NOT_EQUAL_LOCAL_COVERAGE
UNKNOWN_NE_UNAVAILABLE
APP_ONLY_HAS_NO_FAKE_NUMERIC_PRICE
NO_BROWSER_NOMINATIM_OR_OSRM
AI_NOT_CANONICAL_FOR_ROUTE_FARE_TIME_AVAILABILITY_RANKING
NO_EXACT_ROUTE_OR_LOCATION_PERSISTENCE
WORKFLOWS_AND_EVIDENCE_ARE_REBUILT_FOR_ORDER_046
```

This matrix is an execution ledger, not a claim that the classified code has already been ported. Each `PORT` or `REWRITE` remains open until its resulting ORDER-046 implementation is committed and validated on the current work branch.
