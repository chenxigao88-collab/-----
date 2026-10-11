import type { Actor } from '../actors/Actor';
import type { EventBus } from '../core/EventBus';
import { distance, mul, normal, sub, type Vec2 } from '../core/types';
import { ELEMENT_RULES, getReaction, type ReactionData, type ReactionId } from '../data/elements';
import { REACTION_EFFECTS } from '../data/reactionEffects';
import { capsuleTouchesCircle } from '../world/Collision';
import type { AttackContext, AttackSystem } from './AttackSystem';
import type { DamageSystem } from './DamageSystem';

interface Burn { actor:Actor; context:AttackContext; remaining:number; accumulator:number; carry:number }
export interface ReactionVisual { id:ReactionId; targetId:number; name:string; pos:Vec2; ground:Vec2; color:string; radius:number; life:number; total:number; lines?:Vec2[];lineTargets?:number[] }
export class ElementSystem {
  activations=0; readonly counts:Record<string,number>={}; visuals:ReactionVisual[]=[];
  private burns=new Map<number,Burn>(); private off:()=>void;
  reactionBonus:()=>boolean=()=>false;
  reactionMultiplier:(attack:AttackContext)=>number=()=>1;
  constructor(private actors:()=>Actor[], private damage:DamageSystem, private attacks:AttackSystem, private events:EventBus, private interrupt:(actor:Actor)=>void) {
    this.off=events.on('damageApplied',e=>{
      const attack=e.attack;
      if(attack.faction!=='player'||attack.secondary||attack.element==='none'||attack.elementTargets.has(e.targetId))return;
      const target=this.actors().find(a=>a.id===e.targetId);if(!target)return;
      attack.elementTargets.add(target.id);
      const state=target.elemental, reaction=state.mark?getReaction(state.mark,attack.element):undefined;
      if(reaction&&state.reactionCooldown<=0) {
        state.mark=undefined;state.markTime=0;state.reactionCooldown=ELEMENT_RULES.reactionCooldown;
        this.react(reaction,attack,target);
      } else if(!state.mark||state.mark===attack.element) {
        if(target.health.alive){state.mark=attack.element;state.markTime=ELEMENT_RULES.markDuration;}
      }
    });
  }
  private nearby(target:Actor,radius:number) {
    const center=target.hurtbox.center(target.pos);
    return this.actors().filter(a=>a.faction==='enemy'&&a.health.alive&&capsuleTouchesCircle(a.hurtbox.capsule(a.pos),center,radius))
      .sort((a,b)=>distance(a.hurtbox.center(a.pos),center)-distance(b.hurtbox.center(b.pos),center));
  }
  private unique(reaction:ReactionData,attack:AttackContext,targets:Actor[]) {
    let hits=attack.reactionHits.get(reaction.id);if(!hits){hits=new Set();attack.reactionHits.set(reaction.id,hits);}
    return targets.filter(target=>{if(hits!.has(target.id))return false;hits!.add(target.id);return true;});
  }
  private hurt(attack:AttackContext,target:Actor,amount:number,origin:Vec2,knockback=0) {
    if(!target.health.alive||!amount)return;
    const secondary=this.attacks.secondary(attack,amount*attack.damageScale*this.reactionMultiplier(attack));secondary.knockback=knockback;
    this.damage.tryHit(secondary,target,normal(sub(target.pos,origin)));
  }
  private control(actor:Actor,kind:'stun'|'root',seconds:number,slow=0,duration=0) {
    if(actor.health.alive&&actor.elemental.control(kind,seconds,slow,duration)&&kind==='stun')this.interrupt(actor);
  }
  private react(reaction:ReactionData,attack:AttackContext,target:Actor) {
    if(this.reactionBonus())reaction={...reaction,radius:reaction.radius*1.1,damage:reaction.damage*(reaction.radius?1:1.1),weaponRatio:reaction.weaponRatio*(reaction.radius?1:1.1)};
    const power=reaction.damage+(attack.reactionBaseDamage??0)*reaction.weaponRatio;
    this.activations++;this.counts[reaction.id]=(this.counts[reaction.id]??0)+1;
    this.events.emit('elementReaction',{position:{...target.pos},targetId:target.id});
    const center=target.hurtbox.center(target.pos),effect=REACTION_EFFECTS[reaction.id],color=effect.color;
    const candidates=reaction.radius?this.nearby(target,reaction.radius):target.health.alive?[target]:[];
    const targets=reaction.id==='conduct'?[]:this.unique(reaction,attack,candidates);
    const visual:ReactionVisual={id:reaction.id,targetId:target.id,name:reaction.name,pos:{...center},ground:{...target.pos},color,radius:reaction.radius,life:effect.duration,total:effect.duration};
    if(this.visuals.length>=30)this.visuals.shift();this.visuals.push(visual);
    switch(reaction.id) {
      case 'thermal':for(const a of targets)this.hurt(attack,a,power,center);break;
      case 'blast':for(const a of targets)this.hurt(attack,a,power,center,55);break;
      case 'burn':for(const a of targets){
        const old=this.burns.get(a.id), context=this.attacks.secondary(attack,power/10*attack.damageScale*this.reactionMultiplier(attack));
        if(!old||old.context.damage<=context.damage)this.burns.set(a.id,{actor:a,context,remaining:5,accumulator:old?.accumulator??0,carry:0});
        else old.remaining=5;
      }break;
      case 'exposure':for(const a of targets){this.hurt(attack,a,power,center);a.elemental.exposureTime=5;}break;
      case 'fracture':for(const a of targets){this.hurt(attack,a,power,center);this.control(a,'stun',.25,.3,3);}break;
      case 'vortex':for(const a of targets){this.hurt(attack,a,power,center);a.elemental.slow(.35,4);if(a!==target)this.pull(a,target.pos,18);}break;
      case 'bind':for(const a of targets){this.hurt(attack,a,power,center);this.control(a,'root',.6,.3,3);}break;
      case 'conduct':{
        const chain=this.chainTargets(target,reaction.radius,3);
        visual.lines=chain.map(a=>a.hurtbox.center(a.pos));
        visual.lineTargets=chain.map(a=>a.id);
        for(const a of this.unique(reaction,attack,chain))this.hurt(attack,a,power,center);
        break;
      }
      case 'shock':for(const a of targets){this.hurt(attack,a,power,center);this.control(a,'stun',.18);}break;
      case 'sand':{
        for(const a of targets){this.hurt(attack,a,power,center);if(a.id!==target.id)this.pull(a,target.pos,40);}
        break;
      }
    }
  }
  chainTargets(start:Actor,radius:number,limit:number) {
    const result:Actor[]=[start], used=new Set([start.id]);let point=start.hurtbox.center(start.pos);
    while(result.length<limit) {
      const next=this.actors().filter(a=>a.faction==='enemy'&&a.health.alive&&!used.has(a.id)&&distance(a.hurtbox.center(a.pos),point)<=radius)
        .sort((a,b)=>distance(a.hurtbox.center(a.pos),point)-distance(b.hurtbox.center(b.pos),point))[0];
      if(!next)break;result.push(next);used.add(next.id);point=next.hurtbox.center(next.pos);
    }
    return result;
  }
  pull(actor:Actor,point:Vec2,maxDistance:number) {
    const delta=sub(point,actor.pos);actor.knockback.apply(mul(normal(delta),Math.min(maxDistance,Math.hypot(delta.x,delta.y))*12));
  }
  step(dt:number,enemyDt=dt) {
    if(dt<=0)return;
    for(const a of this.actors())a.elemental.step(a.faction==='enemy'?enemyDt:dt);
    for(const [id,burn] of this.burns) {
      if(!burn.actor.health.alive){this.burns.delete(id);continue;}
      const active=Math.min(enemyDt,burn.remaining);burn.remaining=Math.max(0,burn.remaining-enemyDt);burn.accumulator+=active;
      while(burn.accumulator>=.5-1e-8&&burn.actor.health.alive){burn.accumulator-=.5;burn.carry+=burn.context.damage;const amount=Math.round(burn.carry);burn.carry-=amount;this.damage.tryHit({...burn.context,damage:amount},burn.actor,{x:0,y:0});}
      if(!burn.remaining)this.burns.delete(id);
    }
  }
  presentation(dt:number) { for(const v of this.visuals)v.life-=dt;this.visuals=this.visuals.filter(v=>v.life>0); }
  clear(){this.burns.clear();this.visuals=[];}
  dispose(){this.off();this.clear();}
  get burnCount(){return this.burns.size;}
  isBurning(actorId:number){return this.burns.has(actorId);}
}
