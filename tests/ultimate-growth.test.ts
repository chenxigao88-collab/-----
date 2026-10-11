import {shotProfile} from '../src/data/weaponMechanics';
import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {vec} from '../src/core/types';
import {captureCheckpoint,parseCheckpoint,restoreCheckpoint} from '../src/room/CheckpointStore';
import {WEAPONS,getWeapon} from '../src/data/weapons';

const worlds:World[]=[];
function make(adventure=false){const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),adventure);worlds.push(w);w.selectCharacter('violet');w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.stats.criticalChance=0;return w;}
function target(w:World,x=570){const e=w.spawn('shooter',vec(x,340),-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;return e;}
function cast(w:World){w.state='playing';w.ultimate.energy=100;expect(w.ultimate.request(vec(800,340))).toBe(true);}
function tick(w:World,t:number){for(let i=0;i<Math.ceil(t*120);i++)w.step(1/120,emptyInput());}
function grow(w:World){w.progression.level=12;w.progression.ranks.damage=4;w.progression.ranks.gunfu=3;w.progression.ranks.element=3;w.progression.apply();}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});

describe('ultimate damage growth',()=>{
  it.each(WEAPONS.map(w=>w.id))('%s weapon hits receive level, damage and routine bonuses exactly once',id=>{
    const w=make(),e=target(w,getWeapon(id).category==='melee'?520:570);w.debugWeapon(0,id);grow(w);
    const hits:{amount:number;phase:number}[]=[];
    w.events.on('damageApplied',hit=>{if(hit.attack.ultimatePhase===2&&!hit.attack.secondary)hits.push({amount:hit.amount,phase:hit.attack.ultimatePhase});});
    cast(w);w.ultimate.step(2.15);w.projectiles.step(.4,0);w.melee.step(.2,0);
    expect(hits.length).toBeGreaterThan(0);
    const gun=w.weapons.slots[0].data,base=gun.damage*.8*1.88*1.8*1.75*shotProfile(gun,1).damage,expected=Math.round(base);
    expect(hits.every(hit=>hit.amount===expected||(gun.family==='wind_burst'&&hit.amount===Math.round(base*(gun.tier===3?1.7:1.4))))).toBe(true);expect(e.actor.health.hp).toBeLessThan(5000);
  });
  it('ultimate shots share ordinary weapon critical chance and critical damage',()=>{
    const w=make();target(w);w.debugWeapon(0,'frost_string');grow(w);w.player.stats.criticalChance=1;w.player.stats.criticalDamage=2;
    let amount=0,critical=false;w.events.on('damageApplied',hit=>{if(hit.attack.ultimatePhase===2&&!hit.attack.secondary){amount=hit.amount;critical=hit.attack.critical;}});
    cast(w);w.ultimate.step(2.15);w.projectiles.step(.3,0);
    expect(critical).toBe(true);expect(amount).toBe(Math.round(26*.8*1.88*1.8*1.75*2));
  });
  it('ultimate respects a one-shot weapon bonus and consumes it only on the first actual weapon attack',()=>{
    const w=make();target(w);w.debugWeapon(0,'frost_string');
    w.weapons.slots[0].pending={kind:'next_damage',multiplier:1.5,label:'test'};
    const hits:number[]=[];w.events.on('damageApplied',hit=>{if(hit.attack.ultimatePhase!==undefined&&[2,3].includes(hit.attack.ultimatePhase)&&!hit.attack.secondary)hits.push(hit.amount);});
    cast(w);w.ultimate.step(1.6);expect(w.weapons.slots[0].pending).toBeDefined();
    w.ultimate.step(.55);expect(w.weapons.slots[0].pending).toBeUndefined();w.projectiles.step(.3,0);
    w.ultimate.step(.57);w.projectiles.step(.3,0);expect(hits).toEqual([...Array(5).fill(31),...Array(5).fill(21)]);
  });
  it('damage, routine and elemental bonuses all reach ultimate reactions without being applied twice',()=>{
    const w=make();target(w);w.debugWeapon(0,'ember_lantern');w.debugWeapon(1,'frost_string');grow(w);
    const reactions:number[]=[];w.events.on('damageApplied',hit=>{if(hit.attack.ultimateCast!==undefined&&hit.attack.secondary)reactions.push(hit.amount);});
    cast(w);tick(w,3.8);expect(w.elements.counts.thermal).toBe(1);
    expect(reactions).toEqual([Math.round((24+.9*26)*1.88*1.8*1.75*2.05)]);
  });
  it('native fire splash and lightning chain scale like the weapon hit while keeping reactions separate',()=>{
    for(const id of ['ember_lantern','thunder_branch']){
      const w=make(),a=target(w,560),b=target(w,580);w.debugWeapon(0,id);grow(w);const hits:number[]=[];
      w.events.on('damageApplied',hit=>{if(hit.targetId===b.actor.id&&hit.attack.ultimatePhase===2)hits.push(hit.amount);});
      cast(w);w.ultimate.step(2.15);w.projectiles.step(.3,0);
      expect(hits).toEqual([Math.round((id==='ember_lantern'?24*.65:6)*.8*1.88*1.8*1.75)]);
      expect(a.actor.health.hp).toBeLessThan(5000);
    }
  });
  it('burn ticks inherit the same growth once and wait for enemy time to resume',()=>{
    const w=make(),e=target(w,520);w.debugWeapon(0,'hush_edge');grow(w);e.actor.elemental.mark='fire';e.actor.elemental.markTime=5;
    const ticks:number[]=[];w.events.on('damageApplied',hit=>{if(hit.attack.secondary&&hit.attack.ultimateCast!==undefined)ticks.push(hit.amount);});
    cast(w);w.ultimate.step(2.15);w.melee.step(.2,0);expect(w.elements.counts.burn).toBe(1);
    w.elements.step(.5,0);expect(ticks).toHaveLength(0);w.elements.step(.5,.5);
    expect(ticks).toEqual([Math.round((15+34)/10*1.88*1.8*1.75*2.05)]);
  });
  it('blade growth raises the two opening cuts and the final cut remains 70% of the actual total',()=>{
    const w=make(),e=target(w);w.debugWeapon(0,'frost_string');w.debugWeapon(1,'ember_lantern');grow(w);w.progression.ranks.blade=3;
    const openings:number[]=[],totals:number[]=[],finals:number[]=[];
    w.events.on('damageApplied',hit=>{if(hit.targetId!==e.actor.id||hit.attack.ultimatePhase===undefined)return;const phase=hit.attack.ultimatePhase;if(phase<2)openings.push(hit.amount);if(phase<5)totals.push(hit.amount);else finals.push(hit.amount);});
    cast(w);tick(w,4.4);
    expect(openings).toEqual([24,20].map(base=>Math.round(base*1.88*1.8*1.75*1.75)));
    expect(finals).toEqual([Math.round(totals.reduce((a,b)=>a+b,0)*.7)]);
  });
  it('blade growth improves the three sword combo strikes without amplifying gun hits',()=>{
    const w=make();target(w,520);w.progression.ranks.blade=3;const body:number[]=[];
    w.events.on('damageApplied',hit=>{if(hit.attack.gunfu==='body')body.push(hit.amount);});w.gunfu.request(vec(800,340));
    for(let n=0;n<120;n++){const s=w.gunfu.snapshot(),a=w.player.actor.action;if(a&&a.elapsed>=a.duration-.12&&!s.queued)w.gunfu.request(vec(800,340));w.gunfu.step(1/120,w.settings);}
    expect(body).toEqual([18,21,35]);
    const c=w.attacks.snapshot(w.player.actor,10,'test','swift',false);c.ultimateCast=1;c.ultimatePhase=2;
    expect(w.progression.multiplier(c,w.enemies[0].actor)).toBe(1);
  });
  it('blade growth also applies to actual wind-sword weapon attacks in the ultimate',()=>{
    const w=make();target(w,520);w.debugWeapon(0,'hush_edge');grow(w);w.progression.ranks.blade=3;let amount=0;
    w.events.on('damageApplied',hit=>{if(hit.attack.ultimatePhase===2&&!hit.attack.secondary)amount=hit.amount;});
    cast(w);w.ultimate.step(2.15);w.melee.step(.2,0);expect(amount).toBe(Math.round(34*.8*1.88*1.8*1.75*1.75));
  });
  it('ordinary attacks get universal reaction growth but only routines get the routine bonus',()=>{
    const w=make(),e=target(w);grow(w);e.actor.elemental.mark='fire';e.actor.elemental.markTime=5;
    const c=w.attacks.snapshot(w.player.actor,10,'normal','swift',false);c.element='ice';c.damageScale=1.88;let reaction=0;
    w.events.on('damageApplied',hit=>{if(hit.attack.secondary)reaction+=hit.amount;});w.damage.tryHit(c,e.actor,vec());
    expect(reaction).toBe(Math.round(24*1.88*1.8*2.05));
  });
});

describe('optional blade growth and checkpoint compatibility',()=>{
  it('offers blade growth to violet, allows three ranks and stops offering it at the cap',()=>{
    const w=make(true);w.adventure.started=true;w.progression.gain(156);w.random.next=()=>.43;
    for(let rank=1;rank<=3;rank++){w.progression.prompt();expect(w.progression.offers).toContain('blade');expect(w.progression.choose('blade')).toBe(true);expect(w.progression.ranks.blade).toBe(rank);}
    w.progression.gain(w.progression.threshold);w.progression.prompt();expect(w.progression.offers).not.toContain('blade');
  });
  it('never offers violet sword growth to ember and refuses an invalid choice',()=>{
    const w=make(true);w.selectCharacter('ember');w.adventure.started=true;w.progression.gain(40);w.random.next=()=>.43;w.progression.prompt();
    expect(w.progression.offers).not.toContain('blade');w.progression.offers=['blade','damage','element'];expect(w.progression.choose('blade')).toBe(false);
  });
  it('saves blade ranks and migrates old v1 checkpoints without erasing existing growth',()=>{
    const w=make(true);w.adventure.started=true;w.adventure.currentId='shop';w.adventure.memory.cleared=true;
    w.progression.level=3;w.progression.ranks.damage=1;w.progression.ranks.blade=1;w.progression.apply();
    const checkpoint=captureCheckpoint(w)!;const parsed=parseCheckpoint(JSON.stringify(checkpoint));expect(parsed).toBeDefined();const restored=make(true);restoreCheckpoint(restored,parsed!);expect(restored.progression.ranks.blade).toBe(1);
    const old=JSON.parse(JSON.stringify(checkpoint));delete old.progression.ranks.blade;old.progression.ranks.gunfu=1;
    const migrated=parseCheckpoint(JSON.stringify(old));expect(migrated).toBeDefined();expect(migrated!.progression.ranks.blade).toBe(0);expect(migrated!.progression.ranks.damage).toBe(1);
    restoreCheckpoint(restored,migrated!);expect(restored.progression.ranks.blade).toBe(0);expect(restored.progression.ranks.gunfu).toBe(1);
  });
});
