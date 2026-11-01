import { describe, expect, it } from 'vitest';
import { HeavyGait } from '../src/identity/HeavyGait';
describe('identidad pesada ligada a desplazamiento real', () => {
  it('no emite pasos por estar quieto o empujar una pared', () => {
    const gait=new HeavyGait(1.45);
    for(let i=0;i<600;i++) expect(gait.advance(1/60,{x:0,y:0,z:0},true,true)).toBeNull();
  });
  it('la cadencia depende de la distancia y disminuye al caminar más lento', () => {
    const run=(speed:number)=>{const gait=new HeavyGait(1.45);let count=0;for(let i=0;i<600;i++){if(gait.advance(1/60,{x:i/60*speed,y:0,z:0},true,true)!==null)count++;}return count;};
    expect(run(2.8)).toBe(20); expect(run(2.8*0.45)).toBe(9);
  });
  it('no emite por caídas, dash ni teletransporte, y limpia estado al reiniciar', () => {
    const gait=new HeavyGait(1.45);
    for(let i=0;i<100;i++) expect(gait.advance(1/60,{x:i*0.1,y:0,z:0},false,true)).toBeNull();
    for(let i=0;i<100;i++) expect(gait.advance(1/60,{x:i*0.1,y:0,z:0},true,false)).toBeNull();
    expect(gait.advance(1/60,{x:100,y:0,z:0},true,true)).toBeNull();
    gait.reset();expect(gait.phase).toBe(0);expect(gait.stepIndex).toBe(0);
  });
  it('no depende de la frecuencia del render', () => {
    const run=(hz:number)=>{const gait=new HeavyGait(1.45);let count=0;for(let i=0;i<=hz*5;i++){if(gait.advance(1/hz,{x:i/hz*2.8,y:0,z:0},true,true)!==null)count++;}return count;};
    expect(run(30)).toBe(run(144));
  });
});
