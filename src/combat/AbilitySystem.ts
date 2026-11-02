import { ABILITIES, type AbilityDefinition, type AbilityId } from '../config/abilities';

export type AbilityState = 'ready' | 'active' | 'cooldown' | 'unavailable';
export interface AbilitySnapshot { id: AbilityId; state: AbilityState; remaining: number; total: number }
export type Activation = { accepted: boolean; reason: string; abilityId: AbilityId; startedAt: number | null };

/** Simulation seconds only. Receives identifiers; knows nothing about speech, text, render or DOM. */
export class AbilitySystem {
  time = 0;
  enabled = false;
  private readonly states = new Map<AbilityId, { started: number; ends: number; ready: number }>();
  private readonly requests = new Set<string>();
  private readonly requestOrder: string[] = [];

  constructor(private readonly owned: readonly string[], private readonly definitions: readonly AbilityDefinition[] = ABILITIES, private readonly onStart: (id: AbilityId) => void = () => {}) {}

  request(id: AbilityId, requestId: string): Activation {
    const reject = (reason: string): Activation => ({ accepted: false, reason, abilityId: id, startedAt: null });
    if (this.requests.has(requestId)) return reject('Transcripción ya procesada.');
    this.requests.add(requestId); this.requestOrder.push(requestId);
    if (this.requestOrder.length > 512) this.requests.delete(this.requestOrder.shift()!);
    if (!this.enabled) return reject('La sesión está en pausa o el avatar no está disponible.');
    const definition = this.definitions.find(ability => ability.id === id);
    if (!definition || !this.owned.includes(id)) return reject('El avatar no dispone de esta habilidad.');
    if (definition.exclusiveGroup && this.definitions.some(other => other.id !== id && other.exclusiveGroup === definition.exclusiveGroup && this.active(other.id))) return reject('Otra emisión principal está activa.');
    const state = this.snapshot(id);
    if (state.state !== 'ready') return reject(state.state === 'active' ? 'La habilidad ya se está ejecutando.' : 'Habilidad en recarga.');
    this.states.set(id, { started: this.time, ends: this.time + definition.duration, ready: this.time + (definition.cooldownFrom === 'end' ? definition.duration : 0) + definition.cooldown });
    this.onStart(id);
    return { accepted: true, reason: 'Orden ejecutada.', abilityId: id, startedAt: performance.now() };
  }

  advance(dt: number): void { if (this.enabled) this.time += Math.max(0, dt); }
  active(id: AbilityId): boolean { return (this.states.get(id)?.ends ?? 0) > this.time + 1e-8; }
  elapsed(id: AbilityId): number { return this.time - (this.states.get(id)?.started ?? this.time); }
  overlap(id: AbilityId, dt: number): number {
    const state = this.states.get(id); return state ? Math.max(0, Math.min(this.time + dt, state.ends) - this.time) : 0;
  }

  snapshot(id: AbilityId): AbilitySnapshot {
    const definition = this.definitions.find(ability => ability.id === id)!;
    if (!this.owned.includes(id)) return { id, state: 'unavailable', remaining: 0, total: 0 };
    const state = this.states.get(id);
    if (state && state.ends > this.time + 1e-8) return { id, state: 'active', remaining: state.ends - this.time, total: definition.duration };
    if (state && state.ready > this.time + 1e-8) return { id, state: 'cooldown', remaining: state.ready - this.time, total: definition.cooldown };
    return { id, state: 'ready', remaining: 0, total: 0 };
  }

  reset(): void { this.time = 0; this.states.clear(); this.requests.clear(); this.requestOrder.length = 0; }
  networkState(): { time: number; states: [AbilityId, { started: number; ends: number; ready: number }][] } {
    return { time: this.time, states: Array.from(this.states) };
  }
  applyNetwork(state: ReturnType<AbilitySystem['networkState']>): void {
    this.time = state.time; this.states.clear();
    for (const [id, value] of state.states) this.states.set(id, value);
  }
}
