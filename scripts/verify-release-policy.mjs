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
  if (typeof pattern !== 'string' || pattern.startsWith('!')) return false;
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

function tokenizeFlowYaml(source) {
  const tokens = [];
  let index = 0;

  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }
    if ('{}[],:'.includes(character)) {
      tokens.push({ type: character, value: character });
      index += 1;
      continue;
    }
    if (character === "'" || character === '"') {
      const quote = character;
      let value = '';
      index += 1;
      let closed = false;
      while (index < source.length) {
        const current = source[index];
        if (quote === "'" && current === "'" && source[index + 1] === "'") {
          value += "'";
          index += 2;
          continue;
        }
        if (current === quote) {
          closed = true;
          index += 1;
          break;
        }
        if (quote === '"' && current === '\\' && index + 1 < source.length) {
          value += source[index + 1];
          index += 2;
          continue;
        }
        value += current;
        index += 1;
      }
      if (!closed) throw new Error('unterminated quoted scalar');
      tokens.push({ type: 'scalar', value });
      continue;
    }

    const start = index;
    while (index < source.length && !/[\s{}\[\],:]/.test(source[index])) index += 1;
    if (start === index) throw new Error(`unsupported flow character ${source[index]}`);
    tokens.push({ type: 'scalar', value: source.slice(start, index) });
  }
  return tokens;
}

function parseFlowYaml(source) {
  const tokens = tokenizeFlowYaml(source);
  let index = 0;

  function take(type) {
    const token = tokens[index];
    if (!token || token.type !== type) throw new Error(`expected ${type} at token ${index}`);
    index += 1;
    return token;
  }

  function parseValue() {
    const token = tokens[index];
    if (!token) throw new Error('unexpected end of flow value');

    if (token.type === '{') {
      index += 1;
      const result = {};
      if (tokens[index]?.type === '}') {
        index += 1;
        return result;
      }
      while (index < tokens.length) {
        const key = take('scalar').value;
        take(':');
        result[key] = parseValue();
        if (tokens[index]?.type === '}') {
          index += 1;
          return result;
        }
        take(',');
      }
      throw new Error('unterminated flow mapping');
    }

    if (token.type === '[') {
      index += 1;
      const result = [];
      if (tokens[index]?.type === ']') {
        index += 1;
        return result;
      }
      while (index < tokens.length) {
        result.push(parseValue());
        if (tokens[index]?.type === ']') {
          index += 1;
          return result;
        }
        take(',');
      }
      throw new Error('unterminated flow sequence');
    }

    const scalar = take('scalar').value;
    if (/^(?:null|~)$/i.test(scalar)) return null;
    if (/^true$/i.test(scalar)) return true;
    if (/^false$/i.test(scalar)) return false;
    return scalar;
  }

  const parsed = parseValue();
  if (index !== tokens.length) throw new Error(`unexpected trailing token ${tokens[index]?.value}`);
  return parsed;
}

function normalizeBranchValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return value;
  return null;
}

function flowPushTargetsMain(pushConfig) {
  if (pushConfig === null || pushConfig === true) return { genericMainPush: true, errors: [] };
  if (pushConfig === false) return { genericMainPush: false, errors: [] };
  if (typeof pushConfig !== 'object' || Array.isArray(pushConfig)) {
    return { genericMainPush: true, errors: ['flow-style push configuration is not safely analyzable'] };
  }

  const hasBranches = Object.prototype.hasOwnProperty.call(pushConfig, 'branches');
  const hasIgnored = Object.prototype.hasOwnProperty.call(pushConfig, 'branches-ignore');
  if (hasBranches && hasIgnored) {
    return { genericMainPush: true, errors: ['flow-style push contains both branches and branches-ignore'] };
  }

  if (hasBranches) {
    const branches = normalizeBranchValues(pushConfig.branches);
    if (!branches) return { genericMainPush: true, errors: ['flow-style branches filter is not safely analyzable'] };
    return { genericMainPush: branches.some(globMatchesMain), errors: [] };
  }

  if (hasIgnored) {
    const ignored = normalizeBranchValues(pushConfig['branches-ignore']);
    if (!ignored) return { genericMainPush: true, errors: ['flow-style branches-ignore filter is not safely analyzable'] };
    return { genericMainPush: !ignored.some(globMatchesMain), errors: [] };
  }

  return { genericMainPush: true, errors: [] };
}

function analyzeGenericMainPush(text) {
  const onBlock = extractTopLevelBlock(text, 'on');
  if (!onBlock) return { genericMainPush: false, errors: ['workflow has no readable top-level on key'] };

  if (onBlock.inline) {
    try {
      const parsed = parseFlowYaml(onBlock.inline);
      if (typeof parsed === 'string') return { genericMainPush: parsed === 'push', errors: [] };
      if (Array.isArray(parsed)) {
        const invalid = parsed.some((event) => typeof event !== 'string');
        return { genericMainPush: parsed.includes('push'), errors: invalid ? ['inline on sequence contains a non-scalar event'] : [] };
      }
      if (parsed && typeof parsed === 'object') {
        if (!Object.prototype.hasOwnProperty.call(parsed, 'push')) return { genericMainPush: false, errors: [] };
        return flowPushTargetsMain(parsed.push);
      }
      return { genericMainPush: true, errors: ['inline on value is not safely analyzable'] };
    } catch (error) {
      return { genericMainPush: true, errors: [`inline on flow syntax is not safely analyzable (${error.message})`] };
    }
  }

  const eventLines = onBlock.lines.slice(1);
  const nonEmpty = eventLines
    .map((line, index) => ({ line, index, clean: stripComment(line) }))
    .filter(({ clean }) => clean.trim());

  if (nonEmpty.length === 0) return { genericMainPush: true, errors: ['top-level on mapping is empty and not safely analyzable'] };

  const eventIndent = Math.min(...nonEmpty.map(({ line }) => indentation(line)));
  const pushEntry = nonEmpty.find(({ line, clean }) => (
    indentation(line) === eventIndent && /^(?:\s*)(?:push|'push'|"push")\s*:/.test(clean)
  ));
  if (!pushEntry) return { genericMainPush: false, errors: [] };

  const pushLine = stripComment(pushEntry.line);
  const pushIndent = indentation(pushEntry.line);
  const inline = pushLine.split(':').slice(1).join(':').trim();

  if (inline) {
    try {
      return flowPushTargetsMain(parseFlowYaml(inline));
    } catch (error) {
      return { genericMainPush: true, errors: [`inline push flow syntax is not safely analyzable (${error.message})`] };
    }
  }

  const pushLines = [pushEntry.line];
  for (let index = pushEntry.index + 1; index < eventLines.length; index += 1) {
    const line = eventLines[index];
    if (stripComment(line).trim() && indentation(line) <= pushIndent) break;
    pushLines.push(line);
  }

  const branches = collectNestedValues(pushLines, 'branches', pushIndent + 1);
  const ignored = collectNestedValues(pushLines, 'branches-ignore', pushIndent + 1);
  if (branches && ignored) return { genericMainPush: true, errors: ['push contains both branches and branches-ignore'] };
  if (branches) return { genericMainPush: branches.some(globMatchesMain), errors: [] };
  if (ignored) return { genericMainPush: !ignored.some(globMatchesMain), errors: [] };
  return { genericMainPush: true, errors: [] };
}

export function allowsGenericMainPush(text) {
  return analyzeGenericMainPush(text).genericMainPush;
}

function validateWorkflowShape(relativePath, text) {
  const errors = [];
  if (!text.trim()) errors.push('workflow is empty');
  if (text.includes('\0')) errors.push('workflow contains a NUL byte');
  if (/^[ ]*\t/m.test(text)) errors.push('workflow contains tab indentation');
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(text)) errors.push('workflow contains merge-conflict markers');
  if (!extractTopLevelBlock(text, 'on')) errors.push('workflow has no readable top-level on key');
  if (!extractTopLevelBlock(text, 'jobs')) errors.push('workflow has no readable top-level jobs key');
  errors.push(...analyzeGenericMainPush(text).errors);
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

function extractYamlRunCommands(text) {
  const lines = text.split(/\r?\n/);
  const commands = [];
  for (let index = 0; index < lines.length; index += 1) {
    const clean = stripComment(lines[index]);
    const match = clean.match(/^(\s*)(?:-\s*)?(?:run|'run'|"run")\s*:\s*(.*)$/);
    if (!match) continue;

    const keyIndent = match[1].length;
    const inline = match[2].trim();
    if (inline === '|' || inline === '>' || /^[|>][+-]?$/.test(inline)) {
      const block = [];
      for (let nested = index + 1; nested < lines.length; nested += 1) {
        const candidate = lines[nested];
        if (stripComment(candidate).trim() && indentation(candidate) <= keyIndent) break;
        block.push(candidate.slice(Math.min(candidate.length, keyIndent + 2)));
        index = nested;
      }
      commands.push(block.join('\n'));
    } else if (inline) {
      commands.push(inline.replace(/^(['"])([\s\S]*)\1$/, '$2'));
    }
  }
  return commands;
}

function splitShellStatements(text) {
  const statements = [];
  let start = 0;
  let single = false;
  let double = false;
  let backtick = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "'" && !double && !backtick) single = !single;
    else if (character === '"' && !single && !backtick && text[index - 1] !== '\\') double = !double;
    else if (character === '`' && !single && !double && text[index - 1] !== '\\') backtick = !backtick;

    if (single || double || backtick) continue;
    const pair = text.slice(index, index + 2);
    if (character === '\n' || character === ';' || pair === '&&' || pair === '||') {
      const statement = text.slice(start, index).trim();
      if (statement) statements.push(statement);
      index += pair === '&&' || pair === '||' ? 1 : 0;
      start = index + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) statements.push(tail);
  return statements;
}

function shellWords(text) {
  const words = [];
  let current = '';
  let single = false;
  let double = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === "'" && !double) {
      single = !single;
      continue;
    }
    if (character === '"' && !single && text[index - 1] !== '\\') {
      double = !double;
      continue;
    }
    if (!single && !double && /\s/.test(character)) {
      if (current) {
        words.push(current);
        current = '';
      }
      continue;
    }
    current += character;
  }
  if (current) words.push(current);
  return words;
}

function isPackageInstallationStatement(statement) {
  const words = shellWords(statement.toLowerCase());
  while (words[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[0])) words.shift();
  if (words[0] === 'sudo' || words[0] === 'command') words.shift();
  const manager = words[0];
  const command = words[1];
  if (manager === 'npm') return ['install', 'i', 'add'].includes(command);
  if (manager === 'pnpm') return ['install', 'i', 'add'].includes(command);
  if (manager === 'yarn') return command === 'add';
  if (manager === 'bun') return ['install', 'i', 'add'].includes(command);
  return false;
}

function normalizeWranglerToken(value) {
  const clean = value.replace(/^[\s"'`$()]+/, '').replace(/[\s"'`$()]+$/, '').replace(/\\/g, '/');
  const base = clean.split('/').pop()?.replace(/\.(?:cmd|exe)$/i, '') ?? '';
  return /^wrangler(?:@[A-Za-z0-9*_.+-]+)?$/i.test(base) ? base : null;
}

function argsAfterWrangler(statement, endIndex) {
  const remainder = statement.slice(endIndex);
  const boundary = remainder.search(/(?:&&|\|\||;|\n|\))/);
  const bounded = boundary >= 0 ? remainder.slice(0, boundary) : remainder;
  const words = shellWords(bounded).filter(Boolean);
  while (words[0] === '--') words.shift();
  return words;
}

function classifyWranglerArgs(relativePath, args) {
  if (args.length === 0) return `${relativePath}: Wrangler reference is not provably read-only`;
  const command = args[0].toLowerCase();
  if (['--version', '-v', 'version', '--help', '-h', 'help'].includes(command)) return null;

  if (command === 'deploy') {
    const dryRun = args.some((argument) => /^--dry-run(?:=true)?$/i.test(argument));
    return dryRun ? null : `${relativePath}: non-dry-run wrangler deploy`;
  }
  if (command === 'versions' && args[1]?.toLowerCase() === 'deploy') return `${relativePath}: wrangler versions deploy`;
  if ((command === 'versions' && args[1]?.toLowerCase() === 'secret') || command === 'secret') return `${relativePath}: wrangler secret mutation`;
  if (
    command === 'rollback' || command === 'delete'
    || (command === 'versions' && args[1]?.toLowerCase() === 'upload')
    || (command === 'deployments' && args[1]?.toLowerCase() === 'create')
  ) return `${relativePath}: other mutating wrangler command`;

  return `${relativePath}: Wrangler command is not provably read-only (${args.slice(0, 3).join(' ')})`;
}

function wranglerFindingsForCommand(relativePath, commandText) {
  const findings = [];
  const joined = commandText.replace(/\\\r?\n\s*/g, ' ');
  for (const statement of splitShellStatements(joined)) {
    const packageInstall = isPackageInstallationStatement(statement);
    let recognized = 0;
    let ignoredPackageReferences = 0;
    const matcher = /(?:^|[\s"'`$()&;|])((?:(?:\.{0,2}\/)?(?:[A-Za-z0-9_.-]+\/)*)?wrangler(?:@[A-Za-z0-9*_.+-]+)?(?:\.(?:cmd|exe))?)(?=$|[\s"'`$()&;|])/gi;
    for (const match of statement.matchAll(matcher)) {
      const token = normalizeWranglerToken(match[1]);
      if (!token) continue;
      if (packageInstall) {
        ignoredPackageReferences += 1;
        continue;
      }
      recognized += 1;
      const tokenOffset = match.index + match[0].lastIndexOf(match[1]);
      const finding = classifyWranglerArgs(relativePath, argsAfterWrangler(statement, tokenOffset + match[1].length));
      if (finding) findings.push(finding);
    }

    if (/wrangler/i.test(statement) && recognized === 0 && ignoredPackageReferences === 0) {
      findings.push(`${relativePath}: executable Wrangler reference is not safely classifiable`);
    }
  }
  return findings;
}

function executableSegments(relativePath, text) {
  if (/\.ya?ml$/i.test(relativePath)) return extractYamlRunCommands(text);
  return [text];
}

function mutatingWranglerFindings(relativePath, text) {
  return executableSegments(relativePath, text).flatMap((command) => wranglerFindingsForCommand(relativePath, command));
}

function unsafeFindings(relativePath, text) {
  if (relativePath === POLICY_ENGINE_PATH) return [];

  const findings = [...mutatingWranglerFindings(relativePath, text)];
  const credentialPatterns = ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID', 'CF_API_TOKEN'];
  for (const credential of credentialPatterns) {
    if (text.includes(credential)) findings.push(`${relativePath}: references ${credential}`);
  }

  if (/\bsecrets\s*:\s*inherit\b/i.test(text)) findings.push(`${relativePath}: uses secrets: inherit`);
  if (/uses\s*:\s*['"]?[^'"\s#]*(?:cloudflare|wrangler-action)/i.test(text)) findings.push(`${relativePath}: uses a Cloudflare or Wrangler action`);

  for (const command of executableSegments(relativePath, text)) {
    if (/api\.cloudflare\.com\/client\/v4/i.test(command)) {
      const mutatingMethod = /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(command);
      const implicitPost = /(?:--data(?:-raw|-binary)?|-d)\s+/i.test(command);
      const programmaticMethod = /method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(command);
      if (mutatingMethod || implicitPost || programmaticMethod) findings.push(`${relativePath}: calls a mutating Cloudflare API method`);
      else findings.push(`${relativePath}: Cloudflare API reference is not provably read-only`);
    }

    if (/(?:^|[\s"'`$()&;|])(?:cloudflare|cloudflared)(?=$|[\s"'`$()&;|])/i.test(command)) {
      findings.push(`${relativePath}: executable Cloudflare command is not provably read-only`);
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
  return requirements.filter(([, matcher]) => !matcher.test(text)).map(([requirement]) => `${POLICY_PATH}: missing ${requirement}`);
}

export function analyzeRepository(root = process.cwd()) {
  const violations = [...validatePolicy(root)];
  const workflowRoot = path.join(root, WORKFLOW_DIRECTORY);
  if (!fs.existsSync(workflowRoot)) {
    return { ok: false, roots: [], inspected: [], violations: [...violations, `${WORKFLOW_DIRECTORY}: missing`] };
  }

  const workflowFiles = fs.readdirSync(workflowRoot)
    .filter((name) => /\.ya?ml$/i.test(name)).sort().map((name) => `${WORKFLOW_DIRECTORY}/${name}`);

  const contents = new Map();
  const triggerAnalysis = new Map();
  for (const relativePath of workflowFiles) {
    try {
      const text = readUtf8Strict(path.join(root, relativePath));
      contents.set(relativePath, text);
      triggerAnalysis.set(relativePath, analyzeGenericMainPush(text));
      violations.push(...validateWorkflowShape(relativePath, text));
    } catch (error) {
      violations.push(`${relativePath}: unreadable UTF-8 (${error.message})`);
    }
  }

  const roots = workflowFiles.filter((relativePath) => triggerAnalysis.get(relativePath)?.genericMainPush === true);
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
      if (!contents.has(workflow)) violations.push(`${relativePath}: unresolved local workflow ${workflow}`);
      else inspectFile(workflow);
    }

    for (const action of localActionReferences(text)) {
      const resolved = resolveLocalAction(root, action);
      if (!resolved) violations.push(`${relativePath}: unresolved local action ${action}`);
      else inspectFile(posix(resolved));
    }

    for (const script of localScriptReferences(text)) {
      if (script !== relativePath) inspectFile(posix(script));
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
      if (typeof command !== 'string') violations.push(`${relativePath}: unresolved package script ${scriptName}`);
      else {
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
      prRegressionDetection: result.ok ? 'YES' : 'NOT_PROVEN',
      futureDirectPushPrevention: 'UNVERIFIED'
    }
  }, null, 2));
  if (!result.ok) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) runCli();
