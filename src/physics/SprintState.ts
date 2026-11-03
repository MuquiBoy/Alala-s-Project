import { SPRINT as C } from '../config/sprint';
export class SprintState {
  stamina = C.maximum as number; exhausted = false; active = false; heading = 0; speed = 0; recovery = 0; coasting = false;
  update(dt:number, forward:number, right:number, held:boolean, yaw:number, base:number, enabled:boolean, blocked:boolean): {x:number;z:number}|null {
    if(blocked){this.active=false;this.coasting=false;this.speed=0;}
    const wants=enabled&&!blocked&&held&&forward>0&&!this.exhausted;
    if(wants&&!this.coasting){this.heading=yaw;this.speed=base;this.coasting=true;}
    this.active=wants&&this.stamina>0;
    if(this.active){this.stamina=Math.max(0,this.stamina-C.drain*dt);this.recovery=C.regenDelay;if(this.stamina===0){this.exhausted=true;this.active=false;this.recovery=C.exhaustionDelay;}}
    else {const available=Math.max(0,dt-this.recovery);this.recovery=Math.max(0,this.recovery-dt);this.stamina=Math.min(C.maximum,this.stamina+(this.exhausted?C.exhaustedRegen:C.regen)*available);if(this.exhausted&&this.stamina>=C.restart-1e-6){this.stamina=Math.max(this.stamina,C.restart);this.exhausted=false;}}
    if(!this.coasting)return null;
    const target=this.active?C.speed:forward>0?base:0;
    const rate=(C.speed-base)/(this.active?C.accelerationSeconds:C.brakingSeconds);
    this.speed+=Math.max(-rate*dt,Math.min(rate*dt,target-this.speed));
    // Camera yaw remains free. A/D steer the committed heading; S brakes.
    if(forward>=0)this.heading-=right*C.turnRate*dt;
    const result={x:-Math.sin(this.heading)*this.speed,z:-Math.cos(this.heading)*this.speed};
    if(!this.active&&this.speed<=base+1e-6)this.coasting=false;
    return result;
  }
  reset():void{this.stamina=C.maximum;this.exhausted=this.active=this.coasting=false;this.speed=this.heading=this.recovery=0;}
}
