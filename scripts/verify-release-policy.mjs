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
  let s = false, d = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === "'" && !d) s = !s;
    else if (c === '"' && !s && line[i - 1] !== '\\') d = !d;
    else if (c === '#' && !s && !d) return line.slice(0, i);
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

function flowTokens(source) {
  const out = [];
  for (let i = 0; i < source.length;) {
    const c = source[i];
    if (/\s/.test(c)) { i += 1; continue; }
    if ('{}[],:'.includes(c)) { out.push([c, c]); i += 1; continue; }
    if (c === "'" || c === '"') {
      const q = c; let v = ''; let closed = false; i += 1;
      while (i < source.length) {
        const x = source[i];
        if (q === "'" && x === "'" && source[i + 1] === "'") { v += "'"; i += 2; continue; }
        if (x === q) { closed = true; i += 1; break; }
        if (q === '"' && x === '\\' && i + 1 < source.length) { v += source[i + 1]; i += 2; continue; }
        v += x; i += 1;
      }
      if (!closed) throw new Error('unterminated quote');
      out.push(['s', v]); continue;
    }
    const start = i;
    while (i < source.length && !/[\s{}\[\],:]/.test(source[i])) i += 1;
    if (start === i) throw new Error(`unsupported ${source[i]}`);
    out.push(['s', source.slice(start, i)]);
  }
  return out;
}

function flow(source) {
  const tokens = flowTokens(source); let i = 0;
  const take = (t) => {
    const x = tokens[i];
    if (!x || x[0] !== t) throw new Error(`expected ${t}`);
    i += 1; return x[1];
  };
  const value = () => {
    const t = tokens[i]?.[0];
    if (t === '{') {
      i += 1; const o = {};
      if (tokens[i]?.[0] === '}') { i += 1; return o; }
      while (i < tokens.length) {
        const k = take('s'); take(':'); o[k] = value();
        if (tokens[i]?.[0] === '}') { i += 1; return o; }
        take(',');
      }
      throw new Error('unterminated mapping');
    }
    if (t === '[') {
      i += 1; const a = [];
      if (tokens[i]?.[0] === ']') { i += 1; return a; }
      while (i < tokens.length) {
        a.push(value());
        if (tokens[i]?.[0] === ']') { i += 1; return a; }
        take(',');
      }
      throw new Error('unterminated sequence');
    }
    const v = take('s');
    if (/^(?:null|~)$/i.test(v)) return null;
    if (/^true$/i.test(v)) return true;
    if (/^false$/i.test(v)) return false;
    return v;
  };
  const result = value();
  if (i !== tokens.length) throw new Error('trailing token');
  return result;
}

function mainGlob(p) {
  if (typeof p !== 'string' || p.startsWith('!')) return false;
  const r = esc(p).replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.');
  return new RegExp(`^${r}$`).test('main');
}

function branches(v) {
  if (typeof v === 'string') return [v];
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) return v;
  return null;
}

function pushTarget(v) {
  if (v === null || v === true) return { root: true, errors: [] };
  if (v === false) return { root: false, errors: [] };
  if (!v || typeof v !== 'object' || Array.isArray(v)) return { root: true, errors: ['push configuration is not safely analyzable'] };
  const b = Object.hasOwn(v, 'branches');
  const bi = Object.hasOwn(v, 'branches-ignore');
  if (b && bi) return { root: true, errors: ['push has branches and branches-ignore'] };
  if (b) {
    const x = branches(v.branches);
    return x ? { root: x.some(mainGlob), errors: [] } : { root: true, errors: ['branches filter is not safely analyzable'] };
  }
  if (bi) {
    const x = branches(v['branches-ignore']);
    return x ? { root: !x.some(mainGlob), errors: [] } : { root: true, errors: ['branches-ignore filter is not safely analyzable'] };
  }
  return { root: true, errors: [] };
}

function yamlValues(lines, key, min) {
  const re = new RegExp(`^\\s{${min},}(?:${esc(key)}|'${esc(key)}'|"${esc(key)}")\\s*:\\s*(.*)$`);
  for (let i = 0; i < lines.length; i += 1) {
    const m = uncomment(lines[i]).match(re);
    if (!m) continue;
    const at = indent(lines[i]);
    const out = m[1].replace(/[\[\]{}]/g, ' ').split(/[\s,]+/).map((x) => x.replace(/^['"]|['"]$/g, '')).filter(Boolean);
    for (let j = i + 1; j < lines.length; j += 1) {
      const c = uncomment(lines[j]);
      if (!c.trim()) continue;
      if (indent(lines[j]) <= at) break;
      const item = c.trim().match(/^-\s*(.+)$/);
      if (item) out.push(...item[1].replace(/[\[\]{}]/g, ' ').split(/[\s,]+/).map((x) => x.replace(/^['"]|['"]$/g, '')).filter(Boolean));
    }
    return out;
  }
  return null;
}

function trigger(text) {
  const on = top(text, 'on');
  if (!on) return { root: false, errors: ['workflow has no readable top-level on key'] };
  if (on.inline) {
    try {
      const v = flow(on.inline);
      if (typeof v === 'string') return { root: v === 'push', errors: [] };
      if (Array.isArray(v)) return { root: v.includes('push'), errors: v.every((x) => typeof x === 'string') ? [] : ['on sequence has non-scalar event'] };
      if (v && typeof v === 'object') return Object.hasOwn(v, 'push') ? pushTarget(v.push) : { root: false, errors: [] };
      return { root: true, errors: ['inline on is not safely analyzable'] };
    } catch (e) { return { root: true, errors: [`inline on flow is not safely analyzable (${e.message})`] }; }
  }
  const rows = on.lines.slice(1).map((line, i) => ({ line, i, clean: uncomment(line) })).filter((x) => x.clean.trim());
  if (!rows.length) return { root: true, errors: ['on mapping is empty'] };
  const level = Math.min(...rows.map((x) => indent(x.line)));
  const p = rows.find((x) => indent(x.line) === level && /^\s*(?:push|'push'|"push")\s*:/.test(x.clean));
  if (!p) return { root: false, errors: [] };
  const pi = indent(p.line);
  const inline = p.clean.split(':').slice(1).join(':').trim();
  if (inline) {
    try { return pushTarget(flow(inline)); }
    catch (e) { return { root: true, errors: [`inline push flow is not safely analyzable (${e.message})`] }; }
  }
  const block = [p.line];
  for (let j = p.i + 1; j < on.lines.length - 1; j += 1) {
    const line = on.lines[j + 1];
    if (uncomment(line).trim() && indent(line) <= pi) break;
    block.push(line);
  }
  const b = yamlValues(block, 'branches', pi + 1);
  const bi = yamlValues(block, 'branches-ignore', pi + 1);
  if (b && bi) return { root: true, errors: ['push has branches and branches-ignore'] };
  if (b) return { root: b.some(mainGlob), errors: [] };
  if (bi) return { root: !bi.some(mainGlob), errors: [] };
  return { root: true, errors: [] };
}

export const allowsGenericMainPush = (text) => trigger(text).root;

function shape(file, text) {
  const e = [];
  if (!text.trim()) e.push('workflow is empty');
  if (text.includes('\0')) e.push('workflow contains NUL');
  if (/^[ ]*\t/m.test(text)) e.push('workflow contains tab indentation');
  if (/^(?:<<<<<<<|=======|>>>>>>>)/m.test(text)) e.push('workflow contains conflict markers');
  if (!top(text, 'on')) e.push('workflow has no readable top-level on key');
  if (!top(text, 'jobs')) e.push('workflow has no readable top-level jobs key');
  e.push(...trigger(text).errors);
  return e.map((x) => `${file}: ${x}`);
}

const refs = (text, re, map = (x) => x) => [...text.matchAll(re)].map((m) => map(m[1]));
const workflows = (t) => refs(t, /uses\s*:\s*['"]?(\.\/\.github\/workflows\/[^'"\s#]+)/g, (x) => x.slice(2));
const actions = (t) => refs(t, /uses\s*:\s*['"]?(\.\/[^'"\s#]+)/g, (x) => x.slice(2)).filter((x) => !x.startsWith('.github/workflows/'));
const scripts = (t) => [...new Set(refs(t, /(?:^|[\s;&|])(?:bash|sh|node|bun|python3?|ruby|perl)?\s*((?:\.\/)?(?:scripts|\.github)\/[A-Za-z0-9_.\/-]+)/gm, (x) => x.replace(/^\.\//, '')))];
const packageScripts = (t) => [...new Set([...t.matchAll(/\b(?:npm|bun|pnpm)\s+run\s+([A-Za-z0-9:_-]+)|\byarn\s+([A-Za-z0-9:_-]+)/g)].map((m) => m[1] || m[2]))];

function runCommands(text) {
  const lines = text.split(/\r?\n/); const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = uncomment(lines[i]).match(/^(\s*)(?:-\s*)?(?:run|'run'|"run")\s*:\s*(.*)$/);
    if (!m) continue;
    const at = m[1].length, v = m[2].trim();
    if (/^[|>][+-]?$/.test(v)) {
      const block = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        if (uncomment(lines[j]).trim() && indent(lines[j]) <= at) break;
        block.push(lines[j].slice(Math.min(lines[j].length, at + 2))); i = j;
      }
      out.push(block.join('\n'));
    } else if (v) out.push(v.replace(/^(['"])([\s\S]*)\1$/, '$2'));
  }
  return out;
}

function statements(text) {
  const out = []; let start = 0, s = false, d = false, b = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !d && !b) s = !s;
    else if (c === '"' && !s && !b && text[i - 1] !== '\\') d = !d;
    else if (c === '`' && !s && !d && text[i - 1] !== '\\') b = !b;
    if (s || d || b) continue;
    const pair = text.slice(i, i + 2);
    if (c === '\n' || c === ';' || pair === '&&' || pair === '||') {
      const x = text.slice(start, i).trim(); if (x) out.push(x);
      if (pair === '&&' || pair === '||') i += 1;
      start = i + 1;
    }
  }
  const x = text.slice(start).trim(); if (x) out.push(x); return out;
}

function words(text) {
  const out = []; let x = '', s = false, d = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "'" && !d) { s = !s; continue; }
    if (c === '"' && !s && text[i - 1] !== '\\') { d = !d; continue; }
    if (!s && !d && /\s/.test(c)) { if (x) out.push(x); x = ''; }
    else x += c;
  }
  if (x) out.push(x); return out;
}

function install(stmt) {
  const w = words(stmt.toLowerCase());
  while (w[0] && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w.shift();
  if (w[0] === 'sudo' || w[0] === 'command') w.shift();
  return (w[0] === 'npm' && ['install', 'i', 'add'].includes(w[1]))
    || (w[0] === 'pnpm' && ['install', 'i', 'add'].includes(w[1]))
    || (w[0] === 'yarn' && w[1] === 'add')
    || (w[0] === 'bun' && ['install', 'i', 'add'].includes(w[1]));
}

function quoteAt(text, offset) {
  let s = false, d = false, b = false, start = -1;
  for (let i = 0; i < offset; i += 1) {
    const c = text[i];
    if (c === "'" && !d && !b) { s = !s; start = s ? i : -1; }
    else if (c === '"' && !s && !b && text[i - 1] !== '\\') { d = !d; start = d ? i : -1; }
    else if (c === '`' && !s && !d && text[i - 1] !== '\\') { b = !b; start = b ? i : -1; }
  }
  return { s, d, b, start };
}

function activeQuoted(stmt, offset) {
  const q = quoteAt(stmt, offset);
  if (!q.s && !q.d && !q.b) return true;
  if (q.b) return true;
  const before = stmt.slice(0, offset), prefix = stmt.slice(0, q.start);
  if (before.lastIndexOf('$(') > before.lastIndexOf(')')) return true;
  return /(?:^|\s)(?:bash|sh|zsh|dash|ksh)\s+(?:[^;]*\s)?-c\s*$/i.test(prefix) || /(?:^|\s)eval\s*$/i.test(prefix);
}

function argsAfter(stmt, end) {
  const tail = stmt.slice(end); const cut = tail.search(/(?:&&|\|\||;|\n|\))/);
  const w = words(cut >= 0 ? tail.slice(0, cut) : tail).filter(Boolean);
  while (w[0] === '--') w.shift(); return w;
}

function wranglerClass(file, args) {
  if (!args.length) return `${file}: Wrangler reference is not provably read-only`;
  const c = args[0].toLowerCase();
  if (['--version', '-v', 'version', '--help', '-h', 'help'].includes(c)) return null;
  if (c === 'deploy') return args.some((x) => /^--dry-run(?:=true)?$/i.test(x)) ? null : `${file}: non-dry-run wrangler deploy`;
  if (c === 'dev') {
    const local = args.some((x) => /^--local(?:=true)?$/i.test(x));
    const remote = args.some((x) => /^--remote(?:=true)?$/i.test(x));
    return local && !remote ? null : `${file}: wrangler dev is not provably local-only`;
  }
  if (c === 'versions' && args[1]?.toLowerCase() === 'deploy') return `${file}: wrangler versions deploy`;
  if (c === 'secret' || (c === 'versions' && args[1]?.toLowerCase() === 'secret')) return `${file}: wrangler secret mutation`;
  if (c === 'rollback' || c === 'delete' || (c === 'versions' && args[1]?.toLowerCase() === 'upload') || (c === 'deployments' && args[1]?.toLowerCase() === 'create')) return `${file}: other mutating wrangler command`;
  return `${file}: Wrangler command is not provably read-only (${args.slice(0, 3).join(' ')})`;
}

function executable(file, text) { return /\.ya?ml$/i.test(file) ? runCommands(text) : [text]; }

function unsafe(file, text) {
  if (file === ENGINE) return [];
  const out = [];
  const matcher = /(?:^|[\s"'`$()&;|])((?:(?:\.{0,2}\/)?(?:[A-Za-z0-9_.-]+\/)*)?wrangler(?:@[A-Za-z0-9*_.+-]+)?(?:\.(?:cmd|exe))?)(?=$|[\s"'`$()&;|])/gi;
  for (const command of executable(file, text)) {
    for (const stmt of statements(command.replace(/\\\r?\n\s*/g, ' '))) {
      const pkg = install(stmt);
      for (const m of stmt.matchAll(matcher)) {
        if (pkg) continue;
        const at = m.index + m[0].lastIndexOf(m[1]);
        if (!activeQuoted(stmt, at)) continue;
        const finding = wranglerClass(file, argsAfter(stmt, at + m[1].length));
        if (finding) out.push(finding);
      }
    }
    if (/api\.cloudflare\.com\/client\/v4/i.test(command)) {
      const mut = /(?:-X|--request)\s*(?:POST|PUT|PATCH|DELETE)\b/i.test(command) || /(?:--data(?:-raw|-binary)?|-d)\s+/i.test(command) || /method\s*[:=]\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(command);
      out.push(`${file}: Cloudflare API reference is ${mut ? 'mutating' : 'not provably read-only'}`);
    }
    for (const m of command.matchAll(/(?:^|[\s"'`$()&;|])(?:cloudflare|cloudflared)(?=$|[\s"'`$()&;|])/gi)) {
      const at = m.index + m[0].search(/cloudflare/i);
      if (activeQuoted(command, at)) out.push(`${file}: executable Cloudflare command is not provably read-only`);
    }
  }
  for (const key of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ZONE_ID', 'CF_API_TOKEN']) if (text.includes(key)) out.push(`${file}: references ${key}`);
  if (/\bsecrets\s*:\s*inherit\b/i.test(text)) out.push(`${file}: uses secrets: inherit`);
  if (/uses\s*:\s*['"]?[^'"\s#]*(?:cloudflare|wrangler-action)/i.test(text)) out.push(`${file}: uses a Cloudflare or Wrangler action`);
  return [...new Set(out)];
}

function policy(root) {
  const p = path.join(root, POLICY);
  if (!fs.existsSync(p)) return [`${POLICY}: missing policy document`];
  let text; try { text = read(p); } catch (e) { return [`${POLICY}: unreadable UTF-8 (${e.message})`]; }
  const req = [
    ['generic_main_push_production_write: false', /generic_main_push_production_write\s*:\s*false\b/],
    ['candidate_required: true', /candidate_required\s*:\s*true\b/],
    ['candidate_traffic_percent: 0', /candidate_traffic_percent\s*:\s*0\b/],
    ['exact_source_sha_required: true', /exact_source_sha_required\s*:\s*true\b/],
    ['production_promotion: mission_specific', /production_promotion\s*:\s*mission_specific\b/],
    ['aud_pass_required: true', /aud_pass_required\s*:\s*true\b/],
    ['current_cloudflare_state_required: true', /current_cloudflare_state_required\s*:\s*true\b/],
    ['rollback_requires_separate_authorization: true', /rollback_requires_separate_authorization\s*:\s*true\b/]
  ];
  return req.filter(([, re]) => !re.test(text)).map(([x]) => `${POLICY}: missing ${x}`);
}

function resolveAction(root, ref) {
  const abs = path.join(root, ref);
  if (!fs.existsSync(abs)) return null;
  if (fs.statSync(abs).isFile()) return ref;
  for (const name of ['action.yml', 'action.yaml']) if (fs.existsSync(path.join(abs, name))) return path.join(ref, name);
  return null;
}

export function analyzeRepository(root = process.cwd()) {
  const violations = policy(root), dir = path.join(root, WF);
  if (!fs.existsSync(dir)) return { ok: false, roots: [], inspected: [], violations: [...violations, `${WF}: missing`] };
  const files = fs.readdirSync(dir).filter((x) => /\.ya?ml$/i.test(x)).sort().map((x) => `${WF}/${x}`);
  const content = new Map(), analysis = new Map();
  for (const file of files) {
    try {
      const text = read(path.join(root, file)); content.set(file, text); analysis.set(file, trigger(text)); violations.push(...shape(file, text));
    } catch (e) { violations.push(`${file}: unreadable UTF-8 (${e.message})`); }
  }
  const roots = files.filter((file) => analysis.get(file)?.root);
  if (!roots.length) violations.push('No workflow guards generic pushes to main');
  const done = new Set(), active = new Set(); let pkg = null;
  function inspect(file) {
    if (done.has(file)) return;
    if (active.has(file)) { violations.push(`${file}: local reference cycle is not safely analyzable`); return; }
    active.add(file); const abs = path.join(root, file);
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { violations.push(`${file}: referenced local file is missing`); active.delete(file); return; }
    let text; try { text = read(abs); } catch (e) { violations.push(`${file}: unreadable UTF-8 (${e.message})`); active.delete(file); return; }
    violations.push(...unsafe(file, text));
    for (const ref of workflows(text)) content.has(ref) ? inspect(ref) : violations.push(`${file}: unresolved local workflow ${ref}`);
    for (const ref of actions(text)) { const x = resolveAction(root, ref); x ? inspect(posix(x)) : violations.push(`${file}: unresolved local action ${ref}`); }
    for (const ref of scripts(text)) if (ref !== file) inspect(posix(ref));
    for (const name of packageScripts(text)) {
      if (!pkg) {
        try { pkg = JSON.parse(read(path.join(root, 'package.json'))); }
        catch (e) { violations.push(`package.json: unreadable package scripts (${e.message})`); continue; }
      }
      const command = pkg?.scripts?.[name];
      if (typeof command !== 'string') violations.push(`${file}: unresolved package script ${name}`);
      else { violations.push(...unsafe(`package.json#scripts.${name}`, command)); for (const ref of scripts(command)) inspect(posix(ref)); }
    }
    active.delete(file); done.add(file);
  }
  for (const file of roots) inspect(file);
  const unique = [...new Set(violations)].sort();
  return { ok: unique.length === 0, roots, inspected: [...done].sort(), violations: unique };
}

function cli() {
  const r = analyzeRepository();
  console.log(JSON.stringify({ ok: r.ok, genericMainPushWorkflows: r.roots, inspectedFiles: r.inspected, violations: r.violations, claims: { currentTreeGenericMainPushProductionWrite: r.ok ? 'NO' : 'NOT_PROVEN', prRegressionDetection: r.ok ? 'YES' : 'NOT_PROVEN', futureDirectPushPrevention: 'UNVERIFIED' } }, null, 2));
  if (!r.ok) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) cli();
