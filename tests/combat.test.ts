import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ARENA, createArenaColliders } from '../src/config/arena';
import { THERMAL_TANK } from '../src/config/creatures';
import { ABILITIES } from '../src/config/abilities';
import { initializePhysics, PhysicsWorld } from '../src/physics/PhysicsWorld';
import { CharacterMotor } from '../src/physics/CharacterMotor';
import { CombatRuntime } from '../src/combat/CombatRuntime';
import { AbilitySystem } from '../src/combat/AbilitySystem';
import { inFlameVolume, lineClear, obstacleDistance } from '../src/combat/WorldQueries';
import type { Vec3 } from '../src/config/types';
import type { CreatureDefinition } from '../src/config/types';

beforeAll(initializePhysics);
const active: { combat: CombatRuntime; motor: CharacterMotor; physics: PhysicsWorld }[] = [];
afterEach(() => active.splice(0).forEach(t => { t.combat.dispose(); t.motor.dispose(); t.physics.dispose(); }));
const legacyTank: CreatureDefinition = { ...THERMAL_TANK, abilities: ['flamethrower', 'armor_guard', 'charge_dash', 'thermal_pulse'] };
function scenario(spawn: Vec3 = ARENA.spawn, definition: CreatureDefinition = THERMAL_TANK) {
  const physics = new PhysicsWorld(createArenaColliders(ARENA)), motor = new CharacterMotor(physics, definition, spawn), combat = new CombatRuntime(definition, physics, createArenaColliders(ARENA), spawn, false);
  combat.attachMotor(motor);
  combat.aim(motor.feet, 0, 0); combat.setEnabled(true); const result = { physics, motor, combat }; active.push(result); return result;
}
function tick(t: ReturnType<typeof scenario>, count: number, yaw = 0, right = 0, pitch = 0) {
  for (let i = 0; i < count; i++) { t.combat.aim(t.motor.feet, yaw, pitch); const modifiers = t.combat.prepare(1 / 60); t.motor.update({ forward: 0, right }, yaw, 1 / 60, modifiers); t.physics.step(1 / 60); t.combat.aim(t.motor.feet, yaw, pitch); t.combat.afterPhysics(1 / 60); }
}

describe('habilidades por identificador', () => {
  it('respeta 5 s de fuego y 5 s de recarga DESPUÉS del final', () => {
    const engine = new AbilitySystem(ABILITIES.map(a => a.id)); engine.enabled = true; expect(engine.request('flamethrower', '1').accepted).toBe(true); engine.advance(4.99); expect(engine.active('flamethrower')).toBe(true); expect(engine.request('flamethrower', 'repeated-active').accepted).toBe(false); engine.advance(0.01); expect(engine.active('flamethrower')).toBe(false); expect(engine.snapshot('flamethrower').remaining).toBeCloseTo(5); engine.advance(4.99); expect(engine.request('flamethrower', '2').accepted).toBe(false); engine.advance(0.01); expect(engine.request('flamethrower', '3').accepted).toBe(true);
  });
  it('bloquea recargas, solicitudes duplicadas, habilidades ajenas y sesión pausada', () => {
    const engine = new AbilitySystem(['armor_guard']); expect(engine.request('armor_guard', '0').accepted).toBe(false); engine.enabled = true; expect(engine.request('flamethrower', '1').accepted).toBe(false); expect(engine.request('armor_guard', '2').accepted).toBe(true); engine.advance(20); expect(engine.request('armor_guard', '2').accepted).toBe(false); expect(engine.request('armor_guard', '3').accepted).toBe(true); engine.enabled = false; engine.advance(5); expect(engine.time).toBe(20);
  });
  it('permite las cuatro habilidades con sus recargas independientes', () => {
    const t = scenario(ARENA.spawn, legacyTank); for (const ability of legacyTank.abilities) expect(t.combat.activate(ability, ability).accepted).toBe(true);
    expect(t.combat.abilities.snapshot('armor_guard').total).toBe(2); tick(t, 180); expect(t.combat.abilities.snapshot('charge_dash').state).toBe('cooldown');
  });
});

describe('combate integrado con física', () => {
  it('emite fuego continuo, causa daño por segundo y respeta la pared central', () => {
    const t = scenario(); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: 3.8 }); t.combat.targets[1].motor.reset({ x: 0, y: 0.08, z: -2 }); t.combat.activate('flamethrower', 'fire'); tick(t, 150);
    expect(t.combat.targets[0].health).toBeCloseTo(40, 3); expect(t.combat.targets[1].health).toBe(100);
  });
  it('el fuego sigue el apuntado durante la emisión', () => {
    const t = scenario(); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: 3.8 }); t.combat.activate('flamethrower', 'fire'); tick(t, 30); const health = t.combat.targets[0].health; tick(t, 60, Math.PI); expect(t.combat.targets[0].health).toBeCloseTo(health);
  });
  it('Coraza reduce el daño exactamente un 65% durante dos segundos', () => {
    const t = scenario(ARENA.spawn, legacyTank); t.combat.activate('armor_guard', 'guard'); expect(t.combat.receiveDamage(100)).toBeCloseTo(35); tick(t, 120); expect(t.combat.receiveDamage(100)).toBe(100);
  });
  it('Coraza limita la velocidad normal sin modificar el perfil de movimiento', () => {
    const t = scenario(ARENA.spawn, legacyTank); t.combat.activate('armor_guard', 'guard'); tick(t, 30, 0, 1); expect(t.motor.speed).toBeCloseTo(2.8 * 0.45, 3); expect(THERMAL_TANK.movement.speed).toBe(2.8);
  });
  it('Embestida recorre 3 m en 0.4 s, sin sumar WASD al desplazamiento', () => {
    const t = scenario(ARENA.spawn, legacyTank); tick(t, 30); t.combat.activate('charge_dash', 'dash'); tick(t, 24, 0, 1); expect(t.motor.feet.z).toBeCloseTo(5.5, 3); expect(Math.abs(t.motor.feet.x)).toBeLessThan(0.005);
  });
  it('Embestida usa la orientación inicial aunque después cambie la mirada', () => {
    const t = scenario(ARENA.spawn, legacyTank); tick(t, 30); t.combat.activate('charge_dash', 'dash'); tick(t, 24, Math.PI / 2); expect(t.motor.feet.z).toBeCloseTo(5.5, 3); expect(Math.abs(t.motor.feet.x)).toBeLessThan(0.005);
  });
  it('Embestida no atraviesa la barrera ni los límites de la arena', () => {
    const t = scenario({ x: 0, y: 0.08, z: 2 }, legacyTank); t.combat.activate('charge_dash', 'dash'); tick(t, 24); expect(t.motor.feet.z).toBeGreaterThan(1.0);
    t.combat.reset(); t.motor.reset({ x: 20, y: 0.08, z: 8 }); t.combat.aim(t.motor.feet, -Math.PI / 2, 0); t.combat.activate('charge_dash', 'dash2'); tick(t, 24, -Math.PI / 2); expect(t.motor.feet.x).toBeLessThan(23.55);
  });
  it('Pulso impacta una vez por objetivo y empuja mediante colisiones', () => {
    const t = scenario({ x: 0, y: 0.08, z: 4 }, legacyTank); t.combat.targets[0].motor.reset({ x: 2, y: 0.08, z: 4 }); t.combat.activate('thermal_pulse', 'pulse'); tick(t, 60); expect(t.combat.targets[0].health).toBe(78); expect(t.combat.targets[0].motor.feet.x).toBeGreaterThan(2.6);
  });
  it('Pulso no daña a través de obstáculos sólidos', () => {
    const t = scenario({ x: 0, y: 0.08, z: 1.1 }, legacyTank); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: -1.1 }); t.combat.activate('thermal_pulse', 'pulse'); tick(t, 60); expect(t.combat.targets[0].health).toBe(100);
  });
  it('reinicia integridad, sondas y recargas', () => {
    const t = scenario(ARENA.spawn, legacyTank); t.combat.receiveDamage(50); t.combat.activate('thermal_pulse', 'pulse'); t.combat.targets[0].health = 2; t.combat.reset(); expect(t.combat.health).toBe(180); expect(t.combat.targets[0].health).toBe(100); expect(t.combat.abilities.snapshot('thermal_pulse').state).toBe('ready');
  });
  it('dos criaturas comparten el ataque sin compartir su dirección ni recarga', () => {
    const first = scenario(ARENA.spawn, legacyTank), second = scenario(ARENA.spawn, legacyTank);
    first.combat.aim(first.motor.feet, 0, 0); first.combat.activate('charge_dash', 'same-id');
    second.combat.aim(second.motor.feet, Math.PI / 2, 0); second.combat.activate('charge_dash', 'same-id');
    expect(first.combat.prepare(0.1).planarDisplacement).toEqual({ x: 0, z: -0.75 });
    expect(second.combat.prepare(0.1).planarDisplacement?.x).toBeCloseTo(-0.75);
    first.combat.reset();
    expect(first.combat.abilities.snapshot('charge_dash').state).toBe('ready');
    expect(second.combat.abilities.snapshot('charge_dash').state).toBe('active');
  });
});

describe('volúmenes y oclusión', () => {
  it('recorta fuego y líneas de visión en la barrera', () => { const boxes = createArenaColliders(ARENA); expect(obstacleDistance({ x: 0, y: 1, z: 3 }, { x: 0, y: 0, z: -1 }, 10, boxes)).toBeCloseTo(2); expect(lineClear({ x: 0, y: 1, z: 3 }, { x: 0, y: 1, z: -3 }, boxes)).toBe(false); });
  it('el cono no alcanza objetivos detrás del personaje o fuera de rango', () => { const origin = { x: 0, y: 1, z: 0 }, direction = { x: 0, y: 0, z: -1 }; expect(inFlameVolume(origin, direction, { x: 0, y: 1, z: -5 }, 0.4, 10, 0.14)).toBe(true); expect(inFlameVolume(origin, direction, { x: 0, y: 1, z: 5 }, 0.4, 10, 0.14)).toBe(false); expect(inFlameVolume(origin, direction, { x: 0, y: 1, z: -11 }, 0.4, 10, 0.14)).toBe(false); });
});

describe('moveset 2.0 del tanque', () => {
  it('equipa cuatro ataques y conserva los tres anteriores en la biblioteca global', () => {
    expect(THERMAL_TANK.abilities).toEqual(['flamethrower', 'barrage', 'armor', 'charge']);
    expect(ABILITIES.map(ability => ability.id)).toEqual(expect.arrayContaining(['armor_guard', 'charge_dash', 'thermal_pulse']));
    expect(THERMAL_TANK.collision).toMatchObject({ width: 3, depth: 3, height: 2.5 });
  });
  it('calienta sólo suelo alcanzado, hace daño gradual y extingue casillas', () => {
    const t = scenario(); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: 4 });
    expect(t.combat.activate('flamethrower', 'f').accepted).toBe(true);
    tick(t, 30, 0, 0, -0.28);
    expect(t.combat.heat.tiles.size).toBeGreaterThan(0);
    const first = t.combat.targets[0].health;
    tick(t, 60, Math.PI, 0, 0);
    expect(t.combat.targets[0].health).toBeCloseTo(first - 4, 1);
    tick(t, 480, Math.PI, 0, 0);
    expect(t.combat.heat.tiles.size).toBe(0);
    t.combat.reset(); t.combat.activate('flamethrower', 'up'); tick(t, 60, 0, 0, 0.9);
    expect(t.combat.heat.tiles.size).toBe(0);
  });
  it('Ráfaga dispara cincuenta veces y no atraviesa una pared', () => {
    const t = scenario(); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: -3 });
    expect(t.combat.activate('barrage', 'b').accepted).toBe(true);
    tick(t, 300);
    expect(t.combat.barrageShotsFired).toBe(50);
    expect(t.combat.targets[0].health).toBe(100);
    expect(t.combat.abilities.snapshot('barrage').state).toBe('cooldown');
  });
  it('Ráfaga impacta una sonda visible con puntería tridimensional', () => {
    const t = scenario(); t.combat.targets[0].motor.reset({ x: 0, y: 0.08, z: 4.5 });
    expect(t.combat.activate('barrage', 'visible').accepted).toBe(true);
    tick(t, 180, 0, 0, -0.4);
    expect(t.combat.targets[0].health).toBeLessThan(100);
  });
  it('Blindaje sólo reduce una vez daño térmico o de proyectil', () => {
    const t = scenario(); expect(t.combat.activate('armor', 'a').accepted).toBe(true);
    expect(t.combat.receiveDamage(20, ['thermal', 'projectile'])).toBe(5);
    expect(t.combat.receiveDamage(20, ['melee'])).toBe(20);
    expect(t.combat.abilities.snapshot('armor').total).toBe(5);
    tick(t, 300); expect(t.combat.abilities.snapshot('armor').state).toBe('cooldown');
    expect(t.combat.abilities.snapshot('armor').remaining).toBeCloseTo(15);
  });
  it('el ensayo de daño cuenta como proyectil y Blindaje lo reduce', () => {
    const t = scenario(); t.combat.probeEnabled = true;
    expect(t.combat.activate('armor', 'probe').accepted).toBe(true);
    tick(t, 181);
    expect(t.combat.lastDamage).toBe(3);
    expect(t.combat.health).toBe(177);
  });
  it('Embestida prepara dos segundos, sigue el último apuntado y puede elevarse', () => {
    const t = scenario(); expect(t.combat.activate('charge', 'c').accepted).toBe(true);
    t.combat.targets.forEach((target, index) => target.motor.reset({ x: -6 + index * 2, y: 0.08, z: -8 }));
    tick(t, 60, 0, 1); expect(t.motor.speed).toBeLessThanOrEqual(2.8 * 0.15 + 0.01);
    tick(t, 60, -Math.PI / 2, 0, 0.8);
    expect(t.combat.abilities.snapshot('charge').state).toBe('active');
    const x = t.motor.feet.x;
    tick(t, 20, -Math.PI / 2, 0, 0.8);
    expect(t.motor.feet.x).toBeGreaterThan(x + 1);
    expect(t.motor.feet.y).toBeGreaterThan(0.3);
  });
});
