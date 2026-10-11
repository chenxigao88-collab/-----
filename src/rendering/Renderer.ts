import { AssetManager } from './AssetManager';
import { SpriteRenderer } from './SpriteRenderer';
import { EffectRenderer } from './EffectRenderer';
import { BOUNDS, direction, mul, constrain,add, distance, type Vec2 } from '../core/types';
import type { World } from '../world/World';
import { ElementRenderer } from './ElementRenderer';
import { AdventureRenderer } from './AdventureRenderer';
import { UltimateRenderer } from './UltimateRenderer';
import {ChapterRenderer} from './ChapterRenderer';
export class Renderer {
  readonly sprites: SpriteRenderer; private effects = new EffectRenderer();
  private ctx: CanvasRenderingContext2D;
  private elemental:ElementRenderer;
  private ultimate:UltimateRenderer;
  private chapter:ChapterRenderer;
  readonly adventure=new AdventureRenderer();
  constructor(readonly canvas: HTMLCanvasElement, readonly art: AssetManager) { this.ctx = canvas.getContext('2d', { alpha: false })!; this.ctx.imageSmoothingEnabled = false; this.sprites = new SpriteRenderer(art);this.elemental=new ElementRenderer(art);this.ultimate=new UltimateRenderer(art);this.chapter=new ChapterRenderer(art,this.sprites);this.adventure.art.useAtlas(art.adventure,art.adventureMetadata); }
  draw(world: World, aim: Vec2, fps = 60) {
    const ctx = this.ctx; ctx.setTransform(1,0,0,1,0,0); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0a1018'; ctx.fillRect(0,0,960,540);
    ctx.save(); ctx.translate(world.feel.offset.x,world.feel.offset.y);this.ultimate.camera(ctx,world);ctx.filter=world.time.enemyFrozen||world.ultimate.active?'saturate(.4) brightness(.88)':'none'; ctx.drawImage(world.adventureMode?this.art.chapterRooms[(world.adventure.template.region??1)-1]:this.art.room,0,0,960,540);ctx.filter='none';
    this.adventure.ground(ctx,world);
    this.chapter.ground(ctx,world);this.chapter.corpses(ctx,world);
    this.telegraphs(ctx, world);
    this.elemental.ground(ctx,world);
    this.ultimate.world(ctx,world,false);
      const player = world.player.actor;
    const melee = world.melee.attacks.find(a => a.actor === player);
    const bladeAngle = melee ? melee.angle - melee.hitbox.arc/2 + melee.hitbox.arc*melee.progress : undefined;
    const items = [{ y: player.pos.y, draw: () => { if (player.health.alive) this.sprites.player(ctx,player,world.ultimate.active?world.ultimate.shotWeapon(world.ultimate.elapsed<2.95?0:2):world.weapons.current.data,bladeAngle,world.player.dashing,world.player.dashElapsed); else {const face=Math.abs(Math.cos(player.facing))>Math.abs(Math.sin(player.facing))?(Math.cos(player.facing)>0?'right':'left'):(Math.sin(player.facing)>0?'down':'up');this.sprites.drawFrame(ctx,player.character==='violet'?`violet_death_${face}_${Math.min(3,Math.floor(world.resultElapsed*8))}`:`death_${Math.min(3,Math.floor(world.resultElapsed*10))}`,player.pos.x,player.pos.y,true);} } }, ...world.enemies.map(enemy => ({ y: enemy.actor.pos.y, draw: () => {ctx.filter=world.time.enemyFrozen?'saturate(.25)':'none';this.sprites.enemy(ctx,enemy);ctx.filter='none';} }))];
    items.push(...this.adventure.objects(ctx,world,this.sprites));items.sort((a,b)=>a.y-b.y); for (const item of items) item.draw();
    for (const enemy of world.enemies) {
      const actor = enemy.actor;
      if (enemy.elite || actor.health.hp < actor.health.maxHP) { ctx.fillStyle='#0a1019'; ctx.fillRect(Math.round(actor.pos.x-14),Math.round(actor.pos.y-53-actor.launch.height),28,3); ctx.fillStyle=enemy.elite?'#e9c077':'#dc8d75'; ctx.fillRect(Math.round(actor.pos.x-13),Math.round(actor.pos.y-52-actor.launch.height),26*actor.health.hp/actor.health.maxHP,1); }
      if (world.settings.enemyStates) { ctx.font='9px Consolas'; ctx.textAlign='center'; ctx.fillStyle='#ebd9a5'; ctx.fillText(enemy.state,actor.pos.x,actor.pos.y-60); }
    }
    this.effects.draw(ctx,world,this.sprites);
    this.elemental.markers(ctx,world);this.elemental.effects(ctx,world);
    this.ultimate.world(ctx,world);
    if(world.damage.shield>0){ctx.strokeStyle='#b2d89f99';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(player.pos.x,player.pos.y-21,23,29,0,0,Math.PI*2);ctx.stroke();}
    if (world.state === 'ready') {
      const near = distance(player.pos,{x:480,y:375})<=42; ctx.strokeStyle=near?'#92e4d8':'#ab9068'; ctx.lineWidth=1;
      ctx.setLineDash([4,4]); ctx.beginPath(); ctx.ellipse(480,375,27,10,0,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
    }
    if (world.settings.collisions) {
      ctx.strokeStyle='#8bebbd'; ctx.strokeRect(BOUNDS.left,BOUNDS.top,BOUNDS.right-BOUNDS.left,BOUNDS.bottom-BOUNDS.top);
      for (const a of world.actors) {
        const body = a.hurtbox.capsule(a.pos);
        ctx.strokeStyle='#8bebbd'; ctx.beginPath();
        ctx.arc(body.top.x,body.top.y,body.radius,Math.PI,Math.PI*2);
        ctx.lineTo(body.bottom.x+body.radius,body.bottom.y);
        ctx.arc(body.bottom.x,body.bottom.y,body.radius,0,Math.PI);
        ctx.closePath(); ctx.stroke();
        if (a.faction === 'enemy') { ctx.save(); ctx.strokeStyle='#91a2b477'; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.arc(a.pos.x,a.pos.y,a.hurtbox.radius,0,Math.PI*2); ctx.stroke(); ctx.restore(); }
      }
      ctx.strokeStyle='#fc9e70'; for (const p of world.projectiles.projectiles) { ctx.beginPath(); ctx.arc(p.pos.x,p.pos.y,p.radius,0,Math.PI*2); ctx.stroke(); }
    }
    ctx.restore();
    this.ultimate.overlay(ctx,world);
    if(world.time.enemyFrozen){ctx.save();ctx.fillStyle='#739aad18';ctx.fillRect(0,0,960,540);ctx.strokeStyle='#bbf6efaa';ctx.lineWidth=2;ctx.strokeRect(3,3,954,534);ctx.restore();}
    if(world.adventureMode&&world.adventure.transitionRemaining>0){ctx.fillStyle=`rgba(7,10,20,${Math.min(.85,world.adventure.transitionRemaining/.3)})`;ctx.fillRect(0,0,960,540);}
    const x=Math.round(aim.x+world.feel.offset.x),y=Math.round(aim.y+world.feel.offset.y);
    ctx.strokeStyle='#06151b';ctx.lineWidth=3;this.crosshair(ctx,x,y);ctx.strokeStyle='#d7ead7';ctx.lineWidth=1;this.crosshair(ctx,x,y);ctx.fillStyle='#8fecdd';ctx.fillRect(x,y,1,1);
    if (world.settings.stats) { const s=world.snapshot();ctx.fillStyle='#0c1821dd';ctx.fillRect(16,74,172,73);ctx.font='10px Consolas';ctx.fillStyle='#9adeca';ctx.textAlign='left';ctx.fillText(`FPS ${Math.round(fps)} / HITS ${s.hits}`,24,89);ctx.fillText(`PROJECTILES ${s.projectiles}`,24,104);ctx.fillText(`RESONANCE ${s.meter} / 100`,24,119);ctx.fillText(`ENEMY TIME ×${s.slow.toFixed(2)}`,24,134); }
  }
  private crosshair(ctx:CanvasRenderingContext2D,x:number,y:number) {ctx.beginPath();ctx.moveTo(x-9,y);ctx.lineTo(x-4,y);ctx.moveTo(x+4,y);ctx.lineTo(x+9,y);ctx.moveTo(x,y-9);ctx.lineTo(x,y-4);ctx.moveTo(x,y+4);ctx.lineTo(x,y+9);ctx.stroke();}
  private telegraphs(ctx: CanvasRenderingContext2D, world: World) {
    for (const spawn of world.room.pending) {ctx.save();ctx.globalAlpha=.35+Math.max(0,1-spawn.remaining/.6)*.6;ctx.strokeStyle='#f07e63';ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.ellipse(spawn.pos.x,spawn.pos.y,22,11,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
    for (const enemy of world.enemies) {
      if (enemy.state !== 'Attack') continue;
      const actor=enemy.actor;
      const locked=enemy.elapsed>=enemy.windup-enemy.data.lockLead,progress=Math.min(1,enemy.elapsed/enemy.windup);
      ctx.save();ctx.strokeStyle=locked?'#ffb39b':'#f6987988';ctx.fillStyle=`rgba(235,112,81,${.08+progress*.12})`;ctx.lineWidth=locked?1.5:1;
      if(enemy.kind==='sniper'){
        const end=add(actor.pos,mul(direction(enemy.lockedAngle),116));ctx.setLineDash(locked?[]:[4,3]);ctx.beginPath();ctx.moveTo(actor.pos.x,actor.pos.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(end.x,end.y,22,0,Math.PI*2);ctx.stroke();
        }else if(enemy.kind==='boss'&&enemy.bossMove==='slam'){
          const landing=constrain(add(actor.pos,mul(direction(enemy.lockedAngle),160)),actor.hurtbox.radius);
          ctx.setLineDash(locked?[]:[4,3]);ctx.beginPath();ctx.moveTo(actor.pos.x,actor.pos.y);ctx.lineTo(landing.x,landing.y);ctx.stroke();ctx.setLineDash([]);
          const left=mul(direction(enemy.lockedAngle-enemy.attackArc/2),enemy.attackRange),right=mul(direction(enemy.lockedAngle+enemy.attackArc/2),enemy.attackRange);
          const strip=[add(actor.pos,left),add(landing,left),add(landing,right),add(actor.pos,right)];ctx.beginPath();ctx.moveTo(strip[0].x,strip[0].y);for(const p of strip.slice(1))ctx.lineTo(p.x,p.y);ctx.closePath();ctx.fill();ctx.stroke();
          for(const origin of [actor.pos,landing]){ctx.beginPath();ctx.moveTo(origin.x,origin.y);ctx.arc(origin.x,origin.y,enemy.attackRange,enemy.lockedAngle-enemy.attackArc/2,enemy.lockedAngle+enemy.attackArc/2);ctx.closePath();ctx.fill();ctx.stroke();}
        }else{ctx.beginPath();ctx.moveTo(actor.pos.x,actor.pos.y);ctx.arc(actor.pos.x,actor.pos.y,enemy.attackRange,enemy.lockedAngle-enemy.attackArc/2,enemy.lockedAngle+enemy.attackArc/2);ctx.closePath();ctx.fill();ctx.stroke();}
      if(locked){ctx.fillStyle='#ffd096';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(enemy.attackIndex?'!!':'!',actor.pos.x,actor.pos.y-54);}
      ctx.restore();
    }
  }
}
