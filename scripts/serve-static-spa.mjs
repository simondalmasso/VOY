import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = new URL('../dist/client/', import.meta.url).pathname;
const host = process.env.VOY_STATIC_HOST || '127.0.0.1';
const port = Number(process.env.VOY_STATIC_PORT || 8787);
const types = new Map([
  ['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.css','text/css; charset=utf-8'],['.json','application/json; charset=utf-8'],
  ['.png','image/png'],['.jpg','image/jpeg'],['.jpeg','image/jpeg'],['.svg','image/svg+xml'],['.webp','image/webp'],['.ico','image/x-icon'],['.webmanifest','application/manifest+json']
]);

async function existingFile(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.(\/|\\|$))+/, '').replace(/^\/+/, '');
  const candidate = join(root, clean || 'index.html');
  try { const info = await stat(candidate); return info.isFile() ? candidate : null; } catch { return null; }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${host}:${port}`);
    let file = await existingFile(url.pathname);
    if (!file && req.method === 'GET' && !url.pathname.startsWith('/api/')) file = join(root, 'index.html');
    if (!file) { res.writeHead(404, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'}); res.end('Not found'); return; }
    const body = await readFile(file);
    res.writeHead(200, {'content-type':types.get(extname(file)) || 'application/octet-stream','cache-control':'no-store','x-voy-static-qa':'1'});
    res.end(body);
  } catch (error) {
    res.writeHead(500, {'content-type':'text/plain; charset=utf-8','cache-control':'no-store'});
    res.end(error instanceof Error ? error.message : 'static_server_error');
  }
});
server.listen(port, host, () => console.log(`VOY static QA server http://${host}:${port}`));
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
