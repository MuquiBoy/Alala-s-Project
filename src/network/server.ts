import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve, relative, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { WebSocketServer, WebSocket } from 'ws';
import { initializePhysics } from '../physics/PhysicsWorld';
import { Duel } from './Duel';
import type { AbilityId } from '../attacks/types';

await initializePhysics();
const root=fileURLToPath(new URL('../dist/',import.meta.url));
const port=Number(process.env.PORT ?? process.env.ALALAS_PORT ?? 4179), host=process.env.HOST ?? '127.0.0.1';
if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Puerto inválido.');
interface Room { duel:Duel; tokens:(string|null)[]; sockets:(WebSocket|null)[]; lastInput:number[]; lastActive:number }
const rooms=new Map<string,Room>();
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.glb':'model/gltf-binary','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.obj':'text/plain','.mtl':'text/plain'};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url??'/',`http://localhost:${port}`);
  if(url.pathname==='/__alalas/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({name:'alalas-children',version:'0.7.0',pvp:true}));return;}
  if(url.pathname==='/api/rooms'&&req.method==='POST'){
    if(rooms.size>=16){res.writeHead(503);res.end('Las salas están ocupadas. Inténtalo más tarde.');return;}
    const id=randomBytes(18).toString('base64url');rooms.set(id,{duel:new Duel(id),tokens:[null,null],sockets:[null,null],lastInput:[0,0],lastActive:Date.now()});
    res.writeHead(201,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({room:id}));return;
  }
  if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return;}
  try{
    const path=decodeURIComponent(url.pathname);if(path.includes('\0')||path.includes('\\'))throw new Error('path');
    const file=resolve(root,'.'+(path==='/'?'/index.html':path)),local=relative(root,file);
    if(local.startsWith('..'+sep)||local==='..'||local.split(sep).some(p=>p.startsWith('.')))throw new Error('path');
    const info=await stat(file);if(!info.isFile())throw new Error('file');
    const bytes=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':bytes.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('No encontrado.');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
  const url=new URL(req.url??'/',`http://localhost:${port}`);
  if(url.pathname!=='/duel'){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>{
    // A proxy may discard a close frame sent in the same turn as the upgrade.
    // Send an application-level error first so browsers can display the reason.
    const reject=(code:number,message:string)=>{
      ws.on('error',()=>{});
      ws.send(JSON.stringify({type:'error',message}));
      const closing=setTimeout(()=>ws.close(code,message),300);closing.unref();
    };
    const room=rooms.get(url.searchParams.get('room')??'');
    if(!room){reject(4004,'La invitación no existe o venció.');return;}
    const token=url.searchParams.get('token');
    let index=token?room.tokens.indexOf(token):-1;
    if(index>=0 && room.sockets[index]?.readyState===WebSocket.OPEN){reject(4003,'Esta plaza ya está abierta en otra pestaña.');return;}
    if(index<0)index=room.tokens.indexOf(null);
    if(index<0){reject(4003,'Sala completa: sólo dos jugadores.');return;}
    room.tokens[index]??=randomBytes(24).toString('base64url');room.sockets[index]=ws;room.duel.connected[index]=true;room.lastActive=Date.now();
    ws.send(JSON.stringify({type:'welcome',index,token:room.tokens[index]}));
    let messages=0,windowStart=Date.now();
    ws.on('message',bytes=>{
      const now=Date.now();if(now-windowStart>1000){messages=0;windowStart=now;}if(++messages>90){ws.close(4008,'Demasiadas solicitudes.');return;}
      let m;try{m=JSON.parse(bytes.toString());}catch{return;}
      if(!m||typeof m!=='object')return;
      if(m.type==='input'){
        if(![m.forward,m.right,m.yaw,m.pitch].every(v=>typeof v==='number'&&Number.isFinite(v)))return;
        room.duel.inputs[index]={forward:Math.max(-1,Math.min(1,m.forward)),right:Math.max(-1,Math.min(1,m.right)),yaw:Math.atan2(Math.sin(m.yaw),Math.cos(m.yaw)),pitch:Math.max(-1.4,Math.min(1.4,m.pitch)),active:m.active===true};
        room.lastInput[index]=now;
      }else if(m.type==='select'&&m.creature==='avatar-01'&&room.duel.connected.every(Boolean))room.duel.select(index);
      else if(m.type==='enter')room.duel.enter(index);
      else if(m.type==='rematch')room.duel.vote(index);
      else if(m.type==='attack'&&['flamethrower','barrage','armor','charge'].includes(m.id)&&typeof m.request==='string'&&m.request.length<=80){
        ws.send(JSON.stringify({type:'ack',request:m.request,...room.duel.attack(index,m.id as AbilityId,m.request)}));
      }else if(m.type==='ping')ws.send(JSON.stringify({type:'pong',at:m.at}));
    });
    ws.on('error',()=>{});
    ws.on('close',()=>{if(room.sockets[index]===ws){room.sockets[index]=null;room.duel.connected[index]=false;room.duel.inputs[index].active=false;room.lastActive=Date.now();}});
  });
});
let last=performance.now(),accumulator=0,broadcast=0;
const timer=setInterval(()=>{
  const now=performance.now();accumulator+=Math.min(.1,(now-last)/1000);last=now;
  while(accumulator>=1/60){
    for(const room of rooms.values()){
      room.lastInput.forEach((at,i)=>{if(Date.now()-at>750)room.duel.inputs[i].active=false;});
      room.duel.step(1/60);
    }accumulator-=1/60;
  }
  if(now-broadcast<50)return;broadcast=now;
  for(const[id,room]of rooms){
    if(!room.duel.connected.some(Boolean)&&Date.now()-room.lastActive>120000){room.duel.dispose();rooms.delete(id);continue;}
    const json=JSON.stringify(room.duel.snapshot());
    for(const ws of room.sockets)if(ws?.readyState===WebSocket.OPEN){if(ws.bufferedAmount>512000)ws.close(4008,'Conexión lenta.');else ws.send(json);}
  }
},8);
server.on('error',error=>{console.error(error.message);process.exit(1);});
server.listen(port,host,()=>{
  const url=`http://127.0.0.1:${port}`;console.log(`ALALA'S CHILDREN 0.7.0 · ${url} · PvP 1 vs. 1`);
  if(process.argv.includes('--open')){const child=spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{detached:true,stdio:'ignore',windowsHide:true});child.on('error',()=>{});child.unref();}
});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);wss.clients.forEach(ws=>ws.close());server.close();rooms.forEach(r=>r.duel.dispose());process.exit(0);});
