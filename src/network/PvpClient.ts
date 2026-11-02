import type { AbilityId } from '../attacks/types';
import type { Activation } from '../combat/AbilitySystem';
import type { CombatRuntime } from '../combat/CombatRuntime';
import type { RoomState, PlayerCommand, ActorState } from './protocol';

export class PvpClient {
  index = -1;
  state?: RoomState;
  latency = 0;
  onState: (state: RoomState) => void = () => {};
  onNotice: (message: string) => void = () => {};
  private socket?: WebSocket;
  private token = '';
  private disposed = false;
  private lastInput = 0;
  private retry?: ReturnType<typeof setTimeout>;
  private ping?: ReturnType<typeof setInterval>;
  private readonly requests = new Set<string>();
  private initializedRound = -1;
  constructor(readonly room: string) { try { this.token = sessionStorage.getItem('alalas-room-'+room) ?? ''; } catch { /* Private mode */ } }
  async connect(): Promise<void> {
    return new Promise((resolve,reject)=>{
      const url = new URL('/duel',location.href);url.protocol=location.protocol==='https:'?'wss:':'ws:';url.searchParams.set('room',this.room);if(this.token)url.searchParams.set('token',this.token);
      const ws=this.socket=new WebSocket(url);let welcomed=false;
      ws.onmessage=event=>{
        const message=JSON.parse(event.data);
        if(message.type==='welcome'){
          this.index=message.index;this.token=message.token;welcomed=true;
          try{sessionStorage.setItem('alalas-room-'+this.room,this.token);}catch{ /* Private mode */ }
          if(this.ping)clearInterval(this.ping);
          this.ping=setInterval(()=>this.send({type:'ping',at:performance.now()}),5000);resolve();
        }else if(message.type==='state'){this.state=message;this.onState(message);}
        else if(message.type==='ack'&&!message.accepted)this.onNotice(message.reason);
        else if(message.type==='pong')this.latency=Math.round(performance.now()-message.at);
      };
      ws.onerror=()=>{if(!welcomed)reject(new Error('No se pudo conectar al servidor PvP. Abre JUGAR.cmd o verifica el enlace.'));};
      ws.onclose=event=>{
        if(this.ping)clearInterval(this.ping);
        if(!welcomed)reject(new Error(event.reason||'No se pudo abrir la sala.'));
        if(this.disposed)return;
        this.onNotice(event.reason||'Conexión interrumpida. Intentando reconectar…');
        if(event.code<4000 && welcomed)this.retry=setTimeout(()=>{void this.connect().catch(error=>this.onNotice(String(error)));},1500);
      };
    });
  }
  get connected():boolean{return this.socket?.readyState===WebSocket.OPEN;}
  send(message:object):void{if(this.connected)this.socket!.send(JSON.stringify(message));}
  input(command:PlayerCommand,force=false):void{
    const now=performance.now();if(!force&&now-this.lastInput<50)return;this.lastInput=now;this.send({type:'input',...command});
  }
  attack(id:AbilityId,requestId:string):Activation{
    const reject=(reason:string):Activation=>({accepted:false,reason,abilityId:id,startedAt:null});
    if(!this.connected||this.state?.status!=='playing')return reject('La sala todavía no está combatiendo.');
    if(this.requests.has(requestId))return reject('Transcripción ya procesada.');
    this.requests.add(requestId);if(this.requests.size>512)this.requests.delete(this.requests.values().next().value!);
    this.send({type:'attack',id,request:requestId.slice(0,80)});
    return {accepted:true,reason:'Orden enviada al servidor; pendiente de validación.',abilityId:id,startedAt:null};
  }
  apply(dt:number,local:CombatRuntime,remote:CombatRuntime):boolean{
    if(!this.state)return false;
    const fresh=this.initializedRound!==this.state.round;this.initializedRound=this.state.round;
    this.applyActor(this.state.actors[this.index],local,dt,fresh);
    this.applyActor(this.state.actors[1-this.index],remote,dt,fresh);
    return fresh;
  }
  private applyActor(snapshot:ActorState,actor:CombatRuntime,dt:number,snap:boolean):void{
    const motor=actor.motor!,current=motor.feet;
    const distance=Math.hypot(current.x-snapshot.feet.x,current.y-snapshot.feet.y,current.z-snapshot.feet.z);
    const alpha=snap||distance>3?1:1-Math.exp(-Math.min(.1,dt)*22);
    const feet={x:current.x+(snapshot.feet.x-current.x)*alpha,y:current.y+(snapshot.feet.y-current.y)*alpha,z:current.z+(snapshot.feet.z-current.z)*alpha};
    const center={...feet,y:feet.y+actor.definition.collision.height/2};motor.body.setTranslation(center,true);motor.body.setNextKinematicTranslation(center);
    motor.actualVelocity=snapshot.velocity;motor.requestedVelocity=snapshot.velocity;motor.grounded=snapshot.grounded;
    actor.health=snapshot.health;actor.aim(feet,snapshot.input.yaw,snapshot.input.pitch);actor.abilities.applyNetwork(snapshot.abilities);
    actor.remoteVisual={projectiles:snapshot.projectiles,impacts:snapshot.impacts,shots:snapshot.shots};
    actor.impactCount=snapshot.impactCount;actor.lastImpactAt=snapshot.lastImpactAt??-Infinity;actor.lastImpact=snapshot.lastImpact;
    actor.heat.tiles.clear();for(const tile of snapshot.heat)actor.heat.tiles.set(tile.id,tile);
  }
  dispose():void{this.disposed=true;if(this.retry)clearTimeout(this.retry);if(this.ping)clearInterval(this.ping);this.socket?.close();}
}
