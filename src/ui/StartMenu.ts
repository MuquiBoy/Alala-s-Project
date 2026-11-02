import { PvpClient } from '../network/PvpClient';
import { startCombatDemo } from '../Game';

export async function startMenu(): Promise<void> {
  const root=document.querySelector<HTMLElement>('#app')!;
  const params=new URLSearchParams(location.search);
  if(params.get('mode')==='solo'){await startCombatDemo();return;}
  root.innerHTML=`<main class="start-menu"><span class="section-number">ALALA'S CHILDREN · DEMO 0.7</span><h1>Elige tu combate.</h1><p>Una criatura. Tu voz. Un rival.</p><div class="mode-cards"><a class="mode-card" href="?mode=solo"><b>Jugar en solitario</b><span>Campo de entrenamiento · pruebas de voz y habilidades</span></a><button class="mode-card" id="create-pvp"><b>Multijugador PvP</b><span>Una partida privada para dos amigos</span></button></div><section id="lobby" hidden><h2>Sala privada · 1 vs. 1</h2><p id="room-message" role="status">Conectando…</p><div class="invite"><input id="invite-link" aria-label="Enlace de invitación" readonly><button id="copy-invite" class="secondary-button">COPIAR ENLACE</button></div><div id="roster" hidden><h3>Elige tu criatura</h3><button class="creature-choice" aria-pressed="true"><b>Avatar 01</b><span>Tanque cuadrúpedo · 500 kg</span><small>Lanzallamas · Ráfaga · Blindaje · Embestida</small></button><button id="confirm-avatar" class="enter-button">CONFIRMAR AVATAR 01</button><p>Cuando ambos confirmen, prepara tu micrófono y pulsa Entrar en la arena. La partida empieza cuando los dos hayan entrado.</p></div></section><p id="menu-error" role="alert"></p></main>`;
  let client:PvpClient|undefined,starting=false;
  const open=async(room?:string):Promise<void>=>{
    const button=root.querySelector<HTMLButtonElement>('#create-pvp')!;button.disabled=true;
    try{
      if(!room){const response=await fetch('/api/rooms',{method:'POST'});if(!response.ok)throw new Error('No se pudo crear la sala. Comprueba que abriste la versión con servidor PvP.');room=(await response.json()).room;}
      if(!room||! /^[\w-]{24}$/.test(room))throw new Error('El enlace de invitación no es válido.');
      const url=new URL(location.href);url.search='';url.searchParams.set('room',room);if(params.get('quality')==='low')url.searchParams.set('quality','low');history.replaceState(null,'',url);
      root.querySelector<HTMLElement>('#lobby')!.hidden=false;
      const invite=root.querySelector<HTMLInputElement>('#invite-link')!;invite.value=url.href;
      root.querySelector('#copy-invite')!.addEventListener('click',()=>{void navigator.clipboard.writeText(invite.value).then(()=>{root.querySelector('#room-message')!.textContent='Enlace copiado. Compártelo con tu amigo.';}).catch(()=>{invite.select();});});
      client=new PvpClient(room);client.onNotice=message=>{root.querySelector('#room-message')!.textContent=message;};
      client.onState=state=>{
        if(starting)return;
        const connected=state.connected.filter(Boolean).length;
        root.querySelector('#room-message')!.textContent=`${connected}/2 jugadores conectados · ${state.ready.filter(Boolean).length}/2 criaturas confirmadas`;
        root.querySelector<HTMLElement>('#roster')!.hidden=connected!==2;
        if(connected===2&&state.ready.every(Boolean)){starting=true;void startCombatDemo(client);}
      };
      await client.connect();
      root.querySelector<HTMLButtonElement>('#confirm-avatar')!.onclick=event=>{client!.send({type:'select',creature:'avatar-01'});(event.currentTarget as HTMLButtonElement).disabled=true;};
    }catch(error){root.querySelector('#menu-error')!.textContent=String(error).replace(/^Error: /,'');button.disabled=false;client?.dispose();}
  };
  root.querySelector('#create-pvp')!.addEventListener('click',()=>{void open();});
  const room=params.get('room');if(room)await open(room);
}
