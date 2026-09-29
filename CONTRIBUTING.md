# Contributing to VOY

VOY welcomes focused contributions that preserve its mobility-truth contract.

## Start here

```bash
git clone https://github.com/simondalmasso/VOY.git
cd VOY
npm ci
npm test
npm run build:linux
```

Node.js 22+ is required.

## Non-negotiable product rules

Every contribution must preserve:

```text
MAP_FIRST
TRUTH_FIRST
LOW_COST
FAIL_CLOSED
UNKNOWN != UNAVAILABLE
```

Do not animate scheduled data as realtime, infer service absence from missing data, invent ETA/prices/coverage/movement, add undocumented/private feeds or extracted credentials, or add a new GIS/3D stack without a demonstrated need.

## Source contributions

For a new or changed mobility source, document:

1. authority/operator;
2. public source URL;
3. license/reuse status;
4. authentication requirement;
5. freshness/update semantics;
6. geographic/mode coverage;
7. parser/adapter failure behavior;
8. truthful fallback.

If reuse rights or currentness cannot be verified, fail closed.

## Tests and evidence

Before opening a PR:

```bash
npm test
npm run build:linux
npm audit --omit=dev --audit-level=high
npx wrangler deploy --config wrangler.jsonc --dry-run
```

For UI/runtime changes, add browser evidence appropriate to the change. TrackerView follow behavior, temporal states, reduced motion, 3D fallback and map layout require regression coverage.

Do not weaken an existing assertion merely to make a new implementation pass. If a contract is intentionally superseded, explain the replacement contract in the PR.

## Scope discipline

Prefer the smallest change that fixes a demonstrated problem. Runtime dependencies require a measured benefit and a fallback plan. Keep historical evidence/documentation separate from runtime changes when possible.

## Pull requests

State the problem/user impact, provenance implications, tests, browser/runtime evidence where relevant, Worker/network budget impact, and fallback behavior. Keep unrelated refactors out of the same PR.
