# VOY v0.1.0 release plan

STATUS=PREMERGE_READY_NOT_PUBLISHED
TAG=v0.1.0
PUBLIC_RELEASE=NO
TAG_CREATED=NO

Verified runtime lineage:

```text
SOURCE=b858568848f6bf5abd6853ee13c77f2e65c63735
BUILD_ID=73b176a290ecc07e38d6ee1e
RELEASE_ID=order057-b858568848f6-73b176a2
FINAL_WORKFLOW_RUN=36568197731
```

The OSS candidate adds packaging/docs/CI/hygiene only.

## Release sequence

1. Freeze final `release/order076-oss-candidate` HEAD and require canonical CI PASS.
2. Perform the history-preserving canon bridge.
3. Require canonical CI on the reconciliation commit.
4. Build one immutable artifact from exact `main`.
5. Run required browser/runtime smoke on that same artifact.
6. Deploy that exact artifact.
7. Verify `/api/health` source/build identity.
8. Create annotated tag `v0.1.0` at that exact main SHA.
9. Publish the GitHub Release from that tag.
10. Independently verify tag/release and public demo.
11. Only then set OSS readiness `RELEASE_TAG=PASS` and `PUBLIC_DEMO=PASS`.

## Release notes draft

VOY v0.1.0 establishes the public MAP-FIRST / TRUTH_FIRST mobility baseline: truthful temporal states, TrackerView follow/session trail, explicit provenance/freshness, optional lazy 3D with 2D fallback, bounded network behavior and no fabricated Santa Fe realtime.

Realtime coverage remains dependent on public/reuse-authorized sources.
