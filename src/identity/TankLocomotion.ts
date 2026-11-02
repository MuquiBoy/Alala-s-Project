import type { Vec3 } from '../config/types';
import { TANK_LOCOMOTION as config } from '../config/locomotion';

export type GaitName = keyof typeof config.clips;
export interface LocomotionInput {
  velocity: Vec3; forward: number; right: number; aimYaw: number; grounded: boolean; suspended: boolean; coasting?: boolean;
}
export const wrapAngle = (angle: number): number => Math.atan2(Math.sin(angle), Math.cos(angle));
const approach = (value: number, target: number, amount: number): number => value + Math.max(-amount, Math.min(amount, target - value));

/** Presentation only: never constrains FPS aim, motor velocity, collision or attack damage. */
export class TankLocomotion {
  yaw = 0;
  yawRate = 0;
  phase = 0;
  frequency = 0;
  speed = 0;
  moving = false;
  idleTime = 0;
  readonly weights: Record<GaitName, number> = { idle: 1, forward: 0, backward: 0, left: 0, right: 0 };
  constructor(private readonly maxTurnRate: number) {}

  update(dt: number, input: LocomotionInput): void {
    this.idleTime += dt;
    this.speed = Math.hypot(input.velocity.x, input.velocity.z);
    const steering = Math.hypot(input.forward, input.right) > 0;
    this.moving = input.grounded && !input.suspended && this.speed > config.minimumSpeed && (steering || !!input.coasting);
    let reverse = 0, turn = 0;
    if (this.moving) {
      const motionYaw = Math.atan2(-input.velocity.x, -input.velocity.z);
      const desiredYaw = steering ? motionYaw + (input.forward < 0 ? Math.PI : 0) : this.yaw;
      const error = wrapAngle(desiredYaw - this.yaw);
      const targetRate = Math.max(-this.maxTurnRate, Math.min(this.maxTurnRate, error * 3));
      this.yawRate = approach(this.yawRate, targetRate, config.turnAcceleration * dt);
      const rotation = Math.abs(error) < Math.abs(this.yawRate * dt) ? error : this.yawRate * dt;
      this.yaw = wrapAngle(this.yaw + rotation);
      // Backpedal is a genuine authored gait, never a walk played backwards in time.
      reverse = Math.max(0, Math.min(1, (-Math.cos(wrapAngle(motionYaw - this.yaw)) - 0.05) / 0.35));
      turn = Math.min(0.85, Math.abs(this.yawRate) / this.maxTurnRate);
      // Curved travel includes the outside foot's rotational arc, not just root distance.
      this.frequency = (this.speed + Math.abs(this.yawRate) * 1.15) / config.cycleDistance;
      this.phase += this.frequency * dt;
    } else { this.yawRate = 0; this.frequency = 0; }
    const movingWeight = this.moving ? 1 : 0;
    const targets: Record<GaitName, number> = {
      idle: 1 - movingWeight,
      forward: movingWeight * (1 - reverse) * (1 - turn),
      backward: movingWeight * reverse * (1 - turn),
      left: movingWeight * turn * (this.yawRate >= 0 ? 1 : 0),
      right: movingWeight * turn * (this.yawRate < 0 ? 1 : 0),
    };
    const blend = 1 - Math.exp(-dt / config.blendSeconds);
    for (const name of Object.keys(this.weights) as GaitName[]) this.weights[name] += (targets[name] - this.weights[name]) * blend;
  }

  reset(): void {
    this.yaw = this.yawRate = this.phase = this.frequency = this.speed = this.idleTime = 0; this.moving = false;
    for (const name of Object.keys(this.weights) as GaitName[]) this.weights[name] = name === 'idle' ? 1 : 0;
  }
}
