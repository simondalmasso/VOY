import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

test('ORDER082 allows the PMTiles protocol through both document and Worker CSPs', async () => {
  const headers = await readFile(new URL('public/_headers', root), 'utf8');
  const worker = await readFile(new URL('src/worker.template.js', root), 'utf8');
  const pageCsp = headers.match(/Content-Security-Policy:\s*([^\r\n]+)/i)?.[1] ?? '';
  const workerCsp = worker.match(/"Content-Security-Policy":\s*"([^"]+)"/)?.[1] ?? '';
  assert.match(pageCsp, /connect-src[^;]*\bpmtiles:/, 'static document CSP must permit PMTiles protocol');
  assert.match(workerCsp, /connect-src[^;]*\bpmtiles:/, 'Worker CSP must permit PMTiles protocol');
  assert.match(pageCsp, /connect-src[^;]*https:\/\/tile\.openstreetmap\.org/);
  assert.match(workerCsp, /connect-src[^;]*https:\/\/tile\.openstreetmap\.org/);
});
