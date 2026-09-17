# CLEAN_REPORT

## Scope and terminal state

- BASE_HEAD: `552f600a3e4a3590929017bd0c06ba8ca7a2b1bf`
- CLEAN parent: `6592ae8feb9ece4a8292f685d12a172cd2959edc`
- Canonical branch: `cleanup/r2-order057-reduction`
- CLEAN_DONE: `YES`
- CLEAN_UNKNOWN: `0`
- BASELINE_REGRESSION: `0`
- PRODUCT_RECOVERY: `NOT_YET_FULLY_VERIFIED`
- DEPLOY_READY: `NO`
- VERDE: `NO`

## Before / after

| Metric | Before | After |
|---|---:|---:|
| tracked files | 63 | 61 (59 code/evidence + 2 mandatory CLEAN docs) |
| active LOC excluding CLEAN docs | 12087 | 12085 |
| scripts/ files | 8 | 7 |
| runtime dependencies | 0 | 0 |
| dev dependencies | 2 | 2 |
| tests | 166 | 166 |
| dist files | 19 | 19 |

Deleted: `public/icons__app-icon-192.png`, `public/icons__app-icon-512.png`, `public/icons__app-icon.svg`, `scripts/probe-photon.mjs`. The three `icons__*` files were legacy parallel icon variants, not byte-identical duplicates; zero active references were found, build copies only `public/icons/*`, and regression/build verification remained green. `probe-photon.mjs` had zero callers and was an ad-hoc one-line probe superseded by the product search implementation/tests.

## Verification evidence

- provenance: PASS; materialized source `2f05b87aa0d9c2282f10b8c41eaff29f82927410`, sealed files 59
- `npm ci --ignore-scripts`: PASS
- `npm test`: 166 PASS / 0 FAIL
- `npm run build`: PASS
- `node ci/verify-r2.mjs package`: PASS, 19 dist files
- `npx wrangler deploy --dry-run`: PASS; no deployment performed
- `npm audit --omit=dev --audit-level=high`: 0 runtime vulnerabilities
- full dev audit remains the known Wrangler/Miniflare/Sharp dev-toolchain classification; runtime reachability is NO
- GitLab cleanup-code pipeline: `2859348405`, job `16573411117`, PASS on `6592ae8...`

Local `wrangler dev` was attempted and blocked by the pinned Wrangler/workerd binary supporting compatibility date only through 2026-08-27 while project config requires 2026-08-28. This is a local toolchain limitation, not a product-code regression; dry-run and GitLab Linux CI pass. Browser proof therefore used an external scratch harness over the real worker request handler and built client, without modifying repository runtime.

## Script / gate graph

- `npm run build` -> `scripts/build.ps1` -> `dist/worker.js`, `dist/client/**`, `dist/BUILD_MANIFEST.json`
- `npm test` -> `tests/*.test.mjs` -> 166 contract/regression assertions
- CI -> `ci/verify-r2.mjs provenance|package|audit` -> deterministic gate verdicts
- manual search gate -> `scripts/benchmark-final.mjs` + frozen corpus -> live resolver benchmark output
- offline GeoRef gate -> `scripts/georef-offline-proof.py` -> authority validation
- authority generation -> `scripts/generate-georef-runtime-authority.py` -> `src/georef-authority.generated.js`
- rail generation -> `npm run generate:rail-catalog` -> `src/rail-stations.generated.js`
- browser/performance harnesses -> `order056/evidence/run-*-user.ps1` -> browser/performance evidence

## Vertical slice diagnostic

Fresh Santa Fe probe: origin `Santa Fe` -> query `Puente Colgante Santa Fe` -> Photon/GeoRef verified entity `Puente Colgante (Ingeniero Marcial Candioti)` -> real OpenStreetMap routing -> UI. Walking route: 2094 m, bicycle route real, ARS 0 only on routed free modes, `fabricated_claims=0`. Browser assertion observed result title, map visible, route overlay present and walking option rendered.

## Remaining R2 recovery gates

Cleanup does not certify full product recovery. Remaining sequence: fresh held-out provider search gate; full route oracle; Chrome + Edge browser/PWA convergence; performance/accessibility; exact source freeze; candidate at 0%; independent falsification; same candidate UUID at 100%; T0/T10/T30 soak without mutation. No candidate/prod deployment or merge is authorized.

## Operator conclusion

The cleanup reduced proven dead surface without altering the product contract, tests, dependencies, CI thresholds, routing/search semantics or production state. `UNKNOWN=0` is a classification result, not permission to delete retained GATE/BUILD/RUNTIME/TEST material. Historical `order056` assets are retained because current verification/generation still references portions of them or because they are remaining browser/performance gate harnesses.