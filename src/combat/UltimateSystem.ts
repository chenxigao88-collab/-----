import type { World } from '../world/World';
import type { Actor } from '../actors/Actor';
import type { WeaponData } from '../data/weapons';
import { angleTo, clamp, direction, distance, normal, sub, type Vec2 } from '../core/types';
import type {AttackContext} from './AttackSystem';
import {MOON_DURATION,MOON_HITS,MOON_STAGES,MOON_FINISHER_RATIO} from '../data/moonUltimate';
import { sweptSectorCapsule } from '../world/Collision';
import { obstacleContact, resolveObstacles } from '../world/Obstacles';
import {ULTIMATE_DURATION,ULTIMATE_HITS,ULTIMATE_STAGES,ULTIMATE_FINISHER_RATIO} from '../data/ultimate';
export {ULTIMATE_DURATION} from '../data/ultimate';
export class UltimateSystem {
  energy=0;elapsed=0;active=false;casts=0;angle=0;tier:1|2=1;targets:Actor[]=[];
  readonly trails:{pos:Vec2;time:number}[]=[];
  private path:Vec2[]=[];private wounds=new Map<number,AttackContext[]>();private resolvingWounds=false;
  private weapons:WeaponData[]=[];private fired=new Set<number>();private rewarded=new Map<number,number>();private finishers=new Set<number>();private off:(()=>void)[]=[];
  private openingDamage=new Map<number,number>();private startingSlot=0;
  constructor(private w:World){
    this.off.push(w.events.on('damageApplied',e=>{
      const c=e.attack;
      if(this.active&&c.ultimateCast===this.casts&&c.ultimatePhase!==undefined&&c.ultimatePhase<5&&(!this.fired.has(5)||this.resolvingWounds)&&e.amount>0)this.openingDamage.set(e.targetId,(this.openingDamage.get(e.targetId)??0)+e.amount);
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
  get secondReady(){return this.energy>=200;}
  get duration(){return this.tier===2?MOON_DURATION:ULTIMATE_DURATION;}
  get charges(){return Math.floor(this.energy/100);}
  get markedTargets(){return this.targets.filter(t=>this.wounds.has(t.id)||(this.openingDamage.get(t.id)??0)>0);}
  gain(amount:number){if(this.w.player.actor.character==='violet'&&!this.active)this.energy=clamp(this.energy+amount,0,200);}
  request(aim:Vec2,tier:1|2=1){
    const w=this.w,a=w.player.actor;
    if(a.character!=='violet'||w.state!=='playing'||!a.health.alive||this.active||this.energy<tier*100||w.player.dashing||w.adventure.panel||w.adventure.transitionRemaining>0)return false;
    const angle=angleTo(a.pos,aim);
    this.targets=w.enemies.filter(e=>e.actor.health.alive&&sweptSectorCapsule(a.pos,e.actor.hurtbox.capsule(e.actor.pos),tier===2?360:240,angle-Math.PI*.6,angle+Math.PI*.6)&&
      (!w.adventureMode||!obstacleContact(a.hurtbox.center(a.pos),e.actor.hurtbox.center(e.actor.pos),0,w.adventure.template.obstacles)))
      .sort((x,y)=>distance(a.pos,x.actor.pos)-distance(a.pos,y.actor.pos)).slice(0,tier===2?8:5).map(e=>e.actor);
    if(!this.targets.length){w.events.emit('message',{text:'前方没有可锁定的敌人'});return false;}
    this.weapons=[w.weapons.slots[w.weapons.active].data,w.weapons.slots[1-w.weapons.active].data];
    this.startingSlot=w.weapons.active;this.openingDamage.clear();
    this.tier=tier;this.angle=angle;this.energy-=tier*100;this.elapsed=0;this.active=true;this.casts++;this.fired.clear();this.wounds.clear();this.trails.length=0;
    const center=this.targets.reduce((p,t)=>({x:p.x+t.pos.x/this.targets.length,y:p.y+t.pos.y/this.targets.length}),{x:0,y:0}),d=direction(angle),side={x:-d.y,y:d.x};
    this.path=[{...a.pos},{x:center.x-side.x*45-d.x*30,y:center.y-side.y*45-d.y*30},{x:center.x+side.x*45,y:center.y+side.y*45},{x:center.x+d.x*85,y:center.y+d.y*85}].map(p=>({x:clamp(p.x,96,864),y:clamp(p.y,102,440)}));
    w.attacks.cancelPrimary();w.gunfu.cancel();w.melee.cancel(a.id);w.player.dashRemaining=0;a.idleTime=0;a.moving=false;a.facing=angle;
    a.invulnerability.grant('ultimate',this.duration+.08);
    for(const target of this.targets)w.melee.cancel(target.id);
    w.audio.play(tier===2?'moonRise':'swap');this.pose();return true;
  }
  private pose(){
    if(this.tier===2){const t=this.elapsed,stage=MOON_STAGES.find(s=>t<s.end)??MOON_STAGES.at(-1)!,angle=t>=.8&&t<1.9?this.weaponAim():this.angle;
      this.w.player.actor.action={kind:stage.pose,elapsed:t-stage.start,duration:stage.end-stage.start,angle,gunfu:true,ultimateTime:t,ultimateTier:2};this.w.player.actor.aim=angle;return;
    }
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
    this.elapsed=Math.min(this.duration,this.elapsed+dt);if(this.tier===2)this.travel(dt);this.pose();
    for(const target of this.targets){if(!target.health.alive)continue;
      if(w.enemies.some(e=>e.actor===target&&e.kind==='boss'))continue;
      if(target.launch.active){target.launch.step(dt);target.hurtbox.lift=target.launch.height;}
      if(this.tier===1&&this.elapsed>=1.25&&this.elapsed<1.85){const d=direction(this.angle),goal={x:w.player.actor.pos.x+d.x*94,y:w.player.actor.pos.y+d.y*94},delta=normal(sub(goal,target.pos)),travel=Math.min(distance(goal,target.pos),dt*80),previous={...target.pos};
        target.pos={x:target.pos.x+delta.x*travel,y:target.pos.y+delta.y*travel};if(w.adventureMode)target.pos=resolveObstacles(target.pos,previous,target.hurtbox.radius,w.adventure.template.obstacles);
      }
    }
    const hits=this.tier===2?MOON_HITS:ULTIMATE_HITS;
    for(let i=0;i<hits.length;i++)if(this.elapsed>=hits[i]&&!this.fired.has(i)){this.fired.add(i);if(this.tier===2)this.moonHit(i);else this.hit(i);}
    if(this.elapsed>=this.duration){this.active=false;w.player.actor.action=undefined;w.player.actor.facing=this.angle;for(const e of w.enemies)if(this.targets.includes(e.actor)){e.hitstunRemaining=Math.max(.25,e.hitstunRemaining);e.attackCooldown=Math.max(.6,e.attackCooldown);}}
  }
  private travel(dt:number){
    const a=this.w.player.actor,t=this.elapsed;if(t<2||t>=3.8)return;
    const segment=Math.min(2,Math.floor((t-2)/.6)),progress=clamp((t-2-segment*.6)/.6,0,1),from=this.path[segment],to=this.path[segment+1],ease=progress*progress*(3-2*progress),previous={...a.pos};
    let goal={x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease};
    if(this.w.adventureMode){const obstacles=this.w.adventure.template.obstacles,contact=obstacleContact(previous,goal,a.hurtbox.radius,obstacles);if(contact){const fraction=Math.max(0,contact.t-.01);goal={x:previous.x+(goal.x-previous.x)*fraction,y:previous.y+(goal.y-previous.y)*fraction};}goal=resolveObstacles(goal,previous,a.hurtbox.radius,obstacles);}
    a.pos=goal;
    if(!this.trails.length||t-this.trails.at(-1)!.time>=.08)this.trails.push({pos:previous,time:t-dt});
    while(this.trails.length&&t-this.trails[0].time>.4)this.trails.shift();
  }
  private moonHit(phase:number){
    const w=this.w,a=w.player.actor;
    if(phase<2){
      const slot=phase===0?this.startingSlot:1-this.startingSlot,weapon=this.weapons[phase];
      if(phase===1){const from=w.weapons.active;w.weapons.active=slot;w.weapons.slots[from].pending=undefined;w.events.emit('weaponSwitched',{from,to:slot});}
      const c=w.attacks.weaponSnapshot(weapon,w.settings,undefined,1.6,slot);w.attacks.applyCharge(c,weapon,weapon.mechanic?.mode==='charge'?1:0);c.weaponId='violet-ultimate';c.equippedWeaponId=weapon.id;c.nativeContinuation=true;c.chargeGranted=true;c.damageScale=w.settings.damageMultiplier*w.player.stats.damageMultiplier;c.knockback=0;c.ultimateCast=this.casts;c.ultimatePhase=phase;c.ultimateTier=2;
      if(phase===0)c.launch={height:24,duration:2.7,distance:0};
      w.attacks.consumePending(c,slot,1.6);const angle=this.weaponAim();w.attacks.emitWeapon(c,weapon,angle,{x:a.pos.x+Math.cos(angle)*7,y:a.pos.y-18},undefined,1,(weapon.muzzleLength??24)*.68);if(weapon.mechanic)w.feel.weaponShot(a,weapon.mechanic.style,c.chargeLevel,(weapon.muzzleLength??24)*.68);else w.audio.play(weapon.category==='melee'?'slash':'shot');return;
    }
    if(phase<5){
      const base=32+.2*(this.weapons[0].damage+this.weapons[1].damage),c=w.attacks.snapshot(a,base*w.settings.damageMultiplier*w.player.stats.damageMultiplier,'violet-ultimate','heavy',false);
      c.nativeContinuation=true;c.chargeGranted=true;c.knockback=0;c.ultimateCast=this.casts;c.ultimatePhase=phase;c.ultimateTier=2;
      for(const target of this.targets){if(!target.health.alive||w.adventureMode&&obstacleContact(a.hurtbox.center(a.pos),target.hurtbox.center(target.pos),0,w.adventure.template.obstacles))continue;const cuts=this.wounds.get(target.id)??[];cuts.push(c);this.wounds.set(target.id,cuts);}
      w.audio.play('moonSlash');return;
    }
    this.resolvingWounds=true;
    try{for(const target of this.targets)if(target.health.alive)for(const cut of this.wounds.get(target.id)??[])w.damage.tryHit(cut,target,{x:0,y:0});}finally{this.resolvingWounds=false;}
    for(const target of this.targets){const total=this.openingDamage.get(target.id)??0;if(!target.health.alive||total<=0)continue;
      const c=w.attacks.snapshot(a,Math.round(total*MOON_FINISHER_RATIO),'violet-ultimate','heavy',true);c.nativeContinuation=true;c.chargeGranted=true;c.resolvedDamage=true;c.knockback=target===w.special.boss?.actor?0:65;c.ultimateCast=this.casts;c.ultimatePhase=5;c.ultimateTier=2;w.damage.tryHit(c,target,direction(this.angle));
    }
    w.audio.play('moonSheath');w.audio.play('moonBreak');w.time.requestHitStop(.12,.12);w.feel.burst(a.pos,20,'#cf9dff');
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
  cancel(){if(this.active){this.w.player.actor.action=undefined;this.w.player.actor.invulnerability.revoke('ultimate');}this.active=false;this.targets=[];this.elapsed=0;this.openingDamage.clear();this.weapons=[];this.fired.clear();this.wounds.clear();this.trails.length=0;this.path=[];}
  clear(){this.cancel();this.energy=0;this.rewarded.clear();this.finishers.clear();}
  dispose(){this.off.forEach(off=>off());this.clear();}
  snapshot(){return {energy:this.energy,charges:this.charges,tier:this.tier,active:this.active,elapsed:this.elapsed,casts:this.casts,targets:this.targets.map(a=>a.id),weapons:this.weapons.map(w=>w.id),openingDamage:Object.fromEntries(this.openingDamage),wounds:Object.fromEntries([...this.wounds].map(([id,cuts])=>[id,cuts.length]))};}
}
