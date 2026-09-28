# VOY — ORDER-076 WORK CHECKPOINT

LAST_UPDATE=2026-09-28T03:20-03:00
ROLE=AUD+IMPLEMENTER
MODE=NO_RESET / CONTINUE
RUNTIME_WORKTREE=C:\GPT-SANDBOX\VOY-ORDER076-ASTRA
RUNTIME_BRANCH=feat/order076-astra-truth-first
BASE_SHA=c3fd59e76bb349ad1177d349fae4aaac7a9cdff1
CURRENT_LOCAL_SOURCE_SHA=2a6457b0f40a4263a402f115a56b70c449240ac5
CURRENT_BUILD_ID=0a306d0ae153798faa73949a
DEPLOYED=NO

## ESTADO PRESENTE

ORDER-076 aplica la calibración Astra sin re-arquitectura:
- MAP-FIRST preservado.
- TrackerView separa estado, conclusión ("Qué sabemos"), actualización y fuente.
- UNKNOWN se presenta como "Estado desconocido"; UNKNOWN != UNAVAILABLE.
- stale no implica posición actual.
- 3D sigue Three.js 0.186 existente, optional/lazy.
- 3D no carga sin selección renderizable o recorrido verificado.
- baseline 2D oculta control de calidad 3D.
- entrada 3D usa sólo el tracker seleccionado.
- no backend/framework/GIS/persistencia/telemetría nuevos.

Runtime cambiado:
- public/app.js
- public/index.html
- public/styles.css

Contratos/plan:
- tests/order075-shell.test.mjs
- tests/order076-astra-calibration.test.mjs
- docs/superpowers/plans/2026-09-28-order076-astra-truth-first.md

## VERIFICACIÓN COMPLETADA

```text
SOURCE_COMMIT=2a6457b0f40a4263a402f115a56b70c449240ac5
BUILD_ID=0a306d0ae153798faa73949a
UNITS=269/269 PASS
PROD_NPM_AUDIT=0 vulnerabilities
TOPOLOGY_FALSE_DIRTY=CONFIRMED (HEAD blob == working-tree blob for both files)
TRACKED_TREE_AFTER_REFRESH=CLEAN
```

Edge full browser pass #1:
```text
PASS=12
FAIL=1
RUNTIME_FAILURES=0
HARNESS_FALSE_NEGATIVE=1
```

PASS includes:
- MAP_FIRST mobile 390x844
- no-live Santa Fe truth
- secondary search
- TrackerView follow/pan/resume
- selection 2D→3D→2D
- desktop map
- 200% text
- keyboard
- raster fallback
- 3D without context => zero Three/voy3d/topology load
- truth-first contextual 3D
- 150% text

Only FAIL:
`STALE_TRANSITION_ZERO_MOVEMENT` because evidence regex expected uppercase `Última...` while actual correct UI text is `La última observación está vencida...`. Runtime behavior is correct; only harness needs case-insensitive/correct phrase.

## AGENTE NUEVO — SEGUIR EXACTAMENTE ASÍ

1. NO RESET. NO modificar runtime antes de cerrar evidencia.
2. Abrir `C:\GPT-SANDBOX\VOY-ORDER076-ASTRA`.
3. Confirmar `git rev-parse HEAD` = `2a6457b0f40a4263a402f115a56b70c449240ac5`.
4. Corregir SOLO el regex stale en:
   `experiments/order076/evidence/order076-browser-check.mjs`
   para aceptar `La última observación está vencida...`.
5. Correr primero:
   `ONLY_CHECK=STALE_TRANSITION_ZERO_MOVEMENT` en Edge.
6. Si PASS, correr matriz Edge completa y exigir 13/13 PASS.
7. Correr matriz Chrome completa y exigir 13/13 PASS.
8. Reutilizar/adaptar gates especiales del RC ORDER-075:
   - reduced motion
   - WebGL2 unavailable
   - live webglcontextlost
   - real OpenFreeMap vector path
   - raster fallback
9. No tocar runtime si sólo cambia harness.
10. Si cualquier gate revela un bug real, TDD -> nuevo source commit -> rebuild -> invalidar evidencia previa.
11. Si todo verde, persistir `feat/order076-astra-truth-first` en GitHub.
12. Verificar GitHub CI y GitLab mirror exactos.
13. Desplegar sólo el exact source/build verificado.
14. Después del deploy, reconciliar producción:
    - deployed source SHA exacto
    - deployed BUILD_ID exacto
    - MAP-FIRST visible
    - truth-first actual
    - no fake live
15. Registrar deploy/evidencia y actualizar este checkpoint otra vez.
16. OpenAI OSS queda fuera de esta pista.

## REGLAS

MAP_FIRST
TRUTH_FIRST
LOW_COST
FAIL_CLOSED
UNKNOWN != UNAVAILABLE

No fabricar movimiento, ETA, cobertura, disponibilidad, precio ni realtime.
3D = optional + lazy + contextual + selected-only + zero baseline 2D cost + graceful 2D fallback.
