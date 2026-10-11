import { MeleeSystem } from '../src/combat/MeleeSystem';
import { describe, expect, it } from 'vitest';
import { Player } from '../src/actors/Player';
import { createActor } from '../src/actors/Actor';
import { DamageSystem } from '../src/combat/DamageSystem';
import type { AttackContext } from '../src/combat/AttackSystem';
import { EventBus } from '../src/core/EventBus';
import { TimeManager } from '../src/core/TimeManager';
import { emptyInput } from '../src/core/InputManager';
import { defaultDebug, PERFECT_DODGE_RULES, PLAYER_STATS } from '../src/data/player';
import { vec } from '../src/core/types';

const context = (id=1): AttackContext => ({
  runId:1, id, sourceId:2, faction:'enemy', weaponId:'chaser', resonanceType:'heavy',
  damage:10, critical:false, knockback:0, heavy:false, skill:false, secondary:false,
  chargeGranted:false, feelGranted:false, explosionTriggered:false, element:'none', damageScale:1,
  elementTargets:new Set(), nativeTargets:new Set(), reactionHits:new Map(),
});
const fixture = () => {
  const player=new Player(1), events=new EventBus(), time=new TimeManager();
  const damage=new DamageSystem(player,events,()=>0,()=>time.canRewardPerfect);
  events.on('perfectDodge',()=>time.requestEnemyFreeze());
  return {player,events,time,damage};
};
const dashAt = (player:Player,from=0,to=.01) => {
  player.previousDashElapsed=from;player.dashElapsed=to;player.perfectTriggered=false;
};

describe('short dodge movement',()=>{
  it('uses the approved 56 px movement and timing windows',()=>{
    expect(PLAYER_STATS.dashSpeed*PLAYER_STATS.dashDuration).toBeCloseTo(56);
    expect(PLAYER_STATS).toMatchObject({dashCooldown:.9,dashInvulnerableTime:.11,perfectWindow:.5});
  });
  it.each([30,60,144])('travels exactly 56 px at %i Hz without movement input',hz=>{
    const player=new Player(1), input=emptyInput();input.aim=vec(800,327);
    const start={...player.actor.pos};
    for(let i=0;i<hz;i++){input.dash=i===0;player.step(1/hz,input,defaultDebug());}
    expect(player.actor.pos.x).toBeCloseTo(start.x-56,6);
    expect(player.actor.pos.y).toBeCloseTo(start.y,6);
    expect(player.dashes).toBe(1);expect(player.dashing).toBe(false);
  });
  it('uses the movement direction and keeps body facing independent from the aim',()=>{
    const player=new Player(1), input=emptyInput();input.dash=true;input.move=vec(0,-1);input.aim=vec(800,327);
    player.step(.01,input,defaultDebug());
    expect(player.actor.pos.y).toBe(336);expect(player.actor.pos.x).toBe(480);
    expect(player.actor.facing).toBeCloseTo(-Math.PI/2);expect(player.actor.aim).toBeCloseTo(0);
  });
  it('continues walking for the part of a step after the dash expires',()=>{
    const player=new Player(1), input=emptyInput();input.dash=true;input.move=vec(1,0);
    player.step(.1,input,defaultDebug());input.dash=false;player.step(.1,input,defaultDebug());
    expect(player.actor.pos.x).toBeCloseTo(480+56+.06*220,6);
  });
  it('does not reset the dash cooldown when a blocked input is pressed',()=>{
    const player=new Player(1), input=emptyInput();input.dash=true;input.move=vec(1,0);
    player.step(.01,input,defaultDebug());player.step(.01,input,defaultDebug());
    expect(player.dashes).toBe(1);expect(player.dashCooldown).toBeCloseTo(.89);
  });
});

describe('perfect dodge reward requires an actual eligible threat',()=>{
  it('blocks a melee hit at the contact time, emits one reward and starts the freeze',()=>{
    const {player,damage,time}=fixture();dashAt(player);
    const attack=context(), hitSet=new Set<number>();
    expect(damage.tryHit(attack,player.actor,vec(),.5,hitSet,true).blockedBy).toBe('invulnerable');
    expect(damage.tryHit(attack,player.actor,vec(),.5,hitSet,true).blockedBy).toBe('duplicate');
    expect(damage.perfectDodges).toBe(1);expect(player.actor.health.hp).toBe(100);
    expect(time.enemyFrozen).toBe(true);expect(time.enemyFreezeRemaining).toBe(2);
  });
  it('rewards damaging contact without requiring the old melee-only flag',()=>{
    const {player,damage,time}=fixture();dashAt(player);
    expect(damage.tryHit(context(),player.actor,vec()).blockedBy).toBe('invulnerable');
    expect(damage.perfectDodges).toBe(1);expect(time.enemyFrozen).toBe(true);
  });
  it('accepts hits after travel ends through .5 sec and rejects later hits',()=>{
    for(const elapsed of [.09,.12,.35,.5]){const {player,damage,time}=fixture();dashAt(player,elapsed,elapsed);expect(damage.tryHit(context(),player.actor,vec()).blockedBy).toBe('invulnerable');expect(damage.perfectDodges).toBe(1);expect(time.enemyFreezeRemaining).toBe(2);expect(player.actor.health.hp).toBe(100);}
    const {player,damage,time}=fixture();dashAt(player,.5001,.51);expect(damage.tryHit(context(),player.actor,vec()).actualDamage).toBe(10);expect(time.enemyFrozen).toBe(false);
  });
  it('samples the real contact time rather than the end-of-step dash time',()=>{
    const {player,damage}=fixture();dashAt(player,.065,.08);
    damage.tryHit(context(),player.actor,vec(),.2,undefined,true);
    expect(damage.perfectDodges).toBe(1);
  });
  it.each(['debug','hurt'])('cannot farm rewards while %s immunity already blocks the threat',source=>{
    const {player,damage}=fixture();dashAt(player);player.actor.invulnerability.grant(source,1);
    damage.tryHit(context(),player.actor,vec(),1,undefined,true);
    expect(damage.perfectDodges).toBe(0);expect(player.actor.health.hp).toBe(100);
  });
  it('does not reward harmless, friendly or stale-run attacks',()=>{
    const {player,damage}=fixture();dashAt(player);
    const harmless=context();harmless.damage=0;
    
    const friendly=context(3);friendly.faction='player';
    const stale=context(4);stale.runId=2;
    for(const attack of [harmless,friendly,stale])damage.tryHit(attack,player.actor,vec(),1,undefined,true);
    expect(damage.perfectDodges).toBe(0);
  });
  it('rewards at most one distinct attack per dash',()=>{
    const {player,damage}=fixture();dashAt(player);
    damage.tryHit(context(),player.actor,vec(),1,undefined,true);
    damage.tryHit(context(2),player.actor,vec(),1,undefined,true);
    expect(damage.perfectDodges).toBe(1);
  });
  it('never rewards the same AttackContext again on a later dash',()=>{
    const {player,damage,time}=fixture();const attack=context();dashAt(player);
    damage.tryHit(attack,player.actor,vec(),1,undefined,true);
    time.step(2.2);player.actor.invulnerability.step(2.2);dashAt(player);
    damage.tryHit(attack,player.actor,vec(),1,undefined,true);
    expect(damage.perfectDodges).toBe(1);
    damage.tryHit(context(2),player.actor,vec(),1,undefined,true);
    expect(damage.perfectDodges).toBe(2);
  });
  it('cannot refresh the reward during freeze, recovery or the reward cooldown',()=>{
    const {player,damage,time}=fixture();dashAt(player);
    damage.tryHit(context(),player.actor,vec(),1,undefined,true);
    for(const elapsed of [.1,.23,.2]){
      time.step(elapsed);dashAt(player);
      damage.tryHit(context(),player.actor,vec(),1,undefined,true);
      expect(damage.perfectDodges).toBe(1);
    }
  });
  it('preserves one death event when a damage listener recursively kills a victim',()=>{
    const {player,damage,events}=fixture(),enemy=createActor(3,1,'enemy',vec(),15,10);
    const first=context();first.faction='player';first.damage=5;
    const second=context(2);second.faction='player';second.damage=20;
    let deaths=0;events.on('actorDied',()=>deaths++);
    events.on('damageApplied',event=>{if(event.attack===first)damage.tryHit(second,enemy,vec());});
    expect(damage.tryHit(first,enemy,vec()).killed).toBe(false);
    expect(enemy.health.hp).toBe(0);expect(deaths).toBe(1);expect(player.actor.health.hp).toBe(100);
  });
});

describe('enemy freeze and recovery timing',()=>{
  it('freezes the enemy clock for 2 seconds while player time keeps advancing',()=>{
    const time=new TimeManager();expect(time.requestEnemyFreeze()).toBe(true);
    const frame=time.step(.1);expect(frame.enemy).toBe(0);expect(frame.player).toBe(.1);
    expect(time.enemyFreezeRemaining).toBeCloseTo(1.9);expect(frame.presentation).toBe(.1);
  });
  it('ramps the enemy clock back over .12 sec and pulses protection once',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();
    expect(time.step(2).enemy).toBe(0);expect(time.freezeJustEnded).toBe(true);
    expect(time.recovering).toBe(true);expect(PERFECT_DODGE_RULES.recoveryProtection).toBe(.08);
    expect(time.step(.06).enemy).toBeCloseTo(.015);expect(time.freezeJustEnded).toBe(false);
    expect(time.step(.06).enemy).toBeCloseTo(.045);expect(time.recovering).toBe(false);
    expect(time.step(.01).enemy).toBe(.01);
  });
  it('integrates a step across freeze, recovery and normal time',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();
    expect(time.step(2.2).enemy).toBeCloseTo(.06+.08);
    expect(time.enemyFrozen).toBe(false);expect(time.recovering).toBe(false);
  });
  it.each([30,60,144])('has the same enemy time at %i Hz',hz=>{
    const time=new TimeManager();time.requestEnemyFreeze();let elapsed=0;
    for(let i=0;i<hz*3;i++)elapsed+=time.step(1/hz).enemy;
    expect(elapsed).toBeCloseTo(3-2-.06,6);
  });
  it('cannot stack or refresh a freeze and waits two active seconds between rewards',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();time.step(.1);
    expect(time.requestEnemyFreeze()).toBe(false);expect(time.enemyFreezeRemaining).toBeCloseTo(1.9);
    time.step(.32);expect(time.requestEnemyFreeze()).toBe(false);
    time.step(1.70);expect(time.canRewardPerfect).toBe(true);expect(time.requestEnemyFreeze()).toBe(true);
  });
  it('paused time does not advance freeze or reward cooldown',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();const before=[time.enemyFreezeRemaining,time.enemyRecoveryRemaining,time.freezeRewardCooldown];
    for(let i=0;i<60;i++)time.step(0);
    expect([time.enemyFreezeRemaining,time.enemyRecoveryRemaining,time.freezeRewardCooldown]).toEqual(before);
  });
  it('keeps hit stop as a separate short full-world stop',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();time.requestHitStop(.03);
    const frame=time.step(.01);expect(frame.player).toBe(0);expect(frame.enemy).toBe(0);
    expect(time.enemyFreezeRemaining).toBeCloseTo(1.99);expect(time.freezeRewardCooldown).toBeCloseTo(1.99);
  });
  it('clears all time effects and re-enables rewards for a restarted run',()=>{
    const time=new TimeManager();time.requestEnemyFreeze();time.requestHitStop(.07);time.requestEnemySlow();time.clear();
    expect(time.enemyFrozen).toBe(false);expect(time.recovering).toBe(false);expect(time.freezeRewardCooldown).toBe(0);
    expect(time.hitStop).toBe(0);expect(time.slowScale).toBe(1);expect(time.freezeJustEnded).toBe(false);
    expect(time.requestEnemyFreeze()).toBe(true);
  });
});

describe('long idle rest',()=>{
  it('accumulates only idle time and instantly interrupts on all active controls',()=>{
    const p=new Player(1);p.actor.character='violet';const settings=defaultDebug();p.step(9,emptyInput(),settings);expect(p.actor.idleTime).toBe(9);
    for(const key of ['fire','skill','dash','interact','swap'] as const){p.actor.idleTime=10;const input=emptyInput();input[key]=true;p.step(.01,input,settings);expect(p.actor.idleTime).toBe(0);}
    p.actor.idleTime=10;const input=emptyInput();input.move=vec(1,0);p.step(.01,input,settings);expect(p.actor.idleTime).toBe(0);
  });
  it('damaging hits interrupt rest immediately',()=>{const {player,damage}=fixture();player.actor.idleTime=12;damage.tryHit(context(),player.actor,vec());expect(player.actor.idleTime).toBe(0);});
  it('does not move idle time while paused',()=>{const p=new Player(1);p.step(0,emptyInput(),defaultDebug());expect(p.actor.idleTime).toBe(0);});
});

describe('forgiving threatened dodge',()=>{
  function threat(x:number,windup=0){const f=fixture(),e=createActor(2,1,'enemy',vec(400,340),100,10);f.player.actor.pos=vec(x,340);dashAt(f.player,.25,.3);const melee=new MeleeSystem(()=>[f.player.actor,e],f.damage,()=>{});melee.spawn(context(),e,50,Math.PI/2,windup,.2,.2,0);return {...f,melee};}
  it('rewards an attack missing the normal hitbox by 40 pixels without dealing damage',()=>{const f=threat(490);f.melee.step(.01,.01);expect(f.damage.perfectDodges).toBe(1);expect(f.player.actor.health.hp).toBe(100);expect(f.time.enemyFreezeRemaining).toBe(2);});
  it('accepts the last quarter second of attack anticipation',()=>{const f=threat(490,.2);f.melee.step(.01,.01);expect(f.time.enemyFrozen).toBe(true);});
  it('rejects distant and early windups',()=>{for(const f of [threat(600),threat(490,.6)]){f.melee.step(.01,.01);expect(f.time.enemyFrozen).toBe(false);expect(f.damage.hits).toBe(0);}});
  it('keeps ordinary damage range unchanged outside the dodge window',()=>{const f=threat(490);dashAt(f.player,.6,.61);f.melee.step(.01,.01);expect(f.time.enemyFrozen).toBe(false);expect(f.player.actor.health.hp).toBe(100);});
  it('does not reward idle nearby enemies or blocked lines of attack',()=>{const f=threat(490);f.damage.validContact=()=>false;f.melee.step(.01,.01);expect(f.time.enemyFrozen).toBe(false);});
});
