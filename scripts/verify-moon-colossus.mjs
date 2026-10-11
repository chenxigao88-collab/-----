import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
const url=process.env.ASH_VERIFY_URL??'http://127.0.0.1:5174/',errors=[],checks=[],screens=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(url);await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  await page.evaluate(async()=>{
    const app=window.__ASH__.app;app.loop.stop();app.input.clear();
    const {PaintRenderer}=await import('/src/rendering/PaintRenderer.ts');
    const log=()=>window.__MOON_VISUAL_LOG__??[];
    const paint=PaintRenderer.prototype.draw;
    PaintRenderer.prototype.draw=function(ctx,id,x,y,width,height=width,angle=0,alpha=1){
      log().push({kind:'paint',id,layer:window.__MOON_VISUAL_LAYER__,x,y,width,height,alpha});
      return paint.call(this,ctx,id,x,y,width,height,angle,alpha);
    };
    const ultimate=app.renderer.ultimate,world=ultimate.world,overlay=ultimate.overlay;
    ultimate.world=function(ctx,w,foreground=true){const previous=window.__MOON_VISUAL_LAYER__;window.__MOON_VISUAL_LAYER__=foreground?'foreground':'background';try{return world.call(this,ctx,w,foreground);}finally{window.__MOON_VISUAL_LAYER__=previous;}};
    ultimate.overlay=function(ctx,w){const previous=window.__MOON_VISUAL_LAYER__;window.__MOON_VISUAL_LAYER__='overlay';try{return overlay.call(this,ctx,w);}finally{window.__MOON_VISUAL_LAYER__=previous;}};
    const sprites=app.renderer.sprites,player=sprites.player,enemy=sprites.enemy,frame=sprites.drawFrame;
    sprites.player=function(...args){log().push({kind:'player'});return player.apply(this,args);};
    sprites.enemy=function(...args){log().push({kind:'enemy',enemyKind:args[1].kind});return enemy.apply(this,args);};
    sprites.drawFrame=function(ctx,id,x,y,...args){
      if(id.startsWith('moon_body_')){
        const f=this.art.frame(id,true),transform=ctx.getTransform();
        const corners=[[x-f.pivot[0],y-f.pivot[1]],[x-f.pivot[0]+f.size[0],y-f.pivot[1]+f.size[1]]].map(([px,py])=>transform.transformPoint(new DOMPoint(px,py)));
        log().push({kind:'heroBody',id,box:{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))}});
      }
      return frame.call(this,ctx,id,x,y,...args);
    };
  });
  for(const facing of ['right','left'])for(const targets of [1,8])for(const time of [4.3,4.7]){
    const result=await page.evaluate(({facing,targets,time})=>{
      const app=window.__ASH__.app,w=app.world,sign=facing==='right'?1:-1;
      app.input.clear();w.ultimate.cancel();w.prepareRoomTransition();w.time.clear();w.feel.rings=[];
      w.state='ready';w.selectCharacter('violet');w.state='playing';w.adventure.started=true;
      w.adventure.currentId='front';w.adventure.template.obstacles=[];w.adventure.memory.cleared=true;
      w.story.queue=[];w.progression.pending=0;w.room.configure([]);
      w.player.actor.pos={x:facing==='right'?410:550,y:340};w.player.actor.health.heal();
      w.weapons.replace(0,'frost_string_late');w.weapons.replace(1,'ember_lantern_late');w.weapons.active=0;
      w.player.stats.criticalChance=0;w.ultimate.energy=200;app.settings.mute=true;
      app.settings.shakeStrength=0;app.settings.hitStrength=0;app.settings.enemyStates=false;app.settings.collisions=false;app.settings.stats=false;
      for(let n=0;n<targets;n++){
        const e=w.spawn(n===targets-1?'boss':'chaser',{x:(facing==='right'?540:420)+sign*(n%4)*32,y:targets===1?340:320+Math.floor(n/4)*40},-1,true);
        e.actor.health.hp=e.actor.health.maxHP=100000;
      }
      const aim={x:facing==='right'?900:60,y:340};
      if(!w.ultimate.request(aim,2))throw new Error('Second ultimate did not start');
      for(let n=0;w.ultimate.elapsed<time&&n<1000;n++)w.step(1/120,{...app.input.take(),aim});
      window.__MOON_VISUAL_LOG__=[];app.render(.01);
      return {facing,targets,time,elapsed:w.ultimate.elapsed,locked:w.ultimate.targets.length,playerPosition:w.player.actor.pos,
        moonAnchor:w.ultimate.moonAnchor,bossLift:w.special.boss.actor.launch.height,draws:window.__MOON_VISUAL_LOG__};
    },{facing,targets,time});
    assert.equal(result.locked,targets);assert.equal(result.bossLift,0);
    const stage=time===4.3?'split':'burst',moons=result.draws.filter(draw=>draw.kind==='paint'&&draw.id.startsWith(`moon_colossus_${stage}_`));
    assert.equal(moons.length,1,`${facing}, ${targets} targets: must draw one ${stage}`);
    assert.equal(moons[0].layer,'background');assert(moons[0].width>=400);
    const forbidden=result.draws.filter(draw=>draw.kind==='paint'&&(draw.layer==='foreground'||draw.layer==='overlay')&&(/burst|split/.test(draw.id)||/^moon_rift_[3-5]$/.test(draw.id)));
    assert.equal(forbidden.length,0);
    const markers=result.draws.filter(draw=>draw.kind==='paint'&&draw.layer==='foreground');
    assert(markers.every(draw=>draw.width<=48&&draw.height<=48&&draw.alpha<=.6));
    const heroIndex=result.draws.findIndex(draw=>draw.kind==='player');assert(heroIndex>=0);
    assert(result.draws.every((draw,index)=>(draw.kind!=='enemy'&&draw.kind!=='paint')||index<heroIndex));
    assert(result.draws.some(draw=>draw.kind==='enemy'&&draw.enemyKind==='boss'));
    const body=result.draws.find(draw=>draw.kind==='heroBody');assert(body);
    assert(body.box.left>=0&&body.box.right<=960&&body.box.top>=0&&body.box.bottom<=540,'Hero must remain in the viewport');
    assert(body.box.right-body.box.left>=80,'Hero silhouette must retain a readable size');
    checks.push({...result,checks:['one colossal background moon','no foreground moon or explosion','small enemy marks','hero drawn after moon, marks and Boss','hero completely inside the view','Boss stays grounded']});
    screens.push({facing,targets,time,image:(await page.screenshot()).toString('base64')});
  }
  const choices=[['right',1,4.3],['right',1,4.7],['left',1,4.7],['right',8,4.3],['right',8,4.7],['left',8,4.7]];
  const selected=choices.map(([facing,targets,time])=>screens.find(screen=>screen.facing===facing&&screen.targets===targets&&screen.time===time));
  const gallery=await browser.newPage({viewport:{width:1440,height:600}});
  await gallery.setContent(`<style>body{margin:0;background:#171020;color:#e8cbff;font:15px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,480px)}figure{margin:0}figcaption{height:30px;line-height:30px;padding-left:12px}img{display:block;width:480px;height:270px}</style><div class="grid">${selected.map(screen=>`<figure><figcaption>${screen.facing==='right'?'向右':'向左'} · ${screen.targets}个目标 · ${screen.time===4.3?'斩月':'单次月破'} ${screen.time}s</figcaption><img src="data:image/png;base64,${screen.image}"></figure>`).join('')}</div>`);
  await gallery.locator('img').last().waitFor();await gallery.screenshot({path:'artifacts/moon-colossus-variants.png'});
  assert.equal(errors.length,0);writeFileSync('artifacts/moon-colossus-variants-report.json',JSON.stringify({url,scenarioCount:checks.length,checks,errors},null,2));
  console.log('Eight live render scenarios passed: left/right, 1/8 targets, split/rupture, single background moon, small markers and visible foreground heroine.');
}finally{await browser.close();}
