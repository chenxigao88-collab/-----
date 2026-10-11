import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.ASH_PLAYWRIGHT_PATH||resolve(dirname(process.execPath),'../node_modules/playwright'));
const edge=process.env.ASH_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...existsSync(edge)?{executablePath:edge}:{}});
const errors=[],responses=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push({url:r.url(),status:r.status()});});
  await page.goto(process.env.ASH_PREVIEW_URL||'http://127.0.0.1:5173/');
  await page.waitForFunction(()=>window.__ASH__?.app?.hud);
  await page.evaluate(()=>{
    const a=window.__ASH__.app,w=a.world;a.loop.stop();w.selectCharacter('violet');a.settings.mute=true;a.settings.hitStrength=0;a.settings.shakeStrength=0;a.settings.invincible=true;
    w.state='playing';w.adventure.started=true;w.adventure.currentId='core';w.adventure.memory.cleared=false;w.adventure.memory.visited=true;w.story.queue=[];w.story.seen.add('intro');w.story.seen.add('boss-intro');
    w.room.configure([['boss']]);w.room.wave=1;w.room.state='active';w.player.actor.pos={x:380,y:340};
    const b=w.spawn('boss',{x:595,y:285},1);w.room.aliveIds.add(b.actor.id);b.actor.health.hp=3300;b.attackCooldown=0;b.enter('Move');w.special.step(.01);a.canvas.focus();a.render(.01);
  });
  const step=seconds=>page.evaluate(seconds=>{const a=window.__ASH__.app;for(let n=0;n<Math.round(seconds*120);n++)a.world.step(1/120,a.input.take());a.render(seconds);return {slot:a.world.weapons.active,cooldown:a.world.weapons.manualSwitchCooldown,shots:a.world.attacks.shots};},seconds);
  await page.keyboard.press('q');const first=await step(1/120);assert.equal(first.slot,1);assert.equal(first.cooldown,3);
  await page.keyboard.press('q');const repeat=await step(.2);assert.equal(repeat.slot,1);assert(repeat.cooldown<3&&repeat.cooldown>2.7);
  await page.mouse.move(595,255);await page.mouse.down();const firing=await step(1/120);await page.mouse.up();assert.equal(firing.shots,1);
  const inventory=await page.locator('[data-ui="inventory"]').textContent();assert(inventory.includes('冷却'));
  await page.evaluate(()=>{const a=window.__ASH__.app,b=a.world.special.boss;b.bossMove='slam';b.bossAttackCount=1;b.enter('Attack');b.elapsed=.65;b.lockedAngle=Math.atan2(55,-215);a.render(.01);});
  mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/boss-q-preview.png'});
  await page.evaluate(()=>{const a=window.__ASH__.app,b=a.world.special.boss;a.world.special.shave(b,b.poise);a.render(.01);});
  await page.screenshot({path:'artifacts/boss-poise-preview.png'});
  assert.equal(errors.length,0);assert.equal(responses.length,0);
  writeFileSync('artifacts/boss-q-browser-report.json',JSON.stringify({note:'Constructed boss scene; actual keyboard Q and left mouse firing. Complete chapter flow is verified separately by automated tests.',first,repeat,firing,inventory,errors,responses},null,2));
  console.log('Boss HUD, slam warning, poise break, real Q key cooldown and left-click firing verified without browser/resource errors.');
}finally{await browser.close();}
