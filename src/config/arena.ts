import type { ArenaDefinition, StaticBox, Vec3 } from './types';

const obstacle = (id: string, center: Vec3, halfExtents: Vec3): StaticBox => ({ id, center, halfExtents, style: 'obstacle' });

export const ARENA: ArenaDefinition = {
  tilesPerSide: 50,
  tileSize: 1,
  floorTop: 0,
  floorThickness: 1,
  wallHeight: 6,
  wallThickness: 0.5,
  spawn: { x: 0, y: 0.08, z: 8.5 },
  obstacles: [
    obstacle('reference-barrier', { x: 0, y: 2.5, z: 0 }, { x: 11, y: 2.5, z: 1 }),
  ],
  referenceModel: {
    url: 'models/arenas/training-02/arena-v2.obj',
    offset: { x: 0, y: 0, z: 0 },
    obstacleId: 'reference-barrier',
    expectedSize: { x: 50, y: 6, z: 50 },
  },
  floorTexture: { url: 'textures/arenas/training-02/floor-layout-v2.png', pixelsPerSide: 1000 },
};

export const arenaWidth = (arena: ArenaDefinition): number => arena.tilesPerSide * arena.tileSize;

/** Rendering uses one cube per 1 m tile; physics uses one floor, four walls and one reference barrier. */
export function createArenaColliders(arena: ArenaDefinition): StaticBox[] {
  const half = arenaWidth(arena) / 2;
  const t = arena.wallThickness / 2;
  const h = arena.wallHeight / 2;
  return [
    { id: 'floor', center: { x: 0, y: arena.floorTop - arena.floorThickness / 2, z: 0 }, halfExtents: { x: half, y: arena.floorThickness / 2, z: half }, style: 'floor' },
    { id: 'wall-north', center: { x: 0, y: h, z: -half - t }, halfExtents: { x: half + arena.wallThickness, y: h, z: t }, style: 'wall' },
    { id: 'wall-south', center: { x: 0, y: h, z: half + t }, halfExtents: { x: half + arena.wallThickness, y: h, z: t }, style: 'wall' },
    { id: 'wall-west', center: { x: -half - t, y: h, z: 0 }, halfExtents: { x: t, y: h, z: half }, style: 'wall' },
    { id: 'wall-east', center: { x: half + t, y: h, z: 0 }, halfExtents: { x: t, y: h, z: half }, style: 'wall' },
    ...arena.obstacles,
  ];
}

export function createTileCenters(arena: ArenaDefinition): Vec3[] {
  const start = -arenaWidth(arena) / 2 + arena.tileSize / 2;
  return Array.from({ length: arena.tilesPerSide ** 2 }, (_, index) => ({
    x: start + (index % arena.tilesPerSide) * arena.tileSize,
    y: arena.floorTop - arena.floorThickness / 2,
    z: start + Math.floor(index / arena.tilesPerSide) * arena.tileSize,
  }));
}
