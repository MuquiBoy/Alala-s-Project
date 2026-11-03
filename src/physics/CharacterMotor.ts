import { SprintState } from './SprintState';
import RAPIER from '@dimforge/rapier3d-compat';
import type { CreatureDefinition, Vec3 } from '../config/types';
import { MOTION_PHYSICS } from '../config/physics';
import type { MovementInput } from '../input/PlayerInput';
import type { PhysicsWorld } from './PhysicsWorld';

export function desiredVelocity(input: MovementInput, yaw: number, speed: number): { x: number; z: number } {
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const forward = input.forward / length;
  const right = input.right / length;
  return { x: (right * Math.cos(yaw) - forward * Math.sin(yaw)) * speed, z: (-forward * Math.cos(yaw) - right * Math.sin(yaw)) * speed };
}

export interface MotionModifiers { speedMultiplier?: number; planarDisplacement?: { x: number; z: number }; verticalImpulse?: number }
export interface MotorContact { colliderHandle: number; normal: Vec3; toi: number }

export class CharacterMotor {
  readonly body: RAPIER.RigidBody;
  readonly collider: RAPIER.Collider;
  private readonly controller: RAPIER.KinematicCharacterController;
  private readonly halfHeight: number;
  private velocity = { x: 0, y: 0, z: 0 };
  private reactionVelocity = { x: 0, z: 0 };
  readonly contacts: MotorContact[] = [];
  requestedVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  actualVelocity: Vec3 = { x: 0, y: 0, z: 0 };
  readonly sprint = new SprintState();
  massKg: number;
  grounded = false;

  constructor(private readonly physics: PhysicsWorld, private readonly definition: CreatureDefinition, spawn: Vec3) {
    this.massKg = definition.massKg;
    const { radius, height } = definition.collision;
    const box = definition.collision.width !== undefined && definition.collision.depth !== undefined;
    if (radius <= 0 || height <= 0 || (!box && height < radius * 2)) throw new Error('Dimensiones de colisión no válidas.');
    this.halfHeight = height / 2;
    this.body = physics.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + this.halfHeight, spawn.z));
    this.collider = physics.world.createCollider(box
      ? RAPIER.ColliderDesc.cuboid(definition.collision.width! / 2, this.halfHeight, definition.collision.depth! / 2)
      : RAPIER.ColliderDesc.capsule(this.halfHeight - radius, radius), this.body);
    this.controller = physics.world.createCharacterController(0.01);
    this.controller.setSlideEnabled(true);
    this.controller.setMaxSlopeClimbAngle(Math.PI / 4);
    this.controller.setMinSlopeSlideAngle(Math.PI / 3);
    this.controller.enableSnapToGround(0.15);
  }

  /** Call before PhysicsWorld.step. Rapier shape casts prevent fast translations tunnelling. */
  update(input: MovementInput, yaw: number, dt: number, modifiers: MotionModifiers = {}): void {
    if (modifiers.verticalImpulse !== undefined) this.velocity.y = Math.max(this.velocity.y, modifiers.verticalImpulse);
    const desired = desiredVelocity(input, yaw, this.definition.movement.speed * (modifiers.speedMultiplier ?? 1));
    const sprintVelocity = this.sprint.update(dt,input.forward,input.right,!!input.sprint,yaw,this.definition.movement.speed,this.definition.abilities.includes('charge'),(modifiers.speedMultiplier ?? 1)<1 || !!modifiers.planarDisplacement);
    if(sprintVelocity){this.velocity.x=sprintVelocity.x;this.velocity.z=sprintVelocity.z;desired.x=sprintVelocity.x;desired.z=sprintVelocity.z;}
    else if((modifiers.speedMultiplier ?? 1)<1){const cap=this.definition.movement.speed*(modifiers.speedMultiplier??1);const n=Math.hypot(this.velocity.x,this.velocity.z);if(n>cap){this.velocity.x*=cap/n;this.velocity.z*=cap/n;}}
    const dx = desired.x - this.velocity.x;
    const dz = desired.z - this.velocity.z;
    const length = Math.hypot(dx, dz);
    const moving = input.forward !== 0 || input.right !== 0;
    const rate = moving ? this.definition.movement.acceleration : this.definition.movement.deceleration;
    const factor = length > 0 ? Math.min(1, rate * dt / length) : 0;
    this.velocity.x += dx * factor;
    this.velocity.z += dz * factor;
    this.velocity.y = this.grounded && modifiers.verticalImpulse === undefined ? -0.5 : Math.max(-30, this.velocity.y - 9.81 * dt);
    // Rapier's ground snap must not absorb small but valid upward collision impulses.
    if (this.velocity.y > 0) this.controller.disableSnapToGround();
    else this.controller.enableSnapToGround(0.15);
    const requested = {
      x: (modifiers.planarDisplacement?.x ?? this.velocity.x * dt) + this.reactionVelocity.x * dt,
      y: this.velocity.y * dt,
      z: (modifiers.planarDisplacement?.z ?? this.velocity.z * dt) + this.reactionVelocity.z * dt,
    };
    this.requestedVelocity = { x: requested.x / dt, y: requested.y / dt, z: requested.z / dt };
    this.controller.computeColliderMovement(this.collider, requested);
    const corrected = this.controller.computedMovement();
    this.actualVelocity = { x: corrected.x / dt, y: corrected.y / dt, z: corrected.z / dt };
    this.contacts.length = 0;
    for (let index = 0; index < this.controller.numComputedCollisions(); index++) {
      const collision = this.controller.computedCollision(index);
      if (collision?.collider) this.contacts.push({ colliderHandle: collision.collider.handle, normal: { x: collision.normal2.x, y: collision.normal2.y, z: collision.normal2.z }, toi: collision.toi });
    }
    const position = this.body.translation();
    this.body.setNextKinematicTranslation({ x: position.x + corrected.x, y: position.y + corrected.y, z: position.z + corrected.z });
    this.grounded = this.velocity.y <= 0 && this.controller.computedGrounded();
    if (this.grounded) this.velocity.y = 0;
    const friction = Math.exp(-MOTION_PHYSICS.impulseFrictionPerSecond * dt);
    this.reactionVelocity.x *= friction; this.reactionVelocity.z *= friction;
  }

  get feet(): Vec3 {
    const p = this.body.translation();
    return { x: p.x, y: p.y - this.halfHeight, z: p.z };
  }

  get speed(): number { return Math.hypot(this.velocity.x, this.velocity.z); }
  get airborne(): boolean { return !this.grounded; }
  get reactionSpeed(): number { return Math.hypot(this.reactionVelocity.x, this.reactionVelocity.z); }
  /** Applies momentum in kg·m/s; caps are gameplay stability bounds, not mass multipliers. */
  applyImpulse(momentum: Vec3): Vec3 {
    if (this.massKg <= 0) throw new Error('La masa debe ser positiva.');
    const before = { ...this.reactionVelocity, y: this.velocity.y };
    this.reactionVelocity.x += momentum.x / this.massKg;
    this.reactionVelocity.z += momentum.z / this.massKg;
    const planar = this.reactionSpeed;
    if (planar > MOTION_PHYSICS.maxHorizontalReactionSpeed) {
      const scale = MOTION_PHYSICS.maxHorizontalReactionSpeed / planar;
      this.reactionVelocity.x *= scale; this.reactionVelocity.z *= scale;
    }
    this.velocity.y = Math.max(-MOTION_PHYSICS.maxVerticalReactionSpeed, Math.min(MOTION_PHYSICS.maxVerticalReactionSpeed, this.velocity.y + momentum.y / this.massKg));
    if (momentum.y > 0) this.grounded = false;
    return { x: this.reactionVelocity.x - before.x, y: this.velocity.y - before.y, z: this.reactionVelocity.z - before.z };
  }
  stop(): void { this.sprint.active=false;this.sprint.coasting=false;this.sprint.speed=0; this.velocity = { x: 0, y: 0, z: 0 }; this.reactionVelocity = { x: 0, z: 0 }; this.requestedVelocity = { x: 0, y: 0, z: 0 }; this.actualVelocity = { x: 0, y: 0, z: 0 }; this.contacts.length = 0; }

  reset(spawn: Vec3): void {
    const position = { x: spawn.x, y: spawn.y + this.halfHeight, z: spawn.z };
    this.body.setTranslation(position, true);
    this.body.setNextKinematicTranslation(position);
    this.stop(); this.sprint.reset(); this.grounded = false;
    this.physics.world.step();
  }

  dispose(): void {
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }
}
