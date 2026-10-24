import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename, rm, stat } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { PMTiles } from 'pmtiles';

const ROOT = resolve(import.meta.dirname, '..');
const MANIFEST_PATH = join(ROOT, 'public/data/santa-fe-3d/manifest.json');
const LOCK_PATH = join(ROOT, 'public/data/santa-fe-3d/source-lock.json');
const CACHE_DIR = join(ROOT, 'build-assets/santa-fe-3d');
const MAX_RANGE = 4 * 1024 * 1024;
const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const lock = JSON.parse(await readFile(LOCK_PATH, 'utf8'));
const origin = lock.distribution?.origin;
const fallbackOrigin = lock.distribution?.fallback_origin;
if (origin !== 'https://stracker.simondalmasso44.workers.dev' ||
    fallbackOrigin !== 'https://voy-app.simondalmasso44.workers.dev' ||
    lock.distribution?.protocol !== 'query-v1') {
  throw new Error('citywide_3d_distribution_lock_invalid');
}
if (manifest.city_id !== 'ar-santa-fe-capital' || manifest.layer !== 'santa_fe_buildings_3d' ||
    manifest.final_features !== 264425 || manifest.asset_paths?.length !== 4 ||
    manifest.asset_sizes?.length !== 4 || manifest.asset_sha256?.length !== 4 || manifest.asset_bounds?.length !== 4 ||
    manifest.asset_min_zoom !== 13 || manifest.asset_max_zoom !== 17) {
  throw new Error('citywide_3d_manifest_invalid');
}
await mkdir(CACHE_DIR, { recursive: true });

function validArchiveName(urlPath, sha) {
  const name = basename(urlPath);
  return /^santa-fe-buildings-3d-[a-z-]+\.[a-f0-9]{16}\.pmtiles$/.test(name) &&
    name.includes('.' + sha.slice(0, 16) + '.pmtiles');
}
async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function requestRange(assetPath, offset, length, totalSize) {
  const end = offset + length - 1;
  const candidates = [
    { origin, kind: 'stracker' },
    { origin: fallbackOrigin, kind: 'voy' },
  ];
  const failures = [];
  for (const candidate of candidates) {
    const url = new URL(assetPath, candidate.origin);
    url.searchParams.set('pmtilesOffset', String(offset));
    url.searchParams.set('pmtilesLength', String(length));
    let response;
    try {
      response = await fetch(url, {
        headers: { Accept: 'application/vnd.pmtiles, application/octet-stream', Range: 'bytes=' + offset + '-' + end },
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      failures.push(candidate.kind + '_network_error');
      continue;
    }
    if (response.status !== 206) {
      failures.push(candidate.kind + '_http_' + response.status);
      await response.body?.cancel().catch(() => {});
      continue;
    }
    if (candidate.kind === 'stracker' && response.headers.get('x-stracker-pmtiles-transport') !== 'query-v1') {
      throw new Error('citywide_3d_transport_header_missing');
    }
    if (candidate.kind === 'voy' && response.headers.get('content-type')?.split(';')[0].trim() !== 'application/vnd.pmtiles') {
      throw new Error('citywide_3d_fallback_content_type_invalid');
    }
    const contentRange = response.headers.get('content-range') || '';
    const match = /^bytes ([0-9]+)-([0-9]+)\/([0-9]+)$/.exec(contentRange);
    if (!match || Number(match[1]) !== offset || Number(match[2]) !== end || Number(match[3]) !== totalSize) {
      throw new Error('citywide_3d_content_range_invalid');
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== length) throw new Error('citywide_3d_range_length_invalid');
    return bytes;
  }
  throw new Error('citywide_3d_range_sources_unavailable:' + failures.join(','));
}
async function downloadArchive(path, size, sha, file) {
  const temp = file + '.part';
  await rm(temp, { force: true });
  const handle = await open(temp, 'w');
  try {
    for (let offset = 0; offset < size; offset += MAX_RANGE) {
      const length = Math.min(MAX_RANGE, size - offset);
      const bytes = await requestRange(path, offset, length, size);
      const { bytesWritten } = await handle.write(bytes, 0, bytes.length, offset);
      if (bytesWritten !== bytes.length) throw new Error('citywide_3d_file_write_incomplete');
      process.stdout.write('\r' + basename(file) + ' ' + Math.min(offset + length, size) + '/' + size);
    }
    process.stdout.write('\n');
    await handle.sync();
  } catch (error) {
    await handle.close();
    await rm(temp, { force: true });
    throw error;
  }
  await handle.close();
  if ((await stat(temp)).size !== size || (await hashFile(temp)) !== sha) {
    await rm(temp, { force: true });
    throw new Error('citywide_3d_sha256_mismatch');
  }
  await rename(temp, file);
}
class FileRangeSource {
  constructor(url, file) { this.url = url; this.file = file; }
  getKey() { return this.url; }
  async getBytes(offset, length) {
    const handle = await open(this.file, 'r');
    try {
      const data = Buffer.alloc(length);
      const { bytesRead } = await handle.read(data, 0, length, offset);
      if (bytesRead !== length) throw new Error('citywide_3d_archive_range_invalid');
      return { data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) };
    } finally { await handle.close(); }
  }
}
for (let i = 0; i < manifest.asset_paths.length; i++) {
  const path = manifest.asset_paths[i], size = manifest.asset_sizes[i], sha = manifest.asset_sha256[i];
  if (!Number.isSafeInteger(size) || size <= 0 || size >= 25 * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(sha) || !validArchiveName(path, sha)) throw new Error('citywide_3d_asset_lock_invalid');
  const file = join(CACHE_DIR, basename(path));
  const currentStat = await stat(file).catch(() => null);
  const currentHash = currentStat?.size === size ? await hashFile(file) : '';
  if (currentStat?.size !== size || currentHash !== sha) await downloadArchive(path, size, sha, file);
  else console.log(basename(file) + ' cache SHA-256 verified');
  const archive = new PMTiles(new FileRangeSource('https://voy.test' + path, file));
  const [header, metadata] = await Promise.all([archive.getHeader(), archive.getMetadata()]);
  const layers = Array.isArray(metadata.vector_layers) ? metadata.vector_layers.map(layer => layer.id) : [];
  const actualBounds = [header.minLon, header.minLat, header.maxLon, header.maxLat];
  const expectedBounds = manifest.asset_bounds[i];
  if (header.tileType !== 1 || !layers.includes(manifest.layer) ||
      header.minZoom !== manifest.asset_min_zoom || header.maxZoom !== manifest.asset_max_zoom ||
      !Array.isArray(expectedBounds) || expectedBounds.length !== 4 ||
      actualBounds.some((value, index) => Math.abs(value - expectedBounds[index]) > 1e-6) ||
      header.maxLon <= -60.775 || header.minLon >= -60.615 ||
      header.maxLat <= -31.74 || header.minLat >= -31.535) {
    throw new Error('citywide_3d_archive_schema_or_bounds_invalid:' + basename(file));
  }
  console.log(basename(file) + ' verified; zoom ' + header.minZoom + '-' + header.maxZoom + '; ' + layers.join(','));
}