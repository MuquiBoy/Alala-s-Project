import type { Model, KaldiRecognizer } from 'vosk-browser';
import type { RecognitionStatus, SpeechOptions, SpeechPort, Transcript } from './types';
import { loadVoskRuntime } from './loadVoskRuntime';

const counterexamples = [
  'no uses lanzallamas', 'no uses coraza', 'no uses embestida', 'no uses pulso',
  'no quiero usar lanzallamas', 'puedo usar lanzallamas', 'estoy probando si reconoce lanzallamas',
  'el ataque se llama lanzallamas', 'usar', 'ataca con', 'no ataques',
  'creo que las llamas son bonitas', 'quizas deberia activar el escudo', 'como funciona la embestida',
  'no', 'nunca', 'jamas', 'ni', 'sin', 'tampoco', 'evita', 'cancela', 'quizas', 'quiza', 'deberia', 'podria', 'creo', 'como', 'cuando', 'donde', 'si', 'puedes', 'puedo', 'funciona', 'por favor', '[unk]',
];

/** Local pretrained Spanish acoustic model + configurable command/negative grammar. Inference lives in Vosk's Worker. */
export class VoskRecognizer implements SpeechPort {
  onTranscript: (transcript: Transcript) => void = () => {};
  onSpeechEnd: (at: number) => void = () => {};
  onStatus: (status: RecognitionStatus) => void = () => {};
  private model: Model | null = null;
  private loading: Promise<Model> | null = null;
  private recognizer: KaldiRecognizer | null = null;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private capture: AudioWorkletNode | null = null;
  private epoch = 0;
  private disposed = false;

  private async loadModel(): Promise<Model> {
    if (this.model?.ready) return this.model;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const { Model } = await loadVoskRuntime();
      if (this.disposed) throw new Error('Reconocedor cerrado.');
      const model = new Model(new URL(import.meta.env.BASE_URL + 'models/speech/vosk-es/model.tar.gz', location.href).href, new URL(location.href).searchParams.has('voice-debug') ? 1 : -1);
      this.model = model;
      return new Promise<Model>((resolve, reject) => {
        const timer = setTimeout(() => { model.terminate(); this.model = null; reject(new Error('El modelo local tardó demasiado en cargar.')); }, 60000);
        model.on('load', event => { clearTimeout(timer); if ('result' in event && event.result) resolve(model); else reject(new Error('No se pudo abrir el modelo español local.')); });
        model.on('error', () => { clearTimeout(timer); reject(new Error('Falló el motor local Vosk.')); });
      });
    })();
    try { return await this.loading; } finally { this.loading = null; }
  }

  async start(options: SpeechOptions): Promise<void> {
    this.stop(); const epoch = this.epoch;
    if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia || !globalThis.AudioWorkletNode) { this.onStatus({ state: 'unsupported', message: 'El motor local requiere Chrome/Edge, localhost o HTTPS, micrófono y AudioWorklet.' }); return; }
    this.onStatus({ state: 'starting', message: 'Cargando modelo español local (~39 MB). La primera carga puede tardar…' });
    try {
      const model = await this.loadModel(); if (epoch !== this.epoch || this.disposed) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      if (epoch !== this.epoch || this.disposed) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      const context = new AudioContext({ sampleRate: 16000, latencyHint: 'interactive' }); this.context = context;
      await context.audioWorklet.addModule(import.meta.env.BASE_URL + 'audio/capture.worklet.js');
      if (epoch !== this.epoch || this.disposed) return;
      // Include negative vocabulary and [unk]; a commands-only graph could coerce conversation into attacks.
      const grammar = JSON.stringify([...new Set([...options.phrases, ...counterexamples])]);
      const recognizer = new model.KaldiRecognizer(context.sampleRate, grammar); this.recognizer = recognizer; recognizer.setWords(true);
      recognizer.on('error', () => { if (epoch === this.epoch) { this.stop(); this.onStatus({ state: 'error', message: 'El motor de voz local se interrumpió. Vuelve a activarlo; la partida sigue disponible.' }); } });
      let segment = 0, speechStartedAt: number | null = null, firstInterimAt: number | null = null, silentSamples = 0, voiced = false;
      let noiseFloor = 0.001;
      const preRoll: Float32Array[] = [];
      const send = (text: string, final: boolean, confidence: number | null): void => {
        if (epoch !== this.epoch || !text.trim()) return;
        const now = performance.now(); if (!final && firstInterimAt === null) firstInterimAt = now;
        this.onTranscript({ id: `vosk:${epoch}:${segment}`, text, final, confidence, receivedAt: now, speechStartedAt, firstInterimAt, finalReceivedAt: final ? now : null });
      };
      recognizer.on('partialresult', event => { if (event.event === 'partialresult') send(event.result.partial, false, null); });
      recognizer.on('result', event => {
        if (epoch !== this.epoch || event.event !== 'result') return;
        const words = event.result.result ?? [];
        const confidence = words.length ? words.reduce((sum, word) => sum + word.conf, 0) / words.length : null;
        send(event.result.text, true, confidence); segment++; firstInterimAt = null; speechStartedAt = null;
      });
      const capture = new AudioWorkletNode(context, 'alalas-capture'); this.capture = capture;
      capture.port.onmessage = (event: MessageEvent<{ pcm: Float32Array; rms: number }>) => {
        if (epoch !== this.epoch) return;
        const now = performance.now(), { pcm, rms } = event.data;
        const threshold = Math.max(0.008, noiseFloor * 3);
        if (!voiced && rms < threshold) {
          noiseFloor = noiseFloor * 0.97 + Math.min(rms, 0.01) * 0.03;
          preRoll.push(pcm); if (preRoll.length > 3) preRoll.shift();
          return; // Don't spend the ASR worker on endless idle silence.
        }
        if (!voiced) { voiced = true; speechStartedAt = now; silentSamples = 0; for (const packet of preRoll) recognizer.acceptWaveformFloat(packet, context.sampleRate); preRoll.length = 0; }
        recognizer.acceptWaveformFloat(pcm, context.sampleRate);
        silentSamples = rms >= threshold ? 0 : silentSamples + pcm.length;
        // 320 ms of actual captured samples, independent of rendering and message-delivery delays.
        if (silentSamples >= context.sampleRate * 0.32) { voiced = false; silentSamples = 0; this.onSpeechEnd(now); recognizer.retrieveFinalResult(); }
      };
      const source = context.createMediaStreamSource(stream); this.source = source;
      source.connect(capture); capture.connect(context.destination); // Worklet output is silence.
      await context.resume();
      if (epoch !== this.epoch) return;
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (epoch === this.epoch) { this.stop(); this.onStatus({ state: 'error', message: 'El micrófono se desconectó. Vuelve a activarlo.' }); } }));
      this.onStatus({ state: 'listening', message: 'Escuchando · Vosk español local · audio en este equipo' });
    } catch (error) {
      if (epoch !== this.epoch) return;
      this.stop(); this.onStatus({ state: 'error', message: error instanceof Error ? error.message : 'No se pudo iniciar el reconocimiento local.' });
    }
  }

  stop(): void {
    this.epoch++;
    if (this.capture) { this.capture.port.onmessage = null; this.capture.disconnect(); this.capture = null; }
    this.source?.disconnect(); this.source = null;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    this.recognizer?.remove(); this.recognizer = null;
    if (this.context) { void this.context.close(); this.context = null; }
    this.onStatus({ state: 'off', message: 'Micrófono detenido. El modelo local queda listo para reanudar.' });
  }

  dispose(): void { this.disposed = true; this.stop(); this.model?.terminate(); this.model = null; }
}
