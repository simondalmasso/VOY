# ORDER075-GLM53 — FINAL AUD REPORT

Date: 2026-09-27 ART
Role: independent alternate candidate / AUD terminal verification

```text
ORDER=075-GLM53
MODEL=GLM 5.3
BASE_HEAD=dd7fc408b5b1fdc6032a27f524246d4a89febe13
SOURCE_COMMIT=62bb5c284335579f55f28e913aace67dc16c33ad
BUILD_ID=c26d7cefe5ee2d15d0cce7b8
AUD_STATUS=ALT_ACCEPTED_FOR_CONVERGENCE
CANONICAL_MERGE=NO
DEPLOY=NO
MAIN_MUTATION=NO
CANON_BRANCH_MUTATION=NO
```

## Scope
This report supersedes the earlier model-declared ALT_READY report. It records independent AUD evidence only. Acceptance here means the GLM alternative is valid input to ORDER-075 convergence; it does not authorize merge/deploy or make the lab branch canonical.

## Source binding
The recovered GLM tree was bound into one local source commit:
`62bb5c284335579f55f28e913aace67dc16c33ad`.
Tracked runtime/source diff after final build: zero. Evidence/report files remain audit artifacts outside that source commit.## Fresh verification

- `node --test tests\*.test.mjs` => 266/266 PASS, 0 fail.
- `scripts/build.ps1` => SOURCE_COMMIT `62bb5c2...`, BUILD_ID `c26d7cef...`, CLIENT_FILES=34.
- BUILD_MANIFEST JSON byte hash changes per build because `generated_at` is intentionally UTC-now; source commit/build ID remain stable.
- Edge post-build full matrix => 10/10 PASS, VOY Worker API total 0.
- Chrome post-build full matrix => 10/10 PASS, VOY Worker API total 0.
- Final tracked working-tree diff after build => empty.

## Stability closure

Exact final build `c26d7cefe5ee2d15d0cce7b8`:
- focused follow -> physical drag -> suspended -> resume loop: 30/30 consecutive PASS.
- full 10-check browser matrix: 10 consecutive complete runs, each 10/10 PASS.
- no failure was discarded from those final logs.

Evidence:
- `evidence/focused-follow-30x-final.jsonl`
- `evidence/full-browser-matrix-10x-final.jsonl`
- `evidence/matrix-final-01.json` ... `matrix-final-10.json`

## Real vector path
`final-real-vector.json` PASS:
- real OpenFreeMap Liberty style HTTP 200;
- real vector PBF observed;
- real glyph PBF observed;
- attribution includes OpenFreeMap/OpenStreetMap;
- physical pan changes center;
- native tracker overlay remains aligned/moves with map;
- selected facts survive;
- VOY Worker delta=0.## Failure / accessibility gates

- reduced motion: PASS; media query true and marker animation/transition effectively disabled.
- WebGL2 unavailable: PASS; WebGL2 actually false, vector falls back to raster, 3D returns useful 2D with explicit unavailable status.
- live WebGL context loss: PASS; WEBGL_lose_context triggered, facts preserved, fallback to 2D, Worker delta=0.
- 390x844 map-first: PASS.
- 200% text overflow: PASS.
- keyboard reach/focus: PASS; visible 3px focus on time rail.
- baseline 2D Three/topology transfer before opt-in: 0.
- scheduled/unknown/stale/no-verified-geometry vehicle movement: 0 by unit/browser contracts.

The first WebGL2-unavailable audit attempt was a harness false negative: it waited for the 2D button to be pressed, but 2D was already pressed before async 3D activation completed. The fixed audit harness waits for the actual fallback status transition. Runtime was not changed for this correction.

## Follow race resolution

Two distinct issues were proven:
1. harness readiness race: drag could be issued before MapLibre canvas/readiness;
2. real product race: periodic follow `easeTo` could preempt MapLibre drag activation before `dragstart`.

Final bounded repair:
- primary pointerdown arms intent only;
- movement >=8 px emits `pointer_drag` and suspends follow early;
- tap/click below threshold does not suspend;
- fallback does not move camera;
- MapLibre remains gesture/camera authority.

This behavior is documented in final `ARCHITECTURE.md` and `DECISIONS.md`.## Architecture findings accepted for convergence

Keep from GLM:
- real VOY-tree integration rather than framework replacement;
- MAP-FIRST / MOBILE-FIRST shell with secondary search;
- existing VOY temporal authority and lazy Three stack;
- bounded MapLibre 6.11.2 + OpenFreeMap async upgrade with existing raster fallback;
- pure tracker observation/store modules;
- source-only bounded session trail;
- zero-fetch recent-time rail;
- explicit follow/suspend/resume state;
- >=8px early drag-intent fail-safe;
- deterministic labeled fixtures only in dev evidence;
- zero new backend/database/persistence/telemetry;
- zero Worker-call delta for tracker visual interactions.

## Known product truth
- Santa Fe reusable realtime source remains unavailable.
- Production therefore remains explicit no-live; no fixture is production data.
- Tracker history is session-only by contract.

## Non-actions
No GitHub push of the GLM source commit, no PR, no Actions trigger for the lab source, no merge, no deploy, no production probe, no main/canonical runtime mutation.

## Terminal
```text
GLM_ALT=AUD_ACCEPTED_FOR_CONVERGENCE
EVIDENCE_GAPS=0
RUNTIME_MUTATION_AFTER_FINAL_EVIDENCE=0
NEXT=AUD_ORDER075_CONVERGENCE
```
