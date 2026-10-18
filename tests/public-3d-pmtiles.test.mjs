import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join, basename} from 'node:path';
import {createRequestHandler} from '../src/worker.template.js';
import {PMTiles} from 'pmtiles';

const root = new URL('../', import.meta.url);
const readText = path => readFile(new URL(path, root), 'utf8');
const readJson = async path => JSON.parse(await readText(path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const cachePath = name => join(process.cwd(), 'build-assets', 'santa-fe-3d', name);

test('citywide 3D manifest pins four bounded content-addressed PMTiles shards and clear provenance', async () => {
  const manifest = await readJson('public/data/santa-fe-3d/manifest.json');
  const lock = await readJson('public/data/santa-fe-3d/source-lock.json');
  assert.equal(manifest.city_id, 'ar-santa-fe-capital');
  assert.equal(manifest.layer, 'santa_fe_buildings_3d');
  assert.equal(manifest.final_features, 264425);
  assert.equal(manifest.source_dataset_releases['Overture Maps Buildings'], '2026-07-22.0');
  assert.equal(manifest.height_values_are_visual_massing_not_survey_measurements, true);
  assert.equal(manifest.source_licenses.OpenStreetMap, 'ODbL-1.0');
  assert.equal(manifest.source_licenses['Overture Maps Buildings'], 'ODbL-1.0 (contains OpenStreetMap-derived buildings)');
  assert.deepEqual(manifest.source_attributions, ['© OpenStreetMap contributors', '© Overture Maps Foundation']);
  assert.equal(lock.data_license, 'ODbL-1.0');
  assert.equal(lock.distribution.origin, 'https://stracker.simondalmasso44.workers.dev');
  assert.equal(lock.distribution.protocol, 'query-v1');
  assert.equal(manifest.asset_paths.length, 4);
  assert.equal(manifest.asset_bounds.length, 4);
  assert.equal(manifest.asset_min_zoom, 13);
  assert.equal(manifest.asset_max_zoom, 17);
  for (let i = 0; i < manifest.asset_paths.length; i++) {
    const path = manifest.asset_paths[i], sha = manifest.asset_sha256[i], size = manifest.asset_sizes[i];
    const name = basename(path);
    assert.match(name, /^santa-fe-buildings-3d-[a-z-]+\.[a-f0-9]{16}\.pmtiles$/);
    assert.ok(name.includes('.' + sha.slice(0, 16) + '.pmtiles'));
    assert.ok(Number.isSafeInteger(size) && size > 0 && size < 25 * 1024 * 1024);
    assert.match(sha, /^[a-f0-9]{64}$/);
  }
});

test('available citywide PMTiles cache archives match exact SHA-256 and vector-layer schema', async t => {
  const manifest = await readJson('public/data/santa-fe-3d/manifest.json');
  const cacheFiles = await Promise.all(manifest.asset_paths.map(path => stat(cachePath(basename(path))).catch(() => null)));
  if (cacheFiles.some(item => !item)) {
    const fetcher = await readText('scripts/fetch-citywide-3d.mjs');
    assert.match(fetcher, /x-stracker-pmtiles-transport/);
    assert.match(fetcher, /content-range/);
    assert.match(fetcher, /citywide_3d_sha256_mismatch/);
    assert.match(fetcher, /getHeader/);
    assert.match(fetcher, /getMetadata/);
    t.diagnostic('Clean checkout: archive byte-level checks run in the build fetcher after retrieving the locked assets.');
    return;
  }
  for (let i = 0; i < manifest.asset_paths.length; i++) {
    const file = cachePath(basename(manifest.asset_paths[i]));
    const bytes = await readFile(file);
    assert.equal(bytes.length, manifest.asset_sizes[i]);
    assert.equal(sha256(bytes), manifest.asset_sha256[i]);
    class FileSource {
      constructor(url, data) { this.url = url; this.data = data; }
      getKey() { return this.url; }
      async getBytes(offset, length) {
        const part = this.data.subarray(offset, offset + length);
        if (part.length !== length) throw new Error('archive_range_out_of_bounds');
        return { data: part.buffer.slice(part.byteOffset, part.byteOffset + part.byteLength) };
      }
    }
    const archive = new PMTiles(new FileSource('https://voy.test' + manifest.asset_paths[i], bytes));
    const [header, metadata] = await Promise.all([archive.getHeader(), archive.getMetadata()]);
    assert.equal(header.tileType, 1);
    assert.ok(header.minZoom <= 13 && header.maxZoom >= 15);
    assert.ok(header.maxLon > -60.775 && header.minLon < -60.615);
    assert.ok(header.maxLat > -31.74 && header.minLat < -31.535);
    assert.ok(metadata.vector_layers.some(layer => layer.id === manifest.layer));
  }
});

test('PMTiles Worker transport slices verified full static assets into exact bounded ranges and caches each archive', async () => {
  const path = '/data/santa-fe-3d/santa-fe-buildings-3d-north-east.387c3640d8cdc9c7.pmtiles';
  const bytes = Uint8Array.from([80, 77, 84, 105, 108, 101, 115, 3, 1, 2, 3, 4]);
  const digest = createHash('sha256').update(bytes).digest('hex');
  let assetReads = 0;
  let upstreamRangeHeader = null;
  const assets = {
    async fetch(request) {
      assetReads++;
      upstreamRangeHeader = request.headers.get('Range');
      assert.equal(new URL(request.url).pathname, path);
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Length': String(bytes.length),
          'Content-Type': 'application/vnd.pmtiles'
        }
      });
    }
  };
  const handler = createRequestHandler({
    pmtilesAssetRegistry: { [path]: { size: bytes.length, sha256: digest } },
    pmtilesAssetCache: new Map()
  });
  const first = await handler(new Request('https://voy.test' + path + '?pmtilesOffset=2&pmtilesLength=4', {
    headers: { Range: 'bytes=2-5' }
  }), { ASSETS: assets });
  assert.equal(first.status, 206);
  assert.equal(upstreamRangeHeader, null, 'Static Assets receives a full-file GET, not an unsupported Range request');
  assert.equal(first.headers.get('Content-Range'), 'bytes 2-5/12');
  assert.equal(first.headers.get('ETag'), '"' + digest + '"');
  assert.deepEqual([...new Uint8Array(await first.arrayBuffer())], [84, 105, 108, 101]);

  const second = await handler(new Request('https://voy.test' + path + '?pmtilesOffset=0&pmtilesLength=8', {
    headers: { Range: 'bytes=0-7' }
  }), { ASSETS: assets });
  assert.equal(second.status, 206);
  assert.equal(second.headers.get('Content-Range'), 'bytes 0-7/12');
  assert.deepEqual([...new Uint8Array(await second.arrayBuffer())], [80, 77, 84, 105, 108, 101, 115, 3]);
  assert.equal(assetReads, 1, 'same isolate reuses the SHA-256 verified archive for subsequent byte ranges');
});
test('PMTiles Worker transport rejects malformed, mismatched and oversized ranges before reading assets', async () => {
  const handler = createRequestHandler();
  let assetReads = 0;
  const env = { ASSETS: { async fetch() { assetReads++; throw new Error('must not fetch'); } } };
  const base = 'https://voy.test/data/santa-fe-3d/santa-fe-buildings-3d-north-east.387c3640d8cdc9c7.pmtiles';
  const cases = [
    [base + '?pmtilesOffset=-1&pmtilesLength=4', 'bytes=0-3'],
    [base + '?pmtilesOffset=0&pmtilesLength=4194305', 'bytes=0-4194304'],
    [base + '?pmtilesOffset=0&pmtilesLength=4&extra=1', 'bytes=0-3'],
    [base + '?pmtilesOffset=0&pmtilesLength=4', 'bytes=1-4']
  ];
  for (const [url, range] of cases) {
    const response = await handler(new Request(url, { headers: { Range: range } }), env);
    assert.equal(response.status, 400);
  }
  assert.equal(assetReads, 0);
});

test('citywide renderer and builds keep four shards pinned and Overture attribution visible', async () => {
  const [renderer, adapter, windowsBuild, linuxBuild, wrangler, html, fetcher] = await Promise.all([
    readText('public/3d/voy3d.js'),
    readText('public/3d/pmtiles-source.js'),
    readText('scripts/build.ps1'),
    readText('scripts/build.sh'),
    readText('wrangler.jsonc'),
    readText('public/index.html'),
    readText('scripts/fetch-citywide-3d.mjs')
  ]);
  assert.match(renderer, /asset_paths\.length!==4/);
  assert.match(renderer, /asset_sha256\[i\]\.slice\(0,16\)/);
  assert.match(renderer, /source-layer':dataset\.layer/);
  assert.match(renderer, /voy-overture-extrusion-/);
  assert.match(renderer, /overture-osm-2026-07-22/);
  assert.match(adapter, /pmtilesOffset/);
  assert.match(adapter, /pmtilesLength/);
  assert.match(adapter, /status!==206/);
  assert.match(adapter, /bounds:asset\.bounds/);
  assert.doesNotMatch(adapter, /await archive\.getHeader\(\)/);
  assert.match(renderer, /bounds:citySource\.bounds/);
  assert.match(windowsBuild, /fetch-citywide-3d\.mjs/);
  assert.match(windowsBuild, /esbuild/);
  assert.match(linuxBuild, /fetch-citywide-3d\.mjs/);
  assert.match(linuxBuild, /esbuild/);
  assert.match(wrangler, /"\/data\/santa-fe-3d\/\*"/);
  assert.match(html, /Overture Maps Foundation/);
  assert.match(fetcher, /MAX_RANGE = 4 \* 1024 \* 1024/);
});