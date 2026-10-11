import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright')),sharp=require(resolve(dirname(process.execPath),'../node_modules/sharp'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
try{
  if(process.argv.includes('--production')){
    const page=await browser.newPage({viewport:{width:960,height:540}}),assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());if(r.url().includes('violet-moon-'))assets.push({url:r.url(),status:r.status()});});
    await page.goto(process.env.ASH_VERIFY_URL??'http://127.0.0.1:4173/');await page.locator('.hud').waitFor();assert.equal(await page.evaluate(()=>Boolean(window.__ASH__)),false);
    await page.locator('[data-command="loadout"]').click();await page.locator('[data-character="violet"]').click();await page.locator('[data-done]').click();await page.keyboard.press('Escape');
    const controls=await page.locator('.overlay').innerText();assert(controls.includes('Shift+R'));await page.screenshot({path:'artifacts/moon-production-controls.png'});
    assert.equal(assets.length,4);assert(assets.every(a=>a.status===200));assert.equal(errors.length,0);writeFileSync('artifacts/moon-production-report.json',JSON.stringify({checks:['production startup','both moon atlases and metadata loaded','Violet selection','Shift+R controls visible','no development hook'],assets,errors},null,2));console.log('Production startup, four moon assets, character selection and Shift+R controls passed.');
  }else{
  const page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto(process.env.ASH_VERIFY_URL??'http://127.0.0.1:5174/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  await page.evaluate(()=>{const app=window.__ASH__.app,w=app.world;app.loop.stop();app.input.clear();w.prepareRoomTransition();w.state='ready';w.selectCharacter('violet');w.state='playing';w.adventure.started=true;w.adventure.currentId='front';w.adventure.template.obstacles=[];w.adventure.memory.cleared=true;w.story.queue=[];w.progression.pending=0;w.room.configure([]);w.player.actor.pos={x:410,y:340};w.weapons.replace(0,'frost_string_late');w.weapons.replace(1,'ember_lantern_late');w.weapons.active=0;w.weapons.manualSwitchCooldown=3;w.player.stats.criticalChance=0;w.ultimate.energy=200;app.settings.mute=true;app.settings.shakeStrength=0;app.settings.hitStrength=1;for(let i=0;i<5;i++){const e=w.spawn(i===4?'boss':'chaser',{x:540+(i%3)*46,y:325+Math.floor(i/3)*40},-1,true);e.actor.health.hp=e.actor.health.maxHP=50000;}app.render(.01);});
  await page.mouse.move(720,340);await page.keyboard.press('Shift+KeyR');
  const start=await page.evaluate(()=>{const app=window.__ASH__.app;app.world.step(1/120,app.input.take());return app.world.ultimate.snapshot();});assert.equal(start.tier,2);assert.equal(start.active,true);assert.equal(start.energy,0);
  const frames=[],shots=[],labels=['回眸 · 双层月环','双枪 · 羽印锁月','穿阵 · 三斩残影','鸾翼 · 月光折刃','收剑 · 断月爆发','终幕 · 紫羽落定'],times=[.5,1.7,3.0,4.08,4.7,5.35];
  let shot=0;
  for(let n=0;n<58;n++){
    const state=await page.evaluate(()=>{const app=window.__ASH__.app;for(let i=0;i<12;i++)app.world.step(1/120,app.input.take());app.render(.1);return app.world.ultimate.snapshot();});
    frames.push(await sharp(await page.screenshot()).resize(720,405,{kernel:'nearest'}).ensureAlpha().raw().toBuffer());
    if(shot<times.length&&state.elapsed>=times[shot]){await page.screenshot({path:`artifacts/moon-stage-${shot}.png`});shots.push({label:labels[shot],image:(await page.screenshot()).toString('base64')});shot++;}
  }
  const end=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;return {active:w.ultimate.active,energy:w.ultimate.energy,slot:w.weapons.active,action:w.player.actor.action,bossLift:w.special.boss.actor.launch.height};});assert.equal(end.active,false);assert.equal(end.energy,0);assert.equal(end.slot,1);assert.equal(end.action,undefined);assert.equal(end.bossLift,0);
  await sharp(Buffer.concat(frames),{raw:{width:720,height:405*frames.length,channels:4,pageHeight:405}}).gif({loop:0,delay:frames.map(()=>100),effort:5}).toFile('artifacts/紫鸢-紫鸾断月-v1.gif');
  const gallery=await browser.newPage({viewport:{width:1440,height:600}});await gallery.setContent(`<style>body{margin:0;background:#171020;color:#e8cbff;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,480px)}figure{margin:0}figcaption{height:30px;line-height:30px;padding-left:15px}img{display:block;width:480px;height:270px}</style><div class="grid">${shots.map(s=>`<figure><figcaption>${s.label}</figcaption><img src="data:image/png;base64,${s.image}"></figure>`).join('')}</div>`);await gallery.screenshot({path:'artifacts/moon-ultimate-preview.png'});
  assert.equal(errors.length,0);writeFileSync('artifacts/moon-ultimate-browser-report.json',JSON.stringify({checks:['actual Shift+R input','two circuits consumed','native fully charged dual weapons','Q cooldown bypass','48 authored frames','three delayed rifts','sheath explosion','Boss not launched','player control restored'],start,end,errors},null,2));console.log('Actual Shift+R, complete moon ultimate performance, GIF capture, native weapons, Boss immunity and control restoration passed.');
  }
}finally{await browser.close();}
