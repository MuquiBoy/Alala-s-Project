import type { AttackBehavior, AttackContext } from '../types';
import { CHARGE_DASH as attack } from './definition';
export function createChargeDash(context: AttackContext): AttackBehavior {
  let direction = { x: 0, z: -1 };
  return {
    onActivate() { direction = { x: -Math.sin(context.yaw), z: -Math.cos(context.yaw) }; },
    prepare(dt) {
      const time = context.abilities.overlap(attack.id, dt), distance = attack.distance / attack.duration * time;
      return time > 0 ? { planarDisplacement: { x: direction.x * distance, z: direction.z * distance } } : {};
    },
    reset() { direction = { x: 0, z: -1 }; },
  };
}

