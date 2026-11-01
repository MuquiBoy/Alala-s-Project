import * as THREE from 'three';
import { createArenaView } from './ArenaView';
import { attachArenaReference } from './ArenaReference';
import { attachFloorTexture } from './FloorTexture';
import type { ArenaDefinition } from '../config/types';

export class SceneView {
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly overview = new THREE.PerspectiveCamera(45, 1, 0.1, 140);
  private readonly observer: ResizeObserver;

  constructor(readonly canvas: HTMLCanvasElement, private readonly arena: ArenaDefinition, onResize: (aspect: number) => void) {
    const lightweight = new URL(location.href).searchParams.get('quality') === 'low';
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !lightweight, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(lightweight ? 1 : Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = !lightweight;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.scene.background = new THREE.Color('#d4ddd4');
    this.scene.fog = new THREE.Fog('#d4ddd4', 48, 120);
    this.scene.add(new THREE.HemisphereLight('#f3f5df', '#566357', 2.3));
    const sunlight = new THREE.DirectionalLight('#fff1ce', 3.5);
    sunlight.position.set(-9, 19, 8); sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -28; sunlight.shadow.camera.right = 28;
    sunlight.shadow.camera.top = 28; sunlight.shadow.camera.bottom = -28;
    sunlight.shadow.camera.near = 0.5; sunlight.shadow.camera.far = 60;
    sunlight.shadow.normalBias = 0.035; sunlight.shadow.bias = -0.0002;
    this.scene.add(sunlight);
    this.scene.add(createArenaView(arena));
    const surround = new THREE.Mesh(new THREE.PlaneGeometry(250, 250), new THREE.MeshStandardMaterial({ color: '#aab7a6', roughness: 1 }));
    surround.rotation.x = -Math.PI / 2; surround.position.y = -1.02; surround.receiveShadow = true; this.scene.add(surround);
    this.overview.position.set(38, 42, 52); this.overview.lookAt(-0.5, 0, -0.5);
    this.observer = new ResizeObserver(() => {
      const { width, height } = canvas.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      this.renderer.setSize(width, height, false);
      this.overview.aspect = width / height; this.overview.updateProjectionMatrix(); onResize(width / height);
    });
    this.observer.observe(canvas);
  }

  render(camera: THREE.Camera): void { this.renderer.render(this.scene, camera); }

  async loadReference(): Promise<void> {
    const group = this.scene.getObjectByName('arena');
    if (!(group instanceof THREE.Group)) throw new Error('No se encontró el grupo de la arena.');
    await attachArenaReference(group, this.arena);
    await attachFloorTexture(group, this.arena, this.renderer.capabilities.getMaxAnisotropy());
  }

  dispose(): void {
    this.observer.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
        geometries.add(object.geometry);
        for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => {
      if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
      material.dispose();
    });
    this.renderer.dispose();
  }
}
