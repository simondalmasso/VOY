# ORDER-076 terminal evidence

STATUS=IN_PROGRESS
RUNTIME_SOURCE_SHA=b858568848f6bf5abd6853ee13c77f2e65c63735
BUILD_ID=c150cf0f431b55fcbdbb8278
RUNTIME_BRANCH=feat/order076-astra-truth-first
AUDIT_BRANCH=audit/order076-terminal-evidence

## Exact-head gates already reproduced

- Unit regression: 274/274 PASS.
- Edge terminal matrix: 13/13 PASS.
- Chrome terminal matrix: 13/13 PASS.
- Reduced motion: PASS.
- WebGL2 unavailable -> truthful 2D fallback: PASS.
- Live webglcontextlost -> truthful 2D fallback, worker delta 0: PASS.
- Real OpenFreeMap vector path: PASS, including Liberty style, PBF, glyphs, attribution and worker delta 0.
- Focused TrackerView follow stability: 30/30 consecutive PASS, zero discarded failures.
- Baseline 2D 3D transfer: zero.
- Required follow/special-gate Worker deltas: zero.
- GitHub runtime branch head = b858568848f6bf5abd6853ee13c77f2e65c63735.
- GitLab mirror branch head = b858568848f6bf5abd6853ee13c77f2e65c63735.

## GitHub Actions classification

Run 36391139662 was dispatched on the exact runtime SHA.

- linux-verify: PASS, including tests, build, deterministic topology/raw provenance, package verification, forbidden-source audit, Wrangler dry-run and dependency audit.
- inherited ORDER-072 Chrome browser job: FAIL only because the old harness requires desktop map width_ratio in [0.55, 0.80].
- inherited ORDER-072 Edge browser job: same deterministic legacy-harness failure.
- ORDER-076 intentionally uses full-bleed MAP-FIRST, which reports width_ratio=1.
- Product regression from those CI browser failures: NO.
- Runtime will not be changed to satisfy a superseded layout constraint.

## Stability still running

Full Edge ORDER-076 matrix: target 10 consecutive complete runs, each 13/13 PASS on the exact BUILD_ID above.

Current durable ledger lives locally at:
`experiments/order076/evidence/stability/edge-full-10x.txt`

No deploy is authorized by evidence until this section becomes 10/10 PASS.

## Zero-context continuation

1. NO RESET.
2. Do not modify runtime while the 10x runner is active.
3. Require 10 consecutive ledger rows with build=c150cf0f431b55fcbdbb8278, pass=13, fail=0.
4. Any failure stops the sequence; classify product vs harness before changing anything.
5. When 10/10 is green, run a final Wrangler dry-run from runtime SHA b858568...
6. Re-check GitHub and GitLab branch parity.
7. Update this file to STATUS=READY_TO_DEPLOY and include the 10/10 result.
8. Deploy only the exact already-built artifact generated from b858568..., then reconcile production source/build identity and smoke the live URL.
9. If deploy or post-deploy identity differs, stop; do not call the release complete.
