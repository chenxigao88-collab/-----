import { afterEach, describe, expect, it } from 'vitest';
import { World } from '../src/world/World';
import { AudioManager } from '../src/feedback/AudioManager';
import { defaultDebug } from '../src/data/player';
import { emptyInput } from '../src/core/InputManager';
import { vec } from '../src/core/types';
const worlds: World[]=[];
const setup=(elite=false)=>{
 const w=new World(1,defaultDebug(),new AudioManager());worlds.push(w);w.settings.hitStrength=0;
 w.player.actor.pos=vec(480,340);const e=w.spawn('shooter',vec(515,340),-1,elite);
 const hit=(heavy=false,body=false)=>{const c=w.attacks.snapshot(w.player.actor,1,'test','swift',heavy);c.knockback=0;if(body)c.gunfu='body';w.damage.tryHit(c,e.actor,vec());return c;};
 return {w,e,hit};
};
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('enemy hitstun and combo interruption',()=>{
 it('direct hits cancel an active attack and release its attacker slot',()=>{
  const {w,e,hit}=setup();e.enter('Attack');w.attacks.requestEnemy(e);expect(w.melee.attacks).toHaveLength(1);
  hit();expect(e.state).toBe('Stunned');expect(e.holdsAttackSlot).toBe(false);expect(w.melee.attacks).toHaveLength(0);
  const pos={...e.actor.pos};w.brain.step(e,.1,[e]);expect(e.actor.pos).toEqual(pos);expect(e.actor.moving).toBe(false);
  expect(e.hitstunRemaining).toBeCloseTo(.06);w.brain.step(e,.07,[e]);w.brain.step(e,.01,[e]);expect(e.state).toBe('Move');
 });
 it('body hits refresh across the .26-second combo gap even during elemental protection',()=>{
  const {w,e,hit}=setup();e.actor.elemental.protectionTime=2;hit(false,true);
  w.brain.step(e,.26,[e]);expect(e.hitstunRemaining).toBeGreaterThan(0);hit(false,true);
  expect(e.hitstunRemaining).toBeCloseTo(.34);expect(e.actor.elemental.protectionTime).toBe(2);
 });
 it('heavy kicks and elite body hits preserve a useful combo window',()=>{
  const {e,hit}=setup(true);hit(false,true);expect(e.hitstunRemaining).toBeGreaterThan(.28);
  hit(true,true);expect(e.hitstunRemaining).toBeCloseTo(.405);
 });
 it('repeated shotgun pellets do not extend the same attack or accumulate durations',()=>{
  const {w,e,hit}=setup();const c=hit(true);w.brain.step(e,.05,[e]);const time=e.hitstunRemaining;
  w.damage.tryHit(c,e.actor,vec());expect(e.hitstunRemaining).toBe(time);
  hit();expect(e.hitstunRemaining).toBe(time);
 });
 it('secondary damage cannot refresh hitstun and blocked damage cannot interrupt',()=>{
  const {w,e,hit}=setup();hit();w.brain.step(e,.08,[e]);const time=e.hitstunRemaining;
  const c=w.attacks.snapshot(w.player.actor,1,'dot','swift',false);c.secondary=true;c.knockback=0;
  w.damage.tryHit(c,e.actor,vec());expect(e.hitstunRemaining).toBe(time);
  e.actor.invulnerability.grant('hurt',1);hit(true,true);expect(e.hitstunRemaining).toBe(time);
 });
 it('hitstun cancels the pending elite follow-up and lunge',()=>{
  const {w,e,hit}=setup(true);e.enter('Recover');e.attackIndex=0;e.lungeRemaining=.2;hit(false,true);
  expect(e.lungeRemaining).toBe(0);w.brain.step(e,.31,[e]);expect(w.melee.attacks).toHaveLength(0);
 });
 it('enemy time freeze and pause preserve the remaining hitstun',()=>{
  const {w,e,hit}=setup();hit();w.brain.step(e,0,[e]);expect(e.hitstunRemaining).toBe(.16);
  w.pause();w.step(.5,emptyInput());expect(e.hitstunRemaining).toBe(.16);
 });
 it('a real routine chains the first three body hits before the enemy can retaliate',()=>{
  const {w,e}=setup();w.settings.invincible=false;let bodyHits=0;
  w.events.on('damageApplied',event=>{if(event.targetId===e.actor.id&&event.attack.gunfu==='body')bodyHits++;});
  expect(w.gunfu.request(vec(560,318))).toBe(true);
  for(let n=0;n<95;n++){const input=emptyInput(),s=w.gunfu.snapshot(),a=w.player.actor.action;
    input.skill=[0,1,2].includes(s.phase)&&Boolean(a&&a.elapsed>=a.duration-.12)&&!s.queued;w.step(1/120,input);}
  expect(bodyHits).toBe(3);expect(w.player.actor.health.hp).toBe(100);expect(e.state).toBe('Stunned');
 });
});

