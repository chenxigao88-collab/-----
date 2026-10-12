import { describe, expect, it, vi } from 'vitest';
import { Enemy, type EnemyAttackOptions } from '../src/actors/Enemy';
import { EnemyBrain } from '../src/actors/EnemyBrain';
import { Player } from '../src/actors/Player';
import { ENEMIES, ENEMY_PRESSURE } from '../src/data/enemies';
import { WAVES } from '../src/data/waves';
import { vec, type EnemyKind } from '../src/core/types';
import { World } from '../src/world/World';
import { AudioManager } from '../src/feedback/AudioManager';
import { defaultDebug } from '../src/data/player';

const setup = (kind: EnemyKind = 'chaser', elite = false) => {
  const player = new Player(1); player.actor.pos = vec(340, 300);
  const enemy = new Enemy(2, 1, kind, vec(300, 300), -1, elite);
  enemy.attackCooldown = 0; // These fixtures start already alert; spawn grace has its own test.
  const requestEnemy = vi.fn<(enemy: Enemy, options?: EnemyAttackOptions) => void>();
  const brain = new EnemyBrain(player, { requestEnemy });
  const peers = [enemy];
  const advance = (seconds: number) => {
    let remaining = seconds;
    while (remaining > 1e-9) { const dt = Math.min(1 / 120, remaining); brain.step(enemy, dt, peers); remaining -= dt; }
  };
  return { player, enemy, requestEnemy, brain, peers, advance };
};

describe('melee enemy attack patterns', () => {
  it('fresh spawns watch before attacking instead of swinging immediately',()=>{
    const {enemy,brain,peers,requestEnemy}=setup();enemy.attackCooldown=.5;enemy.enter('Move');
    brain.step(enemy,.2,peers);expect(enemy.state).toBe('Move');expect(requestEnemy).not.toHaveBeenCalled();
    expect(enemy.actor.pos.x).toBeLessThan(340);expect(enemy.attackCooldown).toBeCloseTo(.3);
  });
  it.each(['chaser','shooter','sniper'] as const)('%s has a real rest after attack recovery',kind=>{
    const {enemy,brain,peers,requestEnemy,player}=setup(kind);enemy.enter('Attack');brain.step(enemy,enemy.windup+.001,peers);
    brain.step(enemy,enemy.data.recover+.001,peers);player.actor.pos={...enemy.actor.pos,x:enemy.actor.pos.x+30};
    expect(enemy.state).toBe('Move');expect(enemy.attackCooldown).toBe(enemy.data.attackRest);
    brain.step(enemy,enemy.data.attackRest-.01,peers);expect(enemy.state).toBe('Move');expect(requestEnemy).toHaveBeenCalledTimes(1);
    player.actor.pos={...enemy.actor.pos,x:enemy.actor.pos.x+30};brain.step(enemy,.02,peers);expect(enemy.state).toBe('Attack');
  });
  it('an elite abandons its follow-up when the player retreats out of range',()=>{
    const {enemy,player,brain,peers,requestEnemy}=setup('shooter',true);enemy.enter('Attack');brain.step(enemy,enemy.windup+.001,peers);
    player.actor.pos=vec(600,300);brain.step(enemy,ENEMY_PRESSURE.eliteSecondGap+.01,peers);expect(enemy.state).toBe('Recover');
    brain.step(enemy,enemy.data.recover,peers);expect(enemy.state).toBe('Move');expect(requestEnemy).toHaveBeenCalledTimes(1);
  });
  it.each([30,60,144])('sustained nearby aggression stays bounded at %s Hz',fps=>{
    const {enemy,player,brain,peers,requestEnemy}=setup('chaser');
    for(let n=0;n<fps*10;n++){player.actor.pos=vec(enemy.actor.pos.x+30,enemy.actor.pos.y);brain.step(enemy,1/fps,peers);}
    expect(requestEnemy.mock.calls.length).toBeGreaterThanOrEqual(5);expect(requestEnemy.mock.calls.length).toBeLessThanOrEqual(6);
  });
  it('enemy time freeze preserves the attack rest timer',()=>{
    const {enemy,brain,peers}=setup();enemy.attackCooldown=.5;brain.step(enemy,0,peers);expect(enemy.attackCooldown).toBe(.5);
  });
  it('a mixed crowd cannot overlap attacks or refill the slot immediately after a swing',()=>{
    const {brain,peers,requestEnemy}=setup();peers.push(new Enemy(3,1,'shooter',vec(340,260)),new Enemy(4,1,'sniper',vec(340,340)));
    const firedAt:number[]=[];let previous=0;
    for(let n=0;n<1200;n++){
      for(const e of peers)brain.step(e,1/120,peers);
      expect(peers.filter(e=>e.holdsAttackSlot).length).toBeLessThanOrEqual(1);
      const count=requestEnemy.mock.calls.length;if(count>previous){firedAt.push(n/120);previous=count;}
    }
    expect(firedAt.length).toBeGreaterThan(3);expect(firedAt.length).toBeLessThanOrEqual(12);
    for(let n=1;n<firedAt.length;n++)expect(firedAt[n]-firedAt[n-1]).toBeGreaterThanOrEqual(.83);
  });
  it('keeps the three identities and uses close attacks without projectiles', () => {
    expect(Object.keys(ENEMIES)).toEqual(expect.arrayContaining(['chaser', 'shooter', 'sniper']));
    const originals=[ENEMIES.chaser,ENEMIES.shooter,ENEMIES.sniper];
    expect(originals.map(data => data.hp)).toEqual([64, 112, 52]);
    expect(originals.map(data => data.speed)).toEqual([140, 90, 160]);
    expect(Object.values(ENEMIES).every(data => data.projectileSpeed===0)).toBe(true);
    expect(Math.max(...originals.map(data => data.attackRange))).toBe(70);
    expect(WAVES.map(wave => wave.length)).toEqual([2, 4, 5]);
    expect(new Set(WAVES[1]).size).toBe(3);
  });

  it.each(['chaser', 'shooter', 'sniper'] as const)('%s emits its configured melee attack after windup', kind => {
    const { enemy, brain, requestEnemy, peers } = setup(kind);
    enemy.enter('Attack'); enemy.lockedAngle = 0;
    brain.step(enemy, enemy.data.windup - .001, peers); expect(requestEnemy).not.toHaveBeenCalled();
    brain.step(enemy, .002, peers);
    expect(requestEnemy).toHaveBeenCalledExactlyOnceWith(enemy, { angle: 0, arc: enemy.data.arc, range: enemy.data.attackRange, active: enemy.data.active });
    expect(enemy.state).toBe('Recover');
  });

  it.each(['chaser', 'shooter'] as const)('%s stops tracking during the announced lock lead', kind => {
    const { enemy, player, brain, peers, requestEnemy } = setup(kind);
    enemy.enter('Attack'); enemy.lockedAngle = 0;
    brain.step(enemy, enemy.windup - enemy.data.lockLead + .001, peers);
    player.actor.pos = vec(300, 340); brain.step(enemy, .02, peers); expect(enemy.lockedAngle).toBe(0);
    brain.step(enemy, enemy.data.lockLead, peers); expect(requestEnemy.mock.calls[0][1]?.angle).toBe(0);
  });

  it('the lunge locks before impact and covers 116 pixels without chasing', () => {
    const { enemy, player, brain, peers, requestEnemy, advance } = setup('sniper');
    player.actor.pos = vec(440, 300); enemy.enter('Attack'); enemy.lockedAngle = 0;
    brain.step(enemy, enemy.windup-enemy.data.lockLead+.001, peers); player.actor.pos = vec(300, 420);
    brain.step(enemy, enemy.data.lockLead, peers); expect(requestEnemy.mock.calls[0][1]?.angle).toBe(0);
    const start = { ...enemy.actor.pos }; advance(enemy.data.lunge!.duration);
    expect(enemy.actor.pos.x - start.x).toBeCloseTo(116, 6); expect(enemy.actor.pos.y).toBe(start.y);
    expect(enemy.lungeRemaining).toBeCloseTo(0, 6); expect(requestEnemy).toHaveBeenCalledTimes(1);
  });

  it('peer separation cannot bend a committed lunge', () => {
    const { enemy, player, brain, peers } = setup('sniper');
    player.actor.pos = vec(440, 300); enemy.enter('Attack'); brain.step(enemy, enemy.windup+.001, peers);
    const blocker = new Enemy(3, 1, 'chaser', vec(315, 305)); peers.push(blocker);
    brain.step(enemy, .1, peers);
    expect(enemy.actor.pos.y).toBe(300); expect(enemy.actor.pos.x).toBeCloseTo(300 + 116 / enemy.data.lunge!.duration * .1);
  });

  it('zero enemy time freezes every AI, motion and presentation field', () => {
    const { enemy, brain, peers, requestEnemy } = setup('sniper');
    enemy.enter('Recover'); enemy.elapsed = .1; enemy.lungeRemaining = .12;
    enemy.actor.previous = vec(200, 200); enemy.actor.moving = true;
    enemy.actor.knockback.apply(vec(90, 10)); enemy.actor.invulnerability.grant('test', .3);
    const before = { pos: { ...enemy.actor.pos }, previous: { ...enemy.actor.previous }, animation: enemy.actor.animation, elapsed: enemy.elapsed, lunge: enemy.lungeRemaining, moving: enemy.actor.moving, knockback: { ...enemy.actor.knockback.velocity } };
    brain.step(enemy, 0, peers);
    expect({ pos: enemy.actor.pos, previous: enemy.actor.previous, animation: enemy.actor.animation, elapsed: enemy.elapsed, lunge: enemy.lungeRemaining, moving: enemy.actor.moving, knockback: enemy.actor.knockback.velocity }).toEqual(before);
    expect(enemy.actor.invulnerability.has('test')).toBe(true); expect(requestEnemy).not.toHaveBeenCalled();
  });

  it('a rooted enemy can attack a player within reach', () => {
    const { enemy, brain, peers, requestEnemy } = setup('shooter');
    enemy.actor.elemental.control('root', .6); enemy.enter('Move'); const position = { ...enemy.actor.pos };
    brain.step(enemy, .01, peers); expect(enemy.state).toBe('Attack'); expect(enemy.actor.pos).toEqual(position);
    brain.step(enemy, enemy.windup+.001, peers); expect(requestEnemy).toHaveBeenCalledTimes(1);
  });

  it('root prevents approach and lunge displacement without canceling a close hit', () => {
    const { enemy, player, brain, peers, requestEnemy } = setup('sniper');
    player.actor.pos = vec(450, 300); enemy.actor.elemental.control('root', 1); enemy.enter('Move');
    brain.step(enemy, .01, peers); expect(enemy.state).toBe('Attack'); brain.step(enemy, enemy.windup+.001, peers);
    const position = { ...enemy.actor.pos }; brain.step(enemy, .22, peers);
    expect(enemy.actor.pos).toEqual(position); expect(requestEnemy).toHaveBeenCalledTimes(1);
  });

  it('soft slow changes approach speed but preserves windup duration', () => {
    const { enemy, player, brain, peers, requestEnemy } = setup('chaser');
    player.actor.pos = vec(600, 300); enemy.enter('Move'); enemy.actor.elemental.slow(.25, 4);
    brain.step(enemy, .1, peers); expect(enemy.actor.pos.x).toBeCloseTo(310.5);
    enemy.enter('Attack'); brain.step(enemy, enemy.windup-.001, peers); expect(requestEnemy).not.toHaveBeenCalled();
    brain.step(enemy, .002, peers); expect(requestEnemy).toHaveBeenCalledTimes(1);
  });

  it('stun prevents an unfired attack and resets a pending lunge', () => {
    const { enemy, brain, peers, requestEnemy } = setup('sniper');
    enemy.enter('Attack'); enemy.elapsed = .54; enemy.lungeRemaining = .22;
    enemy.actor.elemental.control('stun', .2); enemy.stun();
    brain.step(enemy, .1, peers); expect(enemy.elapsed).toBe(0); expect(enemy.lungeRemaining).toBe(0); expect(requestEnemy).not.toHaveBeenCalled();
    enemy.actor.elemental.step(.2); brain.step(enemy, .01, peers); expect(enemy.state).toBe('Move');
  });

  it('reserves one attack slot and makes the other enemies circle', () => {
    const { enemy, player, brain, peers } = setup();
    player.actor.pos = vec(340, 300); enemy.enter('Move');
    const other = new Enemy(3, 1, 'chaser', vec(340, 260)); other.attackCooldown=0;other.enter('Move');
    const third = new Enemy(4, 1, 'chaser', vec(340, 340)); third.attackCooldown=0;third.enter('Move'); peers.push(other, third);
    for (const e of peers) brain.step(e, .01, peers);
    expect(peers.filter(e => e.holdsAttackSlot)).toHaveLength(1);expect(other.state).toBe('Move'); expect(third.state).toBe('Move'); expect(third.actor.moving).toBe(true);
    expect(third.actor.pos.x).not.toBe(340);
  });

  it('counts live attack frames in recovery and frees the slot afterward', () => {
    const { enemy, brain, peers } = setup('chaser');
    enemy.enter('Attack'); brain.step(enemy, enemy.windup+.001, peers); expect(enemy.holdsAttackSlot).toBe(true);
    brain.step(enemy, enemy.data.active+.001, peers); expect(enemy.holdsAttackSlot).toBe(true);
    brain.step(enemy,.3,peers);expect(enemy.holdsAttackSlot).toBe(false); expect(enemy.state).toBe('Recover');
  });

  it('dead enemies never reserve an attack slot', () => {
    const { enemy } = setup(); enemy.enter('Attack'); enemy.actor.health.hp = 0; expect(enemy.holdsAttackSlot).toBe(false);
  });

  it('reinforced furnace performs two separately aimed and telegraphed slams', () => {
    const { enemy, player, brain, peers, requestEnemy } = setup('shooter', true);
    expect(enemy.actor.health.maxHP).toBe(240); enemy.enter('Attack'); enemy.lockedAngle = 0;
    brain.step(enemy, enemy.windup+.001, peers); expect(requestEnemy).toHaveBeenCalledTimes(1); expect(enemy.holdsAttackSlot).toBe(true);
    player.actor.pos = vec(300, 340); brain.step(enemy, .2, peers);expect(enemy.state).toBe('Recover');brain.step(enemy,ENEMY_PRESSURE.eliteSecondGap-.2+.001,peers);
    expect(enemy.state).toBe('Attack'); expect(enemy.attackIndex).toBe(1); expect(enemy.windup).toBe(ENEMY_PRESSURE.eliteSecondWindup); expect(enemy.lockedAngle).toBeCloseTo(Math.PI / 2);
    brain.step(enemy, enemy.windup-enemy.data.lockLead+.001, peers); player.actor.pos = vec(260, 300); brain.step(enemy, enemy.data.lockLead, peers);
    expect(requestEnemy).toHaveBeenCalledTimes(2); expect(requestEnemy.mock.calls[1][1]?.angle).toBeCloseTo(Math.PI / 2);
    brain.step(enemy, enemy.data.recover+.001, peers); expect(enemy.state).toBe('Move'); expect(enemy.attackIndex).toBe(0);
  });

  it('stun between elite slams cancels only the future slam', () => {
    const { enemy, brain, peers, requestEnemy } = setup('shooter', true);
    enemy.enter('Attack'); brain.step(enemy, enemy.windup+.001, peers); expect(requestEnemy).toHaveBeenCalledTimes(1);
    enemy.actor.elemental.control('stun', .2); enemy.stun(); brain.step(enemy, .3, peers);
    expect(requestEnemy).toHaveBeenCalledTimes(1); expect(enemy.attackIndex).toBe(0); expect(enemy.state).toBe('Stunned');
  });

  it('an ordinary furnace never schedules the reinforced second slam', () => {
    const { enemy, brain, peers, requestEnemy } = setup('shooter'); enemy.enter('Attack');
    brain.step(enemy, enemy.windup+.001, peers); brain.step(enemy, .2, peers); expect(enemy.state).toBe('Recover'); expect(enemy.attackCount).toBe(1);
    brain.step(enemy, enemy.data.recover-.2+.01, peers); expect(enemy.state).toBe('Move'); expect(requestEnemy).toHaveBeenCalledTimes(1);
  });

  it.each(['chaser', 'shooter', 'sniper'] as const)('%s uses real melee hitboxes and never produces a hostile projectile', kind => {
    const world = new World(1, defaultDebug(), new AudioManager()); world.settings.hitStrength = 0;
    try {
      world.player.actor.pos = vec(340, 300); const enemy = world.spawn(kind, vec(300, 300));
      enemy.enter('Attack'); enemy.lockedAngle = 0; world.brain.step(enemy, enemy.windup + .001, world.enemies);
      expect(world.projectiles.projectiles).toHaveLength(0); expect(world.melee.attacks).toHaveLength(1);
      for (let n = 0; n < Math.ceil(enemy.data.active * 120); n++) world.melee.step(1 / 120, 1 / 120);
      expect(world.player.actor.health.hp).toBe(100 - enemy.data.damage);
    } finally { world.dispose(); }
  });

  it('a committed lunge can actually hit the end of its announced approach', () => {
    const world = new World(1, defaultDebug(), new AudioManager()); world.settings.hitStrength = 0;
    try {
      world.player.actor.pos = vec(450, 300); const enemy = world.spawn('sniper', vec(300, 300));
      enemy.enter('Attack'); enemy.lockedAngle = 0; world.brain.step(enemy, enemy.windup+.001, world.enemies);
      for (let n = 0; n < Math.ceil(enemy.data.lunge!.duration*120)+1; n++) { world.brain.step(enemy, 1 / 120, world.enemies); world.melee.step(1 / 120, 1 / 120); }
      expect(enemy.actor.pos.x).toBeCloseTo(416, 6); expect(world.player.actor.health.hp).toBe(90);
    } finally { world.dispose(); }
  });
});
