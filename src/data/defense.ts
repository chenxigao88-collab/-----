import type {EnemyKind,Vec2} from '../core/types';
import type {AttackElement} from './elements';
export type StructureKind='wall'|'ballista'|'mortar'|'frost'|'lightning';
export type DefenseRole='raider'|'interceptor'|'breaker'|'artillery'|'bomber'|'boss';
export interface StructureData {name:string;price:number;hp:number;width:number;height:number;range:number;damage:number;interval:number;element:AttackElement;description:string;frame:string}
export const STRUCTURES:Record<StructureKind,StructureData>={
  wall:{name:'玄铁围墙',price:20,hp:300,width:32,height:24,range:0,damage:0,interval:0,element:'none',description:'阻挡进军，连接成防线',frame:'defense_wall'},
  ballista:{name:'连弩炮塔',price:80,hp:180,width:28,height:24,range:225,damage:16,interval:.7,element:'none',description:'双发弩矢，优先拦截近核敌人',frame:'defense_ballista'},
  mortar:{name:'熔火迫击炮',price:120,hp:165,width:30,height:26,range:285,damage:44,interval:3.2,element:'fire',description:'抛物线炮弹，范围爆炸与燃烧',frame:'defense_mortar'},
  frost:{name:'霜晶装置',price:90,hp:160,width:26,height:24,range:155,damage:8,interval:1.8,element:'ice',description:'冰霜脉冲，连续命中可冻结',frame:'defense_frost'},
  lightning:{name:'雷链塔',price:110,hp:155,width:26,height:24,range:195,damage:20,interval:1.35,element:'lightning',description:'跳跃三名敌人，参与元素反应',frame:'defense_lightning'}
};
export const DEFENSE_RULES={initialGold:240,wallLimit:12,towerLimit:6,coreHP:1000,buildTime:1.2,intermission:25,waves:6,maxAlive:36,repairRatio:.4,refundRatio:.6,corePos:{x:480,y:280}} as const;
export const DEFENSE_WAVES=[
  {count:16,interval:1.8,sides:[0,1]},
  {count:24,interval:1.7,sides:[2,3]},
  {count:32,interval:1.6,sides:[0,1,2,3]},
  {count:40,interval:1.5,sides:[0,1,2,3]},
  {count:52,interval:1.35,sides:[0,1,2,3]},
  {count:60,interval:1.3,sides:[0,1,2,3]}
] as const;
export function defenseEnemy(wave:number,index:number):{kind:EnemyKind;role:DefenseRole}{
  if(wave===6&&index===15)return {kind:'boss',role:'boss'};
  if(wave>=4&&index%9===7)return {kind:'parasite',role:'bomber'};
  if(wave>=3&&index%8===5)return {kind:'cantor',role:'artillery'};
  if(wave>=2&&index%7===4)return {kind:'shooter',role:'breaker'};
  return {kind:index%5===3?'dancer':'chaser',role:index%4===0?'interceptor':'raider'};
}
export function defenseSpawn(side:number,index:number):Vec2{
  const offset=(index%5-2)*36;
  return side===0?{x:112,y:280+offset}:side===1?{x:848,y:280+offset}:side===2?{x:480+offset*2,y:120}:{x:480+offset*2,y:422};
}
