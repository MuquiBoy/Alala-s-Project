import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CreatureDefinition } from '../config/types';

/** Model import is a rendering concern. Feet=Y0, forward=-Z; movement never reads mesh shape. */
export async function createAvatarView(definition: CreatureDefinition): Promise<THREE.Group> {
  const root = new THREE.Group(); root.name = definition.id;
  if (definition.model.kind === 'gltf') {
    const asset = await new GLTFLoader().loadAsync(definition.model.url);
    asset.scene.scale.setScalar(definition.model.scale);
    asset.scene.traverse(object => {
      if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true; }
    });
    root.add(asset.scene);
    root.animations = asset.animations;
    return root;
  }
  const base = new THREE.MeshStandardMaterial({ color: definition.model.color, flatShading: true, roughness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#354c41', flatShading: true });
  const accent = new THREE.MeshStandardMaterial({ color: definition.model.accent, flatShading: true });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh); return mesh;
  };
  if (definition.model.style === 'tank') {
    add(new THREE.BoxGeometry(0.8, 0.5, 1.05), base, 0, 0.73, 0.05).userData.heavyBody = true;
    add(new THREE.BoxGeometry(0.58, 0.32, 0.5), base, 0, 1.06, -0.31).userData.heavyBody = true;
    const muzzle = add(new THREE.CylinderGeometry(0.11, 0.14, 0.35, 6), dark, 0, 0.88, -0.57); muzzle.rotation.x = Math.PI / 2;
    add(new THREE.BoxGeometry(0.25, 0.07, 0.03), accent, 0, 1.1, -0.58);
    for (const side of [-1, 1]) {
      const plate = add(new THREE.BoxGeometry(0.12, 0.5, 0.94), dark, side * 0.46, 0.76, 0.05); plate.rotation.z = side * -0.13;
      for (const z of [-0.35, 0.4]) {
        add(new THREE.IcosahedronGeometry(0.2, 0), accent, side * 0.43, 0.48, z);
        add(new THREE.BoxGeometry(0.23, 0.36, 0.28), dark, side * 0.43, 0.22, z).userData.heavyLeg = { phase: (side < 0) === (z < 0) ? 0 : Math.PI };
      }
    }
    if (definition.model.size) {
      const bounds = new THREE.Box3().setFromObject(root), size = new THREE.Vector3(); bounds.getSize(size);
      root.scale.set(definition.model.size.x / size.x, definition.model.size.y / size.y, definition.model.size.z / size.z);
    }
    return root;
  }
  // Deliberately abstract, squat, four-legged placeholder; no final identity or anatomy implied.
  add(new THREE.IcosahedronGeometry(0.53, 0), base, 0, 0.64, 0.04, 0.85, 0.82, 1.15);
  add(new THREE.IcosahedronGeometry(0.35, 0), base, 0, 0.96, -0.35, 1, 0.9, 0.88);
  for (const side of [-1, 1]) {
    for (const z of [-0.28, 0.35]) add(new THREE.CylinderGeometry(0.1, 0.14, 0.42, 5), dark, side * 0.29, 0.22, z);
    add(new THREE.ConeGeometry(0.12, 0.28, 4), accent, side * 0.22, 1.22, -0.26);
    add(new THREE.BoxGeometry(0.07, 0.08, 0.035), dark, side * 0.14, 1.0, -0.635);
  }
  return root;
}
