#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';

const WORKFLOW_DIRECTORY = '.github/workflows';
const POLICY_PATH = 'docs/control/release-policy.yaml';
const POLICY_ENGINE_PATH = 'scripts/verify-release-policy.mjs';

function posix(value) {
  return value.split(path.sep).join('/');
}

function readUtf8Strict(filePath) {
  const bytes = fs.readFileSync(filePath);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function stripComment(line) {
  let single = false;
  let double = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "'" && !double) single = !single;
    if (character === '"' && !single && line[index - 1] !== '\\') double = !double;
    if (character === '#' && !single && !double) return line.slice(0, index);
  }
  return line;
}

function indentation(line) {
  return line.match(/^ */)?.[0].length ?? 0;
}

function extractTopLevelBlock(text, key) {
  const lines = text.split(/\r?\n/);
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^(?:${escaped}|'${escaped}'|"${escaped}")\\s*:\\s*(.*)$`);
  const start = lines.findIndex((line) => matcher.test(stripComment(line)));
  if (start < 0) return null;

  const match = stripComment(lines[start]).match(matcher);
  const block = [lines[start]];
  for (let index = start + 1; index < lines.length; index += 1) {
    const candidate = lines[index];
    const clean = stripComment(candidate);
    if (clean.trim() && indentation(candidate) === 0) break;
    block.push(candidate);
  }
  return { inline: match?.[1]?.trim() ?? '', lines: block, start };
}

function splitYamlValues(value) {
  return value
    .replace(/[\[\]{}]/g, ' ')
    .split(/[\s,]+/)
    .map((item) => item.replace(/^['"]|['"]$/g, '').trim())
    .filter(Boolean);
}

function globMatchesMain(pattern) {
  if (pattern.startsWith('!')) return false;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.')}$`);
  return regex.test('main');
}

function collectNestedValues(lines, key, minimumIndent) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keyMatcher = new RegExp(`^\\s{${minimumIndent},}(?:${escaped}|'${escaped}'|"${escaped}")\\s*:\\s*(.*)$`);
  for (let index = 0; index < lines.length; index += 1) {
    const clean = stripComment(lines[index]);
    const match = clean.match(keyMatcher);
    if (!match) continue;

    const keyIndent = indentation(lines[index]);
    const values = splitYamlValues(match[1] ?? '');
    for (let nested = index + 1; nested < lines.length; nested += 1) {
      const nestedLine = stripComment(lines[nested]);
      if (!nestedLine.trim()) continue;
      const nestedIndent = indentation(lines[nested]);
      if (nestedIndent <= keyIndent) break;
      const item = nestedLine.trim().match(/^-\s*(.+)$/);
      if (item) values.push(...splitYamlValues(item[1]));
    }
    return values;
  }
  return null;
}

export function allowsGenericMainPush(text) {
  const onBlock = extractTopLevelBlock(text, 'on');
  if (!onBlock) return false;

  const inlineEvents = splitYamlValues(onBlock.inline);
  if (inlineEvents.includes('push')) return true;

  const pushIndex = onBlock.lines.findIndex((line, index) => {
    if (index === 0) return false;
    return /^\s{2}(?:push|'push'|"push")\s*:/.test(stripComment(line));
  });
  if (pushIndex < 0) return false;

  const pushLine = stripComment(onBlock.lines[pushIndex]);
  const pushIndent = indentation(onBlock.lines[pushIndex]);
  const inline = pushLine.split(':').slice(1).join(':').trim();
  const pushLines = [onBlock.lines[pushIndex]];
  for (let index = pushIndex + 1; index < onBlock.lines.length; index += 1) {
    const line = onBlock.lines[index];
    if (stripComment(line).trim() && indentation(line) <= pushIndent) break;
    pushLines.push(line);
  }

  if (inline && inline !== '{}') {
    const inlineValues = splitYamlValues(inline);
    if (inlineValues.includes('main') || inlineValues.some(globMatchesMain)) return true;
  }

  const branches = collectNestedValues(pushLines, 'branches', pushIndent + 1);
  const ignored = collectNestedValues(pushLines, 'branches-ignore', pushIndent + 1);

  if (branches) return branches.some(globMatchesMain);
  if (ignored) return !ignored.some(globMatchesMain);
  return true;
}

function validateWorkflowShape(relativePath, text) {
  const errors = [];
  if (!text.trim()) errors.push('workflow is empty');
  if (text.includes('\0')) errors.push('workflow contains a NUL byte');
  if (/^[ ]*\t/m.test(text)) errors.push('workflow contains tab indentation');
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(text)) errors.push('workflow contains merge-conflict markers');
  if (!extractTopLevelBlock(text, 'on')) errors.push('workflow has no readable top-level on key');
  if (!extractTopLevelBlock(text, 'jobs')) errors.push('workflow has no readable top-level jobs key');
  return errors.map((message) => `${relativePath}: ${message}`);
}

function localWorkflowReferences(text) {
  const references = [];
  const matcher = /uses\s*:\s*['"]?(\.\/\.github\/workflows\/[^'"\s#]+)/g;
  for (const match of text.matchAll(matcher)) references.push(match[1].slice(2));
  return references;
}

function localActionReferences(text) {
  const references = [];
  const matcher = /uses\s*:\s*['"]?(\.\/[^'"\s#]+)/g;
  for (const match of text.matchAll(matcher)) {
    const value = match[1].slice(2);
    if (!value.startsWith('.github/workflows/')) references.push(value);
  }
  return references;
}

function localScriptReferences(text) {
  const references = new Set();
  const matcher = /(?:^|[\s;&|])(?:bash|sh|node|bun|python3?|ruby|perl)?\s*((?:\.\/)?(?:scripts|\.github)\/[A-Za-z0-9_.\/-]+)/gm;
  for (const match of text.matchAll(matcher)) references.add(match[1].replace(/^\.\//, ''));
  return [...references];
}

function packageScriptReferences(text) {
  const references = new Set();
  const matcher = /\b(?:npm|bun|pnpm)\s+run\s+([A-Za-z0-9:_-]+)|\byarn\s+([A-Za-z0-9:_-]+)/g;
  for (const match of text.matchAll(matcher)) references.add(match[1] || match[2]);
  return [...references];
}

function mutatingWranglerFindings(relativePath, text) {
  const findings = [];
  const joined = text.replace(/\\\r?\n\s*/g, ' ');
  const lines = joined.split(/\r?\n/).map(stripComment);

  for (const line of lines) {
    if (/\bwrangler\s+deploy\b/i.test(line) && !/--dry-run\b/i.test(line)) {
      findings.push(`${relativePath}: non-dry-run wrangler deploy`);
    }
    if (/\bwrangler\s+versions\s+deploy\b/i.test(line)) {
      findings.push(`${relativePath}: wrangler versions deploy`);
    }
    if (/\bwrangler\s+(?:versions\s+)?secret\b/i.test(line)) {
      findings.push(`${relativePath}: wrangler secret mutation`);
    }
    if (/\bwrangler\s+(?:versions\s+upload|rollback|delete|deployments\s+create)\b/i.test(line)) {
      findings.push(`${relativePath}: other mutating wrangler command`);
    }
  }
  return findings;
}

function unsafeFindings(relativePath, text) {
  if (relativePath === POLICY_ENGINE_PATH) return [];

  const findings = [...mutatingWranglerFindings(relativePath, text)];
  const credentialPatterns = [
    'CLOUDFLARE_API_TOKEN',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_ZONE_ID',
    'CF_API_TOKEN'
  ];
  for (const credential of credentialPatterns) {
    if (text.includes(credential)) findings.push(`${relativePath}: references ${credential}`);
  }

  if (/\bsecrets\s*:\s*inherit\b/i.test(text)) {
    findings.push(`${relativePath}: uses secrets: inherit`);
  }
  if (/uses\s*:\s*['"]?[^'"\s#]*(?:cloudflare|wrangler-action)/i.test(text)) {
    findings.push(`${relativePath}: uses a Cloudflare or Wrangler action`);
  }

  if (/api\.cloudflare\.com\/client\/v4/i.test(text)) {
    const mutatingMethod = /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(text);
    const implicitPost = /(?:--data(?:-raw|-binary)?|-d)\s+/i.test(text);
    const programmaticMethod = /method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(text);
    if (mutatingMethod || implicitPost || programmaticMethod) {
      findings.push(`${relativePath}: calls a mutating Cloudflare API method`);
    } else {
      findings.push(`${relativePath}: Cloudflare API reference is not provably read-only`);
    }
  }
  return [...new Set(findings)];
}

function resolveLocalAction(root, reference) {
  const absolute = path.join(root, reference);
  if (!fs.existsSync(absolute)) return null;
  const stats = fs.statSync(absolute);
  if (stats.isFile()) return reference;
  for (const manifest of ['action.yml', 'action.yaml']) {
    const candidate = path.join(reference, manifest);
    if (fs.existsSync(path.join(root, candidate))) return candidate;
  }
  return null;
}

function validatePolicy(root) {
  const absolute = path.join(root, POLICY_PATH);
  if (!fs.existsSync(absolute)) return [`${POLICY_PATH}: missing policy document`];
  let text;
  try {
    text = readUtf8Strict(absolute);
  } catch (error) {
    return [`${POLICY_PATH}: unreadable UTF-8 (${error.message})`];
  }
  if (/^[ ]*\t/m.test(text)) return [`${POLICY_PATH}: tab indentation is prohibited`];

  const requirements = [
    ['generic_main_push_production_write: false', /generic_main_push_production_write\s*:\s*false\b/],
    ['candidate_required: true', /candidate_required\s*:\s*true\b/],
    ['candidate_traffic_percent: 0', /candidate_traffic_percent\s*:\s*0\b/],
    ['exact_source_sha_required: true', /exact_source_sha_required\s*:\s*true\b/],
    ['production_promotion: mission_specific', /production_promotion\s*:\s*mission_specific\b/],
    ['aud_pass_required: true', /aud_pass_required\s*:\s*true\b/],
    ['current_cloudflare_state_required: true', /current_cloudflare_state_required\s*:\s*true\b/],
    ['rollback_requires_separate_authorization: true', /rollback_requires_separate_authorization\s*:\s*true\b/]
  ];
  return requirements
    .filter(([, matcher]) => !matcher.test(text))
    .map(([requirement]) => `${POLICY_PATH}: missing ${requirement}`);
}

export function analyzeRepository(root = process.cwd()) {
  const violations = [...validatePolicy(root)];
  const workflowRoot = path.join(root, WORKFLOW_DIRECTORY);
  if (!fs.existsSync(workflowRoot)) {
    return { ok: false, roots: [], inspected: [], violations: [...violations, `${WORKFLOW_DIRECTORY}: missing`] };
  }

  const workflowFiles = fs.readdirSync(workflowRoot)
    .filter((name) => /\.ya?ml$/i.test(name))
    .sort()
    .map((name) => `${WORKFLOW_DIRECTORY}/${name}`);

  const contents = new Map();
  for (const relativePath of workflowFiles) {
    try {
      const text = readUtf8Strict(path.join(root, relativePath));
      contents.set(relativePath, text);
      violations.push(...validateWorkflowShape(relativePath, text));
    } catch (error) {
      violations.push(`${relativePath}: unreadable UTF-8 (${error.message})`);
    }
  }

  const roots = workflowFiles.filter((relativePath) => {
    const text = contents.get(relativePath);
    return text ? allowsGenericMainPush(text) : false;
  });
  if (roots.length === 0) violations.push('No workflow guards generic pushes to main');

  const inspected = new Set();
  const visiting = new Set();
  let packageJson = null;

  function inspectFile(relativePath) {
    if (inspected.has(relativePath)) return;
    if (visiting.has(relativePath)) {
      violations.push(`${relativePath}: local reference cycle is not safely analyzable`);
      return;
    }
    visiting.add(relativePath);

    const absolute = path.join(root, relativePath);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      violations.push(`${relativePath}: referenced local file is missing`);
      visiting.delete(relativePath);
      return;
    }

    let text;
    try {
      text = readUtf8Strict(absolute);
    } catch (error) {
      violations.push(`${relativePath}: unreadable UTF-8 (${error.message})`);
      visiting.delete(relativePath);
      return;
    }

    violations.push(...unsafeFindings(relativePath, text));

    for (const workflow of localWorkflowReferences(text)) {
      if (!contents.has(workflow)) {
        violations.push(`${relativePath}: unresolved local workflow ${workflow}`);
      } else {
        inspectFile(workflow);
      }
    }

    for (const action of localActionReferences(text)) {
      const resolved = resolveLocalAction(root, action);
      if (!resolved) violations.push(`${relativePath}: unresolved local action ${action}`);
      else inspectFile(posix(resolved));
    }

    for (const script of localScriptReferences(text)) {
      if (script === relativePath) continue;
      inspectFile(posix(script));
    }

    for (const scriptName of packageScriptReferences(text)) {
      if (!packageJson) {
        const packagePath = path.join(root, 'package.json');
        if (!fs.existsSync(packagePath)) {
          violations.push(`${relativePath}: package script ${scriptName} cannot be resolved without package.json`);
          continue;
        }
        try {
          packageJson = JSON.parse(readUtf8Strict(packagePath));
        } catch (error) {
          violations.push(`package.json: unreadable package scripts (${error.message})`);
          continue;
        }
      }
      const command = packageJson?.scripts?.[scriptName];
      if (typeof command !== 'string') {
        violations.push(`${relativePath}: unresolved package script ${scriptName}`);
      } else {
        violations.push(...unsafeFindings(`package.json#scripts.${scriptName}`, command));
        for (const script of localScriptReferences(command)) inspectFile(posix(script));
      }
    }

    visiting.delete(relativePath);
    inspected.add(relativePath);
  }

  for (const rootWorkflow of roots) inspectFile(rootWorkflow);

  return {
    ok: violations.length === 0,
    roots,
    inspected: [...inspected].sort(),
    violations: [...new Set(violations)].sort()
  };
}

function runCli() {
  const result = analyzeRepository(process.cwd());
  console.log(JSON.stringify({
    ok: result.ok,
    genericMainPushWorkflows: result.roots,
    inspectedFiles: result.inspected,
    violations: result.violations,
    claims: {
      currentTreeGenericMainPushProductionWrite: result.ok ? 'NO' : 'NOT_PROVEN',
      prRegressionDetection: 'YES',
      futureDirectPushPrevention: 'UNVERIFIED'
    }
  }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runCli();
}
