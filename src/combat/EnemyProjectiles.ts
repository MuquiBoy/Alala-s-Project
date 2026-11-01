import { TRAINING } from '../config/training';
import type { StaticBox, Vec3 } from '../config/types';
import { obstacleDistance } from './WorldQueries';

export interface EnemyProjectile { ownerId: string; targetId: string; position: Vec3; direction: Vec3; travelled: number; active: boolean }
export interface EnemyProjectileImpact { position: Vec3; age: number }
const unit = (value: Vec3): Vec3 => { const length = Math.hypot(value.x, value.y, value.z) || 1; return { x: value.x / length, y: value.y / length, z: value.z / length }; };

/** Projectile paths are fixed at emission. Segment casts make impact independent of frame rate. */
export class EnemyProjectiles {
  readonly active: EnemyProjectile[] = [];
  readonly impacts: EnemyProjectileImpact[] = [];

  fire(ownerId: string, targetId: string, origin: Vec3, target: Vec3): void {
    if (this.active.length >= TRAINING.maxProjectileCount) return;
    const direction = unit({ x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z });
    this.active.push({ ownerId, targetId, position: { x: origin.x + direction.x * 0.6, y: origin.y + direction.y * 0.6, z: origin.z + direction.z * 0.6 }, direction, travelled: 0, active: true });
  }

  update(dt: number, boxes: readonly StaticBox[], playerBox: StaticBox, onPlayerHit: (projectile: EnemyProjectile) => void): void {
    for (const shot of this.active) {
      const step = Math.min(TRAINING.projectileSpeed * dt, TRAINING.projectileRange - shot.travelled);
      if (step <= 0) { shot.active = false; continue; }
      const extent = step + TRAINING.projectileRadius;
      const wall = obstacleDistance(shot.position, shot.direction, extent, boxes);
      const player = obstacleDistance(shot.position, shot.direction, extent, [playerBox]);
      const hitWall = wall < extent - 1e-6;
      const hitPlayer = player < extent - 1e-6 && (!hitWall || player < wall);
      const distance = Math.min(step, hitPlayer ? player : hitWall ? wall : step);
      shot.position = { x: shot.position.x + shot.direction.x * distance, y: shot.position.y + shot.direction.y * distance, z: shot.position.z + shot.direction.z * distance };
      shot.travelled += distance;
      if (hitPlayer) { shot.active = false; onPlayerHit(shot); }
      else if (hitWall || shot.travelled >= TRAINING.projectileRange - 1e-6) shot.active = false;
      if (!shot.active) this.impacts.push({ position: { ...shot.position }, age: 0 });
    }
    for (let index = this.active.length - 1; index >= 0; index--) if (!this.active[index].active) this.active.splice(index, 1);
    for (const impact of this.impacts) impact.age += dt;
    for (let index = this.impacts.length - 1; index >= 0; index--) if (this.impacts[index].age > 0.22) this.impacts.splice(index, 1);
  }

  reset(): void { this.active.length = 0; this.impacts.length = 0; }
}
