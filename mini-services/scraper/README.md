# voy-scraper

Legal-only, **non-intrusive** taxi/remis directory scraper mini-service for VOY
(Santa Fe, Argentina). Built as an independent Bun project.

> **STATUS: SKELETON.** Sources listed in `sources.ts` are *documented
> placeholders*. This service does **not** perform any outbound HTTP request
> against real URLs. `runScrapeCycle()` normalizes seed data and writes it to
> `data/taxis.json` and `data/remises.json`. Real fetching is a TODO pending
> legal review (see [How to add a real source](#how-to-add-a-real-source)).

---

## Legal-only policy (HARD CONSTRAINT)

This service operates under a strict `legal_only: true` policy. It collects
only **publicly-published** provider information from sources that have been
cleared by legal review:

- public municipal websites
- official WhatsApp catalogs (public link references only)
- published phone directories

It MUST NOT:

- bypass authentication, paywalls, captchas, or anti-bot protections
  (`no_bypass: true`)
- send credentials, cookies, or `Authorization` headers (`no_auth_bypass: true`)
- use headless browsers, JS rendering, or DOM emulation
- impersonate a logged-in user
- poll faster than 1 request / second per host (the helper enforces 1.5s)
- ignore `robots.txt` intent

Strategy: **non-intrusive HTTP polling** with a polite `User-Agent` and plain
`GET` requests only.

These constraints are enforced in code at the `politeFetch()` helper
(`index.ts`):

| Constraint | Enforcement |
|---|---|
| GET only | `method: "GET"` hardcoded |
| No cookies | `Cookie: ""` + `credentials: "omit"` |
| No auth headers | `Authorization: ""` hardcoded (overridden even if caller passes one) |
| No headless browser / JS rendering | Plain `Bun.fetch` only — no Puppeteer/Playwright dep |
| Polite UA | `voy-scraper/0.1 (+https://voy.is-a.dev; legal-only; non-intrusive; contact: ops@voy.is-a.dev)` |
| Per-host rate limit | `SAME_HOST_DELAY_MS = 1500` (1.5s between same-host requests) |
| robots.txt intent | Operator must pre-clear each URL (see [How to add a real source](#how-to-add-a-real-source)) |

---

## Frequency

Spec: `24h`. The skeleton does **not** auto-schedule (keeps the process
inspectable). Operators should run a daily cron that hits:

```sh
curl -X POST http://localhost:3007/api/scrape
```

---

## Run

```sh
cd /home/z/my-project/mini-services/scraper
bun install            # if dependencies existed (none required in skeleton)
bun run dev            # bun --hot index.ts  (dev, hot reload)
bun run start          # bun index.ts        (prod)
```

The server listens on **port 3007 (hardcoded, NOT env-driven)**.

---

## Endpoints

| Method | Path | Returns |
|---|---|---|
| `GET` | `/health` | `{ ok: true, service: "voy-scraper", port: 3007 }` |
| `GET` | `/api/taxis` | `Provider[]` (normalized taxis JSON from `data/taxis.json`) |
| `GET` | `/api/remises` | `Provider[]` (normalized remises JSON from `data/remises.json`) |
| `POST` | `/api/scrape` | `{ ok: true, scraped: { taxis: N, remises: M }, source: "seed" }` — triggers an idempotent scrape cycle (skeleton: re-writes seed data) |

### Normalized output schema

Shared by both `/api/taxis` and `/api/remises`:

```ts
type Provider = {
  id: string;            // slug, e.g. "radiotaxi-santafe"
  name: string;          // "Radiotaxi Santa Fe"
  type: "taxi" | "remis";
  phone?: string;        // E.164 or local format
  whatsapp?: string;
  base_fare?: number;    // ARS, if publicly published
  coverage?: string[];   // neighborhoods or ["citywide"]
  source: string;        // URL or catalog name
  updated_at: string;    // ISO 8601
}
```

---

## Files

```
mini-services/scraper/
├── package.json
├── index.ts           # Bun server (port 3007) + endpoints + runScrapeCycle + politeFetch
├── sources.ts         # SOURCE_REGISTRY (descriptors) + SEED_PROVIDERS (illustrative)
├── normalizer.ts      # RawProviderRecord → Provider (pure functions)
├── store.ts           # read/write data/taxis.json + data/remises.json
├── README.md          # this file
└── data/
    ├── taxis.json     # written by runScrapeCycle() (seeded on first boot)
    └── remises.json
```

---

## Seed data

`sources.ts` exports `SEED_PROVIDERS` — ~6 illustrative Santa Fe taxi/remis
companies (Radiotaxi Santa Fe, Remises Real, TaxiApp Santa Fe, etc.). These are
**documented examples**, not real scraped data. Every record is marked
`source: "seed/placeholder"`. Phone numbers are intentionally placeholder-shaped
(`+54 342 4XXX-XXXX`) to avoid implying verified contact data.

---

## How to add a real source

> ⚠️ Do this only after legal review. The skeleton intentionally ships with
> every source `enabled: false`.

1. **Legal review.** Confirm the source publishes the data for public reuse,
   read its ToS, and check `robots.txt`.
2. **Register the descriptor.** Add an entry to `SOURCE_REGISTRY` in
   `sources.ts` with `enabled: false` initially. Capture notes about robots.txt
   status, ToS, expected response format, and cadence.
3. **Log the review.** Append a short note to this README under
   [_Source review log_](#source-review-log) with the date, reviewer, URL,
   robots.txt outcome, and ToS outcome.
4. **Implement a per-source adapter.** In `index.ts` → `runScrapeCycle()`, add
   a branch under the `if (enabled.length > 0)` block that calls `politeFetch()`
   and parses the response into `RawProviderRecord[]`. The adapter MUST use
   `politeFetch()` — it inherits every legal-only constraint from there.
5. **Flip the switch.** Set `enabled: true` on the descriptor. Re-run
   `POST /api/scrape` and verify `data/taxis.json` / `data/remises.json`.

### Source review log

| Date | Source URL | robots.txt | ToS | Reviewer | Status |
|---|---|---|---|---|---|
| _(empty — no real source reviewed yet)_ | | | | | |

---

## Constraints honored

- `legal_only: true` — prominent comment block at top of `index.ts` + this README
- `no_bypass: true`, `no_auth_bypass: true` — `politeFetch()` refuses
  credentials, cookies, auth headers; no headless browsers / JS rendering;
  plain HTTP GET only; 1.5s delay between same-host requests
- `frequency: 24h` — operator-driven via `POST /api/scrape` (no auto-schedule
  in skeleton)
- `output_format.taxis = "normalized_json"`, `output_format.remises = "normalized_json"`
  — enforced by `normalizer.ts` + `store.ts`
- Skeleton does **not** hit any real external URL
