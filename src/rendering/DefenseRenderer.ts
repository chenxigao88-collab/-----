import type {World} from '../world/World';
import type {SpriteRenderer} from './SpriteRenderer';
import {PaintRenderer} from './PaintRenderer';
import type {AssetManager} from './AssetManager';
import {STRUCTURES} from '../data/defense';
import type {Vec2} from '../core/types';
import {ReactionRenderer} from './ReactionRenderer';
export class DefenseRenderer {
  private paint:PaintRenderer;
  private reactions:ReactionRenderer;
  constructor(art:AssetManager,private sprites:SpriteRenderer){this.paint=new PaintRenderer(art);this.reactions=new ReactionRenderer(art);}
  ground(c:CanvasRenderingContext2D,w:World){
    if(!w.defenseMode)return;const d=w.defense;
    for(const v of d.visuals){const p=v.age/v.duration;if(v.kind==='ruin')this.paint.draw(c,'defense_ruin',v.pos.x,v.pos.y-10,40,32,0,1-p*.7);if(v.kind==='spawn')this.paint.draw(c,'defense_spawn',v.pos.x,v.pos.y-13,42+p*10,42+p*10,0,.6+Math.sin(p*Math.PI)*.35);}
    for(const p of d.pending){const progress=Math.max(0,1-p.remaining/1.1);this.paint.draw(c,'defense_spawn',p.pos.x,p.pos.y-13,42+progress*10,42+progress*10,0,.6+Math.sin(progress*Math.PI)*.35);}
    if(d.buildOpen&&d.canBuild){c.save();c.setLineDash([3,5]);c.strokeStyle='#9adfc542';c.strokeRect(145,145,670,260);c.restore();}
  }
  objects(c:CanvasRenderingContext2D,w:World){
    if(!w.defenseMode)return [];const d=w.defense;
    const items=[{y:d.core.pos.y,draw:()=>{this.sprites.drawFrame(c,d.core.hp<400?'defense_core_damaged':'defense_core',d.core.pos.x,d.core.pos.y+17,true);}}];
    for(const s of d.structures.filter(s=>s.hp>0))items.push({y:s.pos.y,draw:()=>{
      const frame=s.kind==='wall'&&s.hp<s.maxHP*.45?'defense_wall_damaged':STRUCTURES[s.kind].frame;
      c.save();c.globalAlpha=s.construction>0?.45:1;c.filter=s.flash>0?'brightness(1.5)':'none';
      if(s.kind==='wall'&&s.height>s.width){c.translate(s.pos.x,s.pos.y+15);c.scale(.75,1.15);this.sprites.drawFrame(c,frame,0,0,true);}else this.sprites.drawFrame(c,frame,s.pos.x,s.pos.y+10,true);c.restore();
      if(s.construction>0)this.paint.draw(c,'defense_foundation',s.pos.x,s.pos.y-4,42,46,0,.8);
      if(s.level>1){c.font='bold 9px Consolas';c.fillStyle='#f6d38d';c.textAlign='center';c.fillText('Ⅰ'.repeat(s.level),s.pos.x,s.pos.y-52);}
      if(s.hp<s.maxHP||s.id===d.selected){c.fillStyle='#15131d';c.fillRect(s.pos.x-18,s.pos.y+15,36,4);c.fillStyle=s.hp<s.maxHP*.35?'#df745f':'#a9cba5';c.fillRect(s.pos.x-17,s.pos.y+16,34*s.hp/s.maxHP,2);}
      if(s.id===d.selected){c.strokeStyle='#f4d59a';c.setLineDash([3,3]);c.strokeRect(s.pos.x-s.width/2-3,s.pos.y-s.height/2-3,s.width+6,s.height+6);c.setLineDash([]);}
    }});
    return items;
  }
  enemy(c:CanvasRenderingContext2D,w:World,index:number){
    const e=w.enemies[index],role=w.defense.roles.get(e.actor.id),frame=role==='breaker'?'defense_breaker':role==='artillery'?'defense_artillery':role==='bomber'?'defense_bomber':undefined;
    if(!frame){this.sprites.enemy(c,e);return;}
    c.save();c.filter=e.actor.flash>0?'brightness(1.8)':'none';const bob=e.actor.moving?Math.sin(e.actor.animation*14)*1.5:0;this.sprites.drawFrame(c,frame,e.actor.pos.x,e.actor.pos.y-e.actor.launch.height+bob,true);c.restore();
  }
  effects(c:CanvasRenderingContext2D,w:World){
    if(!w.defenseMode)return;const d=w.defense;
    for(const s of d.shells){const p=Math.min(1,s.age/s.duration),x=s.from.x+(s.pos.x-s.from.x)*p,y=s.from.y+(s.pos.y-s.from.y)*p-Math.sin(p*Math.PI)*75;
      this.paint.draw(c,'defense_shell',x,y,20,30,Math.atan2(s.pos.y-s.from.y,s.pos.x-s.from.x)+Math.PI*.75);
      if(s.enemy){c.save();c.strokeStyle='#ffb17e';c.setLineDash([3,3]);c.beginPath();c.ellipse(s.pos.x,s.pos.y,s.radius,s.radius*.55,0,0,Math.PI*2);c.stroke();c.restore();}
    }
    for(const v of d.visuals){const p=v.age/v.duration;
      if(v.kind==='blast')this.paint.draw(c,'defense_blast',v.pos.x,v.pos.y-20,v.radius*1.8,v.radius*1.6,0,1-p);
      if(v.kind==='pulse')this.reactions.drawBurst(c,'vortex',Math.min(7,Math.floor(p*8)),v.pos.x,v.pos.y-15,v.radius*(.8+p),(1-p)*.55);
      if(v.kind==='chain'&&v.points){for(let i=1;i<v.points.length;i++){const a=v.points[i-1],b=v.points[i],length=Math.hypot(b.x-a.x,b.y-a.y);this.paint.draw(c,'arc', (a.x+b.x)/2,(a.y+b.y)/2,length,12,Math.atan2(b.y-a.y,b.x-a.x),1-p);}}
    }
  }
  preview(c:CanvasRenderingContext2D,w:World,aim:Vec2){
    const d=w.defense;if(!w.defenseMode||!d.buildOpen||!d.canBuild||d.tool==='inspect')return;
    const p=d.placement(aim),data=STRUCTURES[d.tool];c.save();c.globalAlpha=.6;c.filter=p.valid?'brightness(1.1) sepia(.3) hue-rotate(65deg)':'sepia(1) saturate(3)';if(d.tool==='wall'&&d.rotation){c.translate(p.pos.x,p.pos.y+15);c.scale(.75,1.15);this.sprites.drawFrame(c,data.frame,0,0,true);}else this.sprites.drawFrame(c,data.frame,p.pos.x,p.pos.y+10,true);c.restore();
    c.strokeStyle=p.valid?'#9aefb5':'#fa817e';c.lineWidth=1;c.strokeRect(p.pos.x-p.width/2,p.pos.y-p.height/2,p.width,p.height);
    if(data.range){c.save();c.globalAlpha=.3;c.setLineDash([4,5]);c.beginPath();c.arc(p.pos.x,p.pos.y,data.range,0,Math.PI*2);c.stroke();c.restore();}
    c.textAlign='center';c.font='10px Microsoft YaHei';c.fillStyle=p.valid?'#caefc6':'#ffb3a4';c.fillText(p.valid?`${data.name} · ${data.price}金币`:p.reason,p.pos.x,p.pos.y+33);
  }
}
