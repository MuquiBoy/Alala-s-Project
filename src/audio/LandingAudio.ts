import type { AudioOutput } from './AudioOutput';

/** One authored impact sample, independent of the microphone input graph. */
export class LandingAudio {
  private buffer?: AudioBuffer;
  private loading?: Promise<void>;
  private readonly playing = new Map<AudioBufferSourceNode, GainNode>();
  private disposed = false;
  onError: (message: string) => void = () => {};

  constructor(private readonly output: AudioOutput, private readonly path: string) {}

  prepare(): void {
    if (this.disposed || !this.output.context) return;
    this.loading ??= this.output.load(this.path)
      .then(buffer => { if (!this.disposed) this.buffer = buffer; })
      .catch(() => { this.loading = undefined; this.onError('No se cargó el impacto de Embestida. La partida sigue disponible.'); });
  }

  play(intensity: number): void {
    const context = this.output.context, master = this.output.master;
    if (this.disposed || !context || !master || !this.buffer || context.state !== 'running' || this.playing.size >= 2) return;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = this.buffer;
    source.playbackRate.value = Math.max(0.88, Math.min(1.04, 1.04 - intensity * 0.06));
    gain.gain.value = Math.max(0.55, Math.min(1.1, intensity * 0.85));
    source.connect(gain); gain.connect(master); this.playing.set(source, gain);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.playing.delete(source); };
    source.start();
  }

  silence(): void {
    const context = this.output.context; if (!context) return;
    for (const [source, gain] of this.playing) {
      gain.gain.cancelAndHoldAtTime(context.currentTime);
      gain.gain.linearRampToValueAtTime(0, context.currentTime + 0.05);
      source.stop(context.currentTime + 0.06);
    }
  }

  dispose(): void { this.disposed = true; this.silence(); }
}
