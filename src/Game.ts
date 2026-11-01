import * as THREE from 'three';
import { ARENA, createArenaColliders } from './config/arena';
import { THERMAL_TANK } from './config/creatures';
import { abilityById } from './config/abilities';
import { FixedStep } from './core/FixedStep';
import { StateMachine } from './core/GameState';
import { PlayerInput } from './input/PlayerInput';
import { initializePhysics, PhysicsWorld } from './physics/PhysicsWorld';
import { CharacterMotor } from './physics/CharacterMotor';
import { SceneView } from './render/SceneView';
import { createAvatarView } from './render/AvatarView';
import { CombatView } from './render/CombatView';
import { MinimapView } from './render/MinimapView';
import { FirstPersonCamera } from './camera/FirstPersonCamera';
import { CombatRuntime } from './combat/CombatRuntime';
import { Hud } from './ui/Hud';
import { CombatHud } from './ui/CombatHud';
import { WebSpeechRecognizer } from './voice/WebSpeechRecognizer';
import { VoskRecognizer } from './voice/VoskRecognizer';
import { CommandInterpreter } from './voice/CommandInterpreter';
import { VoicePipeline } from './voice/VoicePipeline';
import { PersonalProfile } from './voice/PersonalProfile';
import { CalibrationSession } from './voice/CalibrationSession';
import type { SpeechPort } from './voice/types';
import { FlameAudio } from './attacks/flamethrower/FlameAudio';
import { AudioOutput } from './audio/AudioOutput';
import { FootstepAudio } from './audio/FootstepAudio';
import { CombatCueAudio } from './audio/CombatCueAudio';
import { HeavyGait } from './identity/HeavyGait';
import { HeavyGaitView } from './identity/HeavyGaitView';
import { ChargeLanding } from './identity/ChargeLanding';
import { LandingAudio } from './audio/LandingAudio';

export async function startCombatDemo(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app'); if (!root) throw new Error('Falta el contenedor principal.');
  const state = new StateMachine();
  let input: PlayerInput | undefined, view: SceneView | undefined, physics: PhysicsWorld | undefined, motor: CharacterMotor | undefined;
  let combat: CombatRuntime | undefined, combatView: CombatView | undefined, minimap: MinimapView | undefined;
  let animationFrame = 0, disposed = false, voiceWanted = false, calibrating = false;
  const clock = new FixedStep(), fpsCamera = new FirstPersonCamera(THERMAL_TANK);
  const equipped = THERMAL_TANK.abilities.map(abilityById);
  let storage: Storage | undefined; try { storage = localStorage; } catch { /* Private mode can block storage. */ }
  const profile = new PersonalProfile(storage, equipped);
  const audioOutput = new AudioOutput(), flameAudio = new FlameAudio(audioOutput), combatCueAudio = new CombatCueAudio(audioOutput);
  const identity = THERMAL_TANK.identity;
  const gait = identity ? new HeavyGait(identity.stride) : undefined;
  const footsteps = identity ? new FootstepAudio(audioOutput, identity) : undefined;
  const landing = identity ? new ChargeLanding() : undefined;
  const landingAudio = identity ? new LandingAudio(audioOutput, identity.soundBase + '/heavy-landing.wav') : undefined;
  let gaitView: HeavyGaitView | undefined;
  const browserSpeech = new WebSpeechRecognizer(), localSpeech = new VoskRecognizer();
  let speech: SpeechPort = localSpeech;
  let speechState = 'off', speechSignature = '';
  const calibration = new CalibrationSession();
  const pipeline = new VoicePipeline(new CommandInterpreter(equipped, profile.aliases), (id, requestId) => combat?.activate(id, requestId) ?? { accepted: false, reason: 'El motor está cargando.', abilityId: id, startedAt: null });
  const previous = new THREE.Vector3(ARENA.spawn.x, ARENA.spawn.y, ARENA.spawn.z), current = previous.clone(), interpolated = previous.clone();
  const hud = new Hud(root, THERMAL_TANK, { enter: () => { void enter(); }, reset, pause: () => input?.unlock() });
  const combatHud = new CombatHud(root, THERMAL_TANK, {
    pause: () => input?.unlock(),
    volume: value => audioOutput.setVolume(value),
    enable: () => { voiceWanted = true; calibrating = false; calibration.cancel(); startVoice(); },
    disable: () => { voiceWanted = false; calibrating = false; calibration.cancel(); speech.stop(); pipeline.clearPending(); },
    install: () => { void browserSpeech.installLocal(combatHud.settings().language).then(ok => hud.notify(ok ? 'Idioma local instalado. Puedes activarlo.' : 'No se pudo instalar el idioma.')).catch(error => hud.notify(String(error))); },
    trial: expected => {
      if (!voiceWanted) { hud.notify('Primero activa el micrófono desde Configurar voz.'); return; }
      calibrating = true; input?.unlock(); combat?.setEnabled(false); pipeline.clearPending();
      calibration.begin(expected, performance.now()); combatHud.trialStarted(); startVoice();
    },
    alias: (id, text) => {
      const error = profile.add(id, text);
      pipeline.interpreter = new CommandInterpreter(equipped, profile.aliases);
      hud.notify(error ?? 'Alias personal guardado. Se aplicará al volver a activar la escucha.');
    },
    clearAliases: () => { profile.clear(); pipeline.interpreter = new CommandInterpreter(equipped); hud.notify('Alias personales borrados.'); },
    export: includeText => {
      const report = { version: '0.5.2', kind: 'local-session-observations', acousticValidation: 'Human evaluation must be performed and labelled separately from synthetic tests.', settings: combatHud.settings(), summary: { accepted: pipeline.accepted, rejected: pipeline.rejected }, records: pipeline.records.map(record => ({ ...record, text: includeText ? record.text : undefined, normalized: includeText ? record.normalized : undefined, matchedAlias: includeText ? record.matchedAlias : undefined, structure: record.structure })), calibration: { summary: calibration.summary(), trials: calibration.trials.map(trial => ({ ...trial, text: includeText ? trial.text : undefined })) }, aliases: profile.aliases, timing: 'performance.now(), milliseconds, observed events; logical activation is not audio round-trip latency' };
      const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'alalas-voice-session.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

  for (const port of [browserSpeech, localSpeech]) {
    port.onStatus = status => { if (speech === port) { speechState = status.state; combatHud.recognition(status); } };
    port.onTranscript = transcript => {
      if (speech !== port) return;
      combatHud.preview(transcript.text);
      if (calibrating) calibration.receive(transcript, pipeline.interpreter);
      else pipeline.receive(transcript);
    };
    port.onSpeechEnd = at => { if (speech === port && !calibrating) pipeline.speechEnd(at); };
  }
  pipeline.onPreview = text => combatHud.preview(text);
  flameAudio.onError = message => hud.notify(message);
  audioOutput.onError = message => hud.notify(message);
  if (footsteps) footsteps.onError = message => hud.notify(message);
  if (landingAudio) landingAudio.onError = message => hud.notify(message);
  const announced = new Set<string>();
  pipeline.onRecord = record => {
    combatHud.record(record, pipeline.accepted, pipeline.rejected);
    if (record.status === 'accepted' && record.abilityId && !announced.has(record.id)) { announced.add(record.id); if (announced.size > 300) announced.delete(announced.values().next().value!); hud.notify(`${abilityById(record.abilityId).name} · orden recibida`); }
  };
  calibration.onTrial = trial => combatHud.trialResult(trial, calibration.trials.length);

  function startVoice(): void {
    if (!voiceWanted || disposed) return;
    const settings = combatHud.settings();
    const desired = settings.engine === 'vosk' ? localSpeech : browserSpeech;
    const signature = JSON.stringify({ ...settings, phrases: pipeline.interpreter.phrases });
    if (speech === desired && speechState === 'listening' && speechSignature === signature) return;
    if (speech !== desired) { speech.stop(); speech = desired; }
    speechSignature = signature;
    pipeline.clearPending(); pipeline.mode = settings.mode;
    void speech.start({ language: settings.language, localOnly: settings.engine !== 'browser', phrases: pipeline.interpreter.phrases });
  }

  async function enter(): Promise<void> {
    if (!input || !motor) return;
    audioOutput.unlock(); flameAudio.prepare(); footsteps?.prepare(); landingAudio?.prepare();
    // A calibration utterance must never spill into live combat. Keep the loaded model,
    // but start a fresh input/recognizer session when crossing this boundary.
    if (calibrating) { speech.stop(); pipeline.clearPending(); }
    calibrating = false; calibration.cancel();
    try { await input.lock(); } catch (error) { hud.notify(error instanceof Error ? error.message : 'No se pudo capturar el ratón.'); }
  }

  function reset(): void {
    if (!motor) return;
    calibrating = false; calibration.cancel(); input?.unlock(); speech.stop(); pipeline.clearPending();
    flameAudio.reset(); combatCueAudio.reset();
    footsteps?.silence(); landingAudio?.silence(); gait?.reset(); landing?.reset();
    motor.reset(ARENA.spawn); combat?.reset(); combat?.setEnabled(false); fpsCamera.reset(); clock.reset();
    previous.set(motor.feet.x, motor.feet.y, motor.feet.z); current.copy(previous); fpsCamera.update(motor.feet);
    hud.notify('Ensayo restablecido: integridad, enemigos, recargas y posición.');
  }

  const dispose = (): void => {
    if (disposed) return; disposed = true; cancelAnimationFrame(animationFrame);
    input?.dispose(); browserSpeech.dispose(); localSpeech.dispose(); combatHud.dispose(); flameAudio.dispose(); combatCueAudio.reset(); footsteps?.dispose(); landingAudio?.dispose(); audioOutput.dispose();
    minimap?.dispose(); if (view) combatView?.dispose(view.scene); combat?.dispose(); motor?.dispose(); physics?.dispose(); view?.dispose();
  };
  window.addEventListener('pagehide', dispose, { once: true }); if (import.meta.hot) import.meta.hot.dispose(dispose);
  try {
    view = new SceneView(hud.canvas, ARENA, aspect => fpsCamera.resize(aspect));
    hud.canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); state.set('error'); combat?.setEnabled(false); input?.unlock(); speech.stop(); hud.fatal('Se perdió el contexto gráfico. Recarga la página.'); });
    view.render(view.overview); await initializePhysics(); if (disposed) return;
    const colliders = createArenaColliders(ARENA);
    physics = new PhysicsWorld(colliders); motor = new CharacterMotor(physics, THERMAL_TANK, ARENA.spawn);
    combat = new CombatRuntime(THERMAL_TANK, physics, colliders, ARENA.spawn);
    combat.attachMotor(motor);
    combat.onDefeated = () => { input?.unlock(); hud.notify('Sin integridad. Pulsa Reiniciar posición para preparar otra prueba.'); };
    const avatar = await createAvatarView(THERMAL_TANK); if (disposed) return;
    if (identity) gaitView = new HeavyGaitView(avatar, identity.bodySettle);
    avatar.traverse(object => { if (object instanceof THREE.Mesh) object.layers.set(1); });
    view.overview.layers.enable(1); view.scene.add(avatar); avatar.position.copy(current);
    try { await view.loadReference(); } catch (error) { console.warn('Referencia:', error); hud.notify('Un recurso de referencia no cargó. Se mantiene la geometría y sus colisiones.'); }
    if (disposed) return;
    combatView = new CombatView(view.scene, combat); minimap = new MinimapView(view.scene, combatHud.minimap);
    input = new PlayerInput(hud.canvas, locked => {
      if (state.value === 'error') return;
      state.set(locked ? 'playing' : 'paused'); combat?.setEnabled(locked);
      if (!locked) flameAudio.sync(combat?.abilities.active('flamethrower') ?? false, false);
      if (!locked) {
        footsteps?.silence(); landingAudio?.silence();
        motor?.stop(); clock.reset(); pipeline.clearPending(); if (!calibrating) speech.stop();
        if (motor) { previous.set(motor.feet.x, motor.feet.y, motor.feet.z); current.copy(previous); }
      } else { calibrating = false; calibration.cancel(); startVoice(); }
      hud.state(state.value);
    }, message => hud.notify(message));
    hud.ready(); fpsCamera.update(motor.feet);
    let last = performance.now(), uiTime = 0, fpsTime = 0, fpsFrames = 0, displayFps = 0, lastDraw = -Infinity;
    const render = (time: number): void => {
      if (disposed || !view || !physics || !motor || !input || !combat) return;
      const frame = Math.max(0, (time - last) / 1000); last = time; fpsTime += frame;
      if (fpsTime >= 0.5) { displayFps = fpsFrames / fpsTime; fpsTime = 0; fpsFrames = 0; }
      if (state.value === 'playing' && combat.health > 0) {
        const look = input.consumeLook(); fpsCamera.look(look.x, look.y); combat.probeEnabled = combatHud.probe;
        const alpha = clock.advance(frame, dt => {
          previous.copy(current); combat!.aim(motor!.feet, fpsCamera.yaw, fpsCamera.pitch);
          const modifiers = combat!.prepare(dt); motor!.update(input!.movement(), fpsCamera.yaw, dt, modifiers); physics!.step(dt);
          combat!.aim(motor!.feet, fpsCamera.yaw, fpsCamera.pitch); combat!.afterPhysics(dt);
          const chargingImpulse = combat!.abilities.active('charge') && combat!.abilities.elapsed('charge') >= (abilityById('charge').windup ?? 0);
          const step = gait?.advance(dt, motor!.feet, motor!.grounded, !combat!.abilities.active('charge_dash') && !chargingImpulse);
          if (step !== null && step !== undefined) footsteps?.play(step);
          const landed = landing?.advance(dt, motor!.feet.y, motor!.grounded, chargingImpulse);
          if (landed) landingAudio?.play(landed.intensity);
          current.set(motor!.feet.x, motor!.feet.y, motor!.feet.z);
        });
        interpolated.lerpVectors(previous, current, alpha); fpsCamera.update(interpolated); avatar.position.copy(interpolated);
        if (gait && identity && combatHud.weightMotion) {
          const since = gait.time - gait.lastImpact;
          if (since >= 0 && since < 0.25) fpsCamera.camera.position.y -= Math.sin(since / 0.25 * Math.PI) * Math.exp(-since * 9) * identity.cameraImpact;
        }
        if (combatHud.weightMotion) {
          const sinceImpact = combat.abilities.time - combat.lastImpactAt;
          if (sinceImpact >= 0 && sinceImpact < 0.26) fpsCamera.camera.position.y -= Math.sin(sinceImpact / 0.26 * Math.PI) * 0.06;
          const sinceLanding = landing ? landing.time - landing.lastAt : Infinity;
          if (sinceLanding >= 0 && sinceLanding < 0.38 && landing?.lastImpact) {
            const envelope = Math.exp(-sinceLanding * 5) * (1 - sinceLanding / 0.38) * landing.lastImpact.intensity;
            fpsCamera.camera.position.y -= Math.sin(sinceLanding * 30) * 0.15 * envelope;
            fpsCamera.camera.rotation.x += Math.sin(sinceLanding * 23) * 0.022 * envelope;
          }
        }
        const yawDifference = Math.atan2(Math.sin(fpsCamera.yaw - avatar.rotation.y), Math.cos(fpsCamera.yaw - avatar.rotation.y));
        avatar.rotation.y += yawDifference * (1 - Math.exp(-THERMAL_TANK.movement.turnSpeed * frame));
      }
      if (state.value === 'playing' || time - lastDraw >= 250) {
        if (gait) gaitView?.update(gait, state.value === 'playing' ? motor.speed : 0);
        combatView?.update(); view.render(state.value === 'ready' ? view.overview : fpsCamera.camera);
        minimap?.render(time, motor.feet, fpsCamera.yaw); fpsFrames++; lastDraw = time;
      }
      calibration.expire(time);
      flameAudio.sync(combat.abilities.active('flamethrower'), state.value === 'playing');
      combatCueAudio.sync(state.value === 'playing', combat.barrageShotsFired, combat.abilities.active('charge'), combat.abilities.elapsed('charge'), abilityById('charge').windup ?? 0, combat.impactCount);
      if (time - uiTime > 100) { hud.telemetry(motor.feet, motor.speed, motor.grounded, displayFps, fpsCamera.yaw); combatHud.update(combat); uiTime = time; }
      animationFrame = requestAnimationFrame(render);
    };
    animationFrame = requestAnimationFrame(render);
  } catch (error) { state.set('error'); console.error(error); speech.stop(); hud.fatal(error instanceof Error ? error.message : 'No se pudo iniciar el motor.'); }
}
