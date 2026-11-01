import { obstacleDistance, lineClear } from '../../combat/WorldQueries';
import type { Vec3 } from '../../config/types';
import type { AttackBehavior, AttackContext, ImpactView, ProjectileView, TestTarget } from '../types';
import { COMBAT } from '../shared/tuning';
import { BARRAGE } from './definition';

interface Projectile extends ProjectileView { direction: Vec3; travelled: number }
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const unit = (v: Vec3): Vec3 => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
const toward = (from: Vec3, to: Vec3): Vec3 => unit({ x: to.x - from.x, y: to.y - from.y, z: to.z - from.z });
const angle = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** Deterministic fixed-step volley. Each shot has one immutable launch direction. */
export function createBarrage(context: AttackContext): AttackBehavior {
  const projectiles: Projectile[] = [], impacts: ImpactView[] = [];
  let shotsFired = 0, locked: string | null = null;
  const select = (origin: Vec3, direction: Vec3): TestTarget | null => {
    const valid = (target: TestTarget): boolean => {
      const center = context.targetCenter(target), delta = toward(origin, center);
      const distance = Math.hypot(center.x - origin.x, center.y - origin.y, center.z - origin.z);
      return target.health > 0 && distance <= BARRAGE.range && angle(direction, delta) <= BARRAGE.assistCone! && lineClear(origin, center, context.boxes);
    };
    const retained = context.targets.find(target => target.id === locked && valid(target));
    if (retained) return retained;
    const candidates = context.targets.filter(valid).sort((a, b) =>
      angle(direction, toward(origin, context.targetCenter(a))) - angle(direction, toward(origin, context.targetCenter(b))));
    locked = candidates[0]?.id ?? null;
    return candidates[0] ?? null;
  };
  const fire = (): void => {
    const origin = { ...context.origin }, aim = { ...context.direction };
    const target = select(origin, aim);
    let direction = aim;
    if (target) {
      const desired = toward(origin, context.targetCenter(target)), error = angle(aim, desired);
      const correction = Math.min(BARRAGE.assistCorrection!, error * 0.65);
      const fraction = error > 1e-6 ? correction / error : 0;
      direction = unit({ x: aim.x * (1 - fraction) + desired.x * fraction, y: aim.y * (1 - fraction) + desired.y * fraction, z: aim.z * (1 - fraction) + desired.z * fraction });
    }
    projectiles.push({ position: origin, direction, travelled: 0, active: true });
    shotsFired++;
  };
  return {
    get projectiles() { return projectiles; }, get impacts() { return impacts; }, get shotsFired() { return shotsFired; },
    onActivate() { projectiles.length = 0; impacts.length = 0; shotsFired = 0; locked = null; },
    afterPhysics(dt) {
      const activeTime = context.abilities.overlap(BARRAGE.id, dt);
      const elapsed = context.abilities.elapsed(BARRAGE.id);
      // Shots occur at 0.0, 0.1, ... 4.9 seconds, independent of frame rate.
      while (activeTime > 0 && shotsFired < BARRAGE.projectileCount! && shotsFired * BARRAGE.projectileInterval! < elapsed + activeTime - 1e-8) fire();
      for (const projectile of projectiles) {
        if (!projectile.active) continue;
        const step = Math.min(BARRAGE.projectileSpeed! * dt, BARRAGE.range - projectile.travelled);
        if (step <= 0) { projectile.active = false; continue; }
        const probeRange = step + 0.12;
        const wall = obstacleDistance(projectile.position, projectile.direction, probeRange, context.boxes);
        const hitWall = wall < probeRange - 1e-6;
        let hit: TestTarget | null = null, hitDistance = Math.min(step, wall);
        for (const target of context.targets) {
          if (target.health <= 0) continue;
          const center = context.targetCenter(target), dx = center.x - projectile.position.x, dy = center.y - projectile.position.y, dz = center.z - projectile.position.z;
          const along = dx * projectile.direction.x + dy * projectile.direction.y + dz * projectile.direction.z;
          if (along < 0 || along > hitDistance) continue;
          const lateral = Math.hypot(dx - along * projectile.direction.x, dy - along * projectile.direction.y, dz - along * projectile.direction.z);
          if (lateral <= COMBAT.targetRadius + 0.12) { hit = target; hitDistance = along; }
        }
        projectile.position = { x: projectile.position.x + projectile.direction.x * hitDistance, y: projectile.position.y + projectile.direction.y * hitDistance, z: projectile.position.z + projectile.direction.z * hitDistance };
        projectile.travelled += hitDistance;
        if (hit) { context.damageTarget(hit, BARRAGE.damage, 'projectile'); projectile.active = false; impacts.push({ position: { ...projectile.position }, age: 0 }); }
        else if (hitWall || projectile.travelled >= BARRAGE.range - 1e-6) { projectile.active = false; impacts.push({ position: { ...projectile.position }, age: 0 }); }
      }
      for (const impact of impacts) impact.age += dt;
      for (let i = impacts.length - 1; i >= 0; i--) if (impacts[i].age > 0.18) impacts.splice(i, 1);
      for (let i = projectiles.length - 1; i >= 0; i--) if (!projectiles[i].active) projectiles.splice(i, 1);
    },
    reset() { projectiles.length = 0; impacts.length = 0; shotsFired = 0; locked = null; },
  };
}
