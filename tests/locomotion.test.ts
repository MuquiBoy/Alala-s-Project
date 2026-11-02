import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { TankAnimation } from '../src/render/TankAnimation';
import { TankLocomotion, type LocomotionInput } from '../src/identity/TankLocomotion';
import { THERMAL_TANK } from '../src/config/creatures';

const forward: LocomotionInput = { velocity: { x: 0, y: 0, z: -.8 }, forward: 1, right: 0, aimYaw: 0, grounded: true, suspended: false };
let template: THREE.Group;
beforeAll(async () => {
  // Load the real exported hierarchy, skin weights and clips. Image decoding is covered in Chrome.
  const glb = readFileSync('public/models/avatar-01/avatar-01_rigged_v2.glb');
  const length = glb.readUInt32LE(12), json = JSON.parse(glb.subarray(20, 20 + length).toString());
  delete json.images; delete json.textures; delete json.materials;
  for (const mesh of json.meshes) for (const primitive of mesh.primitives) delete primitive.material;
  const bytes = Buffer.from(JSON.stringify(json)), padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4, 32); bytes.copy(padded);
  const binary = glb.subarray(20 + length), header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4); header.writeUInt32LE(20 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const combined = Buffer.concat([header, padded, binary]);
  const asset = await new GLTFLoader().parseAsync(combined.buffer.slice(combined.byteOffset, combined.byteOffset + combined.length), '');
  template = new THREE.Group(); template.add(asset.scene); template.animations = asset.animations;
});
function actor(): TankAnimation {
  const root = clone(template) as THREE.Group; root.animations = template.animations;
  return new TankAnimation(root, THERMAL_TANK.movement.turnSpeed);
}

describe('locomoción cuadrúpeda integrada', () => {
  it('no reorienta el chasis al apuntar quieto, y la cabeza admite 180° sin pitch', () => {
    const animation = actor();
    animation.update(.1, { x: 0, y: 0, z: 0 }, { ...forward, forward: 0, velocity: { x: 0, y: 0, z: 0 }, aimYaw: Math.PI });
    expect(animation.locomotion.yaw).toBe(0); expect(animation.headYaw).toBeCloseTo(Math.PI);
    const vertical = new THREE.Vector3(0, 1, 0).applyQuaternion(animation.head.getWorldQuaternion(new THREE.Quaternion()));
    expect(vertical.y).toBeCloseTo(1, 5); expect(animation.stepIndex).toBe(0);
  });
  it('selecciona retroceso, curva y diagonal, con pesos normalizados y rumbo limitado', () => {
    const state = new TankLocomotion(.7);
    for (let i = 0; i < 120; i++) state.update(1/60, { ...forward, forward: -1, velocity: { x: 0, y: 0, z: .8 } });
    expect(state.weights.backward).toBeGreaterThan(.99); expect(state.yaw).toBeCloseTo(0);
    state.update(.1, { ...forward, right: 1, velocity: { x: .56, y: 0, z: -.56 } });
    expect(state.yaw).toBeLessThan(0); expect(state.yaw).toBeGreaterThan(-.07);
    expect(state.weights.right).toBeGreaterThan(0);
    expect(Object.values(state.weights).reduce((a,b) => a+b, 0)).toBeCloseTo(1);
  });
  it('fija las patas de apoyo y emite un contacto por pata en el orden del ciclo', () => {
    const animation = actor(), contacts: string[] = []; let maxSlide = 0, maxError = 0;
    const prior = new Map<string, THREE.Vector3>();
    for (let i = 0; i <= 384; i++) {
      contacts.push(...animation.update(1/60, { x: 0, y: 0, z: -i/60*.8 }, forward).map(c => c.foot));
      for (const leg of animation.legs) {
        const position = leg.foot.getWorldPosition(new THREE.Vector3());
        if (!leg.swinging && prior.has(leg.name)) maxSlide = Math.max(maxSlide, position.distanceTo(prior.get(leg.name)!));
        if (!leg.swinging) prior.set(leg.name, position); else prior.delete(leg.name);
        if (i > 100) maxError = Math.max(maxError, leg.error);
      }
    }
    expect(contacts.slice(0, 8)).toEqual(['Rear_L','Front_L','Rear_R','Front_R','Rear_L','Front_L','Rear_R','Front_R']);
    expect(contacts.length).toBe(16);
    expect(maxSlide).toBeLessThan(.025); expect(maxError).toBeLessThan(.04);
  });
  it('silencia reposo, pared, aire, impulso y teletransporte, y reinicia los apoyos', () => {
    const animation = actor();
    for (const change of [ { velocity: {x:0,y:0,z:0} }, { grounded: false }, { suspended: true }, { forward: 0 } ]) {
      animation.reset();
      for (let i=0; i<100; i++) expect(animation.update(1/60, {x:0,y:0,z:-i/60*.8}, {...forward,...change})).toEqual([]);
    }
    animation.update(1/60, {x:100,y:0,z:100}, forward);
    expect(animation.stepIndex).toBe(0);
    animation.reset(); expect(animation.locomotion.phase).toBe(0); expect(animation.lastImpact).toBe(-100);
  });
  it('mantiene la respiración, las seis acciones y la geometría original del recurso', () => {
    const animation = actor();
    expect(animation.root.animations).toHaveLength(6);
    let triangles = 0, max = 0, min = Infinity;
    animation.root.traverse(object => { if (object instanceof THREE.Mesh) triangles += (object.geometry.index?.count ?? object.geometry.attributes.position.count) / 3; });
    expect(triangles).toBe(1338);
    for (let i=0;i<180;i++) {
      animation.update(1/30,{x:0,y:0,z:0},{...forward,forward:0,velocity:{x:0,y:0,z:0}});
      const shell = animation.root.getObjectByName('Body_Shell')!;
      max=Math.max(max,shell.scale.x); min=Math.min(min,shell.scale.x);
    }
    expect(max-min).toBeGreaterThan(.04); expect(animation.stepIndex).toBe(0);
  });
  it('conserva apoyos finitos y longitudes de huesos en curvas, inversión y cambio lateral', () => {
    const animation = actor(), feet = new THREE.Vector3(); let worst = 0;
    const lengths = animation.legs.map(leg => leg.lower.position.length());
    for (let i=0;i<600;i++) {
      const angle = i < 180 ? i/180*Math.PI/2 : i < 360 ? Math.PI : -Math.PI/2;
      const velocity = {x: -.8*Math.sin(angle),y:0,z:-.8*Math.cos(angle)};
      feet.addScaledVector(new THREE.Vector3(velocity.x,0,velocity.z),1/60);
      animation.update(1/60,feet,{...forward,velocity,aimYaw:angle});
      for (const [index,leg] of animation.legs.entries()) {
        expect(leg.lower.position.length()).toBeCloseTo(lengths[index],3);
        expect(Number.isFinite(leg.error)).toBe(true); worst=Math.max(worst,leg.error);
      }
    }
    expect(worst).toBeLessThan(.35);
    expect(animation.stepIndex).toBeGreaterThan(20);
  });
});
