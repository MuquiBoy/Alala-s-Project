import {describe,it,expect} from 'vitest';
import {SprintState} from '../src/physics/SprintState';
const tick=(s:SprintState,seconds:number,held=true,forward=1,right=0,yaw=0,blocked=false)=>{for(let i=0;i<Math.round(seconds*60);i++)s.update(1/60,forward,right,held,yaw,.8,true,blocked);};
describe('estampida',()=>{
 it('acelera en 1.7 s, frena en 1.2 y conserva paso base',()=>{const s=new SprintState();tick(s,1.7);expect(s.speed).toBeCloseTo(4);tick(s,1.2,false);expect(s.speed).toBeCloseTo(.8);});
 it('agota en 10 s, demora regeneracion y mantiene bloqueo hasta 20',()=>{const s=new SprintState();tick(s,10);expect(s.stamina).toBeCloseTo(0);tick(s,.1);expect(s.active).toBe(false);tick(s,1.3,false);expect(s.stamina).toBe(0);tick(s,1.5,false);expect(s.stamina).toBeGreaterThanOrEqual(20);expect(s.exhausted).toBe(false);});
 it('mirar 180 grados no invierte trayectoria y D limita giro a 70 grados/s',()=>{const s=new SprintState();tick(s,1.7);tick(s,1,true,1,0,Math.PI);expect(s.heading).toBe(0);tick(s,1,true,1,1);expect(s.heading).toBeCloseTo(-70*Math.PI/180);tick(s,.2,true,-1);expect(s.speed).toBeLessThan(4);});
 it('reposo no consume; Embestida cancela sin apilar velocidad; reinicia resistencia',()=>{const s=new SprintState();tick(s,5,true,0);expect(s.stamina).toBe(100);tick(s,2);tick(s,.1,true,1,0,0,true);expect(s.active).toBe(false);expect(s.coasting).toBe(false);s.reset();expect(s.stamina).toBe(100);});
 it('integra lo mismo a 30 y 120 Hz; comparación de persecucion recta',()=>{const states=[30,120].map(hz=>{const s=new SprintState();for(let i=0;i<1.7*hz;i++)s.update(1/hz,1,0,true,0,.8,true,false);return s;});expect(states[0].speed).toBeCloseTo(states[1].speed);for(const v of [2.5,3.5])expect(states[0].speed).toBeGreaterThan(v);expect(states[0].speed).toBeLessThan(4.5);});
});
