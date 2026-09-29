PROJECT=VOY
ROLE=AUD
MODE=OSS_READINESS_PREMERGE
NO_RESET=YES

CANON_REPO=https://github.com/simondalmasso/VOY
MIRROR=https://gitlab.com/simondalmasso/voy
PUBLIC_DEMO=https://voy-app.simondalmasso44.workers.dev/

OLD_MAIN=1ac1c691487cf9c542fd1db9d08c0ccadfe89f13
VERIFIED_RUNTIME_SOURCE=b858568848f6bf5abd6853ee13c77f2e65c63735
VERIFIED_PRODUCTION_BUILD=73b176a290ecc07e38d6ee1e
VERIFIED_PRODUCTION_RELEASE=order057-b858568848f6-73b176a2
TERMINAL_WORKFLOW_RUN=36568197731
OSS_CANDIDATE_BRANCH=release/order076-oss-candidate

PRODUCT_CONTRACT=MAP_FIRST|TRUTH_FIRST|LOW_COST|FAIL_CLOSED|UNKNOWN_NE_UNAVAILABLE
RUNTIME_FEATURE_EXPANSION=NO
OPENAI_APPLICATION_DRIVES_PRODUCT=NO

PREMERGE_GATES=LICENSE|README|SECURITY|CONTRIBUTING|HYGIENE|TERMINAL_EVIDENCE|CANDIDATE_CI|CANON_PLAN|RELEASE_PLAN|CODEX_READINESS

CANON_RECONCILIATION=
main and verified runtime have unrelated histories.
Do not force-push or discard history.
After explicit authorization, merge old main into candidate using --allow-unrelated-histories -s ours FROM THE CANDIDATE SIDE, verify tree identity, rerun exact-head gates, then fast-forward main.

STOP=PRE_MERGE
MERGE=NO
DEPLOY=NO
TAG=NO
NEXT_EXACT_ACTION=verify final release/order076-oss-candidate HEAD CI and stop for merge authorization
