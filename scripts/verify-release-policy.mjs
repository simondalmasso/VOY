#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TextDecoder } from 'node:util';

const WF = '.github/workflows';
const POLICY = 'docs/control/release-policy.yaml';
const ENGINE = 'scripts/verify-release-policy.mjs';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const posix = (s) => s.split(path.sep).join('/');
const indent = (s) => s.match(/^ */)?.[0].length ?? 0;
const read = (p) => new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p));

function uncomment(line) {
  let single = false;
  let double = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === "'" && !double) single = !single;
    else if (c === '"' && !single && line[i - 1] !== '\\') double = !double;
    else if (c === '#' && !single && !double) return line.slice(0, i);
  }
  return line;
}

function top(text, key) {
  const lines = text.split(/\r?\n/);
  const re = new RegExp(`^(?:${esc(key)}|'${esc(key)}'|"${esc(key)}")\\s*:\\s*(.*)$`);
  const start = lines.findIndex((line) => re.test(uncomment(line)));
  if (start < 0) return null;
  const inline = uncomment(lines[start]).match(re)?.[1]?.trim() ?? '';
  const block = [lines[start]];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (uncomment(lines[i]).trim() && indent(lines[i]) === 0) break;
    block.push(lines[i]);
  }
  return { inline, lines: block };
}

function yamlMeta(source) {
  for (const raw of source.split(/\r?\n/)) {
    const line = uncomment(raw);
    let single = false;
    let double = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (c === "'" && !double) { single = !single; continue; }
      if (c === '"' && !single && line[i - 1] !== '\\') { double = !double; continue; }
      if (single || double) continue;
      const prev = i ? line[i - 1] : '';
      const boundary = i === 0 || /[\s[{,:-]/.test(prev);
      if (boundary && (c === '&' || c === '*') && /[\w.-]/.test(line[i + 1] ?? '')) return true;
      if (boundary && c === '!' && /[\w.!/-]/.test(line[i + 1] ?? '')) return true;
      if (c === '<' && line[i + 1] === '<' && /^\s*:/.test(line.slice(i + 2))) return true;
    }
  }
  return false;
}

function flow(source) {
  if (yamlMeta(source)) throw new Error('anchors, aliases, tags or merge keys are unsupported');
  const tokens = [];
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if ('{}[],:'.includes(c)) { tokens.push([c, c]); i += 1; continue; }
    if (c === "'" || c === '"') {
      const quote = c;
      let value = '';
      let closed = false;
      i += 1;
      while (i < source.length) {
        const x = source[i];
        if (quote === "'" && x === "'" && source[i + 1] === "'") { value += "'"; i += 2; continue; }
        if (x === quote) { closed = true; i += 1; break; }
        if (quote === '"' && x === '\\' && i + 1 < source.length) { value += source[i + 1]; i += 2; continue; }
        value += x;
        i += 1;
      }
      if (!closed) throw new Error('unterminated quote');
      tokens.push(['s', value]);
      continue;
    }
    const start = i;
    while (i < source.length && !/[\s{}\[\],:]/.test(source[i])) i += 1;
    if (start === i) throw new Error(`unsupported ${source[i]}`);
    tokens.push(['s', source.slice(start, i)]);
  }
  let at = 0;
  const take = (type) => {
    const token = tokens[at];
    if (!token || token[0] !== type) throw new Error(`expected ${type}`);
    at += 1;
    return token[1];
  };
  const value = () => {
    const type = tokens[at]?.[0];
    if (type === '{') {
      at += 1;
      const object = {};
      if (tokens[at]?.[0] === '}') { at += 1; return object; }
      while (at < tokens.length) {
        const key = take('s');
        take(':');
        object[key] = value();
        if (tokens[at]?.[0] === '}') { at += 1; return object; }
        take(',');
      }
      throw new Error('unterminated mapping');
    }
    if (type === '[') {
      at += 1;
      const array = [];
      if (tokens[at]?.[0] === ']') { at += 1; return array; }
      while (at < tokens.length) {
        array.push(value());
        if (tokens[at]?.[0] === ']') { at += 1; return array; }
        take(',');
      }
      throw new Error('unterminated sequence');
    }
    const scalarValue = take('s');
    if (/^(?:null|~)$/i.test(scalarValue)) return null;
    if (/^true$/i.test(scalarValue)) return true;
    if (/^false$/i.test(scalarValue)) return false;
    return scalarValue;
  };
  const result = value();
  if (at !== tokens.length) throw new Error('trailing token');
  return result;
}

function mainGlob(pattern) {
  if (typeof pattern !== 'string' || pattern.startsWith('!')) return false;
  const regex = esc(pattern).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.');
  return new RegExp(`^${regex}$`).test('main');
}

function branchValues(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value) && value.every((x) => typeof x === 'string')) return value;
  return null;
}

function pushTarget(value) {
  if (value === null || value === true) return { root: true, errors: [] };
  if (value === false) return { root: false, errors: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { root: true, errors: ['push configuration is not safely analyzable'] };
  const hasBranches = Object.hasOwn(value, 'branches');
  const hasIgnored = Object.hasOwn(value, 'branches-ignore');
  if (hasBranches && hasIgnored) return { root: true, errors: ['push has branches and branches-ignore'] };
  if (hasBranches) {
    const values = branchValues(value.branches);
    return values ? { root: values.some(mainGlob), errors: [] } : { root: true, errors: ['branches filter is not safely analyzable'] };
  }
  if (hasIgnored) {
    const values = branchValues(value['branches-ignore']);
    return values ? { root: !values.some(mainGlob), errors: [] } : { root: true, errors: ['branches-ignore filter is not safely analyzable'] };
  }
  return { root: true, errors: [] };
}

function scalar(source) {
  const value = source.trim();
  if (!value) return null;
  if (yamlMeta(value)) throw new Error('anchors, aliases, tags or merge keys are unsupported');
  if (/^[\[{]/.test(value)) return flow(value);
  if (/^['"]/.test(value)) {
    const parsed = flow(value);
    if (typeof parsed !== 'string') throw new Error('expected scalar');
    return parsed;
  }
  if (/[\[\]{}:,]/.test(value)) throw new Error('unsupported YAML punctuation');
  return value;
}

function yamlList(lines, key, minIndent) {
  const re = new RegExp(`^\\s{${minIndent},}(?:${esc(key)}|'${esc(key)}'|"${esc(key)}")\\s*:\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    const match = uncomment(lines[i]).match(re);
    if (!match) continue;
    const keyIndent = indent(lines[i]);
    const rhs = match[1].trim();
    try {
      if (rhs) {
        if ((rhs.startsWith('[') && !rhs.endsWith(']')) || (rhs.startsWith('{') && !rhs.endsWith('}'))) {
          return { present: true, values: null, error: `${key} uses a multiline flow collection that is not safely analyzable` };
        }
        const values = branchValues(scalar(rhs));
        return values ? { present: true, values, error: null } : { present: true, values: null, error: `${key} filter is not safely analyzable` };
      }
      const values = [];
      let saw = false;
      for (let j = i + 1; j < lines.length; j += 1) {
        const clean = uncomment(lines[j]);
        if (!clean.trim()) continue;
        if (indent(lines[j]) <= keyIndent) break;
        saw = true;
        const item = clean.trim().match(/^-\s+(.+)$/);
        if (!item) return { present: true, values: null, error: `${key} block is not a plain scalar sequence` };
        const parsed = scalar(item[1]);
        if (typeof parsed !== 'string') return { present: true, values: null, error: `${key} block contains a non-scalar item` };
        values.push(parsed);
      }
      if (!saw || !values.length) return { present: true, values: null, error: `${key} filter is empty or not safely analyzable` };
      return { present: true, values, error: null };
    } catch (error) {
      return { present: true, values: null, error: `${key} filter is not safely analyzable (${error.message})` };
    }
  }
  return { present: false, values: null, error: null };
}

function trigger(text) {
  const on = top(text, 'on');
  if (!on) return { root: false, errors: ['workflow has no readable top-level on key'] };
  if (yamlMeta(on.lines.map(uncomment).join('\n'))) {
    return { root: true, errors: ['on trigger uses YAML anchors, aliases, tags or merge keys that are not safely analyzable'] };
  }
  if (on.inline) {
    try {
      const value = flow(on.inline);
      if (typeof value === 'string') return { root: value === 'push', errors: [] };
      if (Array.isArray(value)) return { root: value.includes('push'), errors: value.every((x) => typeof x === 'string') ? [] : ['on sequence has non-scalar event'] };
      if (value && typeof value === 'object') return Object.hasOwn(value, 'push') ? pushTarget(value.push) : { root: false, errors: [] };
      return { root: true, errors: ['inline on is not safely analyzable'] };
    } catch (error) {
      return { root: true, errors: [`inline on flow is not safely analyzable (${error.message})`] };
    }
  }
  const rows = on.lines.slice(1).map((line, index) => ({ line, index, clean: uncomment(line) })).filter((row) => row.clean.trim());
  if (!rows.length) return { root: true, errors: ['on mapping is empty'] };
  const level = Math.min(...rows.map((row) => indent(row.line)));
  const push = rows.find((row) => indent(row.line) === level && /^\s*(?:push|'push'|"push")\s*:/.test(row.clean));
  if (!push) return { root: false, errors: [] };
  const pushIndent = indent(push.line);
  const inline = push.clean.split(':').slice(1).join(':').trim();
  if (inline) {
    try { return pushTarget(flow(inline)); }
    catch (error) { return { root: true, errors: [`inline push flow is not safely analyzable (${error.message})`] }; }
  }
  const block = [push.line];
  for (let j = push.index + 1; j < on.lines.length - 1; j += 1) {
    const line = on.lines[j + 1];
    if (uncomment(line).trim() && indent(line) <= pushIndent) break;
    block.push(line);
  }
  const branches = yamlList(block, 'branches', pushIndent + 1);
  const ignored = yamlList(block, 'branches-ignore', pushIndent + 1);
  const errors = [branches.error, ignored.error].filter(Boolean);
  if (branches.present && ignored.present) errors.push('push has branches and branches-ignore');
  if (errors.length) return { root: true, errors };
  if (branches.present) return { root: branches.values.some(mainGlob), errors: [] };
  if (ignored.present) return { root: !ignored.values.some(mainGlob), errors: [] };
  return { root: true, errors: [] };
}

export const allowsGenericMainPush = (text) => trigger(text).root;

function shape(file, text) {
  const errors = [];
  if (!text.trim()) errors.push('workflow is empty');
  if (text.includes('\0')) errors.push('workflow contains NUL');
  if (/^[ ]*\t/m.test(text)) errors.push('workflow contains tab indentation');
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(text)) errors.push('workflow contains conflict markers');
  if (!top(text, 'on')) errors.push('workflow has no readable top-level on key');
  if (!top(text, 'jobs')) errors.push('workflow has no readable top-level jobs key');
  errors.push(...trigger(text).errors);
  return errors.map((error) => `${file}: ${error}`);
}

const refs = (text, re, map = (x) => x) => [...text.matchAll(re)].map((m) => map(m[1]));
const workflows = (text) => refs(text, /uses\s*:\s*['"]?(\.\/\.github\/workflows\/[^'"\s#]+)/g, (x) => x.slice(2));
const actions = (text) => refs(text, /uses\s*:\s*['"]?(\.\/[^'"\s#]+)/g, (x) => x.slice(2)).filter((x) => !x.startsWith('.github/workflows/'));
const scripts = (text) => [...new Set(refs(text, /(?:^|[\s;&|])(?:bash|sh|node|bun|python3?|ruby|perl)?\s*((?:\.\/)?(?:scripts|\.github)\/[\w./-]+)/gm, (x) => x.replace(/^\.\//, '')))];
const packageScripts = (text) => [...new Set([...text.matchAll(/\b(?:npm|bun|pnpm)\s+run\s+([\w:-]+)|\byarn\s+([\w:-]+)/g)].map((m) => m[1] || m[2]))];

function runCommands(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const match = uncomment(lines[i]).match(/^(\s*)(?:-\s*)?(?:run|'run'|"run")\s*:\s*(.*)$/);
    if (!match) continue;
    const at = match[1].length;
    const value = match[2].trim();
    if (/^[|>][+-]?$/.test(value)) {
      const block = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (uncomment(lines[j]).trim() && indent(lines[j]) <= at) break;
        block.push(lines[j].slice(Math.min(lines[j].length, at + 2)));
        i = j;
      }
      out.push(block.join('\n'));
    } else if (value) out.push(value.replace(/^(['"])([\s\S]*)\1$/, '$2'));
  }
  return out;
}

function statements(text) {
  const out = [];
  let start = 0;
  let single = false;
  let double = false;
  let backtick = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !double && !backtick) single = !single;
    else if (c === '"' && !single && !backtick && text[i - 1] !== '\\') double = !double;
    else if (c === '`' && !single && !double && text[i - 1] !== '\\') backtick = !backtick;
    if (single || double || backtick) continue;
    const pair = text.slice(i, i + 2);
    if (c === '\n' || c === ';' || pair === '&&' || pair === '||') {
      const part = text.slice(start, i).trim();
      if (part) out.push(part);
      if (pair === '&&' || pair === '||') i += 1;
      start = i + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

function words(text) {
  const out = [];
  let word = '';
  let single = false;
  let double = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !double) { single = !single; continue; }
    if (c === '"' && !single && text[i - 1] !== '\\') { double = !double; continue; }
    if (!single && !double && /\s/.test(c)) { if (word) out.push(word); word = ''; }
    else word += c;
  }
  if (word) out.push(word);
  return out;
}

function install(statement) {
  const args = words(statement.toLowerCase());
  while (args[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(args[0])) args.shift();
  if (args[0] === 'sudo' || args[0] === 'command') args.shift();
  return (args[0] === 'npm' && ['install', 'i', 'add'].includes(args[1]))
    || (args[0] === 'pnpm' && ['install', 'i', 'add'].includes(args[1]))
    || (args[0] === 'yarn' && args[1] === 'add')
    || (args[0] === 'bun' && ['install', 'i', 'add'].includes(args[1]));
}

function quoteAt(text, offset) {
  let single = false;
  let double = false;
  let backtick = false;
  let start = -1;
  for (let i = 0; i < offset; i += 1) {
    const c = text[i];
    if (c === "'" && !double && !backtick) { single = !single; start = single ? i : -1; }
    else if (c === '"' && !single && !backtick && text[i - 1] !== '\\') { double = !double; start = double ? i : -1; }
    else if (c === '`' && !single && !double && text[i - 1] !== '\\') { backtick = !backtick; start = backtick ? i : -1; }
  }
  return { single, double, backtick, start };
}

function activeQuoted(statement, offset) {
  const quote = quoteAt(statement, offset);
  if (!quote.single && !quote.double && !quote.backtick) return true;
  if (quote.backtick) return true;
  const before = statement.slice(0, offset);
  const prefix = statement.slice(0, quote.start);
  if (before.lastIndexOf('$(') > before.lastIndexOf(')')) return true;
  return /(?:^|\s)(?:bash|sh|zsh|dash|ksh)\s+(?:[^;]*\s)?-c\s*$/i.test(prefix) || /(?:^|\s)eval\s*$/i.test(prefix);
}

function argsAfter(statement, end) {
  const tail = statement.slice(end);
  const cut = tail.search(/(?:&&|\|\||;|\n|\))/);
  const args = words(cut >= 0 ? tail.slice(0, cut) : tail).filter(Boolean);
  while (args[0] === '--') args.shift();
  return args;
}

function wranglerClass(file, args) {
  if (!args.length) return `${file}: Wrangler reference is not provably read-only`;
  const command = args[0].toLowerCase();
  if (['--version', '-v', 'version', '--help', '-h', 'help'].includes(command)) return null;
  if (command === 'deploy') return args.some((arg) => /^--dry-run(?:=true)?$/i.test(arg)) ? null : `${file}: non-dry-run wrangler deploy`;
  if (command === 'dev') {
    const local = args.some((arg) => /^--local(?:=true)?$/i.test(arg));
    const remote = args.some((arg) => /^--remote(?:=true)?$/i.test(arg));
    return local && !remote ? null : `${file}: wrangler dev is not provably local-only`;
  }
  if (command === 'versions' && args[1]?.toLowerCase() === 'deploy') return `${file}: wrangler versions deploy`;
  if (command === 'secret' || (command === 'versions' && args[1]?.toLowerCase() === 'secret')) return `${file}: wrangler secret mutation`;
  if (command === 'rollback' || command === 'delete' || (command === 'versions' && args[1]?.toLowerCase() === 'upload') || (command === 'deployments' && args[1]?.toLowerCase() === 'create')) return `${file}: other mutating wrangler command`;
  return `${file}: Wrangler command is not provably read-only (${args.slice(0, 3).join(' ')})`;
}

function executable(file, text) {
  return /\.ya?ml$/i.test(file) ? runCommands(text) : [text];
}

const WRANGLER = /(?:^|[\s"'`$()&;|])((?:(?:\.{0,2}[\\/])?(?:[\w.@+-]+[\\/])*)?(?:wrangler(?:@[\w*.+-]+)?[\\/]bin[\\/]wrangler\.(?:js|cjs|mjs)|wrangler-dist[\\/](?:cli|index)\.(?:js|cjs|mjs)|wrangler(?:@[\w*.+-]+)?(?:\.(?:cmd|exe))?))(?=$|[\s"'`$()&;|])/gi;

function unsafe(file, text) {
  if (file === ENGINE) return [];
  const findings = [];
  for (const command of executable(file, text)) {
    for (const statement of statements(command.replace(/\\\r?\n\s*/g, ' '))) {
      const packageInstall = install(statement);
      for (const match of statement.matchAll(WRANGLER)) {
        if (packageInstall) continue;
        const at = match.index + match[0].lastIndexOf(match[1]);
        if (!activeQuoted(statement, at)) continue;
        const finding = wranglerClass(file, argsAfter(statement, at + match[1].length));
        if (finding) findings.push(finding);
      }
    }
    if (/api\.cloudflare\.com\/client\/v4/i.test(command)) {
      const mutating = /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(command)
        || /(?:--data(?:-raw|-binary)?|-d)\s+/i.test(command)
        || /method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(command);
      findings.push(`${file}: Cloudflare API reference is ${mutating ? 'mutating' : 'not provably read-only'}`);
    }
    for (const match of command.matchAll(/(?:^|[\s"'`$()&;|])(?:cloudflare|cloudflared)(?=$|[\s"'`$()&;|])/gi)) {
      const at = match.index + match[0].search(/cloudflare/i);
      if (activeQuoted(command, at)) findings.push(`${file}: executable Cloudflare command is not provably read-only`);
    }
  }
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID', 'CF_API_TOKEN']) if (text.includes(key)) findings.push(`${file}: references ${key}`);
  if (/\bsecrets\s*:\s*inherit\b/i.test(text)) findings.push(`${file}: uses secrets: inherit`);
  if (/uses\s*:\s*['"]?[^'"\s#]*(?:cloudflare|wrangler-action)/i.test(text)) findings.push(`${file}: uses a Cloudflare or Wrangler action`);
  return [...new Set(findings)];
}

function policy(root) {
  const file = path.join(root, POLICY);
  if (!fs.existsSync(file)) return [`${POLICY}: missing policy document`];
  let text;
  try { text = read(file); }
  catch (error) { return [`${POLICY}: unreadable UTF-8 (${error.message})`]; }
  const required = [
    ['generic_main_push_production_write: false', /generic_main_push_production_write\s*:\s*false\b/],
    ['candidate_required: true', /candidate_required\s*:\s*true\b/],
    ['candidate_traffic_percent: 0', /candidate_traffic_percent\s*:\s*0\b/],
    ['exact_source_sha_required: true', /exact_source_sha_required\s*:\s*true\b/],
    ['production_promotion: mission_specific', /production_promotion\s*:\s*mission_specific\b/],
    ['aud_pass_required: true', /aud_pass_required\s*:\s*true\b/],
    ['current_cloudflare_state_required: true', /current_cloudflare_state_required\s*:\s*true\b/],
    ['rollback_requires_separate_authorization: true', /rollback_requires_separate_authorization\s*:\s*true\b/]
  ];
  return required.filter(([, re]) => !re.test(text)).map(([name]) => `${POLICY}: missing ${name}`);
}

function resolveAction(root, reference) {
  const absolute = path.join(root, reference);
  if (!fs.existsSync(absolute)) return null;
  if (fs.statSync(absolute).isFile()) return reference;
  for (const name of ['action.yml', 'action.yaml']) if (fs.existsSync(path.join(absolute, name))) return path.join(reference, name);
  return null;
}

export function analyzeRepository(root = process.cwd()) {
  const violations = policy(root);
  const directory = path.join(root, WF);
  if (!fs.existsSync(directory)) return { ok: false, roots: [], inspected: [], violations: [...violations, `${WF}: missing`] };
  const files = fs.readdirSync(directory).filter((name) => /\.ya?ml$/i.test(name)).sort().map((name) => `${WF}/${name}`);
  const content = new Map();
  const analysis = new Map();
  for (const file of files) {
    try {
      const text = read(path.join(root, file));
      content.set(file, text);
      analysis.set(file, trigger(text));
      violations.push(...shape(file, text));
    } catch (error) {
      violations.push(`${file}: unreadable UTF-8 (${error.message})`);
    }
  }
  const roots = files.filter((file) => analysis.get(file)?.root);
  if (!roots.length) violations.push('No workflow guards generic pushes to main');
  const done = new Set();
  const active = new Set();
  let packageJson = null;
  function inspect(file) {
    if (done.has(file)) return;
    if (active.has(file)) { violations.push(`${file}: local reference cycle is not safely analyzable`); return; }
    active.add(file);
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      violations.push(`${file}: referenced local file is missing`);
      active.delete(file);
      return;
    }
    let text;
    try { text = read(absolute); }
    catch (error) {
      violations.push(`${file}: unreadable UTF-8 (${error.message})`);
      active.delete(file);
      return;
    }
    violations.push(...unsafe(file, text));
    for (const reference of workflows(text)) content.has(reference) ? inspect(reference) : violations.push(`${file}: unresolved local workflow ${reference}`);
    for (const reference of actions(text)) {
      const resolved = resolveAction(root, reference);
      resolved ? inspect(posix(resolved)) : violations.push(`${file}: unresolved local action ${reference}`);
    }
    for (const reference of scripts(text)) if (reference !== file) inspect(posix(reference));
    for (const name of packageScripts(text)) {
      if (!packageJson) {
        try { packageJson = JSON.parse(read(path.join(root, 'package.json'))); }
        catch (error) { violations.push(`package.json: unreadable package scripts (${error.message})`); continue; }
      }
      const command = packageJson?.scripts?.[name];
      if (typeof command !== 'string') violations.push(`${file}: unresolved package script ${name}`);
      else {
        violations.push(...unsafe(`package.json#scripts.${name}`, command));
        for (const reference of scripts(command)) inspect(posix(reference));
      }
    }
    active.delete(file);
    done.add(file);
  }
  for (const file of roots) inspect(file);
  const unique = [...new Set(violations)].sort();
  return { ok: unique.length === 0, roots, inspected: [...done].sort(), violations: unique };
}

function cli() {
  const result = analyzeRepository();
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

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli();
