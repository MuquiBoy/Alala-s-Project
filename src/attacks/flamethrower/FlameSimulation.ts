import type { StaticBox, Vec3 } from '../../config/types';
import { obstacleDistance } from '../../combat/WorldQueries';
import { FLAMETHROWER } from './definition';
import { COMBAT } from '../shared/tuning';
export const FLAME_VISUAL = Object.freeze({ capacity: 128, rate: 210, ignition: 0.2, lifetime: 0.34, speed: 32 });
export interface FlameParticle { position: Vec3; velocity: Vec3; birth: Vec3; age: number; life: number; size: number; alpha: number; seed: number }
/** Fixed-size pool, world-space motion. Presentation only: no damage or cooldown writes. */
export class FlameSimulation {
  readonly particles: FlameParticle[] = Array.from({ length: FLAME_VISUAL.capacity }, () => ({ position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 }, birth: { x: 0, y: 0, z: 0 }, age: 1, life: 0, size: 0, alpha: 0, seed: 0 }));
  private cursor = 0;
  private carry = 0;
  private seed = 712;
  get count(): number { return this.particles.reduce((total, particle) => total + Number(particle.alpha > 0), 0); }
  private random(): number { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  reset(): void { for (const p of this.particles) { p.alpha = 0; p.age = p.life; } this.carry = 0; this.cursor = 0; }
  step(dt: number, emitting: boolean, elapsed: number, origin: Vec3, direction: Vec3, boxes: readonly StaticBox[]): void {
    if (dt <= 0) return;
    // Substeps keep wall clipping and emissions stable under a slow render frame.
    const steps = Math.max(1, Math.ceil(dt * 120)), step = dt / steps;
    for (let i = 0; i < steps; i++) this.integrate(step, emitting, Math.max(0, elapsed - dt + (i + 1) * step), origin, direction, boxes);
  }
  private integrate(dt: number, emitting: boolean, elapsed: number, origin: Vec3, direction: Vec3, boxes: readonly StaticBox[]): void {
    for (const p of this.particles) {
      if (p.age >= p.life) continue;
      p.age += dt;
      const fraction = p.age / p.life;
      p.size = 0.065 + Math.min(1, fraction) * 0.23;
      const speed = Math.hypot(p.velocity.x, p.velocity.y, p.velocity.z);
      const move = { x: p.velocity.x / speed, y: p.velocity.y / speed, z: p.velocity.z / speed };
      const distance = speed * dt;
      if (p.age >= p.life || obstacleDistance(p.position, move, distance + p.size * 2, boxes) < distance + p.size * 2) { p.age = p.life; p.alpha = 0; continue; }
      p.position.x += p.velocity.x * dt; p.position.y += p.velocity.y * dt; p.position.z += p.velocity.z * dt;
      const fromBirth = Math.hypot(p.position.x - p.birth.x, p.position.y - p.birth.y, p.position.z - p.birth.z);
      const fromEmitter = Math.hypot(p.position.x - origin.x, p.position.y - origin.y, p.position.z - origin.z);
      if (Math.max(fromBirth, fromEmitter) + p.size * 2 >= FLAMETHROWER.range) { p.age = p.life; p.alpha = 0; continue; }
      p.alpha = Math.min(1, fraction * 18) * Math.min(1, (1 - fraction) * 5) * 0.88;
    }
    if (!emitting) { this.carry = 0; return; }
    this.carry += dt * FLAME_VISUAL.rate * Math.min(1, 0.3 + elapsed / FLAME_VISUAL.ignition);
    while (this.carry >= 1) {
      this.carry--;
      const p = this.particles[this.cursor++ % this.particles.length];
      const spread = Math.tan(COMBAT.flameHalfAngle), angle = this.random() * Math.PI * 2, radial = Math.sqrt(this.random()) * spread;
      const right = { x: direction.z, y: 0, z: -direction.x }, length = Math.hypot(right.x, right.z);
      if (length < 0.01) { right.x = 1; right.z = 0; } else { right.x /= length; right.z /= length; }
      const up = { x: right.z * direction.y, y: right.x * direction.z - right.z * direction.x, z: -right.x * direction.y };
      const dx = direction.x + radial * (right.x * Math.cos(angle) + up.x * Math.sin(angle));
      const dy = direction.y + radial * up.y * Math.sin(angle);
      const dz = direction.z + radial * (right.z * Math.cos(angle) + up.z * Math.sin(angle));
      const norm = Math.hypot(dx, dy, dz), speed = FLAME_VISUAL.speed * (0.94 + this.random() * 0.12);
      p.position.x = p.birth.x = origin.x; p.position.y = p.birth.y = origin.y; p.position.z = p.birth.z = origin.z;
      p.velocity.x = dx / norm * speed; p.velocity.y = dy / norm * speed; p.velocity.z = dz / norm * speed;
      p.age = 0; p.life = FLAME_VISUAL.lifetime * (0.94 + this.random() * 0.06); p.seed = this.random(); p.size = 0.065; p.alpha = 0.3;
      if (obstacleDistance(origin, { x: dx / norm, y: dy / norm, z: dz / norm }, p.size, boxes) < p.size) { p.life = 0; p.alpha = 0; }
    }
  }
}
