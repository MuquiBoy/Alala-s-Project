import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ARENA, arenaWidth, createArenaColliders, createTileCenters } from '../src/config/arena';
import { AVATAR_01 } from '../src/config/creatures';
import type { CreatureDefinition, Vec3 } from '../src/config/types';
import { FixedStep } from '../src/core/FixedStep';
import { CharacterMotor, desiredVelocity } from '../src/physics/CharacterMotor';
import { initializePhysics, PhysicsWorld } from '../src/physics/PhysicsWorld';
import { FirstPersonCamera } from '../src/camera/FirstPersonCamera';

beforeAll(async () => initializePhysics());
const active: { motor: CharacterMotor; physics: PhysicsWorld }[] = [];
afterEach(() => active.splice(0).forEach(({ motor, physics }) => { motor.dispose(); physics.dispose(); }));

function character(spawn: Vec3 = ARENA.spawn, definition = AVATAR_01): { motor: CharacterMotor; physics: PhysicsWorld } {
  const physics = new PhysicsWorld(createArenaColliders(ARENA));
  const motor = new CharacterMotor(physics, definition, spawn);
  active.push({ motor, physics }); return { motor, physics };
}

function simulate(test: ReturnType<typeof character>, ticks: number, forward = 0, right = 0, yaw = 0): void {
  for (let i = 0; i < ticks; i++) { test.motor.update({ forward, right }, yaw, 1 / 60); test.physics.step(1 / 60); }
}

describe('escala y referencia del usuario', () => {
  it('construye exactamente 2500 módulos de un metro, centrados y con superficie Y=0', () => {
    const tiles = createTileCenters(ARENA);
    expect(tiles).toHaveLength(2500); expect(new Set(tiles.map(p => `${p.x}/${p.z}`)).size).toBe(2500);
    expect(arenaWidth(ARENA)).toBe(50); expect(ARENA.tileSize).toBe(1); expect(ARENA.floorThickness).toBe(1);
    expect(Math.min(...tiles.map(p => p.x)) - 0.5).toBe(-25);
    expect(Math.max(...tiles.map(p => p.x)) + 0.5).toBe(25);
    expect(Math.min(...tiles.map(p => p.z)) - 0.5).toBe(-25);
    expect(Math.max(...tiles.map(p => p.z)) + 0.5).toBe(25);
    expect(tiles.every(p => p.y + 0.5 === 0)).toBe(true);
  });

  it('usa una base física y paredes cuyo límite interior es ±25 m', () => {
    const boxes = createArenaColliders(ARENA);
    expect(boxes.filter(box => box.style === 'floor')).toHaveLength(1);
    expect(boxes).toHaveLength(6);
    const east = boxes.find(box => box.id === 'wall-east')!;
    const north = boxes.find(box => box.id === 'wall-north')!;
    expect(east.center.x - east.halfExtents.x).toBe(25);
    expect(north.center.z + north.halfExtents.z).toBe(-25);
  });

  it('mapea el PNG nuevo a 20 píxeles por metro, sin cambiar los módulos físicos', () => {
    const file = fileURLToPath(new URL('../public/textures/arenas/training-02/floor-layout-v2.png', import.meta.url));
    const png = readFileSync(file);
    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1000); expect(png.readUInt32BE(20)).toBe(1000);
    expect(ARENA.floorTexture!.pixelsPerSide / arenaWidth(ARENA)).toBe(20);
    expect(ARENA.tileSize).toBe(1); expect(createTileCenters(ARENA)).toHaveLength(2500);
  });

  it('conserva las medidas del OBJ y ajusta su barrera al collider central', () => {
    const file = fileURLToPath(new URL('../public/models/arenas/training-02/arena-v2.obj', import.meta.url));
    const model = new OBJLoader().parse(readFileSync(file, 'utf8'));
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    expect(size.toArray()).toEqual([50, 6, 50]);
    const bounds = new THREE.Box3();
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const vertices = object.geometry.getAttribute('position');
      for (let index = 0; index < vertices.count; index += 3) {
        const triangle = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(vertices, index + offset));
        if (Math.max(...triangle.map(p => p.y)) > 0.001) triangle.forEach(p => bounds.expandByPoint(p));
      }
    });
    const box = ARENA.obstacles[0];
    expect(bounds.getCenter(new THREE.Vector3()).toArray()).toEqual([box.center.x, box.center.y, box.center.z]);
    expect(bounds.getSize(new THREE.Vector3()).toArray()).toEqual([box.halfExtents.x * 2, box.halfExtents.y * 2, box.halfExtents.z * 2]);
  });
});

describe('movimiento y simulación real de Rapier', () => {
  it('normaliza diagonales y orienta WASD según la cámara', () => {
    const diagonal = desiredVelocity({ forward: 1, right: 1 }, 0, 4);
    expect(Math.hypot(diagonal.x, diagonal.z)).toBeCloseTo(4);
    const forward = desiredVelocity({ forward: 1, right: 0 }, Math.PI / 2, 4);
    expect(forward.x).toBeCloseTo(-4); expect(forward.z).toBeCloseTo(0);
    expect(desiredVelocity({ forward: 0, right: 0 }, 0, 4)).toEqual({ x: 0, z: -0 });
  });

  it('acelera progresivamente y desacelera hasta detenerse', () => {
    const test = character(); simulate(test, 1, -1);
    expect(test.motor.speed).toBeGreaterThan(0); expect(test.motor.speed).toBeLessThan(1);
    simulate(test, 20, -1); expect(test.motor.speed).toBeCloseTo(4);
    simulate(test, 20); expect(test.motor.speed).toBe(0);
  });

  it('cae por gravedad, aterriza y permanece sobre el suelo', () => {
    const test = character({ x: 9, y: 3, z: 8 }); simulate(test, 180);
    expect(test.motor.grounded).toBe(true);
    expect(test.motor.feet.y).toBeGreaterThanOrEqual(-0.001);
    expect(test.motor.feet.y).toBeLessThan(0.04);
    const y = test.motor.feet.y; simulate(test, 180); expect(test.motor.feet.y).toBeCloseTo(y, 4);
  });

  it.each([
    { side: 'norte', forward: 1, right: 0, axis: 'z' as const, sign: -1 },
    { side: 'sur', forward: -1, right: 0, axis: 'z' as const, sign: 1 },
    { side: 'este', forward: 0, right: 1, axis: 'x' as const, sign: 1 },
    { side: 'oeste', forward: 0, right: -1, axis: 'x' as const, sign: -1 },
  ])('impide atravesar la pared $side', ({ forward, right, axis, sign }) => {
    const test = character({ x: 20, y: 0.08, z: 8 }); simulate(test, 700, forward, right);
    const position = test.motor.feet[axis] * sign;
    expect(position).toBeGreaterThan(24);
    expect(position).toBeLessThan(25 - AVATAR_01.collision.radius + 0.02);
    expect(test.motor.feet.y).toBeGreaterThan(-0.001);
  });

  it('detiene el cuerpo ante la barrera importada', () => {
    const test = character(); simulate(test, 240, 1);
    expect(test.motor.feet.z).toBeGreaterThan(1.4); expect(test.motor.feet.z).toBeLessThan(1.5);
  });

  it('permite deslizarse a lo largo de la barrera y rodearla', () => {
    const test = character(); simulate(test, 180, 1); simulate(test, 300, 1, 1);
    expect(test.motor.feet.x).toBeGreaterThan(11.5); simulate(test, 100, 1);
    expect(test.motor.feet.z).toBeLessThan(-1);
  });

  it('no atraviesa una barrera incluso con un desplazamiento de más de 6 m por tick', () => {
    const fast: CreatureDefinition = { ...AVATAR_01, movement: { ...AVATAR_01.movement, speed: 400, acceleration: 30000 } };
    const test = character(ARENA.spawn, fast); simulate(test, 8, 1);
    expect(test.motor.feet.z).toBeGreaterThan(1.4);
  });

  it('admite dimensiones de criatura distintas sin cambiar el controlador', () => {
    const large: CreatureDefinition = { ...AVATAR_01, collision: { radius: 0.7, height: 2.2 } };
    const test = character(ARENA.spawn, large); simulate(test, 240, 1);
    expect(test.motor.feet.z).toBeGreaterThan(1.69); expect(test.motor.feet.y).toBeLessThan(0.04);
  });

  it('produce la misma posición con renderizado a 30 y a 144 FPS', () => {
    const run = (fps: number): Vec3 => {
      const test = character({ x: -9, y: 0.08, z: 8 }); const clock = new FixedStep();
      for (let i = 0; i < fps * 3; i++) clock.advance(1 / fps, dt => { test.motor.update({ forward: 1, right: 0 }, 0, dt); test.physics.step(dt); });
      return test.motor.feet;
    };
    const slow = run(30), fast = run(144);
    expect(slow.x).toBeCloseTo(fast.x, 4); expect(slow.y).toBeCloseTo(fast.y, 4); expect(slow.z).toBeCloseTo(fast.z, 4);
  });

  it('reinicia posición y velocidad sin arrastrar desplazamiento anterior', () => {
    const test = character(); simulate(test, 90, 1, 1); test.motor.reset(ARENA.spawn); simulate(test, 60);
    expect(test.motor.feet.x).toBeCloseTo(ARENA.spawn.x); expect(test.motor.feet.z).toBeCloseTo(ARENA.spawn.z); expect(test.motor.speed).toBe(0);
  });
});

describe('cámara y reloj', () => {
  it('la cámara usa ojos por avatar y limita el giro vertical', () => {
    const camera = new FirstPersonCamera(AVATAR_01); camera.look(0, 1000000); camera.update({ x: 1, y: 0, z: 2 });
    expect(camera.camera.position.y).toBeCloseTo(1.02); expect(camera.pitch).toBe(AVATAR_01.camera.minPitch);
    camera.look(0, -1000000); expect(camera.pitch).toBe(AVATAR_01.camera.maxPitch);
  });

  it('no recupera varios segundos de física al volver a una pestaña', () => {
    const clock = new FixedStep(); let ticks = 0;
    clock.advance(20, () => ticks++); expect(ticks).toBe(6);
    clock.reset(); expect(clock.advance(0, () => ticks++)).toBe(0);
  });
});
