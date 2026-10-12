export const PLAYER_STATS = Object.freeze({ maxHP: 100, moveSpeed: 220, dashSpeed: 400, dashDuration: 0.14, dashCooldown: 0.9, dashInvulnerableTime: 0.11, perfectWindow: 0.5, criticalChance: 0.05, criticalDamage: 1.6, damageMultiplier: 1, attackSpeedMultiplier: 1 });
export const PERFECT_DODGE_RULES = Object.freeze({ freezeDuration: 2, recoveryDuration: 0.12, rewardCooldown: 2, recoveryProtection: 0.08, threatPadding:60, anticipation:.25 });
export const defaultDebug = () => ({ invincible: false, moveSpeed: 220, damageMultiplier: 1, shakeStrength: 1, hitStrength: 1, collisions: false, enemyStates: false, stats: false, mute: false, musicVolume:.45, effectVolume:.75, screenFlash: true });
export type DebugSettings = ReturnType<typeof defaultDebug>;
