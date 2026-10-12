import {ATTACK_PACING} from '../src/data/attackPacing';
const attackTime=(seconds:number)=>seconds*ATTACK_PACING.player;
import { afterEach, describe, expect, it } from 'vitest';
import { World } from '../src/world/World';
import { defaultDebug } from '../src/data/player';
import { AudioManager } from '../src/feedback/AudioManager';
import { emptyInput } from '../src/core/InputManager';
import { vec, angleTo } from '../src/core/types';
import { SpriteAnimator } from '../src/rendering/SpriteAnimator';
import { GUNFU_BEATS, GUNFU_DURATION } from '../src/data/gunfu';

const worlds: World[] = [];
const aims=new WeakMap<World,ReturnType<typeof vec>>();
const make = () => {
  const w = new World(1, defaultDebug(), new AudioManager());
  w.settings.hitStrength = 0; w.player.stats.criticalChance = 0;
  worlds.push(w); return w;
};
afterEach(() => { worlds.forEach(w => w.dispose()); worlds.length = 0; });
const dummy = (w: World, x = 520) => w.spawn('shooter', vec(x, 340), -1, true);
const tick = (w: World, seconds: number, dt = 1 / 120) => {
  for (let n = 0; n < Math.ceil(seconds / dt); n++) {
    const s=w.gunfu.snapshot(),a=w.player.actor.action;
    if([0,1,2,5].includes(s.phase)&&a&&a.elapsed>=a.duration-.12&&!s.queued)w.gunfu.request(aims.get(w)??vec(560,318));
    w.weapons.step(dt); w.gunfu.step(dt, w.settings);
    w.elements.step(dt, 0); w.abilities.step(dt); w.projectiles.step(dt, 0); w.melee.step(dt, 0);
  }
};
const start = (w: World, target = vec(560, 318)) => {aims.set(w,target);expect(w.gunfu.request(target)).toBe(true);};

const withoutPresses=(w:World,seconds:number)=>{for(let n=0;n<Math.ceil(seconds*120);n++){w.weapons.step(1/120);w.gunfu.step(1/120,w.settings);}};
describe('manual combo presses',()=>{
  it('both shots select the nearest enemy despite a mouse pointing away',()=>{
    const w=make(),near=dummy(w,600),far=dummy(w,800),hits:number[]=[];
    w.events.on('damageApplied',e=>{if(e.attack.gunfu==='finisher'&&!e.attack.secondary)hits.push(e.targetId);});
    start(w,vec(240,200));tick(w,attackTime(2.4));expect(hits.length).toBeGreaterThan(1);expect(new Set(hits)).toEqual(new Set([near.actor.id]));expect(far.actor.health.hp).toBe(240);
  });
  it('the second shot retargets after the first kills its nearest target',()=>{
    const w=make(),near=dummy(w,600),other=dummy(w,700);near.actor.health.hp=1;
    start(w,vec(240,200));tick(w,attackTime(1.6));expect(near.actor.health.alive).toBe(false);expect(other.actor.health.hp).toBe(240);
    tick(w,attackTime(.8));expect(other.actor.health.hp).toBeLessThan(240);expect(w.attacks.shots).toBe(2);
  });
  it('nearest selection is recalculated at the second shot after enemies move',()=>{
    const w=make(),near=dummy(w,600),other=dummy(w,800);start(w,vec(240,200));tick(w,attackTime(1.6));
    const hp=near.actor.health.hp;other.actor.pos=vec(480,400);tick(w,attackTime(.8));
    expect(near.actor.health.hp).toBe(hp);expect(other.actor.health.hp).toBeLessThan(240);
  });
  it('auto-aim does not let scatter pellets exceed their native range',()=>{
    const w=make(),e=dummy(w,850),hits:string[]=[];
    w.events.on('damageApplied',hit=>{if(hit.targetId===e.actor.id&&hit.attack.gunfu==='finisher')hits.push(hit.attack.gunfuShot!);});
    start(w,vec(240,200));tick(w,attackTime(3));expect(hits).toEqual(['air']);expect(w.attacks.shots).toBe(2);
  });
  it('auto-aim cannot apply damage when the projectile pool is full',()=>{
    const w=make(),e=dummy(w,600);w.projectiles.canAdd=()=>false;start(w,vec(240,200));tick(w,attackTime(2.4));
    expect(w.attacks.shots).toBe(0);expect(e.actor.health.hp).toBe(240);expect(w.projectiles.projectiles).toHaveLength(0);
  });
  it.each(['ember_lantern','thunder_branch'])('an enhanced %s waits for native collision or strike delay instead of adding an instant hit',id=>{
    const w=make(),e=dummy(w,700),hits:number[]=[];w.debugWeapon(1,id);w.resonance.meter=100;
    w.events.on('damageApplied',hit=>{if(hit.attack.gunfuShot==='ground'&&!hit.attack.secondary)hits.push(hit.amount);});start(w,vec(240,200));tick(w,attackTime(2.05));
    const hp=e.actor.health.hp;expect(w.resonance.activations).toBe(1);expect(hp).toBeLessThan(240);
    expect(hits).toHaveLength(0);if(id==='ember_lantern'){expect(w.abilities.areas).toHaveLength(0);expect(w.projectiles.projectiles.some(p=>p.charged===1&&p.style==='fireball')).toBe(true);}else expect(w.abilities.areas).toHaveLength(1);
    tick(w,attackTime(.5));expect(e.actor.health.hp).toBeLessThan(hp);expect(hits).toHaveLength(1);
  });
  it('one press only chops; waiting allows free movement and never fires',()=>{
    const w=make();start(w);withoutPresses(w,attackTime(.3));
    expect(w.gunfu.snapshot().awaiting).toBe(true);expect(w.gunfu.snapshot().stage).toBe('uppercut');
    expect(w.player.actor.action).toBeUndefined();expect(w.gunfu.movementScale).toBe(1);expect(w.attacks.shots).toBe(0);
    withoutPresses(w,attackTime(.5));expect(w.gunfu.busy).toBe(false);expect(w.weapons.active).toBe(0);
  });
  it('each press advances exactly one segment and expiry restarts at the chop',()=>{
    const w=make();start(w);withoutPresses(w,attackTime(.28));expect(w.gunfu.request(vec(560,318))).toBe(true);
    withoutPresses(w,attackTime(.26));expect(w.gunfu.snapshot().awaiting).toBe(true);expect(w.gunfu.snapshot().stage).toBe('sweep');
    withoutPresses(w,attackTime(.8));expect(w.gunfu.request(vec(560,318))).toBe(true);expect(w.player.actor.action?.kind).toBe('downslash');
  });
  it('only one following press can be buffered',()=>{
    const w=make();start(w);expect(w.gunfu.request(vec(560,318))).toBe(false);withoutPresses(w,attackTime(.18));
    expect(w.gunfu.request(vec(560,318))).toBe(true);expect(w.gunfu.request(vec(560,318))).toBe(false);
    withoutPresses(w,attackTime(.36));expect(w.gunfu.snapshot().awaiting).toBe(true);expect(w.gunfu.snapshot().stage).toBe('sweep');expect(w.attacks.shots).toBe(0);
  });
  it('stopping after the fourth press lands without the second shot or weapon switch',()=>{
    const w=make();start(w);withoutPresses(w,attackTime(.27));w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.25));
    w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.29));w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.94));
    expect(w.attacks.shots).toBe(1);expect(w.gunfu.snapshot().awaiting).toBe(true);expect(w.player.actor.action).toBeUndefined();
    expect(w.weapons.active).toBe(0);withoutPresses(w,attackTime(.5));expect(w.gunfu.busy).toBe(false);expect(w.attacks.shots).toBe(1);
  });
  it('the fifth press starts the grounded spin without a second jump',()=>{
    const w=make();start(w);withoutPresses(w,attackTime(.27));w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.25));
    w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.29));w.gunfu.request(vec(560,318));withoutPresses(w,attackTime(.94));
    expect(w.gunfu.request(vec(560,318))).toBe(true);expect(w.player.actor.action?.kind).toBe('landspin');expect(w.player.actor.action?.lift).toBe(0);
    withoutPresses(w,attackTime(.7));expect(w.attacks.shots).toBe(2);expect(w.weapons.active).toBe(1);expect(w.gunfu.busy).toBe(false);
  });
});

describe('complete six-form gun-fu routine', () => {
  it('five explicit presses perform every beat in order, including an empty-room backflip', () => {
    const w = make(); start(w);
    const stages: string[] = [];
    for (let n = 0; n < Math.ceil(GUNFU_DURATION*120)+12; n++) {
      const stage = w.gunfu.snapshot().stage;
      if (stages.at(-1) !== stage) stages.push(stage);
      tick(w, 1 / 120);
    }
    expect(stages).toEqual([...GUNFU_BEATS.map(b => b.pose), 'ready']);
    expect(w.attacks.shots).toBe(2); expect(w.weapons.active).toBe(1);
    expect(w.gunfu.busy).toBe(false); expect(w.player.actor.action).toBeUndefined();
  });
  it('fires only once in the air and once after landing', () => {
    const w = make(); start(w);
    tick(w, attackTime(1.40)); expect(w.attacks.shots).toBe(0);
    expect(w.player.actor.action?.kind).toBe('airshot'); expect(w.player.actor.action?.airborne).toBe(true);
    tick(w, attackTime(.10)); expect(w.attacks.shots).toBe(1); expect(w.weapons.active).toBe(0);
    tick(w, attackTime(.45)); expect(w.attacks.shots).toBe(1);
    expect(w.player.actor.action?.kind).toBe('groundshot'); expect(w.player.actor.action?.airborne).toBe(false);
    tick(w, attackTime(.10)); expect(w.attacks.shots).toBe(2); expect(w.weapons.active).toBe(1);
    tick(w, attackTime(.50)); expect(w.attacks.shots).toBe(2);
  });
  it('gives the chop, uppercut, sweep and kick separate physical contact moments', () => {
    const w = make(), e = dummy(w);
    const contacts: { phase: string; damage: number }[] = [];
    w.events.on('damageApplied', event => {
      if (event.attack.gunfu === 'body') contacts.push({ phase: w.gunfu.snapshot().stage, damage: event.amount });
    });
    start(w, e.actor.hurtbox.center(e.actor.pos)); tick(w, attackTime(1.05));
    expect(contacts).toEqual([{ phase: 'downslash', damage: 8 }, { phase: 'uppercut', damage: 10 }, { phase: 'sweep', damage: 12 }, { phase: 'kick', damage: 18 }]);
    expect(e.actor.elemental.mark).toBeUndefined();
    expect(w.resonance.meter).toBe(0); expect(w.attacks.shots).toBe(0);
  });
  it('sweeps several targets but never repeats one beat on a target', () => {
    const w = make(), a = dummy(w), b = dummy(w);
    b.actor.pos.y += 12; const hits = new Map<number, number>();
    w.events.on('damageApplied', e => { if (e.attack.gunfu === 'body' && w.gunfu.snapshot().stage === 'sweep') hits.set(e.targetId, (hits.get(e.targetId) ?? 0) + 1); });
    start(w); tick(w, attackTime(1.03));
    expect(hits.get(a.actor.id)).toBe(1); expect(hits.get(b.actor.id)).toBe(1);
  });
  it('missed physical strikes still let both gunshots automatically hit the nearest enemy', () => {
    const w = make(), e = dummy(w, 600);
    start(w, vec(240, 340)); tick(w, GUNFU_DURATION + .05);
    expect(e.actor.health.hp).toBeLessThan(240); expect(w.attacks.shots).toBe(2);
    expect(w.weapons.active).toBe(1); expect(w.gunfu.completed).toBe(1); expect(w.resonance.meter).toBe(20);
  });
  it('two landed shots and all shotgun pellets share one style reward and completion', () => {
    const w = make(), e = dummy(w);
    start(w, e.actor.hurtbox.center(e.actor.pos)); tick(w, GUNFU_DURATION + .15);
    expect(w.attacks.shots).toBe(2); expect(w.gunfu.completed).toBe(1); expect(w.resonance.meter).toBe(20);
    expect(w.elements.counts.shock).toBe(1);
  });
  it('preserves weapon cooldowns when the final shot automatically draws the second gun', () => {
    const w = make(); w.weapons.slots[1].cooldown = 5; w.weapons.slots[0].skillCooldown = 5;
    start(w); tick(w, GUNFU_DURATION + .05);
    const remaining=5-Math.ceil((GUNFU_DURATION+.05)*120)/120;
    expect(w.weapons.active).toBe(1); expect(w.weapons.current.cooldown).toBeCloseTo(remaining);
    expect(w.weapons.slots[0].skillCooldown).toBeCloseTo(remaining);
  });
  it('blocks repeated right clicks throughout the routine and its final recovery', () => {
    const w = make(); start(w); tick(w, attackTime(.8)); expect(w.gunfu.request(vec(520, 318))).toBe(false);
    tick(w, attackTime(1.6)); expect(w.gunfu.busy).toBe(false); expect(w.gunfu.request(vec(520, 318))).toBe(false);
    tick(w, attackTime(.5)); expect(w.gunfu.request(vec(520, 318))).toBe(true);
  });
  it('full style enhances only the ground shot and consumes once', () => {
    const w = make(), e = dummy(w); w.resonance.meter = 100;
    start(w, e.actor.hurtbox.center(e.actor.pos)); tick(w, attackTime(1.6));
    expect(w.resonance.activations).toBe(0); expect(w.weapons.active).toBe(0);
    tick(w, attackTime(.8)); expect(w.resonance.activations).toBe(1);
    expect(w.weapons.current.skillCooldown).toBeGreaterThan(4.5); expect(w.resonance.meter).toBe(0);
  });
  it('keeps full style when the receiving skill is unavailable', () => {
    const w = make(); w.resonance.meter = 100; w.weapons.slots[1].skillCooldown = 10;
    start(w); tick(w, GUNFU_DURATION + .05); expect(w.resonance.activations).toBe(0); expect(w.resonance.meter).toBe(100);
  });
  it('shooting alone neither automatically switches nor earns style', () => {
    const w = make(), e = dummy(w); w.attacks.requestPlayer(false, w.settings, e.actor.hurtbox.center(e.actor.pos)); w.projectiles.step(.2, 0);
    expect(w.weapons.active).toBe(0); expect(w.resonance.meter).toBe(0);
  });
  it('blade loadouts perform a real wind melee attack instead of substituting a sidearm', () => {
    const w = make(); w.debugWeapon(0, 'hush_edge');
    const launched: string[] = []; w.events.on('damageApplied', e => { if (e.attack.gunfu === 'finisher') launched.push(e.attack.element); });
    const e = dummy(w); start(w, e.actor.hurtbox.center(e.actor.pos)); tick(w, attackTime(1.7));
    expect(w.attacks.shots).toBe(1); expect(launched).toContain('wind');
    expect(w.melee.attacks.some(a=>a.context.weaponId==='hush_edge')).toBe(true);expect(w.projectiles.projectiles).toHaveLength(0);
  });
  it('short dash cancels the sequence and prevents delayed shots', () => {
    const w = make(); start(w); tick(w, attackTime(.9)); w.gunfu.dashStarted(); tick(w, attackTime(2));
    expect(w.attacks.shots).toBe(0); expect(w.weapons.active).toBe(0); expect(w.gunfu.busy).toBe(false);
    expect(w.player.actor.action).toBeUndefined();
  });
  it('being hit interrupts the ground sequence', () => {
    const w = make(), e = dummy(w); start(w); tick(w, attackTime(.5));
    const context = w.attacks.snapshot(e.actor, 9, 'enemy', 'heavy', false);
    expect(w.damage.tryHit(context, w.player.actor, vec()).applied).toBe(true);
    tick(w, attackTime(2)); expect(w.gunfu.busy).toBe(false); expect(w.attacks.shots).toBe(0);
  });
  it('airborne motion avoids ground attacks without awarding perfect dodge or freeze', () => {
    const w = make(), e = dummy(w); start(w); tick(w, attackTime(1.25));
    const c = w.attacks.snapshot(e.actor, 9, 'enemy', 'heavy', false);
    expect(w.player.actor.action?.airborne).toBe(true);
    expect(w.damage.tryHit(c, w.player.actor, vec(), 1, undefined, true).blockedBy).toBe('invulnerable');
    expect(w.damage.perfectDodges).toBe(0); expect(w.time.enemyFrozen).toBe(false); expect(w.resonance.meter).toBe(0);
    tick(w, attackTime(.5)); expect(w.player.actor.action?.airborne).toBe(false);
    expect(w.damage.tryHit(c, w.player.actor, vec()).applied).toBe(true);
  });
  it.each([30, 60, 144])('a %s Hz routine performs the same contacts, shots and 32px flip retreat', fps => {
    const w = make(), e = dummy(w); const contacts: string[] = [];
    w.events.on('damageApplied', e => { if (e.attack.gunfu === 'body') contacts.push(w.gunfu.snapshot().stage); });
    start(w, e.actor.hurtbox.center(e.actor.pos)); tick(w, GUNFU_DURATION + .1, 1 / fps);
    expect(contacts).toEqual(['downslash', 'uppercut', 'sweep', 'kick']);
    expect(w.attacks.shots).toBe(2); expect(Math.hypot(w.player.actor.pos.x-480,w.player.actor.pos.y-340)).toBeCloseTo(32,8);
    expect(w.gunfu.busy).toBe(false);
  });
  it('an air shot falls back to the live mouse when the room has no enemy', () => {
    const w = make(); start(w, vec(600, 318)); tick(w, attackTime(1.4));
    w.gunfu.step(.1, w.settings, vec(250, 250));
    expect(w.player.actor.aim).toBeLessThan(-2); expect(w.attacks.shots).toBe(1);
  });
  it('capacity failure does not switch guns, consume style or generate delayed shots', () => {
    const w = make(); w.resonance.meter = 100; w.projectiles.canAdd = () => false;
    start(w); tick(w, GUNFU_DURATION + .1); expect(w.attacks.shots).toBe(0);
    expect(w.weapons.active).toBe(0); expect(w.resonance.meter).toBe(100); expect(w.resonance.activations).toBe(0);
  });
  it('perfect dodge opens the same complete routine as a counter entry', () => {
    const w = make(), e = dummy(w); w.gunfu.perfect();
    expect(w.resonance.meter).toBe(20); start(w, e.actor.hurtbox.center(e.actor.pos));
    expect(w.gunfu.kind).toBe('counter'); expect(w.player.actor.action?.kind).toBe('downslash');
    tick(w, GUNFU_DURATION + .1); expect(w.resonance.meter).toBe(40); expect(w.gunfu.lastName).toBe('破绽枪舞');
  });
  it('blade recovery still prevents starting a routine early', () => {
    const w = make(); w.debugWeapon(0, 'hush_edge'); w.attacks.requestPlayer(false, w.settings);
    expect(w.gunfu.request(vec(520, 340))).toBe(false);
  });
  it('pause keeps the phase, air height, shots and windows unchanged', () => {
    const w = make(); start(w); tick(w, attackTime(1.3)); const pose = { ...w.player.actor.action! };
    w.pause(); for (let n = 0; n < 100; n++) w.step(1 / 120, emptyInput());
    expect(w.player.actor.action).toEqual(pose); expect(w.attacks.shots).toBe(0);
  });
  it('death, debug replacement and disposal clear every routine state', () => {
    const w = make(); start(w); tick(w, attackTime(1.3)); w.debugWeapon(0, 'frost_string');
    expect(w.gunfu.busy).toBe(false); expect(w.gunfu.window).toBe(0); expect(w.player.actor.action).toBeUndefined();
    w.dispose(); expect(w.gunfu.effects).toHaveLength(0);
  });
  it.each(['frost_string', 'thunder_branch'])('%s still hits a target inside the barrel', id => {
    const w = make(); w.debugWeapon(0, id); const e = w.spawn('sniper', vec(500, 340));
    w.player.actor.aim = angleTo(w.player.actor.pos, e.actor.hurtbox.center(e.actor.pos));
    w.attacks.requestPlayer(false, w.settings); w.projectiles.step(.2, .2);
    expect(e.actor.health.hp).toBeLessThan(e.actor.health.maxHP);
  });
});

describe('routine motion frames', () => {
  it.each(GUNFU_BEATS.filter(b => b.pose !== 'recover').map(b => b.pose))('%s has four dedicated directional frames', pose => {
    const a = new SpriteAnimator();
    for (const [name, angle] of [['right', 0], ['down', Math.PI / 2], ['left', Math.PI], ['up', -Math.PI / 2]] as const)
      expect([.1, .3, .55, .8].map(p => a.combat(pose, angle, p, 1))).toEqual([0, 1, 2, 3].map(i => `routine_${pose}_${name}_${i}`));
  });
  it('final recovery uses the settled guard pose', () => {
    expect(new SpriteAnimator().combat('recover', 0, .1, .16)).toBe('routine_groundshot_right_3');
  });
});
