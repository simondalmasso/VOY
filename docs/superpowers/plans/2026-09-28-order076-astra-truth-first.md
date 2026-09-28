# ORDER-076 Astra Truth-First Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make VOY's existing MAP-FIRST RC immediately explain what is known, how fresh it is, and what the user may conclude, while making 3D strictly contextual and lazy.

**Architecture:** Preserve ORDER-075's MapLibre/OpenFreeMap + raster fallback, tracker store, temporal authority, and lazy Three.js 0.186 path. Add presentation-only truth interpretation and tighten 3D activation so no new runtime/platform is introduced.

**Tech Stack:** Existing vanilla JS/CSS/HTML, Node test runner, MapLibre 6.11.2, lazy Three.js 0.186.

**Spec:** Issue #57 terminal RC + Astra calibration captured in chat on 2026-09-28.

## Global Constraints

- MAP_FIRST / TRUTH_FIRST / LOW_COST / FAIL_CLOSED.
- UNKNOWN != UNAVAILABLE.
- Never fabricate movement, ETA, coverage, price or availability.
- 2D remains complete and robust.
- 3D is opt-in, lazy, contextual, and loads no assets in baseline 2D.
- No new framework, backend, GIS platform, persistence or telemetry.
- Santa Fe production stays explicit no-live without an authorized source.

## Review Focus

- stale realtime must become unknown without implying service absence.
- predicted must remain visibly estimated and non-animated.
- scheduled must never imply a live position.
- 3D activation without a selected entity/verified route must not import Three/topology.
- selecting one entity must not send unrelated transport entities into 3D.

### Task 1: Truth interpretation

**Files:**
- Create: `tests/order076-astra-calibration.test.mjs`
- Modify: `public/index.html`
- Modify: `public/app.js`
- Modify: `public/styles.css`

- [ ] RED: require `Estado desconocido`, compact truth metadata, explicit conclusion copy, and separate source/update rows.
- [ ] GREEN: implement presentation helpers without changing tracker temporal classification.
- [ ] Verify focused test and full suite.

### Task 2: Contextual low-weight 3D

**Files:**
- Modify: `tests/order076-astra-calibration.test.mjs`
- Modify: `public/index.html`
- Modify: `public/app.js`

- [ ] RED: require 3D quality hidden in 2D, no 3D import without selected entity/verified route, and selected-only tracker transport in 3D.
- [ ] GREEN: add contextual guard and selected-only transport projection.
- [ ] Verify focused test and full suite.

### Task 3: Exact-head release verification

**Files:**
- Existing build/browser scripts only.

- [ ] Run all unit tests.
- [ ] Build exact commit and verify clean tracked tree.
- [ ] Run Chrome + Edge MAP-FIRST/TrackerView gates, 100/150/200% text, reduced motion, WebGL2 unavailable, context loss, real vector + raster fallback, baseline 2D transfer=0.
- [ ] Deploy only if the exact-head evidence is green.
- [ ] Reconcile deployed build identity with audited source SHA.
