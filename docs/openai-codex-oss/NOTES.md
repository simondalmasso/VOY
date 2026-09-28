# VOY — OpenAI Codex for Open Source Audit Notes

Append-only/simple audit surface. Add newer entries above or below consistently; do not rewrite prior observations merely because readiness improves.

## 2026-09-28 — OSS READINESS

STATUS=NOT_READY

EVIDENCE=
- Repository is public and authenticated maintainer connection has admin/maintain/push/triage permissions.
- Dossier Drive read and reconciled against repository evidence.
- Official OpenAI Codex for Open Source form/community/terms checked on 2026-09-28.
- ORDER-075 accepted RC source is `c3fd59e76bb349ad1177d349fae4aaac7a9cdff1`; build `1ba08c651a7875afdba7149e`; 266/266 unit PASS plus terminal browser/runtime evidence.
- GitHub Actions run `36371603533` succeeded on the exact RC source.
- `main` remains `1ac1c691487cf9c542fd1db9d08c0ccadfe89f13` and is materially different from the RC.
- Public demo returned HTTP 200, but its HTML is the older search-first/hero product, not the accepted MAP-FIRST RC.
- No LICENSE/SECURITY.md/CONTRIBUTING.md on current main.
- No GitHub releases and no tag refs were found.
- Current main presents 65 branches, 25 workflows, and substantial historical root artifacts.

MISSING=
- Canonical main reconciled to the product intended for evaluation.
- Explicit OSS license chosen by owner and committed on canonical main.
- Current public README.
- SECURITY.md.
- CONTRIBUTING.md.
- Traceable release/tag.
- Public demo verified against release SHA.
- Repo/root/workflow/branch hygiene pass.
- Verified OpenAI Organization ID.
- Final evidence-backed application texts.

RISK=
- Highest risk is canon drift: presenting an old main/demo while describing the newer RC.
- Second risk is claiming OSS readiness without an explicit license.
- Third risk is confusing heavy repository history with healthy public onboarding.
- Application pressure must not create artificial features, fake adoption, fake realtime, or a new architecture.

NEXT=
1. Owner/AUD decision on reconciling ORDER-075 RC to main; exact-head audit after reconciliation.
2. OSS packaging/hygiene on canonical main only.
3. Release/tag -> public demo reconciliation -> form texts/Organization ID -> readiness R2.

NO_RUNTIME_CHANGE=YES
NO_DEPLOY=YES
