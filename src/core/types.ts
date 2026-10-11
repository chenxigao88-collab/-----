export interface Vec2 { x: number; y: number }
export type Faction = 'player' | 'enemy';
export type ResonanceType = 'swift' | 'heavy' | 'arcane';
export type WeaponCategory = 'gun' | 'shotgun' | 'melee';
export type EnemyKind = 'chaser' | 'shooter' | 'sniper' | 'shield' | 'dancer' | 'cantor' | 'parasite' | 'boss';
export type RunState = 'ready' | 'playing' | 'paused' | 'victory' | 'dead';
export const WIDTH = 960, HEIGHT = 540;
export const BOUNDS = { left: 86, right: 874, top: 92, bottom: 450 };
export const vec = (x = 0, y = 0): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => vec(a.x + b.x, a.y + b.y);
export const sub = (a: Vec2, b: Vec2): Vec2 => vec(a.x - b.x, a.y - b.y);
export const mul = (a: Vec2, s: number): Vec2 => vec(a.x * s, a.y * s);
export const length = (a: Vec2) => Math.hypot(a.x, a.y);
export const distance = (a: Vec2, b: Vec2) => length(sub(a, b));
export const normal = (a: Vec2): Vec2 => length(a) > 0.0001 ? mul(a, 1 / length(a)) : vec();
export const direction = (angle: number): Vec2 => vec(Math.cos(angle), Math.sin(angle));
export const angleTo = (a: Vec2, b: Vec2) => Math.atan2(b.y - a.y, b.x - a.x);
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const lerp = (a: Vec2, b: Vec2, t: number): Vec2 => add(a, mul(sub(b, a), t));
export function constrain(pos: Vec2, radius: number): Vec2 {
  return vec(clamp(pos.x, BOUNDS.left + radius, BOUNDS.right - radius), clamp(pos.y, BOUNDS.top + radius, BOUNDS.bottom - radius));
}
export class Random {
  constructor(private seed = 0xabad123) {}
  snapshot(){return this.seed;}
  restore(seed:number){this.seed=seed>>>0;}
  next() { this.seed = (Math.imul(1664525, this.seed) + 1013904223) >>> 0; return this.seed / 4294967296; }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
}
