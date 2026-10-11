import type { Actor } from '../actors/Actor';
import type { EventBus } from '../core/EventBus';
import { distance, normal, sub, type Vec2 } from '../core/types';
import { capsuleTouchesCircle } from '../world/Collision';
import type { AreaRequest, AttackSystem } from './AttackSystem';
import type { DamageSystem } from './DamageSystem';
import type { ElementSystem } from './ElementSystem';

export interface AreaAbility extends AreaRequest { elapsed:number; nextTick:number; fired:boolean; seen:Set<number>; hitSet:Set<number> }
export interface ArcVisual { points:Vec2[]; life:number; total:number }
export class AbilitySystem {
  areas:AreaAbility[]=[]; arcs:ArcVisual[]=[];private off:()=>void;
  constructor(private actors:()=>Actor[],private damage:DamageSystem,private attacks:AttackSystem,private elements:ElementSystem,events:EventBus) {
    this.off=events.on('damageApplied',e=>{
      const c=e.attack,native=c.native;if(c.secondary||!native||c.nativeTargets.has(e.targetId))return;
      const target=this.actors().find(a=>a.id===e.targetId);if(!target)return;c.nativeTargets.add(target.id);
      if(native.slow&&target.health.alive)target.elemental.slow(native.slow.strength,native.slow.duration);
      if(native.splash) {
        const center=target.hurtbox.center(target.pos), secondary=this.attacks.secondary(c,native.splash*(c.nativeDamageScale??c.damageScale));secondary.nativeDamage=true;
        for(const a of this.nearby(center,native.splashRadius??40).filter(a=>a.id!==target.id).slice(0,native.splashTargets??3))this.damage.tryHit(secondary,a,normal(sub(a.pos,center)));
      }
      if(native.chain) {
        const chain=this.elements.chainTargets(target,native.chainRange??130,native.chainTargets??3);
        this.arc(chain.map(a=>a.hurtbox.center(a.pos)));
        // Native damage inherits the attack's scaling once; it cannot attach an element or chain again.
        const continuation=this.attacks.secondary(c,native.chain*(c.nativeDamageScale??c.damageScale));continuation.nativeDamage=true;
        for(const a of chain)if(a.id!==target.id)this.damage.tryHit(continuation,a,{x:0,y:0});
      }
      if(native.pull) {
        const source=this.actors().find(a=>a.id===c.sourceId);
        if(source)for(const a of this.nearby(source.pos,native.pull))if(!c.nativeTargets.has(-a.id)){c.nativeTargets.add(-a.id);this.elements.pull(a,source.pos,24);}
      }
    });
  }
  private nearby(center:Vec2,radius:number) {
    return this.actors().filter(a=>a.faction==='enemy'&&a.health.alive&&capsuleTouchesCircle(a.hurtbox.capsule(a.pos),center,radius))
      .sort((a,b)=>distance(a.pos,center)-distance(b.pos,center));
  }
  private arc(points:Vec2[]) { if(this.arcs.length>=24)this.arcs.shift();this.arcs.push({points,life:.2,total:.2}); }
  spawn(request:AreaRequest) { if(this.areas.length>=32)return;this.areas.push({...request,pos:{...request.pos},elapsed:0,nextTick:.5,fired:false,seen:new Set(),hitSet:new Set()}); }
  step(dt:number) {
    if(dt<=0)return;
    for(const area of this.areas) {
      area.elapsed+=dt;
      if(area.mode==='strike') {
        if(area.elapsed+1e-8>=area.delay&&!area.fired) {
          area.fired=true;
          const targets=this.nearby(area.pos,area.radius);
          this.arc([area.pos,{x:area.pos.x,y:area.pos.y-100}]);
          for(const target of targets)this.damage.tryHit(area.context,target,normal(sub(target.pos,area.pos)),1,area.hitSet);
        }
      } else {
        while(area.elapsed+1e-8>=area.nextTick&&area.nextTick<=area.duration+1e-8) {
          for(const target of this.nearby(area.pos,area.radius)) {
            const first=!area.seen.has(target.id);area.seen.add(target.id);
            const context=first?{...area.context,damage:area.context.damage*.5,native:undefined}:this.attacks.secondary(area.context,area.context.damage*.5);
            if(!first)context.nativeDamage=true;
            // All first contacts share the attack; the first one alone can charge resonance.
            if(first){context.chargeGranted=area.context.chargeGranted;context.feelGranted=area.context.feelGranted;}
            this.damage.tryHit(context,target,{x:0,y:0});
            if(first){area.context.chargeGranted=context.chargeGranted;area.context.feelGranted=context.feelGranted;}
          }
          area.nextTick+=.5;
        }
      }
    }
    this.areas=this.areas.filter(a=>a.elapsed<a.delay+(a.mode==='zone'?a.duration:.24));
  }
  presentation(dt:number){for(const arc of this.arcs)arc.life-=dt;this.arcs=this.arcs.filter(a=>a.life>0);}
  clear(){this.areas=[];this.arcs=[];}
  dispose(){this.off();this.clear();}
}
