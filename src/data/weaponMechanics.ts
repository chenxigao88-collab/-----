import type { WeaponData } from './weapons';
export type BulletStyle = 'needle'|'gravel'|'crystal'|'fireball'|'arc'|'wind'|'bolt'|'ring'|'wave';
export interface WeaponMechanic { mode:'ramp'|'scatter'|'burst'|'charge'|'beam'|'blade'|'return'; style:BulletStyle; chargeTime?:number; chargeKind?:'damage'|'count'|'radius'; interval?:number }
export interface ShotProfile { damage:number; count:number; spread:number; radius:number; explosionRadius:number; style:BulletStyle }
export function shotProfile(w:WeaponData,charge=0):ShotProfile {
  const p:ShotProfile={damage:1,count:w.projectileCount,spread:w.spread,radius:2,explosionRadius:0,style:w.mechanic?.style??'needle'};
  const q=Math.max(0,Math.min(1,charge));
  if(w.family==='earth_crossbow'){p.damage=1+1.2*q;p.radius=3+2*q;}
  if(w.family==='frost_string'){p.count=q>=1-1e-8?(w.tier===3?7:5):q>=.45?3:1;p.spread=p.count>1?.12+p.count*.055:0;p.radius=3;}
  if(w.family==='ember_lantern'){p.radius=4+5*q;p.explosionRadius=[0,36,48,60][w.tier]+q*[0,60,72,88][w.tier];}
  if(w.family==='gravel_bell')p.radius=3;
  if(w.family==='wind_burst'){p.radius=4;p.spread=.025;}
  if(w.family==='thunder_branch')p.radius=3;
  if(w.family==='wind_ring'){p.count=1;p.radius=10;}
  return p;
}
export function withMechanic(w:WeaponData):WeaponData {
  let mechanic:WeaponMechanic;let description=w.description;
  switch(w.family){
    case 'ash_needle':mechanic={mode:'ramp',style:'needle'};description='按住连射逐渐加速 · 针弹稳定压制';return {...w,bounce:0,effect:undefined,mechanic,description};
    case 'gravel_bell':mechanic={mode:'scatter',style:'gravel'};description='扇形岩屑散弹 · 近距重击推退';break;
    case 'frost_string':mechanic={mode:'charge',style:'crystal',chargeKind:'count',chargeTime:.65};description=`按住蓄晶、松开发射 · 满蓄${w.tier===3?7:5}枚冰晶 · 右键自动满蓄`;break;
    case 'ember_lantern':mechanic={mode:'charge',style:'fireball',chargeKind:'radius',chargeTime:.8};description=`蓄力扩大爆炸范围 · ${w.tier>=2?'爆炸留下火区 · ':''}${w.tier===3?'火区延迟再爆 · ':''}右键自动满蓄`;break;
    case 'earth_crossbow':mechanic={mode:'charge',style:'bolt',chargeKind:'damage',chargeTime:.75};description=`蓄力重矢 · 满蓄单发220%伤害 · 穿透、${Math.round((w.armorPierce??0)*100)}%破甲 · 右键自动满蓄`;break;
    case 'wind_burst':mechanic={mode:'burst',style:'wind',interval:.065};description=`三发依次连射 · 第三发强化${w.tier===3?' · 三发全中追加追击风弹':''}`;break;
    case 'thunder_branch':mechanic={mode:'beam',style:'arc'};description='按住持续追踪电弧 · 跳电连接敌群 · 过热短暂停火';return {...w,attackRate:7.5,damage:Math.ceil(w.damage*.4),projectileSpeed:1200,mechanic,description};
    case 'wind_ring':mechanic={mode:'return',style:'ring'};description='抛出旋转环刃 · 去程与回程各命中一次 · 移动改变回程';return {...w,range:w.tier===2?240:300,projectileSpeed:560,mechanic,description};
    default:mechanic={mode:'blade',style:'wave'};description='刀尖命中积累剑势 · 三次后下一刀释放穿透剑气';
  }
  return {...w,mechanic,description};
}
