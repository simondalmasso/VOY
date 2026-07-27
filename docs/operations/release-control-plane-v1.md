# VOY Release Control Plane V1

## Authority split

Drive governs missions, authorization, scope, audit and closure. GitHub contains code, CI and executable guards. Cloudflare Workers creates and releases exact candidates or deployments. Production confirms the effective public runtime. No system substitutes for another.

## Release order

```text
traceable branch commit
→ exact Workers candidate at 0% traffic
→ candidate validation and evidence
→ independent AUD verdict
→ separately authorized GitHub merge or production promotion
→ production verification and reconciliation
```

“Workers-first” means the exact committed candidate is validated on Workers before any later merge or promotion. It never means editing in the Cloudflare dashboard, deploying uncommitted code or sending normal traffic before authorization.

This repair mission is workflow-only and stops at a Draft PR. It creates no candidate, performs no Cloudflare write and does not authorize merge. A later mission must pin the exact head, current Cloudflare state and required candidate before any merge or promotion decision.

## Current-tree containment

Generic pushes to `main` run validation only. They may install dependencies, lint, test, perform a Wrangler dry-run, run local browser checks and observe public production through read-only requests. They must not receive Cloudflare credentials or execute a Cloudflare mutation.

Pull-request validation observes production health and version without asserting that production build equals `main` or the pull-request SHA. Exact source-to-candidate-to-production identity belongs to mission-specific release evidence.

`docs/control/release-policy.yaml` is the machine-readable contract. `scripts/verify-release-policy.mjs` scans every workflow for readable structure, starts from workflows that accept pushes to `main`, follows local reusable workflows, local actions, local scripts and referenced package scripts, then rejects unsafe reachable paths.

## Threat model and limits

The guard covers the current repository tree and detects, at minimum:

- non-dry-run `wrangler deploy`;
- `wrangler versions deploy`;
- Wrangler secret and selected release mutations;
- mutating or non-provably-read-only Cloudflare API references;
- Cloudflare/Wrangler actions;
- Cloudflare credential variables;
- `secrets: inherit`;
- unsafe or unresolved local reusable workflows, actions and scripts;
- unreadable UTF-8, tab-indented or structurally incomplete workflow files.

The guard fails closed for local references it cannot resolve. It does not prove universal detection of arbitrary future indirection, generated commands, compromised third-party actions or repository-setting bypasses. Therefore:

```text
CURRENT_TREE_GENERIC_MAIN_PUSH_PRODUCTION_WRITE=NO
PR_REGRESSION_DETECTION=YES
FUTURE_DIRECT_PUSH_PREVENTION=NO_VERIFICADO
RULESET_AND_SECRET_ISOLATION=NO_VERIFICADO
```

Required branch protection, rulesets and production-secret isolation remain a separate hardening decision before final control-plane closure.

## Rollback

This Draft PR changes no runtime and has no Cloudflare rollback. Repository rollback is a revert of its exact future merge commit, only after separate authorization. Production rollback always requires a separate mission with exact version/deployment IDs and one bounded attempt.
