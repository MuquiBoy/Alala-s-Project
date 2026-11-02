import { ABILITIES, COMBAT, type AbilityId } from '../config/abilities';
import { ATTACK_REGISTRY } from '../attacks/registry';
import type { AttackBehavior, DamageType, ImpactView, ProjectileView, TestTarget } from '../attacks/types';
import type { CreatureDefinition, StaticBox, Vec3 } from '../config/types';
import { CharacterMotor, type MotionModifiers } from '../physics/CharacterMotor';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { AbilitySystem, type Activation } from './AbilitySystem';
import { aimDirection, lineClear } from './WorldQueries';
import { HeatField } from './HeatField';
import { AVATAR_01 } from '../config/creatures';
import { TRAINING, TRAINING_ENEMIES, type TrainingEnemySpec } from '../config/training';
import { TrainingController, type TrainingIntent } from './TrainingController';
import { EnemyProjectiles } from './EnemyProjectiles';
import { solveImpact, type ImpactSolution } from '../physics/CollisionImpulse';
export type { TestTarget } from '../attacks/types';

export interface TrainingTarget extends TestTarget {
  spec: TrainingEnemySpec;
  controller: TrainingController;
  lastDamage: number;
  lastImpulse: number;
  lastDeltaV: number;
  projectileHits: number;
}
export interface ImpactDiagnostic extends ImpactSolution {
  attackerId: string; targetId: string; attackerKg: number; targetKg: number;
  attackerBefore: Vec3; targetBefore: Vec3; attackerAfter: Vec3; targetAfter: Vec3;
  targetStart: Vec3;
}

export class CombatRuntime {
  readonly abilities: AbilitySystem;
  readonly targets: TrainingTarget[];
  health: number;
  probeEnabled = false;
  lastDamage = 0;
  onDefeated: () => void = () => {};
  yaw = 0;
  private pitch = 0;
  feet: Vec3;
  private readonly attacks = new Map<AbilityId, AttackBehavior>();
  readonly heat = new HeatField();
  readonly enemyProjectiles = new EnemyProjectiles();
  lastImpact: ImpactDiagnostic | null = null;
  impactCount = 0;
  lastImpactAt = -Infinity;
  lastProjectileHit: { ownerId: string; targetId: string; damage: number; armored: boolean } | null = null;
  motor: CharacterMotor | null = null;
  private readonly targetByCollider = new Map<number, TrainingTarget>();
  private nextProbe: number = COMBAT.probeInterval;
  private opponent?: CombatRuntime;
  private readonly impactVelocities = new Map<string, Vec3>();
  remoteVisual?: { projectiles: ProjectileView[]; impacts: ImpactView[]; shots: number };

  constructor(readonly definition: CreatureDefinition, physics: PhysicsWorld, readonly boxes: readonly StaticBox[], spawn: Vec3, readonly trainingEnabled = true, roster = TRAINING_ENEMIES) {
    this.health = definition.health; this.feet = { ...spawn };
    this.abilities = new AbilitySystem(definition.abilities, ABILITIES, id => this.attacks.get(id)?.onActivate?.());
    this.targets = roster.map(spec => {
      const targetDefinition: CreatureDefinition = {
        ...AVATAR_01, id: spec.id, name: spec.id, massKg: spec.massKg, health: spec.health,
        model: { kind: 'procedural', color: spec.color, accent: spec.color },
        collision: { radius: COMBAT.targetRadius, height: 1.3 },
        movement: { ...AVATAR_01.movement, speed: spec.pattern === 'patrol' ? TRAINING.patrolSpeed : spec.pattern === 'static' ? 0 : TRAINING.lateralSpeed },
      };
      return { id: spec.id, spec, spawn: { ...spec.spawn }, motor: new CharacterMotor(physics, targetDefinition, spec.spawn),
        health: spec.health, maximum: spec.health, massKg: spec.massKg, controller: new TrainingController(spec),
        lastDamage: 0, lastImpulse: 0, lastDeltaV: 0, projectileHits: 0 };
    });
    for (const target of this.targets) this.targetByCollider.set(target.motor.collider.handle, target);
    for (const id of new Set(definition.abilities)) {
      const entry = ATTACK_REGISTRY[id as AbilityId];
      if (!entry) throw new Error('Ataque sin registrar: ' + id);
      this.attacks.set(id as AbilityId, entry.create(this));
    }
  }

  aim(feet: Vec3, yaw: number, pitch: number): void { this.feet = feet; this.yaw = yaw; this.pitch = pitch; }
  attachMotor(motor: CharacterMotor): void { this.motor = motor; }
  captureImpactVelocities(): void { this.impactVelocities.clear(); for(const target of this.targets)this.impactVelocities.set(target.id,{...target.motor.actualVelocity}); }
  connectOpponent(opponent: CombatRuntime, spawn: Vec3): void {
    if (this.targets.length || !opponent.motor) throw new Error('El duelo requiere actores sin enemigos de entrenamiento.');
    this.opponent = opponent;
    const spec: TrainingEnemySpec = { id: opponent.definition.id, color: '#ef9a6c', kind: 'magenta', pattern: 'static',
      health: opponent.definition.health, massKg: opponent.definition.massKg, spawn };
    const target: TrainingTarget = { id: spec.id, spec, spawn, motor: opponent.motor, maximum: spec.health, massKg: spec.massKg, radius: opponent.definition.collision.radius,
      get health() { return opponent.health; }, set health(value) { opponent.health = value; },
      controller: new TrainingController(spec), lastDamage: 0, lastImpulse: 0, lastDeltaV: 0, projectileHits: 0 };
    this.targets.push(target); this.targetByCollider.set(target.motor.collider.handle, target);
  }
  setEnabled(enabled: boolean): void { this.abilities.enabled = enabled && this.health > 0; }
  activate(id: AbilityId, commandId: string): Activation { return this.abilities.request(id, commandId); }
  get origin(): Vec3 {
    const offset = this.definition.emitters.primary;
    return { x: this.feet.x + offset.x * Math.cos(this.yaw) + offset.z * Math.sin(this.yaw), y: this.feet.y + offset.y, z: this.feet.z - offset.x * Math.sin(this.yaw) + offset.z * Math.cos(this.yaw) };
  }
  get direction(): Vec3 { return aimDirection(this.yaw, this.pitch); }
  get pulseCenter(): Vec3 { return this.attacks.get('thermal_pulse')?.effectOrigin ?? this.feet; }
  get barrageProjectiles(): readonly ProjectileView[] { return this.remoteVisual?.projectiles ?? this.attacks.get('barrage')?.projectiles ?? []; }
  get barrageImpacts(): readonly ImpactView[] { return this.remoteVisual?.impacts ?? this.attacks.get('barrage')?.impacts ?? []; }
  get barrageShotsFired(): number { return this.remoteVisual?.shots ?? this.attacks.get('barrage')?.shotsFired ?? 0; }

  damageTarget(target: TestTarget, amount: number, type: DamageType): number {
    const enemy = this.targets.find(candidate => candidate.id === target.id);
    if (!enemy || enemy.health <= 0) return 0;
    if (this.opponent) return this.opponent.receiveDamage(amount, [type]);
    const applied = Math.min(enemy.health, Math.max(0, amount));
    enemy.health -= applied; enemy.lastDamage = applied;
    if (applied > 0) enemy.controller.attacked(this.definition.id);
    return applied;
  }

  impulseTarget(target: TestTarget, momentum: Vec3): Vec3 {
    const enemy = this.targets.find(candidate => candidate.id === target.id);
    if (!enemy || enemy.health <= 0) return { x: 0, y: 0, z: 0 };
    const applied = enemy.motor.applyImpulse(momentum);
    enemy.lastImpulse = Math.hypot(momentum.x, momentum.y, momentum.z);
    enemy.lastDeltaV = Math.hypot(applied.x, applied.y, applied.z);
    enemy.controller.impacted(enemy.lastDeltaV);
    return applied;
  }

  impactTarget(target: TestTarget, normal: Vec3): ImpactSolution {
    if (!this.motor) throw new Error('El motor del atacante no está vinculado.');
    const enemy = this.targets.find(candidate => candidate.id === target.id)!;
    const attackerBefore = { ...this.motor.requestedVelocity }, targetBefore = { ...(this.impactVelocities.get(enemy.id) ?? enemy.motor.actualVelocity) };
    const solution = solveImpact(this.motor.massKg, enemy.motor.massKg, attackerBefore, targetBefore, normal);
    const momentum = { x: solution.normal.x * solution.impulseKgMs, y: solution.normal.y * solution.impulseKgMs, z: solution.normal.z * solution.impulseKgMs };
    const attackerApplied = this.motor.applyImpulse({ x: -momentum.x, y: -momentum.y, z: -momentum.z });
    const targetApplied = this.impulseTarget(enemy, momentum);
    this.lastImpact = { ...solution, attackerDelta: attackerApplied, targetDelta: targetApplied, attackerId: this.definition.id, targetId: enemy.id,
      attackerKg: this.motor.massKg, targetKg: enemy.motor.massKg, attackerBefore, targetBefore,
      attackerAfter: { x: attackerBefore.x + attackerApplied.x, y: attackerBefore.y + attackerApplied.y, z: attackerBefore.z + attackerApplied.z },
      targetAfter: { x: targetBefore.x + targetApplied.x, y: targetBefore.y + targetApplied.y, z: targetBefore.z + targetApplied.z },
      targetStart: { ...enemy.motor.feet } };
    if (solution.impulseKgMs > 0) { this.impactCount++; this.lastImpactAt = this.abilities.time; }
    return solution;
  }

  prepare(dt: number): MotionModifiers {
    for (const target of this.opponent ? [] : this.targets) {
      if (target.health <= 0) continue;
      const from = this.targetCenter(target), to = { ...this.feet, y: this.feet.y + this.definition.collision.height * 0.5 };
      const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      const canShoot = this.health > 0 && distance <= TRAINING.projectileRange && lineClear(from, to, this.boxes);
      const intent: TrainingIntent = this.trainingEnabled ? target.controller.step(dt, target.motor, target.health, canShoot) : { input: { forward: 0, right: 0 }, fire: false };
      target.motor.update(intent.input, 0, dt, { verticalImpulse: intent.verticalImpulse });
      if (intent.fire) this.enemyProjectiles.fire(target.id, this.definition.id, from, to);
    }
    const modifiers: MotionModifiers = { speedMultiplier: 1 };
    for (const attack of this.attacks.values()) {
      const next = attack.prepare?.(dt);
      if (!next) continue;
      modifiers.speedMultiplier! *= next.speedMultiplier ?? 1;
      if (next.planarDisplacement) modifiers.planarDisplacement = {
        x: (modifiers.planarDisplacement?.x ?? 0) + next.planarDisplacement.x,
        z: (modifiers.planarDisplacement?.z ?? 0) + next.planarDisplacement.z,
      };
      if (next.verticalImpulse !== undefined) modifiers.verticalImpulse = next.verticalImpulse;
    }
    return modifiers;
  }

  afterPhysics(dt: number): void {
    for (const attack of this.attacks.values()) attack.afterPhysics?.(dt);
    this.heat.advance(dt, this.targets, (target, amount) => { this.damageTarget(target, amount, 'thermal'); });
    if (this.trainingEnabled && this.motor) {
      const feet = this.motor.feet, collision = this.definition.collision, radius = TRAINING.projectileRadius;
      const playerBox: StaticBox = { id: this.definition.id, style: 'obstacle', center: { x: feet.x, y: feet.y + collision.height / 2, z: feet.z },
        halfExtents: { x: (collision.width ?? collision.radius * 2) / 2 + radius, y: collision.height / 2 + radius, z: (collision.depth ?? collision.radius * 2) / 2 + radius } };
      this.enemyProjectiles.update(dt, this.boxes, playerBox, projectile => {
        const armored = this.abilities.active('armor');
        const damage = this.receiveDamage(TRAINING.projectileDamage, ['projectile']);
        const enemy = this.targets.find(target => target.id === projectile.ownerId);
        if (enemy) enemy.projectileHits++;
        this.lastProjectileHit = { ownerId: projectile.ownerId, targetId: this.definition.id, damage, armored };
      });
    }
    this.abilities.advance(dt);
    if (this.probeEnabled && this.abilities.time >= this.nextProbe) {
      this.nextProbe = this.abilities.time + COMBAT.probeInterval;
      const probe = { x: 8.5, y: 1.2, z: 8.5 };
      if (lineClear(probe, { ...this.feet, y: this.feet.y + 0.8 }, this.boxes)) this.receiveDamage(COMBAT.probeDamage, ['projectile']);
    }
  }

  receiveDamage(amount: number, types: readonly DamageType[] = ['environment']): number {
    let multiplier = 1;
    for (const attack of this.attacks.values()) multiplier *= attack.damageMultiplier?.(types) ?? 1;
    this.lastDamage = Math.max(0, amount) * multiplier;
    this.health = Math.max(0, this.health - this.lastDamage);
    if (this.health === 0) { this.abilities.enabled = false; this.onDefeated(); }
    return this.lastDamage;
  }

  targetCenter(target: TestTarget): Vec3 { const feet = target.motor.feet; return { x: feet.x, y: feet.y + (this.opponent ? this.opponent.definition.collision.height / 2 : 0.7), z: feet.z }; }
  reset(): void {
    this.abilities.reset(); this.heat.reset(); this.enemyProjectiles.reset(); this.health = this.definition.health; this.lastDamage = 0; this.lastImpact = null; this.impactCount = 0; this.lastImpactAt = -Infinity; this.lastProjectileHit = null; this.nextProbe = COMBAT.probeInterval;
    for (const attack of this.attacks.values()) attack.reset?.();
    for (const target of this.targets) { target.motor.reset(target.spawn); target.controller.reset(); target.health = target.maximum; target.massKg = target.spec.massKg; target.motor.massKg = target.spec.massKg; target.lastDamage = 0; target.lastImpulse = 0; target.lastDeltaV = 0; target.projectileHits = 0; }
  }
  dispose(): void { if (!this.opponent) this.targets.forEach(target => target.motor.dispose()); }
}
