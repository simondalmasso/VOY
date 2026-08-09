# VOY — Current canonical state

Last reconciled: 2026-08-09

## Authority and source of truth

```text
CANONICAL_STATE=GITHUB
REPOSITORY=simonkey888/VOY
REPOSITORY_WORKLOG=docs/CURRENT_STATE.md
RUNTIME_TRUTH=VERIFIED_PRODUCTION_AND_CLOUDFLARE_EFFECTIVE_STATE
DRIVE=LEGACY_READ_ONLY
NEW_DRIVE_WRITES=NO
ISSUE36_ORDER=VOY-HOVS-TOTAL-PRODUCT-REDESIGN-02
MAP_FIRST_AMENDMENT=5224435211
MAP_FIRST_AUD_PASS=5228862173
TARGETED_ORIGIN_CORRECTION=5229384435
AUD_RESUME_GATE=5229525690
MAP_FIRST_FINAL_AUD=5229717689
MAP_FIRST_FINAL_AUD_RESULT=PASS_NEW_CANDIDATE_0_RECONCILED
INTERMEDIATE_AUD=NO
MERGE_AUTHORIZED=NO
PRODUCTION_PROMOTION_AUTHORIZED=NO
ISSUE_39=NO
```

GitHub remains the canonical persistent state. Production truth has priority over branch state. The targeted map-first origin correction has been validated as a new Cloudflare candidate at zero traffic, independently audited PASS, and has not been merged or promoted.

## Production — unchanged by targeted correction

```text
PRODUCTIVE_SOURCE_SHA=c6aa7302784ce07415949d2b9b1335919ee2cbbd
PRODUCTIVE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
PRODUCTIVE_TRAFFIC=100%
APPLICATION_VERSION=V8.0.0
PRODUCTIVE_BUILD_HASH=c6aa730
BUS_ACTIVATION=OFF
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
MAP_FIRST_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

Production health was independently captured before and after the final candidate operation as `V8.0.0/c6aa730`. The effective Cloudflare deployment leaves the existing stable version at 100% and the new targeted candidate at 0%.

## Issue #36 — targeted origin correction

Work base required by AUD: `d282dc4703b8bc0ff97462f4be03832052cc3e9b`.

```text
BRANCH=feat/map-first-interaction-01
TARGETED_PRODUCT_CORRECTION_SHA=a806bbed528809391024f28a732eed7b8c04162c
TARGETED_BEFORE_SHA=d282dc4703b8bc0ff97462f4be03832052cc3e9b
HARNESS_BEFORE_AFTER_FIX=49bd090561b69b8bcd8beab316c6848a5b605de9
DEPENDENT_BROWSER_HELPERS_FIX=27a1bd8d2c4c6b57ad23ff040b6474f993cab04a
REAL_MAP_HELPER_FIX=20f34c61f7347c4a054d77b73a043025935f1b26
CANDIDATE_SOURCE_SHA=0f76877e445a481137925fb62bfb1620454fe2b8
CANDIDATE_VERSION_ID=6f526066-67a5-4782-95fd-4ec387dc72fe
CANDIDATE_TRAFFIC=0%
CANDIDATE_DEPLOYMENT_ID=de00e22b-20f7-4611-9b09-863aac9ff280
PREVIOUS_DEPLOYMENT_ID=bce377be-d4d9-4f10-af80-840acd9821ea
STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
STABLE_TRAFFIC=100%
STABLE_HEALTH=V8.0.0/c6aa730
CANDIDATE_HEALTH=V8.0.0/0f76877
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

Targeted product behavior now verified:
- initial manual origin input is absent/hidden;
- initial origin offers `Usar mi ubicación` plus compact secondary `Definir origen`;
- `Aplicar` is absent;
- `Definir origen` opens and focuses the manual input;
- denied/unavailable geolocation opens and focuses manual input automatically;
- Enter commits the deterministically geocoded origin;
- Back/Escape closes the transient manual-origin state and restores focus;
- trip planning no longer depends on `origin-apply`;
- manual-open and GPS-denied are independently browser-tested.

No redesign, routing/provider/truth/voice/auth/security behavior change was made by this targeted correction.

## Final pre-candidate gates

The final product + harness head before the R2 operational marker was `20f34c61f7347c4a054d77b73a043025935f1b26`.

```text
MAP_FIRST_QA_RUN=31293316687;SUCCESS
MAP_FIRST_QA_ARTIFACT=9032130652
MAP_FIRST_QA_ARTIFACT_SHA256=13e3744fcc9e9775e274e4d179c4922ca1c30513ad1b73cdd8d462c46c04beff
MAP_FIRST_BROWSER_RUN=31293316685;SUCCESS
MAP_FIRST_BROWSER_ARTIFACT=9032155842
MAP_FIRST_BROWSER_ARTIFACT_SHA256=af3174edcd9cae815b2507d583d7b87f49962a02ba6f3b5565cca87b3c142ede
MAP_FIRST_BEFORE_AFTER_RUN=31293316694;SUCCESS
MAP_FIRST_BEFORE_AFTER_ARTIFACT=9032139901
MAP_FIRST_BEFORE_AFTER_ARTIFACT_SHA256=cf9b3e67c8101967a8b8941f2fdf6e9ebe493338a992c92d6e43900efeba2341
MAP_FIRST_FULL_REGRESSION_RUN=31293316696;SUCCESS
MAP_FIRST_FULL_REGRESSION_ARTIFACT=9032174703
MAP_FIRST_FULL_REGRESSION_ARTIFACT_SHA256=9f39bc7b566fac205188f7346779f683257b7793497c84f18cc8fa74b6b3618a
UNIT_TESTS=204_PASS;0_FAIL
TYPECHECK=PASS
LINT=PASS
BUILD=PASS
ASSET_POLICY=PASS
BUNDLE_BUDGET=PASS
WRANGLER_DRY_RUN=PASS
TARGETED_INITIAL_360x800=PASS
TARGETED_INITIAL_390x844=PASS
MAP_OCCLUSION=PASS
BACK_ESCAPE_FOCUS=PASS
MANUAL_OPEN=PASS
GPS_DENIED=PASS
```

The immutable targeted BEFORE/AFTER uses `d282dc4703b8bc0ff97462f4be03832052cc3e9b` as BEFORE and the corrected branch as AFTER. The AFTER state asserts `origin-input=0` and `origin-apply=0` before any origin interaction.

## Stale-harness failure ledger

The initial targeted BEFORE/AFTER run `31291658451` failed because its helper still expected the intentionally removed initial input + `Aplicar`. AUD comment `5229525690` classified this as stale validation harness, not product regression, and cleared autonomous continuation.

The first rearmed candidate run `31293023116` then exposed one remaining directly dependent stale helper in `browser-tests/map-render-proof.spec.ts`. It failed during the local-browser preflight before any Cloudflare candidate upload. Its failure artifact is:

```text
FAILED_CANDIDATE_PREFLIGHT_RUN=31293023116
FAILED_CANDIDATE_PREFLIGHT_ARTIFACT=9032107242
FAILED_CANDIDATE_PREFLIGHT_ARTIFACT_SHA256=c5ad959b67950ab1181d355e7d126113cd26f18ef4c560f9dce537a490b53293
FAILED_CANDIDATE_PREFLIGHT_CLOUDFLARE_WRITE=NO
```

That helper was migrated without product changes in `20f34c61f7347c4a054d77b73a043025935f1b26`, after which all four pre-candidate gates passed.

## Final Cloudflare targeted candidate evidence

```text
FINAL_CANDIDATE_RUN=31293524692;SUCCESS
FINAL_CANDIDATE_SOURCE_SHA=0f76877e445a481137925fb62bfb1620454fe2b8
FINAL_CANDIDATE_VERSION_ID=6f526066-67a5-4782-95fd-4ec387dc72fe
FINAL_CANDIDATE_DEPLOYMENT_ID=de00e22b-20f7-4611-9b09-863aac9ff280
FINAL_CANDIDATE_TRAFFIC=0%
FINAL_STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
FINAL_STABLE_TRAFFIC=100%
FINAL_CANDIDATE_ARTIFACT_ID=9032330016
FINAL_CANDIDATE_ARTIFACT_SHA256=34c39b61713f04d229f420cdab6710625f16cb0762d5caf5a3d5750239f68407
FINAL_CANDIDATE_MANIFEST_SHA256=e70d641c9071c7287f83989d3401ecb9da50ddd6c1d023a36fdccafa389004a3
FINAL_CANDIDATE_MANIFEST_ENTRIES=131
BINDING_PARITY=16/16_PASS
CONVERGENCE_CONSECUTIVE_ROUNDS=20
CONVERGENCE_DURATION_MS=188080
LOCAL_BROWSER=95_PASS;25_SKIP
CANDIDATE_BROWSER=95_PASS;25_SKIP
LOCAL_REAL_MAP_PIXEL_PROOF=6/6_PASS
LOCAL_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_PIXEL_PROOF=6/6_PASS
CANDIDATE_REAL_MAP_GEOMETRY_PROOF=6/6_PASS
BASEMAP_VISIBLE=YES
ORIGIN_MARKER_VISIBLE=YES
DESTINATION_MARKER_VISIBLE=YES
ROUTE_VISIBLE=YES
OBSERVABILITY=PASS
EXACT_VERSION_TAIL_EVENTS=1833
TAIL_NON_OK=0
TAIL_EXCEPTIONS=0
BENIGN_CLIENT_CANCELLATIONS=0
PRODUCTION_PROMOTED=NO
ROLLBACK_EXECUTED=NO
```

The final candidate pipeline repeated deterministic source checks, local browser with real basemap, production baseline capture, version upload, 16/16 binding parity, stable/candidate split deployment, 20 consecutive converged rounds over 188.08 seconds, candidate API/voice/retired-route checks, full candidate browser with real basemap and exact-version tail analysis.

The downloaded 6,008,346-byte artifact independently matches GitHub artifact digest `sha256:34c39b61713f04d229f420cdab6710625f16cb0762d5caf5a3d5750239f68407`; its `manifest.sha256` contains 131 entries and hashes to `e70d641c9071c7287f83989d3401ecb9da50ddd6c1d023a36fdccafa389004a3`.

## Real-map / mobile evidence

Candidate evidence includes real-map geometry and pixel proofs for six browser projects including `360x800`, `390x844` and desktop. Candidate 360x800 and 390x844 initial captures show only `Usar mi ubicación` + `Definir origen` in the origin block, with no manual input and no `Aplicar`. Separate real-map captures verify non-flat CARTO basemap, origin marker, destination marker and route rendering.

Map-first interaction properties remain verified:
- search/results are dismissible with Back/Escape;
- geolocation is not requested automatically on load;
- GPS denial progressively exposes manual origin;
- decision sheet remains `peek / half / expanded` and reversible;
- sheet drag does not continuously recenter the map;
- provider confirmation preserves camera and temporarily owns interaction hierarchy;
- mobile map occlusion threshold passes at critical sizes;
- mobile keyboard/search removes competing sheet chrome without horizontal overflow;
- real interactive hit areas remain at least 44px;
- reduced-motion behavior remains bounded.

## Mobility truth after candidate operation

```text
MOBILITY_TRUST_API=PASS
SANTA_FE_BUS_ACTIVATION=OFF
BUS_REASON=NO_ACCEPTED_AUTHORITATIVE_GTFS_WITH_VERIFIED_LICENSE_AND_FRESHNESS
MOBILITY_DATABASE_ROLE=DISCOVERY_ONLY
GTFS_VALIDATOR=MobilityData_gtfs-validator_v8.0.1
GTFS_VALIDATOR_SHA256=19293ddd9b6f954f216d4f12054bd8a3232921751c4484339e339764a91000e2
AUTH_ENABLED=NO
PERSISTENT_ACCOUNT=NO
TRIP_HISTORY_PERSISTED=NO
```

Permanent invariants remain:
- browser does not call Nominatim, OSRM or Mobility Database directly;
- BUS stays disabled without verified source/license/freshness/validation;
- APP_ONLY providers expose no fabricated numeric fare;
- AI does not calculate canonical routes, fares, times, availability or rankings;
- external actions require explicit expiring single-use confirmation;
- audio/transcripts/exact-location history are not persistently stored;
- VOY works without login, voice or AI.

## Final independent AUD checkpoint

Issue #36 comment `5229717689` independently reviewed the new zero-traffic candidate and returned:

```text
AUD_RESULT=PASS_NEW_CANDIDATE_0_RECONCILED
AUD_COMMENT=5229717689
AUD_CANDIDATE_SOURCE_SHA=0f76877e445a481137925fb62bfb1620454fe2b8
AUD_CANDIDATE_VERSION_ID=6f526066-67a5-4782-95fd-4ec387dc72fe
AUD_CANDIDATE_TRAFFIC=0%
AUD_STABLE_VERSION_ID=9273abef-69ab-451f-b2f0-ace4c8fd3bdd
AUD_STABLE_TRAFFIC=100%
MERGE=NO
PRODUCTION_PROMOTION=NO
ROLLBACK=NO
ISSUE_39=NO
```

No repository-driven Cloudflare mutation was found after final candidate run `31293524692`; the Map-First candidate workflow still has that run as its newest execution, and alternate production/candidate workflows have older latest runs. Direct Cloudflare control-plane state outside repository-driven automation remains subject to runtime re-verification before any future material action.

## Historical anchors

```text
ISSUE34_TERMINAL_AUD=5217823220
ISSUE34_PR37_MERGE_SHA=f9cbecc6761048fc1fabb0c4135e7b5568c840c2
ISSUE36_AUDITED_DESIGN_HEAD=27c5f0395241d5eff9fac0202f1e7ded9cc24d31
ISSUE36_MAP_FIRST_AMENDMENT=5224435211
ISSUE36_MAP_FIRST_AUD_PASS=5228862173
ISSUE36_TARGETED_ORIGIN_CORRECTION=5229384435
ISSUE36_AUD_RESUME_GATE=5229525690
ISSUE36_MAP_FIRST_FINAL_AUD=5229717689
HISTORICAL_CANDIDATE_VERSION_ID=1610c90d-c06c-48b4-af9c-54979990f124
HISTORICAL_CANDIDATE_ROLE=HISTORICAL_EVIDENCE_ONLY
```

## Next authorized sequence

```text
TARGETED_ORIGIN_CORRECTION=COMPLETE
NEW_MAP_FIRST_CANDIDATE_0_PERCENT=VALIDATED
INDEPENDENT_AUD=PASS_NEW_CANDIDATE_0_RECONCILED
MERGE=NO
PRODUCTION_PROMOTION=NO
ROLLBACK=NO
ISSUE_39=NO
NEXT=ARQ_AUTHORIZATION_BOUNDARY
```
