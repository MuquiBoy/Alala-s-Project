import { abilityById, type AbilityId } from '../config/abilities';
import type { CreatureDefinition } from '../config/types';
import { massUnits } from '../config/mass';
import type { CombatRuntime } from '../combat/CombatRuntime';
import type { CalibrationTrial } from '../voice/CalibrationSession';
import type { RecognitionStatus, VoiceMode, VoiceRecord } from '../voice/types';

const abilitySymbol = (id: AbilityId): string => {
  const paths: Partial<Record<AbilityId, string>> = {
    flamethrower: '<path d="M16 3c2 6-3 7 0 11 1-3 4-4 4-7 6 6 9 15 1 20-1-4-2-5-5-8 0 5-5 5-4 9C1 25 4 16 9 11c-1 5 1 6 2 7-2-7 4-9 5-15Z" fill="currentColor" stroke="none"/>',
    barrage: '<path d="m4 11 7-4m3 1 7-4M3 20l8-5m4 1 8-5M11 28l8-5m3-1 7-4"/><path d="m11 7 2 2-3 2m11-7 2 2-3 2m-9 7 2 2-3 2m13-8 2 2-3 2m-3 9 2 2-3 2m11-8 2 2-3 2"/>',
    armor: '<path d="m16 3 11 4v9c0 6-7 11-11 14C12 27 5 22 5 16V7Z"/><path d="m16 7 7 3v6c0 4-4 8-7 10-3-2-7-6-7-10v-6Z" fill="currentColor" opacity=".3"/>',
    charge: '<path d="m4 5 10 11L4 27m10-22 10 11-10 11m10-22 6 7m-6 15 6-7"/>',
  };
  return `<svg class="ability-symbol" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[id] ?? ''}</svg>`;
};

export interface VoiceSettings { engine: 'vosk' | 'browser' | 'browser-local'; language: 'es-PE' | 'es-ES'; mode: VoiceMode }
export interface CombatHudActions {
  pause: () => void;
  volume: (value: number) => void;
  enable: () => void;
  disable: () => void;
  install: () => void;
  trial: (expected: AbilityId | null) => void;
  alias: (id: AbilityId, text: string) => void;
  clearAliases: () => void;
  export: (includeText: boolean) => void;
}

export class CombatHud {
  readonly minimap: HTMLCanvasElement;
  private lastTranscript = '';
  private lastSignature = '';
  private readonly rows = new Map<AbilityId, HTMLElement>();
  private readonly equipped: readonly AbilityId[];
  private readonly diagnostic: HTMLElement;
  private readonly settingsDialog: HTMLDialogElement;

  constructor(root: HTMLElement, creature: CreatureDefinition, actions: CombatHudActions) {
    this.equipped = creature.abilities;
    const definitions = creature.abilities.map(abilityById);
    root.classList.add('combat-build');
    root.querySelector('.phase-note')?.remove(); root.querySelector('.mic-state')?.remove();
    const details = root.querySelector('.avatar-details>p'); if (details) details.textContent = 'TANQUE CUADRÚPEDO / PROVISIONAL';
    root.querySelector('.section-number')!.textContent = '02 — COMBATE POR VOZ';
    root.querySelector('.section-heading h1')!.innerHTML = 'Tu voz mueve el combate<span>.</span>';
    root.querySelector('.muted')!.textContent = 'MOVESET 2.0';
    root.querySelector('.project-footer>span')!.textContent = 'LABORATORIO DE COMBATE — VOZ + MOVIMIENTO';
    root.querySelector('#entry-copy')!.textContent = 'Tanque cuadrúpedo de 500 kg. Entrena contra cuatro enemigos magenta reactivos y un blanco verde aéreo.';
    const guide = root.querySelector('#help-dialog p:last-of-type');
    if (guide) guide.textContent = 'Di «Lanzallamas», «Ráfaga», «Blindaje» o «Embestida». Los cuatro magenta permanecen pasivos hasta recibir daño y luego responden con proyectiles. El verde salta y no ataca. Activa la voz antes de entrar. Esc pausa y cierra el micrófono; al reanudar vuelve a escuchar si lo autorizaste. Diagnóstico muestra masa, impulso y estados de entrenamiento.';
    root.querySelector('.metrics')!.insertAdjacentHTML('afterend','<div class="stamina-module"><label for="stamina">RESISTENCIA · SHIFT + W</label><progress id="stamina" max="100" value="100"></progress><span id="stamina-state">LISTO · 100</span></div>');
    const toolbar = document.createElement('div'); toolbar.className = 'session-toolbar';
    toolbar.innerHTML = '<div class="voice-status"><i id="mic-dot"></i><span id="voice-state">MICRÓFONO INACTIVO</span></div><span id="voice-confirmation">DI «LANZALLAMAS» · «RÁFAGA» · «BLINDAJE» · «EMBESTIDA»</span><button id="voice-settings" class="secondary-button">CONFIGURAR VOZ</button><button id="debug-toggle" class="text-button" aria-expanded="false">DIAGNÓSTICO</button>';
    root.querySelector('.workspace')!.before(toolbar);
    const abilities = document.createElement('section'); abilities.className = 'ability-list'; abilities.setAttribute('aria-label', 'Habilidades por voz');
    abilities.innerHTML = '<div class="ability-heading">HABILIDADES <span>SOLO VOZ</span></div>' + definitions.map((ability, i) => `<div class="ability-row" id="ability-${ability.id}" data-state="ready"><span class="ability-number">0${i + 1}</span><div><b>${ability.name}</b><small class="ability-description">${ability.description ?? ''}</small><small class="ability-status">Disponible</small></div><span class="ability-clock">●</span><i></i></div>`).join('');
    root.querySelector('.panel-bottom')!.before(abilities);
    const thirdPerson = document.createElement('section'); thirdPerson.className = 'third-person-section';
    thirdPerson.innerHTML = '<div class="ability-heading">TERCERA PERSONA <span>APOYO VISUAL / EN VIVO</span></div><div class="avatar-preview"></div>';
    root.querySelector('.panel-bottom')!.before(thirdPerson);
    const minimap = document.createElement('section'); minimap.className = 'minimap-section';
    minimap.hidden = true;
    minimap.innerHTML = '<div class="ability-heading">CÁMARA CENITAL <span>3D EN VIVO</span></div><canvas id="minimap" aria-label="Cámara cenital de la misma arena"></canvas><div class="map-legend"><span>▲ TÚ</span><span>● ENEMIGOS</span><span>N ↑</span></div>';
    root.querySelector('.panel-bottom')!.before(minimap);
    this.minimap = minimap.querySelector('canvas')!;
    for (const ability of definitions) {
      const row = abilities.querySelector<HTMLElement>(`#ability-${ability.id}`)!;
      row.insertAdjacentHTML('afterbegin', abilitySymbol(ability.id));
      row.insertAdjacentHTML('beforeend', '<span class="activation-corners" aria-hidden="true"></span>');
      row.title = `${ability.name}: ${ability.description ?? ''}. Activación por voz.`;
      this.rows.set(ability.id, row);
    }
    const diagnostic = document.createElement('section'); diagnostic.className = 'diagnostic-panel'; diagnostic.id = 'diagnostics'; diagnostic.hidden = true;
    diagnostic.innerHTML = `<div class="diagnostic-title"><h2>Diagnóstico de voz</h2><span>Sin grabación de audio · datos sólo en esta sesión</span></div><div class="diagnostic-metrics"><div><small>RECONOCEDOR</small><b id="diag-recognizer">Detenido</b></div><div><small>ACEPTADAS / RECHAZADAS</small><b id="diag-count">0 / 0</b></div><div><small>RECONOCIMIENTO OBSERVADO</small><b id="diag-asr">—</b></div><div><small>TRANSCRIPCIÓN → ACTIVACIÓN LÓGICA</small><b id="diag-latency">—</b></div></div><div class="diagnostic-log"><span>ÚLTIMA TRANSCRIPCIÓN</span><p id="diag-transcript">—</p><span>INTERPRETACIÓN</span><p id="diag-result">—</p></div><div class="calibration"><h3>Calibración de vocabulario</h3><p>Con la partida en pausa, selecciona lo que vas a decir y toma una muestra. Aquí ninguna transcripción activa ataques. Incluye pruebas de conversación para detectar activaciones incorrectas.</p><div class="calibration-controls"><label>Resultado esperado<select id="trial-expected">${definitions.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}<option value="none">Conversación / ninguna habilidad</option></select></label><button id="take-trial" class="secondary-button">TOMAR MUESTRA (10 S)</button></div><p id="trial-feedback">Pendiente de tus pruebas con micrófono.</p><div class="calibration-controls"><label>Alias personal confirmado<input id="personal-alias" maxlength="40" placeholder="Ej.: corasa" autocomplete="off"></label><button id="save-alias" class="secondary-button">GUARDAR ALIAS</button><button id="clear-aliases" class="text-button">BORRAR ALIAS PERSONALES</button></div><p>Este ajuste adapta el vocabulario. No entrena pesos acústicos ni garantiza reconocer todos los acentos.</p></div><div class="diagnostic-export"><label><input id="probe-enabled" type="checkbox"> Ensayo de daño: una baliza causa 12 puntos cada 3 s si hay visión directa. Blindaje reduce daño térmico o de proyectil en un 75%.</label><label><input id="include-transcripts" type="checkbox"> Incluir transcripciones en el informe local</label><button id="export-voice" class="secondary-button">DESCARGAR INFORME JSON</button></div><div id="target-report" class="target-report"></div>`;
    root.querySelector('.control-strip')!.after(diagnostic); this.diagnostic = diagnostic;
    diagnostic.querySelector('#target-report')!.insertAdjacentHTML('beforebegin', '<div class="training-diagnostic"><h3>Física y enemigos de práctica</h3><p id="impact-report">Sin impacto de Embestida.</p><p id="projectile-report">Sin impactos de proyectil enemigo.</p></div>');
    diagnostic.querySelector('.diagnostic-log')!.insertAdjacentHTML('beforeend', '<span>TEXTO NORMALIZADO</span><p id="diag-normalized">—</p><span>ALIAS / ESTRUCTURA</span><p id="diag-match">—</p><span>VALIDACIÓN / TIEMPO DE INTERPRETACIÓN</span><p id="diag-validation">—</p><span>LANZALLAMAS / EMISIÓN / RECARGA</span><p id="diag-flame-state">Disponible · 0.0 s / 0.0 s</p>');
    const dialog = document.createElement('dialog'); dialog.id = 'voice-dialog';
    dialog.innerHTML = '<button id="close-voice" class="dialog-close" aria-label="Cerrar configuración de voz">×</button><span class="section-number">MECÁNICA / VOZ</span><h2>Pronuncia tu intención.</h2><p>Tu teclado mueve el cuerpo. El ratón apunta. Las cuatro habilidades sólo se activan con órdenes de voz.</p><label class="setting-label">Motor<select id="voice-engine"><option value="vosk">Vosk español · local, incluido</option><option value="browser">Web Speech · servicio del navegador</option><option value="browser-local">Web Speech · sólo local (experimental)</option></select></label><label class="setting-label">Idioma<select id="voice-language"><option value="es-PE">Español · Perú</option><option value="es-ES">Español · España</option></select></label><label class="setting-label">Respuesta<select id="voice-mode"><option value="precise">Precisa · espera la frase definitiva</option><option value="responsive">Ágil experimental · parcial estable al terminar de hablar</option></select></label><p id="voice-privacy">Vosk procesa el audio en este equipo con un modelo español ya entrenado. El juego no graba audio. Web Speech puede enviarlo al proveedor del navegador; la opción sólo local no cambia a remoto automáticamente. El modo ágil puede adelantarse a una transcripción que luego cambie.</p><label class="voice-consent"><input id="voice-consent" type="checkbox"> Entiendo cómo se procesa la voz y quiero activar el micrófono.</label><div class="voice-buttons"><button id="enable-voice" class="enter-button" disabled>ACTIVAR MICRÓFONO <b>◉</b></button><button id="disable-voice" class="text-button">DETENER VOZ</button><button id="install-local" class="text-button">INSTALAR IDIOMA WEB SPEECH LOCAL</button></div><p>Di una orden por intervención. Durante el juego puedes seguir moviéndote y apuntando mientras hablas. Esc pausa y detiene la captura.</p>';
    root.append(dialog); this.settingsDialog = dialog;
    dialog.querySelector('.voice-consent')!.insertAdjacentHTML('beforebegin', '<label class="voice-consent"><input id="weight-motion" type="checkbox" checked> Sensación de peso: asentamiento muy leve de la cámara al pisar.</label>');
    dialog.querySelector('.voice-consent')!.insertAdjacentHTML('beforebegin', '<label class="setting-label">Volumen de efectos <output id="sfx-level">35%</output><input id="sfx-volume" type="range" min="0" max="100" value="35" aria-label="Volumen de efectos"></label><p>Para probar la voz, usa auriculares. El sonido del juego y la captura son independientes.</p>');
    const get = <T extends HTMLElement>(id: string): T => root.querySelector<T>(`#${id}`)!;
    get('voice-settings').addEventListener('click', () => { actions.pause(); dialog.showModal(); });
    get('close-voice').addEventListener('click', () => dialog.close());
    get<HTMLInputElement>('voice-consent').addEventListener('change', event => { get<HTMLButtonElement>('enable-voice').disabled = !(event.target as HTMLInputElement).checked; });
    get('enable-voice').addEventListener('click', () => { actions.enable(); dialog.close(); });
    get('disable-voice').addEventListener('click', () => { actions.disable(); dialog.close(); });
    get('install-local').addEventListener('click', actions.install);
    get<HTMLInputElement>('sfx-volume').addEventListener('input', event => { const value = Number((event.target as HTMLInputElement).value); actions.volume(value / 100); get('sfx-level').textContent = value + '%'; });
    get('debug-toggle').addEventListener('click', () => { actions.pause(); diagnostic.hidden = !diagnostic.hidden; get('debug-toggle').setAttribute('aria-expanded', String(!diagnostic.hidden)); });
    get('take-trial').addEventListener('click', () => { const value = get<HTMLSelectElement>('trial-expected').value; actions.trial(value === 'none' ? null : value as AbilityId); });
    get('save-alias').addEventListener('click', () => { const value = get<HTMLSelectElement>('trial-expected').value; if (value !== 'none') actions.alias(value as AbilityId, get<HTMLInputElement>('personal-alias').value); });
    get('clear-aliases').addEventListener('click', actions.clearAliases);
    get('export-voice').addEventListener('click', () => actions.export(get<HTMLInputElement>('include-transcripts').checked));
  }

  settings(): VoiceSettings { return { engine: (document.querySelector('#voice-engine') as HTMLSelectElement).value as VoiceSettings['engine'], language: (document.querySelector('#voice-language') as HTMLSelectElement).value as VoiceSettings['language'], mode: (document.querySelector('#voice-mode') as HTMLSelectElement).value as VoiceMode }; }
  get probe(): boolean { return (document.querySelector('#probe-enabled') as HTMLInputElement).checked; }
  get weightMotion(): boolean { return (document.querySelector('#weight-motion') as HTMLInputElement).checked; }

  recognition(status: RecognitionStatus): void {
    document.querySelector('#voice-state')!.textContent = status.message;
    document.querySelector('#diag-recognizer')!.textContent = `${status.state}: ${status.message}`;
    (document.querySelector('#mic-dot') as HTMLElement).dataset.state = status.state;
  }
  preview(text: string): void { this.lastTranscript = text; document.querySelector('#diag-transcript')!.textContent = text; }

  record(record: VoiceRecord, accepted: number, rejected: number): void {
    this.preview(record.text);
    document.querySelector('#diag-normalized')!.textContent = record.normalized;
    document.querySelector('#diag-match')!.textContent = (record.matchedAlias ?? 'Sin coincidencia') + ' · ' + (record.structure ?? '—');
    document.querySelector('#diag-validation')!.textContent = (record.status === 'accepted' ? 'Aceptada' : 'Rechazada') + ' · ' + record.interpretationMs.toFixed(3) + ' ms';
    document.querySelector('#diag-count')!.textContent = `${accepted} / ${rejected}`;
    document.querySelector('#diag-result')!.textContent = `${record.abilityId ?? 'Sin habilidad'} · ${record.reason}`;
    document.querySelector('#diag-asr')!.textContent = record.speechStartedAt === null ? 'No disponible' : `${(record.transcriptReceivedAt - record.speechStartedAt).toFixed(0)} ms`;
    document.querySelector('#diag-latency')!.textContent = record.effectStartedAt === null ? '—' : `${Math.max(0, record.effectStartedAt - record.transcriptReceivedAt).toFixed(1)} ms`;
    if (record.status === 'accepted' && record.abilityId) document.querySelector('#voice-confirmation')!.textContent = `✓ ${abilityById(record.abilityId).name.toUpperCase()}`;
  }

  trialStarted(): void { document.querySelector('#trial-feedback')!.textContent = 'Escuchando muestra durante 10 segundos. El combate está pausado.'; }
  trialResult(trial: CalibrationTrial, total: number): void {
    const outcomes = { correct: 'Correcta', wrong: 'Habilidad incorrecta', ignored: 'Orden ignorada', timeout: 'Sin resultado en 10 s', 'correct-rejection': 'Conversación rechazada correctamente' };
    document.querySelector('#trial-feedback')!.textContent = `Muestra ${total}: ${outcomes[trial.outcome]} · oído: ${trial.text || '—'}`;
    (document.querySelector('#personal-alias') as HTMLInputElement).value = trial.text;
  }

  update(combat: CombatRuntime): void {
    const snapshots = this.equipped.map(id => combat.abilities.snapshot(id));
    const flame = combat.abilities.snapshot('flamethrower');
    document.querySelector('#diag-flame-state')!.textContent = flame.state + ' · Emisión: ' + (flame.state === 'active' ? flame.remaining.toFixed(1) : '0.0') + ' s · Recarga: ' + (flame.state === 'cooldown' ? flame.remaining.toFixed(1) : '0.0') + ' s';
    const vec = (value: { x: number; y: number; z: number }): string => `(${value.x.toFixed(1)}, ${value.y.toFixed(1)}, ${value.z.toFixed(1)})`;
    const report = document.querySelector('#target-report')!;
    report.textContent = `Avatar 01 · ${massUnits(combat.definition.massKg).toFixed(2)} u = ${combat.definition.massKg} kg · velocidad ${vec(combat.motor?.actualVelocity ?? { x: 0, y: 0, z: 0 })}\n` +
      combat.targets.map(target => `${target.id} ${target.spec.kind} · ${massUnits(target.massKg).toFixed(2)} u = ${target.massKg} kg · ${Math.ceil(target.health)}/${target.maximum} PV · ${target.controller.state}\n` +
        `  pos ${vec(target.motor.feet)} · vel ${vec(target.motor.actualVelocity)} · ${target.motor.grounded ? 'suelo' : 'aire'} · daño ${target.lastDamage.toFixed(1)} · J ${target.lastImpulse.toFixed(1)} · Δv ${target.lastDeltaV.toFixed(1)}\n` +
        `  objetivo ${target.controller.attackerId ?? 'ninguno'} · próximo tiro ${target.controller.nextAttackIn.toFixed(1)} s · tiros ${target.controller.shotsFired} · aciertos ${target.projectileHits}`).join('\n');
    const impact = combat.lastImpact;
    document.querySelector('#impact-report')!.textContent = impact ?
      `Embestida ${impact.attackerId} → ${impact.targetId}: ${impact.attackerKg}/${impact.targetKg} kg · normal ${vec(impact.normal)} · J ${impact.impulseKgMs.toFixed(1)} kg·m/s · cierre ${impact.closingSpeed.toFixed(1)} m/s\n` +
      `antes ${vec(impact.attackerBefore)} / ${vec(impact.targetBefore)} · después ${vec(impact.attackerAfter)} / ${vec(impact.targetAfter)} · desplazamiento del blanco ${Math.hypot(combat.targets.find(target => target.id === impact.targetId)!.motor.feet.x - impact.targetStart.x, combat.targets.find(target => target.id === impact.targetId)!.motor.feet.z - impact.targetStart.z).toFixed(2)} m` : 'Sin impacto de Embestida.';
    const shot = combat.lastProjectileHit;
    document.querySelector('#projectile-report')!.textContent = shot ? `Proyectil ${shot.ownerId} → ${shot.targetId}: ${shot.damage.toFixed(1)} daño · Blindaje ${shot.armored ? 'activo' : 'inactivo'}` : 'Sin impactos de proyectil enemigo.';
    const stamina=combat.motor?.sprint;
    if(stamina){const module=document.querySelector<HTMLElement>('.stamina-module')!;module.dataset.state=stamina.exhausted?'exhausted':stamina.active?'running':stamina.stamina<100?'recovering':'ready';(document.querySelector('#stamina') as HTMLProgressElement).value=stamina.stamina;document.querySelector('#stamina-state')!.textContent=`${stamina.exhausted?stamina.recovery>0?'AGOTADO · ESPERA':'AGOTADO · RECARGA LENTA':stamina.active?'CORRIENDO':stamina.stamina<100?'RECUPERANDO':'LISTO'} · ${Math.ceil(stamina.stamina)}`;}
    const signature = snapshots.map(s => `${s.state}:${s.remaining.toFixed(1)}`).join('|') + ':' + combat.health.toFixed(1) + ':' + combat.targets.map(t => t.health.toFixed(1)).join('|');
    if (signature === this.lastSignature) return; this.lastSignature = signature;
    for (const snapshot of snapshots) {
      const row = this.rows.get(snapshot.id)!; row.dataset.state = snapshot.state;
      const phase = snapshot.id === 'charge' && snapshot.state === 'active' && combat.abilities.elapsed('charge') < (abilityById('charge').windup ?? 0) ? 'Preparando' : snapshot.id === 'barrage' && snapshot.state === 'active' ? `Disparando · ${combat.barrageShotsFired}/50` : snapshot.id === 'armor' && snapshot.state === 'active' ? 'Protección activa' : null;
      row.querySelector('.ability-status')!.textContent = phase ?? { ready: 'Disponible', active: 'Ejecutándose', cooldown: 'En recarga', unavailable: 'No disponible' }[snapshot.state];
      row.querySelector('.ability-clock')!.textContent = snapshot.remaining > 0 ? `${snapshot.remaining.toFixed(1)} s` : '●';
      row.style.setProperty('--progress', `${snapshot.total ? snapshot.remaining / snapshot.total * 100 : 0}%`);
    }
    (document.querySelector('.health-bar>span') as HTMLElement).style.width = `${combat.health / combat.definition.health * 100}%`;
    document.querySelector('.health-line>b')!.textContent = `${Math.ceil(combat.health)} / ${combat.definition.health}`;
    document.querySelector('.viewport')!.classList.toggle('guarding', combat.abilities.active('armor'));
  }

  get transcript(): string { return this.lastTranscript; }
  dispose(): void { this.settingsDialog.close(); this.diagnostic.hidden = true; }
}
