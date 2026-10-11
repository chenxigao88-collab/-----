import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.ASH_PLAYWRIGHT_PATH||resolve(dirname(process.execPath),'../node_modules/playwright'));
const edge=process.env.ASH_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...existsSync(edge)?{executablePath:edge}:{}}),errors=[],resources=[],checks=[],images=[];
try{
  mkdirSync('artifacts',{recursive:true});
  const page=await browser.newPage({viewport:{width:960,height:540}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)resources.push(r.url());});
  await page.goto(process.env.ASH_PREVIEW_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.hud);
  async function setup(id,character='ember'){
    await page.evaluate(({id,character})=>{const a=window.__ASH__.app,w=a.world;a.loop.stop();a.input.clear();w.prepareRoomTransition();w.state='ready';w.selectCharacter(character);w.debugWeapon(0,id);w.debugWeapon(1,id==='frost_string_late'?'earth_crossbow_late':'frost_string_late');w.state='playing';w.adventure.started=true;w.adventure.currentId='front';w.adventure.memory.cleared=true;w.room.configure([]);w.story.queue=[];w.story.seen.add('intro');w.progression.pending=0;w.progression.offers=[];a.settings.mute=true;a.settings.invincible=true;a.settings.hitStrength=0;a.settings.shakeStrength=0;w.player.actor.pos={x:250,y:390};w.player.actor.previous={...w.player.actor.pos};w.weapons.slots.forEach(s=>{s.cooldown=0;s.skillCooldown=0;});w.weapons.active=0;w.weapons.switchLock=0;w.weapons.manualSwitchCooldown=2.8;a.render(.01);a.canvas.focus();}, {id,character});
    const box=await page.evaluate(()=>{const r=window.__ASH__.app.canvas.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});await page.mouse.move(box.x+800/960*box.width,box.y+372/540*box.height);
  }
  async function frames(n){return page.evaluate(n=>{const a=window.__ASH__.app,w=a.world;for(let i=0;i<n;i++)w.step(1/120,a.input.take());a.render(.01);return {shots:w.attacks.shots,charging:w.attacks.charging,charge:w.attacks.charge,bullets:w.projectiles.projectiles.map(p=>({style:p.style,charge:p.charged,delay:p.delay,radius:p.explosionRadius,damage:p.context.damage,returning:p.returning}))};},n);}
  for(const id of ['earth_crossbow_late','frost_string_late','ember_lantern_late']){
    await setup(id);await page.mouse.down();const held=await frames(18);assert(held.charging&&held.bullets.length===0);await page.screenshot({path:`artifacts/weapon-charge-${id}.png`});await page.mouse.up();const released=await frames(2);assert(released.bullets.length>0);assert(released.bullets.every(p=>p.charge>0&&p.charge<1));checks.push({id,partialRelease:released});
  }
  for(const character of ['ember','violet'])for(const id of ['earth_crossbow_late','frost_string_late','ember_lantern_late']){
    await setup(id,character);const seen=new Map();let presses=0;
    do{await page.mouse.click(800,322,{button:'right'});presses++;
      const part=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world,bullets=[];for(let i=0;i<200;i++){w.step(1/120,a.input.take());for(const p of w.projectiles.projectiles)if(p.context.gunfu==='finisher')bullets.push({id:p.id,style:p.style,charge:p.charged,phase:p.context.gunfuShot});if(w.gunfu.snapshot().awaiting||!w.gunfu.busy)break;}a.render(.01);return {busy:w.gunfu.busy,bullets,slot:w.weapons.active,q:w.weapons.manualSwitchCooldown};});
      for(const p of part.bullets)seen.set(p.id,p);if(!part.busy){assert.equal(part.slot,1);break;}
    }while(presses<8);
    assert.equal(presses,character==='violet'?6:5);assert(seen.size>=2);assert([...seen.values()].every(p=>p.charge===1));checks.push({character,id,rightClickPresses:presses,fullBullets:[...seen.values()]});
  }
  for(const [id,label,n] of [['ash_needle_late','灰针 · 高速针弹',24],['gravel_bell_late','砾钟 · 岩屑散弹',25],['frost_string_late','霜弦 · 满蓄七晶',99],['ember_lantern_late','烬灯 · 蓄力火球',135],['thunder_branch_late','鸣枝 · 持续电弧',30],['wind_burst_late','连铳 · 三段连发',36],['earth_crossbow_late','重弩 · 满蓄重矢',113],['wind_ring_late','环刃 · 飞出后返回',41],['hush_edge_late','缄锋 · 剑势释放剑气',30]]){
    await setup(id);if(id.startsWith('hush_edge'))await page.evaluate(()=>{window.__ASH__.app.world.attacks.blade[0]=3;});await page.mouse.down();const result=await frames(n);await page.mouse.up();assert(result.bullets.length>0,`missing visible flight for ${id}`);
    await page.evaluate(label=>{const a=window.__ASH__.app;a.world.toast=label;a.world.toastLife=10;a.render(.01);},label);
    const buffer=await page.screenshot({path:`artifacts/weapon-flight-${id}.png`});images.push({label,data:buffer.toString('base64')});checks.push({id,flight:result});
  }
  await page.setViewportSize({width:1920,height:1080});await setup('frost_string_late');await page.mouse.down();const big=await frames(100);await page.mouse.up();assert(big.bullets.some(p=>p.style==='crystal'&&p.charge===1));checks.push({resolution:'1920x1080',flight:big});
  const sheet=await browser.newPage({viewport:{width:1440,height:900}});await sheet.setContent(`<html><style>body{margin:0;background:#10151f;color:#f4dfb9;font:16px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,480px)}figure{margin:0}figcaption{height:30px;line-height:30px;padding-left:16px}img{display:block;width:480px;height:270px}</style><div class="grid">${images.map(i=>`<figure><figcaption>${i.label}</figcaption><img src="data:image/png;base64,${i.data}"></figure>`).join('')}</div></html>`);await sheet.screenshot({path:'artifacts/weapon-mechanics-preview.png'});await sheet.close();
  assert.equal(errors.length,0);assert.equal(resources.length,0);writeFileSync('artifacts/weapon-mechanics-browser-report.json',JSON.stringify({note:'Authored game verification with actual mouse holds/releases and five/six right-click presses. Flight gallery includes a prepared sword-energy state; this does not measure human difficulty or subjective audio feel.',checks,errors,resources},null,2));console.log('Real partial releases, full-charge right-click routines for both characters, nine flight styles and two resolutions passed.');
}finally{await browser.close();}
