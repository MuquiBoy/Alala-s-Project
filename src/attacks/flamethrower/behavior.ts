import { inFlameVolume, lineClear } from '../../combat/WorldQueries';
import type { AttackBehavior, AttackContext } from '../types';
import { COMBAT } from '../shared/tuning';
import { FLAMETHROWER as attack } from './definition';
/** Analytic damage volume independent of particles and audio. */
export function createFlamethrower(context: AttackContext): AttackBehavior {
  return { afterPhysics(dt) {
    const time = context.abilities.overlap(attack.id, dt);
    if (time <= 0) return;
    const origin = context.origin, direction = context.direction;
    context.heat.expose(origin, direction, attack.range, COMBAT.flameHalfAngle, context.boxes);
    for (const target of context.targets) {
      const center = context.targetCenter(target);
      if (target.health > 0 && inFlameVolume(origin, direction, center, target.radius ?? COMBAT.targetRadius, attack.range, COMBAT.flameHalfAngle) && lineClear(origin, center, context.boxes)) context.damageTarget(target, attack.damage * time, 'thermal');
    }
  } };
}

