import type {World} from '../world/World';
import type {SpriteRenderer} from './SpriteRenderer';
import {WeaponRenderer} from './WeaponRenderer';
import {PaintRenderer} from './PaintRenderer';
import {violetMeleeFrame} from '../data/violetMelee';
export class EffectRenderer {
  private weapons=new WeaponRenderer();
  draw(ctx:CanvasRenderingContext2D,world:World,sprites:SpriteRenderer){
    const paint=new PaintRenderer(sprites.art);
    for(const e of world.gunfu.effects){
      const p=1-e.life/e.total,large=world.player.actor.character==='violet';
      if(e.kind==='shot')paint.draw(ctx,'muzzle_gold',e.pos.x+Math.cos(e.angle)*10,e.pos.y,37,25,e.angle,e.life/e.total);
      else if(e.kind==='land')paint.draw(ctx,'slash_spin',e.pos.x,e.pos.y+2,40+p*30,18+p*12,0,e.life/e.total*.6);
      else{
        const spin=e.kind==='sweep',size=(large?126:88)+world.gunfu.sweepRangeBonus()*2;
        const kind=spin?'spin':e.kind==='uppercut'?'upper':e.kind==='downslash'?'down':'slash';
        paint.draw(ctx,large?violetMeleeFrame(kind,p):spin?'slash_spin':'slash',e.pos.x,e.pos.y-16,size,size,e.angle+(large?0:e.kind==='uppercut'?-Math.PI/2:e.kind==='downslash'?Math.PI/2:0),Math.sin(Math.PI*Math.max(.08,Math.min(.92,p))));
      }
    }
    for(const ghost of world.feel.ghosts){
      ctx.save();ctx.globalAlpha=ghost.life/.16*.3;
      const facing=Math.abs(Math.cos(ghost.facing))>Math.abs(Math.sin(ghost.facing))?(Math.cos(ghost.facing)>0?'right':'left'):(Math.sin(ghost.facing)>0?'down':'up');
      const id=world.player.actor.character==='violet'?`violet_dash_${facing}_${Math.min(3,Math.floor(ghost.dashElapsed/.14*4))}`:sprites.animator.combat('slide',ghost.facing,ghost.dashElapsed,.14);
      sprites.drawFrame(ctx,id,ghost.pos.x,ghost.pos.y,true);ctx.restore();
    }
    for(const attack of world.melee.attacks){
      if(attack.elapsed<attack.windup||attack.elapsed>attack.windup+attack.active+.03)continue;
      const r=attack.hitbox.radius,p=Math.max(.08,Math.min(.92,attack.progress));
      if(attack.context.weaponId==='boss'){
        const art=sprites.art,frame=Math.min(7,Math.floor(attack.progress*8)),kind=attack.hitbox.arc<2?'slash':'spin',rect=art.ultimateEffectsMetadata.frames[`ultimate_fx_${kind}_${frame}`].rect;
        ctx.save();ctx.translate(Math.round(attack.actor.pos.x),Math.round(attack.actor.pos.y-25));ctx.rotate(attack.angle);ctx.filter='hue-rotate(80deg) saturate(1.7)';ctx.drawImage(art.ultimateEffects,...rect,-155,-155,310,310);ctx.restore();continue;
      }
      const violet=attack.context.faction==='player'&&attack.actor.character==='violet';
      paint.draw(ctx,violet?violetMeleeFrame(attack.hitbox.arc>3?'spin':'slash',attack.progress):attack.hitbox.arc>3?'slash_spin':'slash',attack.actor.pos.x,attack.actor.pos.y-12,r*2,r*2,attack.angle+(p-.5)*.45,Math.sin(Math.PI*p));
    }
    this.weapons.draw(ctx,world,sprites.art);
    for(const r of world.feel.rings){const p=1-r.life/r.total;paint.draw(ctx,r.radius>40?'explosion':'slash_spin',r.pos.x,r.pos.y-8,r.radius*2*(.4+.6*p),r.radius*2*(.4+.6*p),p*.15,r.life/r.total);}
    for(const p of world.feel.particles)paint.draw(ctx,'spark',p.pos.x,p.pos.y,p.size*5,p.size*5,(p.pos.x+p.pos.y)*.1,p.life/p.total);
    ctx.textAlign='center';
    for(const n of world.feel.numbers){
      ctx.font=`bold ${n.critical||n.amount>=100?15:n.amount>=40?13:11}px Consolas, monospace`;
      ctx.globalAlpha=Math.min(1,n.life/.15);ctx.fillStyle='#09121c';ctx.fillText(String(n.amount),Math.round(n.pos.x)+1,Math.round(n.pos.y)+1);
      ctx.fillStyle=n.critical?'#ffce8c':n.amount>=100?'#ffe2a3':'#e9ecda';ctx.fillText(`${n.critical?'◆':''}${n.amount}`,Math.round(n.pos.x),Math.round(n.pos.y));
    }
    ctx.globalAlpha=1;
  }
}
