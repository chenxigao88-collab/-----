import type { WeaponCategory, ResonanceType } from '../core/types';
import type { Element } from './elements';
import { withMechanic, type WeaponMechanic } from './weaponMechanics';
export type WeaponTier = 1 | 2 | 3;
export const WEAPON_TIERS = [1, 2, 3] as const;
export const TIER_LABELS: Record<WeaponTier, string> = { 1: '前期', 2: '中期', 3: '后期' };
export interface WeaponEffect {
  splash?: number; splashRadius?: number; splashTargets?: number;
  chain?: number; chainRange?: number; chainTargets?: number;
  slow?: number; pull?: number;
}
export interface WeaponData {
  readonly mechanic?:WeaponMechanic;
  readonly id: string; readonly displayName: string; readonly category: WeaponCategory;
  readonly tier: WeaponTier; readonly family: string;
  readonly damage: number; readonly attackRate: number; readonly range: number;
  readonly projectileSpeed: number; readonly projectileCount: number; readonly spread: number;
  readonly pierce: number; readonly bounce: number; readonly knockback: number;
  readonly criticalChance: number; readonly element: Element; readonly resonanceType: ResonanceType;
  readonly skillId: string; readonly rarity: 'test' | 'rare' | 'legendary'; readonly icon: string; readonly sprite: string;
  readonly melee?: { arc: number; windup: number; active: number; recover: number };
  readonly armorPierce?: number; readonly pierceMultiplier?: number;
  readonly muzzleLength?:number;
  readonly effect?: WeaponEffect;
  readonly description: string;
}
export interface SkillData { name: string; cooldown: number; damage: number; spread?: number; knockback: number; arc?: number; range?: number; windup?: number; active?: number; recover?: number; mode?: 'zone' | 'strike'; radius?: number; duration?: number; delay?: number; slow?: number; pull?: boolean }
const shared = { pierce: 0, bounce: 0, criticalChance: 0, rarity: 'test', tier: 1 } as const;
// Preserve original IDs for loadouts and saves; firing mechanics are applied below.
const starterData: readonly WeaponData[] = [
  { ...shared, id: 'ash_needle', family:'ash_needle', displayName: '灰针', category: 'gun', element:'lightning', damage: 14, attackRate: 4.5, range: 540, projectileSpeed: 720, projectileCount: 1, spread: .02, knockback: 75, resonanceType: 'swift', skillId: 'needle_focus', icon: 'pistol', sprite: 'pistol', description:'精准点射 · 凝针强化单发' },
  { ...shared, id: 'gravel_bell', family:'gravel_bell', displayName: '砾钟', category: 'shotgun', element:'earth', damage: 9, attackRate: 1.25, range: 260, projectileSpeed: 600, projectileCount: 6, spread: .42, knockback: 65, resonanceType: 'heavy', skillId: 'bell_compress', icon: 'shotgun', sprite: 'shotgun', description:'近距散弹 · 压钟收束弹道' },
  { ...shared, id: 'hush_edge', family:'hush_edge', displayName: '缄锋', category: 'melee', element:'wind', damage: 34, attackRate: 1.8, range: 72, projectileSpeed: 0, projectileCount: 0, spread: 0, knockback: 260, resonanceType: 'heavy', skillId: 'edge_sweep', icon: 'blade', sprite: 'blade', melee: { arc: 1.92, windup: .07, active: .1, recover: .18 }, description:'宽弧近战 · 回锋旋斩聚怪' },
  { ...shared, muzzleLength:41, id:'frost_string', family:'frost_string', displayName:'霜弦', category:'gun', element:'ice', damage:26, attackRate:2, range:650, projectileSpeed:820, projectileCount:1, spread:.01, knockback:45, resonanceType:'swift', skillId:'frost_lock', icon:'frost', sprite:'frost', pierce:1, pierceMultiplier:18/26, effect:{slow:.15}, description:'冰晶穿透 · 第二目标18伤害' },
  { ...shared, muzzleLength:26, id:'ember_lantern', family:'ember_lantern', displayName:'烬灯', category:'gun', element:'fire', damage:24, attackRate:2, range:480, projectileSpeed:380, projectileCount:1, spread:.02, knockback:35, resonanceType:'arcane', skillId:'ember_field', icon:'lantern', sprite:'lantern', effect:{splash:6}, description:'火球溅射 · 留烬封锁路线' },
  { ...shared, muzzleLength:35, id:'thunder_branch', family:'thunder_branch', displayName:'鸣枝', category:'gun', element:'lightning', damage:20, attackRate:2.4, range:520, projectileSpeed:620, projectileCount:1, spread:.01, knockback:35, resonanceType:'arcane', skillId:'thunder_fall', icon:'wand', sprite:'wand', effect:{chain:6}, description:'瞄准电弧 · 跳电连接两敌' }
];
const paintedWeapon=(weapon:WeaponData):WeaponData=>({...withMechanic(weapon),icon:`weapon_${weapon.id}`,sprite:`weapon_${weapon.id}`});
export const STARTER_WEAPONS: readonly WeaponData[] = starterData.map(paintedWeapon);
function advance(family: string, tier: 2 | 3, data: Partial<WeaponData>): WeaponData {
  const base = starterData.find(w => w.id === family)!;
  return { ...base, id: `${family}_${tier === 2 ? 'mid' : 'late'}`, tier, rarity: tier === 2 ? 'rare' : 'legendary', ...data };
}
const advanced: readonly WeaponData[] = [
  advance('ash_needle', 2, { displayName:'穿灰针', damage:23, range:590, projectileSpeed:790, pierce:1, pierceMultiplier:.8, armorPierce:.15, skillId:'needle_focus_mid', description:'穿透1敌 · 保留80%伤害 · 无视15%护甲' }),
  advance('ash_needle', 3, { displayName:'雷织灰针', damage:34, attackRate:4.8, range:640, projectileSpeed:860, pierce:1, pierceMultiplier:.9, bounce:1, armorPierce:.25, effect:{chain:11,chainRange:145,chainTargets:3}, skillId:'needle_focus_late', description:'穿透与弹射 · 命中连锁2敌 · 无视25%护甲' }),
  advance('gravel_bell', 2, { displayName:'裂岩砾钟', damage:15, range:290, spread:.38, armorPierce:.2, skillId:'bell_compress_mid', description:'六发重散弹 · 无视20%护甲 · 近距压制' }),
  advance('gravel_bell', 3, { displayName:'崩山砾钟', damage:22, attackRate:1.3, range:320, projectileCount:7, spread:.34, pierce:1, pierceMultiplier:.7, armorPierce:.35, skillId:'bell_compress_late', description:'七发穿透散弹 · 无视35%护甲 · 压钟聚束' }),
  advance('hush_edge', 2, { displayName:'回响缄锋', damage:56, range:86, melee:{arc:2.4,windup:.07,active:.12,recover:.18}, effect:{pull:84}, skillId:'edge_sweep_mid', description:'扩大挥斩 · 命中牵引近敌 · 回锋聚怪' }),
  advance('hush_edge', 3, { displayName:'归途缄锋', damage:84, attackRate:1.9, range:104, melee:{arc:2.85,windup:.06,active:.13,recover:.18}, armorPierce:.25, effect:{pull:112}, skillId:'edge_sweep_late', description:'宽域巨刃 · 强化聚怪 · 无视25%护甲' }),
  advance('frost_string', 2, { displayName:'裂晶霜弦', damage:42, range:700, projectileSpeed:900, pierce:2, pierceMultiplier:.8, effect:{slow:.22}, skillId:'frost_lock_mid', description:'穿透2敌 · 保留80%伤害 · 减速22%' }),
  advance('frost_string', 3, { displayName:'极夜霜弦', damage:64, attackRate:2.1, range:760, projectileSpeed:980, pierce:3, pierceMultiplier:.9, armorPierce:.3, effect:{slow:.3}, skillId:'frost_lock_late', description:'穿透3敌 · 保留90%伤害 · 减速30% · 破甲' }),
  advance('ember_lantern', 2, { displayName:'熔炉烬灯', damage:39, range:520, projectileSpeed:420, effect:{splash:12,splashRadius:56,splashTargets:4}, skillId:'ember_field_mid', description:'火球溅射4敌 · 留烬范围扩大' }),
  advance('ember_lantern', 3, { displayName:'燎原烬灯', damage:58, attackRate:2.1, range:560, projectileSpeed:460, effect:{splash:22,splashRadius:76,splashTargets:5}, skillId:'ember_field_late', description:'广域火球溅射5敌 · 留烬持续4秒' }),
  advance('thunder_branch', 2, { displayName:'雷簇鸣枝', damage:32, range:560, projectileSpeed:680, effect:{chain:11,chainRange:155,chainTargets:4}, skillId:'thunder_fall_mid', description:'跳电连接3敌 · 落雷范围扩大' }),
  advance('thunder_branch', 3, { displayName:'天裂鸣枝', damage:48, attackRate:2.5, range:600, projectileSpeed:740, armorPierce:.2, effect:{chain:20,chainRange:180,chainTargets:5}, skillId:'thunder_fall_late', description:'远距跳电连接4敌 · 大范围落雷 · 破甲' })
];
const newFamilies: readonly WeaponData[] = [
  { ...shared, id:'wind_burst_mid', family:'wind_burst', tier:2, rarity:'rare', displayName:'疾风连铳', category:'gun', element:'wind', damage:10, attackRate:2.9, range:480, projectileSpeed:760, projectileCount:3, spread:.24, bounce:1, knockback:35, resonanceType:'swift', skillId:'burst_focus_mid', icon:'pistol', sprite:'pistol', description:'三弹齐射 · 一次弹射 · 集风收束弹道' },
  { ...shared, id:'wind_burst_late', family:'wind_burst', tier:3, rarity:'legendary', displayName:'风暴连铳', category:'gun', element:'wind', damage:17, attackRate:3, range:540, projectileSpeed:850, projectileCount:3, spread:.2, pierce:1, pierceMultiplier:.8, bounce:1, armorPierce:.15, knockback:45, resonanceType:'swift', skillId:'burst_focus_late', icon:'pistol', sprite:'pistol', description:'三弹穿透弹射 · 无视15%护甲 · 风暴收束' },
  { ...shared, id:'earth_crossbow_mid', family:'earth_crossbow', tier:2, rarity:'rare', displayName:'镇岩重弩', category:'gun', element:'earth', damage:83, attackRate:.95, range:740, projectileSpeed:920, projectileCount:1, spread:0, pierce:1, pierceMultiplier:.85, armorPierce:.35, knockback:110, resonanceType:'heavy', skillId:'crossbow_break_mid', icon:'frost', sprite:'frost', muzzleLength:41, description:'重矢单发83 · 穿透1敌 · 无视35%护甲' },
  { ...shared, id:'earth_crossbow_late', family:'earth_crossbow', tier:3, rarity:'legendary', displayName:'地脉重弩', category:'gun', element:'earth', damage:125, attackRate:.95, range:820, projectileSpeed:1040, projectileCount:1, spread:0, pierce:3, pierceMultiplier:.95, armorPierce:.65, knockback:150, resonanceType:'heavy', skillId:'crossbow_break_late', icon:'frost', sprite:'frost', muzzleLength:41, description:'重矢单发125 · 穿透3敌 · 无视65%护甲' },
  { ...shared, id:'wind_ring_mid', family:'wind_ring', tier:2, rarity:'rare', displayName:'回风环刃', category:'melee', element:'wind', damage:54, attackRate:1.5, range:96, projectileSpeed:0, projectileCount:0, spread:0, knockback:90, resonanceType:'arcane', skillId:'ring_vortex_mid', icon:'blade', sprite:'blade', melee:{arc:3.8,windup:.08,active:.16,recover:.23}, effect:{pull:106,slow:.18}, description:'大弧环斩 · 牵引近敌并减速18%' },
  { ...shared, id:'wind_ring_late', family:'wind_ring', tier:3, rarity:'legendary', displayName:'风眼环刃', category:'melee', element:'wind', damage:86, attackRate:1.6, range:118, projectileSpeed:0, projectileCount:0, spread:0, armorPierce:.2, knockback:100, resonanceType:'arcane', skillId:'ring_vortex_late', icon:'blade', sprite:'blade', melee:{arc:Math.PI*2,windup:.07,active:.18,recover:.23}, effect:{pull:136,slow:.25}, description:'全周环斩 · 聚怪减速25% · 无视20%护甲' }
];
export const WEAPONS: readonly WeaponData[] = [...STARTER_WEAPONS, ...advanced.map(paintedWeapon), ...newFamilies.map(paintedWeapon)];
export function weaponPool(region: number): WeaponData[] {
  const tier = Math.max(1, Math.min(3, Number.isFinite(region) ? Math.floor(region) : 1));
  return WEAPONS.filter(w => w.tier === tier);
}
export const SKILLS: Record<string, SkillData> = {
  needle_focus: { name: '凝针', cooldown: 4, damage: 2, knockback: 1.5 },
  bell_compress: { name: '压钟', cooldown: 5, damage: 1, knockback: 1, spread: .12 },
  edge_sweep: { name: '回锋', cooldown: 6, damage: .85, knockback: .25, arc: Math.PI * 2, range: 78, windup: .1, active: .16, recover: .22, pull:true },
  frost_lock: { name:'霜锁', cooldown:6, damage:40/26, knockback:1, slow:.35 },
  ember_field: { name:'留烬', cooldown:7, damage:6/24, knockback:0, mode:'zone', radius:70, duration:3 },
  thunder_fall: { name:'落雷', cooldown:7, damage:34/20, knockback:1, mode:'strike', radius:70, delay:.4 },
  needle_focus_mid: { name:'破灰凝针', cooldown:4, damage:2.1, knockback:1.5 },
  needle_focus_late: { name:'雷织凝针', cooldown:4, damage:2.3, knockback:1.5 },
  bell_compress_mid: { name:'裂岩压钟', cooldown:5, damage:1.1, knockback:1.1, spread:.1 },
  bell_compress_late: { name:'崩山压钟', cooldown:5, damage:1.2, knockback:1.2, spread:.08 },
  edge_sweep_mid: { name:'聚灰回锋', cooldown:6, damage:1, knockback:.2, arc:Math.PI*2, range:102, windup:.09, active:.18, recover:.22, pull:true },
  edge_sweep_late: { name:'归途回锋', cooldown:6, damage:1.15, knockback:.2, arc:Math.PI*2, range:128, windup:.08, active:.2, recover:.22, pull:true },
  frost_lock_mid: { name:'裂晶霜锁', cooldown:6, damage:1.6, knockback:1, slow:.45 },
  frost_lock_late: { name:'极夜霜锁', cooldown:6, damage:1.8, knockback:1, slow:.55 },
  ember_field_mid: { name:'熔炉留烬', cooldown:7, damage:.35, knockback:0, mode:'zone', radius:90, duration:3.5 },
  ember_field_late: { name:'燎原留烬', cooldown:7, damage:.45, knockback:0, mode:'zone', radius:112, duration:4 },
  thunder_fall_mid: { name:'雷簇落雷', cooldown:7, damage:1.9, knockback:1, mode:'strike', radius:90, delay:.4 },
  thunder_fall_late: { name:'天裂落雷', cooldown:7, damage:2.1, knockback:1, mode:'strike', radius:112, delay:.35 },
  burst_focus_mid: { name:'集风', cooldown:5, damage:1.8, knockback:1.2, spread:.07 },
  burst_focus_late: { name:'风暴收束', cooldown:5, damage:2, knockback:1.3, spread:.04 },
  crossbow_break_mid: { name:'镇岩破甲矢', cooldown:6.5, damage:1.8, knockback:1.3 },
  crossbow_break_late: { name:'地脉贯穿矢', cooldown:6.5, damage:2.1, knockback:1.4 },
  ring_vortex_mid: { name:'回风聚涡', cooldown:6, damage:1.25, knockback:.2, arc:Math.PI*2, range:128, windup:.09, active:.18, recover:.26, slow:.25, pull:true },
  ring_vortex_late: { name:'风眼聚涡', cooldown:6, damage:1.4, knockback:.2, arc:Math.PI*2, range:150, windup:.08, active:.2, recover:.26, slow:.35, pull:true }
};
// The continuous emitter uses smaller pulses; its charged skill keeps its original strike budget.
for(const w of WEAPONS.filter(w=>w.family==='thunder_branch'))SKILLS[w.skillId].damage=[0,34,60.8,100.8][w.tier]/w.damage;
export function getWeapon(id: string): WeaponData { const weapon = WEAPONS.find(w => w.id === id); if (!weapon) throw new Error(`未知武器 ${id}`); return weapon; }
