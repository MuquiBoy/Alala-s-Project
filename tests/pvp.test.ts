import { beforeAll, describe, expect, it } from 'vitest';
import { initializePhysics } from '../src/physics/PhysicsWorld';
import { Duel } from '../src/network/Duel';
beforeAll(initializePhysics);
function match():Duel{const duel=new Duel('test');duel.connected.fill(true);duel.select(0);duel.select(1);duel.prepare(0);duel.prepare(1);duel.enter(0);duel.enter(1);return duel;}
const step=(duel:Duel,n:number)=>{for(let i=0;i<n;i++)duel.step(1/60);};
describe('duelo autoritativo con las habilidades originales',()=>{
 it('exige selección y entrada de ambos, congela al desconectar y coordina revancha',()=>{
  const d=new Duel('room');d.connected.fill(true);d.select(0);d.enter(0);expect(d.status).toBe('waiting');d.select(1);d.enter(1);expect(d.status).toBe('waiting');d.prepare(0);expect(d.status).toBe('waiting');d.prepare(1);expect(d.status).toBe('playing');
  step(d,30);const time=d.actors[0].abilities.time;d.connected[1]=false;step(d,30);expect(d.status).toBe('disconnected');expect(d.actors[0].abilities.time).toBe(time);
  d.connected[1]=true;d.actors[1].health=0;step(d,1);expect(d.winner).toBe('P1');d.vote(0);expect(d.status).toBe('finished');d.vote(1);expect(d.status).toBe('playing');expect(d.actors[1].health).toBe(180);expect(d.round).toBe(2);d.dispose();
 });
 it('permite movimiento simultáneo y conserva colisiones entre los jugadores',()=>{
  const d=match();d.inputs.forEach(i=>i.forward=1);step(d,600);
  const a=d.actors[0].motor!.feet,b=d.actors[1].motor!.feet;expect(a.x).toBeGreaterThan(-6);expect(b.x).toBeLessThan(6);expect(b.x-a.x).toBeGreaterThanOrEqual(2.99);d.dispose();
 });
 it('sincroniza Lanzallamas, aplica Blindaje del rival y rechaza duplicados',()=>{
  const d=match();expect(d.attack(1,'armor','guard').accepted).toBe(true);expect(d.attack(0,'flamethrower','fire').accepted).toBe(true);expect(d.attack(0,'flamethrower','fire').accepted).toBe(false);
  step(d,60);expect(d.actors[1].health).toBeCloseTo(174,2);expect(d.actors[0].health).toBe(180);
  const state=d.snapshot();expect(state.actors[1].health).toBe(d.actors[1].health);expect(state.actors[0].heat.length).toBeGreaterThan(0);d.dispose();
 });
 it('Ráfaga daña al avatar completo y los obstáculos bloquean los impactos',()=>{
  const d=match();d.attack(0,'barrage','shots');step(d,180);expect(d.actors[1].health).toBeLessThan(180);expect(d.snapshot().actors[0].shots).toBeGreaterThan(20);
  d.dispose();const wall=match();wall.actors[0].motor!.reset({x:0,y:.08,z:4});wall.actors[1].motor!.reset({x:0,y:.08,z:-4});wall.inputs[0].yaw=0;wall.attack(0,'barrage','wall');step(wall,240);expect(wall.actors[1].health).toBe(180);wall.dispose();
 });
 it('Embestida causa daño y transfiere impulso entre dos tanques de 500 kg',()=>{
  const d=match();step(d,20);d.attack(0,'charge','impact');step(d,220);expect(d.actors[1].health).toBe(150);expect(d.actors[0].impactCount).toBe(1);expect(d.actors[1].motor!.feet.x).toBeGreaterThan(6.5);d.dispose();
 });
 it('dos Lanzallamas simultáneos y varias rondas limpian calor, recargas y proyectiles',()=>{
  const d=match();
  expect(d.attack(0,'flamethrower','fire-1').accepted).toBe(true);
  expect(d.attack(1,'flamethrower','fire-2').accepted).toBe(true);
  step(d,40);
  expect(d.snapshot().actors.every(actor=>actor.heat.length>0)).toBe(true);
  d.actors[1].health=0;step(d,1);
  expect(d.status).toBe('finished');
  expect(d.snapshot().actors.every(actor=>actor.heat.length===0&&actor.projectiles.length===0)).toBe(true);
  const time=d.actors[0].abilities.time;step(d,90);expect(d.actors[0].abilities.time).toBe(time);
  d.vote(0);d.vote(1);
  expect(d.round).toBe(2);expect(d.snapshot().actors.every(actor=>actor.health===180&&actor.heat.length===0)).toBe(true);
  expect(d.attack(0,'barrage','round-2').accepted).toBe(true);step(d,10);
  d.actors[0].health=0;step(d,1);d.vote(0);d.vote(1);
  expect(d.round).toBe(3);expect(d.snapshot().actors.every(actor=>actor.projectiles.length===0&&actor.shots===0)).toBe(true);
  d.dispose();
 });
 it('valida sprint en servidor, cancela para Embestida y restaura resistencia en revancha',()=>{
  const d=match();d.inputs[0].forward=1;d.inputs[0].sprint=true;step(d,102);
  expect(d.actors[0].motor!.speed).toBeCloseTo(4,2);expect(d.snapshot().actors[0].sprint.stamina).toBeCloseTo(83,1);
  expect(d.actors[0].definition.massKg).toBe(500);expect(d.actors[0].definition.movement.speed).toBe(.8);
  expect(d.attack(0,'charge','run-charge').accepted).toBe(true);step(d,1);
  expect(d.actors[0].motor!.speed).toBeLessThanOrEqual(.121);expect(d.actors[0].motor!.sprint.active).toBe(false);
  d.actors[1].health=0;step(d,1);d.vote(0);d.vote(1);expect(d.actors[0].motor!.sprint.stamina).toBe(100);d.dispose();
 });
 it('sincroniza el agotamiento individual y bloquea carrera hasta 50 puntos',()=>{
  const d=match();d.inputs[0].forward=1;d.inputs[0].sprint=true;step(d,600);
  expect(d.snapshot().actors[0].sprint.exhausted).toBe(true);
  expect(d.snapshot().actors[0].sprint.active).toBe(false);
  expect(d.snapshot().actors[1].sprint.stamina).toBe(100);
  step(d,150);expect(d.snapshot().actors[0].sprint.stamina).toBe(0);
  step(d,180);expect(d.snapshot().actors[0].sprint.stamina).toBeCloseTo(24);
  expect(d.snapshot().actors[0].sprint.exhausted).toBe(true);
  step(d,195);expect(d.snapshot().actors[0].sprint.stamina).toBeCloseTo(50);
  expect(d.snapshot().actors[0].sprint.exhausted).toBe(false);
  step(d,1);expect(d.snapshot().actors[0].sprint.active).toBe(true);
  d.dispose();
 });
});
