# VOY ORDER-075 — CANONICAL RC REPORT

Date: 2026-09-28 ART
Runtime branch: `feat/order075-mapfirst-trackerview`
Evidence branch: `audit/order075-rc-evidence`

```text
CHECKPOINT=CHECKPOINT_MAPFIRST_TRACKERVIEW_RC
RUNTIME_SOURCE_COMMIT=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
BUILD_ID=1ba08c651a7875afdba7149e
BASE=dd7fc408b5b1fdc6032a27f524246d4a89febe13
MERGE=NO
DEPLOY=NO
PROD_PROBE=NO
```

## Canonical convergence

The in-flight ARQ TDD branch was preserved. No reset, force-push or wholesale branch replacement was used.

The missing ORDER-075 GREEN surfaces were selectively converged from the independently audited GLM reference while preserving the stricter canonical tracker/store contracts already implemented on this branch:
- full-bleed MAP-FIRST shell;
- search/origin as secondary sheet surface;
- explicit truth pill;
- TrackerView facts/follow/resume/time rail;
- bounded MapLibre/OpenFreeMap substrate + OSM raster fallback;
- CSP/runtime-config/service-worker/build integration;
- >=8px early pointer drag-intent fail-safe that suspends follow but does not move the camera;
- existing temporal authority and lazy Three.js 0.186.0 authority.

Legacy visual tests that required the superseded search-first hero were updated to assert the ORDER-075 MAP-FIRST override instead of weakening the new product contract.

## Unit verification

Fresh full suite on canonical source:
```text
tests=266
pass=266
fail=0
```

Evidence: `evidence/canonical-unit-final.log`.

## Build

Fresh canonical build:
```text
SOURCE_COMMIT=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
RELEASE_ID=order057-c3fd59e76bb3-1ba08c65
BUILD_ID=1ba08c651a7875afdba7149e
CLIENT_FILES=34
```

The topology build touched filesystem metadata but the working-tree blobs hashed exactly equal to HEAD; no runtime/source content delta remained after index refresh.

Evidence: `evidence/FINAL_BUILD_MANIFEST.json`.

## Browser / runtime verification

Exact BUILD_ID `1ba08c651a7875afdba7149e`:

- Edge full matrix smoke: 10/10 PASS.
- Focused follow -> physical drag -> suspended -> explicit resume stability: 30/30 consecutive PASS.
- Full browser matrix stability: 10 consecutive complete runs, each 10/10 PASS.
- Chrome final matrix: 10/10 PASS.
- real OpenFreeMap Liberty/vector path: PASS.
- reduced-motion: PASS.
- WebGL2 unavailable -> useful raster/2D fallback: PASS.
- live `WEBGL_lose_context` -> useful 2D fallback with facts preserved: PASS.

The full matrix covers:
- mobile 390x844 MAP-FIRST hierarchy;
- truthful Santa Fe no-live default;
- search-secondary sheet;
- realtime fixture selection/facts/follow/pan/resume;
- 2D -> 3D -> 2D selection persistence and lazy 3D;
- stale transition / zero movement;
- desktop 1440x900 map dominance;
- 200% text no horizontal overflow;
- keyboard reach/focus;
- vector failure -> raster fallback.

Required tracker visual interaction paths preserve zero VOY Worker-call deltas.

## Harness correction

The first canonical smoke inherited two assumptions from the GLM alternate harness:
1. it counted fixture markers immediately after the first marker appeared, while the stricter canonical store requires enough observations before realtime renderability;
2. its keyboard check could start before the required realtime marker set stabilized.

The canonical RC harness was changed only to wait for the canonical temporal condition (>=5 renderable realtime fixture markers) and to target the deterministic realtime entity. Runtime code was not changed for this evidence correction.

## Evidence integrity

Mechanical cross-validation result:
```text
unit_266=true
follow_count=30
follow_all=true
follow_same_build=true
full_count=10
full_all=true
full_same_build=true
chrome=10/10
chrome_same_build=true
extra_gates=4/4
VALID=true
```

Primary evidence:
- `evidence/canonical-follow-30x.jsonl`
- `evidence/canonical-full-10x.jsonl`
- `evidence/canonical-chrome-final.json`
- `evidence/canonical-real-vector.json`
- `evidence/canonical-reduced-motion.json`
- `evidence/canonical-webgl2-unavailable.json`
- `evidence/canonical-context-loss.json`
- `evidence/canonical-extra-gates.jsonl`
- screenshots in the same directory.

## Terminal state

```text
CANONICAL_RC=READY_FOR_AUD_REVIEW
RUNTIME_MUTATION_AFTER_FINAL_BUILD=0
RUNTIME_MUTATION_AFTER_BROWSER_EVIDENCE=0
CHECKPOINT_MAPFIRST_TRACKERVIEW_RC=REACHED
MERGE=NO
DEPLOY=NO
PROD_PROBE=NO
```
