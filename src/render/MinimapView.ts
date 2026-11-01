import * as THREE from 'three';
import type { Vec3 } from '../config/types';

/** Low-resolution second camera of the SAME scene. No shadow pass; refreshes at 10 Hz. */
export class MinimapView {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera = new THREE.OrthographicCamera(-28, 28, 28, -28, 0.1, 90);
  private last = -Infinity;
  private readonly marker: THREE.Mesh;

  constructor(private readonly scene: THREE.Scene, canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(1); this.renderer.setSize(192, 192, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.15;
    this.camera.position.set(0, 60, 0); this.camera.up.set(0, 0, -1); this.camera.lookAt(0, 0, 0);
    this.camera.layers.enable(1); this.camera.layers.enable(2);
    this.marker = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.85, 3), new THREE.MeshBasicMaterial({ color: '#e9ff9b' }));
    this.marker.geometry.rotateX(-Math.PI / 2); this.marker.layers.set(2); this.scene.add(this.marker);
  }

  render(time: number, feet: Vec3, yaw: number): void {
    if (time - this.last < 100) return; this.last = time;
    this.marker.position.set(feet.x, 5.5, feet.z); this.marker.rotation.y = yaw;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void { this.scene.remove(this.marker); this.marker.geometry.dispose(); (this.marker.material as THREE.Material).dispose(); this.renderer.dispose(); }
}
