import type {World} from '../world/World';
import type {AssetManager} from './AssetManager';
import {clamp} from '../core/types';
import {PaintRenderer} from './PaintRenderer';
import {violetMeleeFrame,type VioletMeleeKind} from '../data/violetMelee';
import {ULTIMATE_DURATION,ULTIMATE_CUT_START,ULTIMATE_CUT_END,ULTIMATE_FINAL_SPIN_START,ultimateCutFrame} from '../data/ultimate';
export class UltimateRenderer {
  constructor(private art:AssetManager){}
  camera(c:CanvasRenderingContext2D,w:World){
    const u=w.ultimate;if(!u.active)return;
    const points=[w.player.actor.pos,...u.targets.filter(a=>a.health.alive).map(a=>a.pos)];
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys)-55,bottom=Math.max(...ys)+25;
    const limit=Math.min(1.6,650/(right-left+140),390/(bottom-top+90));
    const ramp=Math.min(1,u.elapsed/.55,(ULTIMATE_DURATION-u.elapsed)/.5),zoom=1+(Math.max(1,limit)-1)*Math.max(0,ramp);
    let centerX=(left+right)/2;const cutRight=Math.cos(u.angle)<0;
    if(u.elapsed>=ULTIMATE_CUT_START-.2&&u.elapsed<ULTIMATE_CUT_END+.2){
      const focus=cutRight?Math.max(centerX,w.player.actor.pos.x-40/zoom):Math.min(centerX,w.player.actor.pos.x+40/zoom);
      const blend=Math.max(0,Math.min(1,(u.elapsed-ULTIMATE_CUT_START+.2)/.2,(ULTIMATE_CUT_END+.2-u.elapsed)/.2));centerX+=(focus-centerX)*blend;
    }
    const x=clamp(centerX,480/zoom,960-480/zoom),y=clamp((top+bottom)/2,270/zoom,540-270/zoom);
    c.translate(480,270);c.scale(zoom,zoom);c.translate(-x,-y);
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
}
