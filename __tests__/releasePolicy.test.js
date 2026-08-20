/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

let verifier;
const load = () => verifier ??= import(pathToFileURL(path.join(__dirname, '..', 'scripts', 'verify-release-policy.mjs')).href);

const policy = `version: 2
project: VOY
order: 45
authority:
  governance: github
  orders: numbered_github_issues
  repository_instructions: AGENTS.md
  release_control: cloudflare_workers
  runtime_confirmation: production
operating_model:
  arq:
    role: construction_operation_execution_implementation
    principal_implementer: true
    technical_autonomy: true
    work_mode: long_deep_autonomous
    waits_for_aud_during_internal_construction: false
    evidence_before_close: true
  aud:
    role: brain_direction_audit_research
    independent: true
    intervenes_before_material_checkpoint: false
    evidence_before_verdict: true
  handoff:
    trigger: arq_material_auditable_checkpoint
    surface: github
release:
  merge_requires_explicit_numbered_order: true
  deploy_requires_explicit_numbered_order: true
  production_mutation_requires_explicit_numbered_order: true
  internal_candidate_or_validation_work_may_continue_without_intermediate_aud: true
  deploy_sequence:
    - explicit_numbered_github_order
    - arq_build_implement_test_verify
    - cloudflare_workers_first
    - verify_effective_runtime
    - github_reconcile_after_runtime
claims:
  no_done_without_evidence: true
  no_verdict_without_sufficient_evidence: true
`;

const agents = `# VOY — Operating Governance V2
\`\`\`text
ORDER=45
ORDERS=NUMBERED_GITHUB_ISSUES_ONLY
WORK_MODE=LONG_DEEP_AUTONOMOUS
INTERNAL_RESTRICTIONS=MINIMAL
ARQ_DOES_NOT_WAIT_FOR_AUD_DURING_INTERNAL_CONSTRUCTION=YES
AUD_DOES_NOT_INTERVENE_UNTIL_ARQ_PUBLISHES_MATERIAL_AUDITABLE_CHECKPOINT=YES
DEPLOY=CLOUDFLARE_WORKERS_FIRST_THEN_GITHUB
\`\`\`
## ROL_LOCK=AUD
## ROL_LOCK=ARQ
MERGE/DEPLOY/PRODUCTION_MUTATION=NO, salvo orden explícita.
`;

function fixture(workflows, options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'voy-governance-'));
  fs.mkdirSync(path.join(root, '.github/workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'docs/control'), { recursive: true });
  if (!options.noPolicy) fs.writeFileSync(path.join(root, 'docs/control/release-policy.yaml'), options.policy ?? policy);
  if (!options.noAgents) fs.writeFileSync(path.join(root, 'AGENTS.md'), options.agents ?? agents);
  for (const [name, content] of Object.entries(workflows)) fs.writeFileSync(path.join(root, '.github/workflows', name), content);
  return root;
}

const mainWorkflow = (run) => `name: test
on:
  push:
    branches: [main]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: ${run}
`;

const featureWorkflow = (run) => `name: test
on:
  push:
    branches: [feat/candidate]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: ${run}
`;

test('accepts governance v2 with a non-mutating generic main workflow', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': mainWorkflow('npx wrangler deploy --dry-run --minify') }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('rejects a generic main push that mutates Cloudflare', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': mainWorkflow('npx wrangler deploy --minify') }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /non-dry-run wrangler deploy/);
});

test('does not treat feature-only construction as a generic main mutation path', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({
    'main.yml': mainWorkflow('node --version'),
    'candidate.yml': featureWorkflow('npx wrangler versions deploy candidate-id'),
  }));
  assert.equal(result.ok, true, result.violations.join('\n'));
});

test('requires numbered-order ARQ/AUD governance instead of the legacy AUD gate', async () => {
  const { analyzeRepository } = await load();
  const legacy = policy
    .replace('version: 2', 'version: 1')
    .replace('waits_for_aud_during_internal_construction: false', 'waits_for_aud_during_internal_construction: true')
    .replace('intervenes_before_material_checkpoint: false', 'intervenes_before_material_checkpoint: true');
  const result = analyzeRepository(fixture({ 'main.yml': mainWorkflow('node --version') }, { policy: legacy }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /version: 2/);
  assert.match(result.violations.join('\n'), /waits_for_aud_during_internal_construction: false/);
  assert.match(result.violations.join('\n'), /intervenes_before_material_checkpoint: false/);
});

test('requires AGENTS.md as the canonical repository instruction surface', async () => {
  const { analyzeRepository } = await load();
  const result = analyzeRepository(fixture({ 'main.yml': mainWorkflow('node --version') }, { noAgents: true }));
  assert.equal(result.ok, false);
  assert.match(result.violations.join('\n'), /AGENTS\.md: missing/);
});

test('classifies the standard main and feature triggers correctly', async () => {
  const { allowsGenericMainPush } = await load();
  assert.equal(allowsGenericMainPush(mainWorkflow('node --version')), true);
  assert.equal(allowsGenericMainPush(featureWorkflow('node --version')), false);
});
