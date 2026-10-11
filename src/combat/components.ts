import { vec, add, mul, length, type Vec2, type Faction } from '../core/types';
import { ELEMENT_RULES, type Element } from '../data/elements';
export class ElementalComponent {
  mark?: Element; markTime=0; reactionCooldown=0;
  slowStrength=0; slowTime=0; exposureTime=0;
  hardKind:'stun'|'root'='stun'; hardTime=0; protectionTime=0;
  tailSlow=0; tailDuration=0;
  private slows=new Map<number,number>();
  get moveScale() { return this.hardKind==='root'&&this.hardTime>0 ? 0 : this.slowTime>0 ? 1-this.slowStrength : 1; }
  slow(strength:number,duration:number) {
    if(strength<=0||duration<=0)return;
    this.slows.set(strength,Math.max(duration,this.slows.get(strength)??0));this.refreshSlow();
  }
  private refreshSlow(){this.slowStrength=0;this.slowTime=0;for(const [strength,time] of this.slows)if(strength>this.slowStrength){this.slowStrength=strength;this.slowTime=time;}}
  control(kind:'stun'|'root',duration:number,tailSlow=0,tailDuration=0) {
    if(this.protectionTime>0 || this.hardTime>0)return false;
    this.hardKind=kind;this.hardTime=duration;this.tailSlow=tailSlow;this.tailDuration=tailDuration;return true;
  }
  step(dt:number) {
    this.markTime=Math.max(0,this.markTime-dt);if(!this.markTime)this.mark=undefined;
    this.reactionCooldown=Math.max(0,this.reactionCooldown-dt);
    for(const [strength,time] of this.slows)if(time<=dt)this.slows.delete(strength);else this.slows.set(strength,time-dt);this.refreshSlow();
    this.exposureTime=Math.max(0,this.exposureTime-dt);this.protectionTime=Math.max(0,this.protectionTime-dt);
    if(this.hardTime>0) { this.hardTime=Math.max(0,this.hardTime-dt);if(!this.hardTime){this.protectionTime=ELEMENT_RULES.controlProtection;this.slow(this.tailSlow,this.tailDuration);this.tailSlow=0;this.tailDuration=0;} }
  }
}
export class HealthComponent {
  hp: number;
  constructor(public maxHP: number) { this.hp = maxHP; }
  get alive() { return this.hp > 0; }
  damage(amount: number) { const applied = Math.min(this.hp, Math.max(0, Math.round(amount))); this.hp -= applied; return applied; }
  heal() { this.hp = this.maxHP; }
}
export interface BodyShape { radius: number; offsetY: number; halfLength: number; offsetX?: number }
export interface Capsule { top: Vec2; bottom: Vec2; radius: number }
export class HurtboxComponent {
  lift=0;
  body: BodyShape;
  constructor(readonly radius: number, readonly faction: Faction) { this.body = { radius, offsetY: 0, halfLength: 0 }; }
  center(pos: Vec2): Vec2 { return vec(pos.x + (this.body.offsetX ?? 0), pos.y + this.body.offsetY-this.lift); }
  capsule(pos: Vec2): Capsule {
    const center = this.center(pos);
    return { top: vec(center.x, center.y - this.body.halfLength), bottom: vec(center.x, center.y + this.body.halfLength), radius: this.body.radius };
  }
}
export class HitboxComponent {
  readonly hitTargets = new Set<number>();
  constructor(readonly radius: number, readonly arc: number) {}
}
export class KnockbackComponent {
  velocity = vec();
  apply(impulse: Vec2, cap = 300) { this.velocity = add(this.velocity, impulse); const speed = length(this.velocity); if (speed > cap) this.velocity = mul(this.velocity, cap / speed); }
  step(dt: number): Vec2 { const movement = mul(this.velocity, dt); this.velocity = mul(this.velocity, Math.exp(-12 * dt)); return movement; }
}
export class LaunchComponent {
  elapsed=0; duration=0; peak=0; velocity=vec();
  get active(){return this.elapsed<this.duration;}
  get height(){if(!this.active)return 0;const p=this.elapsed/this.duration;return 4*this.peak*p*(1-p);}
  start(peak:number,duration:number,travel:Vec2){this.elapsed=0;this.duration=duration;this.peak=peak;this.velocity=mul(travel,1/duration);}
  step(dt:number){if(dt<=0||!this.active)return vec();const slice=Math.min(dt,this.duration-this.elapsed);this.elapsed=Math.min(this.duration,this.elapsed+slice);return mul(this.velocity,slice);}
}
export class InvulnerabilityComponent {
  private sources = new Map<string, number>();
  grant(source: string, duration: number) { this.sources.set(source, Math.max(duration, this.sources.get(source) ?? 0)); }
  revoke(source:string){this.sources.delete(source);}
  setDebug(enabled: boolean) { if (enabled) this.sources.set('debug', Infinity); else this.sources.delete('debug'); }
  get active() { return this.sources.size > 0; }
  has(source: string) { return this.sources.has(source); }
  step(dt: number) { for (const [source, time] of this.sources) { if (time <= dt) this.sources.delete(source); else this.sources.set(source, time - dt); } }
}
export class StatusComponent {
  private buffs = new Map<string, { multiplier: number; remaining: number }>();
  apply(key: string, multiplier: number, duration: number) { this.buffs.set(key, { multiplier, remaining: duration }); }
  multiplier(key: string) { return this.buffs.get(key)?.multiplier ?? 1; }
  remaining(key: string) { return this.buffs.get(key)?.remaining ?? 0; }
  step(dt: number) { for (const [key, buff] of this.buffs) { buff.remaining -= dt; if (buff.remaining <= 0) this.buffs.delete(key); } }
  clear() { this.buffs.clear(); }
}
