#!/usr/bin/env node
import { createGzip } from 'node:zlib';
import { createReadStream, existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { createHash } from 'node:crypto';

const rootCandidates = [resolve('dist'), resolve('dist/client')];
const root = rootCandidates.find(candidate => existsSync(join(candidate, 'index.html')));
if (!root) throw new Error('vite_client_output_missing');
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]); }
async function gzipSize(path) { let size = 0; await pipeline(createReadStream(path), createGzip({ level: 9 }), new Writable({ write(chunk, _encoding, callback) { size += chunk.length; callback(); } })); return size; }
const files = [];
for (const path of walk(root)) {
  const rel = relative(root, path).replaceAll('\\', '/');
  const bytes = statSync(path).size;
  const gzip = /\.(js|css|html|json|svg)$/.test(rel) ? await gzipSize(path) : bytes;
  files.push({ path: rel, bytes, gzip, sha256: createHash('sha256').update(await import('node:fs/promises').then(m => m.readFile(path))).digest('hex') });
}
const js = files.filter(file => file.path.endsWith('.js'));
const css = files.filter(file => file.path.endsWith('.css'));
const map = js.filter(file => /maplibre/i.test(file.path));
const voice = js.filter(file => /voice/i.test(file.path));
const critical = js.filter(file => !/maplibre|voice|auth/i.test(file.path));
const result = {
  root,
  dependency_count: Object.keys(JSON.parse(await import('node:fs/promises').then(m => m.readFile('package.json', 'utf8'))).dependencies || {}).length + Object.keys(JSON.parse(await import('node:fs/promises').then(m => m.readFile('package.json', 'utf8'))).devDependencies || {}).length,
  production_dependency_count: Object.keys(JSON.parse(await import('node:fs/promises').then(m => m.readFile('package.json', 'utf8'))).dependencies || {}).length,
  lockfile_digest: existsSync('bun.lock') ? createHash('sha256').update(await import('node:fs/promises').then(m => m.readFile('bun.lock'))).digest('hex') : null,
  build_output_size: files.reduce((sum, file) => sum + file.bytes, 0),
  critical_js_gzip: critical.reduce((sum, file) => sum + file.gzip, 0),
  initial_css_gzip: css.reduce((sum, file) => sum + file.gzip, 0),
  lazy_map_chunk_gzip: map.reduce((sum, file) => sum + file.gzip, 0),
  lazy_voice_chunk_gzip: voice.reduce((sum, file) => sum + file.gzip, 0),
  files
};
if (result.critical_js_gzip > 100 * 1024) throw new Error(`critical_js_budget_exceeded:${result.critical_js_gzip}`);
if (result.initial_css_gzip > 25 * 1024) throw new Error(`css_budget_exceeded:${result.initial_css_gzip}`);
if (map.length < 1) throw new Error('maplibre_lazy_chunk_missing');
if (voice.length < 1) throw new Error('voice_lazy_chunk_missing');
const output = process.env.VOY_METRICS_PATH || 'test-results/build-metrics.json';
await import('node:fs/promises').then(m => m.mkdir(resolve(output, '..'), { recursive: true }));
writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ result: 'PASS', ...result, files: undefined }, null, 2));
