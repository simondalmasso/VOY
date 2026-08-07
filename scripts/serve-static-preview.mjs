#!/usr/bin/env node
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.env.STATIC_ROOT || 'dist/client');
const port = Number(process.env.VOY_PORT || process.argv[2] || 8787);
if (!existsSync(join(root, 'index.html'))) throw new Error(`static_index_missing:${root}`);
const contentTypes = Object.freeze({
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon'
});
function safeFile(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
  const candidate = resolve(root, normalize(decoded));
  if (!candidate.startsWith(root)) return null;
  return candidate;
}
const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/health') {
    response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ ok: true, service: 'voy-static-preview', version: 'V8.0.0', build_hash: process.env.BUILD_HASH || 'browser', features: { voice: false, auth: false, collective_recommendations: false, core_without_login_voice_ai: true, pwa: true } }));
    return;
  }
  let path = safeFile(url.pathname);
  if (path && existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
  if (!path || !existsSync(path) || !statSync(path).isFile()) path = join(root, 'index.html');
  response.writeHead(200, { 'Content-Type': contentTypes[extname(path)] || 'application/octet-stream', 'Cache-Control': extname(path) === '.html' ? 'no-store' : 'public, max-age=60' });
  createReadStream(path).pipe(response);
});
server.listen(port, '127.0.0.1', () => console.log(`VOY static preview listening on ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
