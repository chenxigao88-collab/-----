import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {existsSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=await chromium.launch({headless:true,...existsSync(edge)?{executablePath:edge}:{}}),errors=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  const result=await page.evaluate(async()=>{
    const {WEAPONS}=await import('/src/data/weapons.ts'),{REACTIONS}=await import('/src/data/elements.ts');
    const a=window.__ASH__.app,w=a.world;a.loop.stop();a.input.clear();w.prepareRoomTransition();w.state='playing';w.story.queue=[];w.progression.pending=0;w.room.configure([]);w.adventure.started=true;w.adventure.currentId='front';w.adventure.memory.cleared=true;
    a.settings.hitStrength=0;a.settings.shakeStrength=0;a.settings.mute=true;a.settings.invincible=true;w.player.actor.pos={x:480,y:440};w.player.actor.previous={...w.player.actor.pos};
    for(let i=0;i<REACTIONS.length;i++){
      const r=REACTIONS[i],e=w.spawn('shooter',{x:100+i%5*180,y:190+Math.floor(i/5)*190},-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;
      for(const element of r.elements){const c=w.attacks.snapshot(w.player.actor,1,'art-verification','swift',false);c.element=element;c.knockback=0;w.damage.tryHit(c,e.actor,{x:0,y:0});}
    }
    const gallery=WEAPONS.map(weapon=>{const f=a.art.frame(weapon.sprite),sheet=a.art.sheet(weapon.sprite,false),canvas=document.createElement('canvas');canvas.width=200;canvas.height=130;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;const scale=Math.min(174/f.rect[2],108/f.rect[3]),width=f.rect[2]*scale,height=f.rect[3]*scale;ctx.drawImage(sheet,...f.rect,(200-width)/2,(130-height)/2,width,height);return {id:weapon.id,name:weapon.displayName,tier:weapon.tier,image:canvas.toDataURL(),rect:f.rect};});
    const frames=a.art.metadata.reactions.flatMap(s=>Object.keys(s.frames));
    const canv=document.createElement('canvas');canv.width=960;canv.height=540;const c=canv.getContext('2d');
    // Assert the combat rendering path can operate with geometry drawing forbidden.
    for(const method of ['arc','ellipse','fillRect','strokeRect','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fill','stroke'])c[method]=()=>{throw Error(`Combat art used geometry: ${method}`);};
    w.elements.presentation(.22);a.renderer.elemental.ground(c,w);a.renderer.elemental.markers(c,w);a.renderer.elemental.effects(c,w);a.renderer.effects.draw(c,w,a.renderer.sprites);
    a.render(.01);
    return {gallery,frames:frames.length,reactions:w.elements.visuals.map(v=>v.id),hits:w.damage.hits,geometryFree:true};
  });
  assert.equal(result.gallery.length,24);assert.equal(new Set(result.gallery.map(w=>w.id)).size,24);assert.equal(result.frames,80);assert.equal(new Set(result.reactions).size,10);
  await page.screenshot({path:'artifacts/painted-reactions-game.png'});
  const hits=result.hits;
  for(const age of [.1,.2,.2,.3])await page.evaluate(age=>{const a=window.__ASH__.app,w=a.world;w.elements.presentation(age);a.render(.01);},age);
  assert.equal(await page.evaluate(()=>window.__ASH__.app.world.damage.hits),hits);
  const sheet=await browser.newPage({viewport:{width:1200,height:820}});
  await sheet.setContent(`<style>body{margin:0;background:#111823;color:#e7dac1;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(6,200px)}figure{margin:0;height:205px;text-align:center}img{width:200px;height:130px}small{display:block;color:#a8b0c1;margin-top:8px}</style><div class="grid">${result.gallery.map(w=>`<figure><img src="${w.image}"><figcaption>${w.name}</figcaption><small>${['','前期','中期','后期'][w.tier]}</small></figure>`).join('')}</div>`);
  await sheet.screenshot({path:'artifacts/painted-weapons-preview.png'});
  for(const mode of ['left','right']){
    const slash=await page.evaluate(mode=>{
      const a=window.__ASH__.app,w=a.world;a.input.clear();w.prepareRoomTransition();w.state='ready';if(!w.selectCharacter('violet'))throw Error('Violet selection failed');w.state='playing';w.story.queue=[];w.progression.pending=0;w.room.configure([]);w.player.actor.pos={x:430,y:340};w.player.actor.previous={...w.player.actor.pos};w.debugWeapon(0,'hush_edge_late');w.weapons.active=0;w.weapons.current.cooldown=0;w.weapons.switchLock=0;
      const requested=mode==='left'?w.attacks.requestPlayer(false,a.settings,{x:700,y:340}):w.gunfu.request({x:700,y:340});
      for(let i=0;i<60;i++){w.step(1/120,a.input.take());if(mode==='left'?w.melee.attacks.some(attack=>attack.progress>=.35):w.gunfu.effects.length>0)break;}
      const c=document.createElement('canvas').getContext('2d');for(const method of ['arc','ellipse','fillRect','strokeRect','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','fill','stroke'])c[method]=()=>{throw Error(`Slash art used geometry: ${method}`);};
      a.renderer.effects.draw(c,w,a.renderer.sprites);a.render(.01);
      return {requested,melee:w.melee.attacks.length,gunfu:w.gunfu.effects.length};
    },mode);
    assert(slash.requested);assert(mode==='left'?slash.melee>0:slash.gunfu>0);
    await page.screenshot({path:`artifacts/painted-slash-${mode}.png`});
  }
  assert.equal(errors.length,0);
  writeFileSync('artifacts/painted-art-browser-report.json',JSON.stringify({...result,gallery:result.gallery.map(({image,...w})=>w),errors},null,2));
  console.log('24 unique weapon sprites, 80 reaction frames, ten real reaction triggers, no extra damage, geometry-free combat rendering and resource loading passed.');
}finally{await browser.close();}
