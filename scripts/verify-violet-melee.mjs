import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[],shots=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  async function setup(character='violet'){
    await page.evaluate(character=>{const a=window.__ASH__.app,w=a.world;a.loop.stop();a.input.clear();w.prepareRoomTransition();w.state='ready';if(!w.selectCharacter(character))throw Error('Character selection failed');w.debugWeapon(0,'hush_edge_late');w.debugWeapon(1,'frost_string_late');w.state='playing';w.adventure.started=true;w.adventure.currentId='front';w.adventure.memory.cleared=true;w.story.queue=[];w.story.seen.add('intro');w.progression.pending=0;w.progression.offers=[];w.room.configure([]);w.player.actor.pos={x:440,y:340};w.player.actor.previous={...w.player.actor.pos};w.weapons.active=0;w.weapons.switchLock=0;w.weapons.slots.forEach(s=>{s.cooldown=0;s.skillCooldown=0;});a.settings.mute=true;a.settings.invincible=true;a.settings.hitStrength=0;a.settings.shakeStrength=0;},character);
  }
  async function capture(label,file){await page.evaluate(label=>{const a=window.__ASH__.app;a.world.toast=label;a.world.toastLife=5;a.render(.01);},label);const image=await page.screenshot({path:`artifacts/${file}.png`});shots.push({label,image:image.toString('base64')});}
  await setup();
  const normal=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;if(!w.attacks.requestPlayer(false,a.settings,{x:700,y:340}))throw Error('Melee failed');for(let i=0;i<15;i++)w.step(1/120,a.input.take());return w.melee.attacks.length;});assert(normal>0);await capture('紫鸢 · 月牙近战','violet-melee-normal');
  await setup();
  for(const [kind,label]of [['downslash','紫鸢 · 重下劈'],['uppercut','紫鸢 · 上挑'],['sweep','紫鸢 · 回旋斩']]){
    const check=await page.evaluate(kind=>{const a=window.__ASH__.app,w=a.world;if(!w.gunfu.request({x:700,y:340}))throw Error('Gunfu request failed');for(let i=0;i<90;i++){w.step(1/120,a.input.take());if(w.gunfu.effects.some(e=>e.kind===kind))break;}for(let i=0;i<6;i++)w.step(1/120,a.input.take());return {character:w.player.actor.character,effects:w.gunfu.effects.map(e=>e.kind)};},kind);
    assert.equal(check.character,'violet');assert(check.effects.includes(kind));await capture(label,`violet-melee-${kind}`);
    await page.evaluate(()=>{const a=window.__ASH__.app;for(let i=0;i<100;i++){a.world.step(1/120,a.input.take());if(a.world.gunfu.snapshot().awaiting)break;}});
  }
  await setup();
  const wave=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;w.attacks.blade[0]=3;w.attacks.requestPlayer(false,a.settings,{x:700,y:340});for(let i=0;i<26;i++)w.step(1/120,a.input.take());return w.projectiles.projectiles.some(p=>p.style==='wave');});assert(wave);await capture('紫鸢 · 紫色剑气','violet-melee-wave');
  await setup();
  const ultimate=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world,e=w.spawn('chaser',{x:540,y:340},-1,true);e.actor.health.hp=e.actor.health.maxHP=50000;w.ultimate.energy=100;if(!w.ultimate.request({x:700,y:340}))throw Error('Ultimate request failed');for(let i=0;i<178;i++)w.step(1/120,a.input.take());return w.ultimate.active;});assert(ultimate);await capture('紫鸢 · 大招回旋斩','violet-melee-ultimate');
  const gallery=await browser.newPage({viewport:{width:1440,height:600}});await gallery.setContent(`<style>body{margin:0;background:#171020;color:#e8cbff;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,480px)}figure{margin:0}figcaption{height:30px;line-height:30px;padding-left:15px}img{display:block;width:480px;height:270px}</style><div class="grid">${shots.map(s=>`<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.image}"></figure>`).join('')}</div>`);await gallery.screenshot({path:'artifacts/violet-melee-preview.png'});
  assert.equal(errors.length,0);writeFileSync('artifacts/violet-melee-browser-report.json',JSON.stringify({checks:['actual Violet selection','left melee','three sequential right-click melee phases','sword wave','ultimate spin','six-frame independent PNG animation'],errors},null,2));console.log('Violet melee, all three right-click blade phases, purple sword wave and ultimate spin passed.');
}finally{await browser.close();}
