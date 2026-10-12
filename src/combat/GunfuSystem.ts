import { handPosition, type Actor } from '../actors/Actor';
import type { Player } from '../actors/Player';
import type { EventBus } from '../core/EventBus';
import { angleTo, constrain, direction, distance, normal, sub, type Vec2 } from '../core/types';
import type { DebugSettings } from '../data/player';
import { GUNFU_BEATS, VIOLET_BEATS } from '../data/gunfu';
import type { AttackSystem } from './AttackSystem';
import type { DamageSystem } from './DamageSystem';
import type { WeaponController } from './WeaponController';
import type { ResonanceSystem } from './ResonanceSystem';
import { sweptSectorCapsule } from '../world/Collision';
import {ATTACK_PACING} from '../data/attackPacing';

type Kind = 'none' | 'routine' | 'counter' | 'cross';
interface Prime { slot: number; weapon: string; remaining: number }
interface Sequence {
  id: number; kind: Exclude<Kind, 'none'>; phase: number; elapsed: number; totalElapsed: number;
  contact: boolean; aim: Vec2; fromSlot: number; angle: number; enhanced: boolean; swapped: boolean;
  queued: boolean; awaiting: boolean; chainTime: number; landingRemaining: number;
}
export interface GunfuEffect { kind: 'downslash' | 'uppercut' | 'sweep' | 'kick' | 'shot' | 'land'; pos: Vec2; angle: number; life: number; total: number }

export class GunfuSystem {
  cooldown = 0; completed = 0; counterWindow = 0; crossWindow = 0; lastName = '';
  effects: GunfuEffect[] = [];
  sweepRangeBonus:()=>number=()=>0;
  private primed = new Map<number, Prime>();
  private sequence?: Sequence;
  private nextId = 1;
  private off: () => void;
  private counted = new Set<number>();
  private wasDashing = false; private dashPrimed = false;

  constructor(private player: Player, private weapons: WeaponController, private attacks: AttackSystem,
    private damage: DamageSystem, private style: ResonanceSystem, private actors: () => Actor[],
    events: EventBus, private interrupt: (actor: Actor) => void, private swapped: (from: number, to: number) => void) {
    this.off = events.on('damageApplied', e => {
      const c = e.attack;
      if (c.faction !== 'player' || c.secondary) return;
      if (c.gunfu === 'finisher' && c.gunfuSequence !== undefined) {
        if (!this.counted.has(c.gunfuSequence)) {
          this.counted.add(c.gunfuSequence); this.completed++;
          if (this.counted.size > 100) this.counted.delete(this.counted.values().next().value!);
        }
      } else if (!c.gunfu && c.element !== 'none') {
        this.primed.set(e.targetId, { slot: this.weapons.slots.findIndex(s => s.data.id === c.weaponId), weapon: c.weaponId, remaining: 1 });
      }
    });
  }
  get busy() { return Boolean(this.sequence); }
  private get violet(){return this.player.actor.character==='violet';}
  private get beats(){return this.violet?VIOLET_BEATS:GUNFU_BEATS;}
  private get duration(){return this.beats.reduce((sum,beat)=>sum+beat.duration,0);}
  private get boundaries(){return this.violet?[1,2,3,4,5]:[1,2,3,6];}
  private get landingPhase(){return this.violet?-1:6;}
  private get landingDuration(){return this.landingPhase<0?0:this.beats[this.landingPhase].duration*.25;}
  get kind(): Kind { return this.sequence?.kind ?? 'none'; }
  get movementScale() {
    if(this.sequence?.awaiting)return this.sequence.landingRemaining>0?0:1;
    const pose = this.sequence ? this.beats[this.sequence.phase].pose : undefined;
    return pose === 'backflip' || pose === 'airshot' ? 0 : pose === 'recover' ? .6 : this.busy ? .25 : 1;
  }
  get window() { return Math.max(this.sequence?.awaiting?this.sequence.chainTime:0,this.counterWindow, this.crossWindow, 0); }
  private hasPrime() { return [...this.primed.values()].some(p => p.slot === this.weapons.active && p.weapon === this.weapons.current.data.id); }
  dashStarted() { this.dashPrimed = this.hasPrime(); this.wasDashing = true; this.cancel(); }
  perfect() { this.counterWindow = .8; this.style.award(20); }

  request(aim: Vec2) {
    if(this.sequence){
      const seq=this.sequence;
      if(this.player.dashing||!this.player.actor.health.alive||seq.queued)return false;
      if(seq.awaiting){
        seq.awaiting=false;seq.elapsed=seq.phase===this.landingPhase?this.landingDuration-seq.landingRemaining:0;seq.contact=false;
        seq.aim={...aim};seq.angle=angleTo(this.player.actor.pos,aim);this.syncPose(seq);return true;
      }
      // Buffer one following segment only near the end of the current one.
      if(this.boundaries.includes(seq.phase+1)&&seq.elapsed>=this.beats[seq.phase].duration-.12){seq.queued=true;seq.aim={...aim};return true;}
      return false;
    }
    if (this.busy || this.cooldown > 0 || this.player.dashing || this.attacks.busy ||
        !this.player.actor.health.alive || this.weapons.switchLock > 0) return false;
    const kind = this.counterWindow > 0 ? 'counter' : this.crossWindow > 0 ? 'cross' : 'routine';
    this.sequence = { id: this.nextId++, kind, phase: 0, elapsed: 0, totalElapsed: 0,
      contact: false, aim: { ...aim }, fromSlot: this.weapons.active,
      angle: angleTo(this.player.actor.pos, aim), enhanced: this.style.ready, swapped: false,
      queued:false,awaiting:false,chainTime:0,landingRemaining:0 };
    this.counterWindow = 0; this.crossWindow = 0;
    if(!this.player.actor.moving)this.player.actor.facing=this.sequence.angle;
    this.syncPose(this.sequence);
    return true;
  }

  private syncPose(seq: Sequence) {
    const beat = this.beats[seq.phase], p = Math.min(1, seq.elapsed / beat.duration);
    const lift = beat.pose === 'backflip' ? 28 * Math.sin(p * Math.PI / 2)
      : beat.pose === 'airshot' ? 28 - 8 * p
      : beat.pose === 'landspin' ? 20 * Math.max(0, 1 - p / .25) : 0;
    const pose=beat.shot&&this.weapons.current.data.category==='melee'?(this.violet?'greatspin':'sweep'):beat.pose;
    this.player.actor.action = { kind: pose, elapsed: seq.elapsed, duration: beat.duration,
      angle: seq.angle, gunfu: true, lift, airborne: lift > 8 };
    this.player.actor.aim = angleTo(handPosition(this.player.actor), seq.aim);
  }

  private effect(kind: GunfuEffect['kind'], pos: Vec2, angle: number, duration = .13) {
    duration*=ATTACK_PACING.player;
    this.effects.push({ kind, pos: { ...pos }, angle, life: duration, total: duration });
    if (this.effects.length > 20) this.effects.shift();
  }

  private contact(seq: Sequence, settings: DebugSettings) {
    const beat = this.beats[seq.phase], actor = this.player.actor;
    if (beat.shot) { this.fire(seq, beat.shot, settings); return; }
    if (beat.damage === undefined || beat.range === undefined || beat.arc === undefined) return;
    const range=beat.range+(seq.phase===2?this.sweepRangeBonus():0);
    const c = this.attacks.snapshot(actor, beat.damage * settings.damageMultiplier * this.player.stats.damageMultiplier,
      'gunfu-body', 'heavy', beat.pose === 'kick'||beat.pose==='greatspin');
    c.gunfu = 'body';c.gunfuSequence=seq.id;c.gunfuPhase=seq.phase; c.chargeGranted = true; c.knockback = beat.knockback ?? 0;
    if(beat.pose==='greatspin')c.launch={height:30,duration:.8*ATTACK_PACING.player,distance:36};
    const targets = this.actors().filter(a => a.faction === 'enemy' && a.health.alive &&
      sweptSectorCapsule(actor.pos, a.hurtbox.capsule(a.pos), range, seq.angle - beat.arc! / 2, seq.angle + beat.arc! / 2))
      .sort((a, b) => distance(a.pos, actor.pos) - distance(b.pos, actor.pos)).slice(0, beat.pose === 'sweep'||beat.pose==='greatspin' ? 3 : 1);
    for (const target of targets) {
      if (this.damage.tryHit(c, target, normal(sub(target.pos, actor.pos))).applied) this.interrupt(target);
    }
    this.effect(beat.pose==='greatslash'?'downslash':beat.pose==='greatupper'?'uppercut':beat.pose==='greatspin'?'sweep':beat.pose as 'downslash'|'uppercut'|'sweep'|'kick', actor.pos, seq.angle);
  }

  private fire(seq: Sequence, shot: 'air' | 'ground', settings: DebugSettings) {
    const actor=this.player.actor,target=this.nearestEnemy();
    const endpoint=target?target.hurtbox.center(target.pos):undefined;
    if(endpoint){seq.aim={...endpoint};seq.angle=angleTo(actor.pos,endpoint);this.syncPose(seq);}
    const from = this.weapons.active;
    const oldLock = this.weapons.switchLock;
    if (shot === 'ground') this.weapons.active = 1 - seq.fromSlot;
    this.syncPose(seq);
    const enhanced = shot === 'ground' && seq.enhanced && this.style.ready && this.weapons.current.skillCooldown <= 0;
    if (!this.attacks.requestPlayer(enhanced, settings, seq.aim, { multiplier: this.violet?.65:.8, sequence: seq.id,shot })) {
      this.weapons.active = from; this.weapons.switchLock = oldLock;
      return;
    }
    if(this.weapons.current.data.category==='melee')this.effect('sweep',actor.pos,actor.aim,.2);
    else this.effect('shot', this.attacks.muzzle(actor, this.weapons.current.data.muzzleLength), actor.aim, .10);
    if (shot === 'ground') {
      this.weapons.switchLock = Math.max(.16, oldLock); this.weapons.slots[from].pending = undefined;
      seq.swapped = true; this.swapped(from, this.weapons.active);
      if (enhanced) this.style.consume();
      this.lastName = this.violet?'紫鸢 · 巨刃三连枪':seq.kind === 'counter' ? '破绽枪舞' : seq.kind === 'cross' ? '滑步枪舞' : '六式枪斗';
      this.primed.clear();
    }
  }

  private nearestEnemy():Actor|undefined{
    const actor=this.player.actor;
    return this.actors().filter(a=>a.faction==='enemy'&&a.health.alive&&a.runId===actor.runId)
      .sort((a,b)=>distance(actor.pos,a.pos)-distance(actor.pos,b.pos)||a.id-b.id)[0];
  }

  step(dt: number, settings: DebugSettings, aim?: Vec2) {
    if (dt <= 0) return;
    for (const e of this.effects) e.life -= dt;
    this.effects = this.effects.filter(e => e.life > 0);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.counterWindow = Math.max(0, this.counterWindow - dt); this.crossWindow = Math.max(0, this.crossWindow - dt);
    for (const [id, p] of this.primed) {
      p.remaining -= dt;
      if (p.remaining <= 0 || !this.actors().some(a => a.id === id && a.health.alive)) this.primed.delete(id);
    }
    if (this.wasDashing && !this.player.dashing) {
      if (this.dashPrimed) this.crossWindow = .45;
      this.wasDashing = false; this.dashPrimed = false;
    }
    const seq = this.sequence;
    if (!seq) {
      const action = this.player.actor.action;
      if (action) { action.elapsed += dt; if (action.elapsed >= action.duration) this.player.actor.action = undefined; }
      return;
    }
    if (!this.player.actor.health.alive || this.weapons.active !== (seq.swapped ? 1 - seq.fromSlot : seq.fromSlot)) { this.cancel(); return; }
    if (aim) seq.aim = { ...aim };
    if(this.beats[seq.phase].shot){const target=this.nearestEnemy();if(target){seq.aim=target.hurtbox.center(target.pos);seq.angle=angleTo(this.player.actor.pos,seq.aim);}}
    let remaining = dt;
    while (remaining > 1e-9 && this.sequence === seq) {
      if(seq.awaiting){
        const slice=Math.min(remaining,seq.chainTime);seq.chainTime=Math.max(0,seq.chainTime-slice);remaining-=slice;
        if(seq.phase===this.landingPhase&&seq.landingRemaining>0){
          seq.landingRemaining=Math.max(0,seq.landingRemaining-slice);seq.elapsed=this.landingDuration-seq.landingRemaining;
          this.syncPose(seq);
        }
        if(seq.landingRemaining===0&&!(this.violet&&[4,5].includes(seq.phase)&&!this.player.actor.moving))this.player.actor.action=undefined;
        if(seq.chainTime<=1e-9)this.cancel();
        return;
      }
      const beat = this.beats[seq.phase], previous = seq.elapsed;
      const slice = Math.min(remaining, beat.duration - seq.elapsed);
      seq.elapsed += slice; seq.totalElapsed += slice; remaining -= slice;
      if (beat.pose === 'backflip') {
        const reverse = direction(seq.angle);
        this.player.actor.pos = constrain({ x: this.player.actor.pos.x - reverse.x * 32 * slice / beat.duration,
          y: this.player.actor.pos.y - reverse.y * 32 * slice / beat.duration }, this.player.actor.hurtbox.radius);
      }
      this.syncPose(seq);
      if (beat.contact !== undefined && !seq.contact && previous <= beat.contact && seq.elapsed + 1e-9 >= beat.contact) {
        seq.contact = true; this.contact(seq, settings);
      }
      if (seq.elapsed + 1e-9 >= beat.duration) {
        seq.phase++;
        if (seq.phase === this.beats.length) {
          if(!this.player.actor.moving)this.player.actor.facing=seq.angle;
          this.sequence = undefined; this.player.actor.action = undefined; this.cooldown = .45;
          return;
        }
        seq.elapsed = 0; seq.contact = false;
        if(this.boundaries.includes(seq.phase)){
          if(!seq.queued){
            seq.awaiting=true;seq.chainTime=.45;seq.landingRemaining=seq.phase===this.landingPhase?this.landingDuration:0;
            if(seq.phase!==this.landingPhase&&!(this.violet&&[4,5].includes(seq.phase)))this.player.actor.action=undefined;
            continue;
          }
          seq.queued=false;
        }
        if (this.beats[seq.phase].pose !== 'backflip' && this.beats[seq.phase].pose !== 'airshot')
          seq.angle = angleTo(this.player.actor.pos, seq.aim);
        if (this.beats[seq.phase].pose === 'landspin') this.effect('land', this.player.actor.pos, seq.angle, .20);
        this.syncPose(seq);
      }
    }
  }

  hint() {
    const seq = this.sequence;
    if (seq) return seq.awaiting?`再按右键 · ${this.beats[seq.phase].label}`:this.beats[seq.phase].label;
    if (this.cooldown > 0) return `收势恢复 ${this.cooldown.toFixed(1)}s`;
    if (this.counterWindow > 0) return '右键 · 破绽枪舞';
    if (this.crossWindow > 0) return '右键 · 滑步枪舞';
    return this.violet?'右键六段 · 巨刃下劈 → 上挑 → 回旋 → 跪射两枪 → 回身换枪':'右键每按一次接一段 · 下劈 → 上撩 → 横扫 → 踢翻射击 → 旋身开枪';
  }
  snapshot() {
    const s = this.sequence;
    return { kind: this.kind, stage: s ? this.beats[s.phase].pose : 'ready', window: this.window, cooldown: this.cooldown,
      completed: this.completed, nextWeapon: this.weapons.slots[1 - this.weapons.active].data.displayName,
      hint: this.hint(), style: this.style.meter, phase: s?.phase ?? -1, awaiting: s?.awaiting??false, queued:s?.queued??false, character:this.player.actor.character,
      progress: s ? s.totalElapsed / this.duration : 0, remaining: s ? this.duration - s.totalElapsed : 0 };
  }
  cancel() {
    if (this.sequence) this.cooldown = Math.max(.25, this.cooldown);
    this.sequence = undefined; this.player.actor.action = undefined;
  }
  clear() {
    this.cancel(); this.cooldown = 0; this.primed.clear(); this.counterWindow = 0; this.crossWindow = 0;
    this.wasDashing = false; this.dashPrimed = false; this.effects = [];
  }
  dispose() { this.off(); this.clear(); this.counted.clear(); }
}
