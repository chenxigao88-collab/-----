import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = fileURLToPath(new URL('../dist/', import.meta.url));
const port = Number(process.env.ASH_PORT || 4173);
const url = `http://127.0.0.1:${port}/`;
function openBrowser() {
  if (!process.argv.includes('--open')) return;
  if (process.platform === 'win32') spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, detached: true, stdio: 'ignore' }).unref();
  else console.log('Open the address above in your browser.');
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
if (!existsSync(resolve(root, 'index.html'))) { console.error('Missing build. Run npm run build first.'); process.exit(1); }
const server = createServer(async (req, res) => {
  try {
    const relative = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
    const file = resolve(root, relative);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); res.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.ok && (await response.text()).includes('<title>灰烬回廊 · Ash Corridor</title>')) {
        console.log(`Ash Corridor is already running: ${url}`); openBrowser(); return;
      }
    } catch { /* Another service owns the port. */ }
  }
  console.error(`Cannot start port ${port}: ${error.message}. Close the previous server or set ASH_PORT.`); process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Ash Corridor is ready: ${url}\nKeep this window open. Ctrl+C stops the local server.`);
  openBrowser();
});
