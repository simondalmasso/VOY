# VOY — Map-First production reconciliation — 2026-08-12

## Result

```text
RESULT=MAP_FIRST_PRODUCTION_PROMOTED_AND_VERIFIED
SOURCE_SHA=796c9355cc22a2e197ee719a15b506b5a3cb22b3
PRODUCTION_VERSION_ID=002c464c-15fa-42f3-a762-0214a1dc5cf3
PRODUCTION_DEPLOYMENT_ID=5097c615-e19c-43ff-8b93-f9eb6115713c
PRODUCTION_TRAFFIC=100%
PREVIOUS_STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PREVIOUS_STABLE_TRAFFIC=0%
APPLICATION_VERSION=V8.0.0
PRODUCTION_BUILD_HASH=796c935
ROLLBACK_EXECUTED=NO
```

Cloudflare Workers was changed first. GitHub reconciliation follows that verified runtime state.

## Promotion and recovery sequence

The first guarded V2 production workflow (`31649501071`) passed its source, candidate, browser and Cloudflare preflight gates but its promotion shell block had a parse error before any production write; it therefore did not mutate Cloudflare.

The V3 workflow (`31650318280`) revalidated the same immutable Map-First source and candidate. Its production command successfully changed the Cloudflare traffic split to:

```text
9273abef-69ab-451f-b2f0-ace4c8fd3bdd = 0%
002c464c-15fa-42f3-a762-0214a1dc5cf3 = 100%
```

V3 then failed because its verifier required the new public build hash on the first post-write request instead of allowing edge propagation. That failure was in the promotion harness, not evidence of a product regression. No V3 rollback ran.

V4 (`31651286356`) fixed that verifier by separating control-plane state from edge health, arming rollback before post-promotion validation, and allowing bounded convergence. At V4 entry both the effective control plane and public health already reported the Map-First production version, so V4 did not issue another production deployment.

## Final production verification

```text
FINALIZATION_RUN=31651286356;SUCCESS
ENTRY_CONTROL=candidate
ENTRY_HEALTH=candidate
ENTRY_ALREADY_PROMOTED=YES
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=140433
PUBLIC_BROWSER=95_PASS;25_SKIP
UNIT_TESTS=204_PASS;0_FAIL
TYPECHECK=PASS
LINT=PASS
RELEASE_POLICY=PASS
PRODUCTION_TAIL=PASS
TAIL_EXACT_VERSION_EVENTS=>=1
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
MOBILITY_TRUST=PASS
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
ROLLBACK_EXECUTED=NO
```

The public production browser suite covered the Map-First interaction contract on mobile and desktop, including the targeted origin correction: manual origin hidden initially, `Usar mi ubicación` + `Definir origen`, no `Aplicar`, explicit manual-open, GPS denial fallback, Enter commit, Back/Escape focus restoration, map occlusion, camera/sheet behavior, real basemap, route/markers and external-action confirmation behavior.

## Immutable evidence

```text
PRODUCTION_EVIDENCE_ARTIFACT_ID=9162802913
PRODUCTION_EVIDENCE_ARTIFACT_SHA256=cba8f19d15da7dfba8da0de1961ae92fce04ac6ad121f9aaf8675e9f3fc190db
PRODUCTION_EVIDENCE_FILE_COUNT=98
```

The artifact remains in GitHub Actions. It was not uploaded into the ChatGPT conversation.

## Preserved invariants

```text
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
AUTH_ENABLED=NO
NO_NEW_CITY=YES
NO_DNS_CHANGE=YES
NO_SECRET_CHANGE=YES
NO_BINDING_CHANGE=YES
NO_PERSISTENT_DATA_MUTATION=YES
```

Map-First remains bounded to the already validated Santa Fe product and the targeted origin interaction correction. No additional redesign, route logic, provider truth, pricing logic, authentication, security, DNS, secrets, bindings or persistent-data changes were introduced by the production promotion.

## GitHub reconciliation

The production runtime above is the authoritative state. GitHub must now be reconciled to this exact source/version/deployment without triggering a second production deployment. The previous zero-traffic candidates remain historical evidence.