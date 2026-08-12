# VOY — Map-First candidate reconciliation — 2026-08-10

This document records the Workers-first runtime reconciliation without replacing or deleting historical evidence in `docs/CURRENT_STATE.md`.

## Runtime identity

```text
RESULT=MAP_FIRST_CANDIDATE_0_REBUILT_AND_RUNTIME_VERIFIED
SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
CANDIDATE_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
CANDIDATE_DEPLOYMENT_ID=033940e9-cae2-4d70-934d-7e95668e40ed
CANDIDATE_TRAFFIC=0%
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
PRODUCTION_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTION_HEALTH=V8.0.0/c6aa730
```

## Candidate workflow

```text
WORKFLOW_RUN=31393924613
CONCLUSION=SUCCESS
ARTIFACT_ID=9065228247
ARTIFACT_SHA256=e252a16e7aa712558f19aefd2a8055b1d50de0ee4abea80626f51957dd05626f
```

The candidate workflow performed exact-head validation, release-policy validation, frozen install, deterministic tests, build, asset/budget checks, Wrangler dry-run, local browser validation, production baseline capture, Workers version upload, 0% deployment, convergence, API/voice/retired-route validation, candidate browser validation, real-map pixel/geometry validation, exact-version tail analysis and zero-traffic contract verification.

## Final gates

```text
UNIT=204_PASS/0_FAIL
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
ASSET_POLICY=PASS
BUNDLE_BUDGET=PASS
WRANGLER_DRY_RUN=PASS
LOCAL_BROWSER=95_PASS/25_SKIP
CANDIDATE_BROWSER=95_PASS/25_SKIP
LOCAL_REAL_MAP_PIXEL=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY=6/6_PASS
BASEMAP_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
ROUTE_VISIBLE=YES
BINDING_PARITY=PASS
CONVERGENCE_ROUNDS=20
CONVERGENCE_DURATION_MS=214721
EXACT_VERSION_TAIL_EVENTS=1883
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
BENIGN_CLIENT_CANCELLATIONS=0
MOBILITY_TRUST=PASS
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
MERGE=NO
```

## Workers-first result

Cloudflare now has the reconstructed Map-First candidate `002c464c-15fa-42f3-a762-0214a1dc5cf3` at 0%, with stable `9273abef-69ab-451f-b2f0-ace4c8fd3bdd` unchanged at 100%. The candidate deployment is `033940e9-cae2-4d70-934d-7e95668e40ed`. Production remained `V8.0.0/c6aa730`.

The previous candidate `6f526066-67a5-4782-95fd-4ec387dc72fe` remains historical evidence. The new candidate is the current reconstructed candidate for this reconciliation.

## Authority boundary

No merge, production promotion, rollback, DNS, secrets or bindings mutation was performed. BUS remains OFF. Issue #39 remains deferred.

Issue #36 reconciliation comment: `5241214063`.
