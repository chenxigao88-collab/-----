import { RUNE_BY_ID, RUNES, type RuneId } from '../data/adventure';
import type { World } from '../world/World';
import type { AttackContext } from './AttackSystem';
import type { Actor } from '../actors/Actor';
import { getReaction } from '../data/elements';
export interface RuneEcho {targetId:number;sourceAttackId:number;context:AttackContext;remaining:number}
export class RuneSystem {
  owned:RuneId[]=[];counterRemaining=0;guardCooldown=0;procs=0;
  echoes:RuneEcho[]=[];
  private airTargets=new Map<number,number>();private huntShots=new Map<number,number>();
  private ended=new Set<number>();private off:(()=>void)[]=[];
  private afterglows=new Map<number,number>();
  constructor(private world:World){
    world.damage.modifier=(attack,target)=>this.multiplier(attack,target);
    world.elements.reactionBonus=()=>this.has('conduit');
    world.gunfu.sweepRangeBonus=()=>this.has('gather')?12:0;
    this.off.push(world.events.on('perfectDodge',e=>{if(e.runId===world.runId)this.counterRemaining=2;}));
    this.off.push(world.events.on('elementReaction',e=>{if(this.has('afterglow'))this.afterglows.set(e.targetId,2);}));
    this.off.push(world.events.on('damageApplied',e=>{
      const c=e.attack;if(c.faction!=='player'||c.secondary||c.nativeContinuation)return;
      if(c.gunfu==='body'&&c.gunfuPhase===0&&this.has('counter')&&this.counterRemaining>0){this.counterRemaining=0;world.resonance.award(5);this.spark(world.player.actor,'#8fdad2');}
      if(c.gunfu==='body'&&c.gunfuPhase===0&&this.has('afterglow')&&this.afterglows.has(e.targetId)){this.afterglows.delete(e.targetId);world.resonance.award(5);this.spark(world.player.actor,'#d1a2b8');}
      if(c.gunfu!=='finisher'||c.gunfuSequence===undefined)return;
      const seq=c.gunfuSequence;
      if(c.gunfuShot==='air'&&!this.airTargets.has(seq)){this.airTargets.set(seq,e.targetId);}
      if(c.gunfuShot!=='ground')return;
      if(this.ended.has(seq)){const echo=this.echoes.find(a=>a.sourceAttackId===c.id&&a.targetId===e.targetId);if(echo)echo.context.damage+=e.amount*.2;return;}
      this.ended.add(seq);
      if(this.has('landing')){world.player.dashCooldown=Math.max(0,world.player.dashCooldown-.2);this.spark(world.player.actor,'#e8b78a');}
      if(this.has('guard')&&this.guardCooldown<=0){world.damage.shield=8;world.damage.shieldRemaining=3;this.guardCooldown=8;this.spark(world.player.actor,'#b2d89f');}
      if(this.has('echo')&&!e.killed){this.echoes.push({targetId:e.targetId,sourceAttackId:c.id,context:world.attacks.secondary(c,e.amount*.2),remaining:.16});}
      // IDs are monotonically increasing; keep only recent sequences.
      if(this.ended.size>64){const cutoff=seq-32;for(const id of this.ended)if(id<cutoff)this.ended.delete(id);for(const id of this.airTargets.keys())if(id<cutoff)this.airTargets.delete(id);for(const id of this.huntShots.keys())if(id<cutoff)this.huntShots.delete(id);}
    }));
  }
  has(id:RuneId){return this.owned.includes(id);}
  get available(){
    const pair=getReaction(this.world.weapons.slots[0].data.element,this.world.weapons.slots[1].data.element);
    return RUNES.filter(r=>(!r.character||r.character===this.world.player.actor.character)&&!this.has(r.id)&&
      (r.id!=='afterglow'||Boolean(pair))&&(r.id!=='conduit'||Boolean(pair&&(pair.radius>0||pair.damage>0))));
  }
  equip(id:RuneId,replace?:number){
    const rune=RUNE_BY_ID.get(id);if(!rune||this.has(id)||(rune.character&&rune.character!==this.world.player.actor.character))return false;
    if(this.owned.length<3)this.owned.push(id);
    else {if(replace===undefined||!Number.isInteger(replace)||replace<0||replace>=3)return false;this.owned[replace]=id;}
    if(!this.has('guard')){this.world.damage.shield=0;this.world.damage.shieldRemaining=0;}
    return true;
  }
  private multiplier(c:AttackContext,target:Actor){
    if(c.faction!=='player'||c.secondary||c.nativeContinuation||c.gunfu!=='finisher'||c.gunfuSequence===undefined)return 1;
    const seq=c.gunfuSequence;
    if(this.has('hunt')&&c.gunfuShot==='air'&&target.launch.active){if(!this.huntShots.has(seq))this.huntShots.set(seq,c.id);if(this.huntShots.get(seq)===c.id)return 1.2;}
    if(this.has('mark')&&c.gunfuShot==='ground'&&this.airTargets.get(seq)===target.id)return 1.2;
    return 1;
  }
  private spark(actor:Actor,color:string){this.procs++;this.world.feel.burst(actor.pos,5,color);this.world.feel.rings.push({pos:{...actor.pos},radius:22,life:.25,total:.25,color});}
  step(dt:number){
    for(const [id,remaining]of this.afterglows){if(remaining<=dt||!this.world.enemies.some(e=>e.actor.id===id&&e.actor.health.alive))this.afterglows.delete(id);else this.afterglows.set(id,remaining-dt);}
    this.counterRemaining=Math.max(0,this.counterRemaining-dt);this.guardCooldown=Math.max(0,this.guardCooldown-dt);
    this.world.damage.shieldRemaining=Math.max(0,this.world.damage.shieldRemaining-dt);if(!this.world.damage.shieldRemaining)this.world.damage.shield=0;
    for(const echo of this.echoes){echo.remaining-=dt;if(echo.remaining>0)continue;const target=this.world.actors.find(a=>a.id===echo.targetId&&a.health.alive);if(target){this.world.damage.tryHit(echo.context,target,{x:0,y:0});this.spark(target,'#d8bb76');}}
    this.echoes=this.echoes.filter(e=>e.remaining>0);
  }
  transition(){this.echoes=[];this.afterglows.clear();}
  dispose(){this.off.forEach(off=>off());this.echoes=[];this.owned=[];}
}
