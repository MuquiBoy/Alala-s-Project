import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ARENA, createArenaColliders } from '../src/config/arena';
import { THERMAL_TANK } from '../src/config/creatures';
import { MASS_UNIT_KG, massUnits } from '../src/config/mass';
import { TRAINING, TRAINING_ENEMIES } from '../src/config/training';
import { CombatRuntime } from '../src/combat/CombatRuntime';
import { CharacterMotor } from '../src/physics/CharacterMotor';
import { solveImpact } from '../src/physics/CollisionImpulse';
import { initializePhysics, PhysicsWorld } from '../src/physics/PhysicsWorld';
import { ChargeLanding } from '../src/identity/ChargeLanding';

beforeAll(initializePhysics);
const active: { world: PhysicsWorld; combat: CombatRuntime; motor: CharacterMotor }[] = [];
afterEach(() => active.splice(0).forEach(item => { item.combat.dispose(); item.motor.dispose(); item.world.dispose(); }));

function scenario(training = true) {
  const boxes = createArenaColliders(ARENA), world = new PhysicsWorld(boxes), motor = new CharacterMotor(world, THERMAL_TANK, ARENA.spawn);
  const combat = new CombatRuntime(THERMAL_TANK, world, boxes, ARENA.spawn, training);
  combat.attachMotor(motor); combat.setEnabled(true);
  const item = { world, combat, motor }; active.push(item); return item;
}
function tick(item: ReturnType<typeof scenario>, count: number, pitch = 0) {
  for (let index = 0; index < count; index++) {
    item.combat.aim(item.motor.feet, 0, pitch);
    const movement = item.combat.prepare(1 / 60);
    item.motor.update({ forward: 0, right: 0 }, 0, 1 / 60, movement);
    item.world.step(1 / 60);
    item.combat.aim(item.motor.feet, 0, pitch);
    item.combat.afterPhysics(1 / 60);
  }
}

describe('campo de entrenamiento 50 m', () => {
  it('usa la escala universal 1.00 = 50 kg y los cinco marcadores solicitados', () => {
    expect(ARENA.tilesPerSide).toBe(50);
    expect(MASS_UNIT_KG).toBe(50);
    expect(massUnits(THERMAL_TANK.massKg)).toBe(10);
    expect(TRAINING_ENEMIES.filter(enemy => enemy.kind === 'magenta')).toHaveLength(4);
    expect(TRAINING_ENEMIES.filter(enemy => enemy.kind === 'green')).toHaveLength(1);
    expect(TRAINING_ENEMIES.every(enemy => massUnits(enemy.massKg) === 2)).toBe(true);
  });

  it('la misma velocidad de impacto mueve menos a un objetivo más pesado', () => {
    const attacker = { x: 12, y: 0, z: 0 }, still = { x: 0, y: 0, z: 0 }, normal = { x: 1, y: 0, z: 0 };
    const light = solveImpact(500, 50, attacker, still, normal);
    const standard = solveImpact(500, 100, attacker, still, normal);
    const heavy = solveImpact(500, 500, attacker, still, normal);
    expect(light.targetDelta.x).toBeGreaterThan(standard.targetDelta.x);
    expect(standard.targetDelta.x).toBeGreaterThan(heavy.targetDelta.x);
    expect(standard.targetDelta.y).toBe(0);
    expect(solveImpact(500, 100, { x: 10, y: 4, z: 0 }, still, { x: 1, y: 1, z: 0 }).targetDelta.y).toBeGreaterThan(0);
  });

  it('Embestida registra un contacto físico único y transfiere impulso al enemigo de 100 kg', () => {
    const item = scenario(false), enemy = item.combat.targets[0];
    enemy.motor.reset({ x: 0, y: 0.08, z: 4.8 });
    expect(item.combat.activate('charge', 'impact').accepted).toBe(true);
    tick(item, 180);
    expect(item.combat.lastImpact).not.toBeNull();
    expect(item.combat.lastImpact?.targetId).toBe(enemy.id);
    expect(item.combat.lastImpact?.impulseKgMs).toBeGreaterThan(0);
    expect(item.combat.lastImpact?.attackerKg).toBe(500);
    expect(item.combat.lastImpact?.targetKg).toBe(100);
    expect(enemy.health).toBe(enemy.maximum - 30);
    expect(enemy.motor.feet.z).toBeLessThan(4.8);
    expect(enemy.lastDeltaV).toBeGreaterThan(0);
    expect(enemy.motor.feet.z).toBeGreaterThan(1.4);
  });

  it('una Embestida ascendente conserva el empuje y añade lanzamiento vertical', () => {
    const item = scenario(false), enemy = item.combat.targets[0];
    enemy.motor.reset({ x: 0, y: 0.08, z: 4.8 });
    expect(item.combat.activate('charge', 'ascending-impact').accepted).toBe(true);
    let peak = enemy.motor.feet.y;
    for (let index = 0; index < 180; index++) {
      tick(item, 1, 0.35);
      peak = Math.max(peak, enemy.motor.feet.y);
    }
    expect(item.combat.lastImpact?.targetId).toBe(enemy.id);
    expect(item.combat.lastImpact?.targetDelta.y).toBeGreaterThan(0);
    expect(peak).toBeGreaterThan(0.4);
  });

  it('en espacio abierto, el objetivo ligero retrocede varios metros y el tanque pierde velocidad', () => {
    const item = scenario(false), enemy = item.combat.targets[0];
    item.motor.reset({ x: 16, y: 0.08, z: 8.5 });
    enemy.motor.reset({ x: 16, y: 0.08, z: 4.8 });
    expect(item.combat.activate('charge', 'open-impact').accepted).toBe(true);
    tick(item, 180);
    expect(item.combat.lastImpact?.targetId).toBe(enemy.id);
    expect(item.combat.lastImpact?.attackerDelta.z).toBeGreaterThan(0);
    expect(4.8 - enemy.motor.feet.z).toBeGreaterThan(4);
    expect(enemy.motor.feet.z).toBeGreaterThan(-10);
    expect(enemy.health).toBe(70);
  });

  it('los magenta permanecen pasivos, disparan tres veces tras daño y vuelven a reposo', () => {
    const item = scenario(), enemy = item.combat.targets[0];
    enemy.motor.reset({ x: 0, y: 0.08, z: 4.7 });
    tick(item, 180);
    expect(enemy.controller.state).toBe('passive');
    expect(enemy.controller.shotsFired).toBe(0);
    expect(item.combat.health).toBe(180);
    item.combat.damageTarget(enemy, 1, 'thermal');
    tick(item, 180);
    expect(enemy.controller.attackerId).toBe(THERMAL_TANK.id);
    expect(enemy.controller.shotsFired).toBe(TRAINING.shotsPerBurst);
    expect(enemy.projectileHits).toBeGreaterThan(0);
    expect(item.combat.health).toBeLessThan(180);
    tick(item, 480);
    expect(enemy.controller.state).toBe('passive');
  });

  it('Blindaje reduce el proyectil magenta, sin que la masa cambie la defensa', () => {
    const item = scenario(), enemy = item.combat.targets[0];
    enemy.motor.reset({ x: 0, y: 0.08, z: 4.7 });
    item.combat.activate('armor', 'shield');
    item.combat.damageTarget(enemy, 1, 'thermal');
    tick(item, 100);
    expect(enemy.projectileHits).toBeGreaterThan(0);
    expect(item.combat.lastProjectileHit).toMatchObject({ ownerId: enemy.id, damage: 2, armored: true });
    expect(item.combat.definition.massKg).toBe(500);
  });

  it('el blanco verde salta, cae y mantiene el desplazamiento lateral', () => {
    const item = scenario(), green = item.combat.targets.find(target => target.spec.kind === 'green')!;
    let highest = green.motor.feet.y, lowest = Infinity;
    for (let index = 0; index < 240; index++) { tick(item, 1); highest = Math.max(highest, green.motor.feet.y); lowest = Math.min(lowest, green.motor.feet.y); }
    expect(highest).toBeGreaterThan(1);
    expect(lowest).toBeLessThan(0.1);
    expect(Math.abs(green.motor.feet.x - green.spawn.x)).toBeGreaterThan(0.1);
    expect(green.controller.shotsFired).toBe(0);
  });

  it('Embestida altera la trayectoria de un blanco verde ya en el aire y este vuelve a caer', () => {
    const item = scenario(false), green = item.combat.targets.find(target => target.spec.kind === 'green')!;
    expect(item.combat.activate('charge', 'air-intercept').accepted).toBe(true);
    tick(item, 117);
    green.motor.reset({ x: 0, y: 0.08, z: 4.8 });
    green.motor.applyImpulse({ x: 0, y: 400, z: 0 });
    tick(item, 30);
    expect(item.combat.lastImpact?.targetId).toBe(green.id);
    expect(item.combat.lastImpact?.targetBefore.y).toBeGreaterThan(0);
    expect(item.combat.lastImpact?.targetAfter.z).toBeLessThan(item.combat.lastImpact!.targetBefore.z);
    tick(item, 180);
    expect(green.motor.feet.y).toBeLessThan(0.1);
  });

  it('la caída de Embestida emite un único impacto pesado; el dash terrestre no lo emite', () => {
    const leap = scenario(false), landing = new ChargeLanding();
    leap.motor.reset({ x: 16, y: 0.08, z: 8.5 });
    expect(leap.combat.activate('charge', 'heavy-landing').accepted).toBe(true);
    const impacts = [];
    for (let index = 0; index < 360; index++) {
      tick(leap, 1, 0.8);
      const propelling = leap.combat.abilities.active('charge') && leap.combat.abilities.elapsed('charge') >= 2;
      const impact = landing.advance(1 / 60, leap.motor.feet.y, leap.motor.grounded, propelling);
      if (impact) impacts.push(impact);
    }
    expect(impacts).toHaveLength(1);
    expect(impacts[0].dropMetres).toBeGreaterThan(1);

    const dash = scenario(false), dashLanding = new ChargeLanding();
    dash.motor.reset({ x: 16, y: 0.08, z: 8.5 });
    expect(dash.combat.activate('charge', 'ground-dash').accepted).toBe(true);
    for (let index = 0; index < 210; index++) {
      tick(dash, 1, 0);
      const propelling = dash.combat.abilities.active('charge') && dash.combat.abilities.elapsed('charge') >= 2;
      expect(dashLanding.advance(1 / 60, dash.motor.feet.y, dash.motor.grounded, propelling)).toBeNull();
    }
  });
});
