import type { StaticBox, Vec3 } from '../config/types';

/** Slab ray/AABB intersection in metres. Shared by damage occlusion and effect clipping. */
export function obstacleDistance(origin: Vec3, direction: Vec3, maximum: number, boxes: readonly StaticBox[]): number {
  let nearest = maximum;
  for (const box of boxes) {
    let near = 0, far = nearest;
    for (const axis of ['x', 'y', 'z'] as const) {
      const minimum = box.center[axis] - box.halfExtents[axis], maximum = box.center[axis] + box.halfExtents[axis];
      if (Math.abs(direction[axis]) < 1e-9) { if (origin[axis] < minimum || origin[axis] > maximum) { far = -1; break; } continue; }
      const a = (minimum - origin[axis]) / direction[axis], b = (maximum - origin[axis]) / direction[axis];
      near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b));
      if (near > far) break;
    }
    if (near <= far && far >= 0) nearest = Math.min(nearest, Math.max(0, near));
  }
  return nearest;
}

export function lineClear(from: Vec3, to: Vec3, boxes: readonly StaticBox[]): boolean {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const distance = Math.hypot(dx, dy, dz); if (distance < 1e-6) return true;
  return obstacleDistance(from, { x: dx / distance, y: dy / distance, z: dz / distance }, distance, boxes) >= distance - 0.01;
}

export function aimDirection(yaw: number, pitch: number): Vec3 {
  return { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: -Math.cos(yaw) * Math.cos(pitch) };
}

export function inFlameVolume(origin: Vec3, direction: Vec3, center: Vec3, radius: number, range: number, halfAngle: number): boolean {
  const dx = center.x - origin.x, dy = center.y - origin.y, dz = center.z - origin.z;
  const along = dx * direction.x + dy * direction.y + dz * direction.z;
  const perpendicular = Math.sqrt(Math.max(0, dx * dx + dy * dy + dz * dz - along * along));
  return along >= -radius && along <= range + radius && perpendicular <= Math.max(0, along) * Math.tan(halfAngle) + radius;
}
