import { SKILLS,type WeaponData,type SkillData } from '../data/weapons';
import {shotProfile,type ShotProfile} from '../data/weaponMechanics';
import type {BulletStyle} from '../data/weaponMechanics';
import { clamp, direction, add, mul, constrain, angleTo, type Faction, type ResonanceType, type Vec2, Random } from '../core/types';
import { handPosition, type Actor } from '../actors/Actor';
import type { Player } from '../actors/Player';
import type { Enemy, EnemyAttackOptions } from '../actors/Enemy';
import type { WeaponController } from './WeaponController';
import type { ProjectileSystem, ProjectileOptions } from './ProjectileSystem';
import type { MeleeSystem } from './MeleeSystem';
import type { DebugSettings } from '../data/player';
import type { EventBus } from '../core/EventBus';
import type { AttackElement, ReactionId } from '../data/elements';
export interface AreaRequest { context:AttackContext; pos:Vec2; mode:'zone'|'strike'; radius:number; duration:number; delay:number }
export interface NativeEffect { splash?:number; splashRadius?:number; splashTargets?:number; chain?:number; chainRange?:number; chainTargets?:number; slow?:{ strength:number; duration:number }; pull?:number }
export interface AttackContext {
  runId: number; id: number; sourceId: number; faction: Faction; weaponId: string; resonanceType: ResonanceType;
  damage: number; critical: boolean; knockback: number; heavy: boolean; skill: boolean; secondary: boolean;
  reactionBaseDamage?:number; armorPierce?:number;
  chargeLevel?:number; shotProfile?:ShotProfile;
  burstHits?:Map<number,number>; burstFollowup?:boolean;
  sharedAttack?:AttackContext;
  chargeGranted: boolean; feelGranted: boolean; explosionTriggered: boolean;
  explosion?: { radius: number; damage: number };
  element:AttackElement; damageScale:number; elementTargets:Set<number>; nativeTargets:Set<number>;
  reactionHits:Map<ReactionId,Set<number>>; native?:NativeEffect;
  gunfu?:'body'|'finisher';
  gunfuSequence?:number;
  gunfuShot?:'air'|'ground';
  gunfuPhase?:number;
  nativeDamageScale?:number;
  nativeDamage?:boolean;
  nativeContinuation?:boolean;
  environment?:boolean;
  ultimateCast?:number;
  ultimatePhase?:number;
  equippedWeaponId?:string;
  resolvedDamage?:boolean;
  launch?:{height:number;duration:number;distance:number};
}
export class AttackSystem {
  nextId = 1; shots = 0; rejected = 0;
  charge=0; charging=false; ramp=0; heat=[0,0]; overheated=[0,0]; blade=[0,0];
  private chargeWeapon='';private chargeSlot=-1;private lastFire=false;
  private bladeContacts=new Set<number>();
  constructor(private player: Player, private weapons: WeaponController, private projectiles: ProjectileSystem, private melee: MeleeSystem, private random: Random, private events: EventBus, private shotEffect: (actor: Actor, heavy: boolean, melee: boolean, muzzleLength?:number,style?:BulletStyle,charge?:number) => void, private area?: (request:AreaRequest)=>void) {}
  snapshot(actor: Actor, damage: number, weaponId: string, type: ResonanceType, heavy: boolean): AttackContext {
    return { runId: actor.runId, id: this.nextId++, sourceId: actor.id, faction: actor.faction, weaponId, resonanceType: type, damage, critical: false, knockback: 80, heavy, skill: false, secondary: false, chargeGranted: false, feelGranted: false, explosionTriggered: false, element:'none', damageScale:1, elementTargets:new Set(),nativeTargets:new Set(),reactionHits:new Map() };
  }
  get busy() { return this.melee.attacks.some(a => a.context.sourceId === this.player.actor.id && a.alive); }
  projectileCapacity(count:number){return this.projectiles.canAdd(count);}
  cancelPrimary(cancelShots=true){this.charge=0;this.charging=false;this.chargeWeapon='';this.chargeSlot=-1;this.ramp=0;this.lastFire=false;if(cancelShots)this.projectiles.cancelDelayed(this.player.actor.id);}
  clear(){this.cancelPrimary();this.heat=[0,0];this.overheated=[0,0];this.blade=[0,0];this.bladeContacts.clear();}
  primary(dt:number,fire:boolean,settings:DebugSettings,aim:Vec2,enabled=true){
    if(dt<=0)return;
    for(let i=0;i<2;i++){this.overheated[i]=Math.max(0,this.overheated[i]-dt);if(i!==this.weapons.active||!fire||!enabled||this.overheated[i]>0)this.heat[i]=Math.max(0,this.heat[i]-dt*.9);}
    if(!enabled||this.player.dashing||!this.player.actor.health.alive){this.cancelPrimary(this.player.dashing||!this.player.actor.health.alive);return;}
    const w=this.weapons.current.data,slot=this.weapons.active;
    if(this.chargeWeapon&&(this.chargeWeapon!==w.id||this.chargeSlot!==slot))this.cancelPrimary();
    if(w.mechanic?.mode==='charge'){
      if(fire&&!this.charging&&this.weapons.current.cooldown<=0&&this.weapons.switchLock<=0&&!this.busy){this.charging=true;this.chargeWeapon=w.id;this.chargeSlot=slot;this.charge=0;}
      if(this.charging){this.charge=Math.min(1,this.charge+dt/(w.mechanic.chargeTime??.75));if(!fire||this.charge>=1){const q=this.charge;if(this.requestPlayer(false,settings,aim,undefined,q)){this.charge=0;this.charging=false;this.chargeWeapon='';this.chargeSlot=-1;}}}
    }else if(fire&&this.overheated[slot]<=0){
      if(w.mechanic?.mode==='ramp')this.ramp=Math.min(1,this.ramp+dt/1.1);
      if(this.requestPlayer(false,settings,aim)&&w.mechanic?.mode==='beam'){this.heat[slot]=Math.min(1,this.heat[slot]+.12);if(this.heat[slot]>=1-1e-8)this.overheated[slot]=.65;}
    }
    if(!fire&&this.lastFire)this.ramp=0;this.lastFire=fire;
  }
  contact(c:AttackContext,target:Actor){
    const slot=this.weapons.slots.findIndex(s=>s.data.id===(c.equippedWeaponId??c.weaponId));
    if(slot>=0&&this.weapons.slots[slot].data.family==='hush_edge'&&!c.secondary&&!c.gunfu&&!c.skill&&!c.nativeContinuation&&distanceFrom(this.player.actor.pos,target.pos)>=this.weapons.slots[slot].data.range*.65&&!this.bladeContacts.has(c.id)){
      this.bladeContacts.add(c.id);this.blade[slot]=Math.min(3,this.blade[slot]+1);if(this.bladeContacts.size>100)this.bladeContacts.delete(this.bladeContacts.values().next().value!);
    }
    if(c.burstHits&&!c.secondary){const hits=(c.burstHits.get(target.id)??0)+1;c.burstHits.set(target.id,hits);if(hits===3&&c.burstFollowup&&target.health.alive){const follow=this.secondary(c,c.damage*.75);follow.nativeDamage=true;this.projectiles.spawn(follow,handPosition(this.player.actor),angleTo(handPosition(this.player.actor),target.hurtbox.center(target.pos)),{speed:850,range:480,radius:5,homing:7,style:'wind'});}}
  }
  requestPlayer(skill: boolean, settings: DebugSettings, aim?:Vec2, finisher?:{multiplier:number;sequence?:number;shot?:'air'|'ground'},charge=0) {
    const actor = this.player.actor, slot = this.weapons.current, weapon = slot.data;
    if (!actor.health.alive || this.player.dashing || (!finisher&&(this.busy || this.weapons.switchLock > 0 || slot.cooldown > 0)) || (skill && slot.skillCooldown > 0)) return false;
    const baseSkill = skill ? SKILLS[weapon.skillId] : undefined;
    const skillData=finisher&&weapon.mechanic?.mode==='charge'&&baseSkill?.mode?{...baseSkill,mode:undefined,damage:1.4}:baseSkill;
    const q=finisher&&weapon.mechanic?.mode==='charge'?1:charge,profile=shotProfile(weapon,q),projectile=weapon.category!=='melee'||weapon.family==='wind_ring';
    if (projectile && !skillData?.mode && !this.projectiles.canAdd(profile.count)) { this.rejected++; this.events.emit('message', { text: '弹体达到安全上限' }); return false; }
    if(!finisher)actor.action={kind:weapon.category==='melee'?'strike':'shoot',elapsed:0,duration:weapon.category==='melee'?.35:.16,angle:actor.aim};
    if(aim){actor.aim=angleTo(handPosition(actor),aim);if(actor.action)actor.action.angle=actor.aim;}
    const speed = clamp(this.player.stats.attackSpeedMultiplier * actor.status.multiplier(`speed:${this.weapons.active}`)*(weapon.mechanic?.mode==='ramp'&&!finisher?1+this.ramp*.85:1), .1, 3);
    const context=this.weaponSnapshot(weapon,settings,skillData,finisher?.multiplier??1);
    this.applyCharge(context,weapon,q);
    if(skillData?.mode)context.explosion=undefined;
    if(finisher){context.gunfu='finisher';context.gunfuSequence=finisher.sequence;context.gunfuShot=finisher.shot;}
    if(skillData?.mode!=='zone')this.consumePending(context,this.weapons.active,finisher?.multiplier??1);
    slot.cooldown = Math.max(slot.cooldown,1 / (weapon.attackRate * speed));
    if (skillData) slot.skillCooldown = skillData.cooldown;
    if (skillData?.mode) {
      const hand=handPosition(actor), requested=aim??add(hand,mul(direction(actor.aim),240));
      const delta={x:requested.x-hand.x,y:requested.y-hand.y}, distance=Math.hypot(delta.x,delta.y);
      const pos=constrain(add(hand,mul(delta,distance>360?360/distance:1)),skillData.radius??70);
      this.area?.({context,pos,mode:skillData.mode,radius:skillData.radius??70,duration:skillData.duration??0,delay:skillData.delay??0});
    } else {
      this.emitWeapon(context,weapon,actor.aim,handPosition(actor),skillData,speed);
      if(weapon.family==='hush_edge'&&!finisher&&!skill&&this.blade[this.weapons.active]>=3){this.blade[this.weapons.active]=0;const wave=this.secondary(context,context.damage*.85);wave.nativeDamage=true;this.projectiles.spawn(wave,handPosition(actor),actor.aim,{speed:640,range:weapon.range+220,radius:12,pierce:2,style:'wave'});}
      if(weapon.category==='melee'&&weapon.family!=='wind_ring'){const m=weapon.melee!;slot.cooldown=Math.max(slot.cooldown,((skillData?.windup??m.windup)+(skillData?.active??m.active)+(skillData?.recover??m.recover))/speed);}
    }
    actor.recoil = 1;this.shots++; this.shotEffect(actor, context.heavy, weapon.category === 'melee',weapon.muzzleLength,weapon.mechanic?.style,q); return true;
  }
  weaponSnapshot(weapon:WeaponData,settings:DebugSettings,skill?:SkillData,multiplier=1,slot=this.weapons.active){
    const scale=settings.damageMultiplier*this.player.stats.damageMultiplier;
    const c=this.snapshot(this.player.actor,weapon.damage*scale*(skill?.damage??1)*multiplier,weapon.id,this.weapons.type(slot),weapon.category!=='gun');
    c.skill=Boolean(skill);c.element=weapon.element;c.damageScale=scale;c.nativeDamageScale=scale*multiplier;
    c.reactionBaseDamage=weapon.damage*(weapon.category==='shotgun'?2:1);c.armorPierce=weapon.armorPierce??0;
    c.native=skill?{slow:skill.slow?{strength:skill.slow,duration:3}:undefined,pull:skill.pull?(skill.range??78):undefined}:{
      splash:weapon.effect?.splash,splashRadius:weapon.effect?.splashRadius,splashTargets:weapon.effect?.splashTargets,
      chain:weapon.effect?.chain,chainRange:weapon.effect?.chainRange,chainTargets:weapon.effect?.chainTargets,
      pull:weapon.effect?.pull,slow:weapon.effect?.slow?{strength:weapon.effect.slow,duration:1.5}:undefined
    };
    c.critical=this.random.next()<clamp(this.player.stats.criticalChance+weapon.criticalChance,0,1);
    if(c.critical)c.damage*=this.player.stats.criticalDamage;
    c.knockback=weapon.knockback*(skill?.knockback??1);return c;
  }
  applyCharge(c:AttackContext,weapon:WeaponData,charge:number){
    const profile=shotProfile(weapon,charge);c.chargeLevel=charge;c.shotProfile=profile;c.damage*=profile.damage;c.knockback*=1+charge*.5;
    if(weapon.family==='ember_lantern'){c.native={...c.native,splash:undefined};c.explosion={radius:profile.explosionRadius,damage:c.damage*.65};}
  }
  consumePending(context:AttackContext,slot:number,multiplier=1){
    const pending=this.weapons.slots[slot].pending;
    if(pending?.kind==='next_damage')context.damage*=pending.multiplier;
    if(pending?.kind==='next_explosion')context.explosion={radius:pending.radius,damage:pending.damage*context.damageScale*multiplier};
    this.weapons.slots[slot].pending=undefined;
  }
  emitWeapon(context:AttackContext,weapon:WeaponData,angle:number,hand=handPosition(this.player.actor),skill?:SkillData,speed=1,muzzleLength=weapon.muzzleLength??24){
    const actor=this.player.actor;
    if(weapon.category==='melee'&&weapon.family!=='wind_ring'){const m=weapon.melee!;this.melee.spawn(context,actor,skill?.range??weapon.range,skill?.arc??m.arc,(skill?.windup??m.windup)/speed,(skill?.active??m.active)/speed,(skill?.recover??m.recover)/speed,angle);return true;}
    const profile=context.shotProfile??shotProfile(weapon),count=profile.count,burst=weapon.mechanic?.mode==='burst';
    if(!this.projectiles.canAdd(count))return false;
    const origin=constrain(add(hand,mul(direction(angle),muzzleLength)),3),spread=burst?.025:skill?.spread??profile.spread;
    if(burst){context.burstHits=new Map();context.burstFollowup=weapon.tier===3;}
    for(let i=0;i<count;i++)this.projectiles.spawn(burst&&i===count-1?{...context,sharedAttack:context,damage:context.damage*(weapon.tier===3?1.7:1.4)}:context,origin,angle+(count===1?0:spread*(i/(count-1)-.5))+this.random.range(-.008,.008),{speed:weapon.projectileSpeed,range:weapon.range,pierce:weapon.family==='wind_ring'?99:weapon.pierce,bounce:weapon.bounce,radius:skill?.slow?5:profile.radius,pierceMultiplier:weapon.family==='wind_ring'?1:weapon.pierceMultiplier,launchFrom:constrain(hand,3),style:profile.style,homing:weapon.family==='thunder_branch'?7:0,delay:burst?i*(weapon.mechanic?.interval??.065):0,followAim:burst&&!context.gunfu&&!context.ultimateCast,returnTo:weapon.family==='wind_ring'?actor.id:undefined,explosionRadius:profile.explosionRadius,charged:context.chargeLevel});
    return true;
  }
  requestEnemy(enemy: Enemy, options:EnemyAttackOptions={}) {
    const actor = enemy.actor, data = enemy.data;
    const context = this.snapshot(actor, data.damage*(options.damageMultiplier??1), enemy.kind, 'heavy', enemy.kind === 'shooter');
    context.knockback = enemy.kind === 'shooter' ? 100 : 55;
    actor.recoil = 1;
    this.melee.spawn(context,actor,options.range??data.attackRange,options.arc??(enemy.kind==='shooter'?3.4:enemy.kind==='sniper'?.45:1.6),0,options.active??(enemy.kind==='shooter'?.16:enemy.kind==='sniper'?.22:.12),0,options.angle??enemy.lockedAngle);
    this.shotEffect(actor, enemy.kind === 'shooter', true);
  }
  fixture(options: Partial<ProjectileOptions>) {
    const actor = this.player.actor;
    const context = this.snapshot(actor, 14, 'fixture', this.weapons.type(this.weapons.active), false);
    if (this.projectiles.canAdd(1)) this.projectiles.spawn(context, constrain(add(actor.pos, mul(direction(actor.aim), 20)), 4), actor.aim, { speed: 420, range: 1400, ...options });
  }
  secondary(context: AttackContext, damage: number): AttackContext { return { ...context, id: this.nextId++, damage, critical: false, secondary: true, nativeDamage:undefined, sharedAttack:undefined, knockback:0, element:'none',native:undefined, explosion: undefined, explosionTriggered: true, chargeGranted: true, feelGranted: true }; }
  directVariant(context:AttackContext,damage:number):AttackContext { return {...context,damage,critical:false,knockback:0,native:undefined,nativeContinuation:true,explosion:undefined,chargeGranted:true,feelGranted:true}; }
  muzzle(actor: Actor, length = 24): Vec2 { return constrain(add(handPosition(actor), mul(direction(actor.aim), length)), 3); }
}
function distanceFrom(a:Vec2,b:Vec2){return Math.hypot(a.x-b.x,a.y-b.y);}
