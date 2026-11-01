import { readFile, writeFile, mkdir, access, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Vosk-Browser 0.0.8 (Apache-2.0). Keep recognizer code/weights intact; make IndexedDB caching optional.
// The local demo already serves the model from disk. Its duplicate persistent FS cache can fail after extraction.
const original = await readFile('node_modules/vosk-browser/dist/vosk.js', 'utf8');
const marker = "var WorkerFactory = createBase64WorkerFactory('";
const start = original.indexOf(marker) + marker.length;
if (start < marker.length) throw new Error('Formato inesperado del trabajador Vosk. Revisa la versión fijada.');
const end = original.indexOf("'", start);
let worker = Buffer.from(original.slice(start, end), 'base64').toString('utf8');
const patches = ['this.Vosk.syncFilesystem(true)', 'this.Vosk.syncFilesystem(false)'];
for (const patch of patches) {
  if (worker.split(patch).length !== 2) throw new Error(`La adaptación de caché requiere una coincidencia exacta: ${patch}`);
  worker = worker.replace(patch, 'Promise.resolve() /* ALALAS: local asset, in-memory FS; no persistent duplicate cache */');
}
const result = '// ALALAS adaptation: only disable optional persistent-model cache. Upstream copyrights and license retained.\n' + original.slice(0, start) + Buffer.from(worker).toString('base64') + original.slice(end);
await mkdir('public/vendor/vosk', { recursive: true });
await writeFile('public/vendor/vosk/vosk.js', result);
await writeFile('public/vendor/vosk/manifest.json', JSON.stringify({ upstream: 'ccoreilly/vosk-browser', version: '0.0.8', license: 'Apache-2.0', modification: 'Disable the two IndexedDB filesystem synchronizations; model stays in Worker RAM for the session.', originalSha256: createHash('sha256').update(original).digest('hex'), adaptedSha256: createHash('sha256').update(result).digest('hex'), acousticWeightsModified: false }, null, 2) + '\n');
console.log('Runtime Vosk local preparado (caché en memoria, sin duplicación persistente).');
const model = 'public/models/speech/vosk-es/model.tar.gz';
try { await access(model); } catch {
  try { await access('dist/models/speech/vosk-es/model.tar.gz'); await mkdir('public/models/speech/vosk-es', { recursive: true }); await copyFile('dist/models/speech/vosk-es/model.tar.gz', model); console.log('Modelo restaurado desde la distribución compilada.'); }
  catch { throw new Error('Falta el modelo español. Ejecuta pnpm model:prepare (Python 3) antes de compilar o desarrollar.'); }
}
