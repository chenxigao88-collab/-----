import { afterEach, describe, expect, it } from 'vitest';
import { World } from '../src/world/World';
import { AudioManager } from '../src/feedback/AudioManager';
import { defaultDebug } from '../src/data/player';
import { emptyInput } from '../src/core/InputManager';
import { vec } from '../src/core/types';
import { ELEMENTS, REACTIONS, getReaction, type Element } from '../src/data/elements';
import { WEAPONS,STARTER_WEAPONS } from '../src/data/weapons';
import { ElementalComponent } from '../src/combat/components';
const worlds:World[]=[];
const make=()=>{const w=new World(1,defaultDebug(),new AudioManager());w.settings.hitStrength=0;worlds.push(w);return w;};
afterEach(()=>{for(const w of worlds)w.dispose();worlds.length=0;});
const dummy=(w:World,x=300)=>w.spawn('shooter',vec(x,300),-1,true);
const hit=(w:World,target:ReturnType<typeof dummy>,element:Element,amount=1)=>{
  const c=w.attacks.snapshot(w.player.actor,amount,'test','swift',false);c.element=element;c.knockback=0;
  w.damage.tryHit(c,target.actor,vec());return c;
};
const advance=(w:World,s:number)=>{for(let n=0;n<Math.ceil(s*120);n++)w.step(1/120,emptyInput());};

describe('five elements and ten reactions',()=>{
  it('ships twenty-four weapons, five elements and every unordered reaction exactly once',()=>{
    expect(WEAPONS).toHaveLength(24);expect(new Set(WEAPONS.map(w=>w.element)).size).toBe(5);
    const elements=Object.keys(ELEMENTS) as Element[];expect(REACTIONS).toHaveLength(10);
    for(const a of elements)for(const b of elements){expect(getReaction(a,b)).toBe(getReaction(b,a));expect(Boolean(getReaction(a,b))).toBe(a!==b);}
  });
  it.each(REACTIONS)('$name works in both orders and consumes the mark',r=>{
    for(const pair of [r.elements,[r.elements[1],r.elements[0]]]){
      const w=make(),e=dummy(w);hit(w,e,pair[0]);hit(w,e,pair[1]);
      expect(w.elements.counts[r.id]).toBe(1);expect(e.actor.elemental.mark).toBeUndefined();expect(e.actor.elemental.reactionCooldown).toBe(1.2);
    }
  });
  it('same-element hits refresh a five-second mark',()=>{const w=make(),e=dummy(w);hit(w,e,'fire');w.elements.step(3);hit(w,e,'fire');expect(e.actor.elemental.markTime).toBe(5);w.elements.step(5.01);expect(e.actor.elemental.mark).toBeUndefined();});
  it('accepts a new mark during cooldown and preserves it until another element can react',()=>{
    const w=make(),e=dummy(w);hit(w,e,'fire');hit(w,e,'ice');hit(w,e,'wind');hit(w,e,'earth');
    expect(e.actor.elemental.mark).toBe('wind');expect(w.elements.activations).toBe(1);
    w.elements.step(1.21);hit(w,e,'earth');expect(w.elements.counts.sand).toBe(1);
  });
  it('one shotgun context attaches and reacts only once on the same victim',()=>{
    const w=make(),e=dummy(w);hit(w,e,'fire');const c=hit(w,e,'lightning');for(let n=0;n<5;n++)w.damage.tryHit(c,e.actor,vec());
    expect(w.elements.counts.blast).toBe(1);expect(e.actor.elemental.mark).toBeUndefined();
  });
  it('overlapping blasts from a shared attack damage each victim only once',()=>{
    const w=make(),a=dummy(w),b=dummy(w,340),c=dummy(w,370);hit(w,a,'fire');hit(w,b,'fire');
    const attack=hit(w,a,'lightning');w.damage.tryHit(attack,b.actor,vec());expect(c.actor.health.hp).toBe(c.actor.health.maxHP-18);expect(w.elements.activations).toBe(2);
  });
  it('a fatal primary hit still triggers an explosion around the dead target',()=>{
    const w=make(),a=dummy(w),b=dummy(w,340);hit(w,a,'fire');hit(w,a,'lightning',1000);expect(a.actor.health.alive).toBe(false);expect(b.actor.health.hp).toBe(b.actor.health.maxHP-18);expect(w.elements.activations).toBe(1);
  });
  it('a reaction that finishes a surviving primary victim emits death exactly once',()=>{
    const w=make(),e=dummy(w);e.actor.health.hp=30;let deaths=0;w.events.on('actorDied',()=>deaths++);
    hit(w,e,'fire');hit(w,e,'ice',14);expect(e.actor.health.alive).toBe(false);expect(deaths).toBe(1);
  });
  it('conduct includes the main target and damages no more than three targets',()=>{
    const w=make(),actors=[300,350,400,450].map(x=>dummy(w,x));hit(w,actors[0],'wind');hit(w,actors[0],'lightning');
    expect(actors.map(e=>e.actor.health.maxHP-e.actor.health.hp)).toEqual([18,16,16,0]);
  });
  it('a dead main target still occupies one conduct chain slot',()=>{
    const w=make(),actors=[300,350,400,450].map(x=>dummy(w,x));hit(w,actors[0],'wind');hit(w,actors[0],'lightning',1000);
    expect(actors[0].actor.health.hp).toBe(0);expect(actors.slice(1).map(e=>e.actor.health.maxHP-e.actor.health.hp)).toEqual([16,16,0]);
  });
  it('burn lasts five seconds, deals fifteen total damage, and never interrupts or charges',()=>{
    const w=make(),e=dummy(w);hit(w,e,'fire');hit(w,e,'wind');const before=w.resonance.meter;e.enter('Attack');
    w.elements.step(4.5);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-16);expect(w.elements.burnCount).toBe(1);w.elements.step(.5);
    expect(e.actor.health.hp).toBe(e.actor.health.maxHP-17);expect(w.elements.burnCount).toBe(0);expect(e.state).toBe('Attack');expect(w.resonance.meter).toBe(before);expect(before).toBe(0);
  });
  it('exposure bursts for twelve then boosts direct damage by 25% for five seconds but excludes secondary damage',()=>{
    const w=make(),e=dummy(w);hit(w,e,'fire');hit(w,e,'earth');hit(w,e,'earth',25);
    expect(e.actor.health.hp).toBe(e.actor.health.maxHP-45);const c=w.attacks.secondary(w.attacks.snapshot(w.player.actor,1,'test','swift',false),25);w.damage.tryHit(c,e.actor,vec());
    expect(e.actor.health.hp).toBe(e.actor.health.maxHP-70);w.elements.step(5.01);hit(w,e,'earth',25);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-95);
  });
  it('normal direct damage interrupts through hitstun without consuming elemental control',()=>{const w=make(),e=dummy(w);e.enter('Attack');hit(w,e,'fire');expect(e.state).toBe('Stunned');expect(e.hitstunRemaining).toBeGreaterThan(0);expect(e.actor.elemental.hardTime).toBe(0);});
  it('fracture interrupts an unfired attack, then applies a three-second slow',()=>{
    const w=make(),e=dummy(w);e.enter('Attack');hit(w,e,'ice');hit(w,e,'lightning');expect(e.state).toBe('Stunned');expect(e.actor.elemental.hardTime).toBe(.25);
    w.elements.step(.25);expect(e.actor.elemental.protectionTime).toBe(2);expect(e.actor.elemental.moveScale).toBe(.7);
  });
  it('shock leaves already-fired enemy projectiles intact',()=>{
    const w=make(),e=dummy(w);const c=w.attacks.snapshot(e.actor,10,'fixture','heavy',false);
    w.projectiles.spawn(c,vec(200,200),0,{speed:200,range:500});hit(w,e,'earth');hit(w,e,'lightning');expect(w.projectiles.projectiles).toHaveLength(1);
  });
  it('bind prevents autonomous movement while permitting an attack in range',()=>{
    const w=make(),e=dummy(w,480);e.attackCooldown=0;e.actor.pos.y=300;e.enter('Move');e.elapsed=.5;hit(w,e,'ice');hit(w,e,'earth');
    const before={...e.actor.pos};w.brain.step(e,.17,[]);w.brain.step(e,.01,[]);w.brain.step(e,.01,[]);expect(e.actor.pos).toEqual(before);expect(e.state).toBe('Attack');
    w.elements.step(.6);expect(e.actor.elemental.moveScale).toBe(.7);expect(e.actor.elemental.slowTime).toBe(3);
  });
  it('hard control grants two seconds of protection without blocking damage or soft slow',()=>{
    const s=new ElementalComponent();expect(s.control('root',.6,.25,3)).toBe(true);s.step(.6);expect(s.control('stun',.2)).toBe(false);
    s.slow(.35,3);expect(s.moveScale).toBe(.65);s.step(2.01);expect(s.control('stun',.2)).toBe(true);
  });
  it('slows keep independent durations and use the strongest active effect',()=>{
    const s=new ElementalComponent();s.slow(.25,4);s.slow(.35,1);expect(s.moveScale).toBe(.65);s.step(1);expect(s.moveScale).toBe(.75);expect(s.slowTime).toBe(3);s.step(3);expect(s.moveScale).toBe(1);
  });
});

describe('new weapon traits, skills and loadouts',()=>{
  it('frost penetration deals 26 then 18 without building style',()=>{
    const w=make();w.debugWeapon(0,'frost_string');const a=dummy(w,550),b=dummy(w,600);a.actor.pos.y=b.actor.pos.y=351;a.actor.previous={...a.actor.pos};b.actor.previous={...b.actor.pos};w.player.actor.aim=0;
    expect(w.attacks.requestPlayer(false,w.settings)).toBe(true);w.projectiles.step(.2,.2);expect(a.actor.health.hp).toBe(a.actor.health.maxHP-26);expect(b.actor.health.hp).toBe(b.actor.health.maxHP-18);
    expect(a.actor.elemental.mark).toBe('ice');expect(b.actor.elemental.mark).toBe('ice');expect(w.resonance.meter).toBe(0);
  });
  it('native splash is capped at three others and never attaches an element',()=>{
    const w=make(),actors=[300,310,320,330,340].map(x=>dummy(w,x));const c=w.attacks.snapshot(w.player.actor,24,'ember_lantern','arcane',false);c.element='fire';c.native={splash:6};
    w.damage.tryHit(c,actors[0].actor,vec());expect(actors.map(e=>e.actor.health.maxHP-e.actor.health.hp)).toEqual([24,6,6,6,0]);expect(actors[1].actor.elemental.mark).toBeUndefined();expect(w.resonance.meter).toBe(0);
  });
  it('native lightning jumps deal secondary damage without attaching elements or building style',()=>{
    const w=make(),actors=[300,350,400,450].map(x=>dummy(w,x));const c=w.attacks.snapshot(w.player.actor,20,'thunder_branch','arcane',false);c.element='lightning';c.native={chain:6};w.damage.tryHit(c,actors[0].actor,vec());
    expect(actors.map(e=>e.actor.health.maxHP-e.actor.health.hp)).toEqual([20,6,6,0]);expect(actors[2].actor.elemental.mark).toBeUndefined();expect(actors[3].actor.elemental.mark).toBeUndefined();expect(w.resonance.meter).toBe(0);
  });
  it('the primary lightning hit reacts once while native jumps preserve other marks',()=>{
    const w=make(),actors=[300,350,400].map(x=>dummy(w,x));for(const e of actors)hit(w,e,'wind');w.resonance.meter=0;
    const c=w.attacks.snapshot(w.player.actor,20,'thunder_branch','arcane',false);c.element='lightning';c.native={chain:6};w.damage.tryHit(c,actors[0].actor,vec());
    expect(actors.map(e=>e.actor.health.maxHP-e.actor.health.hp)).toEqual([37,23,23]);expect(w.elements.counts.conduct).toBe(1);expect(actors[1].actor.elemental.mark).toBe('wind');expect(actors[2].actor.elemental.mark).toBe('wind');expect(w.resonance.meter).toBe(0);
  });
  it('fire field deals 18 over three seconds with one attachment and no style',()=>{
    const w=make(),e=dummy(w);w.debugWeapon(0,'ember_lantern');expect(w.attacks.requestPlayer(true,w.settings,e.actor.hurtbox.center(e.actor.pos))).toBe(true);
    w.abilities.step(.49);expect(e.actor.health.hp).toBe(e.actor.health.maxHP);w.abilities.step(.01);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-3);expect(e.actor.elemental.mark).toBe('fire');
    w.abilities.step(2.5);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-18);expect(w.resonance.meter).toBe(0);expect(w.abilities.areas).toHaveLength(0);
  });
  it('leaving and re-entering a fire field never grants a second element attachment',()=>{
    const w=make(),e=dummy(w);w.debugWeapon(0,'ember_lantern');w.attacks.requestPlayer(true,w.settings,e.actor.hurtbox.center(e.actor.pos));w.abilities.step(.5);
    e.actor.elemental.mark=undefined;e.actor.pos.x=700;w.abilities.step(.5);e.actor.pos.x=300;w.abilities.step(.5);expect(e.actor.elemental.mark).toBeUndefined();expect(w.resonance.meter).toBe(0);
  });
  it('lightning strike warns for 0.4 seconds and hits each target once for 34',()=>{
    const w=make(),e=dummy(w);w.debugWeapon(0,'thunder_branch');w.attacks.requestPlayer(true,w.settings,e.actor.hurtbox.center(e.actor.pos));w.abilities.step(.39);expect(e.actor.health.hp).toBe(e.actor.health.maxHP);
    w.abilities.step(.01);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-34);w.abilities.step(.1);expect(e.actor.health.hp).toBe(e.actor.health.maxHP-34);expect(e.actor.elemental.mark).toBe('lightning');
  });
  it('field does not consume a pending direct-hit resonance bonus',()=>{
    const w=make();w.debugWeapon(0,'ember_lantern');w.weapons.current.pending={kind:'next_damage',multiplier:1.15,label:'test'};w.attacks.requestPlayer(true,w.settings,vec(300,280));expect(w.weapons.current.pending).toBeDefined();
  });
  it('area attacks also execute a pending explosion only once',()=>{
    const w=make(),a=dummy(w),b=dummy(w,340);w.debugWeapon(0,'thunder_branch');w.weapons.current.pending={kind:'next_explosion',radius:76,damage:24,label:'test'};w.attacks.requestPlayer(true,w.settings,a.actor.hurtbox.center(a.actor.pos));w.abilities.step(.4);
    expect(a.actor.health.hp).toBe(a.actor.health.maxHP-34);expect(b.actor.health.hp).toBe(b.actor.health.maxHP-58);expect(w.feel.rings).toHaveLength(1);
  });
  it('all fifteen distinct loadouts preserve distinct slots and are selectable before battle',()=>{
    for(let a=0;a<STARTER_WEAPONS.length;a++)for(let b=a+1;b<STARTER_WEAPONS.length;b++){const w=make();expect(w.selectLoadout(0,STARTER_WEAPONS[a].id)).toBe(true);expect(w.selectLoadout(1,STARTER_WEAPONS[b].id)).toBe(true);expect(w.weapons.slots.map(s=>s.data.id)).toEqual([STARTER_WEAPONS[a].id,STARTER_WEAPONS[b].id]);}
  });
  it('selecting an already equipped weapon exchanges the slots, and combat locks loadout',()=>{
    const w=make();w.selectLoadout(0,'gravel_bell');expect(w.weapons.slots.map(s=>s.data.id)).toEqual(['gravel_bell','ash_needle']);w.startTrial();expect(w.selectLoadout(0,'frost_string')).toBe(false);
  });
  it('Q buffers briefly without resetting cooldowns or bypassing recovery',()=>{
    const w=make();w.weapons.switchLock=.05;w.weapons.slots[0].cooldown=1;const input=emptyInput();input.swap=true;w.step(1/120,input);expect(w.weapons.active).toBe(0);
    advance(w,.06);expect(w.weapons.active).toBe(1);expect(w.weapons.slots[0].cooldown).toBeGreaterThan(.9);
  });
  it('right-click starts a body action without firing an independent weapon skill',()=>{
    const w=make();w.weapons.current.cooldown=.2;const input=emptyInput();input.skill=true;w.step(1/120,input);
    expect(w.gunfu.busy).toBe(true);expect(w.gunfu.kind).toBe('routine');expect(w.attacks.shots).toBe(0);expect(w.weapons.current.skillCooldown).toBe(0);
    advance(w,.33);expect(w.gunfu.busy).toBe(true);expect(w.gunfu.snapshot().awaiting).toBe(true);expect(w.player.actor.action).toBeUndefined();expect(w.weapons.active).toBe(0);expect(w.attacks.shots).toBe(0);
  });
  it('right-click buffers briefly until an existing melee action finishes recovery',()=>{
    const w=make(),c=w.attacks.snapshot(w.player.actor,1,'fixture','heavy',false);w.melee.spawn(c,w.player.actor,20,1,0,0,.05);
    const input=emptyInput();input.skill=true;w.step(1/120,input);expect(w.gunfu.busy).toBe(false);advance(w,.07);
    expect(w.gunfu.busy).toBe(true);expect(w.gunfu.kind).toBe('routine');expect(w.attacks.shots).toBe(0);
  });
  it('a right-click buffer expires rather than starting an action after a long recovery',()=>{
    const w=make(),c=w.attacks.snapshot(w.player.actor,1,'fixture','heavy',false);w.melee.spawn(c,w.player.actor,20,1,0,0,.2);
    const input=emptyInput();input.skill=true;w.step(1/120,input);advance(w,.25);expect(w.gunfu.busy).toBe(false);expect(w.attacks.shots).toBe(0);expect(w.player.actor.action).toBeUndefined();
  });
  it('death and disposal remove all areas, burns and subscriptions',()=>{
    const w=make(),e=dummy(w);hit(w,e,'fire');hit(w,e,'wind');w.debugWeapon(0,'ember_lantern');w.attacks.requestPlayer(true,w.settings,vec(300,280));expect(w.abilities.areas).toHaveLength(1);
    w.player.actor.health.hp=0;w.step(1/120,emptyInput());expect(w.state).toBe('dead');expect(w.abilities.areas).toHaveLength(0);expect(w.elements.burnCount).toBe(0);w.dispose();expect(w.events.count).toBe(0);
  });
});
