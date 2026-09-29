# ORDER-070 — Cloudflare quota hardening before deploy

## Status

`BLOCKED_REAL` only on the required fresh Chrome + Edge / final GitLab pipeline gate.

The implementation itself is complete on the branch and its non-browser functional verification passed. The final HEAD pipeline could not start because GitLab returned `ci_quota_exceeded` before assigning a runner. No paid capacity was enabled.

- BASE_HEAD: `3f3ee169b4660c3ab6d9393ba77187825569adce`
- Branch: `perf/order-070-cloudflare-quota-budget`
- Functional implementation SHA: `08e29612f1024d03b5469fc298f6aeaade66218f`
- Current HEAD: `2dc181a863438d1d408eeda7ee9090c9c6cf8092`
- Draft MR: `!8` -> `feat/order-069-mode-facts-santa-fe`
- Merge: **NO**
- Cloudflare deploy attempts: **0**
- Cloudflare runtime probes: **0**
- Production mutation: **NO**
- New runtime dependencies: **0**

## Before / after request matrix

| Journey event | Before ORDER-070 | ORDER-070 design/current code |
| --- | ---: | ---: |
| healthy page-load browser telemetry | 1 on successful SW registration | 0 |
| geolocation reverse | 1 | 1 |
| Santa Fe train radar | 1 | 0 |
| final destination suggest | >=1, 220 ms typeahead without session result cache | 1, 400 ms debounce |
| identical repeat suggest inside TTL | +1 | +0 by exact session-memory cache |
| destination resolve | 1 | 1 |
| mobility compute | 1 | 1 |
| healthy Santa Fe dynamic Worker total | >=5 plus typeahead chatter | target **4** |
| DO requests inside one mobility compute | 3 | **1** |
| persistent DO route-cache reads/writes | multiple get/put/delete/list operations | **0 / 0** |

The exact browser budget is encoded in `order070/evidence/browser-budget-audit.mjs`. Its execution on the current HEAD is blocked by GitLab CI quota, so the browser totals are not represented as fresh measured Chrome/Edge evidence yet.

## A — healthy browser telemetry removed

`public/app.js` no longer defines or calls `submitTelemetry`, and no browser `fetch('/api/telemetry', ...)` remains.

Removed healthy/nonessential request sources:
- successful service-worker registration telemetry;
- service-worker failure telemetry;
- official/navigation handoff confirm/cancel telemetry;
- map tile failure telemetry.

Server-side request logging remains attached to real Worker requests.

Static HEAD audit:
- search `fetch('/api/telemetry` -> **0 production hits**
- search `submitTelemetry` -> only ORDER-070 negative test, **0 production hits**

## B — destination suggestion debounce/dedupe/cache

Client constants:
- `SUGGEST_DEBOUNCE_MS=400`
- `SUGGEST_CACHE_TTL_MS=45000`
- `SUGGEST_CACHE_MAX=20`

Behavior:
- exact key includes normalized query + search scope + origin revision;
- identical in-flight request reuses one promise;
- successful result is kept only in session-memory `Map`;
- LRU-style bounded eviction keeps max 20 entries;
- no suggestion cache in localStorage;
- origin set/change/clear increments origin revision and clears suggestion cache;
- Enter/select behavior remains on the existing destination flow.

The fresh browser gate contains assertions for:
- continuous typing -> one final suggest;
- repeat identical query -> zero additional suggest calls;
- healthy Santa Fe request total -> four.

Those exact browser assertions remain unexecuted on current HEAD because of `ci_quota_exceeded`.

## C — F1 train radar coverage gate

Static F1 coverage is limited to the three already-supported stations and the existing 8 km radius:
- Once: -34.60827979749716, -58.4075158087721
- Haedo: -34.644477144900506, -58.59194588896136
- Moreno: -34.65055409620922, -58.7896992362823
- radius: 8,000 m

Client:
- `refreshTrainRadar()` checks `trainRadarCoverageSupportedClient(center)` before the POST;
- unsupported origin clears radar and returns;
- Santa Fe Capital therefore does not call `/api/radar/trains/nearby`.

Server defense:
- validates coordinates;
- calls `trainRadarCoverageSupported(payload.coordinates)`;
- unsupported coordinates return `source_status=unsupported`, empty stations, no source;
- only then can `trainServiceAdapter.read()` execute.

ORDER-070 tests cover Santa Fe=false and Once/Haedo/Moreno=true, plus server-side “unsupported => adapter reads 0” and supported “reads exactly 1”.

## D — one DO request per mobility compute

`computeMobilityComputation()` now calls:

`acquireNetworkRoutes(["walking", "bicycle", "auto"], ...)`

For the real production-fetch path this produces one request to the existing `ROUTING_COORDINATOR` stub with:
- `modes=["walking","bicycle","auto"]`;
- one origin;
- one destination.

The coordinator:
- accepts 1–3 modes only;
- rejects duplicate modes;
- rejects unknown modes;
- rejects unbounded lists;
- serializes the whole batch through the existing tail queue;
- serializes upstream mode fetches inside `routeBatch()`;
- records per-mode errors instead of failing truthful sibling modes.

Fresh automated test on functional SHA:
- expected DO calls: **1**
- expected batch modes: walking / bicycle / auto
- result: **PASS**

## E — persistent routing cache removed

The opportunistic 120-second routing cache is now DO-instance memory only:
- `routeCache = new Map()`;
- max 96 entries;
- TTL 120 seconds;
- `lastFetchAt` is memory-only;
- `circuitUntil` is memory-only;
- no `this.state.storage.get`;
- no `this.state.storage.put`;
- no `this.state.storage.delete`;
- no `storage.list`;
- `prunePersistentRouteCacheForInsert` removed.

Automated test injects a storage proxy that throws on any access. Batch routing and cache reuse pass without touching it.

Normal route-path budget:
- `DO_STORAGE_ROWS_READ=0`
- `DO_STORAGE_ROWS_WRITTEN=0`

### Safety argument

No durable product truth lives in the route cache. Eviction/restart can only lose an opportunistic cached route and in-memory rate/circuit state; it cannot change fare facts, provenance, destination truth or route validation.

The coordinator still serializes upstream calls. After a Durable Object instance eviction there was necessarily an inactive instance boundary; resetting opportunistic 1 rps timing does not create a persistent cross-request hot-loop mechanism. Any newly active instance still processes its own batch sequentially and reinstates 1 rps spacing immediately.

## TDD evidence

Initial RED pipeline on `f518d8c337bb8efebf213d9a874676cf22e0ae79`:
- existing tests passing: 185
- ORDER-070 failed because `trainRadarCoverageSupported` did not yet exist
- total: 186 / pass 185 / fail 1

This proved the new contract was absent before implementation.

## Fresh functional verification

Pipeline: `2878984536`
Functional SHA: `08e29612f1024d03b5469fc298f6aeaade66218f`
`r2_verify` job: `16710612888` = **PASS**

Machine evidence:
- tests: **192**
- pass: **192**
- fail: **0**
- build: **PASS**
- package: **PASS**
- package files: **19**
- RELEASE_ID: `order057-08e29612f102-91b8671e`
- BUILD_ID: `91b8671e522047c887502ef4`
- Wrangler: **dry-run only PASS**
- runtime audit: **0 vulnerabilities**

This SHA already includes the production client and worker ORDER-070 changes. The current HEAD adds only the replacement browser/request-budget audit and CI wiring.

## Browser verification state

The pre-ORDER-070 browser job on functional SHA reached Chrome and failed at the old ORDER-069 expectation:

`waitForSelector('#train-radar:not([hidden])')` after a Santa Fe origin.

That failure is consistent with the new required behavior (Santa Fe radar must stay hidden / make zero radar Worker calls), so the obsolete browser gate was replaced.

Current HEAD contains `order070/evidence/browser-budget-audit.mjs`, which verifies on Chrome and Edge:
- desktop 1440x900;
- mobile 390x844;
- MAP-FIRST initial visibility and tile budget;
- four ORDER-069 mode surfaces;
- Auto price unknown + route overlay;
- Santa Fe fare/conditions/ETA disclosure;
- healthy Santa Fe dynamic request count exactly 4;
- telemetry 0;
- Santa Fe radar 0;
- first suggest 1;
- repeat suggest +0;
- mobility compute 1;
- supported Once radar exactly 1;
- no radar polling after render/scroll/mode toggle.

Final HEAD pipeline:
- pipeline: `2879001217`
- SHA: `2dc181a863438d1d408eeda7ee9090c9c6cf8092`
- `r2_verify`: not started
- `order070_browser`: not started
- both jobs: `failure_reason=ci_quota_exceeded`
- runner: none assigned
- duration: null

This is an external CI-capacity blocker, not a test failure.

A connected Windows verification host was also checked and is currently offline, so there is no free alternate Edge runner available in this session.

## ORDER-069 preservation

Production/layout changes in ORDER-070 do not modify:
- `public/index.html`;
- `public/styles.css`;
- MAP-FIRST grid/layout;
- OSM renderer or 9-tile policy;
- Santa Fe fare facts/conditions;
- Auto unknown-price semantics;
- Cuándo Pasa/desvíos handoffs.

The 192/192 functional suite includes the ORDER-069 regression tests and passed on the functional SHA.

The required fresh current-HEAD Chrome/Edge render remains blocked solely by runner quota.

## Cloudflare hard stop

- `CLOUDFLARE_DEPLOY_ATTEMPTS=0`
- `CLOUDFLARE_RUNTIME_PROBES=0`
- no candidate Worker call
- no production Worker call
- no `wrangler deploy`
- only the already verified `wrangler deploy --dry-run`
- `PROD_MUTATION=NO`

## Current verdict

Implementation and non-browser verification are complete.

Overall ORDER-070 remains `BLOCKED_REAL` because the Work Item explicitly requires fresh Chrome + Edge and a final pipeline, and GitLab refuses to start those jobs due account CI quota. No paid capacity was enabled and no Cloudflare runtime was touched.

To complete later without changing product bytes: rerun MR !8 pipeline when free CI capacity is available, or run the checked-in `order070/evidence/browser-budget-audit.mjs` on a free Chrome+Edge host and attach the resulting JSON/screenshots/hashes.
