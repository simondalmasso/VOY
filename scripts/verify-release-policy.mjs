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
  if (cf < 0 || gh < 0 || cf > gh) errors.push(`${POLICY}: deploy sequence must be Cloudflare Workers first, then GitHub reconciliation`);

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

function indent(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function blockAfter(lines, start, parentIndent) {
  const output = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) { output.push(line); continue; }
    if (indent(line) <= parentIndent) break;
    output.push(line);
  }
  return output;
}

function listContainsMain(lines, key) {
  const keyIndex = lines.findIndex(line => new RegExp(`^\\s*${key}\\s*:`).test(line));
  if (keyIndex < 0) return null;
  const line = lines[keyIndex];
  const inline = line.slice(line.indexOf(':') + 1).trim();
  if (inline.startsWith('[')) return /(?:^|[\s,'"\[]+)main(?:[\s,'"\]]+|$)/.test(inline);
  const keyIndent = indent(line);
  const children = blockAfter(lines, keyIndex, keyIndent);
  return children.some(child => /^\s*-\s*['"]?main['"]?\s*(?:#.*)?$/.test(child));
}

export function allowsGenericMainPush(text) {
  const lines = text.split(/\r?\n/);
  const onIndex = lines.findIndex(line => /^\s*on\s*:\s*/.test(line) && indent(line) === 0);
  if (onIndex < 0) return false;
  const onLine = lines[onIndex];
  const onInline = onLine.slice(onLine.indexOf(':') + 1).trim();
  if (onInline) return /\bpush\b/.test(onInline);

  const onLines = blockAfter(lines, onIndex, 0);
  const pushIndex = onLines.findIndex(line => /^\s*push\s*:/.test(line));
  if (pushIndex < 0) return false;
  const pushLine = onLines[pushIndex];
  const inline = pushLine.slice(pushLine.indexOf(':') + 1).trim();
  if (inline) {
    if (inline === '{}' || inline === 'null') return true;
    const explicitBranches = inline.match(/branches\s*:\s*\[([^\]]*)\]/)?.[1];
    if (explicitBranches !== undefined) return /(?:^|[\s,'"]+)main(?:[\s,'"]+|$)/.test(explicitBranches);
    const ignored = inline.match(/branches-ignore\s*:\s*\[([^\]]*)\]/)?.[1];
    if (ignored !== undefined) return !/(?:^|[\s,'"]+)main(?:[\s,'"]+|$)/.test(ignored);
    return true;
  }

  const pushChildren = blockAfter(onLines, pushIndex, indent(pushLine));
  const branches = listContainsMain(pushChildren, 'branches');
  if (branches !== null) return branches;
  const ignored = listContainsMain(pushChildren, 'branches-ignore');
  if (ignored !== null) return !ignored;
  return true;
}

function mutatingCloudflareReferences(file, text) {
  const errors = [];
  const commands = [...text.matchAll(/(?:run\s*:\s*|^)([^\n]+)/gim)].map((m) => m[1]);
  for (const command of commands) {
    const c = command.replace(/\\\r?\n\s*/g, ' ');
    if (/\bwrangler(?:@[\w.*+-]+)?\s+deploy\b/i.test(c) && !/--dry-run(?:\s|$|=true)/i.test(c)) errors.push(`${file}: generic main push contains non-dry-run wrangler deploy`);
    if (/\bwrangler(?:@[\w.*+-]+)?\s+(?:versions\s+deploy|rollback|delete|secret\b|versions\s+secret\b|deployments\s+create)/i.test(c)) errors.push(`${file}: generic main push contains mutating wrangler command`);
    if (/api\.cloudflare\.com\/client\/v4/i.test(c) && /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b|(?:--data(?:-raw|-binary)?|-d)\s+/i.test(c)) errors.push(`${file}: generic main push contains mutating Cloudflare API call`);
  }
  if (/uses\s*:\s*['"]?cloudflare\/wrangler-action@/i.test(text)) errors.push(`${file}: generic main push uses Cloudflare Wrangler action`);
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
  return { ok: unique.length === 0, roots, inspected, violations: unique };
}

function cli() {
  const result = analyzeRepository();
  console.log(JSON.stringify({
    ok: result.ok,
    genericMainPushWorkflows: result.roots,
    inspectedFiles: result.inspected,
    violations: result.violations,
    governance: { order: 45, model: 'ARQ_INTERNAL_CONSTRUCTION -> MATERIAL_CHECKPOINT -> AUD_INDEPENDENT_REVIEW', deploySequence: 'CLOUDFLARE_WORKERS_FIRST_THEN_GITHUB' },
  }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli();
