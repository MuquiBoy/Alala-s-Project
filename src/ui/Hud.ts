import type { CreatureDefinition, Vec3 } from '../config/types';
import type { GameState } from '../core/GameState';
import { ARENA, arenaWidth } from '../config/arena';

export interface HudActions { enter: () => void; reset: () => void; pause: () => void }

const mark = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="m5 26 11-21 11 21H5Zm7-5h8l-4-8Z" fill="currentColor"/></svg>';
const avatar = `<svg viewBox="0 0 200 132" aria-hidden="true"><ellipse cx="101" cy="112" rx="51" ry="8" fill="#0b130f" opacity=".55"/><path d="m60 89 15-4 3 25-14 1Zm60-2 14-1 4 24-15 1Zm-39 5 12-3 2 24H82Zm63-9 13-2 3 26-14 1Z" fill="#617761"/><path d="m59 66 39-22 43 19 13 24-41 17-48-17Z" fill="#a5bb7d"/><path d="m59 66 44 14 38-17-43-19Z" fill="#cfdfa0"/><path d="m103 80 10 24 41-17-13-24Z" fill="#8ea272"/><path d="m63 36 27-9 26 18-1 28-28 11-28-19Z" fill="#c4d995"/><path d="m63 36 28 13 25-4-26-18Z" fill="#e0e8bc"/><path d="m91 49-4 35 28-11 1-28Z" fill="#b1c188"/><path d="m66 36 1-21 13 17Zm29-6 10-17 3 25Z" fill="#eb9c78"/><path d="m66 53 8 3-1 8-8-3Zm29 4 8-3v8l-8 3Z" fill="#2b4034"/></svg>`;

export class Hud {
  readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLElement;
  private readonly heading: HTMLElement;
  private readonly copy: HTMLElement;
  private readonly enter: HTMLButtonElement;
  private readonly status: HTMLElement;
  private readonly coordinates: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly ground: HTMLElement;
  private readonly fps: HTMLElement;
  private readonly toast: HTMLElement;
  private readonly pause: HTMLButtonElement;
  private toastUntil = 0;

  constructor(root: HTMLElement, definition: CreatureDefinition, actions: HudActions) {
    const arenaMetres = arenaWidth(ARENA);
    const tileCount = ARENA.tilesPerSide ** 2;
    root.innerHTML = `
      <main class="studio">
        <header class="masthead">
          <a class="wordmark" href="./" aria-label="ALALA'S CHILDREN, inicio"><span class="logo">${mark}</span><span>ALALA'S <b>CHILDREN</b><small>EXPERIMENTAL CREATURE ENGINE</small></span></a>
          <div class="build-label"><span class="status-dot"></span> PROTOTIPO LOCAL <i>/</i> <span class="muted">BUILD 0.1.0</span></div>
          <button class="text-button" id="help">GUÍA DE CONTROL <span>↗</span></button>
        </header>
        <section class="section-heading"><div><span class="section-number">01 — FUNDAMENTOS</span><h1>Un nuevo punto de vista<span>.</span></h1></div><div class="arena-label"><span>ENTORNO CONTROLADO</span><b>ARENA / ${arenaMetres} × ${arenaMetres} M</b></div></section>
        <section class="workspace" aria-label="Prototipo de arena en primera persona">
          <div class="viewport">
            <canvas id="world" tabindex="-1" aria-label="Vista 3D. Entra en la arena para moverte con WASD y mirar con el ratón."></canvas>
            <div class="viewport-header"><span class="view-tag"><i></i> <span id="view-name">VISTA GENERAL</span></span><span>REF. 02 <span class="slash">/</span> 1 U = 1 M</span></div>
            <div id="crosshair" class="crosshair" aria-hidden="true"><i></i></div>
            <div class="entry-overlay" id="entry-overlay">
              <div class="entry-content"><span class="entry-eyebrow">ALALA'S CHILDREN / TECH DEMO</span><h2 id="entry-title">Entra en<br>otro cuerpo.</h2><p id="entry-copy">Ocupa el avatar. Recorre el espacio.<br>Esta primera prueba empieza con el movimiento.</p><button id="enter" class="enter-button" disabled><span>CARGANDO MOTOR</span><b>↗</b></button><div class="entry-note"><span class="tiny-key">ESC</span> libera el ratón y pausa</div></div>
              <div class="arena-stamp"><b>${arenaMetres}<span>m</span></b><span>${tileCount} MÓDULOS<br>UN ESPACIO CONTINUO</span></div>
            </div>
            <div class="viewport-footer"><span><i class="corner-mark"></i> <span id="coordinates">X +0.00 · Z +8.50</span></span><span id="fps">— FPS</span></div>
            <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
          </div>
          <aside class="side-panel" aria-label="Estado del avatar">
            <div class="panel-top"><span>SUJETO DE PRUEBA</span><span class="panel-index">01 / 01</span></div>
            <div class="avatar-preview"><div class="preview-grid"></div>${avatar}<span class="preview-tag">GEOMETRÍA PROVISIONAL</span></div>
            <div class="avatar-details"><div class="avatar-title"><h2>${definition.name}</h2><span class="active-badge">ACTIVO</span></div><p>Configuración de movimiento / 01</p>
            <div class="health-line"><span>INTEGRIDAD</span><b>${definition.health}<small> / ${definition.health}</small></b></div><div class="health-bar"><span></span></div>
            <div class="state-line"><span>ESTADO</span><b id="state">EN ESPERA</b></div></div>
            <div class="metrics"><div><span>ALTURA DE OJOS</span><b>${definition.camera.offset.y.toFixed(2)} <small>M</small></b></div><div><span>VELOCIDAD</span><b id="speed">0.00 <small>M/S</small></b></div><div><span>SUPERFICIE</span><b id="ground">EN ESPERA</b></div></div>
            <div class="phase-note"><span class="phase-icon">◌</span><div><b>La voz será la intención.</b><p>Combate por voz previsto para las fases 4 y 5.</p></div></div>
            <div class="mic-state"><span class="mic-icon">♩</span><span>MICRÓFONO INACTIVO</span><b>FASE 4</b></div>
            <div class="panel-bottom"><button id="reset" class="secondary-button">REINICIAR POSICIÓN <span>↺</span></button><button id="pause" class="text-button pause-button" disabled>PAUSAR EXPLORACIÓN</button></div>
          </aside>
        </section>
        <section class="control-strip" aria-label="Controles"><div><span class="control-label">DESPLAZAMIENTO</span><div class="key-group"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><span class="control-description">Movimiento libre</span></div><span class="control-separator"></span><div><span class="mouse-icon">↔</span><span class="control-description">Ratón para mirar y apuntar</span></div><span class="control-separator"></span><div><kbd>ESC</kbd><span class="control-description">Pausar</span></div><div class="physics-note"><span class="status-dot"></span> FÍSICA A 60 HZ</div></section>
        <footer class="project-footer"><span>FASE 1 DE 6 <i>—</i> MOVIMIENTO, ESCALA Y COLISIONES</span><span>UN PROTOTIPO EN CONSTRUCCIÓN <span class="footer-mark">✳</span></span></footer>
      </main>
      <dialog id="help-dialog"><button id="close-help" class="dialog-close" aria-label="Cerrar guía">×</button><span class="section-number">GUÍA / CAMPO DE ENTRENAMIENTO</span><h2>Habita el avatar.</h2><p>Haz clic en <b>Entrar en la arena</b> para capturar el ratón. Usa <b>WASD</b> para desplazarte y mueve el ratón para mirar. Pulsa <b>Esc</b> para pausar y recuperar el cursor.</p><p>La base mide ${arenaMetres} × ${arenaMetres} metros y contiene ${tileCount} casillas de 1 metro. Prueba los límites y la barrera central del modelo nuevo.</p><p>Cuatro enemigos magenta responden con proyectiles sólo después de recibir daño. El enemigo verde salta y sirve de blanco aéreo. Tus cuatro habilidades se activan exclusivamente con la voz.</p><button id="help-done" class="enter-button">ENTENDIDO <b>↗</b></button></dialog>`;
    const element = <T extends HTMLElement>(id: string): T => {
      const found = document.getElementById(id); if (!found) throw new Error(`Falta el elemento ${id}`); return found as T;
    };
    this.canvas = element<HTMLCanvasElement>('world');
    this.overlay = element('entry-overlay'); this.heading = element('entry-title'); this.copy = element('entry-copy');
    this.enter = element<HTMLButtonElement>('enter'); this.status = element('state'); this.coordinates = element('coordinates');
    this.speed = element('speed'); this.ground = element('ground'); this.fps = element('fps'); this.toast = element('toast'); this.pause = element<HTMLButtonElement>('pause');
    this.enter.addEventListener('click', actions.enter); element('reset').addEventListener('click', actions.reset); this.pause.addEventListener('click', actions.pause);
    const dialog = element<HTMLDialogElement>('help-dialog');
    element('help').addEventListener('click', () => { actions.pause(); dialog.showModal(); });
    element('close-help').addEventListener('click', () => dialog.close()); element('help-done').addEventListener('click', () => dialog.close());
  }

  ready(): void { this.enter.disabled = false; this.enter.innerHTML = '<span>ENTRAR EN LA ARENA</span><b>↗</b>'; }

  state(state: GameState): void {
    this.overlay.hidden = state === 'playing';
    this.pause.disabled = state !== 'playing';
    document.querySelector('#crosshair')?.classList.toggle('visible', state === 'playing');
    this.status.textContent = { ready: 'EN ESPERA', playing: 'EXPLORANDO', paused: 'EN PAUSA', error: 'ERROR' }[state];
    const viewName = document.querySelector('#view-name'); if (viewName) viewName.textContent = state === 'ready' ? 'VISTA GENERAL' : 'PRIMERA PERSONA';
    if (state === 'paused') {
      this.heading.innerHTML = 'Tu cuerpo<br>te espera.';
      this.copy.innerHTML = 'Exploración en pausa.<br>Reanuda para capturar el ratón.';
      this.enter.innerHTML = '<span>REANUDAR</span><b>↗</b>';
    }
  }

  telemetry(feet: Vec3, speed: number, grounded: boolean, fps: number, yaw: number): void {
    const signed = (value: number): string => `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
    this.coordinates.textContent = `X ${signed(feet.x)} · Z ${signed(feet.z)}`;
    this.coordinates.dataset.y = feet.y.toFixed(4);
    this.coordinates.dataset.x = feet.x.toFixed(4);
    this.coordinates.dataset.z = feet.z.toFixed(4);
    this.coordinates.dataset.yaw = yaw.toFixed(4);
    this.speed.innerHTML = `${speed.toFixed(2)} <small>M/S</small>`;
    this.ground.textContent = grounded ? 'EN SUELO' : 'GRAVEDAD';
    this.fps.textContent = `${Math.round(fps)} FPS`;
    if (performance.now() > this.toastUntil) this.toast.hidden = true;
  }

  notify(message: string): void { this.toast.textContent = message; this.toast.hidden = false; this.toastUntil = performance.now() + 9000; }

  fatal(message: string): void {
    this.state('error'); this.heading.textContent = 'El motor no pudo iniciar.';
    this.copy.textContent = message; this.enter.disabled = true; this.enter.textContent = 'REVISA LA GUÍA DEL PROYECTO';
  }
}
