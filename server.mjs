import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };
createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    const relative = target.slice(root.length + 1).split(sep);
    if (!target.startsWith(root + sep) || relative.some(part => part.startsWith('.')) || !types[extname(target)]) {
      res.writeHead(404).end('Not found'); return;
    }
    const content = await readFile(target);
    res.writeHead(200, { 'Content-Type': types[extname(target)], 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, host, () => console.log(`亲密来信已启动：http://${host}:${port}`));
