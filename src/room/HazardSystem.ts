import type {World} from '../world/World';
import type {TrapTemplate} from '../data/chapter';
import type {AttackContext} from '../combat/AttackSystem';
import {createActor} from '../actors/Actor';
import type {Actor} from '../actors/Actor';
export interface Hazard extends TrapTemplate {age:number;warning:number;duration:number;context:AttackContext;hits:Set<number>;dynamic:boolean;cycle:number}
export class HazardSystem {
  items:Hazard[]=[];private room='';private enemySource:Actor;
  constructor(private w:World){this.enemySource=createActor(0,w.runId,'enemy',{x:0,y:0},1,1);}
  private context(damage:number){const c=this.w.attacks.snapshot(this.enemySource,damage,'floor-hazard','heavy',false);c.environment=true;c.secondary=true;c.knockback=0;return c;}
  reset(){this.items=[];this.room='';}
  sync(){if(!this.w.adventureMode||this.room===this.w.adventure.currentId)return;this.room=this.w.adventure.currentId;this.items=(this.w.adventure.template.traps??[]).map(t=>({...t,age:t.offset,warning:4.8,duration:5.15,context:this.context(6),hits:new Set<number>(),dynamic:false,cycle:0}));}
  add(t:TrapTemplate){this.sync();this.items.push({...t,age:0,warning:.95,duration:1.3,context:this.context(8),hits:new Set(),dynamic:true,cycle:0});}
  contains(t:TrapTemplate,a:Actor,padding=0){return a.pos.x>=t.x-padding&&a.pos.x<=t.x+t.w+padding&&a.pos.y>=t.y-padding&&a.pos.y<=t.y+t.h+padding;}
  get moveScale(){this.sync();return this.w.adventure.locked&&this.items.some(t=>t.kind==='crystal'&&this.contains(t,this.w.player.actor))?.8:1;}
  phase(t:Hazard){if(t.kind==='crystal')return 1;return t.age<t.warning-1?0:t.age<t.warning?1:t.age<t.duration?2:0;}
  step(dt:number){this.sync();if(dt<=0||!this.w.adventure.locked){if(!this.w.adventure.locked)this.items=this.items.filter(t=>!t.dynamic);return;}
    for(const t of this.items){t.age+=dt;if(!t.dynamic&&t.age>=6){t.age%=6;t.context=this.context(6);t.hits.clear();t.cycle++;}if(t.kind==='crystal'||this.phase(t)!==2)continue;
      for(const a of this.w.actors){if(t.hits.has(a.id)||!this.contains(t,a,a.hurtbox.radius*.4))continue;t.hits.add(a.id);const c=a.faction==='player'?t.context:this.w.attacks.secondary(this.w.attacks.snapshot(this.w.player.actor,18,'floor-hazard','heavy',false),18);c.environment=true;this.w.damage.tryHit(c,a,{x:0,y:0});}
    }this.items=this.items.filter(t=>!t.dynamic||t.age<t.duration+.2);
  }
}
