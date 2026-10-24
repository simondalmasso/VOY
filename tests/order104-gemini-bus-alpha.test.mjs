import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { inflateSync } from 'node:zlib';

const read = path => readFileSync(new URL(path, import.meta.url));
function decodePng(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137,80,78,71,13,10,26,10]);
  let offset = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9]; interlace = data[12];
    } else if (type === 'IDAT') idat.push(data);
    offset += length + 12;
    if (type === 'IEND') break;
  }
  return { width, height, bitDepth, colorType, interlace, idat: Buffer.concat(idat) };
}
function decodeRgba(buffer) {
  const png = decodePng(buffer);
  assert.equal(png.colorType, 6, 'sprite must use RGBA PNG, not a checkerboard baked into RGB');
  assert.equal(png.bitDepth, 8);
  assert.equal(png.interlace, 0);
  const bpp = 4, stride = png.width * bpp;
  const raw = inflateSync(png.idat);
  const rows = [];
  let offset = 0, previous = Buffer.alloc(stride);
  const paeth = (a,b,c) => {
    const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y=0; y<png.height; y++) {
    const filter = raw[offset++], source = raw.subarray(offset, offset + stride); offset += stride;
    const row = Buffer.alloc(stride);
    for (let i=0; i<stride; i++) {
      const left = i >= bpp ? row[i-bpp] : 0, up = previous[i], upperLeft = i >= bpp ? previous[i-bpp] : 0;
      const predictor = filter===0 ? 0 : filter===1 ? left : filter===2 ? up : filter===3 ? Math.floor((left+up)/2) : paeth(left,up,upperLeft);
      row[i] = (source[i] + predictor) & 255;
    }
    rows.push(row); previous = row;
  }
  return { ...png, rgba: Buffer.concat(rows) };
}

test('Gemini/Firefly bus source is preserved and the shipped sprite has real alpha', () => {
  const source = read('../artifacts-live/source-assets/gemini-bus-source-746791.png');
  assert.equal(createHash('sha256').update(source).digest('hex'), 'd5fdf5a9984842d667b997a7dcd1ead6f2913d0d40e03adc16ba7074d6d38609');
  const original = decodePng(source);
  assert.deepEqual([original.width, original.height, original.colorType], [1376,768,2],
    'the recovered original has RGB only; the derived production sprite must carry the transparency');
  const sprite = decodeRgba(read('../public/transit/markers/bus-top.png'));
  assert.deepEqual([sprite.width, sprite.height], [34,102]);
  let transparent = 0, opaque = 0, partial = 0;
  for (let i=3; i<sprite.rgba.length; i+=4) {
    const alpha = sprite.rgba[i];
    if (alpha===0) transparent++;
    else if (alpha===255) opaque++;
    else partial++;
  }
  assert.ok(transparent > 100, 'background must be genuinely transparent');
  assert.ok(opaque > 100, 'bus body must remain visible');
  assert.ok(partial > 0, 'anti-aliased edges should retain partial alpha');
});

test('the Gemini bus sprite is used in 2D and 3D and rotates with measured GPS bearing', async () => {
  const [css, renderer] = [
    read('../public/styles.css').toString('utf8'),
    read('../public/3d/voy3d.js').toString('utf8')
  ];
  assert.match(css, /background-image:url\('\/transit\/markers\/bus-top\.png\?v=__BUILD_ID__'\)/);
  assert.match(css, /\.tracker-marker\.is-gps-bus::before\{[^}]*transform:rotate\(var\(--gps-bearing,0deg\)\)/);
  assert.match(renderer, /loadVehicleSprite\(map,'voy-bus-3d','\/transit\/markers\/bus-top\.png'\)/);
  assert.match(renderer, /'icon-rotate':\['get','bearing'\]/);
  assert.doesNotMatch(renderer, /bus-side\.png/, 'the rejected GLM bus sprite must not be loaded');
});
