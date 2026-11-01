import type { AudioOutput } from './AudioOutput';

/** Short procedural cues share the game output bus; they never touch microphone capture. */
export class CombatCueAudio {
  private lastShots = 0;
  private lastImpacts = 0;
  private charging = false;
  private launched = false;
  constructor(private readonly output: AudioOutput) {}

  private tone(frequency: number, duration: number, level: number, type: OscillatorType): void {
    const context = this.output.context, master = this.output.master;
    if (!context || !master) return;
    const oscillator = context.createOscillator(), gain = context.createGain(), now = context.currentTime;
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(45, frequency * 0.55), now + duration);
    gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain); gain.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(now); oscillator.stop(now + duration);
  }

  sync(audible: boolean, shots: number, chargeActive: boolean, chargeElapsed: number, windup: number, impacts: number): void {
    if (!audible) { this.charging = chargeActive; this.launched = chargeActive && chargeElapsed >= windup; this.lastShots = shots; this.lastImpacts = impacts; return; }
    if (shots < this.lastShots) this.lastShots = 0;
    for (let index = this.lastShots; index < shots; index++) this.tone(430 + index % 3 * 40, 0.075, 0.07, 'square');
    this.lastShots = shots;
    if (chargeActive && !this.charging) this.tone(125, 0.3, 0.14, 'sawtooth');
    if (chargeActive && chargeElapsed >= windup && !this.launched) this.tone(75, 0.28, 0.2, 'sawtooth');
    if (impacts < this.lastImpacts) this.lastImpacts = 0;
    if (impacts > this.lastImpacts) {
      this.tone(64, 0.22, 0.19, 'sawtooth');
      this.tone(118, 0.09, 0.09, 'triangle');
    }
    this.lastImpacts = impacts;
    this.charging = chargeActive;
    this.launched = chargeActive && chargeElapsed >= windup;
  }
  reset(): void { this.lastShots = 0; this.lastImpacts = 0; this.charging = false; this.launched = false; }
}
