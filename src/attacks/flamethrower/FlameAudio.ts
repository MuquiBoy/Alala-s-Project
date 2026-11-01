import type { AudioOutput } from '../../audio/AudioOutput';
/** Sound output is independent of recognition input. No microphone references or capture switches. */
export class FlameAudio {
  private context?: AudioContext;
  private buffers?: AudioBuffer[];
  private loading?: Promise<void>;
  private readonly playing = new Map<AudioBufferSourceNode, GainNode>();
  private active = false;
  private wasEmitting = false;
  private disposed = false;
  onError: (message: string) => void = () => {};

  constructor(private readonly output: AudioOutput) {}
  /** Prepare after the output bus is unlocked by Enter; never creates a second game context. */
  prepare(): void {
    if (this.disposed) return;
    try {
      this.context = this.output.context;
      if (!this.context) return;
      this.loading ??= this.load().catch(() => { this.loading = undefined; this.onError('No se pudo cargar el sonido; el combate sigue disponible.'); });
    } catch { this.onError('El navegador no pudo habilitar el sonido.'); }
  }
  private async load(): Promise<void> {
    const buffers = await Promise.all(['ignite', 'sustain', 'extinguish'].map(name => this.output.load('audio/flamethrower/' + name + '.wav')));
    if (!this.disposed) { this.buffers = buffers; if (this.active) this.begin(false); }
  }
  /** Driven by accepted gameplay state, so duplicate transcripts cannot start extra loops. */
  sync(active: boolean, audible: boolean): void {
    const next = active && audible;
    const ignition = active && !this.wasEmitting; this.wasEmitting = active;
    if (next === this.active || this.disposed) return;
    this.active = next;
    if (next) this.begin(ignition); else this.finish(audible);
  }
  private play(index: number, loop: boolean, level: number, fadeIn: number): void {
    if (!this.context || !this.output.master || !this.buffers) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain(), now = this.context.currentTime;
    source.buffer = this.buffers[index]; source.loop = loop;
    gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(level, now + fadeIn);
    source.connect(gain); gain.connect(this.output.master); this.playing.set(source, gain);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.playing.delete(source); };
    source.start();
  }
  private begin(ignition: boolean): void {
    if (!this.buffers) return;
    if (ignition) this.play(0, false, 0.8, 0.012);
    this.play(1, true, 0.60, 0.20);
  }
  private finish(outro: boolean): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const [source, gain] of this.playing) {
      gain.gain.cancelAndHoldAtTime(now); gain.gain.linearRampToValueAtTime(0, now + 0.28); source.stop(now + 0.30);
    }
    if (outro) this.play(2, false, 0.6, 0.012);
  }
  reset(): void { this.active = false; this.wasEmitting = false; this.finish(false); }
  dispose(): void { this.reset(); this.disposed = true; }
}
