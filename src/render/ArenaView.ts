import * as THREE from 'three';
import { arenaWidth, createArenaColliders, createTileCenters } from '../config/arena';
import type { ArenaDefinition } from '../config/types';

const material = (color: string): THREE.MeshStandardMaterial => new THREE.MeshStandardMaterial({ color, roughness: 0.92, flatShading: true });

function box(group: THREE.Group, size: number[], position: number[], mat: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
  return mesh;
}

/** One instanced 1×1×1 cube per metre; all top faces are at Y=0. */
export function createArenaView(definition: ArenaDefinition): THREE.Group {
  const group = new THREE.Group(); group.name = 'arena';
  const tileGeometry = new THREE.BoxGeometry(definition.tileSize, definition.floorThickness, definition.tileSize);
  const centers = createTileCenters(definition);
  const tiles = new THREE.InstancedMesh(tileGeometry, material('#c1c8bb'), centers.length);
  tiles.name = 'floor-2500-modules'; tiles.receiveShadow = true;
  const transform = new THREE.Object3D();
  const shades = ['#b2bcae', '#b5bfaf', '#adb8ab', '#b8c1b3', '#b0baad'];
  centers.forEach((p, index) => {
    transform.position.set(p.x, p.y, p.z); transform.updateMatrix();
    tiles.setMatrixAt(index, transform.matrix);
    tiles.setColorAt(index, new THREE.Color(shades[(index * 7 + Math.floor(index / definition.tilesPerSide)) % shades.length]));
  });
  group.add(tiles);
  const width = arenaWidth(definition);
  const grid = new THREE.GridHelper(width, definition.tilesPerSide, '#7f9082', '#8e9d8e');
  grid.position.y = 0.004; group.add(grid);
  const wallMat = material('#62776c'), obstacleMat = material('#74867b'), capMat = material('#e5a080');
  for (const entry of createArenaColliders(definition).filter(collider => collider.style !== 'floor')) {
    const { halfExtents: h, center: c } = entry;
    const mesh = box(group, [h.x * 2, h.y * 2, h.z * 2], [c.x, c.y, c.z], entry.style === 'wall' ? wallMat : obstacleMat);
    mesh.name = entry.id;
    if (entry.style === 'wall') {
      box(group, [h.x * 2 + 0.025, 0.08, h.z * 2 + 0.025], [c.x, c.y + h.y - 0.2, c.z], capMat);
    } else if (entry.id !== definition.referenceModel?.obstacleId) {
      box(group, [h.x * 2 + 0.02, 0.055, h.z * 2 + 0.02], [c.x, c.y + h.y, c.z], material('#c1ceab'));
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: '#93a48f' }));
      line.position.copy(mesh.position); group.add(line);
    }
  }
  // All ornamental objects remain outside the playable interior or flush to the floor.
  const perimeterMat = material('#476156');
  for (let i = -20; i <= 20; i += 5) {
    for (const side of [-1, 1]) {
      box(group, [0.22, 3.7, 0.4], [i, 1.85, side * (width / 2 + 0.3)], perimeterMat);
      box(group, [0.4, 3.7, 0.22], [side * (width / 2 + 0.3), 1.85, i], perimeterMat);
    }
  }
  const spawnRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 0.99, 48), new THREE.MeshBasicMaterial({ color: '#e9f2ce', side: THREE.DoubleSide }));
  spawnRing.rotation.x = -Math.PI / 2; spawnRing.position.set(definition.spawn.x, 0.009, definition.spawn.z); group.add(spawnRing);

  const northLabel = label('01', '#d4dfca');
  northLabel.position.set(0, 1.65, -width / 2 + 0.015); group.add(northLabel);
  const eastLabel = label('E', '#d4dfca');
  eastLabel.position.set(width / 2 - 0.015, 1.65, 1); eastLabel.rotation.y = -Math.PI / 2; group.add(eastLabel);
  const north = label('N', '#d4dfca');
  north.scale.setScalar(0.42); north.position.set(0, 0.012, -width / 2 + 1.7); north.rotation.x = -Math.PI / 2; group.add(north);
  return group;
}

function label(text: string, color: string): THREE.Mesh {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('No se pudo crear la señalización de la arena.');
  context.fillStyle = color; context.font = 'bold 190px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, 256, 137);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
  return new THREE.Mesh(new THREE.PlaneGeometry(3.1, 1.55), mat);
}
