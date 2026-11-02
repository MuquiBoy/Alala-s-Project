import { test, expect, type Page } from '@playwright/test';

async function voice(page:Page):Promise<void>{
 await page.addInitScript(()=>{
  class Speech {
   static current:Speech; onstart?:()=>void;onend?:()=>void;onresult?:(e:unknown)=>void;
   results:unknown[]=[];
   start(){this.results=[];Speech.current=this;this.onstart?.();}abort(){this.onend?.();}
  }
  Object.assign(window,{SpeechRecognition:Speech,__say:(text:string)=>{const s=Speech.current;s.results.push({isFinal:true,length:1,0:{transcript:text,confidence:.99}});s.onresult?.({resultIndex:s.results.length-1,results:s.results});}});
 });
}
async function enable(page:Page):Promise<void>{
 await page.getByRole('button',{name:'CONFIGURAR VOZ'}).click();await page.locator('#voice-engine').selectOption('browser');await page.locator('#voice-consent').check();
 await page.getByRole('button',{name:'ACTIVAR MICRÓFONO'}).click();await expect(page.locator('#mic-dot')).toHaveAttribute('data-state','listening');
 await page.getByRole('button',{name:/ENTRAR EN LA ARENA|REANUDAR/}).click();
}
const hp=async(page:Page,other=false)=>Number(await page.locator('#pvp-state').getAttribute(other?'data-enemy-health':'data-health'));
test('dos clientes invitan, eligen Avatar 01 y combaten por voz con salud consistente',async({browser})=>{
 test.setTimeout(120000);
 const one=await browser.newContext({viewport:{width:1000,height:760}}),two=await browser.newContext({viewport:{width:1000,height:760}});
 const a=await one.newPage(),b=await two.newPage();const errors:string[]=[];
 for(const page of[a,b]){await voice(page);page.on('pageerror',e=>errors.push(e.message));}
 try{
  await a.goto('/?quality=low');await a.getByRole('button',{name:'Multijugador PvP'}).click();
  await expect(a.locator('#room-message')).toContainText('1/2');
  const invite=await a.locator('#invite-link').inputValue();
  await b.goto(invite+'&quality=low');await expect(a.locator('#room-message')).toContainText('2/2');
  await a.getByRole('button',{name:'CONFIRMAR AVATAR 01'}).click();await b.getByRole('button',{name:'CONFIRMAR AVATAR 01'}).click();
  await expect(a.getByRole('button',{name:'ENTRAR EN LA ARENA'})).toBeEnabled();await expect(b.getByRole('button',{name:'ENTRAR EN LA ARENA'})).toBeEnabled();
  await enable(a);await enable(b);await expect(a.locator('#pvp-state')).toHaveAttribute('data-status','playing');
  // Returning to a focused client can pause its peer; PvP keeps simulating that peer.
  await a.bringToFront();if(await a.getByRole('button',{name:'REANUDAR'}).isVisible())await a.getByRole('button',{name:'REANUDAR'}).click();
  await a.evaluate(()=>{(window as unknown as {__say:(s:string)=>void}).__say('ráfaga');});
  await expect.poll(()=>hp(b)).toBeLessThan(175);await expect.poll(()=>hp(a,true)).toBeLessThan(175);
  // Each independent client must control and damage the other, not just connect.
  await b.bringToFront();if(await b.getByRole('button',{name:'REANUDAR'}).isVisible())await b.getByRole('button',{name:'REANUDAR'}).click();
  await b.keyboard.down('w');
  await expect.poll(async()=>Number(await b.locator('#avatar-live').getAttribute('data-steps'))).toBeGreaterThan(0);
  await b.keyboard.up('w');
  await b.evaluate(()=>{(window as unknown as {__say:(s:string)=>void}).__say('ráfaga');});
  await expect.poll(()=>hp(a)).toBeLessThan(175);await expect.poll(()=>hp(b,true)).toBeLessThan(175);
  await a.screenshot({path:'docs/screenshots/pvp-player-one.png',fullPage:true});await b.screenshot({path:'docs/screenshots/pvp-player-two.png',fullPage:true});
  const visitor=await browser.newContext();
  try{const third=await visitor.newPage();await third.goto(invite);await expect(third.locator('#menu-error')).toContainText('Sala completa');}
  finally{await visitor.close();}
  await b.bringToFront();if(await b.getByRole('button',{name:'REANUDAR'}).isVisible())await b.getByRole('button',{name:'REANUDAR'}).click();
  await expect(b.locator('#ability-barrage')).toHaveAttribute('data-state','ready',{timeout:15000});
  await b.evaluate(()=>{(window as unknown as {__say:(s:string)=>void}).__say('ráfaga');});
  await expect(b.locator('#pvp-state')).toContainText('Victoria');await expect(a.locator('#pvp-state')).toContainText('Derrota');
  await expect(b.locator('#entry-title')).toHaveText('Victoria');await expect(a.locator('#entry-title')).toHaveText('Derrota');
  await expect(b.locator('#enter')).toBeDisabled();await expect(a.locator('#enter')).toBeDisabled();
  await a.getByRole('button',{name:'PEDIR REVANCHA'}).click();await b.getByRole('button',{name:'PEDIR REVANCHA'}).click();
  await expect(a.locator('#pvp-state')).toHaveAttribute('data-round','2');await expect(b.locator('#pvp-state')).toHaveAttribute('data-round','2');
  expect(await hp(a)).toBe(180);expect(await hp(b)).toBe(180);
  await b.close();await expect(a.locator('#pvp-state')).toHaveAttribute('data-status','disconnected');
  expect(errors).toEqual([]);
 }finally{await one.close();await two.close();}
});

test('inicio conserva solitario y una invitación inexistente falla claramente',async({page})=>{
 await page.goto('/');await expect(page.getByRole('link',{name:'Jugar en solitario'})).toBeVisible();
 await page.goto('/?room=aaaaaaaaaaaaaaaaaaaaaaaa');await expect(page.locator('#menu-error')).toContainText(/no existe|venció/);
});
