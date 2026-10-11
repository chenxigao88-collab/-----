import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.ASH_PLAYWRIGHT_PATH||resolve(dirname(process.execPath),'../node_modules/playwright'));
const edge=process.env.ASH_BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...existsSync(edge)?{executablePath:edge}:{}}),errors=[],responses=[],checks=[];
try{
  mkdirSync('artifacts',{recursive:true});
  for(const width of [960,1920]){
    const page=await browser.newPage({viewport:{width,height:width*9/16}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)responses.push(r.url());});
    await page.goto(process.env.ASH_PREVIEW_URL||'http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.hud);
    const before=await page.evaluate(()=>{
      const a=window.__ASH__.app,w=a.world;a.loop.stop();w.selectCharacter('violet');a.settings.mute=true;a.settings.invincible=true;a.settings.hitStrength=0;a.settings.shakeStrength=0;
      w.state='playing';w.adventure.started=true;w.adventure.currentId='inner-6';w.adventure.memory.cleared=true;w.room.configure([]);w.story.queue=[];w.story.seen.add('intro');
      w.progression.level=12;w.progression.ranks={damage:4,gunfu:3,element:3,health:1,blade:0,defence:0,dodge:0};w.progression.apply();w.player.stats.criticalChance=0;w.player.actor.health.maxHP=w.player.stats.maxHP;w.player.actor.health.hp=w.player.stats.maxHP;
      w.player.actor.pos={x:385,y:340};w.weapons.current.cooldown=.3;w.weapons.current.skillCooldown=2;w.weapons.manualSwitchCooldown=2.6;
      w.adventure.memory.drops.push({id:'browser-loot',weapon:'earth_crossbow_late',pos:{x:530,y:300},origin:'loot'});
      w.adventure.showPanel({kind:'weapon',source:'ground',sourceId:'browser-loot',weapon:'earth_crossbow_late'});a.render(.01);return {level:w.progression.level,cooldown:w.weapons.manualSwitchCooldown};
    });
    const text=await page.locator('.weapon-reward-panel').innerText();assert(text.includes('后期'));assert(text.includes('47 → 931'));assert(text.includes('65%破甲'));
    const bounds=await page.locator('.weapon-reward-panel').boundingBox();assert(bounds.y>=0&&bounds.y+bounds.height<=width*9/16);
    if(width===960)await page.screenshot({path:'artifacts/balance-weapon-comparison.png'});
    await page.locator('[data-weapon-slot="0"]').click();
    const after=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;a.render(.01);return {weapon:w.weapons.current.data.id,fireCooldown:w.weapons.current.cooldown,skillCooldown:w.weapons.current.skillCooldown,manualCooldown:w.weapons.manualSwitchCooldown,discard:w.adventure.memory.drops[0].weapon};});
    assert.equal(after.weapon,'earth_crossbow_late');assert.equal(after.fireCooldown,.3);assert.equal(after.skillCooldown,2);assert.equal(after.manualCooldown,before.cooldown);assert.equal(after.discard,'ash_needle');
    await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;w.weapons.step(.31);w.weapons.slots[1].data;const b=w.spawn('boss',{x:580,y:320},1);b.actor.previous={...b.actor.pos};w.player.actor.aim=Math.atan2(-69,195);a.canvas.focus();});
    await page.mouse.move(580*(width/960),271*(width/960));await page.mouse.down();
    const combat=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;for(let n=0;n<120;n++)w.step(1/120,a.input.take());a.render(.15);return {shots:w.attacks.shots,numbers:w.feel.numbers.map(n=>n.amount),inventory:a.hud.element.querySelector('[data-ui="inventory"]').textContent};});await page.mouse.up();
    assert.equal(combat.shots,1);assert(combat.numbers.includes(875));assert(combat.inventory.includes('地脉重弩'));
    if(width===960)await page.screenshot({path:'artifacts/balance-late-combat.png'});
    checks.push({width,before,after,combat,bounds});await page.close();
  }
  assert.equal(errors.length,0);assert.equal(responses.length,0);writeFileSync('artifacts/balance-browser-report.json',JSON.stringify({note:'Constructed late-run scene; actual UI weapon replacement and mouse firing at 960x540 and 1920x1080. Chapter playthrough with real drops is verified separately.',checks,errors,responses},null,2));
  console.log('Stage comparison, real replacement, preserved cooldowns, late damage numbers and both desktop resolutions passed without page/resource errors.');
}finally{await browser.close();}
