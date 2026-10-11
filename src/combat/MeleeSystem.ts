import type { Actor } from '../actors/Actor';
import type { AttackContext } from './AttackSystem';
import type { DamageSystem } from './DamageSystem';
import { HitboxComponent } from './components';
import { normal, sub } from '../core/types';
import { sweptSectorCapsule } from '../world/Collision';
import { PERFECT_DODGE_RULES } from '../data/player';
export interface MeleeAttack { context: AttackContext; actor: Actor; hitbox: HitboxComponent; angle: number; elapsed: number; windup: number; active: number; recover: number; alive: boolean; progress: number }
export class MeleeSystem {
  attacks: MeleeAttack[] = [];
  constructor(private actors: () => Actor[], private damage: DamageSystem, private explosion: (context: AttackContext, target: Actor) => void) {}
  spawn(context: AttackContext, actor: Actor, radius: number, arc: number, windup: number, active: number, recover: number, angle = actor.aim) {
    this.attacks.push({ context, actor, hitbox: new HitboxComponent(radius, arc), angle, elapsed: 0, windup, active, recover, alive: true, progress: 0 });
  }
  step(playerDt: number, enemyDt: number) {
    for (const attack of this.attacks) {
      if (!attack.alive) continue;
      if (!attack.actor.health.alive) { attack.alive = false; continue; }
      const dt = attack.context.faction === 'player' ? playerDt : enemyDt;
      if (dt <= 0) continue;
      const previous = attack.elapsed; attack.elapsed += dt;
      const activeEnd = attack.windup + attack.active;
      // Recognize an announced strike or near miss without enlarging the damage hitbox.
      if(attack.context.faction==='enemy'&&attack.elapsed>=attack.windup-PERFECT_DODGE_RULES.anticipation&&previous<activeEnd){
        for(const target of this.actors()){
          if(target.faction!=='player')continue;
          const body=target.hurtbox.capsule(target.pos);
          if(sweptSectorCapsule(attack.actor.pos,{...body,radius:body.radius+PERFECT_DODGE_RULES.threatPadding},attack.hitbox.radius,attack.angle-attack.hitbox.arc/2,attack.angle+attack.hitbox.arc/2)&&this.damage.tryPerfectDodge(attack.context,target))break;
        }
      }
      if (attack.elapsed >= attack.windup && previous < activeEnd) {
        const before = Math.max(0, (previous - attack.windup) / attack.active);
        const after = Math.min(1, (attack.elapsed - attack.windup) / attack.active);
        attack.progress = after;
        const start = attack.angle - attack.hitbox.arc / 2 + attack.hitbox.arc * before;
        const end = attack.angle - attack.hitbox.arc / 2 + attack.hitbox.arc * after;
        for (const target of this.actors()) {
          if (!attack.alive) break;
          if (target.faction === attack.context.faction || !target.health.alive || attack.hitbox.hitTargets.has(target.id)) continue;
          if (sweptSectorCapsule(attack.actor.pos, target.hurtbox.capsule(target.pos), attack.hitbox.radius, start, end)) {
            const result = this.damage.tryHit(attack.context, target, normal(sub(target.pos, attack.actor.pos)), 1, attack.hitbox.hitTargets,true);
            if (result.applied && attack.context.explosion && !attack.context.explosionTriggered) { attack.context.explosionTriggered = true; this.explosion(attack.context, target); }
          }
        }
      }
      if (attack.elapsed >= activeEnd + attack.recover) attack.alive = false;
    }
    this.attacks = this.attacks.filter(a => a.alive);
  }
  cancel(actorId: number) { for (const attack of this.attacks) if (attack.actor.id === actorId) attack.alive = false; this.attacks = this.attacks.filter(a => a.alive); }
  clear() { for(const attack of this.attacks)attack.alive=false;this.attacks = []; }
}
