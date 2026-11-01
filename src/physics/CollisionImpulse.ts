import { MOTION_PHYSICS } from '../config/physics';
import type { Vec3 } from '../config/types';

export interface ImpactSolution {
  normal: Vec3;
  closingSpeed: number;
  impulseKgMs: number;
  attackerDelta: Vec3;
  targetDelta: Vec3;
}

const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;

/** Two-body normal impulse. The arcade transfer coefficient is independent of the mass scale. */
export function solveImpact(attackerKg: number, targetKg: number, attackerVelocity: Vec3, targetVelocity: Vec3, outwardNormal: Vec3): ImpactSolution {
  if (attackerKg <= 0 || targetKg <= 0) throw new Error('Las masas de colisión deben ser positivas.');
  const length = Math.hypot(outwardNormal.x, outwardNormal.y, outwardNormal.z);
  if (length < 1e-8) throw new Error('La normal de colisión no puede ser nula.');
  const normal = { x: outwardNormal.x / length, y: outwardNormal.y / length, z: outwardNormal.z / length };
  const relative = { x: attackerVelocity.x - targetVelocity.x, y: attackerVelocity.y - targetVelocity.y, z: attackerVelocity.z - targetVelocity.z };
  const closingSpeed = Math.max(0, dot(relative, normal));
  const impulseKgMs = closingSpeed < MOTION_PHYSICS.minimumClosingSpeed ? 0 :
    (1 + MOTION_PHYSICS.collisionRestitution) * closingSpeed /
    (1 / attackerKg + 1 / targetKg) * MOTION_PHYSICS.collisionTransfer;
  const attackerDelta = { x: -normal.x * impulseKgMs / attackerKg, y: -normal.y * impulseKgMs / attackerKg, z: -normal.z * impulseKgMs / attackerKg };
  const targetDelta = { x: normal.x * impulseKgMs / targetKg, y: normal.y * impulseKgMs / targetKg, z: normal.z * impulseKgMs / targetKg };
  return { normal, closingSpeed, impulseKgMs, attackerDelta, targetDelta };
}
