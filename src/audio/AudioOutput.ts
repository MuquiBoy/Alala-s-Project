/** One game output bus; speech capture owns its separate input context. */
export class AudioOutput {
  context?: AudioContext;
  master?: GainNode;
  private volume = 0.35;
  private disposed = false;
  onError: (message: string) => void = () => {};
  unlock(): void {
    if (this.disposed) return;
    try {
      if (!this.context) {
        this.context = new AudioContext(); this.master = this.context.createGain();
        this.master.gain.value = this.volume; this.master.connect(this.context.destination);
      }
      void this.context.resume().catch(() => this.onError('Pulsa Entrar para habilitar el sonido.'));
    } catch { this.onError('El navegador no pudo habilitar el sonido.'); }
  }
  async load(path: string): Promise<AudioBuffer> {
    if (!this.context || this.disposed) throw new Error('Salida sin habilitar.');
    const response = await fetch(import.meta.env.BASE_URL + path);
    if (!response.ok) throw new Error('Audio ' + response.status);
    return this.context.decodeAudioData(await response.arrayBuffer());
  }
  setVolume(value: number): void {
    this.volume = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.35));
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.035);
  }
  dispose(): void { this.disposed = true; void this.context?.close(); }
}
