import type { World } from '../world/World';
import { ELEMENTS, getReaction } from '../data/elements';
import type {AssetManager} from './AssetManager';
import {ReactionRenderer} from './ReactionRenderer';
import {PaintRenderer} from './PaintRenderer';

export class ElementRenderer {
  private reactions:ReactionRenderer;
  private paint:PaintRenderer;
  constructor(art:AssetManager){this.reactions=new ReactionRenderer(art);this.paint=new PaintRenderer(art);}
  ground(ctx:CanvasRenderingContext2D,world:World){
    this.reactions.ground(ctx,world);
    for(const area of world.abilities.areas){
      const fire=area.mode==='zone',progress=fire?Math.min(1,area.elapsed/area.duration):Math.min(1,area.elapsed/area.delay);
      if(fire){
        // Project a painted flame bed onto the floor, then layer upright tongues.
        ctx.save();ctx.translate(area.pos.x,area.pos.y);ctx.scale(1,.55);this.reactions.drawBurst(ctx,'burn',2+Math.floor(area.elapsed*7)%3,0,0,area.radius*2,.38*(1-progress*.45));ctx.restore();
        for(let i=0;i<3;i++){const angle=i*Math.PI*2/3+area.elapsed*.2;this.paint.draw(ctx,'fireball',area.pos.x+Math.cos(angle)*area.radius*.43,area.pos.y+Math.sin(angle)*area.radius*.3,28,32,-Math.PI/2,.55);}
      }else this.paint.draw(ctx,'muzzle_arc',area.pos.x,area.pos.y,area.radius*2,area.radius*2,area.elapsed*.3,.22+progress*.42);
    }
    for(const enemy of world.enemies){
      const state=enemy.actor.elemental,element=world.weapons.current.data.element;
      if(state.mark&&state.reactionCooldown<=0&&getReaction(state.mark,element)){
        const reaction=getReaction(state.mark,element)!;
        this.reactions.drawBurst(ctx,reaction.id,1,enemy.actor.pos.x,enemy.actor.pos.y-22,46,.22);
      }
    }
  }
  markers(ctx:CanvasRenderingContext2D,world:World){
    ctx.save();ctx.textAlign='center';ctx.font='10px Microsoft YaHei';
    for(const enemy of world.enemies){
      const actor=enemy.actor,state=actor.elemental;
      const lift=actor.launch.height;
      if(enemy.elite){ctx.fillStyle='#e9c077';ctx.fillText('强化炉眼',actor.pos.x,actor.pos.y-65-lift);}
      if(state.mark){
        const data=ELEMENTS[state.mark],x=Math.round(actor.pos.x+23),y=Math.round(actor.pos.y-40-lift);
        const artId={fire:'fireball',ice:'crystal',lightning:'muzzle_arc',wind:'wind',earth:'gravel'}[state.mark];
        this.paint.draw(ctx,artId,x,y,22,22,0,state.reactionCooldown>0?.5:1);
        ctx.fillStyle=data.color;ctx.font='8px Consolas';ctx.fillText(state.markTime.toFixed(1),x,y+14);ctx.font='10px Microsoft YaHei';
        if(state.reactionCooldown>0){ctx.fillStyle='#ced7de';ctx.font='8px Consolas';ctx.fillText(state.reactionCooldown.toFixed(1),x,y+22);ctx.font='10px Microsoft YaHei';}
      }
      if(state.hardTime>0){ctx.fillStyle='#b9def5';ctx.fillText(state.hardKind==='root'?'缚':'断',actor.pos.x-23,actor.pos.y-24-lift);}
      else if(state.protectionTime>0){ctx.fillStyle='#a2a9b5';ctx.fillText('抗',actor.pos.x-23,actor.pos.y-24-lift);}
      if(state.exposureTime>0){ctx.fillStyle='#ffc79e';ctx.fillText('蚀',actor.pos.x-23,actor.pos.y-39-lift);}
      if(state.slowTime>0)this.paint.draw(ctx,'wind',actor.pos.x,actor.pos.y+2,34,15,0,.3);
    }
    ctx.restore();
  }
  effects(ctx:CanvasRenderingContext2D,world:World){
    this.reactions.effects(ctx,world);
  }
}
