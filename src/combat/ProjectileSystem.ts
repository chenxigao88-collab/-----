import { add, sub, mul, direction, distance, angleTo, angleDiff, clamp, lerp, type Vec2 } from '../core/types';
import { segmentCapsule, wallContact } from '../world/Collision';
import type { Actor } from '../actors/Actor';
import type { AttackContext } from './AttackSystem';
import type { DamageSystem } from './DamageSystem';
import {handPosition} from '../actors/Actor';
import type {BulletStyle} from '../data/weaponMechanics';
export interface ProjectileOptions { speed: number; range: number; radius?: number; pierce?: number; bounce?: number; homing?: number; explosionRadius?: number; pierceMultiplier?:number;launchFrom?:Vec2;style?:BulletStyle;delay?:number;followAim?:boolean;returnTo?:number;charged?:number }
export interface Projectile {
  id: number; context: AttackContext; pos: Vec2; previous: Vec2; angle: number; speed: number; range: number; radius: number;
  lifetime: number; traveled: number; pierce: number; bounce: number; homing: number; explosionRadius: number; hitTargets: Set<number>; alive: boolean;
  pierceMultiplier:number;
  launchDistance:number;
  style:BulletStyle;delay:number;followAim:boolean;returnTo?:number;returning:boolean;charged:number;trail:Vec2[];
}
export class ProjectileSystem {
  projectiles: Projectile[] = []; nextId = 1; peak = 0; limit = 600; overflow = 0;
  obstacleContact:((from:Vec2,to:Vec2,radius:number)=>{t:number;normal:Vec2}|null)=()=>null;
  launched:((p:Projectile)=>void)=()=>{};
  constructor(private actors: () => Actor[], private damage: DamageSystem, private explosion: (context: AttackContext, pos: Vec2, radius: number, excluded?: number) => void) {}
  canAdd(count: number) { return this.projectiles.length + count <= this.limit; }
  spawn(context: AttackContext, origin: Vec2, angle: number, options: ProjectileOptions) {
    if (options.speed <= 0 || options.range <= 0) throw new Error('弹体速度/距离必须为正');
    if ((options.explosionRadius ?? 0) > 0 && ((options.pierce ?? 0) > 0 || (options.bounce ?? 0) > 0)) throw new Error('爆炸弹不能同时穿透/反弹');
    if (!this.canAdd(1)) { this.overflow++; return; }
    const start=options.launchFrom??origin;
    this.projectiles.push({ id: this.nextId++, context, pos: { ...start }, previous: { ...start }, angle, speed: options.speed, range: options.range, radius: options.radius ?? 2,launchDistance:distance(start,origin),
      lifetime: options.returnTo?3:Math.min(6, options.range / options.speed + .15), traveled: 0, pierce: options.pierce ?? 0, bounce: options.bounce ?? 0, homing: options.homing ?? 0, explosionRadius: options.explosionRadius ?? 0, pierceMultiplier:options.pierceMultiplier??1,hitTargets: new Set(), alive: true,
      style:options.style??'needle',delay:options.delay??0,followAim:options.followAim??false,returnTo:options.returnTo,returning:false,charged:options.charged??0,trail:[] });
    this.peak = Math.max(this.peak, this.projectiles.length);
  }
  step(playerDt: number, enemyDt: number) {
    const targets = this.actors();
    for (const p of this.projectiles) {
      let dt = p.context.faction === 'player' ? playerDt : enemyDt;
      if (!p.alive || dt <= 0) continue;
      const shared=p.context.sharedAttack;if(shared){p.context.explosionTriggered=shared.explosionTriggered;p.context.chargeGranted=shared.chargeGranted;p.context.feelGranted=shared.feelGranted;}
      if(p.delay>0){const source=targets.find(a=>a.id===p.context.sourceId);if(!source?.health.alive){p.alive=false;continue;}const wait=Math.min(dt,p.delay);p.delay-=wait;dt-=wait;if(p.delay>1e-8)continue;
        p.pos=handPosition(source);p.previous={...p.pos};if(p.followAim)p.angle=source.aim;p.launchDistance=0;this.launched(p);if(dt<=0)continue;
      }
      if(p.returnTo&&p.returning){const source=targets.find(a=>a.id===p.returnTo&&a.health.alive);if(!source){p.alive=false;continue;}const goal=handPosition(source);if(distance(p.pos,goal)<=p.speed*dt+12){p.alive=false;continue;}p.angle=angleTo(p.pos,goal);}
      p.trail.push({...p.pos});if(p.trail.length>9)p.trail.shift();
      p.previous = { ...p.pos }; p.lifetime -= dt;
      if (p.lifetime <= 0 || p.traveled >= p.range) { if(p.returnTo&&!p.returning){this.turn(p);continue;}p.alive = false;this.detonate(p);continue; }
      const validTargets = targets.filter(a => a.faction !== p.context.faction && a.health.alive);
      if (p.homing > 0 && validTargets.length) {
        const target = validTargets.reduce((a, b) => distance(a.hurtbox.center(a.pos), p.pos) < distance(b.hurtbox.center(b.pos), p.pos) ? a : b);
        p.angle += clamp(angleDiff(angleTo(p.pos, target.hurtbox.center(target.pos)), p.angle), -p.homing * dt, p.homing * dt);
      }
      // Sweep the barrel segment too: a close enemy may stand between hand and muzzle.
      let remaining = Math.min(p.speed * dt+p.launchDistance, p.range - p.traveled), consumed = 0;p.launchDistance=0;
      for (let contact = 0; contact < 4 && p.alive && remaining > .00001; contact++) {
        const from = { ...p.pos }, to = add(from, mul(direction(p.angle), remaining));
        const boundary=wallContact(from,to,p.radius),obstacle=this.obstacleContact(from,to,p.radius);
        const wall=obstacle&&(!boundary||obstacle.t<boundary.t)?obstacle:boundary;
        let closest: { target: Actor; t: number } | undefined;
        for (const target of validTargets) {
          if (p.hitTargets.has(target.id) || !target.health.alive) continue;
          const startFraction = Math.min(1, consumed / (p.speed * dt));
          const endFraction = Math.min(1, (consumed + remaining) / (p.speed * dt));
          const targetStart = lerp(target.previous, target.pos, startFraction), targetEnd = lerp(target.previous, target.pos, endFraction);
          const relativeEnd = sub(to, sub(targetEnd, targetStart));
          const body = target.hurtbox.capsule(targetStart);
          const t = segmentCapsule(from, relativeEnd, body.top, body.bottom, p.radius + body.radius);
          if (t !== null && (!closest || t < closest.t || (t === closest.t && target.id < closest.target.id))) closest = { target, t };
        }
        const wallFirst = wall && (!closest || wall.t <= closest.t);
        const t = wallFirst ? wall.t : closest?.t;
        if (t === undefined || t === null) { p.pos = to; p.traveled += remaining; remaining = 0; break; }
        p.pos = lerp(from, to, clamp(t, 0, 1)); const traveled = remaining * t; p.traveled += traveled; consumed += traveled; remaining -= traveled;
        if (wallFirst) {
          if (p.bounce > 0) {
            p.bounce--; const d = direction(p.angle), dot = d.x * wall.normal.x + d.y * wall.normal.y;
            const reflected = sub(d, mul(wall.normal, 2 * dot)); p.angle = Math.atan2(reflected.y, reflected.x); p.pos = add(p.pos, mul(wall.normal, .05));
          } else if(p.returnTo&&!p.returning){this.turn(p);remaining=0;}
          else { p.alive = false;this.detonate(p); }
        } else if (closest) {
          const at = Math.min(1, consumed / (p.speed * dt));
          const result = this.damage.tryHit(p.context, closest.target, direction(p.angle), at, p.hitTargets);
          if(shared){shared.explosionTriggered=p.context.explosionTriggered;shared.chargeGranted=p.context.chargeGranted;shared.feelGranted=p.context.feelGranted;}
          if (result.applied && p.context.explosion && !p.context.explosionTriggered) {
            p.context.explosionTriggered = true; this.explosion(p.context, p.pos, p.context.explosion.radius, closest.target.id);
          }
          if (p.explosionRadius > 0&&!p.context.explosionTriggered)this.detonate(p,closest.target.id);
          if (p.pierce > 0) { p.pierce--; p.context={...p.context,damage:p.context.damage*p.pierceMultiplier};p.pos = add(p.pos, mul(direction(p.angle), .05)); }
          else p.alive = false;
        }
          if (contact === 3 && remaining > 0 && p.alive) { p.alive = false; this.overflow++; }
      }
      if (p.traveled >= p.range){if(p.returnTo&&!p.returning)this.turn(p);else{p.alive=false;this.detonate(p);}}
    }
    this.projectiles = this.projectiles.filter(p => p.alive);
  }
  clear() { for(const projectile of this.projectiles)projectile.alive=false;this.projectiles = []; }
  cancelDelayed(sourceId:number){for(const p of this.projectiles)if(p.context.sourceId===sourceId&&p.delay>0)p.alive=false;this.projectiles=this.projectiles.filter(p=>p.alive);}
  private turn(p:Projectile){p.returning=true;p.hitTargets.clear();p.traveled=0;p.range=1600;p.speed*=1.25;p.pierce=99;p.context={...p.context,feelGranted:false};}
  private detonate(p:Projectile,excluded?:number){if(p.explosionRadius>0&&!p.context.explosionTriggered){p.context.explosionTriggered=true;if(p.context.sharedAttack)p.context.sharedAttack.explosionTriggered=true;this.explosion(p.context,p.pos,p.explosionRadius,excluded);}}
}
