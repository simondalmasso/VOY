# VOY — ORDER-075 AUD CONVERGENCE

Date: 2026-09-27 ART
Authority: AUD
Canonical implementer: ARQ1

## Canonical state
```text
BASE=dd7fc408b5b1fdc6032a27f524246d4a89febe13
BRANCH=feat/order075-mapfirst-trackerview
CURRENT_ARQ_HEAD=5ca22b7f7b7625aa1c52f0b9f81074c126a91afe
PRIMARY_AUDITED_REFERENCE=6f882c3b7d712151c2354d95c518885d12729054
GLM_EVIDENCE_TIP=00e97187da9127e6d406887b91276ed60b9b5f1d
NO_RESET=YES
MERGE=NO
DEPLOY=NO
```

## Concurrency reconciliation
ARQ1 created the canonical branch from the exact frozen base during the audit/convergence window and has already advanced seven TDD commits. That work is preserved.

Therefore the convergence operation is **selective semantic port**, not branch replacement:
- continue current ARQ HEAD;
- preserve its RED contracts and valid tracker modules;
- use the audited GLM source as reference for missing GREEN implementation;
- do not reset, force-push, or wholesale cherry-pick over existing canonical work.

Current unit gate is 250/266 PASS with 16 expected RED failures. Those failures map to unimplemented shell/substrate/wiring surfaces, not regressions in the already-green tracker contracts.

## Experimental conclusions
Grokbot: ideas only; reject framework/runtime rewrite.
Sonnet: ideas/tests only; preserve fail-closed renderer lesson.
GLM: audited real-VOY implementation reference with terminal browser/runtime evidence.

## Required selective port
From GLM/reference:
- map-first shell;
- secondary search;
- truth/facts/follow/time-rail UI;
- bounded MapLibre/OpenFreeMap substrate + raster fallback;
- app/store/map wiring;
- >=8px drag-intent fail-safe;
- CSP/SW/build/runtime-config integration;
- existing temporal + lazy Three authority.

Never import:
- React/Vite/Tailwind app replacements;
- duplicate temporal/3D engines;
- unsourced geography;
- fake live;
- persistence/telemetry/new backend.

## Evidence
Experimental evidence validates the reference source only. Canonical ARQ must rerun fresh evidence at its final exact HEAD.

Stop at canonical RC for AUD review. No merge/deploy.
