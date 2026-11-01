export type GameState = 'ready' | 'playing' | 'paused' | 'error';

export class StateMachine {
  private current: GameState = 'ready';
  get value(): GameState { return this.current; }
  set(value: GameState): void { this.current = value; }
}
