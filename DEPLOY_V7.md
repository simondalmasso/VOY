# VOY V7 — Clean Deploy Guide (honest edition)

> **Root cause:** the V6 code was written locally but never actually deployed.
> `wrangler deploy --dry-run` passing ≠ a real deploy. Production is still
> serving the V4 build from Task 12. This document closes that gap permanently.

---

## 0. What's actually broken right now (verified 2026-06-22)

Run `bash scripts/verify-production.sh https://voy.is-a.dev` to reproduce:

| Check | Expected | Actual | Root cause |
|-------|----------|--------|------------|
| DNS CNAME | `voy-app.voy.workers.dev` | A record `104.18.5.103` only | is-a.dev PR **not merged** |
| HTTPS | `200` (VOY app) | `302 → is-a.dev/?d=voy` | is-a.dev fallback (domain not registered) |
| `/api/health` | `{"version":"V7.0.0",...}` | connection failed | V7 worker **not deployed** |
| UI version pin | `<meta voy-version V7.0.0>` | absent | V7 HTML **not deployed** |
| `Cache-Control` | `no-store` | absent | V7 worker.js **not deployed** |
| `/VOY-Lite.html` | `301 → /` | `302 → /VOY-Lite` | OLD V4 worker still serving |
| `#modeSelector` | present in DOM | absent | OLD V4 HTML still serving |

**Conclusion: 0 of 7 checks pass. Production is V4, local is V7. The dry-runs
were never followed by a real `wrangler deploy`.**

---

## 1. What V7 changes locally (already done in this session)

| File | Change |
|------|--------|
| `public/VOY-Lite.html` | `<meta name="voy-version" content="V7.0.0">` + `<meta name="voy-build" content="__BUILD_HASH__">` |
| `public/VOY-Lite.html` | `window.VOY_VERSION='V7.0.0'` + `window.VOY_BUILD_HASH='__BUILD_HASH__'` + `window.VOY_DEPLOY_TS='__DEPLOY_TS__'` (CI injects real values) |
| `public/VOY-Lite.html` | Mode selector force-shown on initial mount (`showModeSelector(true)` after `initModeSelector()`) |
| `public/VOY-Lite.html` | `renderSheet()` hero/alts loop respects `_activeMode` (taxi → taxi providers, remis → remis, walk → bike-only, all/car/custom → ride-hailing apps) |
| `public/VOY-Lite.html` | Script cache versions bumped `?v=8` → `?v=9` |
| `worker.js` | `_htmlNoStore()` helper: HTML responses get `Cache-Control: no-store, max-age=0, must-revalidate` + `Vary: Accept-Encoding` + `X-VOY-Version` + `X-VOY-Build` |
| `worker.js` | `/api/health` returns `version: "V7.0.0"` + `build_hash: "__BUILD_HASH__"` |
| `worker.js` | `WORKER_VERSION = "V7.0.0"` + `BUILD_HASH = "__BUILD_HASH__"` constants |
| `.github/workflows/deploy.yml` | CI/CD pipeline: lint → dry-run → inject hash → deploy → purge → health → version guardrail |
| `scripts/inject-build-hash.mjs` | Replaces `__BUILD_HASH__` / `__DEPLOY_TS__` in worker.js + VOY-Lite.html with git short SHA + ISO timestamp |
| `scripts/verify-production.sh` | 7-point production verification (DNS, HTTPS, health, UI version, cache, entrypoint, mode selector) |

---

## 2. What ONLY YOU can do (I cannot — no credentials in sandbox)

These are the steps the sandbox cannot execute. They require your Cloudflare
account, your GitHub account, and your DNS provider (is-a.dev via PR).

### Step A — Revoke leaked credentials (BEFORE anything else)

Both tokens shared in plaintext in earlier sessions are compromised:
- GitHub PAT: `ghp_…` (shared in Task 4/11)
- Cloudflare API token: `cfut_…` (shared in Task 5/11)

```
GitHub:    Settings → Developer settings → Personal access tokens → Revoke
Cloudflare: My Profile → API Tokens → Roll/Delete the compromised token
```

Then generate a NEW Cloudflare API token with these permissions:
- Account → Workers Scripts → Edit
- Zone → Cache Purge → Purge (optional, only if you add a zone you own)

### Step B — Change Cloudflare account subdomain

```
Cloudflare dashboard → account → Workers & Pages → Manage subdomain
  simondalmasso44  →  voy
```

This changes the worker URL from `voy-app.simondalmasso44.workers.dev` to
`voy-app.voy.workers.dev`. The is-a.dev CNAME targets the new URL.

### Step C — Deploy the worker (THE actual deploy, not a dry-run)

**One command** (does lint → dry-run → inject hash → deploy → verify):

```bash
export CLOUDFLARE_API_TOKEN=cfut_your_new_token
export CLOUDFLARE_ACCOUNT_ID=your_account_id

./scripts/deploy.sh
# or, if you haven't changed the subdomain yet:
./scripts/deploy.sh https://voy-app.simondalmasso44.workers.dev
```

The script:
1. Checks credentials are set
2. `bun run lint` (fail → stop)
3. `wrangler deploy --dry-run` (fail → stop)
4. `node scripts/inject-build-hash.mjs` (injects git SHA into worker.js + HTML)
5. `wrangler deploy --minify` (REAL deploy)
6. `bash scripts/verify-production.sh` (7-point check — fails if edge ≠ local)

If you prefer to run the steps manually:

```bash
bun run lint
node scripts/inject-build-hash.mjs
npx wrangler deploy --minify
bash scripts/verify-production.sh https://voy-app.simondalmasso44.workers.dev
```

**Alternative to is-a.dev: use a domain you already own.** If you have a domain
in your Cloudflare account (e.g. `voyapp.dev`, `tu-dominio.com`), add it as a
custom domain in `wrangler.jsonc`:

```jsonc
"routes": [
  { "pattern": "voy.tu-dominio.com", "custom_domain": true }
]
```

Then `wrangler deploy` auto-provisions the DNS record + TLS cert. This bypasses
the is-a.dev PR wait entirely. The worker.js redirect edge still works —
workers.dev visits redirect to your canonical domain (update `CANONICAL_ORIGIN`
in worker.js to match).

### Step D — Purge the Cloudflare edge cache

The old V4 build is cached at the edge (`cf-cache-status: HIT`). Even after
deploying V7, the edge may serve stale HTML for up to its TTL. The V7 worker
sets `Cache-Control: no-store` on HTML, but the OLD cached response may still
be served until purged.

```bash
# Via dashboard:
Cloudflare → Caching → Configuration → Purge Everything

# Via API (if you have a zone — workers.dev subdomain doesn't have a zone
# you can purge, but the deploy itself invalidates workers.dev cache):
curl -X POST "https://api.cloudflare.com/client/v4/zones/<ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <NEW_CF_TOKEN>" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

> **Note:** `voy.is-a.dev` is owned by the is-a.dev project, not your account.
> You cannot purge its zone cache directly. The `Cache-Control: no-store`
> header on the worker response is the fix — once V7 is deployed, the edge
> will not cache the HTML at all.

### Step E — Register voy.is-a.dev (the is-a.dev PR)

**One command** (generates the JSON + prints exact git commands):

```bash
node scripts/prepare-isadev-pr.mjs your-real-email@example.com
# If your GitHub username isn't simonkey888:
node scripts/prepare-isadev-pr.mjs your@email.com --github your-gh-username
# If you've changed the CF subdomain:
node scripts/prepare-isadev-pr.mjs your@email.com --subdomain voy
```

The script writes `domains/voy.json` with your real email and prints the
exact fork → clone → commit → `gh pr create` commands.

If you prefer to do it manually, the file `domains/voy.json` has `TU_EMAIL`
as a placeholder — replace it with your real email (is-a.dev requires contact
info), then fork `is-a-dev/register`, add the file, and open a PR.

Wait for merge (usually 1-7 days) + DNS propagation (5-30 min after merge).

> **Skip the wait:** if you own a domain, use Step C's "owned domain"
> alternative instead. You'll have a canonical URL in 2 minutes, not 7 days.

### Step F — Verify the canonical domain

After the is-a.dev PR is merged and DNS propagates:
```bash
bash scripts/verify-production.sh https://voy.is-a.dev
# All 7 checks should pass
```

---

## 3. The CI/CD guardrail (prevents this from happening again)

`.github/workflows/deploy.yml` runs on every push to `main`:

```
push main
  → bun install
  → bun run lint                          (fail → stop)
  → wrangler deploy --dry-run             (fail → stop)
  → node scripts/inject-build-hash.mjs    (git SHA → worker.js + HTML)
  → wrangler deploy --minify              (REAL deploy)
  → purge CF cache                        (if zone owned)
  → health check /api/health              (fail → stop)
  → verify build_hash == git SHA          (MISMATCH → DEPLOY FAILED)
  → verify UI has V7.0.0 meta             (MISMATCH → DEPLOY FAILED)
  → verify /VOY-Lite.html → 301           (MISMATCH → DEPLOY FAILED)
```

**Hard guardrail:** if the live `build_hash` ≠ the git SHA just deployed,
the workflow fails with `::error::VERSION MISMATCH`. This makes it impossible
to silently serve a stale build — the CI will scream if the edge doesn't
match the commit.

### Required GitHub secrets

```
Settings → Secrets and variables → Actions:
  CLOUDFLARE_API_TOKEN    (new token from step A)
  CLOUDFLARE_ACCOUNT_ID   (dashboard → right sidebar)
  CLOUDFLARE_ZONE_ID      (optional — only if you own a zone for cache purge)
```

---

## 4. Local verification (before you deploy)

```bash
# 1. Lint
bun run lint

# 2. Dry-run (config + asset binding check)
npx wrangler deploy --dry-run --minify

# 3. Browser self-verify (dev server)
bun run dev &
# Visit http://localhost:3000 — verify:
#   - Mode selector visible on load (Todo/Auto/Taxi/Remis/A pie/Ruta pills)
#   - Tap "Taxi" → hero shows Radiotaxi/TaxiApp (not Uber/DiDi)
#   - Tap "Todo" → hero shows Uber/DiDi/Maxim again
#   - 5-tap VOY wordmark → analytics dashboard shows V7.0.0

# 4. Inject hash + verify locally
node scripts/inject-build-hash.mjs
grep 'VOY_BUILD_HASH' public/VOY-Lite.html  # should show real SHA, not __BUILD_HASH__
```

---

## 5. File inventory (V7)

```
worker.js                              — V7: _htmlNoStore + health v7.0.0 + BUILD_HASH
wrangler.jsonc                         — voy-core + analytics engine binding
public/VOY-Lite.html                   — V7.0.0 version pin + mode selector + _activeMode filter
public/manifest.json                   — PWA manifest (unchanged, V6-complete)
public/icons/                          — PWA icons (unchanged, V6-complete)
public/core/mobilityEngine.js          — UNTOUCHED (pure functions)
public/core/pricingEngine.js           — UNTOUCHED (Bayesian fare confidence)
public/core/eventBus.js                — UNTOUCHED (event spec 1.4)
public/ui/mobilityController.js        — V7: provider ID remapping fix (6 providers in ranked)
domains/voy.json                       — is-a.dev PR file (use scripts/prepare-isadev-pr.mjs to fill)
.github/workflows/deploy.yml           — V7 CI/CD pipeline with hash guardrail
scripts/deploy.sh                      — ONE-COMMAND deploy (lint→inject→deploy→verify)
scripts/inject-build-hash.mjs          — CI build-hash injector (git SHA → worker.js + HTML)
scripts/prepare-isadev-pr.mjs          — Generates domains/voy.json + prints PR commands
scripts/verify-production.sh           — 7-point production verification
```

---

## 6. Honest status

| Item | Status |
|------|--------|
| V7 code (version pin + cache bust + mode selector) | ✅ done locally |
| CI/CD workflow + guardrail | ✅ done locally |
| Verification script | ✅ done locally, confirms 0/7 checks pass on prod |
| `wrangler deploy` (real) | ❌ requires your CF credentials |
| is-a.dev PR | ❌ requires your GitHub + real email |
| CF cache purge | ❌ requires your CF token (but no-store header makes this optional) |
| Account subdomain change | ❌ dashboard-only, cannot be scripted |

**The code is ready. The deploy is not. Run steps A-F above.**
