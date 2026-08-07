#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const policyPath = resolve('config/production-assets.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const currentRuntimeData = new Set(policy.public_source_allowlist.current_runtime_data);
const requiredStaticAssets = new Set(policy.public_source_allowlist.required_static_assets);
const allowedPublic = new Set([...currentRuntimeData, ...requiredStaticAssets]);
const generatedPatterns = policy.generated_build_patterns.map(pattern => new RegExp(pattern));
const retiredPaths = new Set(policy.retired_public_paths.map(path => path.replace(/^\//, '')));
const retiredPrefixes = policy.retired_public_prefixes.map(path => path.replace(/^\//, ''));

const candidates = [process.env.STATIC_ROOT, 'dist/client', 'dist']
  .filter(Boolean)
  .map(candidate => resolve(candidate));
const root = candidates.find(candidate => existsSync(join(candidate, 'index.html')));
if (!root) throw new Error(`static_root_missing:${candidates.join(',')}`);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return basename(path).startsWith('.') ? [] : [path];
  });
}
function sha(buffer) { return createHash('sha256').update(buffer).digest('hex'); }
function classification(rel) {
  if (currentRuntimeData.has(rel)) return 'current_runtime_data';
  if (requiredStaticAssets.has(rel)) return 'required_static_asset';
  if (generatedPatterns.some(pattern => pattern.test(rel))) return 'generated_build_asset';
  return null;
}
function retired(rel) { return retiredPaths.has(rel) || retiredPrefixes.some(prefix => rel.startsWith(prefix)); }

const paths = walk(root);
const relativePaths = paths.map(path => relative(root, path).replaceAll('\\', '/'));
const missingPublic = [...allowedPublic].filter(path => !relativePaths.includes(path)).sort();
const unclassified = relativePaths.filter(path => !classification(path)).sort();
const retiredFiles = relativePaths.filter(retired).sort();
if (missingPublic.length || unclassified.length || retiredFiles.length) {
  throw new Error(JSON.stringify({ error: 'static_manifest_policy_violation', missing_public: missingPublic, unclassified, retired: retiredFiles }));
}

const files = paths.map(path => {
  const rel = relative(root, path).replaceAll('\\', '/');
  const body = readFileSync(path);
  return {
    route: `/${rel}`,
    relative_path: rel,
    classification: classification(rel),
    bytes: statSync(path).size,
    sha256: sha(body),
    content_marker: rel === 'index.html' ? 'svelte_entry' : 'static'
  };
}).sort((a, b) => a.route.localeCompare(b.route));
const index = files.find(file => file.relative_path === 'index.html');
if (!index) throw new Error('index_manifest_missing');
const manifest = {
  root,
  policy: 'config/production-assets.json',
  build_hash: process.env.SHORT_SHA || null,
  version: process.env.EXPECTED_CANDIDATE_VERSION || 'V8.0.0',
  classification_counts: files.reduce((counts, file) => ({ ...counts, [file.classification]: (counts[file.classification] || 0) + 1 }), {}),
  files,
  retired_routes: policy.retired_public_paths,
  spa_routes: ['/', '/privacy', '/terms', '/sources', '/contact'].map(route => ({ route, expected_sha256: index.sha256, expected_bytes: index.bytes }))
};
const output = process.env.STATIC_MANIFEST_PATH || 'test-results/static-manifest.json';
await import('node:fs/promises').then(module => module.mkdir(dirname(resolve(output)), { recursive: true }));
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(root);
