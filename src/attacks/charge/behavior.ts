import { lineClear } from '../../combat/WorldQueries';
import { MOTION_PHYSICS } from '../../config/physics';
import type { Vec3 } from '../../config/types';
import type { AttackBehavior, AttackContext, TestTarget } from '../types';
import { CHARGE } from './definition';

const unit = (v: Vec3): Vec3 => { const n = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / n, y: v.y / n, z: v.z / n }; };
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const angle = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** One charged ability: late camera aim decides ground dash or gravity-driven leap. */
export function createCharge(context: AttackContext): AttackBehavior {
  let launched = false, travelled = 0, momentumScale = 1, direction: Vec3 = { x: 0, y: 0, z: -1 };
  let locked: string | null = null;
  const struck = new Set<string>();
  const targetDirection = (target: TestTarget): Vec3 => {
    const center = context.targetCenter(target), origin = context.origin;
    return unit({ x: center.x - origin.x, y: center.y - origin.y, z: center.z - origin.z });
  };
  const launch = (): number => {
    launched = true; direction = unit(context.direction);
    const target = context.targets.filter(target => {
      const center = context.targetCenter(target), distance = Math.hypot(center.x - context.origin.x, center.y - context.origin.y, center.z - context.origin.z);
      return target.health > 0 && distance <= CHARGE.distance && angle(direction, targetDirection(target)) <= CHARGE.assistCone! && lineClear(context.origin, center, context.boxes);
    }).sort((a, b) => angle(direction, targetDirection(a)) - angle(direction, targetDirection(b)))[0];
    if (target) {
      locked = target.id;
      const toward = targetDirection(target), error = angle(direction, toward), part = error > 1e-6 ? Math.min(CHARGE.assistCorrection!, error * 0.6) / error : 0;
      direction = unit({ x: direction.x * (1 - part) + toward.x * part, y: direction.y * (1 - part) + toward.y * part, z: direction.z * (1 - part) + toward.z * part });
    }
    return direction.y > 0.2 ? Math.min(9, 3 + direction.y * 9) : 0;
  };
  return {
    onActivate() { launched = false; travelled = 0; momentumScale = 1; locked = null; struck.clear(); },
    prepare(dt) {
      if (!context.abilities.active(CHARGE.id)) return {};
      const elapsed = context.abilities.elapsed(CHARGE.id);
      if (elapsed + dt <= CHARGE.windup! + 1e-8) return { speedMultiplier: CHARGE.speedMultiplier };
      let verticalImpulse: number | undefined;
      if (!launched) verticalImpulse = launch() || undefined;
      const impulseTime = Math.max(0, Math.min(dt, elapsed + dt - CHARGE.windup!));
      const step = Math.min(CHARGE.distance - travelled, CHARGE.distance / (CHARGE.duration - CHARGE.windup!) * impulseTime * momentumScale);
      travelled += step;
      // Nearby actors can nudge the existing path at a slow bounded rate; never pull an escape backward.
      const nearby = context.targets.find(target => {
        if (target.health <= 0 || (locked !== null && target.id !== locked)) return false;
        const center = context.targetCenter(target), delta = { x: center.x - context.feet.x, y: 0, z: center.z - context.feet.z };
        const distance = Math.hypot(delta.x, delta.z), ahead = delta.x * direction.x + delta.z * direction.z;
        return distance < 2.2 && ahead > 0 && ahead / Math.max(0.01, distance) > Math.cos(8 * Math.PI / 180) && lineClear(context.origin, center, context.boxes);
      });
      if (nearby) {
        const toward = targetDirection(nearby), side = direction.x * toward.z - direction.z * toward.x;
        const correction = Math.sign(side) * Math.min(3 * Math.PI / 180 * dt, Math.abs(Math.atan2(side, direction.x * toward.x + direction.z * toward.z)));
        const cos = Math.cos(correction), sin = Math.sin(correction), x = direction.x * cos - direction.z * sin, z = direction.x * sin + direction.z * cos;
        direction = unit({ x, y: direction.y, z });
      }
      return { speedMultiplier: 0, planarDisplacement: { x: direction.x * step, z: direction.z * step }, verticalImpulse };
    },
    afterPhysics() {
      if (!launched || !context.abilities.active(CHARGE.id)) return;
      for (const contact of context.motor?.contacts ?? []) {
        const target = context.targets.find(candidate => candidate.motor.collider.handle === contact.colliderHandle);
        if (!target || target.health <= 0 || struck.has(target.id)) continue;
        const center = context.targetCenter(target), fromPlayer = { x: center.x - context.feet.x, y: center.y - (context.feet.y + 1.25), z: center.z - context.feet.z };
        let normal = contact.normal;
        if (dot(normal, fromPlayer) < 0) normal = { x: -normal.x, y: -normal.y, z: -normal.z };
        // A rising body can turn a side collision into a bounded upward launch.
        // The contact still supplies the horizontal direction; an evasive dash stays horizontal.
        const rising = direction.y > 0.2 && (context.motor?.requestedVelocity.y ?? 0) > 0.5;
        const impactDirection = rising
          ? unit({ x: normal.x, y: Math.max(normal.y, direction.y * MOTION_PHYSICS.ascendingContactLift), z: normal.z })
          : normal;
        const impact = context.impactTarget(target, impactDirection);
        if (impact.impulseKgMs <= 0) continue;
        struck.add(target.id);
        context.damageTarget(target, CHARGE.damage, 'melee');
        momentumScale = Math.max(0.3, momentumScale * (1 - impact.impulseKgMs / (context.motor!.massKg * Math.max(impact.closingSpeed, 0.01))));
      }
    },
    reset() { launched = false; travelled = 0; momentumScale = 1; locked = null; struck.clear(); },
  };
}
