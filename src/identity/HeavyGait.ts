import type { Vec3 } from '../config/types';
/** Contact cadence comes from actual grounded travel, never a keyboard timer. */
export class HeavyGait {
  phase = 0;
  time = 0;
  lastImpact = -100;
  stepIndex = 0;
  private previous?: Vec3;
  private distance = 0;
  constructor(readonly stride: number) {}
  advance(dt: number, position: Vec3, grounded: boolean, walking: boolean): number | null {
    this.time += dt;
    const travelled = this.previous ? Math.hypot(position.x-this.previous.x,position.z-this.previous.z) : 0;
    this.previous = { ...position };
    // Teleports, dash and airborne motion cannot manufacture footsteps.
    if (!grounded || !walking || travelled > 0.3) { this.distance = 0; return null; }
    this.phase += travelled / this.stride;
    this.distance += travelled;
    const threshold = this.stepIndex === 0 ? Math.min(0.38,this.stride) : this.stride;
    if (this.distance < threshold || this.time-this.lastImpact < 0.3) return null;
    this.distance %= threshold; this.lastImpact = this.time;
    return this.stepIndex++;
  }
  reset(): void { this.previous=undefined; this.distance=0; this.phase=0; this.stepIndex=0; this.lastImpact=-100; this.time=0; }
}
