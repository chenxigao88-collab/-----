import type {World} from '../world/World';
import type {WeaponData} from '../data/weapons';
import {PROGRESSION_RULES} from '../room/ProgressionSystem';
import {shotProfile} from '../data/weaponMechanics';
export function weaponHit(w:World,gun:WeaponData,charge=0){
  const blade=w.player.actor.character==='violet'&&gun.category==='melee'?1+w.progression.ranks.blade*PROGRESSION_RULES.blade:1;
  return Math.round(gun.damage*shotProfile(gun,charge).damage*w.player.stats.damageMultiplier*(1+w.progression.ranks.damage*PROGRESSION_RULES.damage)*blade);
}
export function weaponVolley(w:World,gun:WeaponData){const count=shotProfile(gun,1).count;return Math.round(weaponHit(w,gun,1)*(gun.family==='wind_burst'?(gun.tier===3?3.7:3.4):gun.family==='wind_ring'?2:Math.max(1,count)));}
export function weaponStatLine(w:World,gun:WeaponData){
  const m=gun.mechanic,hit=weaponHit(w,gun),full=weaponHit(w,gun,1),p=shotProfile(gun,1);
  if(m?.mode==='charge')return `${m.chargeKind==='damage'?`单发 ${hit} → 满蓄 ${full}`:m.chargeKind==='count'?`每晶 ${hit} · 1 → 满蓄 ${p.count}枚`:`直击 ${hit} · 爆炸半径 ${shotProfile(gun).explosionRadius} → ${p.explosionRadius}`} · 蓄满 ${m.chargeTime}s`;
  return `${gun.family==='wind_ring'?'去程／回程':gun.category==='melee'?'每刀':'每弹'} ${hit}${gun.projectileCount>1?` × ${gun.projectileCount}弹`:''} · ${m?.mode==='ramp'?'连续射击加速':m?.mode==='burst'?'三发连射':`每秒 ${gun.attackRate.toFixed(1)}次`} · 射程 ${gun.range}`;
}
