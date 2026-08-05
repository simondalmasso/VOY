#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const candidates = [process.env.STATIC_ROOT, 'dist/client', 'dist'].filter(Boolean).map(resolve);
const root = candidates.find(candidate => existsSync(join(candidate, 'index.html')));
if (!root) throw new Error(`static_root_missing:${candidates.join(',')}`);
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]); }
function sha(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
const files = walk(root).map(path => {
  const rel = relative(root, path).replaceAll('\\', '/');
  const body = readFileSync(path);
  return { route: `/${rel}`, relative_path: rel, bytes: statSync(path).size, sha256: sha(body), content_marker: rel === 'index.html' ? 'svelte_entry' : 'static' };
}).sort((a,b)=>a.route.localeCompare(b.route));
const index = files.find(file => file.relative_path === 'index.html');
if (!index) throw new Error('index_manifest_missing');
const manifest = {
  root,
  build_hash: process.env.SHORT_SHA || null,
  version: process.env.EXPECTED_CANDIDATE_VERSION || 'V8.0.0',
  files,
  spa_routes: ['/', '/privacy', '/terms', '/sources', '/contact'].map(route => ({ route, expected_sha256: index.sha256, expected_bytes: index.bytes }))
};
const output = process.env.STATIC_MANIFEST_PATH || 'test-results/static-manifest.json';
await import('node:fs/promises').then(m => m.mkdir(dirname(resolve(output)), { recursive: true }));
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(root);
