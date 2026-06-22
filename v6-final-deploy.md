# VOY — Final Deploy Architecture (GLM SPEC)

Single public domain: **https://voy.is-a.dev**

This document is the single source of truth for the final deploy. It consolidates
the GLM SPEC (`project: VOY`, `environment: production`) with the technically
correct Cloudflare implementation.

---

## 1. Deploy architecture (as implemented)

```jsonc
{
  "project": "VOY",
  "environment": "production",
  "domains": {
    "primary": "https://voy.is-a.dev",
    "internal_worker": "https://voy-app.voy.workers.dev",
    "legacy_redirects": [
      "https://voy-app.simondalmasso44.workers.dev",
      "https://voy-app.simondalmasso44.workers.dev/VOY-Lite.html"
    ]
  },
  "routing": {
    "/": "VOY-Lite.html",
    "strategy": "cloudflare_worker_static_assets",
    "rewrite": true,
    "hide_internal_paths": true
  },
  "redirect_policy": {
    "type": "301",
    "rules": [
      { "from": "*workers.dev/*",            "to": "https://voy.is-a.dev{path}{search}" },
      { "from": "*simondalmasso*",            "to": "https://voy.is-a.dev{path}{search}" },
      { "from": "/VOY-Lite.html",             "to": "https://voy.is-a.dev/" }
    ]
  },
  "security": {
    "expose_worker_domain": false,   // direct workers.dev visits 301 → canonical
    "disable_directory_listing": true,
    "remove_headers": ["x-powered-by"]   // see §5 for edge-header limitation
  }
}
```

### Why `internal_worker` is `voy-app.voy.workers.dev` (not `voy.workers.dev`)

Workers.dev URLs follow `{worker-name}.{account-subdomain}.workers.dev`.
With worker name `voy-app` and the account subdomain migrated to `voy`, the real,
resolvable URL is **`voy-app.voy.workers.dev`**. `voy.workers.dev` is not a valid
workers.dev URL (two labels are always required). The GLM SPEC's `voy.workers.dev`
is treated as shorthand; the is-a.dev CNAME uses the resolvable form.

---

## 2. `worker.js` — edge routing logic (PASO 4, OBLIGATORIO)

Implemented in `/home/z/my-project/worker.js`. Four rules, evaluated in order:

| # | Condition | Action |
|---|-----------|--------|
| 1 | `pathname` = `/VOY-Lite.html` (any host, case-insensitive) | **301** → `https://voy.is-a.dev/` (hides internal path, single hop) |
| 2 | `host` ends with `.workers.dev` OR contains `simondalmasso` | **301** → `https://voy.is-a.dev{path}{search}` (preserves deep links) |
| 3 | `pathname` = `/` | internal rewrite → `/VOY-Lite.html` (browser URL stays `/`) |
| 4 | anything else | `env.ASSETS.fetch(request)` (static files) |

**Why CNAME'd traffic is served, not redirected:** When a browser resolves
`voy.is-a.dev` via the is-a.dev CNAME → `voy-app.voy.workers.dev`, Cloudflare
preserves the original `Host: voy.is-a.dev` header. Rule 2 matches on
`*.workers.dev` / `*simondalmasso*` only, so CNAME'd requests fall through to
rules 3/4 and are served. Direct visits to the workers.dev URL (which would
expose the worker domain) are 301'd to canonical. No redirect loop.

**Header cleanup** (`_cleanHeaders`): deletes `x-powered-by` and `server` from
the worker response. See §5 for the edge-header limitation.

---

## 3. `wrangler.jsonc` — decisions

- **`workers_dev: true`** — REQUIRED. The is-a.dev CNAME targets the workers.dev
  URL. Setting `false` would break the CNAME path entirely. Direct workers.dev
  access is neutralized by the worker's 301 redirect (rule 2), so the worker
  domain is never browseable.
- **`routes: []`** — `voy.is-a.dev` and `voy.app` zones are NOT in this CF
  account. Adding a route/custom_domain for a non-owned zone fails deploy
  ("Could not find zone"). `voy.is-a.dev` reaches the worker via DNS-level CNAME.
- **`assets.not_found_handling: "none"`** — unknown paths return a plain 404.
  No SPA fallback, no directory enumeration (Workers Assets never lists dirs).

---

## 4. is-a.dev registration

### 4a. JSON — `domains/voy.json` (ready to submit)

File location in the [is-a.dev register](https://github.com/is-a-dev/register)
repo (forked to your account): `domains/voy.json`

```json
{
  "owner": {
    "username": "simonkey888",
    "email": "TU_EMAIL"
  },
  "record": {
    "CNAME": "voy-app.voy.workers.dev"
  }
}
```

**Before submitting:** replace `TU_EMAIL` with a real, monitored email
(is-a.dev may use it for verification/contact).

**Why `voy-app.voy.workers.dev` and not `voy.workers.dev`:** see §1. The CNAME
target MUST resolve, or the is-a.dev maintainers will reject the PR during
verification. Submit AFTER the subdomain migration (`simondalmasso44` → `voy`)
so the target is live.

### 4b. PR description

**Title:** `Register voy.is-a.dev`

**Body:**
```markdown
## What
Registering `voy.is-a.dev` — a public urban mobility web app for Santa Fe, Argentina.

## Subdomain
`voy` — short, brand-aligned, easy to type on mobile. No conflict with existing
domains (searched `domains/` before submitting).

## Project
VOY is a zero-install (no app store) web app that compares Uber, DiDi, Maxim,
taxi, remis, and bus options in a single screen — estimated fares, bus route
overlays, encrypted local memory. Built as a Cloudflare Workers SPA.

- Live app: https://voy-app.voy.workers.dev/
- Source:   https://github.com/simonkey888/VOY
- Tech:     Cloudflare Workers + static assets, MapLibre GL, vanilla JS, no frameworks

## DNS record
`CNAME voy.is-a.dev → voy-app.voy.workers.dev`

## Verification
Once DNS propagates, `voy.is-a.dev` will resolve to the Cloudflare Worker via
the CNAME. The worker canonicalizes the host (direct workers.dev visits 301 →
voy.is-a.dev) so the public URL is always `voy.is-a.dev`.

## Owner
- GitHub: @simonkey888
- (email in the JSON record)

## Checklist
- [x] Searched `domains/` for existing `voy` — none found
- [x] JSON follows the schema (owner.username, record.CNAME)
- [x] CNAME target is a real, owned, resolvable endpoint
- [x] Project is live and functional
```

---

## 5. Header removal — honest limitation

The GLM SPEC asks to remove `server`, `x-powered-by`, `cf-ray`.

| Header | Removable from Worker? | Notes |
|--------|------------------------|-------|
| `x-powered-by` | ✅ Yes | Deleted in `_cleanHeaders()`. |
| `server` | ⚠️ Partial | Worker deletes it from its own response, but the Cloudflare **edge re-adds** `server: cloudflare` after the worker returns. Cannot be removed without Enterprise / custom edge config. |
| `cf-ray` | ❌ No | Injected by the Cloudflare edge AFTER the worker returns. Not accessible to the worker at all. |

This is a hard Cloudflare platform constraint, not an implementation gap. To
fully strip `server`/`cf-ray` you would need Cloudflare Enterprise (or a
non-CF reverse proxy in front). The worker does best-effort cleanup; the
remaining headers do not expose personal information (no `simondalmasso`, no
GitHub username) — they only identify Cloudflare as the host.

---

## 6. Directory listing — disabled

Workers Assets never enumerates directories. Combined with
`not_found_handling: "none"`:
- `/core/` (directory path) → 404 (no listing)
- `/core/mobilityEngine.js` → 200 (real file, served)
- `/random-typo` → 404

The HTML loads its scripts via relative `<script src>` (`/core/…`, `/ui/…`),
which still resolve as real files. No breakage.

---

## 7. Final deploy checklist

### Infra
- [ ] Cloudflare account subdomain changed `simondalmasso44` → `voy`
      (dashboard: Workers & Pages → subdomain banner → Change subdomain)
- [ ] Verify `https://voy-app.voy.workers.dev/` returns HTTP 200
- [ ] is-a.dev PR created (`domains/voy.json`, CNAME → `voy-app.voy.workers.dev`)
- [ ] PR merged + DNS propagated (`dig voy.is-a.dev` → Cloudflare edge)
- [ ] `npx wrangler deploy` (worker live with redirect edge)
- [ ] Verify `https://voy.is-a.dev/` → HTTP 200, title "VOY — Movilidad Santa Fe"
- [ ] Verify `https://voy-app.voy.workers.dev/` → 301 → `https://voy.is-a.dev/`
- [ ] Verify `https://voy-app.simondalmasso44.workers.dev/` → 301 → `https://voy.is-a.dev/`
- [ ] Verify `https://voy.is-a.dev/VOY-Lite.html` → 301 → `https://voy.is-a.dev/`

### Product
- [ ] `/VOY-Lite.html` hidden (301 to `/`)
- [ ] No `simondalmasso` / personal name anywhere in the live response
- [ ] 301 redirects active for workers.dev + legacy host
- [ ] Root route clean (`/` serves the app, URL never shows `/VOY-Lite.html`)

### UX
- [ ] Only `voy.is-a.dev` visible to the user (address bar, share links)
- [ ] Zero Cloudflare/technical branding in the UI
- [ ] Mobile-first intact (360px no horizontal scroll, sticky footer)

---

## 8. Migration order (do NOT skip)

1. **Revoke leaked credentials** (from prior session): GitHub PAT `ghp_…` and
   Cloudflare token `cfut_…` — both shared in plaintext. Rotate before any deploy.
2. **Cloudflare dashboard** → Workers & Pages → change account subdomain
   `simondalmasso44` → `voy`. All workers migrate automatically.
3. **Verify** `https://voy-app.voy.workers.dev/` is live (HTTP 200).
4. **Fork is-a.dev/register** → add `domains/voy.json` (CNAME →
   `voy-app.voy.workers.dev`) → open PR.
5. **Wait for PR merge** + DNS propagation (24–48h).
6. **`npx wrangler deploy`** — worker live with redirect edge + path hiding.
7. **Verify** all checklist items in §7.
8. **Keep `workers_dev: true`** — it MUST stay true (the CNAME targets the
   workers.dev URL; disabling it breaks `voy.is-a.dev`).

> `workers_dev: false` is NOT an option here. Unlike a Custom Domain (which
> requires the zone in your account), the is-a.dev CNAME path depends on the
> workers.dev URL being live. The worker's 301 redirect achieves the
> "expose_worker_domain: false" goal in practice — the domain redirects,
> never serves browseable content.

---

## 9. Files changed (this pass)

| File | Change |
|------|--------|
| `worker.js` | Rewritten: 4-rule edge routing (301 redirects + root rewrite + header cleanup). **Modified per explicit PASO 4 request** (overrides earlier "don't touch" constraint). |
| `wrangler.jsonc` | Updated comments (is-a.dev CNAME strategy), `routes: []`, `not_found_handling: "none"`. `workers_dev: true` kept (required). |
| `domains/voy.json` | NEW — ready-to-submit is-a.dev registration record. |
| `src/middleware.ts` | Mirrors worker path-hiding for local preview (`/VOY-Lite.html` → 308 → `/`). No host redirects (keeps localhost reachable). |

**Untouched:** `public/VOY-Lite.html`, `public/core/mobilityEngine.js`,
`public/ui/mobilityController.js`, `public/logo.svg`, `public/fares.json`,
`public/robots.txt`. All V6.1 product work (corporate minimal, fare engine v2,
logo system) is preserved.

---

## 10. SECURITY

No credentials were used in this pass. All operations are local code changes +
`wrangler deploy --dry-run`. The previously leaked GitHub PAT and Cloudflare
token (from prior sessions) MUST be revoked before deploying:

- GitHub:    https://github.com/settings/tokens → delete → regenerate scoped
- Cloudflare: https://dash.cloudflare.com/profile/api-tokens → roll → create scoped
