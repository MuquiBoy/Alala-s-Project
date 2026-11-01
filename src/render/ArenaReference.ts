import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import type { ArenaDefinition } from '../config/types';

/** Keep the source OBJ untouched. Strip its slab only from the runtime view to avoid z-fighting with the mandatory tiled floor. */
export async function attachArenaReference(arena: THREE.Group, definition: ArenaDefinition): Promise<void> {
  const reference = definition.referenceModel;
  if (!reference) return;
  const source = await new OBJLoader().loadAsync(import.meta.env.BASE_URL + reference.url);
  const size = new THREE.Box3().setFromObject(source).getSize(new THREE.Vector3());
  for (const axis of ['x', 'y', 'z'] as const) {
    if (Math.abs(size[axis] - reference.expectedSize[axis]) > 0.001) throw new Error(`La referencia OBJ cambió de escala en ${axis}. Actualiza sus colisiones antes de usarla.`);
  }
  const positions: number[] = [];
  source.updateMatrixWorld(true);
  source.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry;
    const vertices = geometry.getAttribute('position');
    for (let index = 0; index < vertices.count; index += 3) {
      const triangle = [0, 1, 2].map(offset => new THREE.Vector3().fromBufferAttribute(vertices, index + offset).applyMatrix4(object.matrixWorld));
      if (Math.max(...triangle.map(p => p.y + reference.offset.y)) <= definition.floorTop + 0.001) continue;
      triangle.forEach(p => positions.push(p.x + reference.offset.x, p.y + reference.offset.y, p.z + reference.offset.z));
    }
    if (geometry !== object.geometry) geometry.dispose();
    object.geometry.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
  });
  if (positions.length === 0) throw new Error('La referencia no contiene obstáculos sobre el suelo.');
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#b9c2ae', roughness: 0.94, flatShading: true }));
  mesh.name = 'reference-01-imported'; mesh.castShadow = true; mesh.receiveShadow = true;
  const fallback = arena.getObjectByName(reference.obstacleId);
  if (fallback) fallback.visible = false;
  arena.add(mesh);
}
