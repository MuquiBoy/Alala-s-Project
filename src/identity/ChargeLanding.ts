export interface LandingImpact { dropMetres: number; intensity: number }

/** Tracks a charge leap until the first real ground contact, even after the ability ends. */
export class ChargeLanding {
  time = 0;
  lastAt = -Infinity;
  lastImpact: LandingImpact | null = null;
  private armed = false;
  private peakY = 0;
  private wasAirborne = false;

  advance(dt: number, feetY: number, grounded: boolean, chargePropelling: boolean): LandingImpact | null {
    this.time += dt;
    if (chargePropelling && !grounded && !this.armed) {
      this.armed = true;
      this.peakY = feetY;
    }
    if (this.armed) this.peakY = Math.max(this.peakY, feetY);
    let impact: LandingImpact | null = null;
    if (this.armed && grounded && this.wasAirborne) {
      const dropMetres = Math.max(0, this.peakY - feetY);
      if (dropMetres >= 1) {
        impact = { dropMetres, intensity: Math.min(1.35, Math.max(0.75, dropMetres / 3)) };
        this.lastAt = this.time;
        this.lastImpact = impact;
      }
      this.armed = false;
    }
    this.wasAirborne = !grounded;
    return impact;
  }

  reset(): void {
    this.time = 0;
    this.lastAt = -Infinity;
    this.lastImpact = null;
    this.armed = false;
    this.peakY = 0;
    this.wasAirborne = false;
  }
}
