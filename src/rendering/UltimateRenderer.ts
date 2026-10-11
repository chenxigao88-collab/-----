import type {World} from '../world/World';
import type {AssetManager} from './AssetManager';
import {clamp} from '../core/types';
import {PaintRenderer} from './PaintRenderer';
import {violetMeleeFrame,type VioletMeleeKind} from '../data/violetMelee';
import {ULTIMATE_CUT_START,ULTIMATE_CUT_END,ULTIMATE_FINAL_SPIN_START,ultimateCutFrame} from '../data/ultimate';
import {moonBodyFrame,moonEffectFrame,MOON_HITS} from '../data/moonUltimate';
export class UltimateRenderer {
  constructor(private art:AssetManager){}
  camera(c:CanvasRenderingContext2D,w:World){
    const u=w.ultimate;if(!u.active)return;
    const points=[w.player.actor.pos,...u.targets.filter(a=>a.health.alive).map(a=>a.pos)];
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys)-55,bottom=Math.max(...ys)+25;
    const limit=Math.min(1.6,650/(right-left+140),390/(bottom-top+90));
    const ramp=Math.min(1,u.elapsed/.55,(u.duration-u.elapsed)/.5),zoom=1+(Math.max(1,limit)-1)*Math.max(0,ramp);
    let centerX=(left+right)/2;const cutRight=Math.cos(u.angle)<0;
    if(u.tier===1&&u.elapsed>=ULTIMATE_CUT_START-.2&&u.elapsed<ULTIMATE_CUT_END+.2){
      const focus=cutRight?Math.max(centerX,w.player.actor.pos.x-40/zoom):Math.min(centerX,w.player.actor.pos.x+40/zoom);
      const blend=Math.max(0,Math.min(1,(u.elapsed-ULTIMATE_CUT_START+.2)/.2,(ULTIMATE_CUT_END+.2-u.elapsed)/.2));centerX+=(focus-centerX)*blend;
    }
    let scale=zoom,centerY=(top+bottom)/2;
    if(u.tier===2&&u.elapsed>=3.2){const blend=clamp((u.elapsed-3.2)/.6,0,1),pullback=clamp((u.elapsed-3.8)/.75,0,1),end=clamp((u.duration-u.elapsed)/.45,0,1),stageZoom=1+(1.35-.2*pullback-1)*end;scale+=(stageZoom-scale)*blend;centerX+=(u.moonFocus.x-centerX)*blend;centerY+=(u.moonFocus.y-centerY)*blend;}
    const x=clamp(centerX,480/scale,960-480/scale),y=clamp(centerY,270/scale,540-270/scale);
    c.translate(480,270);c.scale(scale,scale);c.translate(-x,-y);
  }
  private effect(c:CanvasRenderingContext2D,kind:string,time:number,duration:number,x:number,y:number,size:number,angle=0){
    if(time<0||time>=duration)return;
    const frame=Math.min(7,Math.floor(time/duration*8)),rect=this.art.ultimateEffectsMetadata.frames[`ultimate_fx_${kind}_${frame}`].rect;
    c.save();c.translate(Math.round(x),Math.round(y));c.rotate(angle);c.drawImage(this.art.ultimateEffects,...rect,-size/2,-size/2,size,size);c.restore();
  }
  private melee(c:CanvasRenderingContext2D,kind:VioletMeleeKind,time:number,duration:number,x:number,y:number,size:number,angle=0){
    if(time<0||time>=duration)return;
    new PaintRenderer(this.art).draw(c,violetMeleeFrame(kind,time/duration),x,y,size,size,angle);
  }
  world(c:CanvasRenderingContext2D,w:World,foreground=true){
    const u=w.ultimate;if(!u.active)return;const t=u.elapsed,a=w.player.actor;
    if(u.tier===2){this.moonWorld(c,w,foreground);return;}
    if(!foreground){
      this.melee(c,'down',t-.9,.43,a.pos.x+Math.cos(u.angle)*35,a.pos.y-25,150,u.angle);
      this.melee(c,'spin',t-1.25,.62,a.pos.x,a.pos.y-22,178,u.angle);
      this.melee(c,'spin',t-ULTIMATE_FINAL_SPIN_START,ULTIMATE_CUT_END-ULTIMATE_FINAL_SPIN_START,a.pos.x,a.pos.y-22,196,u.angle);
      return;
    }
    for(const target of u.targets){if(!target.health.alive)continue;const p=target.pos;
      c.fillStyle='#bfa0e5';for(const side of [-1,1]){c.fillRect(Math.round(p.x+side*19)-1,Math.round(p.y-17),2,5);c.fillRect(Math.round(p.x+side*19)-1,Math.round(p.y-17),side*4,1);}
      c.fillStyle='#f2d5ff';c.fillRect(Math.round(p.x)-1,Math.round(p.y-63-target.launch.height),3,5);
    }
    for(const [shot,start]of [2.15,2.72,3.22].entries()){
      const age=t-start;if(age<0||age>.25)continue;
      const weapon=u.shotWeapon(shot);if(weapon.category==='melee')continue;
      const angle=a.action?.angle??u.angle,frame=this.art.frame(weapon.sprite),tip=7+(frame.size[0]-frame.pivot[0])*.68,from={x:a.pos.x+Math.cos(angle)*tip,y:a.pos.y-18+Math.sin(angle)*tip};
      this.effect(c,'muzzle',age,.25,from.x,from.y,44,angle);
    }
    for(const target of u.targets)this.effect(c,'finish',t-3.98,.62,target.pos.x,target.pos.y-26,126);
  }
  overlay(c:CanvasRenderingContext2D,w:World){
    const u=w.ultimate;if(!u.active)return;const t=u.elapsed;
    if(u.tier===2){this.moonOverlay(c,w);return;}
    c.save();c.fillStyle='#150d291c';c.fillRect(0,0,960,540);
    if(t>=ULTIMATE_CUT_START&&t<ULTIMATE_CUT_END){
      const elapsed=t-ULTIMATE_CUT_START,duration=ULTIMATE_CUT_END-ULTIMATE_CUT_START,p=elapsed/duration,frame=ultimateCutFrame(t),alpha=Math.min(1,elapsed/.16,(duration-elapsed)/.18);
      const rect=this.art.ultimateMetadata.frames[`ultimate_cut_${frame}`].rect;c.globalAlpha=alpha;
      const cutRight=Math.cos(u.angle)<0,x=cutRight?568-Math.min(1,elapsed/.2)*36:-24+Math.min(1,elapsed/.2)*36;
      c.fillStyle='#181026ed';c.beginPath();c.moveTo(cutRight?960:0,78);c.lineTo(cutRight?620:340,78);c.lineTo(cutRight?552:408,457);c.lineTo(cutRight?960:0,457);c.fill();
      c.strokeStyle='#b899e4';c.lineWidth=2;c.beginPath();c.moveTo(cutRight?620:340,78);c.lineTo(cutRight?552:408,457);c.stroke();
      c.drawImage(this.art.ultimate,...rect,x,48,400,400);
      for(let i=0;i<6;i++){const fx=cutRight?936-i*11:20+i*11,fy=110+((i*47+p*150)%270);c.fillStyle=i%2?'#cfb4f5':'#705494';c.fillRect(Math.round(fx),Math.round(fy),2,5);}
      c.fillStyle='#f0d9ff';c.font='bold 22px Microsoft YaHei';c.textAlign=cutRight?'right':'left';c.fillText('紫夜终幕',cutRight?932:28,448);
    }
    if(t>=4.08&&t<4.17&&w.settings.screenFlash){c.globalAlpha=(4.17-t)/.09*.2;c.fillStyle='#f1dcff';c.fillRect(0,0,960,540);}
    c.restore();
  }
  private moonWorld(c:CanvasRenderingContext2D,w:World,foreground:boolean){
    const u=w.ultimate,t=u.elapsed,a=w.player.actor,paint=new PaintRenderer(this.art);
    if(!foreground){
      for(const trail of u.trails){const age=t-trail.time;if(age<0||age>.4)continue;const f=this.art.frame(moonBodyFrame(trail.time),true);c.save();c.globalAlpha=(1-age/.4)*.35;c.translate(trail.pos.x,trail.pos.y);if(Math.cos(u.angle)<0)c.scale(-1,1);c.drawImage(this.art.sheet(moonBodyFrame(trail.time),true),...f.rect,-f.pivot[0],-f.pivot[1],...f.size);c.restore();}
      if(t<.8)for(const offset of [-18,18])paint.draw(c,moonEffectFrame('seal',Math.min(.6,t/.8)),a.pos.x+offset,a.pos.y-30,72,72,offset/90,.8);
      const anchor=u.moonAnchor;
      if(t>=3.2&&t<4.1){const p=clamp((t-3.2)/.9,0,1),size=360+100*p;paint.draw(c,`moon_colossus_rise_${Math.min(5,Math.floor(p*6))}`,anchor.x,anchor.y+22*(1-p),size,size,0,Math.min(.9,(t-3.2)/.2));}
      if(t>=4.1&&t<MOON_HITS[5]){const p=(t-4.1)/(MOON_HITS[5]-4.1);paint.draw(c,`moon_colossus_split_${Math.min(5,Math.floor(p*6))}`,anchor.x,anchor.y,460,460);}
      if(t>=MOON_HITS[5]&&t<5.45){const p=(t-MOON_HITS[5])/.9,size=460+100*p;paint.draw(c,`moon_colossus_burst_${Math.min(5,Math.floor(p*6))}`,anchor.x,anchor.y,size,size,0,Math.min(1,(5.45-t)/.18));}
      if(t>=3.65&&t<4.55){const p=clamp((t-3.65)/.9,0,1);paint.draw(c,`moon_colossus_wings_${Math.min(5,Math.floor(p*6))}`,a.pos.x,a.pos.y-72,460,330,0,Math.min(.65,(t-3.65)/.15));}
      return;
    }
    const wounds=u.snapshot().wounds;
    for(const target of u.markedTargets){
      const pos=target.pos;
      if(t>=1.05&&t<4.55&&target.health.alive)paint.draw(c,moonEffectFrame('seal',Math.min(.6,(t-1.05)/.65)),pos.x,pos.y-55-target.launch.height,34,34,0,.4);
      if(t>=2.35&&t<4.55){const cuts=wounds[target.id]??0;if(cuts>0)paint.draw(c,`moon_rift_${Math.min(2,cuts-1)}`,pos.x,pos.y-28-target.launch.height,48,48,0,.48);}
    }
  }
  private moonOverlay(c:CanvasRenderingContext2D,w:World){
    const t=w.ultimate.elapsed,paint=new PaintRenderer(this.art);
    c.save();c.fillStyle=t>=3.2?'#08071416':'#100b232e';c.fillRect(0,0,960,540);
    if(t<.8){const left=Math.cos(w.ultimate.angle)>=0,x=left?132:828;c.globalAlpha=Math.min(1,t/.12,(.8-t)/.16);paint.draw(c,moonBodyFrame(t),x,280,300,300);c.fillStyle='#e9c9ff';c.font='bold 23px Microsoft YaHei';c.textAlign=left?'left':'right';c.fillText('紫鸾 · 断月',left?28:932,438);}
    c.globalAlpha=1;
    if(t>=4.55&&t<4.67&&w.settings.screenFlash){c.globalAlpha=(4.67-t)/.12*.18;c.fillStyle='#e8ccff';c.fillRect(0,0,960,540);}
    c.restore();
  }
}
