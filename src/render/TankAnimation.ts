import * as THREE from 'three';
import { TANK_LOCOMOTION as config } from '../config/locomotion';
import { TankLocomotion, type GaitName, type LocomotionInput } from '../identity/TankLocomotion';
import type { Vec3 } from '../config/types';

const up = new THREE.Vector3(0, 1, 0);
const point = (object: THREE.Object3D): THREE.Vector3 => object.getWorldPosition(new THREE.Vector3());
const smooth = (t: number): number => t * t * (3 - 2 * t);
interface Leg {
  name: string; phase: number; upper: THREE.Bone; lower: THREE.Bone; foot: THREE.Bone;
  neutral: THREE.Vector3; flat: THREE.Quaternion; ankleHeight: number;
  anchor: THREE.Vector3; start: THREE.Vector3; target: THREE.Vector3; orientation: THREE.Quaternion;
  swinging: boolean; initialized: boolean; travelled: number; error: number;
}
export interface FootContact { foot: string; index: number; strength: number }

/** Five phase-synchronized clips, followed by horizontal aim and two-bone foot placement.
 * World-space stance anchors prevent blended curves from dragging the supporting feet.
 * No vertices, rigid bodies or gameplay parameters are changed here.
 */
export class TankAnimation {
  readonly locomotion: TankLocomotion;
  readonly mixer: THREE.AnimationMixer;
  readonly legs: Leg[];
  readonly head: THREE.Bone;
  private readonly actions: Record<GaitName, THREE.AnimationAction>;
  private readonly headRest: THREE.Quaternion;
  private previous?: THREE.Vector3;
  time = 0;
  lastImpact = -100;
  stepIndex = 0;
  lastFoot = '';
  headYaw = 0;
  private hadGround = false;

  constructor(readonly root: THREE.Group, maxTurnRate: number) {
    this.locomotion = new TankLocomotion(maxTurnRate);
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = Object.fromEntries(Object.entries(config.clips).map(([name, clipName]) => {
      const clip = THREE.AnimationClip.findByName(root.animations, clipName);
      if (!clip) throw new Error(`Falta la animación ${clipName} del Avatar 01.`);
      const action = this.mixer.clipAction(clip).play(); action.paused = true;
      action.setEffectiveWeight(name === 'idle' ? 1 : 0);
      return [name, action];
    })) as Record<GaitName, THREE.AnimationAction>;
    const bone = (name: string): THREE.Bone => {
      const found = root.getObjectByName(name);
      if (!(found instanceof THREE.Bone)) throw new Error(`Falta el hueso ${name}.`);
      return found;
    };
    root.updateMatrixWorld(true);
    this.head = bone('Head_Aim'); this.headRest = this.head.quaternion.clone();
    this.legs = config.feet.map(({ name, phase }) => {
      const foot = bone(`Foot_${name}`), neutral = root.worldToLocal(point(foot));
      return { name, phase, upper: bone(`Upper_${name}`), lower: bone(`Lower_${name}`), foot,
        neutral, ankleHeight: neutral.y, flat: foot.getWorldQuaternion(new THREE.Quaternion()),
        anchor: new THREE.Vector3(), start: new THREE.Vector3(), target: new THREE.Vector3(), orientation: new THREE.Quaternion(),
        swinging: false, initialized: false, travelled: 0, error: 0 };
    });
  }

  update(dt: number, feet: Vec3, input: LocomotionInput): FootContact[] {
    this.time += dt;
    this.locomotion.update(dt, input);
    const state = this.locomotion;
    this.root.position.set(feet.x, feet.y, feet.z); this.root.rotation.y = state.yaw;
    // Explicitly sample all gaits at the same normalized phase, including zero-weight gaits.
    for (const name of Object.keys(this.actions) as GaitName[]) {
      const action = this.actions[name];
      action.time = name === 'idle' ? state.idleTime % action.getClip().duration : (state.phase % 1) * action.getClip().duration;
      action.setEffectiveWeight(state.weights[name]);
    }
    this.mixer.update(0);
    this.headYaw = Math.atan2(Math.sin(input.aimYaw - state.yaw), Math.cos(input.aimYaw - state.yaw));
    // Head_Aim local Y is vertical in the exported rig. Its parent does not inherit Body roll.
    this.head.quaternion.copy(this.headRest).multiply(new THREE.Quaternion().setFromAxisAngle(up, this.headYaw));
    this.root.updateMatrixWorld(true);
    const displacement = this.previous ? Math.hypot(feet.x - this.previous.x, feet.z - this.previous.z) : 0;
    this.previous = new THREE.Vector3(feet.x, feet.y, feet.z);
    const contacts: FootContact[] = [];
    if (!input.grounded || input.suspended || displacement > 0.3) {
      this.legs.forEach(leg => { leg.initialized = false; leg.swinging = false; leg.travelled = 0; });
      this.hadGround = false; return contacts;
    }
    for (const leg of this.legs) {
      const p = ((state.phase - leg.phase) % 1 + 1) % 1;
      const swinging = state.moving && p < config.swingFraction;
      const authored = point(leg.foot);
      if (!leg.initialized || !this.hadGround) {
        leg.anchor.copy(authored); leg.anchor.y = feet.y + leg.ankleHeight;
        leg.target.copy(leg.anchor); leg.start.copy(leg.anchor);
        leg.orientation.copy(new THREE.Quaternion().setFromAxisAngle(up, state.yaw)).multiply(leg.flat);
        leg.initialized = true; leg.swinging = false;
      }
      if (state.moving) leg.travelled += displacement;
      if (swinging) {
        if (!leg.swinging) leg.start.copy(leg.target);
        const u = p / config.swingFraction;
        const halfStance = (1 - config.swingFraction) / Math.max(0.1, state.frequency) / 2;
        const remainingSwing = (config.swingFraction - p) / Math.max(0.1, state.frequency);
        const forecast = Math.min(0.8, halfStance + remainingSwing);
        // Anticipate actual translation and chassis twist. Outer feet naturally take longer arcs.
        const destination = leg.neutral.clone().applyAxisAngle(up, state.yaw + state.yawRate * forecast)
          .add(this.root.position).addScaledVector(new THREE.Vector3(input.velocity.x, 0, input.velocity.z), forecast);
        destination.y = feet.y + leg.ankleHeight;
        leg.target.lerpVectors(leg.start, destination, smooth(u));
        leg.target.y += Math.sin(Math.PI * u) * config.footLift;
        leg.orientation.copy(new THREE.Quaternion().setFromAxisAngle(up, state.yaw)).multiply(leg.flat);
      } else {
        if (leg.swinging) {
          leg.anchor.copy(leg.target);
          if (state.moving && leg.travelled > 0.025) {
            // This is the very same touchdown used by IK, rather than a second sound timer.
            leg.anchor.y = feet.y + leg.ankleHeight;
            const index = this.stepIndex++;
            contacts.push({ foot: leg.name, index, strength: leg.name.startsWith('Front') ? 1 : 0.94 });
            this.lastImpact = this.time; this.lastFoot = leg.name; leg.travelled = 0;
          }
        }
        leg.anchor.y += (feet.y + leg.ankleHeight - leg.anchor.y) * Math.min(1, dt * 20);
        leg.target.copy(leg.anchor);
      }
      leg.swinging = swinging;
      this.solve(leg);
    }
    this.hadGround = true;
    return contacts;
  }

  private solve(leg: Leg): void {
    const hip = point(leg.upper), knee = point(leg.lower), ankle = point(leg.foot);
    const a = hip.distanceTo(knee), b = knee.distanceTo(ankle);
    // If a sudden change exhausts reach, shorten the horizontal placement. A planted
    // foot must stay on the floor rather than being lifted by a radial reach clamp.
    const horizontal = new THREE.Vector3(leg.target.x - hip.x, 0, leg.target.z - hip.z);
    const available = Math.sqrt(Math.max(0, (a + b - 0.007) ** 2 - (leg.target.y - hip.y) ** 2));
    if (horizontal.length() > available) {
      horizontal.setLength(available);
      leg.target.x = hip.x + horizontal.x; leg.target.z = hip.z + horizontal.z;
      if (!leg.swinging) leg.anchor.copy(leg.target);
    }
    const axis = leg.target.clone().sub(hip), rawDistance = axis.length(); axis.normalize();
    const distance = THREE.MathUtils.clamp(rawDistance, Math.abs(a - b) + 0.001, a + b - 0.005);
    const target = hip.clone().addScaledVector(axis, distance);
    // Preserve the authored outward bend; the solver never flips to an inward knee.
    const bend = knee.clone().sub(hip); bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    const along = (a * a - b * b + distance * distance) / (2 * distance);
    const kneeTarget = hip.clone().addScaledVector(axis, along).addScaledVector(bend, Math.sqrt(Math.max(0, a * a - along * along)));
    this.rotateWorld(leg.upper, knee.sub(hip), kneeTarget.sub(hip));
    this.root.updateMatrixWorld(true);
    const newKnee = point(leg.lower);
    this.rotateWorld(leg.lower, point(leg.foot).sub(newKnee), target.sub(newKnee));
    this.root.updateMatrixWorld(true);
    const parent = leg.foot.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
    leg.foot.quaternion.copy(parent.multiply(leg.orientation));
    this.root.updateMatrixWorld(true);
    leg.error = point(leg.foot).distanceTo(leg.target);
    // Reach is bounded: no stretching or morphology changes when a sudden reversal overextends a leg.
    if (leg.error > 0.05 && !leg.swinging) {
      leg.anchor.copy(point(leg.foot)); leg.anchor.y = this.root.position.y + leg.ankleHeight;
      leg.target.copy(leg.anchor);
    }
  }

  private rotateWorld(bone: THREE.Bone, from: THREE.Vector3, to: THREE.Vector3): void {
    const rotation = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(rotation);
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
  }

  reset(): void {
    this.locomotion.reset(); this.previous = undefined; this.hadGround = false;
    this.time = this.stepIndex = this.headYaw = 0; this.lastImpact = -100; this.lastFoot = '';
    this.legs.forEach(leg => { leg.initialized = false; leg.swinging = false; leg.travelled = 0; });
  }
  dispose(): void { this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.root); }
}
