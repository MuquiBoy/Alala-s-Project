import * as THREE from 'three';
import { arenaWidth } from '../config/arena';
import type { ArenaDefinition } from '../config/types';

/** The supplied image covers the whole arena; each 20 px square is one metre. */
export async function attachFloorTexture(arena: THREE.Group, definition: ArenaDefinition, anisotropy: number): Promise<void> {
  const reference = definition.floorTexture;
  if (!reference) return;
  const texture = await new THREE.TextureLoader().loadAsync(import.meta.env.BASE_URL + reference.url);
  if (texture.image.width !== reference.pixelsPerSide || texture.image.height !== reference.pixelsPerSide) {
    texture.dispose(); throw new Error('La resolución de la textura cambió. Revisa su correspondencia con los metros de la arena.');
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = Math.min(8, anisotropy);
  // A flush decal keeps the exact surface Y=0. Polygon offset avoids coplanar flicker.
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const width = arenaWidth(definition);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width), material);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = definition.floorTop;
  mesh.receiveShadow = true; mesh.name = 'reference-01-floor-texture'; arena.add(mesh);
}
