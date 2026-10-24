import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root = path.resolve(import.meta.dirname, '..');
const dir = path.join(root, 'public', 'transit', 'markers');
for (const name of ['bus-top', 'train-top']) {
  const svg = await readFile(path.join(dir, `${name}.svg`));
  await sharp(svg, { density: 384 }).resize({ width: 48, height: 96, fit: 'fill' }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(path.join(dir, `${name}.png`));
}
console.log('Generated transparent 48x96 PNG markers from 96x192 SVG sources.');
