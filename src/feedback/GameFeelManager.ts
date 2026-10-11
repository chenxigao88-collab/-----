import { PRESETS, type PresetId } from '../data/gameFeel';
import { Random, vec, add, mul, direction, type Vec2 } from '../core/types';
import type { Actor } from '../actors/Actor';
import { handPosition } from '../actors/Actor';
import type { TimeManager } from '../core/TimeManager';
import type { AudioManager } from './AudioManager';
import type { EventBus } from '../core/EventBus';
import type { DebugSettings } from '../data/player';
import type {BulletStyle} from '../data/weaponMechanics';
export interface Particle { pos: Vec2; velocity: Vec2; life: number; total: number; size: number; color: string }
export interface DamageNumber { pos: Vec2; amount: number; life: number; critical: boolean; attackId: number; targetId: number }
export interface Ring { pos: Vec2; radius: number; life: number; total: number; color: string }
export interface Ghost { pos: Vec2; facing: number; life: number; animation: number;dashElapsed:number }
export interface WeaponFlash {pos:Vec2;angle:number;style:BulletStyle;charge:number;life:number;total:number}
export class GameFeelManager {
  particles: Particle[] = []; numbers: DamageNumber[] = []; rings: Ring[] = []; ghosts: Ghost[] = [];
  weaponFlashes:WeaponFlash[]=[];
  shake = 0; shakeLife = 0; offset = vec(); hurtFlash = 0; ghostTimer = 0;
  private off: (() => void)[];
  constructor(private time: TimeManager, private audio: AudioManager, private random: Random, private settings: DebugSettings, events: EventBus, private actor: (id: number) => Actor | undefined) {
    this.off = [events.on('damageApplied', e => {
      const target = this.actor(e.targetId);
      const id = target?.faction === 'player' ? 'player_hurt' : e.attack.heavy ? 'heavy_hit' : 'light_hit';
      if (target) target.flash = PRESETS[id].flash;
      if (!e.attack.feelGranted) { e.attack.feelGranted = true; this.play(id, e.position); }
      const existing = this.numbers.find(n => n.attackId === e.attack.id && n.targetId === e.targetId && n.life > .5);
      if (existing) existing.amount += e.amount;
      else { this.numbers.push({ pos: vec(e.position.x + this.random.range(-7, 7), e.position.y - 44-(target?.launch.height??0)), amount: e.amount, life: .55, critical: e.attack.critical, attackId: e.attack.id, targetId: e.targetId }); if (this.numbers.length > 60) this.numbers.shift(); }
    }), events.on('perfectDodge', e => { this.play('perfect_dodge', e.position); }),
    events.on('actorDied', e => { this.burst(e.position, 9, e.faction === 'player' ? '#91ddd4' : '#b99163'); this.rings.push({ pos: e.position, radius: 21, life: .25, total: .25, color: '#bca27a' }); })];
  }
  play(id: PresetId, pos: Vec2) {
    const preset = PRESETS[id]; this.time.requestHitStop(preset.stop);
    this.shake = Math.max(this.shake, preset.shake); this.shakeLife = Math.max(this.shakeLife, preset.duration);
    this.burst(pos, preset.particles, preset.color); this.audio.play(preset.sound);
    if (id === 'player_hurt') this.hurtFlash = .12;
    if (id === 'explosion' || id === 'perfect_dodge') this.rings.push({ pos: { ...pos }, radius: id === 'explosion' ? 76 : 25, life: .25, total: .25, color: preset.color });
  }
  burst(pos: Vec2, count: number, color: string) {
    for (let i = 0; i < count; i++) this.particles.push({ pos: vec(pos.x, pos.y - 15), velocity: mul(direction(this.random.range(0, Math.PI * 2)), this.random.range(35, 120)), life: .32, total: .32, size: this.random.next() > .6 ? 2 : 1, color });
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }
  shot(actor: Actor, heavy: boolean, melee: boolean,muzzleLength=24) {
    this.audio.play(actor.faction === 'enemy' ? 'shot' : melee ? 'slash' : heavy ? 'shotgun' : 'shot');
    if (!melee) { const point = add(handPosition(actor), mul(direction(actor.aim), muzzleLength)); this.burst(point, 2, actor.faction === 'player' ? '#9deae2' : '#f49779'); }
  }
  weaponShot(actor:Actor,style:BulletStyle,charge=0,length=24){
    const sounds:Record<BulletStyle,string>={needle:'shot',gravel:'shotgun',crystal:'ice',fireball:'fire',arc:'electric',wind:'wind',bolt:'bolt',ring:'ring',wave:'slash'};
    this.audio.play(sounds[style]);actor.recoil=style==='bolt'?1.7:1;
    const color=style==='fireball'?'#ffb15e':style==='bolt'?'#ffe1a4':style==='crystal'?'#c7ffff':style==='arc'?'#cfb4ff':'#b8ffe4';
    const muzzle=add(handPosition(actor),mul(direction(actor.aim),length));
    this.burst(muzzle,style==='bolt'?8:style==='fireball'?5:2,color);
    this.weaponFlashes.push({pos:muzzle,angle:actor.aim,style,charge,life:.12,total:.12});if(this.weaponFlashes.length>24)this.weaponFlashes.shift();
    if(charge>=.99||style==='gravel'){this.shake=Math.max(this.shake,style==='bolt'?2.2:1);this.shakeLife=Math.max(this.shakeLife,.09);}
  }
  step(dt: number, actors: Actor[]) {
    this.shakeLife = Math.max(0, this.shakeLife - dt); if (this.shakeLife === 0) this.shake = 0;
    const strength = this.shake * this.settings.shakeStrength * Math.min(1, this.shakeLife / .1);
    this.offset = vec(Math.round(this.random.range(-strength, strength)), Math.round(this.random.range(-strength, strength)));
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    for (const a of actors) { a.flash = Math.max(0, a.flash - dt); a.recoil = Math.max(0, a.recoil - dt * 10); }
    for (const p of this.particles) { p.life -= dt; p.pos = add(p.pos, mul(p.velocity, dt)); p.velocity = mul(p.velocity, Math.exp(-3 * dt)); }
    for (const n of this.numbers) { n.life -= dt; n.pos.y -= 23 * dt; }
    for (const r of this.rings) r.life -= dt;
    for (const g of this.ghosts) g.life -= dt;
    this.particles = this.particles.filter(p => p.life > 0); this.numbers = this.numbers.filter(n => n.life > 0); this.rings = this.rings.filter(r => r.life > 0); this.ghosts = this.ghosts.filter(g => g.life > 0);
    for(const flash of this.weaponFlashes)flash.life-=dt;this.weaponFlashes=this.weaponFlashes.filter(f=>f.life>0);
    if (this.rings.length > 40) this.rings.splice(0, this.rings.length - 40);
  }
  dashGhost(actor: Actor, dt: number,dashElapsed=0) { this.ghostTimer -= dt; if (this.ghostTimer <= 0) { this.ghostTimer = .035; this.ghosts.push({ pos: { ...actor.pos }, facing: actor.facing, life: .16, animation: actor.animation,dashElapsed }); } }
  dispose() { for (const off of this.off) off(); this.particles = []; this.numbers = []; this.rings = []; this.ghosts = []; this.weaponFlashes=[];this.offset = vec(); }
}
