/** Simulation is 60 Hz. Clamp tab-resume gaps so returning never teleports a creature. */
export class FixedStep {
  private accumulator = 0;
  readonly step = 1 / 60;
  readonly maxFrame = 0.1;

  advance(frameSeconds: number, simulate: (dt: number) => void): number {
    this.accumulator += Math.max(0, Math.min(this.maxFrame, frameSeconds));
    while (this.accumulator + Number.EPSILON >= this.step) {
      simulate(this.step);
      this.accumulator -= this.step;
    }
    return Math.max(0, this.accumulator / this.step);
  }

  reset(): void { this.accumulator = 0; }
}
