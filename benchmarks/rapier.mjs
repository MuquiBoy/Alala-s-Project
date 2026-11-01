import RAPIER from '@dimforge/rapier3d-compat';
import { writeFile } from 'node:fs/promises';
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 }); world.timestep = 1 / 60;
for (const [x,y,z,hx,hy,hz] of [[0,-0.5,0,12.5,0.5,12.5],[0,1.4,-12.75,13,1.4,0.25],[0,1.4,12.75,13,1.4,0.25],[-12.75,1.4,0,0.25,1.4,12.5],[12.75,1.4,0,0.25,1.4,12.5],[0,2,0,5.5,2,0.5]]) world.createCollider(RAPIER.ColliderDesc.cuboid(hx,hy,hz).setTranslation(x,y,z));
const actors = [[0,0.67,8.5,0.52],[-2.8,0.67,4.5,0.42],[2.8,0.67,7,0.42],[-2.8,0.67,-3.5,0.42]].map(([x,y,z,radius]) => {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(x,y,z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.65-radius,radius),body);
  const controller = world.createCharacterController(0.01); controller.setSlideEnabled(true); controller.enableSnapToGround(0.15);
  return {body,collider,controller};
});
world.step();
const samples = [];
for(let tick=0;tick<660;tick++) {
  const start=performance.now();
  actors.forEach((actor,index) => { actor.controller.computeColliderMovement(actor.collider,{x:0,y:-0.5/60,z:index===0?-2.8/60:0}); const d=actor.controller.computedMovement(),p=actor.body.translation();actor.body.setNextKinematicTranslation({x:p.x+d.x,y:p.y+d.y,z:p.z+d.z}); });
  world.step(); if(tick>=60) samples.push((performance.now()-start)*1000);
  if((tick+1)%180===0) {actors[0].body.setTranslation({x:0,y:0.67,z:8.5},true);actors[0].body.setNextKinematicTranslation({x:0,y:0.67,z:8.5});}
}
samples.sort((a,b)=>a-b);
const report={engine:'Rapier 0.21.0 / Node '+process.version,mode:'no rendering',static_colliders:6,actors:4,ticks:samples.length,mean_us:samples.reduce((a,b)=>a+b)/samples.length,p50_us:samples[300],p95_us:samples[570],scope:'four KCC movement queries AND world.step; different scope from Godot timer',gpu_rendering_measured:false,voice_integration_measured:false};
await writeFile('benchmarks/rapier-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));world.free();
