import {ATTACK_PACING} from '../src/data/attackPacing';
import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {vec} from '../src/core/types';
const worlds:World[]=[];
function make(){const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),true);worlds.push(w);w.state='playing';w.settings.hitStrength=0;w.settings.shakeStrength=0;w.adventure.currentId='core';w.player.actor.pos=vec(480,340);return w;}
function advance(w:World,seconds:number){for(let n=0;n<Math.round(seconds*120);n++)w.special.step(1/120);}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('Grey-Crown Knight encounter',()=>{
  it('uses the 65% and 30% phase thresholds with 150/180/210 poise',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));expect(b.actor.health.maxHP).toBe(12000);w.special.shave(b,12);b.actor.health.hp=7801;w.special.step(.01);expect(b.bossPhase).toBe(1);
    b.actor.health.hp=7800;w.special.step(.01);expect(b.bossPhase).toBe(2);expect(b.poiseMax).toBe(180);expect(b.poise).toBe(168);
    b.actor.health.hp=3600;w.special.step(.01);expect(b.bossPhase).toBe(3);expect(b.poiseMax).toBe(210);expect(b.poise).toBe(198);
  });
  it('finishes the announced attack count before adopting a new phase',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));b.enter('Move');b.attackCooldown=0;w.special.step(.01);expect(b.attackCount).toBe(1);
    b.actor.health.hp=6000;advance(w,1.7*ATTACK_PACING.enemy);expect(b.state).toBe('Recover');expect(b.attackIndex).toBe(0);expect(b.attackCount).toBe(1);
    advance(w,2*ATTACK_PACING.enemy);expect(b.bossMove).toBe('slam');expect(b.attackCount).toBe(1);
  });
  it('adds a second slash in phase two and three slashes in phase three',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));b.actor.health.hp=6000;b.enter('Move');b.attackCooldown=0;w.special.step(.01);
    expect(b.attackCount).toBe(2);advance(w,1.7*ATTACK_PACING.enemy);expect(b.state).toBe('Attack');expect(b.bossMove).toBe('return');expect(b.attackIndex).toBe(1);
    b.actor.health.hp=2400;b.enter('Move');b.bossTurns=2;b.attackCooldown=0;w.special.step(.01);expect(b.attackCount).toBe(3);
    advance(w,3.2*ATTACK_PACING.enemy);expect(b.state).toBe('Attack');expect(b.attackIndex).toBe(2);advance(w,.9*ATTACK_PACING.enemy);expect(b.state).toBe('Recover');
  });
  it('locks the direction for the announced lock lead of an attack',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));b.enter('Move');b.attackCooldown=0;w.special.step(.01);advance(w,.8*ATTACK_PACING.enemy);const angle=b.lockedAngle;
    w.player.actor.pos=vec(800,340);advance(w,.15*ATTACK_PACING.enemy);expect(b.lockedAngle).toBe(angle);advance(w,.1*ATTACK_PACING.enemy);
    expect(w.melee.attacks.find(a=>a.context.sourceId===b.actor.id)?.angle).toBe(angle);
  });
  it('starts the seven-second fire timer on phase two, freezes it with enemy time and summons only once',()=>{
    const w=make(),b=w.spawn('boss',vec(700,300));advance(w,8);b.actor.health.hp=6000;w.special.step(.01);
    expect(w.hazards.items).toHaveLength(0);expect(w.enemies.filter(e=>e.kind==='parasite')).toHaveLength(2);
    advance(w,6.9);w.special.step(0);expect(w.hazards.items).toHaveLength(0);advance(w,.11);
    expect(w.hazards.items).toHaveLength(1);expect(w.hazards.items[0].warning).toBe(.95);
    b.actor.health.hp=2400;w.special.step(.01);expect(w.enemies.filter(e=>e.kind==='parasite')).toHaveLength(2);
  });
  it('cancels a slam on poise break and gets up with the new phase poise',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));b.enter('Recover');b.lungeRemaining=.35;w.attacks.requestEnemy(b);
    w.special.shave(b,150);expect(b.lungeRemaining).toBe(0);expect(w.melee.attacks).toHaveLength(0);const pos={...b.actor.pos};
    b.actor.health.hp=6000;advance(w,2.4);expect(b.actor.pos).toEqual(pos);expect(b.poise).toBe(0);
    advance(w,.11);expect(b.poise).toBe(180);expect(b.attackCooldown).toBeGreaterThan(.9);
  });
  it('cannot act, summon or leave live attacks after dying in the same frame',()=>{
    const w=make(),b=w.spawn('boss',vec(550,340));w.attacks.requestEnemy(b);const attack=w.melee.attacks[0];w.attacks.fixture({});const projectile=w.projectiles.projectiles[0];
    w.damage.tryHit(w.attacks.snapshot(w.player.actor,1e6,'test','heavy',false),b.actor,vec());w.special.step(.01);
    expect(b.state).toBe('Dead');expect(w.enemies.filter(e=>e.kind==='parasite')).toHaveLength(0);
    expect(attack.alive).toBe(false);expect(projectile.alive).toBe(false);expect(w.hazards.items).toHaveLength(0);
    advance(w,1.1);expect(w.story.queue).toEqual(['boss-defeat']);advance(w,1);expect(w.story.queue).toEqual(['boss-defeat']);
  });
});
