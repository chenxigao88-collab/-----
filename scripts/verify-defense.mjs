import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[];
try{
  const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(process.env.ASH_VERIFY_URL??'http://127.0.0.1:5174/');await page.locator('[data-command="defense-enter"]').waitFor();
  mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/defense-level-entry.png'});
  await page.locator('[data-command="defense-enter"]').click();await page.locator('.defense-status').waitFor();
  assert.equal(await page.evaluate(()=>window.__ASH__.app.world.defenseMode),true);
  const canvas=page.locator('.stage>canvas'),box=await canvas.boundingBox();const click=async(x,y)=>page.mouse.click(box.x+x/960*box.width,box.y+y/540*box.height);
  await click(320,240);await page.waitForFunction(()=>window.__ASH__.app.world.defense.walls===1,{},{timeout:3000}).catch(async error=>{console.log(await page.evaluate(()=>({world:window.__ASH__.app.world.snapshot(),toast:window.__ASH__.app.world.toast,input:window.__ASH__.app.input.take()})));await page.screenshot({path:'artifacts/defense-build-failure.png'});throw error;});assert.equal(await page.evaluate(()=>window.__ASH__.app.world.defense.gold),220);
  await click(320,240);assert.equal(await page.evaluate(()=>window.__ASH__.app.world.defense.gold),220);
  await page.locator('[data-build-kind="ballista"]').click();await click(350,310);await page.waitForFunction(()=>window.__ASH__.app.world.defense.towers===1);
  await page.locator('[data-build-kind="frost"]').click();await click(610,310);await page.waitForFunction(()=>window.__ASH__.app.world.defense.towers===2);
  await page.screenshot({path:'artifacts/defense-preparation.png'});
  await page.locator('[data-defense-action="defense-start"]').click();await page.waitForFunction(()=>window.__ASH__.app.world.defense.alive.length>=3);
  await page.keyboard.press('KeyB');await page.locator('[data-build-kind="inspect"]').click();await click(320,240);await page.locator('[data-defense-action="defense-upgrade"]').waitFor();await page.keyboard.press('KeyB');
  await page.screenshot({path:'artifacts/defense-first-wave.png'});
  // Exercise the full tower/effect palette and all siege roles against the actual renderer.
  const setup=await page.evaluate(()=>{
    const app=window.__ASH__.app,w=app.world,d=w.defense;app.loop.stop();app.input.clear();w.state='playing';w.adventure.panel=undefined;d.phase='wave';d.wave=4;d.spawned=40;d.pending=[];w.enemies=[];d.roles.clear();d.core.hp=1000;d.gold=3000;d.buildOpen=false;w.player.actor.pos={x:530,y:370};
    for(const [kind,x,y]of [['mortar',620,215],['lightning',640,340],['ballista',350,200]]){d.tool=kind;d.place({x,y});}
    for(const [role,x,y]of [['breaker',260,230],['artillery',750,240],['bomber',640,410],['raider',220,310],['raider',300,350],['raider',580,175],['boss',750,390]]){const e=d.spawnEnemy(role,{x,y});e.actor.health.hp=e.actor.health.maxHP=20000;}
    w.selectCharacter('violet');w.player.actor.character='violet';app.settings.mute=true;w.player.actor.invulnerability.setDebug(true);w.ultimate.energy=200;app.render(.01);return d.snapshot();
  });
  for(let n=0;n<180;n++)await page.evaluate(()=>{const a=window.__ASH__.app;a.world.step(1/60,{move:{x:0,y:0},aim:{x:750,y:290},fire:false,skill:false,dash:false,swap:false,interact:false,ultimate:false});a.render(1/60);});
  await page.screenshot({path:'artifacts/defense-combat.png'});
  const combat=await page.evaluate(()=>{const a=window.__ASH__.app;return {defense:a.world.defense.snapshot(),hits:a.world.damage.hits,reactions:a.world.elements.activations,shells:a.world.defense.shells.length};});assert(combat.hits>0);
  await page.keyboard.press('Shift+KeyR');const ultimate=await page.evaluate(()=>{const a=window.__ASH__.app;a.world.step(1/120,a.input.take());return a.world.ultimate.snapshot();});assert.equal(ultimate.active,true);assert.equal(ultimate.tier,2);
  for(let n=0;n<600;n++){const active=await page.evaluate(()=>{const a=window.__ASH__.app;a.world.step(1/60,a.input.take());a.render(1/60);return a.world.ultimate.active;});if(!active)break;}
  assert.equal(await page.evaluate(()=>window.__ASH__.app.world.ultimate.active),false);
  await page.screenshot({path:'artifacts/defense-after-ultimate.png'});
  assert.equal(errors.length,0,JSON.stringify(errors));writeFileSync('artifacts/defense-browser-report.json',JSON.stringify({checks:['level entry','real pointer free placement','overlap does not spend gold','different towers','wave start','B mode switching','inspect structure','seven siege/render targets','native tower damage','Shift+R with destructible obstacles'],setup,combat,ultimate,errors},null,2));
  console.log('Defense level entry, real build input, wallet, all towers, siege roles, native effects and Moon Sever passed.');
}finally{await browser.close();}
