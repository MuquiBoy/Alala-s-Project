import type { AbilitySystem } from '../combat/AbilitySystem';
import type { Vec3 } from '../config/types';
import type { HeatedTile } from '../combat/HeatField';
import type { ImpactView, ProjectileView } from '../attacks/types';
import type { ImpactDiagnostic } from '../combat/CombatRuntime';
export const PVP_SPAWNS: readonly Vec3[] = [{x:-6,y:.08,z:8.5},{x:6,y:.08,z:8.5}];
export const PVP_YAWS = [-Math.PI/2,Math.PI/2];
export interface PlayerCommand { forward: number; right: number; yaw: number; pitch: number; active: boolean; sprint?: boolean }
export interface ActorState {
  id: string; feet: Vec3; velocity: Vec3; grounded: boolean; health: number; input: PlayerCommand;
  sprint: {stamina:number;exhausted:boolean;active:boolean;heading:number;speed:number;recovery:number;coasting:boolean};
  abilities: ReturnType<AbilitySystem['networkState']>; heat: HeatedTile[];
  projectiles: ProjectileView[]; impacts: ImpactView[]; shots: number;
  impactCount: number; lastImpactAt: number | null; lastImpact: ImpactDiagnostic | null;
}
export interface RoomState { type: 'state'; room: string; status: 'waiting'|'playing'|'finished'|'disconnected'; winner: string|null; round: number; actors: ActorState[]; connected: boolean[]; ready: boolean[]; prepared: boolean[]; rematch: boolean[] }
