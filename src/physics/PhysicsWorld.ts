import RAPIER from '@dimforge/rapier3d-compat';
import type { StaticBox } from '../config/types';

let initialized: Promise<void> | undefined;
export function initializePhysics(): Promise<void> {
  initialized ??= RAPIER.init();
  return initialized;
}

export class PhysicsWorld {
  readonly world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  constructor(colliders: readonly StaticBox[]) {
    this.world.timestep = 1 / 60;
    for (const box of colliders) {
      const { halfExtents: size, center } = box;
      this.world.createCollider(RAPIER.ColliderDesc.cuboid(size.x, size.y, size.z).setTranslation(center.x, center.y, center.z));
    }
    // Populate the query pipeline before the first character-controller query.
    this.world.step();
  }

  step(dt: number): void { this.world.timestep = dt; this.world.step(); }
  dispose(): void { this.world.free(); }
}
