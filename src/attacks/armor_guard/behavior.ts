import type { AttackBehavior, AttackContext } from '../types';
import { ARMOR_GUARD as attack } from './definition';
export function createArmorGuard(context: AttackContext): AttackBehavior {
  return {
    prepare: () => ({ speedMultiplier: context.abilities.active(attack.id) ? attack.speedMultiplier : 1 }),
    damageMultiplier: () => context.abilities.active(attack.id) ? 1 - attack.damageReduction : 1,
  };
}

