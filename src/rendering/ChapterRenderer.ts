import type {World} from '../world/World';
import type {AssetManager} from './AssetManager';
import type {SpriteRenderer} from './SpriteRenderer';
export class ChapterRenderer {
  constructor(private art:AssetManager,private sprites:SpriteRenderer){}
  prop(c:CanvasRenderingContext2D,kind:string,frame:number,x:number,y:number,width:number,height=width){const id=`chapter_prop_${kind}_${frame}`,f=this.art.frame(id);c.drawImage(this.art.sheet(id,false),...f.rect,Math.round(x-width/2),Math.round(y-height),width,height);}
  ground(c:CanvasRenderingContext2D,w:World){if(!w.adventureMode)return;const a=w.adventure;
    for(const t of w.hazards.items){const phase=a.locked?w.hazards.phase(t):0,frame=t.kind==='crystal'?Math.floor(w.elapsed*3)%4:phase===2?2+Math.floor(t.age*15)%2:phase===1?1:0;
      c.save();if(phase===1&&t.kind!=='crystal'){c.fillStyle='#f3aa6745';c.fillRect(t.x,t.y,t.w,t.h);c.strokeStyle='#ffc58b';c.setLineDash([4,3]);c.strokeRect(t.x,t.y,t.w,t.h);c.setLineDash([]);}
      if(t.kind==='crystal'){for(let x=t.x+12;x<t.x+t.w;x+=26)this.prop(c,'crystal',frame,x,t.y+t.h,26,30);}
      else for(let y=t.y;y<t.y+t.h;y+=36)this.prop(c,t.kind,frame,t.x+t.w/2,Math.min(t.y+t.h,y+36),t.w,36);
      c.restore();
    }
    for(const b of w.special.blasts){c.save();if(b.age<.95){c.fillStyle='#eaa36422';c.strokeStyle='#f0ba7c';c.setLineDash([4,3]);c.beginPath();c.arc(b.pos.x,b.pos.y,70,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}else this.prop(c,'fire',2,b.pos.x,b.pos.y+32,120,95);c.restore();}
    if(a.template.kind==='entry')this.prop(c,'lamp',Math.floor(w.elapsed*4)%4,540,383,44);
    if(a.template.kind==='shop')this.prop(c,'lamp',Math.floor(w.elapsed*4)%4,383,239,45);
    if(a.template.kind==='event')this.prop(c,'lamp',Math.floor(w.elapsed*4)%4,440,255,48);
    if(a.template.valve){const done=w.story.valves.has(a.currentId);this.prop(c,'spikes',0,480,173,54,33);c.fillStyle=done?'#a5dac3':'#d5ab70';c.fillRect(478,148,4,16);c.fillRect(done?479:468,147,13,3);}
    if(a.template.kind==='final'&&a.memory.cleared)this.prop(c,'lamp',0,480,204,54);
  }
  corpses(c:CanvasRenderingContext2D,w:World){for(const f of w.special.fallen){const e=f.enemy,a=e.actor;if(!['shield','dancer','cantor','parasite','boss'].includes(e.kind))continue;c.save();c.globalAlpha=e.kind==='boss'?Math.max(.2,1-f.age/4):Math.max(0,1-f.age/.8);if(Math.cos(a.facing)<0){c.translate(a.pos.x*2,0);c.scale(-1,1);}const i=(e.kind==='boss'?28:20)+Math.min(3,Math.floor(f.age/(e.kind==='boss'?1.1:.7)*4));this.sprites.drawFrame(c,`chapter_${e.kind}_${i}`,a.pos.x,a.pos.y);c.restore();}}
}
