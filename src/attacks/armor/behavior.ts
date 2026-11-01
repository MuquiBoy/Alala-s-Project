import type { AttackBehavior, AttackContext } from '../types';
import { ARMOR } from './definition';

export function createArmor(context: AttackContext): AttackBehavior {
  return {
    damageMultiplier(types) {
      return context.abilities.active(ARMOR.id) && types.some(type => type === 'projectile' || type === 'thermal')
        ? 1 - ARMOR.damageReduction : 1;
    },
  };
}
