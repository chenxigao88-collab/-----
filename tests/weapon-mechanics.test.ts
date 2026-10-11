import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {vec} from '../src/core/types';
import {WEAPONS,getWeapon} from '../src/data/weapons';
import {shotProfile} from '../src/data/weaponMechanics';
import {CHAPTER_ROOMS} from '../src/data/adventure';
import {ENEMIES} from '../src/data/enemies';
import {depthScale} from '../src/data/chapter';
const worlds:World[]=[];
function make(id='earth_crossbow_mid',adventure=false){const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),adventure);worlds.push(w);w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.stats.criticalChance=0;w.debugWeapon(0,id);return w;}
function target(w:World,x=600,y=340){const e=w.spawn('shooter',vec(x,y));e.actor.health.hp=e.actor.health.maxHP=10000;return e;}
function hold(w:World,time:number,fire=true){for(let i=0;i<Math.ceil(time*120);i++)w.attacks.primary(1/120,fire,w.settings,vec(800,322));}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('distinct weapon mechanics',()=>{
  it('heavy bolt charge changes damage, while crystal charge changes count and fire charge changes radius',()=>{
    const bolt=getWeapon('earth_crossbow_mid'),ice=getWeapon('frost_string'),fire=getWeapon('ember_lantern');
    expect(shotProfile(bolt,1).damage).toBe(2.2);expect(shotProfile(bolt,1).count).toBe(1);
    expect(shotProfile(ice,0).count).toBe(1);expect(shotProfile(ice,.5).count).toBe(3);expect(shotProfile(ice,1).count).toBe(5);expect(shotProfile(ice,1).damage).toBe(1);
    expect(shotProfile(fire,1).explosionRadius).toBe(96);expect(shotProfile(fire).explosionRadius).toBe(36);expect(shotProfile(fire,1).damage).toBe(1);
  });
  it.each(WEAPONS.filter(w=>w.mechanic?.mode==='charge').map(w=>w.id))('%s releases at full charge without extra input and right-click gets the identical full payload',id=>{
    const w=make(id),gun=getWeapon(id);hold(w,gun.mechanic!.chargeTime!+.001);expect(w.attacks.shots).toBe(1);const normal=w.projectiles.projectiles;
    expect(normal).toHaveLength(shotProfile(gun,1).count);expect(normal[0].charged).toBe(1);
    const normalDamage=normal[0].context.damage;const radius=normal[0].explosionRadius;w.projectiles.clear();
    expect(w.attacks.requestPlayer(false,w.settings,vec(800,322),{multiplier:.8,sequence:1,shot:'air'})).toBe(true);
    expect(w.projectiles.projectiles).toHaveLength(normal.length);expect(w.projectiles.projectiles[0].charged).toBe(1);
    expect(w.projectiles.projectiles[0].context.damage).toBeCloseTo(normalDamage*.8);expect(w.projectiles.projectiles[0].explosionRadius).toBe(radius);
  });
  it('releasing early fires a partial bolt; idle release cannot create free shots',()=>{
    const w=make();hold(w,.25);expect(w.attacks.shots).toBe(0);hold(w,1/120,false);expect(w.attacks.shots).toBe(1);const p=w.projectiles.projectiles[0];expect(p.context.damage).toBeGreaterThan(83);expect(p.context.damage).toBeLessThan(83*2.2);hold(w,.1,false);expect(w.attacks.shots).toBe(1);
  });
  it.each(['swap','dash','pause','hurt','transition'] as const)('%s cancels charge without releasing a shot or resetting Q cooldown',action=>{
    const w=make();w.state='playing';w.weapons.manualSwitchCooldown=2;const frame=emptyInput();frame.fire=true;for(let i=0;i<20;i++)w.step(1/120,frame);expect(w.attacks.charging).toBe(true);
    if(action==='swap'){w.weapons.manualSwitchCooldown=0;w.step(1/120,{...emptyInput(),swap:true});expect(w.weapons.manualSwitchCooldown).toBe(3);}
    if(action==='dash')w.step(1/120,{...emptyInput(),dash:true});
    if(action==='pause'){w.pause();w.resume();}
    if(action==='hurt'){const e=target(w);w.damage.tryHit(w.attacks.snapshot(e.actor,2,'test','heavy',false),w.player.actor,vec());}
    if(action==='transition')w.prepareRoomTransition();
    expect(w.attacks.charging).toBe(false);w.step(1/120,emptyInput());expect(w.attacks.shots).toBe(0);
  });
  it.each(['ember','violet'] as const)('%s actual right-click routine releases charged weapons at full without waiting for left-click',character=>{
    const w=make('frost_string');w.selectCharacter(character);w.debugWeapon(1,'earth_crossbow_mid');w.state='playing';w.settings.invincible=true;target(w,535);let full=0;
    w.events.on('damageApplied',e=>{if(e.attack.gunfu==='finisher'&&!e.attack.secondary){expect(e.attack.chargeLevel).toBe(1);full++;}});
    w.step(1/120,{...emptyInput(),skill:true});for(let i=0;i<420;i++){const a=w.player.actor.action,s=w.gunfu.snapshot();w.step(1/120,{...emptyInput(),skill:s.awaiting||Boolean(a&&a.elapsed>=a.duration-.1&&!s.queued)});}
    expect(full).toBeGreaterThanOrEqual(2);expect(w.gunfu.completed).toBe(1);expect(w.weapons.active).toBe(1);
  });
  it('full fire blast hits a nearby enemy outside tap radius, stops at cover, and never detonates twice',()=>{
    for(const charge of [0,1]){const w=make('ember_lantern'),a=target(w,590),b=target(w,650,382);const hits:number[]=[];w.events.on('damageApplied',e=>{if(e.targetId===b.actor.id&&e.attack.secondary)hits.push(e.amount);});
      w.attacks.requestPlayer(false,w.settings,a.actor.hurtbox.center(a.actor.pos),undefined,charge);for(let i=0;i<120;i++)w.projectiles.step(1/120,0);
      expect(hits.length).toBe(charge===1?1:0);expect(w.feel.rings).toHaveLength(1);
    }
    const w=make('ember_lantern'),e=target(w,700);w.projectiles.obstacleContact=()=>({t:.1,normal:vec(-1,0)});w.attacks.requestPlayer(false,w.settings,vec(800,322),undefined,1);w.projectiles.step(.1,0);expect(e.actor.health.hp).toBe(10000);expect(w.projectiles.projectiles).toHaveLength(0);expect(w.feel.rings).toHaveLength(1);
  });
  it('late fire explosion creates a bounded fire patch and one delayed second explosion',()=>{
    const w=make('ember_lantern_late'),e=target(w,570);w.attacks.requestPlayer(false,w.settings,e.actor.hurtbox.center(e.actor.pos),undefined,1);w.projectiles.step(.2,0);expect(w.abilities.areas).toHaveLength(2);const hp=e.actor.health.hp;w.abilities.step(1.49);const before=e.actor.health.hp;expect(before).toBeLessThan(hp);w.abilities.step(.02);expect(e.actor.health.hp).toBeLessThan(before);w.abilities.step(2);expect(w.abilities.areas).toHaveLength(0);
  });
  it('three-round burst has three real release times and late triple-hit triggers only one follow-up',()=>{
    const w=make('wind_burst_late'),e=target(w,590);let launches=0;const hits:number[]=[];w.events.on('damageApplied',hit=>{if(hit.targetId===e.actor.id)hits.push(hit.amount);});w.projectiles.launched=()=>launches++;w.attacks.requestPlayer(false,w.settings,e.actor.hurtbox.center(e.actor.pos));
    expect(w.projectiles.projectiles.map(p=>p.delay)).toEqual([0,.065,.13]);w.projectiles.step(.04,0);expect(launches).toBe(0);w.projectiles.step(.03,0);expect(launches).toBe(1);w.projectiles.step(.07,0);expect(launches).toBe(2);
    for(let i=0;i<90;i++)w.projectiles.step(1/120,0);expect(hits.filter(h=>h===17)).toHaveLength(2);expect(hits.filter(h=>h===29)).toHaveLength(1);expect(hits.filter(h=>h===22)).toHaveLength(1);
  });
  it('dash cancels delayed burst rounds, and continuous electric fire stops briefly when overheated',()=>{
    const w=make('wind_burst_mid');w.attacks.requestPlayer(false,w.settings);w.state='playing';w.step(1/120,{...emptyInput(),dash:true});expect(w.projectiles.projectiles.every(p=>p.delay===0)).toBe(true);
    const electric=make('thunder_branch');let maxHeat=0;for(let i=0;i<240;i++){electric.weapons.step(1/120);electric.attacks.primary(1/120,true,electric.settings,vec(800,322));maxHeat=Math.max(maxHeat,electric.attacks.overheated[0]);electric.projectiles.step(1/120,0);}expect(maxHeat).toBeGreaterThan(.6);expect(electric.attacks.shots).toBeLessThan(15);expect(electric.attacks.shots).toBeGreaterThan(8);
  });
  it('a burst shares one pending explosion across the strengthened third round',()=>{
    const w=make('wind_burst_mid'),a=target(w,590),b=target(w,625,365);w.weapons.current.pending={kind:'next_explosion',radius:76,damage:24,label:'test'};w.attacks.requestPlayer(false,w.settings,a.actor.hurtbox.center(a.actor.pos));let explosions=0;
    w.events.on('damageApplied',h=>{if(h.targetId===b.actor.id&&h.attack.secondary)explosions++;});for(let i=0;i<120;i++)w.projectiles.step(1/120,0);expect(explosions).toBe(1);expect(w.feel.rings).toHaveLength(1);
  });
  it('killing the boss with a late fireball cannot recreate fire patches after death cleanup',()=>{
    const w=make('ember_lantern_late',true);w.adventure.started=true;w.adventure.currentId='core';w.state='playing';w.player.actor.pos=vec(400,340);const b=w.spawn('boss',vec(560,340),1);b.actor.health.hp=10;
    w.attacks.requestPlayer(false,w.settings,b.actor.hurtbox.center(b.actor.pos),undefined,1);for(let i=0;i<120;i++)w.projectiles.step(1/120,0);expect(b.actor.health.alive).toBe(false);expect(w.abilities.areas).toHaveLength(0);expect(w.projectiles.projectiles).toHaveLength(0);
  });
  it('needle accelerates held fire and resets on release',()=>{const w=make('ash_needle');hold(w,1.1);expect(w.attacks.ramp).toBeCloseTo(1);w.weapons.current.cooldown=0;w.attacks.primary(1/120,true,w.settings,vec(800,322));expect(w.weapons.current.cooldown).toBeLessThan(.14);hold(w,1/120,false);expect(w.attacks.ramp).toBe(0);});
  it('returning ring hits once each way and follows a moving owner',()=>{
    const w=make('wind_ring_mid'),e=target(w,590);let hits=0;w.events.on('damageApplied',h=>{if(h.targetId===e.actor.id&&!h.attack.secondary)hits++;});w.attacks.requestPlayer(false,w.settings,e.actor.hurtbox.center(e.actor.pos));
    for(let i=0;i<120;i++)w.projectiles.step(1/120,0);expect(hits).toBe(2);expect(w.projectiles.projectiles).toHaveLength(0);
    w.weapons.current.cooldown=0;w.attacks.requestPlayer(false,w.settings,vec(800,322));w.projectiles.step(.4,0);w.projectiles.step(.1,0);const p=w.projectiles.projectiles[0];expect(p.returning).toBe(true);w.player.actor.pos.y=420;w.projectiles.step(.02,0);expect(Math.sin(p.angle)).toBeGreaterThan(0);w.projectiles.clear();
  });
  it('three tip contacts earn a sword wave; close hits cannot farm sword energy',()=>{
    const w=make('hush_edge'),e=target(w,530,342);w.player.actor.pos=vec(480,340);for(let i=0;i<3;i++){w.weapons.current.cooldown=0;w.melee.clear();w.attacks.requestPlayer(false,w.settings,e.actor.pos);w.melee.step(.2,0);}expect(w.attacks.blade[0]).toBe(3);
    w.weapons.current.cooldown=0;w.melee.clear();w.attacks.requestPlayer(false,w.settings,e.actor.pos);expect(w.projectiles.projectiles.filter(p=>p.style==='wave')).toHaveLength(1);expect(w.attacks.blade[0]).toBe(0);
  });
  it('chapter adds one enemy per ordinary wave and 15% HP without raising damage or attacker slots',()=>{
    for(const region of [1,2,3])for(const room of CHAPTER_ROOMS.filter(r=>r.kind==='battle'&&r.region===region))expect(room.waves.every(wave=>wave.length===region+4)).toBe(true);
    const w=make('ash_needle',true);w.adventure.currentId='front';const e=w.spawn('chaser',vec(600,340));expect(e.actor.health.maxHP).toBe(Math.round(ENEMIES.chaser.hp*depthScale(1).hp*1.15));expect(e.data.damage).toBe(ENEMIES.chaser.damage);
  });
});
