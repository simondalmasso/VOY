/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let modulePromise;

function loadVerifier() {
  if (!modulePromise) {
    modulePromise = import(pathToFileURL(path.join(__dirname, '..', 'scripts', 'verify-release-policy.mjs')).href);
  }
  return modulePromise;
}

const policy = `version: 1
release:
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voy-release-policy-'));
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs', 'control'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'control', 'release-policy.yaml'), policy);
  for (const [name, content] of Object.entries(workflows)) {
    fs.writeFileSync(path.join(root, '.github', 'workflows', name), content);
  }
  for (const [relativePath, content] of Object.entries(files)) {
    const absolute = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  return root;
}

const safeMain = `name: safe
on:
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: npx wrangler deploy --dry-run --minify
`;

function workflowWithRun(run, on = `on:
  push:
    branches: [main]`) {
  return `name: test
${on}
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: ${run}
`;
}

test('legacy non-dry-run main deploy is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'deploy.yml': safeMain.replace('--dry-run --minify', '--minify')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /non-dry-run wrangler deploy/);
});

test('repaired main validation with dry-run passes', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({ 'deploy.yml': safeMain }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('wrangler versions deploy is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'deploy.yml': safeMain.replace('npx wrangler deploy --dry-run --minify', 'npx wrangler versions deploy abc')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /versions deploy/);
});

test('Cloudflare credentials are rejected from a main-push path', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'deploy.yml': safeMain.replace('run: npx', 'env:\n          CLOUDFLARE_API_TOKEN: example\n        run: npx')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /CLOUDFLARE_API_TOKEN/);
});

test('unsafe local reusable workflow is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': `name: main
on:
  push:
    branches: [main]
jobs:
  call:
    uses: ./.github/workflows/reusable.yml
`,
    'reusable.yml': `name: reusable
on:
  workflow_call:
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npx wrangler deploy
`
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /reusable\.yml: non-dry-run/);
});

test('unresolved local workflow fails closed', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': `name: main
on:
  push:
    branches: [main]
jobs:
  call:
    uses: ./.github/workflows/missing.yml
`
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /unresolved local workflow/);
});

test('mutating Cloudflare API request is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': safeMain.replace(
      'npx wrangler deploy --dry-run --minify',
      'curl -X POST https://api.cloudflare.com/client/v4/accounts/example/workers/scripts'
    )
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /mutating Cloudflare API/);
});

test('Cloudflare action and inherited secrets are rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': `name: unsafe
on: [push]
jobs:
  deploy:
    uses: cloudflare/wrangler-action@v3
    secrets: inherit
`
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /Cloudflare or Wrangler action/);
  assert.match(result.violations.join('\n'), /secrets: inherit/);
});

test('unsafe local shell wrapper is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': `name: unsafe wrapper
on:
  push:
    branches: [main]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - run: bash scripts/release.sh
`
  }, {
    'scripts/release.sh': '#!/bin/sh\nnpx wrangler deploy --minify\n'
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /scripts\/release\.sh: non-dry-run/);
});

test('unreadable workflow shape fails closed', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': 'name: invalid\non:\n\tpush:\n\t\tbranches: [main]\n'
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /tab indentation|no readable top-level jobs/);
});

test('flow mapping with main branch is classified and mutation is rejected', async () => {
  const { analyzeRepository, allowsGenericMainPush } = await loadVerifier();
  const on = 'on: { push: { branches: [main] } }';
  assert.equal(allowsGenericMainPush(`${on}\njobs:\n  x:\n    runs-on: ubuntu-latest\n`), true);
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npx wrangler@4.112.0 deploy --minify', on)
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /non-dry-run wrangler deploy/);
});

test('empty flow mapping push is generic and mutation is rejected', async () => {
  const { analyzeRepository, allowsGenericMainPush } = await loadVerifier();
  const on = 'on: { push: {} }';
  assert.equal(allowsGenericMainPush(`${on}\njobs:\n  x:\n    runs-on: ubuntu-latest\n`), true);
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('bunx wrangler@latest versions deploy', on)
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /versions deploy/);
});

test('flow mapping restricted to dev does not target main', async () => {
  const { allowsGenericMainPush } = await loadVerifier();
  const text = `name: dev
on: { push: { branches: [dev] } }
jobs:
  x:
    runs-on: ubuntu-latest
`;
  assert.equal(allowsGenericMainPush(text), false);
});

test('flow mapping main with version-qualified dry-run passes', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npx wrangler@4.112.0 deploy --dry-run --minify', 'on: { push: { branches: [main] } }')
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('version-qualified npx deploy without dry-run is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npx wrangler@4.112.0 deploy --minify')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /non-dry-run wrangler deploy/);
});

test('version-qualified bunx versions deploy is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('bunx wrangler@latest versions deploy abc')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /versions deploy/);
});

test('npm exec wrangler deploy is rejected', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npm exec wrangler -- deploy --minify')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /non-dry-run wrangler deploy/);
});

test('npm exec version-qualified dry-run passes', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npm exec wrangler@4.112.0 -- deploy --dry-run --minify')
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('ambiguous Wrangler command fails closed', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('$WRANGLER publish')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /not provably read-only|not safely classifiable/);
});

test('Wrangler version query is accepted', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('test "$(./node_modules/.bin/wrangler --version | awk \'{print $1}\')" = "4.112.0"')
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('installing a pinned Wrangler package is not treated as invocation', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npm install --no-save --package-lock=false wrangler@4.112.0')
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('malformed inline flow trigger fails closed', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npx wrangler deploy --dry-run', 'on: { push: { branches: [main] }')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /flow syntax is not safely analyzable/);
});

test('flow branches-ignore main does not target main', async () => {
  const { allowsGenericMainPush } = await loadVerifier();
  const text = `name: ignored
on: { push: { branches-ignore: [main] } }
jobs:
  x:
    runs-on: ubuntu-latest
`;
  assert.equal(allowsGenericMainPush(text), false);
});

test('unknown Wrangler subcommand fails closed', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': workflowWithRun('npx wrangler hyperdrive create database')
  }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /not provably read-only/);
});

test('non-main candidate workflow is not inspected as a generic main root', async () => {
  const { analyzeRepository } = await loadVerifier();
  const result = analyzeRepository(fixture({
    'main.yml': safeMain,
    'candidate.yml': `name: candidate
on:
  push:
    branches: [feat/candidate]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: npx wrangler@4.112.0 versions deploy abc
`
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});
