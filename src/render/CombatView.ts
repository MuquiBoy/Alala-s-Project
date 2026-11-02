import * as THREE from 'three';
import { abilityById } from '../config/abilities';
import type { CombatRuntime } from '../combat/CombatRuntime';
import { obstacleDistance } from '../combat/WorldQueries';
import { FlameView } from '../attacks/flamethrower/FlameView';
import { HeatView } from '../attacks/flamethrower/HeatView';
import { BarrageView } from '../attacks/barrage/BarrageView';
import { CHARGE } from '../attacks/charge/definition';
import { EnemyProjectileView } from './EnemyProjectileView';

/** Small, pooled meshes. Flame: one instanced draw. Pulse: a single clipped strip. */
export class CombatView {
  private readonly root = new THREE.Group();
  private readonly targets: { root: THREE.Group; bar: THREE.Mesh; body: THREE.Mesh; marker: THREE.Mesh }[] = [];
  private readonly flame: FlameView;
  private readonly heat: HeatView;
  private readonly barrage: BarrageView;
  private readonly enemyShots: EnemyProjectileView;
  private readonly shield: THREE.Mesh;
  private readonly chargeCue: THREE.Mesh;
  private readonly impactFlash: THREE.Mesh;
  private readonly pulse: THREE.Mesh;
  private readonly pulsePositions = new Float32Array(64 * 6 * 3);

  constructor(scene: THREE.Scene, private readonly combat: CombatRuntime, showTraining = true) {
    this.root.name = 'combat-effects'; scene.add(this.root);
    for (const target of showTraining ? combat.targets : []) {
      const root = new THREE.Group();
      const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0), new THREE.MeshStandardMaterial({ color: target.spec.color, flatShading: true, roughness: 0.9 }));
      body.position.y = 0.75; body.castShadow = true; root.add(body);
      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 0.32, 6), new THREE.MeshStandardMaterial({ color: '#3d5548' })); stand.position.y = 0.16; root.add(stand);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.08), new THREE.MeshBasicMaterial({ color: '#d6efac', side: THREE.DoubleSide })); bar.position.set(0, 1.5, 0); root.add(bar);
      const marker = new THREE.Mesh(new THREE.CircleGeometry(0.35, 12), new THREE.MeshBasicMaterial({ color: target.spec.color }));
      marker.rotation.x = -Math.PI / 2; marker.position.y = 5.4; marker.layers.set(2); root.add(marker);
      this.root.add(root); this.targets.push({ root, bar, body, marker });
      const label = document.createElement('canvas'); label.width = 128; label.height = 48;
      const ctx = label.getContext('2d')!; ctx.fillStyle = '#263d30'; ctx.font = 'bold 30px monospace'; ctx.textAlign = 'center'; ctx.fillText(target.id, 64, 34);
      const map = new THREE.CanvasTexture(label); map.colorSpace = THREE.SRGBColorSpace;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: true })); sprite.position.y = 1.75; sprite.scale.set(0.9, 0.34, 1); root.add(sprite);
    }
    const probe = new THREE.Mesh(new THREE.OctahedronGeometry(0.2), new THREE.MeshStandardMaterial({ color: '#dfe8bd', emissive: '#7e5730' })); probe.position.set(8.5, 1.2, 8.5); probe.visible = showTraining; this.root.add(probe);
    this.flame = new FlameView(this.root, combat);
    this.heat = new HeatView(this.root, combat.heat);
    this.barrage = new BarrageView(this.root, combat);
    this.enemyShots = new EnemyProjectileView(this.root, combat);
    this.shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#a6e2e3', transparent: true, opacity: 0.23, wireframe: true, depthWrite: false })); this.root.add(this.shield);
    this.chargeCue = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), new THREE.MeshBasicMaterial({ color: '#ffd38d', transparent: true, opacity: 0.35, wireframe: true, depthWrite: false })); this.root.add(this.chargeCue);
    this.impactFlash = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshBasicMaterial({ color: '#ffe0a2', transparent: true, opacity: 0.5, wireframe: true, depthWrite: false }));
    this.impactFlash.visible = false; this.root.add(this.impactFlash);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(this.pulsePositions, 3));
    this.pulse = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: '#ffb876', transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); this.pulse.frustumCulled = false; this.root.add(this.pulse);
  }

  update(): void {
    const { abilities } = this.combat;
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.combat.targets[i], view = this.targets[i], position = target.motor.feet;
      view.root.position.set(position.x, position.y, position.z); view.bar.scale.x = target.health / target.maximum;
      (view.body.material as THREE.MeshStandardMaterial).color.set(target.health > 0 ? target.spec.color : '#65796c');
      (view.marker.material as THREE.MeshBasicMaterial).color.set(target.health > 0 ? target.spec.color : '#65796c');
    }
    this.flame.update();
    this.heat.update(); this.barrage.update(); this.enemyShots.update();
    this.shield.visible = abilities.active('armor') || abilities.active('armor_guard');
    if (this.shield.visible) {
      const feet = this.combat.feet;
      this.shield.position.set(feet.x, feet.y + 1.25, feet.z);
      this.shield.scale.set(1.65, 1.35, 1.65);
      this.shield.rotation.y = abilities.time;
    }
    this.chargeCue.visible = abilities.active('charge');
    if (this.chargeCue.visible) {
      const progress = abilities.elapsed('charge') / CHARGE.windup!;
      this.chargeCue.position.set(this.combat.feet.x, this.combat.feet.y + 1.25, this.combat.feet.z);
      const size = progress < 1 ? 1.25 + progress * 0.35 : 1.7;
      this.chargeCue.scale.set(size, size * 0.8, size);
      this.chargeCue.rotation.y = abilities.time * 2;
      (this.chargeCue.material as THREE.MeshBasicMaterial).color.set(progress < 1 ? '#ffd38d' : '#ff936c');
    }
    const impactAge = abilities.time - this.combat.lastImpactAt;
    this.impactFlash.visible = !!this.combat.lastImpact && impactAge >= 0 && impactAge < 0.26;
    if (this.impactFlash.visible) {
      const target = this.combat.targets.find(candidate => candidate.id === this.combat.lastImpact!.targetId)!;
      const feet = target.motor.feet;
      this.impactFlash.position.set(feet.x, feet.y + 0.7, feet.z);
      this.impactFlash.scale.setScalar(1 + impactAge * 4);
      (this.impactFlash.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - impactAge / 0.26);
    }
    this.pulse.visible = abilities.active('thermal_pulse');
    if (this.pulse.visible) {
      const center = this.combat.pulseCenter, definition = abilityById('thermal_pulse');
      const radius = definition.range * Math.min(1, abilities.elapsed('thermal_pulse') / definition.duration);
      let index = 0;
      const point = (angle: number, inner: boolean): number[] => {
        const direction = { x: Math.cos(angle), y: 0, z: Math.sin(angle) };
        const distance = Math.max(0, Math.min(inner ? Math.max(0, radius - 0.12) : radius, obstacleDistance({ ...center, y: center.y + 0.08 }, direction, definition.range, this.combat.boxes) - 0.04));
        return [center.x + direction.x * distance, center.y + 0.035, center.z + direction.z * distance];
      };
      for (let segment = 0; segment < 64; segment++) {
        const a = segment / 64 * Math.PI * 2, b = (segment + 1) / 64 * Math.PI * 2;
        for (const vertex of [point(a, false), point(a, true), point(b, false), point(b, false), point(a, true), point(b, true)]) for (const value of vertex) this.pulsePositions[index++] = value;
      }
      this.pulse.geometry.getAttribute('position').needsUpdate = true;
    }
  }

  dispose(scene: THREE.Scene): void { scene.remove(this.root); this.root.traverse(object => { if (object instanceof THREE.Mesh || object instanceof THREE.Sprite) { if (object instanceof THREE.Mesh) object.geometry.dispose(); const material = object.material as THREE.Material & { map?: THREE.Texture }; material.map?.dispose(); material.dispose(); } }); }
}
