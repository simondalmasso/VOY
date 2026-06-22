#!/usr/bin/env node
// ============================================================
//  VOY V7 — Build hash injector
//
//  Replaces __BUILD_HASH__ and __DEPLOY_TS__ placeholders in:
//    - worker.js           (→ /api/health.build_hash)
//    - public/VOY-Lite.html (→ window.VOY_BUILD_HASH + <meta voy-build>)
//
//  Run by CI BEFORE `wrangler deploy`. The git short SHA is the single
//  source of truth — verify-production.sh checks the deployed build_hash
//  equals the commit being deployed. This is the V7 guardrail against
//  "local ≠ edge" desync: if the hash doesn't match, the deploy is rejected.
//
//  Usage:
//    node scripts/inject-build-hash.mjs            # auto-detects git SHA
//    BUILD_HASH=abc123 node scripts/inject-build-hash.mjs
// ============================================================
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;
const TARGETS = [
  { file: "worker.js",               placeholders: ["__BUILD_HASH__"] },
  { file: "public/VOY-Lite.html",    placeholders: ["__BUILD_HASH__", "__DEPLOY_TS__"] },
];

let hash = process.env.BUILD_HASH;
if (!hash) {
  try {
    hash = execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch (e) {
    console.error("[inject-build-hash] could not get git SHA:", e.message);
    process.exit(1);
  }
}
const ts = new Date().toISOString();
const dirty = (() => {
  try { return execSync("git status --porcelain", { encoding: "utf8" }).trim().length > 0; }
  catch { return false; }
})();

console.log(`[inject-build-hash] hash=${hash} ts=${ts} dirty=${dirty}`);

let changed = 0;
for (const t of TARGETS) {
  const path = ROOT + t.file;
  let src = readFileSync(path, "utf8");
  const before = src;
  src = src.replaceAll("__BUILD_HASH__", hash);
  if (t.placeholders.includes("__DEPLOY_TS__")) {
    src = src.replaceAll("__DEPLOY_TS__", ts);
  }
  if (src !== before) {
    writeFileSync(path, src, "utf8");
    changed++;
    console.log(`  ✓ ${t.file} — patched`);
  } else {
    console.log(`  · ${t.file} — no placeholders found (already injected?)`);
  }
}

console.log(`[inject-build-hash] done. ${changed}/${TARGETS.length} files patched.`);
// Exit 0 always — missing placeholders is not fatal (re-runs after inject are idempotent).
process.exit(0);
