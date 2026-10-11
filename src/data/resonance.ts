import type { ResonanceType } from '../core/types';
export type ResonanceEffect =
  | { kind: 'next_damage'; multiplier: number; label: string }
  | { kind: 'speed'; multiplier: number; duration: number; label: string }
  | { kind: 'next_explosion'; radius: number; damage: number; label: string }
  | { kind: 'cooldown'; seconds: number; label: string };
export const COMBINATIONS: { from: ResonanceType; to: ResonanceType; effect: ResonanceEffect }[] = [
  { from: 'swift', to: 'heavy', effect: { kind: 'next_damage', multiplier: 1.5, label: '重击共鸣 · 下一击伤害 +50%' } },
  { from: 'heavy', to: 'swift', effect: { kind: 'speed', multiplier: 1.35, duration: 2, label: '迅捷共鸣 · 攻速 +35%' } },
  { from: 'arcane', to: 'heavy', effect: { kind: 'next_explosion', radius: 76, damage: 24, label: '轰鸣共振 · 下一击附带爆炸' } },
  { from: 'swift', to: 'arcane', effect: { kind: 'cooldown', seconds: 2, label: '回响共鸣 · 技能冷却 −2 秒' } }
];
