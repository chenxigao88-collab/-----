import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const checks=[],screens=[],errors=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5174/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  for(const facing of ['right','left'])for(const time of [1.055,1.655]){
    const result=await page.evaluate(({facing,time})=>{
      const app=window.__ASH__.app,w=app.world;app.loop.stop();app.input.clear();w.ultimate.cancel();w.prepareRoomTransition();w.time.clear();
      w.state='ready';w.selectCharacter('violet');w.state='playing';w.adventure.started=true;w.adventure.currentId='front';w.adventure.template.obstacles=[];w.adventure.memory.cleared=true;w.story.queue=[];w.progression.pending=0;w.room.configure([]);
      w.player.actor.pos={x:480,y:340};w.player.stats.criticalChance=0;w.player.actor.recoil=0;
      w.weapons.replace(0,'frost_string_late');w.weapons.replace(1,'ember_lantern_late');w.weapons.active=0;w.ultimate.energy=200;
      app.settings.mute=true;app.settings.shakeStrength=0;app.settings.hitStrength=0;
      const enemy=w.spawn('boss',{x:facing==='right'?700:260,y:340},-1,true);enemy.actor.health.hp=enemy.actor.health.maxHP=100000;
      const shots=[],emit=w.attacks.emitWeapon;
      w.attacks.emitWeapon=function(...args){shots.push({angle:args[2],hand:{...args[3]},length:args[6]});return emit.apply(this,args);};
      const aim={x:facing==='right'?900:60,y:340};w.ultimate.request(aim,2);
      try{for(let n=0;w.ultimate.elapsed<time&&n<1000;n++)w.step(1/120,{...app.input.take(),aim});}finally{w.attacks.emitWeapon=emit;}
      const actor=w.player.actor,weapon=w.weapons.current.data,draws=[],sprites=app.renderer.sprites,draw= sprites.weapon;
      sprites.weapon=function(ctx,...args){const translate=ctx.translate;ctx.translate=function(x,y){draws.push({x,y});return translate.call(this,x,y);};try{return draw.call(this,ctx,...args);}finally{ctx.translate=translate;}};
      try{app.render(.01);}finally{sprites.weapon=draw;}
      return {facing,time,elapsed:w.ultimate.elapsed,actor:{pos:actor.pos,aim:actor.aim,recoil:actor.recoil},shot:shots.at(-1),flash:w.feel.weaponFlashes.at(-1),draw:draws.at(-1),weapon:weapon.id};
    },{facing,time});
    assert(result.shot&&result.flash&&result.draw);
    assert(result.actor.pos.y-result.shot.hand.y>=60,'Gun must reach the raised glove instead of the waist');
    const {angle,hand,length}=result.shot,recoil=result.actor.recoil*4;
    assert(Math.abs(result.draw.x-Math.round(hand.x-Math.cos(angle)*recoil))<=1);
    assert(Math.abs(result.draw.y-Math.round(hand.y-Math.sin(angle)*recoil))<=1);
    assert(Math.hypot(result.flash.pos.x-hand.x-Math.cos(angle)*length,result.flash.pos.y-hand.y-Math.sin(angle)*length)<.01,'Flash and projectile origin must share the same muzzle');
    checks.push(result);screens.push({facing,time,image:(await page.screenshot()).toString('base64')});
  }
  const gallery=await browser.newPage({viewport:{width:1440,height:870}});
  await gallery.setContent(`<style>body{margin:0;background:#171020;color:#e8cbff;font:20px sans-serif}.grid{display:grid;grid-template-columns:repeat(2,720px)}figure{margin:0}figcaption{height:30px;padding-left:12px}img{display:block;width:720px;height:405px}</style><div class="grid">${screens.map(s=>`<figure><figcaption>${s.facing==='right'?'向右':'向左'} · ${s.time<1.3?'第一枪':'第二枪'}</figcaption><img src="data:image/png;base64,${s.image}"></figure>`).join('')}</div>`);
  await gallery.locator('img').last().waitFor();await gallery.screenshot({path:'artifacts/moon-gun-grip-preview.png'});
  assert.equal(errors.length,0);writeFileSync('artifacts/moon-gun-grip-report.json',JSON.stringify({checks,errors},null,2));
  console.log('Four live gun poses passed: raised glove anchors, left/right mirroring, weapon recoil and shared projectile/flash muzzle.');
}finally{await browser.close();}
