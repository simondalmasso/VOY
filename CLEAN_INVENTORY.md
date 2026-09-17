# CLEAN_INVENTORY

Base: `552f600a3e4a3590929017bd0c06ba8ca7a2b1bf`  
Cleanup branch: `cleanup/r2-order057-reduction`  
Rule: every tracked file is assigned exactly one category; `UNKNOWN=0`.

| Path | Category | Reason |
|---|---|---|
| `.gitignore` | BUILD | workspace/package/deployment build configuration |
| `.gitlab-ci.yml` | CI | GitLab verification pipeline definition |
| `ci/npm-audit-classification.json` | GATE | provenance/package/audit verification contract |
| `ci/r2-source-provenance.json` | GATE | provenance/package/audit verification contract |
| `ci/verify-r2.mjs` | GATE | provenance/package/audit verification contract |
| `order056/corpus/corpus-v2-corrections-official-proof.json` | GATE | frozen search/proof corpus consumed by verification tooling |
| `order056/corpus/destination-corpus-v2.json` | GATE | frozen search/proof corpus consumed by verification tooling |
| `order056/evidence/browser-matrix.mjs` | GATE | browser/performance/visual verification harness retained for remaining gates |
| `order056/evidence/performance-matrix.mjs` | GATE | browser/performance/visual verification harness retained for remaining gates |
| `order056/evidence/run-browser-user.ps1` | GATE | browser/performance/visual verification harness retained for remaining gates |
| `order056/evidence/run-performance-user.ps1` | GATE | browser/performance/visual verification harness retained for remaining gates |
| `order056/evidence/visual-state-matrix.mjs` | GATE | browser/performance/visual verification harness retained for remaining gates |
| `order056/georef/OFFLINE_AUTHORITY_MANIFEST.json` | GATE | pinned GeoRef authority/provenance input for deterministic verification |
| `order056/georef/official-v2-pinned/provenance-boundaries.json` | GATE | pinned GeoRef authority/provenance input for deterministic verification |
| `order056/georef/official-v2-pinned/provenance-localities.json` | GATE | pinned GeoRef authority/provenance input for deterministic verification |
| `order056/georef/official-v2-pinned/provenance.json` | GATE | pinned GeoRef authority/provenance input for deterministic verification |
| `package-lock.json` | BUILD | workspace/package/deployment build configuration |
| `package.json` | BUILD | workspace/package/deployment build configuration |
| `public/_headers` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/app.js` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/contracts.js` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/coverage.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/icons/app-icon-192.png` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/icons/app-icon-512.png` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/icons/app-icon.svg` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/icons/brand-lockup.svg` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/index.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/manifest.json` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/offline.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/privacy.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/runtime-config.js` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/sources.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/styles.css` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/sw.js` | RUNTIME | shipped client/PWA asset or runtime document |
| `public/terms.html` | RUNTIME | shipped client/PWA asset or runtime document |
| `scripts/benchmark-evaluator.mjs` | GATE | specialized verification/proof tooling retained with explicit entrypoint |
| `scripts/benchmark-final.mjs` | GATE | specialized verification/proof tooling retained with explicit entrypoint |
| `scripts/build.ps1` | BUILD | deterministic build/generation entrypoint |
| `scripts/collect-corpus-proof.mjs` | GATE | specialized verification/proof tooling retained with explicit entrypoint |
| `scripts/generate-georef-runtime-authority.py` | BUILD | deterministic build/generation entrypoint |
| `scripts/generate-rail-station-catalog.mjs` | BUILD | deterministic build/generation entrypoint |
| `scripts/georef-offline-proof.py` | GATE | specialized verification/proof tooling retained with explicit entrypoint |
| `src/georef-authority.generated.js` | RUNTIME | worker/runtime source or generated runtime authority |
| `src/rail-stations.generated.js` | RUNTIME | worker/runtime source or generated runtime authority |
| `src/worker.template.js` | RUNTIME | worker/runtime source or generated runtime authority |
| `tests/benchmark-evaluator.test.mjs` | TEST | executable regression or test fixture |
| `tests/order056-final.test.mjs` | TEST | executable regression or test fixture |
| `tests/order056-visual-refinement.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-mobilitydecision.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-national-semantic.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-pwa-convergence.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-r2-mobility-computation.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-rail-static.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-search-corpus.json` | TEST | executable regression or test fixture |
| `tests/order057-search-corpus.test.mjs` | TEST | executable regression or test fixture |
| `tests/order057-search-intelligence.test.mjs` | TEST | executable regression or test fixture |
| `tests/ui-contracts.test.mjs` | TEST | executable regression or test fixture |
| `tests/ui-final.test.mjs` | TEST | executable regression or test fixture |
| `wrangler.jsonc` | BUILD | workspace/package/deployment build configuration |
| `CLEAN_INVENTORY.md` | GATE | mandatory cleanup evidence/report |
| `CLEAN_REPORT.md` | GATE | mandatory cleanup evidence/report |
