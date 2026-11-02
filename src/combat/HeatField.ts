import { ARENA } from '../config/arena';
import type { StaticBox, Vec3 } from '../config/types';
import { FLAMETHROWER } from '../attacks/flamethrower/definition';
import { inFlameVolume, lineClear } from './WorldQueries';
import type { TestTarget } from '../attacks/types';

export interface HeatedTile { id: number; x: number; z: number; remaining: number }

/** One metre tiles, independent of rendering rate and fire particles. */
export class HeatField {
  readonly tiles = new Map<number, HeatedTile>();
  readonly half = ARENA.tilesPerSide * ARENA.tileSize / 2;
  readonly tileSize = ARENA.tileSize;
  readonly count = ARENA.tilesPerSide;

  private index(x: number, z: number): number {
    const column = Math.floor((x + this.half) / this.tileSize), row = Math.floor((z + this.half) / this.tileSize);
    return column < 0 || row < 0 || column >= this.count || row >= this.count ? -1 : row * this.count + column;
  }

  expose(origin: Vec3, direction: Vec3, range: number, halfAngle: number, boxes: readonly StaticBox[]): void {
    const radius = this.tileSize * Math.SQRT2 / 2;
    const lowX=Math.max(0,Math.floor((origin.x-range-radius+this.half)/this.tileSize));
    const highX=Math.min(this.count-1,Math.floor((origin.x+range+radius+this.half)/this.tileSize));
    const lowZ=Math.max(0,Math.floor((origin.z-range-radius+this.half)/this.tileSize));
    const highZ=Math.min(this.count-1,Math.floor((origin.z+range+radius+this.half)/this.tileSize));
    for (let row = lowZ; row <= highZ; row++) for (let column = lowX; column <= highX; column++) {
      const x = -this.half + (column + 0.5) * this.tileSize, z = -this.half + (row + 0.5) * this.tileSize;
      const surface = { x, y: ARENA.floorTop + 0.01, z };
      if (!inFlameVolume(origin, direction, surface, radius, range, halfAngle) || !lineClear(origin, surface, boxes)) continue;
      const id = row * this.count + column;
      const existing=this.tiles.get(id);
      if(existing)existing.remaining=FLAMETHROWER.heatDuration!;
      else this.tiles.set(id, { id, x, z, remaining: FLAMETHROWER.heatDuration! });
    }
  }

  advance(dt: number, targets: readonly TestTarget[], damage: (target: TestTarget, amount: number) => void): void {
    for (const [id, tile] of this.tiles) {
      tile.remaining -= dt;
      if (tile.remaining <= 0) this.tiles.delete(id);
    }
    for (const target of targets) {
      if (target.health <= 0 || target.motor.feet.y > ARENA.floorTop + 0.16) continue;
      if (this.tiles.has(this.index(target.motor.feet.x, target.motor.feet.z))) {
        damage(target, FLAMETHROWER.heatDamage! * dt);
      }
    }
  }

  reset(): void { this.tiles.clear(); }
}
