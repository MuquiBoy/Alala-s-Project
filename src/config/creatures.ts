import type { CreatureDefinition } from './types';

/** Phase 1 deliberately exposes a single neutral placeholder, not a definitive character. */
export const AVATAR_01: CreatureDefinition = {
  id: 'avatar-01',
  name: 'Avatar 01',
  model: { kind: 'procedural', color: '#c4d995', accent: '#eb9c78' },
  collision: { radius: 0.42, height: 1.3 },
  movement: { speed: 4, acceleration: 16, deceleration: 22, turnSpeed: 10 },
  massKg: 50,
  health: 100,
  abilities: [],
  camera: { offset: { x: 0, y: 1.02, z: -0.26 }, fov: 78, minPitch: -1.4, maxPitch: 1.4, sensitivity: 0.002 },
  emitters: { primary: { x: 0, y: 0.85, z: -0.65 } },
};

/** The one playable Avatar 01 now uses the requested mechanical test moveset. */
export const THERMAL_TANK: CreatureDefinition = {
  ...AVATAR_01,
  name: 'Avatar 01',
  model: { kind: 'procedural', style: 'tank', color: '#889e91', accent: '#ed9a62', size: { x: 3, y: 2.5, z: 3 } },
  collision: { radius: 1.5, height: 2.5, width: 3, depth: 3 },
  movement: { speed: 2.8, acceleration: 9, deceleration: 14, turnSpeed: 7 },
  massKg: 500,
  health: 180,
  abilities: ['flamethrower', 'barrage', 'armor', 'charge'],
  identity: { kind: 'heavy', stride: 2.2, soundBase: 'audio/creatures/avatar-01', footstepGain: 0.65, bodySettle: 0.022, cameraImpact: 0.006 },
  camera: { ...AVATAR_01.camera, offset: { x: 0, y: 2.02, z: -0.4 } },
  emitters: { primary: { x: 0, y: 1.88, z: -1.42 } },
};
