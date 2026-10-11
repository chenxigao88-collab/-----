import type { World } from '../world/World';
import type { Actor } from '../actors/Actor';
import type { WeaponData } from '../data/weapons';
import { angleTo, direction, distance, normal, sub, type Vec2 } from '../core/types';
import { sweptSectorCapsule } from '../world/Collision';
import { obstacleContact, resolveObstacles } from '../world/Obstacles';
import {ULTIMATE_DURATION,ULTIMATE_HITS,ULTIMATE_STAGES,ULTIMATE_FINISHER_RATIO} from '../data/ultimate';
export {ULTIMATE_DURATION} from '../data/ultimate';
export class UltimateSystem {
  energy=0;elapsed=0;active=false;casts=0;angle=0;targets:Actor[]=[];
  private weapons:WeaponData[]=[];private fired=new Set<number>();private rewarded=new Map<number,number>();private finishers=new Set<number>();private off:(()=>void)[]=[];
  private openingDamage=new Map<number,number>();private startingSlot=0;
  constructor(private w:World){
    this.off.push(w.events.on('damageApplied',e=>{
      const c=e.attack;
      if(this.active&&c.ultimateCast===this.casts&&c.ultimatePhase!==undefined&&c.ultimatePhase<5&&!this.fired.has(5)&&e.amount>0)this.openingDamage.set(e.targetId,(this.openingDamage.get(e.targetId)??0)+e.amount);
      if(c.faction!=='player'||c.secondary||c.nativeContinuation||c.weaponId==='violet-ultimate'||e.amount<=0)return;
      const count=this.rewarded.get(c.id)??0;if(count<2){this.gain(2);this.rewarded.set(c.id,count+1);}
      if(this.rewarded.size>300)this.rewarded.delete(this.rewarded.keys().next().value!);
      if(c.gunfuShot==='ground'&&c.gunfuSequence!==undefined&&!this.finishers.has(c.gunfuSequence)){this.finishers.add(c.gunfuSequence);this.gain(8);if(this.finishers.size>100)this.finishers.delete(this.finishers.values().next().value!);}
    }));
    this.off.push(w.events.on('elementReaction',()=>this.gain(6)));
    this.off.push(w.events.on('perfectDodge',e=>{if(e.runId===w.runId)this.gain(12);}));
    this.off.push(w.events.on('actorDied',e=>{if(e.runId===w.runId&&e.faction==='enemy')this.gain(4);}));
  }
  get ready(){return this.energy>=100;}
  gain(amount:number){if(this.w.player.actor.character==='violet'&&!this.active)this.energy=Math.min(100,this.energy+amount);}
  request(aim:Vec2){
    const w=this.w,a=w.player.actor;
    if(a.character!=='violet'||w.state!=='playing'||!a.health.alive||this.active||!this.ready||w.player.dashing||w.adventure.panel||w.adventure.transitionRemaining>0)return false;
    const angle=angleTo(a.pos,aim);
    this.targets=w.enemies.filter(e=>e.actor.health.alive&&sweptSectorCapsule(a.pos,e.actor.hurtbox.capsule(e.actor.pos),240,angle-Math.PI*.6,angle+Math.PI*.6)&&
      (!w.adventureMode||!obstacleContact(a.hurtbox.center(a.pos),e.actor.hurtbox.center(e.actor.pos),0,w.adventure.template.obstacles)))
      .sort((x,y)=>distance(a.pos,x.actor.pos)-distance(a.pos,y.actor.pos)).slice(0,5).map(e=>e.actor);
    if(!this.targets.length){w.events.emit('message',{text:'前方没有可锁定的敌人'});return false;}
    this.weapons=[w.weapons.slots[w.weapons.active].data,w.weapons.slots[1-w.weapons.active].data];
    this.startingSlot=w.weapons.active;this.openingDamage.clear();
    this.angle=angle;this.energy=0;this.elapsed=0;this.active=true;this.casts++;this.fired.clear();
    w.attacks.cancelPrimary();w.gunfu.cancel();w.melee.cancel(a.id);w.player.dashRemaining=0;a.idleTime=0;a.moving=false;a.facing=angle;
    a.invulnerability.grant('ultimate',ULTIMATE_DURATION+.08);
    for(const target of this.targets)w.melee.cancel(target.id);
    w.audio.play('swap');this.pose();return true;
  }
  private pose(){
    const t=this.elapsed,stage=ULTIMATE_STAGES.find(s=>t<s.end)??ULTIMATE_STAGES[ULTIMATE_STAGES.length-1];
    const weapon=this.shotWeapon(t<2.95?0:2),melee=t>=1.85&&t<3.6&&weapon?.category==='melee';
    const angle=t>=1.85&&t<3.6?this.weaponAim():this.angle;
    this.w.player.actor.action={kind:melee?'greatspin':stage.pose,elapsed:t-stage.start,duration:stage.end-stage.start,angle,gunfu:true,ultimateTime:t};
    this.w.player.actor.aim=angle;
  }
  private weaponAim(){
    const a=this.w.player.actor,target=this.targets.filter(t=>t.health.alive).sort((x,y)=>distance(a.pos,x.pos)-distance(a.pos,y.pos)||x.id-y.id)[0];
    if(!target)return this.angle;
    const center=target.hurtbox.center(target.pos),angle=angleTo({x:a.pos.x,y:a.pos.y-18},center);
    return angleTo({x:a.pos.x+Math.cos(angle)*7,y:a.pos.y-18},center);
  }
  step(dt:number){
    if(!this.active||dt<=0)return;const w=this.w;
    this.elapsed=Math.min(ULTIMATE_DURATION,this.elapsed+dt);this.pose();
    for(const target of this.targets){if(!target.health.alive)continue;
      if(w.enemies.some(e=>e.actor===target&&e.kind==='boss'))continue;
      if(target.launch.active){target.launch.step(dt);target.hurtbox.lift=target.launch.height;}
      if(this.elapsed>=1.25&&this.elapsed<1.85){const d=direction(this.angle),goal={x:w.player.actor.pos.x+d.x*94,y:w.player.actor.pos.y+d.y*94},delta=normal(sub(goal,target.pos)),travel=Math.min(distance(goal,target.pos),dt*80),previous={...target.pos};
        target.pos={x:target.pos.x+delta.x*travel,y:target.pos.y+delta.y*travel};if(w.adventureMode)target.pos=resolveObstacles(target.pos,previous,target.hurtbox.radius,w.adventure.template.obstacles);
      }
    }
    for(let i=0;i<ULTIMATE_HITS.length;i++)if(this.elapsed>=ULTIMATE_HITS[i]&&!this.fired.has(i)){this.fired.add(i);this.hit(i);}
    if(this.elapsed>=ULTIMATE_DURATION){this.active=false;w.player.actor.action=undefined;w.player.actor.facing=this.angle;for(const e of w.enemies)if(this.targets.includes(e.actor)){e.hitstunRemaining=Math.max(.25,e.hitstunRemaining);e.attackCooldown=Math.max(.6,e.attackCooldown);}}
  }
  private hit(phase:number){
    const w=this.w,a=w.player.actor,weapon=this.weapons[phase===4?1:0],shot=phase>=2&&phase<=4,finisher=phase===5;
    if(phase===4){const from=w.weapons.active,to=1-this.startingSlot;w.weapons.active=to;w.weapons.slots[from].pending=undefined;w.events.emit('weaponSwitched',{from,to});}
    const amount=phase===0?24:phase===1?20:weapon.damage*.8;
    const slot=phase===4?1-this.startingSlot:this.startingSlot;
    const c=shot?w.attacks.weaponSnapshot(weapon,w.settings,undefined,.8,slot):w.attacks.snapshot(a,amount*w.settings.damageMultiplier*w.player.stats.damageMultiplier,'violet-ultimate','heavy',finisher);
    if(shot)w.attacks.applyCharge(c,weapon,weapon.mechanic?.mode==='charge'?1:0);
    c.weaponId='violet-ultimate';
    c.nativeContinuation=true;c.chargeGranted=true;c.damageScale=w.settings.damageMultiplier*w.player.stats.damageMultiplier;c.knockback=0;
    c.heavy=finisher;c.ultimateCast=this.casts;c.ultimatePhase=phase;
    if(shot){c.element=weapon.element;c.equippedWeaponId=weapon.id;
      w.attacks.consumePending(c,slot,.8);
      const aim=this.weaponAim(),hand={x:a.pos.x+Math.cos(aim)*7,y:a.pos.y-18};
      a.aim=aim;c.heavy=weapon.category!=='gun';
      w.attacks.emitWeapon(c,weapon,aim,hand,undefined,1,(weapon.muzzleLength??24)*.68);if(weapon.mechanic)w.feel.weaponShot(a,weapon.mechanic.style,c.chargeLevel,(weapon.muzzleLength??24)*.68);else w.audio.play(weapon.category==='melee'?'slash':'shot');return;
    }
    if(phase===0)c.launch={height:32,duration:.9,distance:0};
    for(const target of this.targets){if(!target.health.alive)continue;
      if(finisher){const total=this.openingDamage.get(target.id)??0;if(total<=0)continue;const final=w.attacks.snapshot(a,Math.round(total*ULTIMATE_FINISHER_RATIO),'violet-ultimate','heavy',true);final.nativeContinuation=true;final.chargeGranted=true;final.knockback=0;final.ultimateCast=this.casts;final.ultimatePhase=5;final.resolvedDamage=true;w.damage.tryHit(final,target,{x:0,y:0});}
      else w.damage.tryHit(c,target,{x:0,y:0});
    }
    w.audio.play('slash');
    if(finisher){w.time.requestHitStop(.07);w.feel.burst(a.pos,16,'#d4b4f2');}
  }
  shotWeapon(shot:number){return this.weapons[shot<2?0:1];}
  cancel(){this.active=false;this.targets=[];this.elapsed=0;this.openingDamage.clear();this.weapons=[];this.fired.clear();}
  clear(){this.cancel();this.energy=0;this.rewarded.clear();this.finishers.clear();}
  dispose(){this.off.forEach(off=>off());this.clear();}
  snapshot(){return {energy:this.energy,active:this.active,elapsed:this.elapsed,casts:this.casts,targets:this.targets.map(a=>a.id),weapons:this.weapons.map(w=>w.id),openingDamage:Object.fromEntries(this.openingDamage)};}
}
