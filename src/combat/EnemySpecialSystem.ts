import type {World} from '../world/World';
import type {Enemy} from '../actors/Enemy';
import type {Actor} from '../actors/Actor';
import type {AttackContext} from './AttackSystem';
import {angleDiff,angleTo,constrain,direction,distance,normal,sub,type Vec2} from '../core/types';
import {depthScale} from '../data/chapter';
export interface Fallen {enemy:Enemy;age:number}
export interface EmberBlast {pos:Vec2;age:number;context:AttackContext;friendly:AttackContext;hits:Set<number>}
export class EnemySpecialSystem {
  fallen:Fallen[]=[];blasts:EmberBlast[]=[];private hazardClock=0;
  constructor(private w:World){
    w.events.on('damageApplied',e=>{if(e.attack.faction!=='player'||e.amount<=0)return;const enemy=w.enemies.find(n=>n.actor.id===e.targetId);if(!enemy)return;
      if(enemy.kind==='shield'&&e.attack.gunfu==='body'&&!enemy.poiseAttacks.has(e.attack.id)){enemy.poiseAttacks.add(e.attack.id);if(++enemy.guardHits>=2){enemy.guardBroken=4;enemy.guardHits=0;w.events.emit('message',{text:'破盾 · 接上连招'});}}
      if(enemy.kind==='boss'&&!e.attack.secondary&&!enemy.poiseAttacks.has(e.attack.id)){enemy.poiseAttacks.add(e.attack.id);this.shave(enemy,e.attack.gunfu==='body'?12:e.attack.gunfu==='finisher'?8:e.attack.weaponId==='violet-ultimate'?14:e.attack.heavy?6:3);}
      if(enemy.poiseAttacks.size>256)enemy.poiseAttacks.clear();
    });
    w.events.on('elementReaction',e=>{const enemy=w.enemies.find(n=>n.actor.id===e.targetId);if(enemy?.kind==='shield')enemy.guardBroken=Math.max(2,enemy.guardBroken);if(enemy?.kind==='boss')this.shave(enemy,14);});
    w.events.on('perfectDodge',()=>{const boss=this.boss;if(boss)this.shave(boss,18);});
    w.events.on('actorDied',e=>{const enemy=w.enemies.find(n=>n.actor.id===e.id);if(!enemy)return;if(this.fallen.length>=18)this.fallen.shift();this.fallen.push({enemy,age:0});
      if(enemy.kind==='parasite')this.burst(enemy);
      if(enemy.kind==='boss'){enemy.enter('Dead');w.room.pending=[];for(const add of w.enemies)if(add.kind!=='boss'){add.actor.health.hp=0;w.room.onDeath(add.actor.id,add.encounter);}this.blasts=[];w.hazards.items=[];w.melee.clear();w.projectiles.clear();w.abilities.clear();w.elements.clear();}
    });
  }
  get boss(){return this.w.enemies.find(e=>e.kind==='boss'&&e.actor.health.alive);}
  multiplier(c:AttackContext,target:Actor){const e=this.w.enemies.find(n=>n.actor===target);if(!e)return 1;
    if(e.kind==='boss')return e.brokenRemaining>0?1.2:1;
    if(e.kind!=='shield'||e.guardBroken>0||c.secondary)return 1;const source=this.w.actors.find(a=>a.id===c.sourceId);return source&&Math.abs(angleDiff(angleTo(e.actor.pos,source.pos),e.actor.facing))<Math.PI*.43?.6:1;
  }
  absorb(target:Actor,amount:number){const e=this.w.enemies.find(n=>n.actor===target);if(!e?.ward||e.wardTime<=0)return amount;const absorbed=Math.min(e.ward,amount);e.ward-=absorbed;return amount-absorbed;}
  specialAttack(e:Enemy){if(e.kind==='cantor'){const peers=this.w.enemies.filter(p=>p!==e&&p.kind!=='boss'&&p.actor.health.alive&&distance(p.actor.pos,e.actor.pos)<260).sort((a,b)=>distance(a.actor.pos,e.actor.pos)-distance(b.actor.pos,e.actor.pos)).slice(0,2),ward=Math.round(20*(this.w.adventureMode?depthScale(this.w.adventure.template.depth??1).hp:1));for(const p of peers){p.ward=Math.max(p.ward,ward);p.wardMax=Math.max(p.wardMax,ward);p.wardTime=4;this.w.feel.burst(p.actor.pos,5,'#edc57d');}e.attackCooldown=6;return true;}
    if(e.kind==='parasite'){this.burst(e,.95);return true;}return false;
  }
  private burst(e:Enemy,age=0){if(this.blasts.length>=20)return;const context=this.w.attacks.snapshot(e.actor,e.data.damage,'parasite-burst','heavy',false),friendly=this.w.attacks.secondary(this.w.attacks.snapshot(this.w.player.actor,30,'parasite-burst','heavy',false),30);context.knockback=0;this.blasts.push({pos:{...e.actor.pos},age,context,friendly,hits:new Set()});}
  shave(e:Enemy,amount:number){if(!e.actor.health.alive||e.brokenRemaining>0)return;e.poise=Math.max(0,e.poise-amount);if(e.poise===0){e.brokenRemaining=2.5;e.hitstunRemaining=0;e.actor.knockback.velocity={x:0,y:0};e.enter('Stunned');this.w.melee.cancel(e.actor.id);this.w.feel.burst(e.actor.pos,12,'#f4d1a2');this.w.events.emit('message',{text:'破韧 · 灰冠跪地'});}}
  step(dt:number){if(dt<=0)return;
    for(const e of this.w.enemies){e.guardBroken=Math.max(0,e.guardBroken-dt);e.wardTime=Math.max(0,e.wardTime-dt);if(!e.wardTime)e.ward=0;if(e.kind==='boss')this.stepBoss(e,dt);}
    for(const b of this.blasts){b.age+=dt;for(const actor of this.w.actors){if(actor.id===b.context.sourceId)continue;const d=distance(actor.pos,b.pos);if(actor.faction==='player'&&b.age>=.7&&b.age<.95&&d<130)this.w.damage.tryPerfectDodge(b.context,actor);if(b.age>=.95&&b.age<1.15&&d<70&&!b.hits.has(actor.id)){b.hits.add(actor.id);this.w.damage.tryHit(actor.faction==='player'?b.context:b.friendly,actor,normal(sub(actor.pos,b.pos)));}}
      if(b.age-dt<.95&&b.age>=.95)this.w.feel.burst(b.pos,16,'#f0ad6d');
    }this.blasts=this.blasts.filter(b=>b.age<1.35);
    for(const f of this.fallen){f.age+=dt;if(f.enemy.kind==='boss'&&f.age-dt<1.1&&f.age>=1.1)this.w.story.enqueue('boss-defeat');}this.fallen=this.fallen.filter(f=>f.age<(f.enemy.kind==='boss'?4:.8));
  }
  private stepBoss(e:Enemy,dt:number){const a=e.actor,w=this.w;if(!a.health.alive)return;a.previous={...a.pos};a.animation+=dt;a.moving=false;a.elemental.hardTime=0;a.knockback.velocity={x:0,y:0};a.launch.duration=0;a.hurtbox.lift=0;
    const phase=a.health.hp/a.health.maxHP<=.3?3:a.health.hp/a.health.maxHP<=.65?2:1;
    if(phase!==e.bossPhase){const oldMax=e.poiseMax;if(e.bossPhase===1)this.hazardClock=0;e.bossPhase=phase;e.poiseMax=150+(phase-1)*30;if(!e.brokenRemaining)e.poise=Math.min(e.poiseMax,e.poise+e.poiseMax-oldMax);w.events.emit('message',{text:phase===2?'灰冠裂铠 · 仍有人未归':'炉心燃尽 · 剑锋仍在颤抖'});}
    if(phase>=2&&e.phaseSummoned<2){e.phaseSummoned=2;for(const x of [210,750]){const add=w.spawn('parasite',{x,y:180},w.room.wave);w.room.aliveIds.add(add.actor.id);}}
    if(e.brokenRemaining>0){e.brokenRemaining=Math.max(0,e.brokenRemaining-dt);if(!e.brokenRemaining){e.poise=e.poiseMax;e.enter('Move');e.attackCooldown=1;}return;}
    if(phase>=2)this.hazardClock+=dt;if(phase>=2&&this.hazardClock>=7){this.hazardClock=0;const x=e.bossTurns%2?245:655;w.hazards.add({kind:'fire',x,y:185,w:65,h:215,offset:0});}
    e.attackCooldown=Math.max(0,e.attackCooldown-dt);e.elapsed+=dt;
    if(e.state==='Idle'){if(e.elapsed>.8)e.enter('Move');return;}
    if(e.state==='Stunned')e.enter('Move');
    if(e.state==='Move'){const target=w.player.actor.pos,d=distance(a.pos,target),aim=angleTo(a.pos,target);a.facing=aim;
      if(d<260&&e.attackCooldown===0){e.bossMove=phase===3&&e.bossTurns%3===2?'combo':e.bossTurns%2?'slam':'slash';e.bossAttackCount=e.bossMove==='combo'?3:phase>=2&&e.bossMove!=='slam'?2:1;e.bossTurns++;e.attackIndex=0;e.enter('Attack');e.lockedAngle=aim;return;}
      const v=normal(sub(target,a.pos)),travel=Math.min(Math.max(0,d-100),e.data.speed*dt*a.elemental.moveScale);a.pos=constrain({x:a.pos.x+v.x*travel,y:a.pos.y+v.y*travel},a.hurtbox.radius);a.moving=travel>0;return;
    }
    if(e.state==='Attack'){const windup=e.attackIndex?.85:1;if(e.elapsed-dt<windup-.22)e.lockedAngle=angleTo(a.pos,w.player.actor.pos);a.aim=a.facing=e.lockedAngle;
      if(e.elapsed>=windup){const slam=e.bossMove==='slam';w.attacks.requestEnemy(e,{angle:e.lockedAngle,arc:slam?1.55:2.65,range:slam?148:140,active:slam?.38:.24,damageMultiplier:slam?1.2:e.bossAttackCount===3?.85:1});e.enter('Recover');if(slam)e.lungeRemaining=.35;}return;
    }
    if(e.state==='Recover'){if(e.lungeRemaining>0){const step=Math.min(dt,e.lungeRemaining),v=direction(e.lockedAngle);a.pos=constrain({x:a.pos.x+v.x*160/.35*step,y:a.pos.y+v.y*160/.35*step},a.hurtbox.radius);e.lungeRemaining-=step;a.moving=true;}
      if(e.attackIndex<e.bossAttackCount-1&&e.elapsed>=.65){e.attackIndex++;e.bossMove='return';e.enter('Attack');e.lockedAngle=angleTo(a.pos,w.player.actor.pos);return;}
      if(e.elapsed>=1.65){e.enter('Move');e.attackCooldown=.85;}
    }
  }
  reset(){this.fallen=[];this.blasts=[];this.hazardClock=0;}
}
