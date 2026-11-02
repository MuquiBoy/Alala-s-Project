import type { AbilityId } from '../attacks/types';
export interface Vec3 { x: number; y: number; z: number }
export interface HeavyIdentity { kind: 'heavy'; stride: number; soundBase: string; stepPrefix?: string; footstepGain: number; bodySettle: number; cameraImpact: number }

export type CreatureModel =
  | { kind: 'procedural'; color: string; accent: string; style?: 'abstract' | 'tank'; size?: Vec3 }
  | { kind: 'gltf'; url: string; scale: number; cameraAnchor?: string; emissionAnchor?: string };

/** Feet at local Y=0, forward=-Z. World units and offsets are in metres. */
export interface CreatureDefinition {
  id: string;
  name: string;
  model: CreatureModel;
  collision: { radius: number; height: number; width?: number; depth?: number };
  movement: { speed: number; acceleration: number; deceleration: number; turnSpeed: number };
  massKg: number;
  health: number;
  abilities: readonly AbilityId[];
  camera: { offset: Vec3; fov: number; minPitch: number; maxPitch: number; sensitivity: number };
  emitters: Readonly<Record<string, Vec3>>;
  identity?: HeavyIdentity;
}

export interface StaticBox {
  id: string;
  center: Vec3;
  halfExtents: Vec3;
  style: 'floor' | 'wall' | 'obstacle';
}

export interface ArenaDefinition {
  tilesPerSide: number;
  tileSize: number;
  floorTop: number;
  floorThickness: number;
  wallHeight: number;
  wallThickness: number;
  spawn: Vec3;
  obstacles: readonly StaticBox[];
  referenceModel?: { url: string; offset: Vec3; obstacleId: string; expectedSize: Vec3 };
  floorTexture?: { url: string; pixelsPerSide: number };
}
