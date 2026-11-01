import type { Model } from 'vosk-browser';

interface Runtime { Model: typeof Model }
let loading: Promise<Runtime> | null = null;
/** Load the pinned local UMD distribution, prepared reproducibly from the Apache-licensed package. */
export function loadVoskRuntime(): Promise<Runtime> {
  const loaded = (globalThis as unknown as { Vosk?: Runtime }).Vosk;
  if (loaded) return Promise.resolve(loaded);
  loading ??= new Promise<Runtime>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = import.meta.env.BASE_URL + 'vendor/vosk/vosk.js';
    script.onload = () => {
      const runtime = (globalThis as unknown as { Vosk?: Runtime }).Vosk;
      if (runtime) resolve(runtime); else { loading = null; reject(new Error('El runtime Vosk local no exportó su modelo.')); }
    };
    script.onerror = () => { loading = null; reject(new Error('No se pudo cargar vendor/vosk/vosk.js. Ejecuta pnpm build.')); };
    document.head.append(script);
  });
  return loading;
}
