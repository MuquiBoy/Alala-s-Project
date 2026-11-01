import type { Vec3 } from './types';

export type TrainingPattern = 'static' | 'lateral' | 'patrol' | 'jumper';
export interface TrainingEnemySpec {
  id: string;
  color: string;
  kind: 'magenta' | 'green';
  pattern: TrainingPattern;
  massKg: number;
  health: number;
  spawn: Vec3;
}

/** Marker centres from the supplied 1000 px map. The 50 m arena uses 20 px per metre. */
export const TRAINING_ENEMIES: readonly TrainingEnemySpec[] = Object.freeze([
  { id: 'M01', kind: 'magenta', pattern: 'static', color: '#ff00ff', massKg: 100, health: 100, spawn: { x: -17, y: 0.08, z: -16 } },
  { id: 'M02', kind: 'magenta', pattern: 'lateral', color: '#ff00ff', massKg: 100, health: 100, spawn: { x: 15, y: 0.08, z: -16 } },
  { id: 'M03', kind: 'magenta', pattern: 'patrol', color: '#ff00ff', massKg: 100, health: 100, spawn: { x: -6, y: 0.08, z: -10 } },
  { id: 'M04', kind: 'magenta', pattern: 'lateral', color: '#ff00ff', massKg: 100, health: 100, spawn: { x: 6, y: 0.08, z: -10 } },
  { id: 'G01', kind: 'green', pattern: 'jumper', color: '#00ff0f', massKg: 100, health: 100, spawn: { x: -17, y: 0.08, z: 16 } },
]);

export const TRAINING = Object.freeze({
  aggroSeconds: 8,
  shotsPerBurst: 3,
  shotInterval: 0.6,
  burstCooldown: 3,
  projectileRange: 15,
  projectileSpeed: 8,
  projectileDamage: 8,
  projectileRadius: 0.14,
  maxProjectileCount: 64,
  lateralSpeed: 1.4,
  patrolSpeed: 1.1,
  jumpInterval: 2.2,
  jumpSpeed: 6.2,
  recoverySpeed: 0.7,
} as const);
