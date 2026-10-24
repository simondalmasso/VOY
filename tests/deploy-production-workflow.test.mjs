import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/deploy-production.yml', import.meta.url), 'utf8');

test('production deploy is manual, main-only, and requires explicit confirmation', () => {
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main' && inputs\.confirm == 'DEPLOY'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /concurrency:[\s\S]*?cancel-in-progress: false/);
});

test('production deploy verifies the exact build and preserves the original yellow PNG', () => {
  assert.match(workflow, /m\.source_commit !== process\.env\.GITHUB_SHA/);
  assert.match(workflow, /4d1ac2acc49aba15094f452ff15ecf5a57801e933845ba06c7b4b09e4d8fa1c3/);
  assert.match(workflow, /test "\$bytes" = '3769'/);
  assert.match(workflow, /YELLOW_BUS_PNG_SHA256/);
});

test('health verification retries only for bounded propagation, then fails on a mismatched commit', () => {
  assert.match(workflow, /for attempt in \$\(seq 1 30\); do/);
  assert.match(workflow, /sleep 2/);
  assert.match(workflow, /if \[ "\$live_source" != "\$GITHUB_SHA" \]; then[\s\S]*?exit 1/);
  assert.match(workflow, /LIVE_SOURCE_COMMIT=/);
  assert.match(workflow, /LIVE_YELLOW_BUS_PNG_SHA256=/);
});
