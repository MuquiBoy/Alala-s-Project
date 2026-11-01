import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, sep, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

// Dependency-free launcher for the compiled static site. Bind only to this machine.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const port = Number(process.env.ALALAS_PORT ?? 4178);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('ALALAS_PORT debe estar entre 1024 y 65535.');
const origin = `http://127.0.0.1:${port}`;
const project = createHash('sha256').update(root).digest('hex').slice(0, 12);
const mime = { '.wav': 'audio/wav', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.json': 'application/json', '.obj': 'text/plain; charset=utf-8', '.mtl': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json' };

async function openBrowser() {
  if (!process.argv.includes('--open')) return;
  const command = process.platform === 'win32' ? ['rundll32.exe', ['url.dll,FileProtocolHandler', origin]] : process.platform === 'darwin' ? ['open', [origin]] : ['xdg-open', [origin]];
  const child = spawn(command[0], command[1], { detached: true, stdio: 'ignore', windowsHide: true });
  child.on('error', () => console.log(`Abre ${origin} en Chrome o Edge.`)); child.unref();
}

try { await stat(resolve(root, 'index.html')); } catch {
  console.error('Falta dist/index.html. Instala las dependencias y ejecuta pnpm build.'); process.exit(1);
}

const server = createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
  try {
    const url = new URL(request.url ?? '/', origin);
    if (url.pathname === '/__alalas/status') {
      response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ name: 'alalas-children', project, version: '0.5.2' })); return;
    }
    const path = decodeURIComponent(url.pathname);
    if (path.includes('\0') || path.includes('\\')) { response.writeHead(400); response.end(); return; }
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    const local = relative(root, file);
    if (local.startsWith('..' + sep) || local === '..' || local.split(sep).some(segment => segment.startsWith('.'))) { response.writeHead(403); response.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { response.writeHead(404); response.end('Archivo no encontrado.'); return; }
    const data = await readFile(file);
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'Content-Length': data.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Archivo no encontrado.'); }
});

server.on('error', async error => {
  if (error.code === 'EADDRINUSE') {
    try {
      const response = await fetch(origin + '/__alalas/status', { signal: AbortSignal.timeout(1500) });
      const running = await response.json();
      if (running.name === 'alalas-children' && running.project === project) { await openBrowser(); process.exit(0); }
    } catch { /* A different program owns the port. Leave it untouched. */ }
    console.error(`El puerto ${port} está ocupado. Define ALALAS_PORT con otro valor y vuelve a abrir.`);
  } else console.error(error.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', async () => { console.log(`ALALA'S CHILDREN · ${origin}\nServidor local. Ctrl+C para cerrar.`); await openBrowser(); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
