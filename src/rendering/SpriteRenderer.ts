import { AssetManager, type SpriteFrame } from './AssetManager';
import { SpriteAnimator } from './SpriteAnimator';
import type { Actor } from '../actors/Actor';
import { handPosition } from '../actors/Actor';
import type { Enemy } from '../actors/Enemy';
import type { WeaponData } from '../data/weapons';
import { gunfuGrip,gunfuBodyScale,type GunfuPose } from '../data/gunfu';
import { PLAYER_STATS } from '../data/player';
import { violetRest } from './VioletRest';
import {ultimateBodyFrame,ULTIMATE_FINAL_SPIN_START,ULTIMATE_CUT_END} from '../data/ultimate';
import {moonBodyFrame} from '../data/moonUltimate';
export class SpriteRenderer {
  animator = new SpriteAnimator();
  private masks = new Map<string, HTMLCanvasElement>();
  private isolated = new Map<string,HTMLCanvasElement>();
  private weaponIcons=new Map<string,HTMLCanvasElement>();
  private ultimateGunless=new Map<string,HTMLCanvasElement>();
  constructor(readonly art: AssetManager) {}
  drawFrame(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, hero = false, flash = false, breath = 0, hideGun=false) {
    const frame = this.art.frame(id, hero), [sx,sy,sw,sh] = frame.rect, [w,baseHeight] = frame.size, [px,basePivotY] = frame.pivot;
    const h = baseHeight + breath, py = basePivotY * h / baseHeight;
    if(frame.flipX){ctx.save();ctx.translate(2*x,0);ctx.scale(-1,1);}
    let source:CanvasImageSource=this.art.sheet(id,hero),sourceX=sx,sourceY=sy;
    if(frame.clipSpans){let cut=this.isolated.get(id);if(!cut){cut=document.createElement('canvas');cut.width=sw;cut.height=sh;const m=cut.getContext('2d')!;m.beginPath();for(const [x,y,length]of frame.clipSpans)m.rect(x,y,length,1);m.clip();m.drawImage(source,sx,sy,sw,sh,0,0,sw,sh);this.isolated.set(id,cut);}source=cut;sourceX=sourceY=0;}
    if(hideGun&&id.startsWith('violet_ult_guns_')){
      let cut=this.ultimateGunless.get(id);if(!cut){cut=document.createElement('canvas');cut.width=sw;cut.height=sh;const m=cut.getContext('2d')!;m.drawImage(source,sourceX,sourceY,sw,sh,0,0,sw,sh);
        const col=Number(id.split('_').at(-1)),up=id.includes('_up_');
        const masks:Record<number,number[][]>=up?{2:[[139,99,38,24]],3:[[139,99,53,27]],4:[[143,78,30,29]],5:[[25,96,48,28]]}:{2:[[35,101,34,20]],3:[[0,94,68,30]],4:[[40,104,26,24],[125,97,25,29]],5:[[0,94,68,32]]};
        for(const [x,y,w,h]of masks[col]??[])m.clearRect(x,y,w,h);this.ultimateGunless.set(id,cut);
      }source=cut;sourceX=sourceY=0;
    }
    ctx.drawImage(source, sourceX, sourceY, sw, sh, Math.round(x - px), Math.round(y - py), w, h);
    if (flash) {
      const key = `${hero}:${id}`; let mask = this.masks.get(key);
      if (!mask) { mask = document.createElement('canvas'); mask.width = w; mask.height = baseHeight; const m = mask.getContext('2d')!; m.imageSmoothingEnabled = false; m.drawImage(source, sourceX, sourceY, sw, sh, 0, 0, w, baseHeight); m.globalCompositeOperation = 'source-in'; m.fillStyle = '#fff7df'; m.fillRect(0,0,w,baseHeight); this.masks.set(key, mask); }
      ctx.save(); ctx.globalAlpha = .8; ctx.drawImage(mask, Math.round(x-px), Math.round(y-py), w, h); ctx.restore();
    }
    if(frame.flipX)ctx.restore();
  }
  player(ctx: CanvasRenderingContext2D, actor: Actor, weapon: WeaponData, bladeAngle?: number, dashing = false,dashElapsed=0) {
    // Keep the settle frame visible after travel ends; attacking can interrupt it.
    dashing=dashing||(!actor.action&&dashElapsed<PLAYER_STATS.dashDuration+.08);
    this.shadow(ctx, actor);
    if(actor.action?.ultimateTier===2){
      const t=actor.action.ultimateTime!,left=Math.cos(actor.action.angle)<0;
      ctx.save();if(left){ctx.translate(actor.pos.x*2,0);ctx.scale(-1,1);}
      this.drawFrame(ctx,moonBodyFrame(t),actor.pos.x,actor.pos.y,true);ctx.restore();
      if(t>=.8&&t<1.9)this.weapon(ctx,actor,weapon.sprite,actor.action.angle,.68);
      return;
    }
    if(actor.character==='violet'&&actor.action?.ultimateTime!==undefined){
      const action=actor.action,t=action.ultimateTime!;
      const spin=t>=1.25&&t<1.85?(t-1.25)/.6*Math.PI*2:t>=ULTIMATE_FINAL_SPIN_START&&t<ULTIMATE_CUT_END?(t-ULTIMATE_FINAL_SPIN_START)/(ULTIMATE_CUT_END-ULTIMATE_FINAL_SPIN_START)*Math.PI*2:0,angle=action.angle+spin;
      const facing=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)>0?'right':'left'):(Math.sin(angle)>0?'down':'up');
      const usingMelee=t>=1.85&&t<ULTIMATE_FINAL_SPIN_START&&weapon.category==='melee';
      const id=usingMelee?`violet_greatspin_${facing}_${Math.min(3,Math.floor(action.elapsed/action.duration*4))}`:ultimateBodyFrame(t,facing);
      const showingGun=!usingMelee&&t>=2&&t<ULTIMATE_FINAL_SPIN_START,behind=Math.sin(action.angle)<-.2;
      if(showingGun&&behind)this.weapon(ctx,actor,weapon.sprite,action.angle,.68);
      this.drawFrame(ctx,id,actor.pos.x,actor.pos.y,true,actor.flash>0,0,true);
      if(showingGun&&!behind)this.weapon(ctx,actor,weapon.sprite,action.angle,.68);
      return;
    }
    if(actor.character==='violet'&&actor.idleTime>=8&&!actor.action&&!actor.moving&&!dashing&&actor.flash===0){
      const facing=Math.abs(Math.cos(actor.facing))>Math.abs(Math.sin(actor.facing))?(Math.cos(actor.facing)>0?'right':'left'):(Math.sin(actor.facing)>0?'down':'up');
      const elapsed=actor.idleTime-8,pose=violetRest(elapsed,actor.restCount%2===1,facing);
      this.drawFrame(ctx,pose.id,actor.pos.x+pose.x,actor.pos.y+pose.y,true,false,pose.breath?this.animator.idleBreath(elapsed)*.5:0);
      return;
    }
    const violet=actor.character==='violet',bladePose=violet&&Boolean(actor.action&&['greatslash','greatupper','greatspin'].includes(actor.action.kind));
    if (!bladePose&&Math.sin(actor.aim) < -.2) this.weapon(ctx, actor, weapon.sprite, bladeAngle);
    const action=actor.action;
    const p=action?Math.min(1,action.elapsed/action.duration):0;
    const spin=action?.kind==='landspin'?Math.max(0,(p-.25)/.75)*Math.PI*2:action?.kind==='greatspin'?p*Math.PI*2:action?.kind==='turnshot'?Math.PI*Math.max(0,1-p*2):0;
    const angle=dashing?actor.facing:action?.gunfu?action.angle+spin:actor.moving?actor.facing:action?.angle??actor.facing;
    let id = dashing&&this.art.metadata.gunfuMovement?this.animator.combat('slide',actor.facing,dashElapsed,PLAYER_STATS.dashDuration+.08):action&&this.art.metadata.gunfu?this.animator.combat(action.kind,angle,action.elapsed,action.duration):this.animator.body(actor.id, actor.facing, actor.animation, actor.moving, dashing);
    if(violet){
      const facing=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)>0?'right':'left'):(Math.sin(angle)>0?'down':'up');
      const kind=dashing?'dash':action?.gunfu?(action.kind==='recover'?'turnshot':action.kind):actor.flash>0?'death':actor.moving?'run':'idle';
      const profileRun=actor.moving&&(facing==='left'||facing==='right');
      const frame=dashing?Math.min(3,Math.floor(dashElapsed/(PLAYER_STATS.dashDuration+.08)*4)):action?.gunfu?(action.kind==='recover'?3:Math.min(3,Math.floor(p*4))):actor.flash>0?0:Math.floor(actor.animation*(actor.moving?(profileRun?16:12):4))%(actor.moving?(profileRun?8:6):4);
      id=`violet_${kind==='kneelshot1'&&frame>=2?'kneelshot2':kind}_${facing}_${frame}`;
    }
    const breath = !actor.moving && !dashing&&!action ? this.animator.idleBreath(actor.animation) : 0;
    const airborneAtlas=action?.kind==='backflip'||action?.kind==='airshot';
    this.drawFrame(ctx, id, actor.pos.x, actor.pos.y-(action?.lift??0)-(airborneAtlas?24*gunfuBodyScale(action.kind as GunfuPose):0), true, actor.flash > 0, breath);
    if (!bladePose&&Math.sin(actor.aim) >= -.2) this.weapon(ctx, actor, weapon.sprite, bladeAngle);
  }
  enemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
    const actor = enemy.actor; this.shadow(ctx, actor);
    if(['shield','dancer','cantor','parasite','boss'].includes(enemy.kind)){
      const i=enemy.kind==='boss'?enemy.brokenRemaining>0?24+Math.min(3,Math.floor((2.5-enemy.brokenRemaining)*2)):enemy.state==='Attack'?8+Math.min(3,Math.floor(enemy.elapsed/enemy.windup*4)):enemy.state==='Recover'&&enemy.elapsed<.5?(enemy.bossMove==='slam'?16:enemy.attackIndex?20:12)+Math.min(3,Math.floor(enemy.elapsed/.5*4)):actor.moving?4+Math.floor(actor.animation*7)%4:Math.floor(actor.animation*3)%4
        :enemy.hitstunRemaining>0||actor.launch.active?18+Math.floor(actor.animation*9)%2:enemy.state==='Attack'?12+Math.min(2,Math.floor(enemy.elapsed/enemy.windup*3)):enemy.state==='Recover'&&enemy.elapsed<.45?15+Math.min(2,Math.floor(enemy.elapsed/.45*3)):actor.moving?6+Math.floor(actor.animation*10)%6:Math.floor(actor.animation*4)%6;
      ctx.save();if(Math.cos(actor.facing)<0){ctx.translate(2*actor.pos.x,0);ctx.scale(-1,1);}this.drawFrame(ctx,`chapter_${enemy.kind}_${i}`,actor.pos.x,actor.pos.y-actor.launch.height,false,actor.flash>0);ctx.restore();
      if(enemy.ward>0){ctx.fillStyle='#edca7c';ctx.fillRect(actor.pos.x-14,actor.pos.y-61,28*Math.min(1,enemy.ward/enemy.wardMax),2);}return;
    }
    const phase=enemy.state==='Attack'?Math.min(2,Math.floor(enemy.elapsed/enemy.windup*3)):enemy.state==='Recover'&&enemy.elapsed<enemy.data.active?3:actor.moving?Math.floor(actor.animation*9)%4:Math.floor(actor.animation*4)%2;
    const id = `${enemy.kind}_${enemy.hitstunRemaining>0||actor.launch.active?3:phase}`;
    const flinch=enemy.hitstunRemaining>0?Math.round(Math.sin(enemy.hitstunRemaining*65)*Math.min(2,enemy.hitstunRemaining*12)):0;
    this.drawFrame(ctx, id, actor.pos.x+flinch, actor.pos.y-actor.launch.height, false, actor.flash > 0);
  }
  weapon(ctx: CanvasRenderingContext2D, actor: Actor, id: string, angle = actor.aim, scale=1) {
    const frame = this.art.frame(id), hand = handPosition(actor), recoil = actor.recoil * 4;
    if(actor.action?.ultimateTime!==undefined){hand.y=actor.pos.y-18;hand.x=actor.pos.x+Math.cos(angle)*7;}
    const action=actor.action,progress=action?Math.min(1,action.elapsed/action.duration):1;
    const turn=action?.kind==='landspin'?Math.max(0,(progress-.25)/.75)*Math.PI*2:action?.kind==='backflip'?Math.PI*2*progress:action?.gunfu?gunfuGrip(action.kind as GunfuPose,progress,actor.character).turn:action?.kind==='strike'?Math.sin(progress*Math.PI)*.45:action?.kind==='draw'&&progress<.4?-.8*(1-progress/.4):0;
    ctx.save(); ctx.translate(Math.round(hand.x - Math.cos(angle)*recoil), Math.round(hand.y - Math.sin(angle)*recoil)); ctx.rotate(angle+turn);
    if (Math.cos(angle) < 0) ctx.scale(1, -1);
    ctx.scale(scale,scale);
    const [sx,sy,sw,sh] = frame.rect, [w,h] = frame.size, [px,py] = frame.pivot;
    ctx.drawImage(this.art.sheet(id,false), sx,sy,sw,sh, -px, -py, w,h);
    ctx.restore();
  }
  private shadow(ctx: CanvasRenderingContext2D, actor: Actor) { const lift=actor.launch.height||(actor.action?.lift??0),scale=Math.max(.45,1-lift/55);ctx.fillStyle = lift>0?'#05091255':'#05091285'; ctx.beginPath(); ctx.ellipse(Math.round(actor.pos.x), Math.round(actor.pos.y+1), (actor.hurtbox.radius+3)*scale, 5*scale, 0,0,Math.PI*2); ctx.fill(); }
  weaponIcon(id: string): HTMLCanvasElement {let image=this.weaponIcons.get(id);if(!image){image=this.icon(this.art.frame(id),this.art.sheet(id,false));this.weaponIcons.set(id,image);}return image;}
  characterPortrait(id:string){const canvas=document.createElement('canvas');canvas.width=88;canvas.height=92;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;this.drawFrame(ctx,id==='violet'?'violet_idle_down_0':'idle_down_0',44,82,true);return canvas;}
  chapterPortrait(kind:'boss'|'lamp'){const canvas=document.createElement('canvas');canvas.width=canvas.height=180;const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;const id=kind==='boss'?'chapter_boss_0':'chapter_prop_lamp_0',f=this.art.frame(id),size=kind==='boss'?180:150;c.drawImage(this.art.sheet(id,false),...f.rect,0,0,size,size);return canvas;}
  private icon(frame: SpriteFrame,sheet:CanvasImageSource): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.width = 44; canvas.height = 24; const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    const [sx,sy,sw,sh] = frame.rect; const scale = Math.min(40/sw,20/sh), w = Math.round(sw*scale), h = Math.round(sh*scale);
    ctx.drawImage(sheet,sx,sy,sw,sh, Math.floor((44-w)/2),Math.floor((24-h)/2),w,h); return canvas;
  }
}
