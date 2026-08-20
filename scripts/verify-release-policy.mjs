#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const POLICY = 'docs/control/release-policy.yaml';
const AGENTS = 'AGENTS.md';
const WORKFLOWS = '.github/workflows';

const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');

function required(text, pattern, label, errors, file) {
  if (!pattern.test(text)) errors.push(`${file}: missing ${label}`);
}

function validateGovernance(root) {
  const errors = [];
  for (const file of [POLICY, AGENTS]) {
    if (!fs.existsSync(path.join(root, file))) errors.push(`${file}: missing`);
  }
  if (errors.length) return errors;

  const policy = read(root, POLICY);
  const agents = read(root, AGENTS);

  const policyRules = [
    [/^version:\s*2\s*$/m, 'version: 2'],
    [/^order:\s*45\s*$/m, 'order: 45'],
    [/repository_instructions:\s*AGENTS\.md\b/, 'repository_instructions: AGENTS.md'],
    [/work_mode:\s*long_deep_autonomous\b/, 'work_mode: long_deep_autonomous'],
    [/waits_for_aud_during_internal_construction:\s*false\b/, 'waits_for_aud_during_internal_construction: false'],
    [/intervenes_before_material_checkpoint:\s*false\b/, 'intervenes_before_material_checkpoint: false'],
    [/independent:\s*true\b/, 'AUD independent: true'],
    [/evidence_before_verdict:\s*true\b/, 'evidence_before_verdict: true'],
    [/merge_requires_explicit_numbered_order:\s*true\b/, 'merge_requires_explicit_numbered_order: true'],
    [/deploy_requires_explicit_numbered_order:\s*true\b/, 'deploy_requires_explicit_numbered_order: true'],
    [/production_mutation_requires_explicit_numbered_order:\s*true\b/, 'production_mutation_requires_explicit_numbered_order: true'],
    [/internal_candidate_or_validation_work_may_continue_without_intermediate_aud:\s*true\b/, 'internal work without intermediate AUD: true'],
    [/no_done_without_evidence:\s*true\b/, 'no_done_without_evidence: true'],
    [/no_verdict_without_sufficient_evidence:\s*true\b/, 'no_verdict_without_sufficient_evidence: true'],
  ];
  for (const [pattern, label] of policyRules) required(policy, pattern, label, errors, POLICY);

  const cf = policy.indexOf('- cloudflare_workers_first');
  const gh = policy.indexOf('- github_reconcile_after_runtime');
  if (cf < 0 || gh < 0 || cf > gh) {
    errors.push(`${POLICY}: deploy sequence must be Cloudflare Workers first, then GitHub reconciliation`);
  }

  const agentRules = [
    [/\bORDER=45\b/, 'ORDER=45'],
    [/\bORDERS=NUMBERED_GITHUB_ISSUES_ONLY\b/, 'numbered GitHub orders'],
    [/\bWORK_MODE=LONG_DEEP_AUTONOMOUS\b/, 'long/deep work mode'],
    [/\bINTERNAL_RESTRICTIONS=MINIMAL\b/, 'minimal internal restrictions'],
    [/\bARQ_DOES_NOT_WAIT_FOR_AUD_DURING_INTERNAL_CONSTRUCTION=YES\b/, 'ARQ no-wait rule'],
    [/\bAUD_DOES_NOT_INTERVENE_UNTIL_ARQ_PUBLISHES_MATERIAL_AUDITABLE_CHECKPOINT=YES\b/, 'AUD checkpoint rule'],
    [/\bDEPLOY=CLOUDFLARE_WORKERS_FIRST_THEN_GITHUB\b/, 'Workers-first deploy rule'],
    [/## ROL_LOCK=AUD/, 'ROL_LOCK=AUD'],
    [/## ROL_LOCK=ARQ/, 'ROL_LOCK=ARQ'],
    [/MERGE\/DEPLOY\/PRODUCTION_MUTATION=NO, salvo orden explícita\./, 'explicit mutation authorization rule'],
  ];
  for (const [pattern, label] of agentRules) required(agents, pattern, label, errors, AGENTS);

  return errors;
}

export function allowsGenericMainPush(text) {
  const onBlock = text.match(/(?:^|\n)on:\s*\n([\s\S]*?)(?=\n\S|$)/)?.[1] ?? '';
  if (!/^\s*push\s*:/m.test(onBlock)) return false;
  const pushLine = onBlock.match(/^\s*push\s*:\s*(.*)$/m)?.[1]?.trim() ?? '';
  if (pushLine === '{}' || pushLine === '' || pushLine === 'null') {
    const branchBlock = onBlock.match(/^\s*push\s*:\s*\n([\s\S]*?)(?=^\s{2}\S|$)/m)?.[1] ?? '';
    if (!/branches(?:-ignore)?\s*:/m.test(branchBlock)) return true;
    if (/branches\s*:\s*\[[^\]]*\bmain\b[^\]]*\]/m.test(branchBlock)) return true;
    if (/branches\s*:\s*\n(?:\s*-.*\n)*\s*-\s*['"]?main['"]?\s*$/m.test(branchBlock)) return true;
    if (/branches-ignore\s*:/m.test(branchBlock) && !/branches-ignore[\s\S]*\bmain\b/m.test(branchBlock)) return true;
    return false;
  }
  return /push\s*:\s*\{[^}]*branches\s*:\s*\[[^\]]*\bmain\b/i.test(`push: ${pushLine}`);
}

function mutatingCloudflareReferences(file, text) {
  const errors = [];
  const commands = [...text.matchAll(/(?:run\s*:\s*|^)([^\n]+)/gim)].map((m) => m[1]);
  for (const command of commands) {
    const c = command.replace(/\\\r?\n\s*/g, ' ');
    if (/\bwrangler(?:@[\w.*+-]+)?\s+deploy\b/i.test(c) && !/--dry-run(?:\s|$|=true)/i.test(c)) {
      errors.push(`${file}: generic main push contains non-dry-run wrangler deploy`);
    }
    if (/\bwrangler(?:@[\w.*+-]+)?\s+(?:versions\s+deploy|rollback|delete|secret\b|versions\s+secret\b|deployments\s+create)/i.test(c)) {
      errors.push(`${file}: generic main push contains mutating wrangler command`);
    }
    if (/api\.cloudflare\.com\/client\/v4/i.test(c) && /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b|(?:--data(?:-raw|-binary)?|-d)\s+/i.test(c)) {
      errors.push(`${file}: generic main push contains mutating Cloudflare API call`);
    }
  }
  if (/uses\s*:\s*['"]?cloudflare\/wrangler-action@/i.test(text)) {
    errors.push(`${file}: generic main push uses Cloudflare Wrangler action`);
  }
  return [...new Set(errors)];
}

export function analyzeRepository(root = process.cwd()) {
  const violations = validateGovernance(root);
  const workflowDir = path.join(root, WORKFLOWS);
  const roots = [];
  const inspected = [];

  if (!fs.existsSync(workflowDir)) {
    violations.push(`${WORKFLOWS}: missing`);
  } else {
    for (const name of fs.readdirSync(workflowDir).filter((x) => /\.ya?ml$/i.test(x)).sort()) {
      const file = `${WORKFLOWS}/${name}`;
      const text = read(root, file);
      inspected.push(file);
      if (!allowsGenericMainPush(text)) continue;
      roots.push(file);
      violations.push(...mutatingCloudflareReferences(file, text));
    }
  }

  const unique = [...new Set(violations)].sort();
  return {
    ok: unique.length === 0,
    roots,
    inspected,
    violations: unique,
  };
}

function cli() {
  const result = analyzeRepository();
  console.log(JSON.stringify({
    ok: result.ok,
    genericMainPushWorkflows: result.roots,
    inspectedFiles: result.inspected,
    violations: result.violations,
    governance: {
      order: 45,
      model: 'ARQ_INTERNAL_CONSTRUCTION -> MATERIAL_CHECKPOINT -> AUD_INDEPENDENT_REVIEW',
      deploySequence: 'CLOUDFLARE_WORKERS_FIRST_THEN_GITHUB',
    },
  }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli();
