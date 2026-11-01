import { describe, expect, it } from 'vitest';
import { FlameSimulation, FLAME_VISUAL } from '../src/attacks/flamethrower/FlameSimulation';
import { CommandInterpreter, normalizeCommand } from '../src/voice/CommandInterpreter';
import { FLAME_COMMANDS } from '../src/attacks/flamethrower/commands';
import { VoicePipeline } from '../src/voice/VoicePipeline';
import { AbilitySystem } from '../src/combat/AbilitySystem';
import { ABILITIES } from '../src/config/abilities';
import { inFlameVolume } from '../src/combat/WorldQueries';
import type { Vec3, StaticBox } from '../src/config/types';
import { COMBAT } from '../src/attacks/shared/tuning';

const positive = ['Lanzallamas', 'Llamas', 'Usa lanzallamas', 'Utiliza lanzallamas', 'Activa lanzallamas', 'Lanza fuego', 'Escupe fuego', 'Ataca con llamas', 'Dispara llamas', 'Usa el lanzallamas', 'Activa el lanzallamas', 'Ataca con el lanzallamas', 'Lanza las llamas', 'Utiliza el ataque lanzallamas', 'Ahora usa lanzallamas', 'Ataca con lanzallamas', 'Contraataca usando lanzallamas', 'Contrataca con fuego', 'Responde con fuego', 'Llamas, llamas', 'Lanza llamas, lanza llamas'];
const negative = ['No uses lanzallamas', 'No quiero usar lanzallamas', '¿Puedo usar lanzallamas?', 'puedo usar lanzallamas', 'Estoy probando si reconoce lanzallamas', 'El ataque se llama lanzallamas', 'Usar', 'Ataca con', 'No ataques', 'ahora no usa lanzallamas', 'quiero usar lanzallamas y coraza'];
describe('intención de Lanzallamas, integrada con el ejecutor', () => {
  it('valida todo el vocabulario exportado sin multiplicar fórmulas de cortesía', () => {
    const interpreter = new CommandInterpreter();
    expect(new Set(FLAME_COMMANDS.map(command => command.phrase)).size).toBe(FLAME_COMMANDS.length);
    expect(FLAME_COMMANDS.length).toBeLessThanOrEqual(80);
    for (const { phrase } of FLAME_COMMANDS) expect(interpreter.interpret(phrase)).toMatchObject({ accepted: true, abilityId: 'flamethrower' });
    expect(interpreter.interpret('por favor usa lanzallamas').accepted).toBe(false);
    expect(interpreter.interpret('usa lanzallamas por favor').accepted).toBe(false);
  });
  it('reduce repeticiones urgentes no enumeradas a una sola intención explícita', () => {
    const interpreter = new CommandInterpreter();
    expect(interpreter.interpret('llamas llamas llamas')).toMatchObject({ accepted: true, abilityId: 'flamethrower' });
    expect(interpreter.interpret('ataca ataca ataca con llamas')).toMatchObject({ accepted: true, abilityId: 'flamethrower' });
  });
  it.each(positive)('activa una sola vez con %s', text => {
    const system = new AbilitySystem(ABILITIES.map(a => a.id)); system.enabled = true;
    const pipeline = new VoicePipeline(new CommandInterpreter(), (id, request) => system.request(id, request));
    const transcript = { id: 'a', text, final: true, receivedAt: performance.now(), confidence: 0.96, speechStartedAt: null, firstInterimAt: null, finalReceivedAt: null };
    pipeline.receive({ ...transcript, final: false }); pipeline.receive(transcript); pipeline.receive(transcript);
    expect(pipeline.accepted).toBe(1); expect(system.snapshot('flamethrower')).toMatchObject({ state: 'active', remaining: 5 });
    expect(pipeline.records[0]).toMatchObject({ matchedAlias: normalizeCommand(text), structure: expect.any(String), interpretationMs: expect.any(Number) });
    pipeline.receive({ ...transcript, id: 'b' }); expect(pipeline.accepted).toBe(1); expect(pipeline.rejected).toBe(1);
  });
  it.each(negative)('rechaza %s', text => expect(new CommandInterpreter().interpret(text).accepted).toBe(false));
});
const origin = { x: 0, y: 1, z: 0 }, forward = { x: 0, y: 0, z: -1 };
const alive = (simulation: FlameSimulation) => simulation.particles.filter(p => p.alpha > 0);
function advance(simulation: FlameSimulation, seconds: number, emitting = true, source: Vec3 = origin, direction: Vec3 = forward, boxes: readonly StaticBox[] = []) {
  for (let i = 0; i < Math.ceil(seconds * 120); i++) simulation.step(1 / 120, emitting, i / 120, source, direction, boxes);
}
describe('partículas independientes del daño', () => {
  it('mantiene el pool acotado, avanza con profundidad y no sobrepasa 10 m', () => {
    const simulation = new FlameSimulation(); advance(simulation, 5);
    const particles = alive(simulation);
    expect(particles.length).toBeGreaterThan(30); expect(particles.length).toBeLessThanOrEqual(FLAME_VISUAL.capacity);
    expect(Math.max(...particles.map(p => -p.position.z))).toBeGreaterThan(8);
    for (const p of particles) {
      expect(Math.hypot(p.position.x, p.position.y - 1, p.position.z) + p.size * 2).toBeLessThan(10);
      expect(inFlameVolume(origin, forward, p.position, 0.001, 10, COMBAT.flameHalfAngle)).toBe(true);
    }
  });
  it('deja terminar las partículas durante 0.34 s después de cortar la emisión', () => {
    const simulation = new FlameSimulation(); advance(simulation, 1);
    advance(simulation, 0.12, false); expect(simulation.count).toBeGreaterThan(0);
    advance(simulation, 0.24, false); expect(simulation.count).toBe(0);
  });
  it('recorta la llama antes de una pared con el mismo alcance de oclusión', () => {
    const simulation = new FlameSimulation();
    advance(simulation, 1, true, origin, forward, [{ id: 'wall', center: { x: 0, y: 1, z: -3 }, halfExtents: { x: 4, y: 4, z: 0.5 }, style: 'wall' }]);
    expect(alive(simulation).length).toBeGreaterThan(0);
    for (const p of alive(simulation)) expect(-p.position.z + p.size * 2).toBeLessThan(2.5);
  });
  it('las nuevas partículas siguen origen y apuntado al moverse y girar', () => {
    const simulation = new FlameSimulation(); advance(simulation, 0.5);
    const moved = { x: 3, y: 1, z: 0 }, right = { x: 1, y: 0, z: 0 };
    advance(simulation, 0.5, true, moved, right);
    expect(alive(simulation).every(p => p.birth.x === 3 && p.position.x >= 3)).toBe(true);
    expect(Math.max(...alive(simulation).map(p => p.position.x))).toBeGreaterThan(10);
    simulation.reset(); expect(simulation.count).toBe(0);
  });
});
