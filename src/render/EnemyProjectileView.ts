import * as THREE from 'three';
import type { CombatRuntime } from '../combat/CombatRuntime';
import { TRAINING } from '../config/training';

/** One draw call for the magenta training projectiles and one for their impacts. */
export class EnemyProjectileView {
  private readonly shots: THREE.InstancedMesh;
  private readonly impacts: THREE.InstancedMesh;
  private readonly transform = new THREE.Object3D();

  constructor(parent: THREE.Group, private readonly combat: CombatRuntime) {
    this.shots = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.2, 0),
      new THREE.MeshBasicMaterial({ color: '#ff4cff', transparent: true, opacity: 0.95, depthWrite: false }), TRAINING.maxProjectileCount);
    this.impacts = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshBasicMaterial({ color: '#ffcaff', transparent: true, opacity: 0.65, depthWrite: false }), TRAINING.maxProjectileCount);
    this.shots.frustumCulled = false; this.impacts.frustumCulled = false;
    parent.add(this.shots, this.impacts);
  }

  update(): void {
    let index = 0;
    for (const shot of this.combat.enemyProjectiles.active) {
      this.transform.position.set(shot.position.x, shot.position.y, shot.position.z);
      this.transform.scale.setScalar(1); this.transform.updateMatrix();
      this.shots.setMatrixAt(index++, this.transform.matrix);
    }
    this.shots.count = index; this.shots.instanceMatrix.needsUpdate = true;
    index = 0;
    for (const impact of this.combat.enemyProjectiles.impacts) {
      if (index >= TRAINING.maxProjectileCount) break;
      this.transform.position.set(impact.position.x, impact.position.y, impact.position.z);
      this.transform.scale.setScalar(Math.max(0.05, 1 - impact.age / 0.22)); this.transform.updateMatrix();
      this.impacts.setMatrixAt(index++, this.transform.matrix);
    }
    this.impacts.count = index; this.impacts.instanceMatrix.needsUpdate = true;
  }
}
