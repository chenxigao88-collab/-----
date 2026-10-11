import type {AssetManager} from './AssetManager';
import type {World} from '../world/World';
import type {ReactionId} from '../data/elements';
import {REACTION_EFFECTS,reactionFrame} from '../data/reactionEffects';
import type {Vec2} from '../core/types';
import {PaintRenderer} from './PaintRenderer';

export class ReactionRenderer {
  constructor(private art:AssetManager){}
  drawBurst(ctx:CanvasRenderingContext2D,id:ReactionId,frame:number,x:number,y:number,size:number,alpha=1){
    const {image,frame:data}=this.art.effect(`fx_${id}_${frame}`);
    ctx.save();ctx.globalAlpha*=Math.max(0,Math.min(1,alpha));ctx.drawImage(image,...data.rect,Math.round(x-size/2),Math.round(y-size/2),size,size);ctx.restore();
  }
  ground(ctx:CanvasRenderingContext2D,world:World){
    for(const v of world.elements.visuals){const effect=REACTION_EFFECTS[v.id],p=1-v.life/v.total;if(!effect.ground||p>.7)continue;
      const radius=Math.min(v.radius||45,95)*(.2+.8*Math.min(1,p/.44)),alpha=(1-p/.7)*.3;
      ctx.save();ctx.translate(v.ground.x,v.ground.y);ctx.scale(1,.48);
      this.drawBurst(ctx,v.id,reactionFrame(v.total-v.life,v.total),0,0,radius*2,alpha);ctx.restore();
    }
  }
  beam(ctx:CanvasRenderingContext2D,points:Vec2[],elapsed:number,alpha:number,_color='#c9b6ff'){
    if(points.length<2)return;const paint=new PaintRenderer(this.art);
    for(let segment=1;segment<points.length;segment++){
      const a=points[segment-1],b=points[segment],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
      paint.draw(ctx,'arc',(a.x+b.x)/2,(a.y+b.y)/2,length,16+Math.sin(elapsed*35)*3,Math.atan2(dy,dx),alpha);
    }
  }
  effects(ctx:CanvasRenderingContext2D,world:World){
    for(const enemy of world.enemies){const a=enemy.actor,state=a.elemental,center=a.hurtbox.center(a.pos),tick=Math.floor(world.elapsed*7);
      if(world.elements.isBurning(a.id))this.drawBurst(ctx,'burn',[3,4,5,4][tick%4],center.x,center.y+12,34,.52);
      if(state.exposureTime>0)this.drawBurst(ctx,'exposure',2+tick%4,center.x,center.y,30,.38);
      if(state.hardKind==='root'&&state.hardTime>0)this.drawBurst(ctx,'bind',3+tick%2,center.x,center.y+12,52,.6);
      else if(state.slowStrength>=.2)this.drawBurst(ctx,'vortex',6,center.x,center.y,38,.28+.08*Math.sin(world.elapsed*5));
    }
    for(const v of world.elements.visuals){const elapsed=v.total-v.life,effect=REACTION_EFFECTS[v.id],frame=reactionFrame(elapsed,v.total),alpha=Math.min(1,v.life/(v.total*.18))*.92;
      this.drawBurst(ctx,v.id,frame,v.pos.x,v.pos.y,effect.size,alpha*(frame===2||frame===3?.78:1));
      if(v.lines){const points=v.lines.map((point,i)=>{const actor=world.actors.find(a=>a.id===v.lineTargets?.[i]&&a.health.alive);return actor?.hurtbox.center(actor.pos)??point;});this.beam(ctx,points,elapsed,Math.min(1,v.life/.24),effect.color);for(const point of points.slice(1))this.drawBurst(ctx,'conduct',frame,point.x,point.y,38,alpha*.7);}
    }
    for(const arc of world.abilities.arcs)this.beam(ctx,arc.points,arc.total-arc.life,arc.life/arc.total);
    ctx.save();ctx.textAlign='center';ctx.font='10px Microsoft YaHei';const labels:Vec2[]=[];
    for(const v of world.elements.visuals){if(labels.length>=6)break;const elapsed=v.total-v.life;if(elapsed>v.total*.75)continue;const pos={x:v.pos.x,y:v.pos.y-45-elapsed*10};if(labels.some(p=>Math.abs(p.x-pos.x)<52&&Math.abs(p.y-pos.y)<16))continue;labels.push(pos);
      ctx.globalAlpha=Math.min(1,v.life/.25);ctx.fillStyle='#09131d';ctx.fillText(v.name,Math.round(pos.x)+1,Math.round(pos.y)+1);ctx.fillStyle=v.color;ctx.fillText(v.name,Math.round(pos.x),Math.round(pos.y));
    }ctx.restore();
  }
}
