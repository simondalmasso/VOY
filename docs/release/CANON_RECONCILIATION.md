# Canon reconciliation plan

## Current state

```text
old main = 1ac1c691487cf9c542fd1db9d08c0ccadfe89f13
verified runtime source = b858568848f6bf5abd6853ee13c77f2e65c63735
OSS candidate = release/order076-oss-candidate
```

The old `main` and verified MAP-FIRST line have no normal shared merge base. Do not force-push `main` and do not discard either history.

## Future promotion procedure

After explicit merge authorization, run from the OSS candidate side:

```bash
git fetch origin --prune
git switch release/order076-oss-candidate
git pull --ff-only
git merge --allow-unrelated-histories -s ours origin/main \
  -m "merge(canon): reconcile verified VOY runtime with historical main"
```

This intentionally keeps the candidate tree byte-for-byte while making old `main` a second parent. The old history remains reachable, and the resulting merge commit can later fast-forward `main`.

Mandatory verification:

```bash
git diff release/order076-oss-candidate^{tree} HEAD^{tree}
# must be empty

npm ci
npm test
npm run build:linux
npm audit --omit=dev --audit-level=high
npx wrangler deploy --config wrangler.jsonc --dry-run
```

The reconciliation commit has a new SHA even with an identical tree. Because VOY embeds source identity, rebuild and browser-smoke that exact main SHA before deployment/tag/release.
