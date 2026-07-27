/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let verifier;
const load = () => verifier ??= import(pathToFileURL(path.join(__dirname, '..', 'scripts', 'verify-release-policy.mjs')).href);
const policy = `release:
  generic_main_push_production_write: false
  candidate_required: true
  candidate_traffic_percent: 0
  exact_source_sha_required: true
  production_promotion: mission_specific
  aud_pass_required: true
  current_cloudflare_state_required: true
  rollback_requires_separate_authorization: true
`;

function fixture(workflows, files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voy-policy-'));
  fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/control'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs/control/release-policy.yaml'), policy);
  for (const [name, content] of Object.entries(workflows)) fs.writeFileSync(path.join(root, '.github/workflows', name), content);
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

const onMain = `on:
  push:
    branches: [main]`;
const wf = (run, on = onMain) => `name: test
${on}
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: ${run}
`;

const unsafe = [
  ['plain deploy', 'npx wrangler deploy --minify', /non-dry-run/],
  ['version deploy', 'npx wrangler@4.112.0 deploy --minify', /non-dry-run/],
  ['bunx versions deploy', 'bunx wrangler@latest versions deploy abc', /versions deploy/],
  ['npm exec deploy', 'npm exec wrangler -- deploy --minify', /non-dry-run/],
  ['secret', 'npx wrangler versions secret put X', /secret mutation/],
  ['unknown', 'npx wrangler hyperdrive create db', /not provably read-only/],
  ['dev no local', 'npx wrangler dev --port 8787', /not provably local-only/],
  ['dev remote', 'npx wrangler dev --local --remote', /not provably local-only/],
  ['command substitution', 'echo "$(npx wrangler@4.112.0 deploy --minify)"', /non-dry-run/],
  ['shell c', "bash -c 'npx wrangler@4.112.0 versions deploy abc'", /versions deploy/],
  ['official JS entrypoint deploy', 'node ./node_modules/wrangler/bin/wrangler.js deploy --minify', /non-dry-run/],
  ['direct official JS entrypoint', './node_modules/wrangler/bin/wrangler.js versions deploy abc', /versions deploy/],
  ['wrangler-dist entrypoint', 'node ./node_modules/wrangler/wrangler-dist/cli.js secret put X', /secret mutation/]
];

for (const [name, command, expected] of unsafe) test(`rejects ${name}`, async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': wf(command) }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), expected);
});

const safe = [
  ['plain dry-run', 'npx wrangler deploy --dry-run --minify'],
  ['version dry-run', 'npm exec wrangler@4.112.0 -- deploy --dry-run --minify'],
  ['version query', 'test "$(./node_modules/.bin/wrangler --version | awk \'{print $1}\')" = "4.112.0"'],
  ['package install', 'npm install --no-save --package-lock=false wrangler@4.112.0'],
  ['local dev', 'npx wrangler dev --local --port 8787'],
  ['official JS entrypoint dry-run', 'node ./node_modules/wrangler/bin/wrangler.js deploy --dry-run --minify'],
  ['wrangler-dist version', 'node ./node_modules/wrangler/wrangler-dist/cli.js --version']
];

for (const [name, command] of safe) test(`accepts ${name}`, async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': wf(command) }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('classifies required inline flow mappings', async () => {
  const { analyzeRepository, allowsGenericMainPush } = await load();
  for (const on of ['on: { push: { branches: [main] } }', 'on: { push: {} }']) {
    assert.equal(allowsGenericMainPush(`${on}\njobs:\n  x:\n    runs-on: ubuntu-latest\n`), true);
    const result = analyzeRepository(fixture({ 'main.yml': wf('npx wrangler deploy --minify', on) }));
    assert.equal(result.ok, false);
    assert.match(result.violations.join('\n'), /non-dry-run/);
  }
});

test('fails closed on multiline flow branch sequence and inspects command', async () => {
  const { analyzeRepository, allowsGenericMainPush } = await load();
  const on = `on:
  push:
    branches: [
      main
    ]`;
  assert.equal(allowsGenericMainPush(`${on}\njobs:\n  x:\n    runs-on: ubuntu-latest\n`), true);
  const result = analyzeRepository(fixture({ 'main.yml': wf('npx wrangler deploy --minify', on) }));
  const errors = result.violations.join('\n');
  assert.equal(result.ok, false);
  assert.match(errors, /multiline flow collection|not safely analyzable/);
  assert.match(errors, /non-dry-run/);
});

test('fails closed on YAML anchor and alias trigger and inspects command', async () => {
  const { analyzeRepository, allowsGenericMainPush } = await load();
  const on = `on:
  pull_request:
    branches: &main_branches [main]
  push:
    branches: *main_branches`;
  assert.equal(allowsGenericMainPush(`${on}\njobs:\n  x:\n    runs-on: ubuntu-latest\n`), true);
  const result = analyzeRepository(fixture({ 'main.yml': wf('npx wrangler deploy --minify', on) }));
  const errors = result.violations.join('\n');
  assert.equal(result.ok, false);
  assert.match(errors, /anchors, aliases/);
  assert.match(errors, /non-dry-run/);
});

test('does not classify feature-only flow mapping as main root', async () => {
  const { allowsGenericMainPush } = await load();
  assert.equal(allowsGenericMainPush('name: x\non: { push: { branches: [feat/x] } }\njobs:\n  x:\n    runs-on: ubuntu-latest\n'), false);
});

test('does not classify feature-only block sequence as main root', async () => {
  const { allowsGenericMainPush } = await load();
  assert.equal(allowsGenericMainPush('name: x\non:\n  push:\n    branches:\n      - feat/**\njobs:\n  x:\n    runs-on: ubuntu-latest\n'), false);
});

test('malformed flow fails closed', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': wf('npx wrangler deploy --dry-run', 'on: { push: { branches: [main] }') }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /not safely analyzable/);
});

test('follows unsafe local workflow', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({
    'main.yml': `name: main
${onMain}
jobs:
  call:
    uses: ./.github/workflows/reusable.yml
`,
    'reusable.yml': `name: reuse
on:
  workflow_call:
jobs:
  x:
    runs-on: ubuntu-latest
    steps:
      - run: npx wrangler versions deploy abc
`
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /versions deploy/);
});

test('unresolved local workflow fails closed', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': `name: main
${onMain}
jobs:
  call:
    uses: ./.github/workflows/missing.yml
` }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /unresolved local workflow/);
});

test('rejects Cloudflare credentials, action and mutating API', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': `name: main
${onMain}
jobs:
  x:
    runs-on: ubuntu-latest
    env:
      CLOUDFLARE_API_TOKEN: x
    steps:
      - uses: cloudflare/wrangler-action@v3
      - run: curl -X POST https://api.cloudflare.com/client/v4/accounts/x/workers/scripts
` }));
  const errors = result.violations.join('\n');
  assert.equal(result.ok, false);
  assert.match(errors, /CLOUDFLARE_API_TOKEN/);
  assert.match(errors, /Cloudflare or Wrangler action/);
  assert.match(errors, /Cloudflare API reference/);
});

test('quoted prose and log variables remain safe while local dev is scanned', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': wf('bash scripts/local.sh') }, {
    'scripts/local.sh': '#!/bin/sh\nWRANGLER_LOG=x\necho "Wrangler local starting"\nnpx wrangler dev --local --port 8787 >"$WRANGLER_LOG" 2>&1 &\n'
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('non-main candidate mutation is not a generic root', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({
    'main.yml': wf('npx wrangler deploy --dry-run'),
    'candidate.yml': wf('npx wrangler versions deploy abc', 'on:\n  push:\n    branches: [feat/candidate]')
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});
