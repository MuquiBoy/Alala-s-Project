import { THERMAL_TANK } from '../config/creatures';
import { ARENA, createArenaColliders } from '../config/arena';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { CharacterMotor } from '../physics/CharacterMotor';
import { CombatRuntime } from '../combat/CombatRuntime';
import { PVP_SPAWNS, PVP_YAWS, type PlayerCommand, type RoomState } from './protocol';
import type { AbilityId } from '../attacks/types';

/** One authoritative world per two-player room, using the existing attack registry. */
export class Duel {
  readonly physics: PhysicsWorld;
  readonly actors: CombatRuntime[];
  readonly inputs: PlayerCommand[] = PVP_YAWS.map(yaw=>({forward:0,right:0,yaw,pitch:0,active:false}));
  readonly connected = [false,false]; readonly ready = [false,false]; readonly rematch = [false,false];
  readonly entered = [false,false];
  winner: string|null = null; round = 0;
  constructor(readonly id: string) {
    const boxes = createArenaColliders(ARENA); this.physics = new PhysicsWorld(boxes);
    this.actors = PVP_SPAWNS.map((spawn,index)=>{
      const definition = {...THERMAL_TANK,id:`P${index+1}`};
      const motor = new CharacterMotor(this.physics,definition,spawn);
      const combat = new CombatRuntime(definition,this.physics,boxes,spawn,false,[]);combat.attachMotor(motor);
      combat.aim(spawn,PVP_YAWS[index],0);return combat;
    });
    this.actors[0].connectOpponent(this.actors[1],PVP_SPAWNS[1]);
    this.actors[1].connectOpponent(this.actors[0],PVP_SPAWNS[0]);
  }
  get status(): RoomState['status'] {
    if(this.winner)return 'finished';
    if(this.round>0 && !this.connected.every(Boolean))return 'disconnected';
    return this.round>0 ? 'playing':'waiting';
  }
  begin(): void {
    this.round++;this.winner=null;this.rematch.fill(false);
    for(let i=0;i<2;i++){
      this.actors[i].reset(); this.actors[i].motor!.reset(PVP_SPAWNS[i]);
      this.inputs[i]={forward:0,right:0,yaw:PVP_YAWS[i],pitch:0,active:true};
      this.actors[i].aim(this.actors[i].motor!.feet,PVP_YAWS[i],0);this.actors[i].setEnabled(true);
    }
  }
  select(index:number): void { this.ready[index]=true; }
  enter(index:number): void { this.entered[index]=true; if(!this.round && this.ready.every(Boolean) && this.entered.every(Boolean) && this.connected.every(Boolean))this.begin(); }
  vote(index:number): void { if(!this.winner)return;this.rematch[index]=true;if(this.rematch.every(Boolean)&&this.connected.every(Boolean))this.begin(); }
  attack(index:number,id:AbilityId,request:string) {
    if(this.status!=='playing'||!this.inputs[index].active)return {accepted:false,reason:'La partida no está activa.',abilityId:id,startedAt:null};
    return this.actors[index].activate(id,request);
  }
  step(dt:number): void {
    if(this.status!=='playing')return;
    // Capture both velocities before either kinematic controller responds to this tick's contact.
    this.actors.forEach(actor=>actor.captureImpactVelocities());
    for(let i=0;i<2;i++){
      const actor=this.actors[i],input=this.inputs[i];actor.setEnabled(true);actor.aim(actor.motor!.feet,input.yaw,input.pitch);
      const motion=actor.prepare(dt);
      actor.motor!.update(input.active?input:{forward:0,right:0},input.yaw,dt,motion);
    }
    const a=this.actors[0].motor!,b=this.actors[1].motor!;
    // Pairwise sweep supplies the contact when two kinematic box controllers report
    // only ground/platform contacts. These collider rotations stay identity.
    const hit=a.collider.castShape(a.requestedVelocity,b.collider.shape,b.collider.translation(),b.collider.rotation(),b.requestedVelocity,.02,dt,true);
    this.physics.step(dt);
    if(hit){
      a.contacts.push({colliderHandle:b.collider.handle,toi:hit.time_of_impact,normal:{...hit.normal1}});
      b.contacts.push({colliderHandle:a.collider.handle,toi:hit.time_of_impact,normal:{...hit.normal2}});
    }
    for(let i=0;i<2;i++){const actor=this.actors[i];actor.aim(actor.motor!.feet,this.inputs[i].yaw,this.inputs[i].pitch);actor.afterPhysics(dt);}
    const dead=this.actors.map(a=>a.health<=0);
    if(dead.some(Boolean)){this.winner=dead.every(Boolean)?'draw':this.actors[dead[0]?1:0].definition.id;this.actors.forEach(a=>a.setEnabled(false));}
  }
  snapshot(): RoomState {
    return {type:'state',room:this.id,status:this.status,winner:this.winner,round:this.round,connected:[...this.connected],ready:[...this.ready],
      actors:this.actors.map((actor,i)=>({id:actor.definition.id,feet:actor.motor!.feet,velocity:actor.motor!.actualVelocity,grounded:actor.motor!.grounded,health:actor.health,input:{...this.inputs[i]},
        abilities:actor.abilities.networkState(),heat:Array.from(actor.heat.tiles.values()),projectiles:[...actor.barrageProjectiles],impacts:[...actor.barrageImpacts],shots:actor.barrageShotsFired,
        impactCount:actor.impactCount,lastImpactAt:Number.isFinite(actor.lastImpactAt)?actor.lastImpactAt:null,lastImpact:actor.lastImpact}))};
  }
  dispose():void{this.actors.forEach(a=>a.motor!.dispose());this.physics.dispose();}
}
