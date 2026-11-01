import { lineClear } from '../../combat/WorldQueries';
import type { Vec3 } from '../../config/types';
import type { AttackBehavior, AttackContext } from '../types';
import { COMBAT } from '../shared/tuning';
import { THERMAL_PULSE as attack } from './definition';
export function createThermalPulse(context: AttackContext): AttackBehavior {
  const hits = new Set<string>();
  let origin: Vec3 = { ...context.feet };
  return {
    get effectOrigin() { return origin; },
    onActivate() { hits.clear(); origin = { ...context.feet }; },
    reset() { hits.clear(); origin = { ...context.feet }; },
    afterPhysics(dt) {
      if (!context.abilities.active(attack.id)) return;
      const radius = Math.min(1, (context.abilities.elapsed(attack.id) + dt) / attack.duration) * attack.range;
      const source = { ...origin, y: origin.y + 0.65 };
      for (const target of context.targets) {
        const center = context.targetCenter(target), dx = center.x - source.x, dz = center.z - source.z, distance = Math.hypot(dx, dz);
        if (target.health <= 0 || hits.has(target.id) || distance > radius + COMBAT.targetRadius || !lineClear(source, center, context.boxes)) continue;
        hits.add(target.id); context.damageTarget(target, attack.damage, 'thermal');
        const speed = attack.distance / COMBAT.knockbackDuration;
        context.impulseTarget(target, { x: dx / Math.max(distance, 0.01) * target.massKg * speed, y: 0, z: dz / Math.max(distance, 0.01) * target.massKg * speed });
      }
    },
  };
}

