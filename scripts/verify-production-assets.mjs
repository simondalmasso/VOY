#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const policyPath = resolve('config/production-assets.json');
const policy = JSON.parse(readFileSync(policyPath, 'utf8'));
const allowedPublic = new Set([
  ...policy.public_source_allowlist.current_runtime_data,
  ...policy.public_source_allowlist.required_static_assets
]);
const generatedPatterns = policy.generated_build_patterns.map(pattern => new RegExp(pattern));
const retiredPaths = new Set(policy.retired_public_paths.map(path => path.replace(/^\//, '')));
const retiredPrefixes = policy.retired_public_prefixes.map(path => path.replace(/^\//, ''));
const textExtensions = new Set(['.css', '.html', '.js', '.json', '.svg', '.txt', '.webmanifest', '.xml']);

function walk(root) {
  if (!existsSync(root)) return [];
  const visit = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? visit(absolute) : [relative(root, absolute).replaceAll('\\', '/')];
  });
  return visit(root).sort();
}

function difference(left, right) {
  return [...left].filter(value => !right.has(value)).sort();
}

function isRetired(path) {
  return retiredPaths.has(path) || retiredPrefixes.some(prefix => path.startsWith(prefix));
}

function scanMarkers(root, files) {
  const findings = [];
  for (const file of files) {
    if (!textExtensions.has(extname(file).toLowerCase())) continue;
    const body = readFileSync(join(root, file), 'utf8');
    for (const marker of policy.forbidden_public_markers) {
      if (body.includes(marker)) findings.push({ file, marker });
    }
  }
  return findings;
}

function verifySource() {
  const root = resolve('public');
  const files = walk(root);
  const actual = new Set(files);
  const missing = difference(allowedPublic, actual);
  const unclassified = difference(actual, allowedPublic);
  const retired = files.filter(isRetired);
  const forbiddenMarkers = scanMarkers(root, files);
  if (missing.length || unclassified.length || retired.length || forbiddenMarkers.length) {
    throw new Error(JSON.stringify({ result: 'PUBLIC_ASSET_POLICY_FAIL', missing, unclassified, retired, forbidden_markers: forbiddenMarkers }));
  }
  return { root, file_count: files.length, current_runtime_data: policy.public_source_allowlist.current_runtime_data.length, required_static_assets: policy.public_source_allowlist.required_static_assets.length };
}

function verifyBuild() {
  const root = resolve(process.env.STATIC_ROOT || 'dist/client');
  if (!existsSync(root)) throw new Error(`production_build_missing:${root}`);
  const files = walk(root);
  const actual = new Set(files);
  const missingPublic = difference(allowedPublic, actual);
  const unclassified = files.filter(file => !allowedPublic.has(file) && !generatedPatterns.some(pattern => pattern.test(file)));
  const retired = files.filter(isRetired);
  const forbiddenMarkers = scanMarkers(root, files);
  const generated = files.filter(file => !allowedPublic.has(file));
  const hasIndex = generated.includes('index.html');
  const hasJs = generated.some(file => /^assets\/.+\.js$/.test(file));
  const hasCss = generated.some(file => /^assets\/.+\.css$/.test(file));
  if (missingPublic.length || unclassified.length || retired.length || forbiddenMarkers.length || !hasIndex || !hasJs || !hasCss) {
    throw new Error(JSON.stringify({ result: 'BUILD_ASSET_POLICY_FAIL', missing_public: missingPublic, unclassified, retired, forbidden_markers: forbiddenMarkers, has_index: hasIndex, has_js: hasJs, has_css: hasCss }));
  }
  return { root, file_count: files.length, public_file_count: allowedPublic.size, generated_file_count: generated.length };
}

const mode = process.argv[2] || '--all';
const result = { result: 'PRODUCTION_ASSET_POLICY_PASS', policy: 'config/production-assets.json' };
if (mode !== '--build-only') result.source = verifySource();
if (mode !== '--source-only') result.build = verifyBuild();
console.log(JSON.stringify(result, null, 2));
