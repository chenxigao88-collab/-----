import type { Actor } from '../actors/Actor';
import type { Player } from '../actors/Player';
import type { AttackContext } from './AttackSystem';
import type { EventBus } from '../core/EventBus';
import { mul, type Vec2 } from '../core/types';
import { PERFECT_DODGE_RULES } from '../data/player';
import { ELEMENT_RULES } from '../data/elements';
export interface DamageResult { applied: boolean; actualDamage: number; killed: boolean; blockedBy?: 'invulnerable' | 'dead' | 'duplicate' | 'friendly' | 'obstacle' }
export class DamageSystem {
  hits = 0; perfectDodges = 0;
  shield=0;shieldRemaining=0;
  modifier:((attack:AttackContext,target:Actor)=>number)=()=>1;
  absorb:((target:Actor,amount:number)=>number)=(_target,amount)=>amount;
  validContact:((attack:AttackContext,target:Actor)=>boolean)=()=>true;
  private perfectRewarded = new WeakSet<AttackContext>();
  constructor(private player: Player, private events: EventBus, private encounter: (actorId: number) => number, private canRewardPerfect: () => boolean = () => true) {}
  tryPerfectDodge(attack:AttackContext,target:Actor,at=1){
    const p=this.player;
    const elapsed=Number.isFinite(p.dashElapsed)?p.previousDashElapsed+(p.dashElapsed-p.previousDashElapsed)*at:Infinity;
    if(target!==p.actor||!target.health.alive||attack.runId!==target.runId||attack.faction!=='enemy'||attack.environment||attack.damage<=0||!this.validContact(attack,target)||
      elapsed<0||elapsed>p.stats.perfectWindow||p.perfectTriggered||this.perfectRewarded.has(attack)||target.action?.airborne||
      target.invulnerability.has('debug')||target.invulnerability.has('hurt')||target.invulnerability.has('ultimate')||!this.canRewardPerfect())return false;
    this.perfectRewarded.add(attack);p.perfectTriggered=true;this.perfectDodges++;
    this.events.emit('perfectDodge',{position:{...target.pos},runId:target.runId});
    target.invulnerability.grant('hurt',PERFECT_DODGE_RULES.freezeDuration);
    return true;
  }
  tryHit(attack: AttackContext, target: Actor, impulse: Vec2, at = 1, hitSet?: Set<number>, _perfectEligible = false): DamageResult {
    const blocked = (blockedBy: DamageResult['blockedBy']): DamageResult => ({ applied: false, actualDamage: 0, killed: false, blockedBy });
    if (!target.health.alive || attack.runId !== target.runId) return blocked('dead');
    if (attack.faction === target.faction) return blocked('friendly');
    if(!this.validContact(attack,target))return blocked('obstacle');
    if (hitSet?.has(target.id)) return blocked('duplicate');
    hitSet?.add(target.id);
    let dashImmune = false;
    const airImmune=target.faction==='player'&&Boolean(target.action?.airborne);
    if (target.faction === 'player') {
      const p = this.player;
      const elapsed = Number.isFinite(p.dashElapsed) ? p.previousDashElapsed + (p.dashElapsed - p.previousDashElapsed) * at : Infinity;
      dashImmune = elapsed < p.stats.dashInvulnerableTime;
      if(this.tryPerfectDodge(attack,target,at))return blocked('invulnerable');
    }
    if (dashImmune || airImmune || target.invulnerability.has('hurt') || target.invulnerability.has('debug')||target.invulnerability.has('ultimate')) return blocked('invulnerable');
    const vulnerability = !attack.secondary && target.elemental.exposureTime>0 ? ELEMENT_RULES.exposureMultiplier : 1;
    // The ultimate finisher derives from damage already modified on this target.
    let amount=Math.max(1,Math.round(attack.resolvedDamage?attack.damage:attack.damage*vulnerability*this.modifier(attack,target)));
    amount=this.absorb(target,amount);
    if(target.faction==='player'&&this.shieldRemaining>0){const absorbed=Math.min(amount,this.shield);this.shield-=absorbed;amount-=absorbed;}
    const actualDamage = target.health.damage(amount);
    // Reaction listeners may synchronously kill this target with a separate hit.
    // Only the hit that actually depleted HP emits the death event.
    const killed=!target.health.alive;
    target.knockback.apply(mul(impulse, attack.knockback), attack.weaponId === 'gravel_bell' ? 220 : 300);
    if (target.faction === 'player') {target.invulnerability.grant('hurt', .35);target.idleTime=0;}
    this.hits++;
    this.events.emit('damageApplied', { attack, targetId: target.id, amount: actualDamage, position: { ...target.pos }, killed });
    if (killed) this.events.emit('actorDied', { id: target.id, faction: target.faction, encounter: this.encounter(target.id), runId: target.runId, position: { ...target.pos } });
    return { applied: true, actualDamage, killed };
  }
}
