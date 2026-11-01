import type * as THREE from 'three';
import type { HeavyGait } from './HeavyGait';
/** Visual offsets only. Never changes collider, emitter, aim or movement speed. */
export class HeavyGaitView {
  private readonly parts: { object: THREE.Object3D; baseY: number; phase: number; leg: boolean }[];
  constructor(root: THREE.Group, private readonly settle: number) {
    this.parts=root.children.filter(object=>object.userData.heavyBody || object.userData.heavyLeg).map(object=>({
      object,baseY:object.position.y,phase:object.userData.heavyLeg?.phase ?? 0,leg:!!object.userData.heavyLeg,
    }));
  }
  update(gait: HeavyGait, speed: number): void {
    const walking=Math.min(1,speed/0.6), phase=gait.phase*Math.PI, since=gait.time-gait.lastImpact;
    const impact=since>=0 && since<0.3 ? Math.sin(since/0.3*Math.PI)*Math.exp(-since*8) : 0;
    for(const part of this.parts) {
      if(part.leg) {
        const lift=Math.max(0,Math.sin(phase+part.phase))*walking;
        part.object.position.y=part.baseY+lift*0.045;
        part.object.rotation.x=Math.sin(phase+part.phase)*walking*0.09;
      } else {
        part.object.position.y=part.baseY-impact*this.settle + Math.sin(phase*2)*walking*0.006;
      }
    }
  }
}
