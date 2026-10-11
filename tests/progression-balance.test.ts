import {afterEach,describe,expect,it,vi} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {depthScale} from '../src/data/chapter';
import {Enemy} from '../src/actors/Enemy';
import {getWeapon,WEAPONS} from '../src/data/weapons';
import {vec} from '../src/core/types';
import type {CharacterId} from '../src/data/characters';
const worlds:World[]=[];
function make(adventure=true,character:CharacterId='ember'){
  const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),adventure);
  w.selectCharacter(character);w.player.stats.criticalChance=0;w.settings.hitStrength=0;worlds.push(w);
  if(adventure)w.adventure.started=true;
  return w;
}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;vi.restoreAllMocks();});

describe('visible chapter growth',()=>{
  it('turns a starter hit into more than triple damage without copying the upgrade onto secondary hits',()=>{
    const w=make(),enemy=w.spawn('chaser',vec(700,300));
    const early=w.attacks.weaponSnapshot(getWeapon('ash_needle'),w.settings);
    expect(w.damage.tryHit(early,enemy.actor,vec()).actualDamage).toBe(14);
    w.progression.gain(100000);w.progression.ranks.damage=4;w.progression.apply();
    enemy.actor.health.hp=enemy.actor.health.maxHP;
    const late=w.attacks.weaponSnapshot(getWeapon('ash_needle'),w.settings);
    expect(w.damage.tryHit(late,enemy.actor,vec()).actualDamage).toBe(47);
    expect(w.progression.level).toBe(12);expect(w.progression.pending).toBe(11);expect(w.progression.xp).toBe(0);
    expect(w.player.stats.damageMultiplier).toBeCloseTo(1.88);
    expect(w.progression.multiplier(w.attacks.secondary(late,20),enemy.actor)).toBe(1);
    w.progression.gain(100000);expect(w.progression.level).toBe(12);expect(w.progression.pending).toBe(11);
  });
  it('gives immediate healing with stronger maximum health and useful defensive choices',()=>{
    const w=make();w.player.actor.health.hp=30;w.progression.gain(40);
    expect(w.player.actor.health.maxHP).toBe(105);expect(w.player.actor.health.hp).toBe(35);
    w.progression.offers=['health','damage','element'];w.adventure.showPanel({kind:'upgrade',source:'growth'});
    expect(w.progression.choose('health')).toBe(true);
    expect(w.player.actor.health.maxHP).toBe(125);expect(w.player.actor.health.hp).toBe(55);
    w.progression.level=12;w.progression.ranks.health=3;w.progression.ranks.defence=3;w.progression.ranks.dodge=3;w.progression.apply();
    expect(w.player.stats.maxHP).toBe(215);expect(w.player.stats.dashCooldown).toBeCloseTo(.75);
    const incoming=w.attacks.snapshot(w.spawn('chaser',vec(800,300)).actor,100,'test','heavy',false);
    expect(w.progression.multiplier(incoming,w.player.actor)).toBeCloseTo(.82);
  });
  it('always offers available offence and continues an invested offensive route',()=>{
    const w=make(),offence=['damage','gunfu','element'];w.progression.pending=1;
    for(const rng of [0,.24,.51,.99]){
      vi.spyOn(w.random,'next').mockReturnValue(rng);w.progression.offers=[];
      expect(w.progression.prompt()).toBe(true);
      expect(w.progression.offers.some(id=>offence.includes(id))).toBe(true);
      expect(new Set(w.progression.offers).size).toBe(3);
      expect(w.progression.offers).not.toContain('blade');w.adventure.closePanel();
    }
    w.progression.ranks.damage=2;w.progression.ranks.health=1;w.progression.offers=[];w.progression.prompt();
    expect(w.progression.offers[0]).toBe('damage');expect(w.progression.offers).toContain('health');
    w.progression.ranks.damage=4;w.progression.ranks.gunfu=3;w.progression.offers=[];w.progression.prompt();
    expect(w.progression.offers).toContain('element');
    expect(w.progression.offers).not.toContain('damage');expect(w.progression.offers).not.toContain('gunfu');
  });
  it('scales routine reactions once and applies blade specialization to all melee weapon generations',()=>{
    const w=make(true,'violet'),enemy=w.spawn('chaser',vec(800,300));
    w.progression.ranks.damage=4;w.progression.ranks.gunfu=3;w.progression.ranks.element=3;w.progression.ranks.blade=3;
    const c=w.attacks.snapshot(w.player.actor,10,'test','heavy',false);c.gunfu='body';c.gunfuPhase=0;
    expect(w.progression.reactionMultiplier(c)).toBeCloseTo(1.8*2.05*1.75);
    expect(w.progression.multiplier(c,enemy.actor)).toBeCloseTo(1.8*1.75*1.75);
    c.gunfu=undefined;c.gunfuPhase=undefined;
    for(const weapon of WEAPONS.filter(weapon=>weapon.category==='melee')){
      c.weaponId=weapon.id;expect(w.progression.multiplier(c,enemy.actor)).toBeCloseTo(1.8*1.75);
    }
    c.weaponId='ash_needle';expect(w.progression.multiplier(c,enemy.actor)).toBeCloseTo(1.8);
  });
});

describe('chapter enemies and meaningful combo hits',()=>{
  it('raises health and armor through each region while limiting incoming damage and keeping trial armor absent',()=>{
    const steps=[1,6,12,18].map(depthScale);
    expect(steps.map(scale=>scale.hp)).toEqual([1,1.45,2.1,2.9]);
    expect(steps.map(scale=>scale.armor)).toEqual([0,4,10,16]);
    expect(steps.map(scale=>scale.damage)).toEqual([1,1.12,1.25,1.4]);
    expect(depthScale(-5)).toEqual(depthScale(1));expect(depthScale(100)).toEqual(depthScale(18));
    expect(depthScale(9).hp).toBeCloseTo(1.775);
    const late=depthScale(18),normal=new Enemy(1,1,'chaser',vec(),-1,false,late),shield=new Enemy(2,1,'shield',vec(),-1,false,late),heavy=new Enemy(3,1,'shooter',vec(),-1,true,late,720);
    expect(normal.actor.health.maxHP).toBe(186);expect(normal.armor).toBe(16);
    expect(shield.armor).toBe(24);expect(heavy.actor.health.maxHP).toBe(2088);expect(heavy.armor).toBe(32);
    expect(new Enemy(4,1,'shield',vec()).armor).toBe(0);
    const boss=new Enemy(5,1,'boss',vec());expect(boss.actor.health.maxHP).toBe(12000);expect(boss.armor).toBe(18);
  });
  it.each(['ember','violet'] as const)('makes the %s opening body hit substantial and scales it with its specialization',character=>{
    const w=make(false,character),enemy=w.spawn('shooter',vec(520,340),-1,true),hits:number[]=[];
    enemy.actor.health.hp=enemy.actor.health.maxHP=5000;
    w.events.on('damageApplied',event=>{if(event.attack.gunfu==='body')hits.push(event.amount);});
    expect(w.gunfu.request(enemy.actor.hurtbox.center(enemy.actor.pos))).toBe(true);w.gunfu.step(.18,w.settings);
    expect(hits).toEqual([character==='ember'?8:10]);
    w.gunfu.cancel();w.gunfu.cooldown=0;w.progression.level=12;w.progression.ranks.damage=4;w.progression.ranks.gunfu=3;w.progression.ranks.blade=3;w.progression.apply();
    expect(w.gunfu.request(enemy.actor.hurtbox.center(enemy.actor.pos))).toBe(true);w.gunfu.step(.18,w.settings);
    expect(hits[1]).toBe(character==='ember'?47:104);
  });
  it.each(['ember','violet'] as const)('keeps %s finishing shots close to normal weapon power',character=>{
    const w=make(false,character),request=vi.spyOn(w.attacks,'requestPlayer'),aim=vec(700,320);
    expect(w.gunfu.request(aim)).toBe(true);
    for(let frame=0;frame<420&&w.gunfu.busy;frame++){
      const action=w.player.actor.action,s=w.gunfu.snapshot();
      if(s.awaiting||action&&action.elapsed>=action.duration-.12&&!s.queued)w.gunfu.request(aim);
      w.weapons.step(1/120);w.gunfu.step(1/120,w.settings);
    }
    expect(w.gunfu.busy).toBe(false);expect(request.mock.calls.length).toBe(character==='ember'?2:3);
    expect(request.mock.calls.every(call=>call[3]?.multiplier===(character==='ember'?.8:.65))).toBe(true);
  });
  it('lets late chapter cantor wards withstand a hit while leaving the trial at twenty shield points',()=>{
    for(const adventure of [false,true]){
      const w=make(adventure);if(adventure)w.adventure.currentId='inner-6';
      const cantor=w.spawn('cantor',vec(450,250)),ally=w.spawn('chaser',vec(470,250));
      expect(w.special.specialAttack(cantor)).toBe(true);expect(ally.ward).toBe(adventure?58:20);expect(ally.wardTime).toBe(4);
    }
  });
});
