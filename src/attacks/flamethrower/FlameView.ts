import * as THREE from 'three';
import type { CombatRuntime } from '../../combat/CombatRuntime';
import { FlameSimulation, FLAME_VISUAL } from './FlameSimulation';
/** One draw call, 128 low-poly shards maximum; no lights, bloom, textures or per-frame geometry. */
export class FlameView {
  readonly simulation = new FlameSimulation();
  private readonly mesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly direction = new THREE.Vector3();
  private readonly forward = new THREE.Vector3(0, 0, 1);
  private readonly colors = new Float32Array(FLAME_VISUAL.capacity * 3);
  private readonly opacity = new Float32Array(FLAME_VISUAL.capacity);
  private readonly palette = ['#ff5224', '#ff9134', '#ffca50', '#ffe596', '#fff4cf'].map(color => new THREE.Color(color));
  private lastTime = 0;
  constructor(root: THREE.Group, private readonly combat: CombatRuntime) {
    const geometry = new THREE.OctahedronGeometry(1, 0);
    geometry.setAttribute('flameColor', new THREE.InstancedBufferAttribute(this.colors, 3));
    geometry.setAttribute('flameOpacity', new THREE.InstancedBufferAttribute(this.opacity, 1));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: 'attribute vec3 flameColor; attribute float flameOpacity; varying vec3 tint; varying float alpha; varying float facet; void main(){tint=flameColor;alpha=flameOpacity;facet=0.6+0.4*max(0.0,dot(normal,normalize(vec3(0.4,0.9,0.2))));gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 tint; varying float alpha; varying float facet; void main(){gl_FragColor=vec4(tint*facet,alpha);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    });
    this.mesh = new THREE.InstancedMesh(geometry, material, FLAME_VISUAL.capacity);
    this.mesh.name = 'flamethrower-lowpoly'; this.mesh.frustumCulled = false; this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    root.add(this.mesh);
  }
  update(): void {
    const time = this.combat.abilities.time;
    if (time < this.lastTime || time === 0) this.simulation.reset();
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime)); this.lastTime = time;
    this.simulation.step(dt, this.combat.abilities.active('flamethrower'), this.combat.abilities.elapsed('flamethrower'), this.combat.origin, this.combat.direction, this.combat.boxes);
    let index = 0;
    for (const p of this.simulation.particles) {
      if (p.alpha <= 0) continue;
      this.dummy.position.set(p.position.x, p.position.y, p.position.z);
      this.direction.set(p.velocity.x, p.velocity.y, p.velocity.z).normalize();
      this.dummy.quaternion.setFromUnitVectors(this.forward, this.direction); this.dummy.rotateZ(p.seed * Math.PI * 2 + p.age * 5);
      this.dummy.scale.set(p.size, p.size * (0.7 + p.seed * 0.4), p.size * 2);
      this.dummy.updateMatrix(); this.mesh.setMatrixAt(index, this.dummy.matrix);
      const fraction = p.age / p.life;
      const tone = p.seed < 0.13 ? 0 : p.seed < 0.55 ? 1 : p.seed < 0.86 ? 2 : p.seed < 0.97 ? 3 : 4;
      const color = this.palette[fraction > 0.85 ? Math.min(tone, 1) : tone];
      color.toArray(this.colors, index * 3); this.opacity[index++] = p.alpha;
    }
    this.mesh.count = index; this.mesh.visible = index > 0;
    this.mesh.instanceMatrix.needsUpdate = true; this.mesh.geometry.getAttribute('flameColor').needsUpdate = true; this.mesh.geometry.getAttribute('flameOpacity').needsUpdate = true;
  }
}
