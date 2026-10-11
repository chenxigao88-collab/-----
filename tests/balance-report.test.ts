import {afterEach,expect,it} from 'vitest';
import {mkdirSync,writeFileSync} from 'node:fs';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {weaponPool,WEAPONS} from '../src/data/weapons';
import {depthScale} from '../src/data/chapter';
import {vec} from '../src/core/types';
const worlds:World[]=[];
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
it('measures faster kills and larger reactions as the run grows, then saves the tuning report',()=>{
  const configs=[{tier:1,level:1,room:'front',damage:0,gunfu:0,element:0,health:0},{tier:2,level:6,room:'forge-3',damage:2,gunfu:1,element:1,health:1},{tier:3,level:12,room:'inner-6',damage:4,gunfu:3,element:3,health:1}];
  const stages=configs.map(config=>{
    const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),true);worlds.push(w);w.random.next=()=>.99;w.settings.hitStrength=0;w.settings.shakeStrength=0;
    w.adventure.currentId=config.room;w.progression.level=config.level;w.progression.ranks.damage=config.damage;w.progression.ranks.gunfu=config.gunfu;w.progression.ranks.element=config.element;w.progression.ranks.health=config.health;w.progression.apply();
    const gun=weaponPool(config.tier).find(g=>g.family==='ash_needle')!,fire=weaponPool(config.tier).find(g=>g.family==='ember_lantern')!,enemy=w.spawn('chaser',vec(500,340)),enemyHP=enemy.actor.health.maxHP;
    enemy.actor.health.maxHP=enemy.actor.health.hp=1e5;const single=w.damage.tryHit(w.attacks.weaponSnapshot(gun,w.settings),enemy.actor,vec()).actualDamage;
    let reaction=0;w.events.on('damageApplied',e=>{if(e.targetId===enemy.actor.id&&e.attack.secondary&&!e.attack.nativeDamage)reaction+=e.amount;});enemy.actor.elemental.mark='ice';enemy.actor.elemental.markTime=5;enemy.actor.elemental.reactionCooldown=0;w.damage.tryHit(w.attacks.weaponSnapshot(fire,w.settings),enemy.actor,vec());
    return {...config,weapon:gun.displayName,baseDamage:gun.damage,enemyHP,enemyArmor:enemy.armor,singleShot:single,shotsToKill:Math.ceil(enemyHP/single),thermal:reaction,maxPlayerHP:w.player.stats.maxHP};
  });
  expect(stages[2].singleShot).toBeGreaterThan(stages[0].singleShot*6);expect(stages[2].shotsToKill).toBeLessThan(stages[0].shotsToKill);expect(stages[2].thermal).toBeGreaterThan(stages[0].thermal*6);
  mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/balance-report.json',JSON.stringify({note:'Representative valid level/build combinations, no critical hits. Chaser armour is applied to direct weapon hits; thermal bypasses armour. This is numerical validation, not a human difficulty rating.',stages,depth:[1,6,12,18].map(depth=>({depth,...depthScale(depth)})),weapons:WEAPONS.map(g=>({id:g.id,name:g.displayName,tier:g.tier,family:g.family,damage:g.damage,rate:g.attackRate,count:g.projectileCount,pierce:g.pierce,bounce:g.bounce,armorPierce:g.armorPierce??0,effect:g.effect??null,mechanic:g.description}))},null,2));
});
