import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {DEFENSE_WAVES,STRUCTURES} from '../src/data/defense';
import {blockContains} from '../src/world/DefenseNavigation';
const worlds:World[]=[];
function make(){const w=new World(1,defaultDebug(),new AudioManager(),false,true);worlds.push(w);w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.actor.invulnerability.setDebug(true);return w;}
function tick(w:World,seconds:number){for(let n=0;n<Math.ceil(seconds*60);n++)w.step(1/60,emptyInput());}
function isolated(w:World){w.defense.startWave();w.defense.spawned=DEFENSE_WAVES[0].count;w.defense.pending=[];}
function wall(w:World,x:number,y:number,vertical=false){w.defense.tool='wall';w.defense.rotation=vertical;expect(w.defense.place({x,y})).toBe(true);return w.defense.structures.at(-1)!;}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('Furnace defense construction and economy',()=>{
  it('places only valid freely chosen positions and charges on successful confirmation',()=>{const w=make(),d=w.defense;expect(d.gold).toBe(240);expect(d.place({x:480,y:280})).toBe(false);expect(d.place({x:112,y:280})).toBe(false);expect(d.place(w.player.actor.pos)).toBe(false);expect(d.gold).toBe(240);expect(d.place({x:332,y:240})).toBe(true);expect(d.structures[0].pos).toEqual({x:332,y:240});expect(d.gold).toBe(220);expect(d.place({x:332,y:240})).toBe(false);expect(d.gold).toBe(220);});
  it('joins walls edge to edge, rotates them and enforces separate live limits',()=>{const w=make(),d=w.defense;d.gold=10000;for(let n=0;n<12;n++)wall(w,208+n*32,164);expect(d.walls).toBe(12);expect(d.place({x:700,y:200})).toBe(false);d.hurt(d.structures[0],999);expect(d.walls).toBe(11);wall(w,208,164,true);expect(d.structures.at(-1)?.width).toBe(24);d.tool='ballista';for(let n=0;n<6;n++)expect(d.place({x:220+n*64,y:220})).toBe(true);expect(d.towers).toBe(6);expect(d.place({x:720,y:220})).toBe(false);});
  it('blocks actors and bullets, but rubble immediately opens the passage',()=>{const w=make(),d=w.defense,s=wall(w,320,240);expect(d.contact({x:250,y:240},{x:380,y:240},2)?.id).toBe(s.id);expect(d.resolve({x:350,y:240},{x:250,y:240},18).x).toBeLessThan(287);d.hurt(s,999);expect(d.contact({x:250,y:240},{x:380,y:240},2)).toBeNull();expect(d.resolve({x:350,y:240},{x:250,y:240},18)).toEqual({x:350,y:240});});
  it('constructs in combat before firing, repairs for gold and upgrades up to level three',()=>{const w=make(),d=w.defense;d.gold=1000;isolated(w);d.tool='ballista';expect(d.place({x:300,y:240})).toBe(true);const s=d.structures[0],e=d.spawnEnemy('raider',{x:350,y:240});e.actor.health.hp=e.actor.health.maxHP=10000;e.data.speed=0;tick(w,.8);expect(s.construction).toBeGreaterThan(0);expect(w.projectiles.projectiles).toHaveLength(0);tick(w,.7);expect(w.projectiles.projectiles.length+w.damage.hits).toBeGreaterThan(0);d.selected=s.id;d.hurt(s,50);const gold=d.gold;expect(d.repair()).toBe(true);expect(s.hp).toBe(s.maxHP);expect(d.gold).toBeLessThan(gold);expect(d.upgrade()).toBe(true);tick(w,1.3);expect(d.upgrade()).toBe(true);expect(s.level).toBe(3);expect(d.upgrade()).toBe(false);expect(d.sell()).toBe(false);});
  it('allows preparatory selling and does not duplicate refunds',()=>{const w=make(),d=w.defense,s=wall(w,320,240);d.selected=s.id;expect(d.sell()).toBe(true);expect(d.gold).toBe(232);expect(d.walls).toBe(0);expect(d.sell()).toBe(false);expect(d.gold).toBe(232);});
  it('uses one click per placement and keeps construction input out of attacks',()=>{const w=make();w.step(.01,{...emptyInput(),place:true,fire:true,aim:{x:320,y:240}});expect(w.defense.walls).toBe(1);expect(w.attacks.shots).toBe(0);w.step(.01,{...emptyInput(),fire:true,aim:{x:360,y:240}});expect(w.defense.walls).toBe(1);expect(w.attacks.shots).toBe(0);w.step(.01,{...emptyInput(),build:true});expect(w.defense.buildOpen).toBe(false);});
});
describe('Furnace defense target selection and dynamic paths',()=>{
  it('raiders advance to the core instead of chasing a remote player',()=>{const w=make();w.player.actor.pos={x:760,y:380};isolated(w);const e=w.defense.spawnEnemy('raider',{x:220,y:280});tick(w,4);expect(e.actor.pos.x).toBeGreaterThan(360);expect(w.defense.brain.snapshot().find(m=>m.id===e.actor.id)?.target).toBe(-1);tick(w,2);expect(w.defense.core.hp).toBeLessThan(1000);});
  it('routes around an open wall without getting stuck or damaging it',()=>{const w=make(),s=wall(w,320,280,true);w.player.actor.pos={x:760,y:380};isolated(w);const e=w.defense.spawnEnemy('raider',{x:220,y:280});tick(w,6);expect(e.actor.pos.x).toBeGreaterThan(400);expect(s.hp).toBe(s.maxHP);expect(w.defense.core.hp).toBeLessThan(1000);});
  it('breaks a fully sealed perimeter and reaches the core through the new gap',()=>{const w=make(),d=w.defense;d.gold=10000;w.player.actor.pos={x:740,y:380};for(const y of [232,328])for(const x of [432,464,496,528])wall(w,x,y);for(const x of [416,544])for(const y of [264,296])wall(w,x,y,true);expect(d.walls).toBe(12);isolated(w);const e=d.spawnEnemy('breaker',{x:260,y:280});tick(w,65);expect(d.destroyed).toBeGreaterThan(0);expect(e.actor.pos.x).toBeGreaterThan(425);expect(d.core.hp).toBeLessThan(1000);expect(d.structures.filter(s=>s.hp>0).every(s=>!blockContains(s,e.actor.pos,e.actor.hurtbox.radius-.1))).toBe(true);});
  it('replans when a wall is added during approach and when it is removed',()=>{const w=make(),d=w.defense;w.player.actor.pos={x:740,y:380};d.gold=10000;isolated(w);const e=d.spawnEnemy('raider',{x:220,y:280});tick(w,.4);const s=wall(w,320,280,true),rev=d.revision;tick(w,.8);expect(d.navigation.searches).toBeGreaterThan(0);d.hurt(s,999);expect(d.revision).toBeGreaterThan(rev);tick(w,4);expect(e.actor.pos.x).toBeGreaterThan(400);});
  it('does not transfer a committed attack from a destroyed wall to the core',()=>{const w=make(),d=w.defense;w.player.actor.pos={x:740,y:380};isolated(w);const s=wall(w,400,280,true),e=d.spawnEnemy('breaker',{x:360,y:280});s.hp=1;d.brain.step(e,.01);const mind=d.brain.snapshot()[0];expect(mind.target).toBe(s.id);for(let n=0;n<600&&e.state!=='Attack';n++)d.brain.step(e,1/60);expect(e.state).toBe('Attack');d.hurt(s,999);const hp=d.core.hp;d.brain.step(e,1);expect(d.core.hp).toBe(hp);expect(e.state).toBe('Recover');});
  it('artillery targets a tower and warns before its shell damages structures',()=>{const w=make(),d=w.defense;w.player.actor.pos={x:740,y:380};d.tool='ballista';d.place({x:340,y:240});const s=d.structures[0];s.cooldown=999;isolated(w);const e=d.spawnEnemy('artillery',{x:220,y:240});tick(w,2.1);expect(d.brain.snapshot().find(m=>m.id===e.actor.id)?.target).toBe(s.id);expect(d.shells.some(s=>s.enemy)).toBe(true);expect(s.hp).toBe(s.maxHP);tick(w,1);expect(s.hp).toBeLessThan(s.maxHP);});
  it('keeps a crowd advancing without overlapping the core or walls',()=>{const w=make(),d=w.defense;w.player.actor.pos={x:740,y:380};d.core.hp=100000;isolated(w);for(let n=0;n<20;n++)d.spawnEnemy('raider',{x:220+(n%4)*35,y:200+Math.floor(n/4)*35});tick(w,10);expect(d.core.hp).toBeLessThan(100000);expect(d.alive.every(e=>d.blocks.every(b=>!blockContains(b,e.actor.pos,e.actor.hurtbox.radius-.1)))).toBe(true);});
  it('only interceptors engage a nearby player and never starts more than two player windups together',()=>{
    const w=make(),d=w.defense;w.player.actor.pos={x:300,y:280};isolated(w);
    const raider=d.spawnEnemy('raider',{x:250,y:240});for(let n=0;n<5;n++)d.spawnEnemy('interceptor',{x:280+(n%2)*40,y:260+Math.floor(n/2)*25});
    for(let n=0;n<120;n++){w.step(1/60,emptyInput());const minds=d.brain.snapshot();expect(minds.filter(m=>m.attackTarget===1&&w.enemies.find(e=>e.actor.id===m.id)?.state==='Attack').length).toBeLessThanOrEqual(2);}
    expect(d.brain.snapshot().find(m=>m.id===raider.actor.id)?.target).toBe(-1);
    expect(d.brain.snapshot().some(m=>m.target===1)).toBe(true);
  });
});
describe('Furnace defense combat, waves and outcomes',()=>{
  it('all four turrets damage enemies with distinct weapons and elemental reactions',()=>{for(const kind of ['ballista','mortar','frost','lightning'] as const){const w=make(),d=w.defense;d.tool=kind;expect(d.place({x:340,y:240})).toBe(true);isolated(w);const e=d.spawnEnemy('raider',{x:420,y:240});e.actor.health.hp=e.actor.health.maxHP=10000;e.data.speed=0;if(kind==='frost'){e.actor.elemental.mark='fire';e.actor.elemental.markTime=5;}tick(w,3.5);expect(e.actor.health.hp).toBeLessThan(10000);if(kind==='mortar')expect(d.shells.length+w.abilities.areas.length).toBeGreaterThan(0);if(kind==='frost'){expect(e.actor.elemental.slowStrength).toBeGreaterThan(0);expect(w.elements.activations).toBeGreaterThan(0);}if(kind==='lightning')expect(STRUCTURES[kind].element).toBe('lightning');}});
  it('pays kills once and chains a killed bomber into enemies without harming allies',()=>{const w=make(),d=w.defense;isolated(w);const bug=d.spawnEnemy('bomber',{x:340,y:240}),e=d.spawnEnemy('raider',{x:375,y:240});e.actor.health.hp=e.actor.health.maxHP=10000;const core=d.core.hp,gold=d.gold,c=w.attacks.snapshot(w.player.actor,10000,'test','heavy',true);c.knockback=0;w.damage.tryHit(c,bug.actor,{x:0,y:0});expect(d.gold).toBe(gold+2);expect(e.actor.health.hp).toBeLessThan(10000);expect(d.core.hp).toBe(core);w.damage.tryHit(c,bug.actor,{x:0,y:0});expect(d.gold).toBe(gold+2);});
  it('a bomber that reaches the wall destroys it without rewarding self-detonation',()=>{const w=make(),d=w.defense;isolated(w);const s=wall(w,400,240),e=d.spawnEnemy('bomber',{x:365,y:240});s.hp=50;const gold=d.gold;d.detonate(e);expect(s.hp).toBe(0);expect(e.actor.health.alive).toBe(false);expect(d.gold).toBe(gold);});
  it('pauses the spawn schedule, construction, AI and shell travel together',()=>{const w=make(),d=w.defense;d.startWave();tick(w,2);w.pause();const before=JSON.stringify(w.snapshot());tick(w,5);expect(JSON.stringify(w.snapshot())).toBe(before);w.resume();tick(w,1);expect(d.waveClock).toBeGreaterThan(2);});
  it('resolves core destruction as defeat even while the player is alive',()=>{const w=make();w.defense.startWave();w.defense.hurt(w.defense.core,9999);tick(w,.02);expect(w.state).toBe('dead');expect(w.player.actor.health.alive).toBe(true);expect(w.defense.failure).toBe('核心被摧毁');});
  it('respects walls when locking Moon Sever and preserves all three wounds after travel is blocked',()=>{
    const w=make(),d=w.defense;w.selectCharacter('violet');w.player.actor.pos={x:440,y:340};w.ultimate.energy=200;d.gold=1000;wall(w,600,292);
    isolated(w);const e=d.spawnEnemy('raider',{x:650,y:340}),hidden=d.spawnEnemy('raider',{x:740,y:260});e.actor.health.hp=e.actor.health.maxHP=100000;hidden.actor.health.hp=hidden.actor.health.maxHP=100000;
    w.debugWeapon(0,'hush_edge');w.debugWeapon(1,'hush_edge');expect(w.ultimate.request({x:900,y:340},2)).toBe(true);expect(w.ultimate.targets).toEqual([e.actor]);
    tick(w,4.4);expect(w.ultimate.snapshot().wounds[e.actor.id]).toBe(3);tick(w,.3);expect(e.actor.health.hp).toBeLessThan(100000);expect(hidden.actor.health.hp).toBe(100000);tick(w,1);expect(w.ultimate.active).toBe(false);
  });
  it('does not apply player damage upgrades to tower damage or grant tower hitstop',()=>{
    const w=make(),d=w.defense;d.tool='ballista';d.place({x:340,y:240});isolated(w);const e=d.spawnEnemy('raider',{x:400,y:240});e.actor.health.hp=e.actor.health.maxHP=10000;e.data.speed=0;w.progression.ranks.damage=4;w.progression.ranks.gunfu=3;
    const hits:number[]=[];w.events.on('damageApplied',event=>{if(event.attack.defenseTurret)hits.push(event.amount);});tick(w,1);expect(hits.length).toBeGreaterThan(0);expect(hits.every(amount=>amount===16)).toBe(true);expect(w.time.hitStop).toBe(0);
  });
  it('waits for an already fired enemy shell before granting the intermission',()=>{
    const w=make(),d=w.defense;isolated(w);const e=d.spawnEnemy('artillery',{x:220,y:240});d.enemyShell(e,d.core.pos,30);
    const c=w.attacks.snapshot(w.player.actor,100000,'test','heavy',true);c.knockback=0;w.damage.tryHit(c,e.actor,{x:0,y:0});tick(w,.2);expect(d.phase).toBe('wave');expect(d.core.hp).toBe(1000);
    tick(w,.7);expect(d.core.hp).toBe(970);expect(d.phase).toBe('intermission');expect(d.shells.some(s=>s.enemy)).toBe(false);
  });
  it('defeating the siege boss does not erase adds or prematurely win the final wave',()=>{
    const w=make(),d=w.defense;isolated(w);d.wave=6;d.spawned=60;const boss=d.spawnEnemy('boss',{x:740,y:240}),add=d.spawnEnemy('raider',{x:240,y:240});const c=w.attacks.snapshot(w.player.actor,100000,'test','heavy',true);c.knockback=0;
    w.damage.tryHit(c,boss.actor,{x:0,y:0});tick(w,.1);expect(add.actor.health.alive).toBe(true);expect(w.state).toBe('playing');expect(d.phase).toBe('wave');
    w.damage.tryHit(c,add.actor,{x:0,y:0});tick(w,.1);expect(w.state).toBe('victory');
  });
  it('completes six waves, grants upgrades and mid/late weapon supplies, and wins only after the final adds die',()=>{const w=make(),d=w.defense;d.core.hp=100000;w.player.actor.invulnerability.setDebug(true);expect(d.startWave()).toBe(true);const cleared:number[]=[];
    for(let n=0;n<60000&&w.state!=='victory';n++){
      if(w.adventure.panel?.kind==='upgrade'){w.progression.choose(w.progression.offers[0]);continue;}
      for(const e of [...d.alive]){const c=w.attacks.snapshot(w.player.actor,100000,'test','heavy',true);c.knockback=0;w.damage.tryHit(c,e.actor,{x:0,y:0});}
      if(d.phase==='intermission'&&!cleared.includes(d.wave)){cleared.push(d.wave);if([2,4,5].includes(d.wave)){expect(d.supply).toHaveLength(3);const old=w.weapons.slots[0].data.id;expect(d.claimWeapon(d.supply[0],0)).toBe(true);expect(w.weapons.slots[0].data.id).not.toBe(old);expect(d.supply).toHaveLength(0);}if(!w.progression.pending)d.startWave();}
      if(d.phase==='intermission'&&!w.progression.pending)d.startWave();
      w.step(1/30,emptyInput());
    }
    expect(w.state).toBe('victory');expect(d.wave).toBe(6);expect(d.kills).toBe(224);expect(w.progression.level).toBeGreaterThan(6);expect(d.phase).toBe('won');expect(d.alive).toHaveLength(0);
  });
});
