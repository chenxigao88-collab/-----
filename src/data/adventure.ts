import type { EnemyKind, Vec2 } from '../core/types';
import {makeChapter,type TrapTemplate} from './chapter';
export type DoorSide = 'north' | 'south' | 'west' | 'east';
export interface Obstacle { x:number; y:number; w:number; h:number; kind:'pillar'|'crate' }
export interface RoomTemplate {
  id:string; name:string; kind:'entry'|'battle'|'treasure'|'shop'|'elite'|'final'|'event';
  grid:Vec2; doors:Partial<Record<DoorSide,string>>; waves:EnemyKind[][];
  obstacles:Obstacle[]; tint:string; furnace?:Vec2;region?:number;depth?:number;traps?:TrapTemplate[];story?:string;valve?:boolean;
}
export const CHAPTER_ROOMS:RoomTemplate[]=makeChapter();
export const DOOR_POSITIONS:Record<DoorSide,Vec2>={north:{x:480,y:110},south:{x:480,y:436},west:{x:102,y:270},east:{x:858,y:270}};
export const ENTRY_POSITIONS:Record<DoorSide,Vec2>={north:{x:480,y:155},south:{x:480,y:396},west:{x:155,y:270},east:{x:805,y:270}};
export const ROOM_BY_ID=new Map(CHAPTER_ROOMS.map(r=>[r.id,r]));
export type RuneId='feather'|'hunt'|'landing'|'mark'|'counter'|'conduit'|'echo'|'guard'|'gather'|'afterglow';
export interface RuneData {id:RuneId;name:string;route:'追击'|'反击'|'元素';description:string;color:string;character?:'violet'|'ember'}
export const RUNES:RuneData[]=[
  {id:'feather',name:'轻羽',route:'追击',description:'回旋击飞的滞空延长0.15秒。',color:'#b9a5ef',character:'violet'},
  {id:'hunt',name:'追猎',route:'追击',description:'每套连招首次空中追射伤害提高20%。',color:'#d6b0ff',character:'violet'},
  {id:'landing',name:'轻落',route:'追击',description:'有效旋身终结后，短闪剩余冷却减少0.2秒。',color:'#e8b78a',character:'ember'},
  {id:'mark',name:'落火',route:'追击',description:'空中射击命中后，旋身末枪对同一敌人伤害提高20%。',color:'#e99772',character:'ember'},
  {id:'counter',name:'回锋',route:'反击',description:'精准闪避后2秒内，连招起手命中额外获得5点势。',color:'#8fdad2'},
  {id:'conduit',name:'融流',route:'元素',description:'范围反应扩大10%；单体反应伤害提高10%。',color:'#83c7dc'},
  {id:'echo',name:'终响',route:'追击',description:'末枪命中后追加20%伤害残响；不触发元素或势。',color:'#d8bb76'},
  {id:'guard',name:'护烬',route:'反击',description:'末枪命中获得8点护盾，持续3秒，冷却8秒。',color:'#b2d89f'},
  {id:'gather',name:'拢灰',route:'元素',description:'第三段回旋或横扫范围增加12；最多命中3敌人。',color:'#8eb5c7'},
  {id:'afterglow',name:'余辉',route:'元素',description:'反应后2秒内，起手命中该敌人额外获得5点势。',color:'#d1a2b8'},
];
export const RUNE_BY_ID=new Map(RUNES.map(r=>[r.id,r]));

