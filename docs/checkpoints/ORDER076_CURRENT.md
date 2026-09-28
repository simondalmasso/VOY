# VOY — ORDER-076 WORK CHECKPOINT

LAST_UPDATE=2026-09-28
ROLE=AUD+IMPLEMENTER
MODE=NO_RESET / CONTINUE
RUNTIME_WORKTREE=C:\GPT-SANDBOX\VOY-ORDER076-ASTRA
RUNTIME_BRANCH=feat/order076-astra-truth-first
BASE_SHA=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
CURRENT_REMOTE_SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
CURRENT_BUILD_ID=0a306d0ae153798faa73949a
DEPLOYED=NO
EVIDENCE_FOR_DEPLOY=INVALIDATED_PENDING_FIX

## ESTADO PRESENTE

ORDER-076 truth-first/contextual-3D está implementado, probado y remoto, pero NO se despliega todavía.

Gate real-vector detectó un bug real:
```text
BUG=MAPLIBRE_NATIVE_PAN_DOES_NOT_SYNC_LOGICAL_CENTER
```

`public/app.js` usa `substrate.getCenter()` para `trackerStore.nearby(center)`.
`public/map/substrate.js` actualiza `center` en `setCenter/focusTo`, pero no después de pan nativo MapLibre.
Resultado: el mapa puede quedar visualmente en una zona nueva mientras la lógica nearby/contexto sigue usando el centro anterior.

Toda evidencia anterior al fix queda invalidada para deploy.

## DIRECCIÓN DE PRODUCTO / DISEÑO

Non-negotiable:
- MAP_FIRST
- TRUTH_FIRST
- LOW_COST
- FAIL_CLOSED
- UNKNOWN != UNAVAILABLE
- realtime / predicted / scheduled / unknown separados
- 2D robusto
- 3D optional/lazy/contextual/selected-only

Visual primary reference:
```text
CABA_OS=https://caba.os.nicopoore.com/
ROLE=PRIMARY_VISUAL_REFERENCE
USE=visual hierarchy / urban atmosphere / floating compact controls / map dominance
DO_NOT_COPY=runtime architecture / data truth claims / backend / fake-live behavior
```

Astra calibration remains:
- map first
- temporal truth immediately legible
- less visual competition
- 3D as spatial lens, not alternate product mode

## SOURCE ACTUAL YA VERIFICADO

- units 269/269 PASS
- npm audit --omit=dev = 0 vulnerabilities
- Edge 13/13 PASS
- Chrome 13/13 PASS
- reduced-motion PASS
- WebGL2 unavailable PASS
- context-loss PASS
- raster fallback PASS
- real OpenFreeMap style/PBF/glyph/attribution observed
- 3D without context => zero load
- 3D contextual => selection preserved / Worker delta 0
- 150/200% text PASS

These do NOT authorize deploy after the center-sync bug was found.

## AGENTE NUEVO — SEGUIR EXACTAMENTE ASÍ

1. NO RESET.
2. Worktree: `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Confirm HEAD before fix: `2a6457b0f40a4263a402f115a56b70c449240ac5`.
4. TDD center-sync:
   - add failing contract proving MapLibre native pan/moveend updates logical `center`.
   - implementation must update logical center from real MapLibre center after user pan.
   - do NOT refetch Worker and do NOT change follow semantics.
5. Run focused test RED, then minimal GREEN.
6. Run full unit suite.
7. Commit new source SHA.
8. Build exact source; record new BUILD_ID.
9. Because runtime changed, rerun ALL browser evidence from zero.
10. After correctness gates are green, apply one bounded visual-polish pass inspired by CABA_OS:
    - map remains dominant;
    - reduce SaaS/dashboard feel;
    - floating controls compact;
    - urban/map atmosphere stronger;
    - no new engine/framework;
    - no fake live;
    - no baseline 3D cost.
11. TDD visual contracts where possible; then rerun full units/build/browser gates again.
12. Push exact branch without force.
13. Verify mirror GitLab.
14. Deploy only exact final source/build.
15. Post-deploy reconcile public BUILD_ID/source SHA and verify MAP-FIRST/truth-first.
16. Update this checkpoint after each phase.

## NO FABRICAR

movement
ETA
coverage
availability
price
realtime

## 3D

optional
lazy
contextual
selected-only
zero baseline 2D cost
graceful 2D fallback


## DIRECCIÓN ESTÉTICA

- CABA_OS (https://caba.os.nicopoore.com/) = referencia visual principal.
- AhiVoy 3D = referencia funcional para seguimiento, replay/provenance y 3D, NO referencia estética principal.
- Objetivo: presencia visual/atmósfera de CABA_OS + verdad temporal VOY + 3D contextual/lazy.
- No copiar GIS dashboard, peso runtime, terrain/LiDAR ni features ajenas.
- Cualquier polish estético futuro debe preservar los gates actuales y volver a invalidar/recrear evidencia si toca runtime.


## PHASE_VISUAL_PIVOT_CABA_OS

```text
DEPLOY_HOLD=YES
REASON=AESTHETIC_DELTA_CABA_OS
REFERENCE=https://caba.os.nicopoore.com/
BASELINE_SOURCE=2a6457b0f40a4263a402f115a56b70c449240ac5
BASELINE_BUILD=0a306d0ae153798faa73949a
BASELINE_FUNCTIONAL_EVIDENCE=GREEN
DEPLOY_EXECUTED=NO
```

Owner feedback: CABA_OS is substantially stronger aesthetically. Treat this as a visual-direction correction before production.

Rules for the visual delta:
- preserve MAP_FIRST / TRUTH_FIRST / LOW_COST / FAIL_CLOSED;
- preserve all ORDER-076 semantics and no-fake-live behavior;
- preserve 2D baseline zero 3D asset cost;
- preserve contextual/lazy selected-only 3D;
- borrow visual composition only: map treatment, hierarchy, surfaces, density, typography, overlays;
- do not copy misleading "live" semantics, ornamental animation, backend, framework, or runtime architecture;
- any runtime/CSS/HTML mutation creates a new source SHA/build and invalidates the previous browser evidence for release.

Brand-new agent exact continuation:
1. NO RESET.
2. Do NOT deploy baseline 2a6457b.
3. Inspect CABA_OS visual system and identify a bounded visual delta.
4. Modify presentation only unless a concrete interaction issue requires otherwise.
5. Add/adjust visual contract tests before implementation.
6. Commit new source SHA.
7. Run full unit suite and build.
8. Re-run Edge + Chrome matrix, 100/150/200%, keyboard, reduced motion, WebGL2 unavailable, context loss, real vector, raster fallback, 3D zero-load/contextual gates.
9. Only then persist remote, CI, mirror, deploy exact head and reconcile production.


## CHECKPOINT — CABA POLISH DECISION

```text
CABA_POLISH_DECISION=APPLY_BEFORE_DEPLOY
PRE_POLISH_SOURCE=2a6457b0f40a4263a402f115a56b70c449240ac5
PRE_POLISH_BUILD=0a306d0ae153798faa73949a
EDGE_PRE_POLISH=13/13 PASS
CHROME_PRE_POLISH=13/13 PASS
DEPLOY_PRE_POLISH=NO
```

The user explicitly chose CABA_OS as the dominant aesthetic reference. Therefore the current browser evidence is retained as a behavioral baseline but is NOT terminal deploy evidence.

Exact next steps for a fresh agent:
1. NO RESET.
2. Add a small TDD contract for CABA-inspired VOY visual invariants.
3. Apply only low-cost CSS/HTML/theme polish: black/dark default, thin borders, reduced rounding, mono microcopy, cold cyan for truth/realtime, yellow reserved for routes/actions, subtle map vignette.
4. Do NOT add CRT/flicker, new assets, JS animation, new engine, GIS platform or framework.
5. Preserve light theme as an explicit user option.
6. Run 269+ unit tests.
7. Create a NEW runtime source commit.
8. Rebuild; previous BUILD_ID becomes non-terminal.
9. Rerun Edge + Chrome full matrices and special gates.
10. Only then persist remote and deploy exact-head.
