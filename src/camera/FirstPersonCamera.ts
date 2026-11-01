import * as THREE from 'three';
import type { CreatureDefinition, Vec3 } from '../config/types';

export class FirstPersonCamera {
  readonly camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = 0;
  private readonly offset = new THREE.Vector3();

  constructor(private readonly definition: CreatureDefinition) {
    this.camera = new THREE.PerspectiveCamera(definition.camera.fov, 1, 0.035, 100);
    this.camera.rotation.order = 'YXZ';
  }

  look(dx: number, dy: number): void {
    const { sensitivity, minPitch, maxPitch } = this.definition.camera;
    this.yaw -= dx * sensitivity;
    this.yaw = Math.atan2(Math.sin(this.yaw), Math.cos(this.yaw));
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sensitivity, minPitch, maxPitch);
  }

  update(feet: Vec3): void {
    const offset = this.definition.camera.offset;
    this.offset.set(offset.x, 0, offset.z).applyAxisAngle(THREE.Object3D.DEFAULT_UP, this.yaw);
    this.camera.position.set(feet.x + this.offset.x, feet.y + offset.y, feet.z + this.offset.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  resize(aspect: number): void { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }
  reset(): void { this.yaw = 0; this.pitch = 0; }
}
