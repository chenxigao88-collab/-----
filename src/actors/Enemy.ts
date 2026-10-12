import { createActor, type Actor } from './Actor';
import { ENEMIES, ENEMY_PRESSURE, type EnemyData } from '../data/enemies';
import type { EnemyKind, Vec2 } from '../core/types';
export type EnemyState = 'Idle' | 'Move' | 'Attack' | 'Recover' | 'Stunned' | 'Dead';
export interface EnemyAttackOptions { angle?: number; arc?: number; range?: number; active?: number; damageMultiplier?: number }
export interface EnemyScale {hp:number;damage:number;speed:number;armor?:number}
export class Enemy {
  readonly actor: Actor;
  readonly data: EnemyData;
  readonly armor:number;
  state: EnemyState = 'Idle'; elapsed = 0; lockedAngle = 0; attackFired = false;
  attackIndex = 0; lungeRemaining = 0;
  attackCooldown = 0;
  ward=0;wardMax=20;wardTime=0;guardBroken=0;guardHits=0;bossPhase=1;poise=150;poiseMax=150;brokenRemaining=0;
  bossMove:'slash'|'slam'|'return'|'combo'='slash';bossTurns=0;bossAttackCount=1;phaseSummoned=1;poiseAttacks=new Set<number>();
  hitstunRemaining = 0;
  private lastHitstunAttack = -1;
  hitstun(duration: number, attackId: number) {
    if (!this.actor.health.alive || this.lastHitstunAttack === attackId) return false;
    this.lastHitstunAttack = attackId;
    this.hitstunRemaining = Math.max(this.hitstunRemaining, duration);
    this.actor.moving = false;
    this.enter('Stunned');
    return true;
  }
  get attackCount() { return this.kind==='boss'?this.bossAttackCount:this.kind==='dancer'?2:this.elite && this.kind === 'shooter' ? 2 : 1; }
  get windup() { return this.kind==='boss'?this.data.windup*(this.attackIndex?.85:1):this.attackIndex === 1 && this.attackCount === 2 ? ENEMY_PRESSURE.eliteSecondWindup : this.data.windup; }
  get attackRange() { return this.kind==='boss'?(this.bossMove==='slam'?148:140):this.data.attackRange; }
  get attackArc() { return this.kind==='boss'?(this.bossMove==='slam'?1.55:2.65):this.data.arc; }
  get holdsAttackSlot() {
    return this.actor.health.alive && (this.state === 'Attack' || (this.state === 'Recover' && (this.attackIndex < this.attackCount - 1 || this.elapsed < this.data.active + ENEMY_PRESSURE.slotRecoveryGrace || this.lungeRemaining > 0)));
  }
  constructor(id: number, runId: number, readonly kind: EnemyKind, pos: Vec2, readonly encounter = -1, readonly elite = false,scale:EnemyScale={hp:1,damage:1,speed:1},eliteHP=240) {
    this.data = {...ENEMIES[kind],damage:ENEMIES[kind].damage*scale.damage,speed:ENEMIES[kind].speed*scale.speed}; this.actor = createActor(id, runId, 'enemy', pos, Math.round((kind==='boss'?this.data.hp:elite?eliteHP:this.data.hp)*scale.hp), this.data.radius);
    // Omitting armor preserves the combat trial; chapter enemies grow by depth and role.
    this.armor=kind==='boss'?18:scale.armor===undefined?0:scale.armor+(kind==='shield'?8:kind==='shooter'?4:0)+(elite?12:0);
    this.actor.hurtbox.body = { ...this.data.hurtbox };
    this.attackCooldown = ENEMY_PRESSURE.initialDelay + (id % 3) * .12;
  }
  enter(state: EnemyState) {
    if(state==='Move'&&this.state==='Recover')this.attackCooldown=Math.max(this.attackCooldown,this.data.attackRest);
    this.state = state; this.elapsed = 0; this.attackFired = false;
    if (state === 'Idle' || state === 'Move' || state === 'Stunned' || state === 'Dead') { this.attackIndex = 0; this.lungeRemaining = 0; }
  }
  stun() { if (this.actor.health.alive) this.enter('Stunned'); }
}
