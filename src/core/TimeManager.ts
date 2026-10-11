import { PERFECT_DODGE_RULES } from '../data/player';

export class TimeManager {
  hitStop = 0;
  slowRemaining = 0;
  slowScale = 1;
  hitStrength = 1;
  enemyFreezeRemaining = 0;
  enemyRecoveryRemaining = 0;
  freezeRewardCooldown = 0;
  // One-step pulse when the full freeze gives way to recovery. World grants hurt protection here.
  freezeJustEnded = false;
  private recoveryDuration: number = PERFECT_DODGE_RULES.recoveryDuration;
  get enemyFrozen() { return this.enemyFreezeRemaining > 0; }
  get recovering() { return !this.enemyFrozen && this.enemyRecoveryRemaining > 0; }
  get canRewardPerfect() { return !this.enemyFrozen && !this.recovering && this.freezeRewardCooldown === 0; }
  requestHitStop(duration: number,maximum=.07) { this.hitStop = Math.max(this.hitStop, Math.min(maximum, duration * this.hitStrength)); }
  requestEnemySlow(scale = 0.3, duration = 0.5) {
    this.slowScale = Math.min(this.slowScale, scale); this.slowRemaining = Math.max(this.slowRemaining, duration);
  }
  requestEnemyFreeze(duration: number = PERFECT_DODGE_RULES.freezeDuration, recovery: number = PERFECT_DODGE_RULES.recoveryDuration) {
    if (!this.canRewardPerfect || duration <= 0) return false;
    this.enemyFreezeRemaining = duration;
    this.enemyRecoveryRemaining = Math.max(0, recovery);
    this.recoveryDuration = this.enemyRecoveryRemaining;
    this.freezeRewardCooldown = PERFECT_DODGE_RULES.rewardCooldown;
    this.freezeJustEnded = false;
    return true;
  }
  step(active: number) {
    const stopped = this.hitStop > 0;
    this.hitStop = Math.max(0, this.hitStop - active);
    this.slowRemaining = Math.max(0, this.slowRemaining - active);
    if (this.slowRemaining === 0) this.slowScale = 1;
    this.freezeRewardCooldown = Math.max(0, this.freezeRewardCooldown - active);
    if (this.freezeRewardCooldown < 1e-9) this.freezeRewardCooldown = 0;
    this.freezeJustEnded = false;
    let remaining = active, enemyTime = 0;
    if (this.enemyFrozen) {
      const frozen = Math.min(remaining, this.enemyFreezeRemaining);
      this.enemyFreezeRemaining = Math.max(0, this.enemyFreezeRemaining - frozen);
      remaining -= frozen;
      if (this.enemyFreezeRemaining < 1e-9) {
        this.enemyFreezeRemaining = 0;
        this.freezeJustEnded = true;
      }
    }
    if (remaining > 0 && this.recovering) {
      const recovery = Math.min(remaining, this.enemyRecoveryRemaining);
      const alreadyRecovered = this.recoveryDuration - this.enemyRecoveryRemaining;
      // Integrate the 0 -> 1 ramp, including steps that cross either phase boundary.
      enemyTime += recovery * (alreadyRecovered + recovery * 0.5) / this.recoveryDuration;
      this.enemyRecoveryRemaining = Math.max(0, this.enemyRecoveryRemaining - recovery);
      if (this.enemyRecoveryRemaining < 1e-9) this.enemyRecoveryRemaining = 0;
      remaining -= recovery;
    }
    enemyTime += remaining;
    const player = stopped ? 0 : active;
    return { active, player, enemy: stopped ? 0 : enemyTime * this.slowScale, presentation: active };
  }
  clear() {
    this.hitStop = 0; this.slowRemaining = 0; this.slowScale = 1;
    this.enemyFreezeRemaining = 0; this.enemyRecoveryRemaining = 0;
    this.freezeRewardCooldown = 0; this.freezeJustEnded = false;
  }
}
