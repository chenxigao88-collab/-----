import { EventBus } from '../core/EventBus';
import { TimeManager } from '../core/TimeManager';
import { Player } from '../actors/Player';
import { Enemy } from '../actors/Enemy';
import { EnemyBrain } from '../actors/EnemyBrain';
import { WeaponController } from '../combat/WeaponController';
import { ResonanceSystem } from '../combat/ResonanceSystem';
import { DamageSystem } from '../combat/DamageSystem';
import { ProjectileSystem } from '../combat/ProjectileSystem';
import { MeleeSystem } from '../combat/MeleeSystem';
import { AttackSystem, type AttackContext } from '../combat/AttackSystem';
import { RoomDirector } from '../room/RoomDirector';
import { GameFeelManager } from '../feedback/GameFeelManager';
import { capsuleTouchesCircle } from './Collision';
import { AudioManager } from '../feedback/AudioManager';
import { Random, distance, normal, sub, constrain, type Vec2, type RunState, type EnemyKind } from '../core/types';
import { emptyInput,type InputFrame } from '../core/InputManager';
import { UltimateSystem } from '../combat/UltimateSystem';
import type { DebugSettings } from '../data/player';
import { ENEMIES } from '../data/enemies';
import { ElementSystem } from '../combat/ElementSystem';
import { AbilitySystem } from '../combat/AbilitySystem';
import { WEAPONS, STARTER_WEAPONS } from '../data/weapons';
import { GunfuSystem } from '../combat/GunfuSystem';
import { PERFECT_DODGE_RULES } from '../data/player';
import { CHARACTERS,type CharacterId } from '../data/characters';
import { AdventureSystem } from '../room/AdventureSystem';
import { RuneSystem } from '../combat/RuneSystem';
import { navigationPoint,resolveObstacles,obstacleContact } from './Obstacles';
import { handPosition } from '../actors/Actor';
import {ProgressionSystem} from '../room/ProgressionSystem';
import {StorySystem} from '../room/StorySystem';
import {HazardSystem} from '../room/HazardSystem';
import {EnemySpecialSystem} from '../combat/EnemySpecialSystem';
import {depthScale} from '../data/chapter';
import {ELEMENT_RULES} from '../data/elements';
import {DefenseSystem} from '../room/DefenseSystem';
import {TravelMapSystem} from '../room/TravelMapSystem';
export class World {
  readonly events = new EventBus(); readonly time = new TimeManager(); readonly random = new Random();
  readonly player: Player; readonly weapons: WeaponController; readonly resonance: ResonanceSystem;
  readonly damage: DamageSystem; readonly projectiles: ProjectileSystem; readonly melee: MeleeSystem;
  readonly attacks: AttackSystem; readonly brain: EnemyBrain; readonly room: RoomDirector; readonly feel: GameFeelManager;
  readonly elements:ElementSystem; readonly abilities:AbilitySystem;
  readonly gunfu:GunfuSystem;
  readonly ultimate:UltimateSystem;
  readonly adventure:AdventureSystem;readonly runes:RuneSystem;
  readonly progression:ProgressionSystem;readonly story:StorySystem;readonly hazards:HazardSystem;readonly special:EnemySpecialSystem;
  readonly defense:DefenseSystem;
  readonly map:TravelMapSystem;
  enemies: Enemy[] = []; private nextEntityId = 2;
  state: RunState = 'ready'; previousState: 'ready' | 'playing' = 'ready'; elapsed = 0; resultElapsed = 0;
  toast = ''; toastLife = 0; peakEntities = 1;
  checkpointAvailable=false;
  private disposed = false;
  private swapBuffer=0;private skillBuffer=0;private skillSlot=0;private skillAim:Vec2={x:600,y:340};
  constructor(readonly runId: number, readonly settings: DebugSettings, readonly audio: AudioManager,readonly adventureMode=false,readonly defenseMode=false) {
    this.player = new Player(runId); this.weapons = new WeaponController(this.events);
    this.damage = new DamageSystem(this.player, this.events, id => this.enemies.find(e => e.actor.id === id)?.encounter ?? -1,()=>this.time.canRewardPerfect&&!this.ultimate?.active);
    this.projectiles = new ProjectileSystem(() => this.actors, this.damage, (context, pos, radius, excluded) => this.explode(context, pos, radius, excluded));
    this.melee = new MeleeSystem(() => this.actors, this.damage, (context, target) => this.explode(context, target.pos, context.explosion!.radius, target.id));
    this.feel = new GameFeelManager(this.time, this.audio, this.random, settings, this.events, id => this.actors.find(a => a.id === id));
    this.attacks = new AttackSystem(this.player, this.weapons, this.projectiles, this.melee, this.random, this.events, (actor, heavy, melee,length,style,charge) => style?this.feel.weaponShot(actor,style,charge,length):this.feel.shot(actor, heavy, melee,length),request=>this.abilities.spawn(request));
    this.projectiles.launched=p=>{const actor=this.actors.find(a=>a.id===p.context.sourceId);if(actor)this.feel.weaponShot(actor,p.style,p.charged);};
    this.brain = new EnemyBrain(this.player, this.attacks,(from,target,radius)=>this.adventureMode?navigationPoint(from,target,radius,this.adventure.template.obstacles):target,()=>this.adventureMode&&(this.adventure.template.depth??1)>9&&this.adventure.currentId!=='core'?2:1,e=>this.special.specialAttack(e));
    this.room = new RoomDirector((kind, pos, encounter,elite) => this.spawn(kind, pos, encounter,elite).actor.id, () => this.player.actor.pos);
    this.resonance = new ResonanceSystem(this.weapons, this.player, this.events);
    this.elements=new ElementSystem(()=>this.actors,this.damage,this.attacks,this.events,actor=>{
      const enemy=this.enemies.find(e=>e.actor===actor);if(enemy?.kind==='boss')return;enemy?.stun();this.melee.cancel(actor.id);
    });
    this.abilities=new AbilitySystem(()=>this.actors,this.damage,this.attacks,this.elements,this.events);
    this.gunfu=new GunfuSystem(this.player,this.weapons,this.attacks,this.damage,this.resonance,()=>this.actors,this.events,actor=>{
      // Body hits use the same damage listener as bullets and weapon attacks.
      this.melee.cancel(actor.id);
    },(from,to)=>this.events.emit('weaponSwitched',{from,to}));
    this.runes=new RuneSystem(this);this.adventure=new AdventureSystem(this,adventureMode);
    this.ultimate=new UltimateSystem(this);
    this.progression=new ProgressionSystem(this);this.story=new StorySystem(this);this.hazards=new HazardSystem(this);this.special=new EnemySpecialSystem(this);
    this.defense=new DefenseSystem(this,defenseMode);if(defenseMode){this.room.configure([]);this.player.actor.pos={x:480,y:380};this.player.actor.previous={...this.player.actor.pos};}
    this.map=new TravelMapSystem(this);
    const runeModifier=this.damage.modifier;
    this.damage.modifier=(attack,target)=>{
      const enemy=this.enemies.find(e=>e.actor===target);
      // Reactions bypass armour; weapon splash/chain retains its weapon's penetration.
      const armor=enemy&&(!attack.secondary||attack.nativeDamage)?enemy.armor*(target.elemental.exposureTime>0?ELEMENT_RULES.exposedArmor:1)*(1-Math.max(0,Math.min(1,attack.armorPierce??0))):0;
      return runeModifier(attack,target)*this.progression.multiplier(attack,target)*this.special.multiplier(attack,target)*100/(100+armor);
    };
    this.damage.absorb=(target,amount)=>this.special.absorb(target,amount);
    this.elements.reactionMultiplier=attack=>this.progression.reactionMultiplier(attack);
    this.projectiles.obstacleContact=(from,to,radius,c)=>defenseMode?this.defense.contact(from,to,radius,c?.defenseTurret?c.sourceId:undefined):adventureMode?obstacleContact(from,to,radius,this.adventure.template.obstacles):null;
    this.damage.validContact=(c,target)=>{
      const sword=WEAPONS.find(w=>w.id===(c.equippedWeaponId??c.weaponId))?.category==='melee';
      if(defenseMode){const source=this.actors.find(a=>a.id===c.sourceId);if(!source||c.secondary||(c.faction==='player'&&!sword&&c.gunfu!=='body'))return true;return !this.defense.contact(source.pos,target.pos,0);}
      if(!adventureMode||c.secondary||(c.gunfu==='finisher'&&!sword)||(c.faction==='player'&&c.gunfu!=='body'&&!sword))return true;
      const source=this.actors.find(a=>a.id===c.sourceId);if(!source)return true;
      return !obstacleContact(source.faction==='player'?handPosition(source):source.hurtbox.center(source.pos),target.hurtbox.center(target.pos),0,this.adventure.template.obstacles);
    };
    this.events.on('perfectDodge',e=>{if(e.runId===this.runId&&this.time.requestEnemyFreeze())this.gunfu.perfect();});
    this.events.on('damageApplied', e => {
      const contact=this.actors.find(a=>a.id===e.targetId);if(contact&&e.attack.faction==='player'&&e.amount>0)this.attacks.contact(e.attack,contact);
      if (e.attack.faction === 'player' && !e.attack.secondary && !e.attack.defenseTurret && !e.killed&&e.amount>0) {
        const enemy = this.enemies.find(enemy => enemy.actor.id === e.targetId);
        if(enemy?.kind!=='boss'){
        const duration = e.attack.gunfu === 'body' ? (e.attack.heavy ? .45 : .34)
          : e.attack.gunfu === 'finisher' ? .3 : e.attack.heavy ? .24 : .16;
        const interrupted=enemy?.hitstun(duration * (enemy.elite ? .9 : 1), e.attack.id);
        if (interrupted) this.melee.cancel(e.targetId);
        if(enemy&&interrupted&&e.attack.launch){const launch=e.attack.launch,source=this.actors.find(a=>a.id===e.attack.sourceId),away=normal(sub(enemy.actor.pos,source?.pos??this.player.actor.pos)),scale=enemy.elite?.8:1;
          enemy.actor.launch.start(launch.height*scale,launch.duration+(this.runes.has('feather')?.15:0),{x:away.x*launch.distance*scale,y:away.y*launch.distance*scale});enemy.enter('Stunned');this.melee.cancel(e.targetId);}
        }
      }
      if(e.attack.explosion&&!e.attack.explosionTriggered){
        e.attack.explosionTriggered=true;
        const target=this.actors.find(a=>a.id===e.targetId);
        this.explode(e.attack,target?.hurtbox.center(target.pos)??e.position,e.attack.explosion.radius,e.targetId);
      }
      if (e.targetId === this.player.actor.id){this.melee.cancel(e.targetId);this.gunfu.cancel();this.attacks.cancelPrimary();}
    });
    this.events.on('actorDied', e => { if (e.runId !== this.runId) return;const enemy=this.enemies.find(n=>n.actor.id===e.id);if(this.adventureMode&&enemy&&enemy.encounter===this.room.wave&&!this.adventure.memory.cleared)this.progression.gain(enemy.kind==='boss'?0:enemy.elite?40:4+Math.floor((this.adventure.template.depth??1)/6));this.room.onDeath(e.id, e.encounter); });
    this.events.on('message', e => { this.toast = e.text; this.toastLife = e.text.startsWith('宝箱获得')||e.text.startsWith('获得')?3:1.5; });
    this.events.on('weaponSwitched', () => { this.audio.play('swap'); this.feel.rings.push({ pos: { ...this.player.actor.pos }, radius: 22, life: .18, total: .18, color: '#e6c58e' }); });
  }
  get actors() { return [this.player.actor, ...this.enemies.map(e => e.actor)]; }
  spawn(kind: EnemyKind, pos: Vec2, encounter = -1,elite=false) {
    const scale=this.adventureMode&&kind!=='boss'?depthScale(this.adventure.template.depth??1):this.defenseMode?{hp:1,damage:1+Math.max(0,this.defense.wave-1)*.12,speed:1,armor:Math.max(0,this.defense.wave-1)*5}:{hp:1,damage:1,speed:1};
    if(this.adventureMode&&kind!=='boss')scale.hp*=1.15;
    const enemy = new Enemy(this.nextEntityId++, this.runId, kind, constrain(pos, ENEMIES[kind].radius), encounter,elite,scale,this.adventureMode?720:240); this.enemies.push(enemy);
    this.peakEntities = Math.max(this.peakEntities, this.enemies.length + this.projectiles.projectiles.length + 1); return enemy;
  }
  startTrial() {
    if (this.state !== 'ready') return false;
    if(this.defenseMode)return this.defense.startWave();
    if(this.adventureMode)return this.adventure.start();
    if (this.room.start()) { this.state = 'playing'; this.events.emit('message', { text: '第一波 · 余烬苏醒' }); return true; }
    return false;
  }
  pause() { if (this.state === 'ready' || this.state === 'playing') { this.previousState = this.state; this.state = 'paused';this.swapBuffer=0;this.skillBuffer=0;this.attacks.cancelPrimary(); } }
  resume() { if (this.state === 'paused') this.state = this.previousState; }
  step(dt: number, input: InputFrame) {
    if (this.disposed || this.state === 'paused') return;
    this.audio.muted = this.settings.mute; this.time.hitStrength = this.settings.hitStrength;
    if (this.state === 'victory' || this.state === 'dead') { this.resultElapsed += dt; this.feel.step(dt, this.actors);this.elements.presentation(dt); this.toastLife = Math.max(0, this.toastLife - dt); return; }
    const t = this.time.step(dt); this.elapsed += t.player;
    if(this.defenseMode){
      if(input.build)this.defense.toggle();
      if(this.defense.buildOpen&&this.defense.canBuild){if(input.rotate)this.defense.rotation=!this.defense.rotation;if(input.place)this.defense.place(input.aim);if(input.skill)this.defense.toggle();input={...input,fire:false,skill:false,ultimate:false,ultimateSecond:false};}
      if(input.interact&&!this.defense.buildOpen&&['preparation','intermission'].includes(this.defense.phase))this.defense.startWave();
    }
    if((input.ultimate||input.ultimateSecond)&&t.player>0)this.ultimate.request(input.aim,input.ultimateSecond?2:1);
    if(this.ultimate.active){input={...emptyInput(),aim:input.aim};t.enemy=0;this.swapBuffer=0;this.skillBuffer=0;}
    if(this.time.freezeJustEnded)this.player.actor.invulnerability.grant('hurt',PERFECT_DODGE_RULES.recoveryProtection);
    const previousDashes = this.player.dashes;
    this.player.step(t.player, input, this.settings,this.ultimate.active?0:this.gunfu.movementScale*(this.adventureMode?this.hazards.moveScale:1)); this.weapons.step(t.player);
    if(this.adventureMode)this.player.actor.pos=resolveObstacles(this.player.actor.pos,this.player.actor.previous,this.player.actor.hurtbox.radius,this.adventure.template.obstacles);
    if(this.defenseMode)this.player.actor.pos=this.defense.resolve(this.player.actor.pos,this.player.actor.previous,this.player.actor.hurtbox.radius);
    if (this.player.dashes !== previousDashes){this.melee.cancel(this.player.actor.id);this.gunfu.dashStarted();this.attacks.cancelPrimary();}
    if(input.interact&&!this.defenseMode){if(this.adventureMode){this.adventure.interact();if((this.state as RunState)==='paused'||(this.state as RunState)==='victory')return;}else if(distance(this.player.actor.pos,{x:480,y:375})<=42)this.startTrial();}
    if(input.swap)this.swapBuffer=.1;
    if(this.swapBuffer>0&&this.weapons.trySwitch(this.player.dashing||this.attacks.busy||this.gunfu.busy)){this.swapBuffer=0;this.attacks.cancelPrimary();}
    if(input.skill){this.skillBuffer=.1;this.skillSlot=this.weapons.active;this.skillAim={...input.aim};}
    if(this.skillSlot!==this.weapons.active)this.skillBuffer=0;
    if(t.player>0&&this.skillBuffer>0){const wasBusy=this.gunfu.busy;if(this.gunfu.request(this.skillAim)){this.skillBuffer=0;if(!wasBusy)this.attacks.cancelPrimary();}}
    this.attacks.primary(t.player,input.fire,this.settings,input.aim,!this.gunfu.busy&&!this.ultimate.active&&this.skillBuffer<=0);
    this.swapBuffer=Math.max(0,this.swapBuffer-t.player);this.skillBuffer=Math.max(0,this.skillBuffer-t.player);
    if(this.ultimate.active)this.ultimate.step(t.player);else this.gunfu.step(t.player,this.settings,input.aim);
    this.elements.step(t.player,t.enemy);
    for(const enemy of this.enemies)enemy.actor.previous={...enemy.actor.pos};
    for (const enemy of this.enemies) {const airborne=enemy.actor.launch.active;if(this.defenseMode)this.defense.brain.step(enemy,t.enemy);else this.brain.step(enemy, t.enemy, this.enemies);if(airborne&&!enemy.actor.launch.active&&enemy.actor.health.alive){this.feel.burst(enemy.actor.pos,5,'#c7b7e7');this.feel.rings.push({pos:{...enemy.actor.pos},radius:19,life:.18,total:.18,color:'#baa5d8'});}}
    if(this.adventureMode)for(const enemy of this.enemies)enemy.actor.pos=resolveObstacles(enemy.actor.pos,enemy.actor.previous,enemy.actor.hurtbox.radius,this.adventure.template.obstacles);
    if(!this.defenseMode)this.special.step(t.enemy);if(this.adventureMode)this.hazards.step(t.enemy);
    this.abilities.step(t.player);this.projectiles.step(t.player, t.enemy); this.melee.step(t.player, t.enemy);
    this.runes.step(t.player);
    this.player.actor.invulnerability.step(t.player);
    if (this.player.dashing) this.feel.dashGhost(this.player.actor, t.player,this.player.dashElapsed);
    this.feel.step(t.presentation, this.actors);this.elements.presentation(t.presentation);this.abilities.presentation(t.presentation); this.toastLife = Math.max(0, this.toastLife - t.presentation);
    if(this.defenseMode)this.defense.step(t.player,t.enemy);
    this.enemies = this.enemies.filter(enemy => enemy.actor.health.alive);
    // Outcome is resolved after all hits in a step; player death wins simultaneous final kills.
    if (!this.player.actor.health.alive||(this.defenseMode&&this.defense.core.hp<=0)) {if(this.defenseMode){this.defense.failure=this.player.actor.health.alive?'核心被摧毁':'行者倒下';this.defense.phase='lost';}this.finish('dead');}
    else if(this.defenseMode){if(this.defense.phase==='won')this.finish('victory');}
    else {
      const before = this.room.wave;
      this.room.step(this.ultimate.active?0:t.enemy);
      if (!this.adventureMode&&before !== this.room.wave) this.events.emit('message', { text: `第${this.room.wave}波 · ${this.room.wave === 3 ? '锁线猎场' : '炉卫来袭'}` });
      if (this.room.state === 'victory'){if(this.adventureMode)this.adventure.clearRoom();else this.finish('victory');}
      if(this.adventureMode)this.adventure.step(t.player,t.enemy);
    }
  }
  prepareRoomTransition(){this.attacks.clear();this.special.reset();this.hazards.reset();this.enemies=[];this.projectiles.clear();this.melee.clear();this.abilities.clear();this.elements.clear();this.gunfu.cancel();this.gunfu.effects=[];this.runes.transition();this.swapBuffer=0;this.skillBuffer=0;this.player.dashRemaining=0;this.feel.weaponFlashes=[];this.feel.ghosts=[];this.feel.numbers=[];this.feel.particles=[];this.adventure.furnace={warning:0,cooldown:0,firing:0};}
  completeAdventure(){if(this.adventureMode&&this.adventure.currentId==='core'&&this.adventure.memory.cleared)this.finish('victory');}
  private finish(state: 'dead' | 'victory') {
    this.state = state; this.ultimate.cancel();this.projectiles.clear(); this.melee.clear();this.elements.clear();this.abilities.clear();this.gunfu.clear();this.swapBuffer=0;this.skillBuffer=0; this.room.pending = []; this.time.clear(); this.enemies = [];
    this.attacks.clear();
    if(this.defenseMode){this.defense.pending=[];this.defense.shells=[];this.defense.buildOpen=false;}
    if (state === 'victory') this.audio.play('victory');else this.audio.play('death');
  }
  private explode(context: AttackContext, pos: Vec2, radius: number, excluded?: number) {
    const secondary = this.attacks.secondary(context, context.explosion?.damage ?? 20);
    secondary.nativeDamage=true;
    this.feel.play('explosion', pos);
    const ring=this.feel.rings[this.feel.rings.length-1];if(ring)ring.radius=radius;
    for (const actor of this.actors) {
      if (actor.id === excluded || actor.faction === context.faction || !actor.health.alive || !capsuleTouchesCircle(actor.hurtbox.capsule(actor.pos), pos, radius)) continue;
      this.damage.tryHit(secondary, actor, normal(sub(actor.pos, pos)));
    }
    const weapon=WEAPONS.find(w=>w.id===(context.equippedWeaponId??context.weaponId));
    if(weapon?.family==='ember_lantern'&&weapon.tier>=2&&!this.enemies.some(e=>e.kind==='boss'&&!e.actor.health.alive)){const field=this.attacks.secondary(context,context.damage*.22);field.nativeDamage=true;this.abilities.spawn({context:field,pos,mode:'zone',radius:radius*.7,duration:1.5,delay:0});if(weapon.tier===3){const echo=this.attacks.secondary(context,context.damage*.5);echo.nativeDamage=true;this.abilities.spawn({context:echo,pos,mode:'strike',radius:radius*.85,duration:0,delay:1.5});}}
  }
  debugWeapon(slot: number, id: string) { this.attacks.clear();this.melee.cancel(this.player.actor.id); this.weapons.replace(slot, id); this.resonance.clear();this.gunfu.clear(); }
  selectLoadout(slot:number,id:string) {
    if((slot!==0&&slot!==1)||!STARTER_WEAPONS.some(w=>w.id===id))return false;
    if(this.state!=='ready'&&!(this.state==='paused'&&this.previousState==='ready'))return false;
    const other=1-slot,old=this.weapons.slots[slot].data.id;
    if(this.weapons.slots[other].data.id===id)this.weapons.replace(other,old);
    this.debugWeapon(slot,id);this.projectiles.clear();this.abilities.clear();this.swapBuffer=0;this.skillBuffer=0;return true;
  }
  selectCharacter(id:CharacterId){
    if(!CHARACTERS.some(c=>c.id===id)||(this.state!=='ready'&&!(this.state==='paused'&&this.previousState==='ready')))return false;
    this.ultimate.clear();this.gunfu.clear();this.melee.cancel(this.player.actor.id);this.player.actor.character=id;
    this.player.actor.action=undefined;this.player.actor.animation=0;this.player.dashRemaining=0;
    this.projectiles.clear();this.abilities.clear();this.feel.ghosts=[];this.swapBuffer=0;this.skillBuffer=0;return true;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;this.defense.dispose();this.ultimate.dispose();this.adventure.dispose();this.runes.dispose(); this.gunfu.dispose();this.resonance.dispose();this.elements.dispose();this.abilities.dispose(); this.feel.dispose(); this.projectiles.clear(); this.melee.clear(); this.room.clear(); this.enemies = []; this.events.clear(); this.time.clear(); this.audio.clear();
  }
  snapshot() {
    return { runId: this.runId, state: this.state, hp: this.player.actor.health.hp, pos: { ...this.player.actor.pos }, dash: this.player.dashCooldown,
      enemyCount: this.enemies.length, wave: this.defenseMode?this.defense.wave:this.room.wave, waveAlive: this.defenseMode?this.defense.alive.length:this.room.aliveIds.size, pending: this.defenseMode?this.defense.pending.length:this.room.pending.length,
      projectiles: this.projectiles.projectiles.length, particles: this.feel.particles.length, subscriptions: this.events.count,
      meter: this.resonance.meter, activations: this.resonance.activations, slow: this.time.slowScale, hitStop: this.time.hitStop,
      hits: this.damage.hits, perfectDodges: this.damage.perfectDodges, peak: this.projectiles.peak,
      activeWeapon: this.weapons.current.data.id, slotCooldowns: this.weapons.slots.map(s => s.cooldown),reactions:this.elements.activations,reactionCounts:{...this.elements.counts},areas:this.abilities.areas.length,burns:this.elements.burnCount,gunfu:this.gunfu.snapshot(),ultimate:this.ultimate.snapshot(),freeze:this.time.enemyFreezeRemaining,freezeCooldown:this.time.freezeRewardCooldown,adventure:this.adventureMode?this.adventure.snapshot():null,defense:this.defenseMode?this.defense.snapshot():null,shield:this.damage.shield,progression:this.progression.snapshot(),story:this.story.snapshot(),boss:this.special.boss?{hp:this.special.boss.actor.health.hp,phase:this.special.boss.bossPhase,poise:this.special.boss.poise}:null };
  }
}
