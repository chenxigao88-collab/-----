import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {vec} from '../src/core/types';
import {getWeapon,SKILLS,STARTER_WEAPONS,TIER_LABELS,WEAPONS,weaponPool} from '../src/data/weapons';
import {validateData} from '../src/data/validateData';

const worlds:World[]=[];
function make(){
  const w=new World(1,defaultDebug(),new AudioManager());worlds.push(w);
  w.player.stats.criticalChance=0;w.settings.hitStrength=0;w.settings.shakeStrength=0;
  // Isolate native weapon scaling from enemy armour and unrelated reward systems.
  w.damage.modifier=()=>1;w.damage.absorb=(_target,amount)=>amount;
  return w;
}
function target(w:World,x:number,y=340){
  const e=w.spawn('shooter',vec(x,y));e.actor.health.hp=e.actor.health.maxHP=5000;
  e.actor.hurtbox.body={radius:8,offsetY:0,halfLength:0};return e;
}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});

describe('weapon stages and progression traits',()=>{
  it('keeps the six starter IDs while providing nine mid and nine late choices',()=>{
    expect(STARTER_WEAPONS.map(w=>[w.id,w.damage])).toEqual([
      ['ash_needle',14],['gravel_bell',9],['hush_edge',34],['frost_string',26],['ember_lantern',24],['thunder_branch',8]
    ]);
    expect(WEAPONS).toHaveLength(24);expect(new Set(WEAPONS.map(w=>w.id)).size).toBe(24);
    expect([1,2,3].map(region=>weaponPool(region).length)).toEqual([6,9,9]);
    for(const region of [1,2,3])expect(weaponPool(region).every(w=>w.tier===region)).toBe(true);
    expect(weaponPool(0)).toEqual([...STARTER_WEAPONS]);expect(weaponPool(99)).toEqual(weaponPool(3));
    expect(TIER_LABELS).toEqual({1:'前期',2:'中期',3:'后期'});expect(()=>validateData()).not.toThrow();
  });
  it('each original family gains damage and additional mechanics without becoming an unlimited volley',()=>{
    for(const starter of STARTER_WEAPONS){
      const mid=getWeapon(`${starter.id}_mid`),late=getWeapon(`${starter.id}_late`);
      expect(mid.family).toBe(starter.family);expect(late.family).toBe(starter.family);
      expect(mid.damage/starter.damage).toBeGreaterThanOrEqual(1.6);
      expect(late.damage/starter.damage).toBeGreaterThanOrEqual(2.4);
      expect(late.projectileCount).toBeLessThanOrEqual(7);expect(late.pierce).toBeLessThanOrEqual(3);
      expect(SKILLS[mid.skillId]).toBeDefined();expect(SKILLS[late.skillId]).toBeDefined();
      expect(late.icon).not.toBe(starter.icon);expect(late.sprite).not.toBe(starter.sprite);
    }
    const crossbow=getWeapon('earth_crossbow_late');expect(crossbow.damage).toBe(125);expect(crossbow.attackRate).toBeLessThan(1.2);
    expect(getWeapon('wind_burst_late').projectileCount).toBe(3);
    expect(getWeapon('wind_ring_late').melee?.arc).toBeCloseTo(Math.PI*2);
  });
  it('reaction base damage and armour piercing are independent of critical, level and choreographed multipliers',()=>{
    const w=make();w.player.stats.damageMultiplier=3;w.player.stats.criticalChance=1;
    for(const id of ['ash_needle_late','gravel_bell_late','earth_crossbow_late']){
      const weapon=getWeapon(id),c=w.attacks.weaponSnapshot(weapon,w.settings,SKILLS[weapon.skillId],.25);
      expect(c.critical).toBe(true);
      expect(c.reactionBaseDamage).toBe(weapon.damage*(weapon.category==='shotgun'?2:1));
      expect(c.armorPierce).toBe(weapon.armorPierce);expect(c.damageScale).toBe(3);
      expect(c.nativeDamageScale).toBe(.75);
    }
  });
  it('late fire splash uses its larger radius and five-target cap, with native scaling applied once',()=>{
    const w=make(),enemies=[300,315,330,345,360,375,390].map(x=>target(w,x));
    w.player.stats.damageMultiplier=2;
    w.damage.modifier=c=>c.secondary&&!c.nativeDamage?1:1.6;
    const c=w.attacks.weaponSnapshot(getWeapon('ember_lantern_late'),w.settings,undefined,.4);
    c.ultimateCast=1;c.ultimatePhase=2;
    const hits:number[]=[];w.events.on('damageApplied',e=>{if(e.attack.secondary)hits.push(e.amount);});
    w.damage.tryHit(c,enemies[0].actor,vec());
    expect(hits).toEqual(Array(5).fill(Math.round(22*2*.4*1.6)));
    expect(enemies[6].actor.health.hp).toBe(5000);
    expect(enemies.slice(1).every(e=>e.actor.elemental.mark===undefined)).toBe(true);
  });
  it('late lightning connects five targets over longer gaps without further elemental reactions',()=>{
    const w=make(),enemies=[300,460,620,780,900,940].map(x=>target(w,x));
    w.player.stats.damageMultiplier=2;w.damage.modifier=c=>c.secondary&&!c.nativeDamage?1:1.6;
    for(const e of enemies.slice(1)){e.actor.elemental.mark='wind';e.actor.elemental.markTime=5;}
    const c=w.attacks.weaponSnapshot(getWeapon('thunder_branch_late'),w.settings,undefined,.4);
    const hits:number[]=[];w.events.on('damageApplied',e=>{if(e.attack.secondary)hits.push(e.amount);});
    w.damage.tryHit(c,enemies[0].actor,vec());
    expect(hits).toEqual(Array(4).fill(Math.round(20*2*.4*1.6)));
    expect(enemies[5].actor.health.hp).toBe(5000);expect(w.elements.activations).toBe(0);
    expect(enemies.slice(1).every(e=>e.actor.elemental.mark==='wind')).toBe(true);
  });
  it('late crossbow actually pierces four enemies and keeps its planned damage retention',()=>{
    const w=make(),enemies=[540,580,620,660].map(x=>target(w,x));
    const weapon=getWeapon('earth_crossbow_late'),c=w.attacks.weaponSnapshot(weapon,w.settings);
    const hits:number[]=[];w.events.on('damageApplied',e=>{if(!e.attack.secondary)hits.push(e.amount);});
    expect(w.attacks.emitWeapon(c,weapon,0,vec(480,340),undefined,1,0)).toBe(true);
    for(let n=0;n<30;n++)w.projectiles.step(1/120,0);
    expect(hits).toEqual([125,119,113,107]);expect(enemies.every(e=>e.actor.health.hp<5000)).toBe(true);
    expect(w.projectiles.overflow).toBe(0);
  });
  it('late ring melee really slows its target and pulls nearby enemies toward the player',()=>{
    const w=make(),a=target(w,550),b=target(w,580);
    const c=w.attacks.weaponSnapshot(getWeapon('wind_ring_late'),w.settings);
    w.damage.tryHit(c,a.actor,vec(1,0));
    expect(a.actor.elemental.moveScale).toBe(.75);
    expect(b.actor.knockback.velocity.x).toBeLessThan(0);
    expect(b.actor.elemental.mark).toBeUndefined();
  });
  it('late fire and thunder enhanced finishers use their actual enlarged area skills',()=>{
    const w=make();w.debugWeapon(0,'ember_lantern_late');
    expect(w.attacks.requestPlayer(true,w.settings,vec(600,340))).toBe(true);
    expect(w.abilities.areas[0].radius).toBe(112);expect(w.abilities.areas[0].duration).toBe(4);
    expect(w.abilities.areas[0].context.damage).toBeCloseTo(58*.45);
    w.debugWeapon(0,'thunder_branch_late');
    expect(w.attacks.requestPlayer(true,w.settings,vec(600,340))).toBe(true);
    expect(w.abilities.areas[1].radius).toBe(112);expect(w.abilities.areas[1].delay).toBe(.35);
    expect(w.abilities.areas[1].context.damage).toBeCloseTo(48*2.1);
  });
  it('every persistent fire tick receives general damage growth once and only the first attaches fire',()=>{
    const w=make(),e=target(w,600);w.player.stats.damageMultiplier=2;
    w.progression.ranks.damage=2;w.progression.ranks.gunfu=1;
    w.damage.modifier=(c,t)=>w.progression.multiplier(c,t);w.debugWeapon(0,'ember_lantern_late');
    const hits:number[]=[],elements:string[]=[];
    w.events.on('damageApplied',hit=>{if(hit.targetId===e.actor.id){hits.push(hit.amount);elements.push(hit.attack.element);}});
    expect(w.attacks.requestPlayer(true,w.settings,vec(600,340))).toBe(true);w.abilities.step(4);
    expect(hits).toEqual(Array(8).fill(Math.round(58*.45*2*.5*1.4)));
    expect(elements).toEqual(['fire',...Array(7).fill('none')]);
  });
});

