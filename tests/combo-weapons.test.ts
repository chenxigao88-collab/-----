import {shotProfile} from '../src/data/weaponMechanics';
import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {vec} from '../src/core/types';
import {getWeapon,WEAPONS} from '../src/data/weapons';

const worlds:World[]=[];
function make(adventure=false){const w=new World(1,defaultDebug(),new AudioManager(),adventure);worlds.push(w);w.selectCharacter('violet');w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.stats.criticalChance=0;return w;}
function target(w:World,x=580,y=340){const e=w.spawn('shooter',vec(x,y),-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;return e;}
function ultimate(w:World){w.state='playing';w.ultimate.energy=100;expect(w.ultimate.request(vec(800,340))).toBe(true);}
function tick(w:World,t:number){for(let i=0;i<Math.ceil(t*120);i++)w.step(1/120,emptyInput());}
function routine(w:World,t:number){for(let i=0;i<Math.ceil(t*120);i++){
  const s=w.gunfu.snapshot(),a=w.player.actor.action;
  if(a&&a.elapsed>=a.duration-.12&&!s.queued)w.gunfu.request(vec(800,340));
  w.weapons.step(1/120);w.gunfu.step(1/120,w.settings);w.projectiles.step(1/120,0);w.melee.step(1/120,0);
}}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});

describe('native weapons during choreographed attacks',()=>{
  it.each(WEAPONS.flatMap(weapon=>(['ember','violet'] as const).map(character=>({id:weapon.id,character}))))('$character completes a full routine with native $id attacks',({id,character})=>{
    const w=make();w.selectCharacter(character);w.debugWeapon(0,id);target(w,520);const weapon=getWeapon(id),hits:number[]=[];
    w.events.on('damageApplied',hit=>{if(hit.attack.gunfu==='finisher'&&hit.attack.weaponId===id&&!hit.attack.secondary){expect(hit.attack.element).toBe(weapon.element);hits.push(hit.amount);}});
    expect(w.gunfu.request(vec(800,340))).toBe(true);routine(w,3.2);
    expect(w.gunfu.busy).toBe(false);expect(w.gunfu.completed).toBe(1);expect(w.weapons.active).toBe(1);expect(hits.length).toBeGreaterThan(0);
  });
  it.each(['ember','violet'] as const)('%s gun-fu keeps melee weapon phases in range instead of firing a substitute pistol',character=>{
    const w=make();w.selectCharacter(character);w.debugWeapon(0,'hush_edge');const e=target(w,670),contacts:number[]=[];
    w.events.on('damageApplied',hit=>{if(hit.attack.weaponId==='hush_edge'&&hit.attack.gunfu==='finisher')contacts.push(hit.amount);});
    expect(w.gunfu.request(vec(800,340))).toBe(true);routine(w,character==='violet'?1.25:1.55);
    expect(w.player.actor.action?.kind).toBe(character==='violet'?'greatspin':'sweep');
    expect(w.melee.attacks.some(a=>a.context.weaponId==='hush_edge')).toBe(true);
    expect(w.projectiles.projectiles.filter(p=>p.context.element==='wind')).toHaveLength(0);
    routine(w,1.2);expect(contacts).toHaveLength(0);expect(e.actor.health.hp).toBeLessThan(5000); // Real offhand bullets can reach this target.
  });
  it('violet gun-fu actually hits with both sword weapon phases when a target is within melee range',()=>{
    const w=make();w.debugWeapon(0,'hush_edge');target(w,520);const hits:number[]=[];
    w.events.on('damageApplied',hit=>{if(hit.attack.weaponId==='hush_edge'&&hit.attack.gunfu==='finisher'&&!hit.attack.secondary)hits.push(hit.amount);});
    w.gunfu.request(vec(800,340));routine(w,2.3);expect(hits).toHaveLength(2);expect(hits.every(amount=>amount>0)).toBe(true);
  });
  it.each(WEAPONS.filter(w=>w.category!=='melee').map(w=>w.id))('ultimate %s emits native projectiles and waits for collision to deal shot damage',id=>{
    const w=make(),e=target(w),weapon=getWeapon(id);w.debugWeapon(0,id);ultimate(w);
    w.ultimate.step(2.15);
    expect(e.actor.health.hp).toBe(4956); // Only the two intrinsic blade hits have landed.
    expect(w.ultimate.snapshot().openingDamage[e.actor.id]).toBe(44);
    expect(w.projectiles.projectiles).toHaveLength(shotProfile(weapon,1).count);
    for(const [index,p] of w.projectiles.projectiles.entries()){
      expect(p.context.equippedWeaponId).toBe(id);expect(p.context.element).toBe(weapon.element);
      expect(p.context.damage).toBeCloseTo(weapon.damage*.8*shotProfile(weapon,1).damage*(weapon.family==='wind_burst'&&index===2?(weapon.tier===3?1.7:1.4):1));expect(p.speed).toBe(weapon.projectileSpeed);
      expect(p.range).toBe(weapon.range);expect(p.pierce).toBe(weapon.pierce);expect(p.bounce).toBe(weapon.bounce);
    }
    w.projectiles.step(.3,0);expect(e.actor.health.hp).toBeLessThan(4956);
    expect(w.ultimate.snapshot().openingDamage[e.actor.id]).toBeGreaterThan(44);
  });
  it('scatter volleys keep six separate angles instead of focusing their full damage into one ray',()=>{
    const w=make();target(w);w.debugWeapon(0,'gravel_bell');ultimate(w);w.ultimate.step(2.15);
    const angles=w.projectiles.projectiles.map(p=>p.angle);
    expect(new Set(angles).size).toBe(6);expect(Math.max(...angles)-Math.min(...angles)).toBeGreaterThan(.4);
  });
  it('an auto-aimed projectile can miss when its target moves after firing',()=>{
    const w=make(),e=target(w);w.debugWeapon(0,'ember_lantern');ultimate(w);w.ultimate.step(2.15);
    e.actor.pos=vec(580,430);e.actor.previous={...e.actor.pos};
    for(let i=0;i<200;i++)w.projectiles.step(1/120,0);
    expect(e.actor.health.hp).toBe(4956);expect(w.ultimate.snapshot().openingDamage[e.actor.id]).toBe(44);
  });
  it('native projectiles collide with cover before reaching an auto-aimed target',()=>{
    const w=make(),e=target(w);ultimate(w);w.ultimate.step(2.15);
    w.projectiles.obstacleContact=()=>({t:.1,normal:vec(-1,0)});w.projectiles.step(.2,0);
    expect(w.projectiles.projectiles).toHaveLength(0);expect(e.actor.health.hp).toBe(4956);
  });
  it('ultimate wind sword swings retain their native range, arc, hit timing and blade pose',()=>{
    const w=make(),e=target(w,520);w.debugWeapon(0,'hush_edge');ultimate(w);w.ultimate.step(2.15);
    const swing=w.melee.attacks.find(a=>a.context.equippedWeaponId==='hush_edge')!,weapon=getWeapon('hush_edge');
    expect(w.player.actor.action?.kind).toBe('greatspin');expect(w.projectiles.projectiles).toHaveLength(0);
    expect(swing.hitbox.radius).toBe(weapon.range);expect(swing.hitbox.arc).toBe(weapon.melee!.arc);
    expect(swing.windup).toBe(weapon.melee!.windup);expect(e.actor.health.hp).toBe(4956);
    w.melee.step(.06,0);expect(e.actor.health.hp).toBe(4956);
    w.melee.step(.14,0);expect(e.actor.health.hp).toBeLessThan(4956);
  });
  it('out-of-range sword weapon phases miss and contribute no phantom damage to the 70% finisher',()=>{
    const w=make(),e=target(w,700);w.debugWeapon(0,'hush_edge');w.debugWeapon(1,'hush_edge');ultimate(w);
    const contacts:number[]=[];w.events.on('damageApplied',hit=>{if(hit.attack.ultimateCast!==undefined&&!hit.attack.secondary)contacts.push(hit.attack.ultimatePhase!);});
    tick(w,4.5);expect(contacts).toEqual([0,1,5]);expect(w.ultimate.snapshot().openingDamage[e.actor.id]).toBe(44);
    expect(e.actor.health.hp).toBe(4925);expect(w.projectiles.projectiles).toHaveLength(0);
  });
  it('combo and ultimate sword attacks obey the same cover restriction as a normal sword attack',()=>{
    const w=make(true),obstacle=w.adventure.template.obstacles[0];
    // Entry has no obstacles: use one of the regular courts for the contact rule.
    if(!obstacle)w.adventure.currentId='front';
    const o=w.adventure.template.obstacles[0];expect(o).toBeDefined();
    w.player.actor.pos=vec(o.x-20,o.y+o.h/2);const e=target(w,o.x+o.w+20,o.y+o.h/2);
    for(const ult of [false,true]){
      const c=w.attacks.snapshot(w.player.actor,20,ult?'violet-ultimate':'hush_edge','heavy',true);
      if(ult)c.equippedWeaponId='hush_edge';else c.gunfu='finisher';
      expect(w.damage.tryHit(c,e.actor,vec(1,0)).blockedBy).toBe('obstacle');
    }
    expect(e.actor.health.hp).toBe(5000);
  });
});
