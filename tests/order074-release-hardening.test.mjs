import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const read=async p=>readFile(new URL('../'+p,import.meta.url),'utf8');
const json=async p=>JSON.parse(await read(p));

test('ORDER074 lazy 3D graph is release-bound by the existing BUILD_ID',async()=>{
  const [app,renderer,build]=await Promise.all([read('public/app.js'),read('public/3d/voy3d.js'),read('scripts/build.ps1')]);
  assert.match(app,/CLIENT_BUILD_ID='__BUILD_ID__'/);
  assert.match(app,/import\('\.\/3d\/voy3d\.js\?v=__BUILD_ID__'\)/);
  assert.match(app,/mod\.BUILD_ID!==CLIENT_BUILD_ID/);
  assert.match(renderer,/export const BUILD_ID='__BUILD_ID__'/);
  assert.match(renderer,/three\.module\.js\?v=__BUILD_ID__/);
  assert.match(renderer,/temporal\.js\?v=__BUILD_ID__/);
  assert.match(renderer,/topology\/manifest\.json/);
  assert.match(renderer,/searchParams\.set\('v',BUILD_ID\)/);
  assert.match(build,/dist\\client\\3d/);
  assert.match(build,/three\.core\.js\?v=/);
});

test('ORDER074 failed module import is retryable without page reload',async()=>{
  const app=await read('public/app.js');
  assert.match(app,/catch\(error\)\{[\s\S]*state\.threeModulePromise=null;[\s\S]*activate2D/);
});

test('ORDER074 renderer has exception-safe cleanup and post-activation context-loss fallback',async()=>{
  const renderer=await read('public/3d/voy3d.js');
  assert.match(renderer,/function cleanup\(/);
  assert.match(renderer,/webglcontextlost/);
  assert.match(renderer,/event\.preventDefault\(\)/);
  assert.match(renderer,/onFallback\?\.\('webgl_context_lost'\)/);
  assert.match(renderer,/catch\(error\)\{[\s\S]*cleanup\([\s\S]*fallbackTo2D/);
});

test('ORDER074 exposes selected-route and per-render draw evidence without debug framework',async()=>{
  const renderer=await read('public/3d/voy3d.js');
  assert.match(renderer,/canvas\.dataset\.routeActive/);
  assert.match(renderer,/renderer\.info\.render\.calls/);
  assert.match(renderer,/canvas\.dataset\.renderCalls/);
  assert.match(renderer,/canvas\.dataset\.renderTriangles/);
  assert.match(renderer,/canvas\.dataset\.quality/);
});

test('ORDER074 shipped Three is covered by production dependency audit',async()=>{
  const [pkg,lock]=await Promise.all([json('package.json'),json('package-lock.json')]);
  assert.equal(pkg.dependencies?.three,'0.186.0');
  assert.equal(pkg.devDependencies?.three,undefined);
  assert.equal(lock.packages?.['']?.dependencies?.three,'0.186.0');
  assert.equal(lock.packages?.['node_modules/three']?.dev,undefined);
  assert.equal(lock.packages?.['node_modules/three']?.version,'0.186.0');
});
