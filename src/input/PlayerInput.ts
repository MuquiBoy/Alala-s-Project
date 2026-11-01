export interface MovementInput { forward: number; right: number }

/** No attack keys or mouse attack actions: input is exclusively locomotion + look. */
export class PlayerInput {
  private readonly keys = new Set<string>();
  private deltaX = 0;
  private deltaY = 0;
  private readonly events = new AbortController();

  constructor(private readonly canvas: HTMLCanvasElement, onLock: (locked: boolean) => void, onError: (message: string) => void) {
    const options = { signal: this.events.signal };
    window.addEventListener('keydown', event => {
      if (!this.locked || event.ctrlKey || event.altKey || event.metaKey) return;
      if (event.code === 'Escape') { this.unlock(); return; }
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) event.preventDefault();
      this.keys.add(event.code);
    }, options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('blur', () => this.unlock(), options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.unlock(); }, options);
    document.addEventListener('mousemove', event => {
      if (this.locked) { this.deltaX += event.movementX; this.deltaY += event.movementY; }
    }, options);
    document.addEventListener('pointerlockchange', () => { this.clear(); onLock(this.locked); }, options);
    document.addEventListener('pointerlockerror', () => onError('La captura del ratón fue rechazada. Haz clic en Reanudar; usa Chrome o Edge y mantén esta pestaña activa.'), options);
  }

  get locked(): boolean { return document.pointerLockElement === this.canvas; }

  async lock(): Promise<void> {
    if (!this.canvas.requestPointerLock) throw new Error('Este navegador no admite Pointer Lock. Abre la demo en Chrome o Edge de escritorio.');
    await this.canvas.requestPointerLock();
  }

  unlock(): void { this.clear(); if (this.locked) document.exitPointerLock(); }
  clear(): void { this.keys.clear(); this.deltaX = 0; this.deltaY = 0; }

  movement(): MovementInput {
    return { forward: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')), right: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')) };
  }

  consumeLook(): { x: number; y: number } {
    const look = { x: this.deltaX, y: this.deltaY };
    this.deltaX = 0; this.deltaY = 0;
    return look;
  }

  dispose(): void { this.unlock(); this.events.abort(); }
}
