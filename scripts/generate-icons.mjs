// Generate PWA PNG icons from the SVG source using sharp.
// Run: bun run scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/icons/app-icon.svg');
const maskablePath = resolve(root, 'public/icons/app-icon-maskable.svg');
const outDir = resolve(root, 'public/icons');
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);
const maskable = readFileSync(maskablePath);

// (label, size, source)
const targets = [
  // iOS / apple-touch-icon (non-maskable, opaque)
  ['apple-touch-120', 120, svg],
  ['apple-touch-152', 152, svg],
  ['apple-touch-167', 167, svg],
  ['apple-touch-180', 180, svg],
  ['apple-touch-1024', 1024, svg],
  // Android / generic PWA
  ['icon-48', 48, svg],
  ['icon-72', 72, svg],
  ['icon-96', 96, svg],
  ['icon-144', 144, svg],
  ['icon-192', 192, svg],
  ['icon-512', 512, svg],
  // Maskable (Android adaptive)
  ['maskable-192', 192, maskable],
  ['maskable-512', 512, maskable],
];

let ok = 0;
for (const [label, size, src] of targets) {
  const dest = resolve(outDir, `${label}.png`);
  await sharp(src, { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(dest);
  console.log('  ✓', `${label}.png`, `${size}x${size}`);
  ok++;
}
console.log(`\nGenerated ${ok} icons in public/icons/`);
