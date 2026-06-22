#!/usr/bin/env node
// ============================================================
//  VOY V7 — is-a.dev PR file generator
//
//  Generates domains/voy.json with a real email, then prints the
//  exact git commands to fork + commit + open the PR.
//
//  Usage:
//    node scripts/prepare-isadev-pr.mjs you@example.com
//    node scripts/prepare-isadev-pr.mjs you@example.com --github simonkey888
// ============================================================
import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

const email = process.argv[2];
const ghUser = (process.argv.indexOf("--github") > -1)
  ? process.argv[process.argv.indexOf("--github") + 1]
  : "simonkey888";

if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/prepare-isadev-pr.mjs you@example.com [--github USERNAME]");
  console.error("  email is required (is-a.dev requires contact info)");
  process.exit(1);
}

// Detect the worker subdomain. If user has changed simondalmasso44 → voy,
// they should pass --subdomain voy. Default to current state.
const subdomainIdx = process.argv.indexOf("--subdomain");
const subdomain = subdomainIdx > -1 ? process.argv[subdomainIdx + 1] : "voy";
const cname = `voy-app.${subdomain}.workers.dev`;

const record = {
  owner: { username: ghUser, email },
  record: { CNAME: cname }
};

const path = ROOT + "domains/voy.json";
writeFileSync(path, JSON.stringify(record, null, 2) + "\n", "utf8");
console.log(`✅ Wrote ${path}`);
console.log(JSON.stringify(record, null, 2));
console.log("");
console.log("CNAME target:", cname);
console.log("");
console.log("── Next steps ──");
console.log("1. Fork is-a-dev/register on GitHub (use the Fork button)");
console.log("2. Clone your fork:");
console.log("   git clone https://github.com/" + ghUser + "/register.git");
console.log("   cd register");
console.log("3. Copy the file:");
console.log("   cp " + path + " domains/voy.json");
console.log("4. Commit + push:");
console.log("   git checkout -b add-voy-domain");
console.log("   git add domains/voy.json");
console.log('   git commit -m "Register voy.is-a.dev"');
console.log("   git push origin add-voy-domain");
console.log("5. Open the PR:");
console.log("   gh pr create --repo is-a-dev/register \\");
console.log("     --title 'Register voy.is-a.dev' \\");
console.log('     --body "Urban mobility assistant for Santa Fe, Argentina. CNAME to Cloudflare Worker voy-app.' + subdomain + '.workers.dev. Owner: @' + ghUser + '."');
console.log("");
console.log("After merge + DNS propagation (5-30 min), verify:");
console.log("  bash scripts/verify-production.sh https://voy.is-a.dev");
