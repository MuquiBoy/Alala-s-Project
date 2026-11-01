import { TRAINING, type TrainingEnemySpec } from '../config/training';
import type { MovementInput } from '../input/PlayerInput';
import type { CharacterMotor } from '../physics/CharacterMotor';

export type TrainingState = 'passive' | 'retaliating' | 'recovering' | 'jumping' | 'defeated';
export interface TrainingIntent { input: MovementInput; verticalImpulse?: number; fire: boolean }
const quiet: MovementInput = { forward: 0, right: 0 };
const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

/** One reproducible controller per practice creature; no movement or damage rules live in rendering. */
export class TrainingController {
  time = 0;
  aggroRemaining = 0;
  attackerId: string | null = null;
  nextBurstAt = 0;
  nextShotAt = 0;
  shotsRemaining = 0;
  shotsFired = 0;
  recoveryUntil = 0;
  state: TrainingState = 'passive';

  constructor(readonly spec: TrainingEnemySpec) {}

  attacked(sourceId: string): void {
    if (this.spec.kind !== 'magenta') return;
    if (this.aggroRemaining <= 0) this.nextBurstAt = this.time;
    this.aggroRemaining = TRAINING.aggroSeconds;
    this.attackerId = sourceId;
  }

  impacted(deltaSpeed: number): void {
    this.recoveryUntil = Math.max(this.recoveryUntil, this.time + 0.65 + Math.min(1.1, deltaSpeed * 0.07));
  }

  step(dt: number, motor: CharacterMotor, health: number, canShoot: boolean): TrainingIntent {
    this.time += dt;
    this.aggroRemaining = Math.max(0, this.aggroRemaining - dt);
    if (health <= 0) { this.state = 'defeated'; this.shotsRemaining = 0; return { input: quiet, fire: false }; }
    if (this.aggroRemaining <= 0) { this.shotsRemaining = 0; this.attackerId = null; }
    const recovering = this.time < this.recoveryUntil || motor.reactionSpeed > TRAINING.recoverySpeed;
    let input: MovementInput = quiet, verticalImpulse: number | undefined;
    if (!recovering) {
      const deltaX = motor.feet.x - this.spec.spawn.x, deltaZ = motor.feet.z - this.spec.spawn.z;
      if (this.spec.pattern === 'lateral') {
        const phase = this.spec.id === 'M04' ? Math.PI : 0;
        input = { forward: 0, right: clamp((Math.sin(this.time * 0.8 + phase) * 2.1 - deltaX) * 1.4) };
      } else if (this.spec.pattern === 'patrol') {
        const point = Math.floor(this.time / 2.4) % 4;
        const waypoint = [{ x: 1.5, z: 0 }, { x: 1.5, z: -1.5 }, { x: -1.5, z: -1.5 }, { x: -1.5, z: 0 }][point];
        input = { right: clamp((waypoint.x - deltaX) * 1.2), forward: clamp((deltaZ - waypoint.z) * 1.2) };
      } else if (this.spec.pattern === 'jumper') {
        input = { forward: clamp(deltaZ * 0.8), right: clamp((Math.sin(this.time * 1.1) * 2 - deltaX) * 0.9) };
        if (motor.grounded && this.time >= this.nextBurstAt) { verticalImpulse = TRAINING.jumpSpeed; this.nextBurstAt = this.time + TRAINING.jumpInterval; }
      }
    }
    this.state = recovering ? 'recovering' : this.spec.kind === 'green' && !motor.grounded ? 'jumping' : this.aggroRemaining > 0 ? 'retaliating' : 'passive';
    let fire = false;
    if (this.spec.kind === 'magenta' && this.aggroRemaining > 0 && canShoot) {
      if (this.shotsRemaining === 0 && this.time >= this.nextBurstAt) { this.shotsRemaining = TRAINING.shotsPerBurst; this.nextShotAt = this.time; }
      if (this.shotsRemaining > 0 && this.time + 1e-8 >= this.nextShotAt) {
        fire = true; this.shotsFired++; this.shotsRemaining--;
        this.nextShotAt += TRAINING.shotInterval;
        if (this.shotsRemaining === 0) this.nextBurstAt = this.time + TRAINING.burstCooldown;
      }
    }
    return { input, verticalImpulse, fire };
  }

  get nextAttackIn(): number { return this.aggroRemaining <= 0 ? 0 : Math.max(0, this.shotsRemaining > 0 ? this.nextShotAt - this.time : this.nextBurstAt - this.time); }
  reset(): void { this.time = 0; this.aggroRemaining = 0; this.attackerId = null; this.nextBurstAt = 0; this.nextShotAt = 0; this.shotsRemaining = 0; this.shotsFired = 0; this.recoveryUntil = 0; this.state = 'passive'; }
}
