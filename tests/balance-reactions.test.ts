import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {getWeapon,weaponPool} from '../src/data/weapons';
import {REACTIONS} from '../src/data/elements';
import {vec} from '../src/core/types';
const worlds:World[]=[];
function make(){const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),true);worlds.push(w);w.state='playing';w.adventure.started=true;w.settings.hitStrength=0;w.settings.shakeStrength=0;w.random.next=()=>.99;return w;}
function thermal(level:number,tier:number,damageRank=0,elementRank=0){
  const w=make();w.progression.level=level;w.progression.ranks.damage=damageRank;w.progression.ranks.element=elementRank;w.progression.apply();
  const gun=weaponPool(tier).find(g=>g.family==='ember_lantern')!,e=w.spawn('shooter',vec(500,340));e.actor.health.maxHP=e.actor.health.hp=1e5;
  e.actor.elemental.mark='ice';e.actor.elemental.markTime=5;const hits:number[]=[];
  w.events.on('damageApplied',event=>{if(event.targetId===e.actor.id&&event.attack.secondary&&!event.attack.nativeDamage)hits.push(event.amount);});
  w.damage.tryHit(w.attacks.weaponSnapshot(gun,w.settings),e.actor,vec());return hits[0];
}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('reaction growth and armour counterplay',()=>{
  it('has direct or sustained damage for all ten reactions and scales thermal with stage and build',()=>{
    expect(REACTIONS).toHaveLength(10);expect(REACTIONS.every(r=>r.damage>0&&r.weaponRatio>0)).toBe(true);
    const early=thermal(1,1),mid=thermal(6,2,2,1),late=thermal(12,3,4,3);
    expect(early).toBe(46);expect(mid).toBeGreaterThan(early*2);expect(late).toBeGreaterThan(mid*2);
    expect(thermal(1,1,0,1)).toBeGreaterThan(early*1.3);
  });
  it('applies armour once, bypasses it for reactions and reduces it through exposure or piercing',()=>{
    const w=make();w.adventure.currentId='inner-1';const e=w.spawn('chaser',vec(500,340));e.actor.health.maxHP=e.actor.health.hp=1e5;
    const hit=(secondary=false,pierce=0)=>{const c=w.attacks.snapshot(w.player.actor,100,'test','swift',false);c.secondary=secondary;c.armorPierce=pierce;return w.damage.tryHit(c,e.actor,vec()).actualDamage;};
    const normal=hit();expect(normal).toBe(Math.round(100*100/(100+e.armor)));expect(hit(true)).toBe(100);expect(hit(false,.7)).toBeGreaterThan(normal);
    e.actor.elemental.exposureTime=5;expect(hit()).toBe(Math.round(125*100/(100+e.armor*.4)));
  });
  it('keeps burning fractional damage instead of rounding away a small upgrade',()=>{
    const w=make(),e=w.spawn('chaser',vec(500,340));e.actor.health.maxHP=e.actor.health.hp=1e5;
    e.actor.elemental.mark='wind';e.actor.elemental.markTime=5;const c=w.attacks.snapshot(w.player.actor,1,'test','swift',false);c.element='fire';c.reactionBaseDamage=24;
    w.damage.tryHit(c,e.actor,vec());const hp=e.actor.health.hp;for(let n=0;n<600;n++)w.elements.step(1/120,1/120);
    expect(hp-e.actor.health.hp).toBe(39);expect(w.elements.burnCount).toBe(0);
  });
  it('keeps late melee variants subject to walls',()=>{
    const w=make();w.adventure.currentId='front';const obstacle=w.adventure.template.obstacles[0];w.player.actor.pos=vec(obstacle.x-12,obstacle.y+20);
    const e=w.spawn('chaser',vec(obstacle.x+obstacle.w+12,obstacle.y+20));e.actor.hurtbox.body={radius:3,offsetY:0,halfLength:0};
    const sword=weaponPool(3).find(g=>g.family==='hush_edge')!;const c=w.attacks.weaponSnapshot(sword,w.settings);
    expect(w.damage.tryHit(c,e.actor,vec()).blockedBy).toBe('obstacle');expect(getWeapon(sword.id).category).toBe('melee');
  });
  it('does not count a completed fourth piercing contact as an overflow',()=>{
    const w=make(),gun=getWeapon('earth_crossbow_late'),targets=[190,250,310,370].map(x=>w.spawn('chaser',vec(x,220)));
    for(const e of targets){e.actor.health.maxHP=e.actor.health.hp=1e5;e.actor.previous={...e.actor.pos};}
    const c=w.attacks.weaponSnapshot(gun,w.settings);w.projectiles.spawn(c,vec(120,200),0,{speed:2000,range:800,pierce:3,pierceMultiplier:.95});
    w.projectiles.step(.25,.25);expect(targets.every(e=>e.actor.health.hp<1e5)).toBe(true);expect(w.projectiles.overflow).toBe(0);
  });
});
