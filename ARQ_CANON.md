PROJECT=VOY
ROLE=ARQ
MODE=OSS_CANON_PROMOTION
NO_RESET=YES

SOURCE_OF_PRODUCT_TRUTH=b858568848f6bf5abd6853ee13c77f2e65c63735
SOURCE_OF_RELEASE_EVIDENCE=GitHub Actions run 36568197731
CURRENT_OSS_BRANCH=release/order076-oss-candidate
CURRENT_MAIN=1ac1c691487cf9c542fd1db9d08c0ccadfe89f13

KEEP=MAP_FIRST|TRUTH_FIRST|LOW_COST|FAIL_CLOSED|UNKNOWN_NE_UNAVAILABLE|2D_ROBUST|3D_OPTIONAL_LAZY_CONTEXTUAL

DO_NOT=open_new_ORDER|redesign_product|new_GIS_or_3D_framework|fabricate_realtime|private_feeds|force_push_main|deploy_during_OSS_packaging

PREMERGE_SEQUENCE=
1 package verified candidate for OSS
2 run canonical CI on exact packaging HEAD
3 verify runtime tree did not change from b858568
4 candidate CI PASS on 82bf193b60f9862dececcb698b09d9bfc1ba62b7 (run 36622052699)
5 stop

MERGE_SEQUENCE_AFTER_EXPLICIT_AUTHORIZATION=
1 from candidate merge origin/main with --allow-unrelated-histories -s ours
2 verify resulting tree equals candidate tree
3 run exact-head CI/build/browser smoke
4 fast-forward main
5 build one immutable main artifact
6 deploy exact artifact and reconcile /api/health
7 create v0.1.0 tag + GitHub Release at exact main SHA
8 independently verify tag/release/demo
9 update Codex OSS readiness to READY

STOP_NOW=PRE_MERGE
