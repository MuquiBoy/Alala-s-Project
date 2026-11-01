import * as THREE from 'three';
import type { HeatField } from '../../combat/HeatField';
import { FLAMETHROWER } from './definition';

/** A single translucent draw call for every currently heated metre tile. */
export class HeatView {
  private readonly mesh: THREE.InstancedMesh;
  private readonly transform = new THREE.Object3D();
  private readonly color = new THREE.Color();
  constructor(parent: THREE.Group, private readonly field: HeatField) {
    this.mesh = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(field.tileSize * 0.94, field.tileSize * 0.94),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide }),
      field.count * field.count,
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.frustumCulled = false;
    parent.add(this.mesh);
  }
  update(): void {
    let index = 0;
    for (const tile of this.field.tiles.values()) {
      this.transform.position.set(tile.x, -tile.z, 0.018);
      this.transform.scale.setScalar(1);
      this.transform.updateMatrix();
      this.mesh.setMatrixAt(index, this.transform.matrix);
      const strength = Math.min(1, tile.remaining / FLAMETHROWER.heatDuration!);
      this.color.setRGB(0.5 + strength * 0.5, 0.12 + strength * 0.24, 0.035);
      this.mesh.setColorAt(index, this.color);
      index++;
    }
    this.mesh.count = index;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
