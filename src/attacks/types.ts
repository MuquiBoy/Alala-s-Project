import type { AbilitySystem } from '../combat/AbilitySystem';
import type { StaticBox, Vec3 } from '../config/types';
import type { CharacterMotor, MotionModifiers } from '../physics/CharacterMotor';
import type { ImpactSolution } from '../physics/CollisionImpulse';
export type AbilityId = 'flamethrower' | 'barrage' | 'armor' | 'charge' | 'armor_guard' | 'charge_dash' | 'thermal_pulse';
export type DamageType = 'projectile' | 'thermal' | 'melee' | 'environment';
export interface VoiceCommand { phrase: string; structure: string }
export interface AbilityDefinition {
  readonly id: AbilityId; readonly name: string; readonly aliases: readonly string[]; readonly commands?: readonly VoiceCommand[];
  readonly description?: string; readonly voiceNouns?: readonly string[];
  readonly exclusiveGroup?: string;
  readonly duration: number; readonly cooldown: number; readonly cooldownFrom: 'start' | 'end';
  readonly range: number; readonly damage: number; readonly damageReduction: number; readonly speedMultiplier: number; readonly distance: number;
  readonly windup?: number; readonly projectileCount?: number; readonly projectileInterval?: number; readonly projectileSpeed?: number;
  readonly assistCone?: number; readonly assistCorrection?: number; readonly heatDuration?: number; readonly heatDamage?: number;
}
export interface TestTarget {
  id: string; motor: CharacterMotor; health: number; maximum: number; spawn: Vec3; massKg: number; radius?: number;
}
/** Live getters bind shared logic to one actor. Mutable state belongs to that actor. */
export interface AttackContext {
  readonly abilities: AbilitySystem; readonly boxes: readonly StaticBox[]; readonly targets: TestTarget[];
  readonly feet: Vec3; readonly yaw: number; readonly origin: Vec3; readonly direction: Vec3; readonly motor: CharacterMotor | null;
  readonly heat: { expose(origin: Vec3, direction: Vec3, range: number, halfAngle: number, boxes: readonly StaticBox[]): void };
  targetCenter(target: TestTarget): Vec3;
  damageTarget(target: TestTarget, amount: number, type: DamageType): number;
  impulseTarget(target: TestTarget, momentum: Vec3): Vec3;
  impactTarget(target: TestTarget, normal: Vec3): ImpactSolution;
}
export interface ProjectileView { position: Vec3; active: boolean }
export interface ImpactView { position: Vec3; age: number }
export interface AttackBehavior {
  onActivate?(): void; prepare?(dt: number): MotionModifiers; afterPhysics?(dt: number): void;
  damageMultiplier?(types: readonly DamageType[]): number; reset?(): void; readonly effectOrigin?: Vec3;
  readonly projectiles?: readonly ProjectileView[]; readonly impacts?: readonly ImpactView[]; readonly shotsFired?: number;
}
export interface AttackRegistration { readonly definition: AbilityDefinition; create(context: AttackContext): AttackBehavior }

