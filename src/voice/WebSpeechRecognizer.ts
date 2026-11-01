import type { RecognitionStatus, SpeechOptions, SpeechPort, Transcript } from './types';

interface NativeResult { isFinal: boolean; length: number; [index: number]: { transcript: string; confidence: number } }
interface ResultEvent { resultIndex: number; results: { length: number; [index: number]: NativeResult } }
export interface NativeRecognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  processLocally?: boolean; phrases?: unknown[];
  onstart: (() => void) | null; onend: (() => void) | null;
  onspeechstart: (() => void) | null; onspeechend: (() => void) | null;
  onresult: ((event: ResultEvent) => void) | null; onerror: ((event: { error: string }) => void) | null;
  start(): void; abort(): void;
}
export interface RecognitionConstructor {
  new(): NativeRecognition;
  available?: (options: { langs: string[]; processLocally: boolean }) => Promise<string>;
  install?: (options: { langs: string[] }) => Promise<boolean>;
}
interface SpeechGlobals {
  SpeechRecognition?: RecognitionConstructor;
  webkitSpeechRecognition?: RecognitionConstructor;
  SpeechRecognitionPhrase?: new(phrase: string, boost: number) => unknown;
}
const errorMessages: Record<string, string> = {
  'not-allowed': 'Permiso de micrófono denegado. Revisa el permiso de este sitio y vuelve a activarlo.',
  'service-not-allowed': 'El servicio de reconocimiento no está autorizado en este navegador.',
  'audio-capture': 'No se detectó un micrófono disponible. Comprueba su conexión.',
  'language-not-supported': 'El reconocedor no admite este idioma o falta su paquete local.',
  network: 'El servicio de voz no responde. Comprueba la conexión; el juego sigue funcionando.',
  'no-speech': 'No se detectó voz. Esperando una nueva intervención.',
  'phrases-not-supported': 'El motor no admite el vocabulario sugerido. Desactiva el sesgo de frases o usa otro motor.',
};

/** Adapter only. No audio is recorded by the game; browser ASR may use its own remote service. */
export class WebSpeechRecognizer implements SpeechPort {
  onTranscript: (transcript: Transcript) => void = () => {};
  onSpeechEnd: (at: number) => void = () => {};
  onStatus: (status: RecognitionStatus) => void = () => {};
  private recognition: NativeRecognition | null = null;
  private wanted = false;
  private epoch = 0;
  private session = 0;
  private retries = 0;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private options: SpeechOptions | null = null;

  constructor(private readonly globals: SpeechGlobals = globalThis as unknown as SpeechGlobals, private readonly secure: boolean = globalThis.isSecureContext) {}

  get supported(): boolean { return Boolean(this.globals.SpeechRecognition ?? this.globals.webkitSpeechRecognition); }
  get localSupported(): boolean {
    const Native = this.globals.SpeechRecognition ?? this.globals.webkitSpeechRecognition;
    return Boolean(Native?.available && Native?.install);
  }

  async installLocal(language: string): Promise<boolean> {
    const Native = this.globals.SpeechRecognition ?? this.globals.webkitSpeechRecognition;
    if (!Native?.install) throw new Error('Este navegador no permite instalar reconocimiento local.');
    return Native.install({ langs: [language] });
  }

  async start(options: SpeechOptions): Promise<void> {
    this.stop(); this.options = options; this.wanted = true; this.retries = 0;
    const epoch = this.epoch;
    const Native = this.globals.SpeechRecognition ?? this.globals.webkitSpeechRecognition;
    if (!this.secure || !Native) { this.wanted = false; this.onStatus({ state: 'unsupported', message: !this.secure ? 'La voz requiere localhost o HTTPS.' : 'Reconocimiento de voz no disponible. Usa Chrome o Edge de escritorio.' }); return; }
    if (options.localOnly) {
      if (!Native.available || !('processLocally' in new Native())) { this.wanted = false; this.onStatus({ state: 'error', message: 'Este navegador no ofrece reconocimiento local. Puedes elegir el servicio del navegador tras leer el aviso.' }); return; }
      try {
        const availability = await Native.available({ langs: [options.language], processLocally: true });
        if (epoch !== this.epoch || !this.wanted) return;
        if (availability !== 'available') { this.wanted = false; this.onStatus({ state: 'error', message: `Paquete local ${options.language}: ${availability}. Usa Instalar idioma local si está disponible. No se cambió a procesamiento remoto.` }); return; }
      } catch { this.wanted = false; this.onStatus({ state: 'error', message: 'No se pudo comprobar el paquete de voz local.' }); return; }
    }
    if (this.wanted && epoch === this.epoch) this.begin(epoch);
  }

  private begin(epoch: number): void {
    if (!this.options || !this.wanted || epoch !== this.epoch) return;
    const Native = (this.globals.SpeechRecognition ?? this.globals.webkitSpeechRecognition)!;
    const recognition = new Native(); this.recognition = recognition;
    recognition.lang = this.options.language; recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1;
    if ('processLocally' in recognition) recognition.processLocally = this.options.localOnly;
    const Phrase = this.globals.SpeechRecognitionPhrase;
    if (Phrase && 'phrases' in recognition) {
      try { recognition.phrases = this.options.phrases.slice(0, 80).map(phrase => new Phrase(phrase, 4)); } catch { /* Bias is optional; exact grammar remains authoritative. */ }
    }
    const session = ++this.session;
    let speechStartedAt: number | null = null;
    const segments = new Map<number, { speechStartedAt: number | null; firstInterimAt: number | null }>();
    const current = (): boolean => this.wanted && this.epoch === epoch && this.recognition === recognition;
    recognition.onstart = () => { if (current()) this.onStatus({ state: 'listening', message: this.options?.localOnly ? 'Escuchando · procesamiento local' : 'Escuchando · servicio del navegador' }); };
    recognition.onspeechstart = () => { if (current()) speechStartedAt = performance.now(); };
    recognition.onspeechend = () => { if (current()) this.onSpeechEnd(performance.now()); speechStartedAt = null; };
    recognition.onresult = event => {
      if (!current()) return;
      this.retries = 0;
      for (let index = event.resultIndex; index < event.results.length; index++) {
        const result = event.results[index]; if (!result?.length) continue;
        const now = performance.now();
        const timing = segments.get(index) ?? { speechStartedAt, firstInterimAt: null };
        if (!result.isFinal && timing.firstInterimAt === null) timing.firstInterimAt = now;
        segments.set(index, timing);
        const confidence = result[0].confidence;
        this.onTranscript({ id: `${epoch}:${session}:${index}`, text: result[0].transcript, final: result.isFinal, confidence: Number.isFinite(confidence) && confidence > 0 ? confidence : null, receivedAt: now, ...timing, finalReceivedAt: result.isFinal ? now : null });
      }
    };
    recognition.onerror = event => {
      if (!current() || event.error === 'aborted') return;
      const terminal = ['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported', 'phrases-not-supported'].includes(event.error);
      if (terminal) { this.wanted = false; recognition.abort(); }
      this.onStatus({ state: terminal ? 'error' : 'restarting', message: errorMessages[event.error] ?? `Error de voz: ${event.error}.` });
    };
    recognition.onend = () => { if (current()) this.retry(epoch); };
    this.onStatus({ state: 'starting', message: 'Solicitando micrófono…' });
    try { recognition.start(); } catch { if (current()) this.retry(epoch); }
  }

  private retry(epoch: number): void {
    if (!this.wanted || epoch !== this.epoch) return;
    if (++this.retries > 4) { this.wanted = false; this.onStatus({ state: 'error', message: 'La voz se interrumpió varias veces. Desactiva y vuelve a activar el micrófono para reintentar.' }); return; }
    clearTimeout(this.retryTimer);
    this.onStatus({ state: 'restarting', message: `Reconectando voz (${this.retries}/4)…` });
    this.retryTimer = setTimeout(() => this.begin(epoch), Math.min(4000, 300 * 2 ** (this.retries - 1)));
  }

  stop(): void {
    this.wanted = false; this.epoch++; clearTimeout(this.retryTimer);
    const recognition = this.recognition; this.recognition = null;
    try { recognition?.abort(); } catch { /* Already ended. */ }
    this.onStatus({ state: 'off', message: 'Micrófono detenido.' });
  }
  dispose(): void { this.stop(); this.onTranscript = () => {}; this.onStatus = () => {}; this.onSpeechEnd = () => {}; }
}
