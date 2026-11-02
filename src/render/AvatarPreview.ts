import * as THREE from 'three';
import type { TankAnimation } from './TankAnimation';

/** Small live view of the SAME skeleton, including its current supports and head aim. */
export class AvatarPreview {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.PerspectiveCamera(37, 1.65, 0.1, 30);
  private last = -Infinity;
  constructor(private readonly scene: THREE.Scene, private readonly animation: TankAnimation, readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(330, 200, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.camera.layers.enable(1);
  }
  render(time: number): void {
    if (time - this.last < 66) return; this.last = time;
    const root = this.animation.root, state = this.animation.locomotion;
    this.camera.position.copy(root.position).add(new THREE.Vector3(4.8, 3.1, -5.2));
    this.camera.lookAt(root.position.clone().add(new THREE.Vector3(0, 1.15, 0)));
    this.renderer.render(this.scene, this.camera);
    // Read-only telemetry: browser checks inspect the actual rendered actor, never drive it.
    Object.assign(this.canvas.dataset, {
      ready: 'true', yaw: String(state.yaw), headYaw: String(this.animation.headYaw),
      phase: String(state.phase), steps: String(this.animation.stepIndex), foot: this.animation.lastFoot,
      weights: JSON.stringify(state.weights), speed: String(state.speed),
      footError: String(Math.max(...this.animation.legs.map(leg => leg.error))),
    });
  }
  dispose(): void { this.renderer.dispose(); }
}
