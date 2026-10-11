import heroScale from './hero-scale.json';
import type { CharacterId } from './characters';
export type GunfuPose = 'downslash' | 'uppercut' | 'sweep' | 'kick' | 'backflip' | 'airshot' | 'landspin' | 'groundshot' | 'recover' | 'greatslash' | 'greatupper' | 'greatspin' | 'kneelshot1' | 'kneelshot2' | 'turnshot';
export function gunfuBodyScale(pose:GunfuPose){return (pose==='downslash'||pose==='uppercut'?heroScale.slashes:pose==='sweep'||pose==='kick'?heroScale.sweepKick:pose==='backflip'||pose==='airshot'?heroScale.aerial:heroScale.landing).gripScale;}
export const GUNFU_BEATS: readonly { pose: GunfuPose; label: string; duration: number; contact?: number; damage?: number; range?: number; arc?: number; knockback?: number; shot?: 'air' | 'ground' }[] = [
  { pose: 'downslash', label: '拿枪下劈', duration: .26, contact: .13, damage: 8, range: 54, arc: 1.05, knockback: 8 },
  { pose: 'uppercut', label: '上撩', duration: .24, contact: .12, damage: 10, range: 54, arc: 1.15, knockback: 8 },
  { pose: 'sweep', label: '横扫', duration: .28, contact: .14, damage: 12, range: 58, arc: 2.6, knockback: 14 },
  { pose: 'kick', label: '正踢', duration: .24, contact: .12, damage: 18, range: 60, arc: .9, knockback: 65 },
  { pose: 'backflip', label: '后空翻', duration: .36 },
  { pose: 'airshot', label: '空中射击', duration: .24, contact: .09, shot: 'air' },
  { pose: 'landspin', label: '落地旋身', duration: .32 },
  { pose: 'groundshot', label: '落地开枪', duration: .24, contact: .06, shot: 'ground' },
  { pose: 'recover', label: '收势', duration: .16 },
];
export const GUNFU_DURATION = GUNFU_BEATS.reduce((sum, beat) => sum + beat.duration, 0);
export const VIOLET_BEATS:typeof GUNFU_BEATS=[
  {pose:'greatslash',label:'巨刃下劈',duration:.32,contact:.16,damage:10,range:68,arc:1.25,knockback:10},
  {pose:'greatupper',label:'巨刃上挑',duration:.30,contact:.15,damage:12,range:68,arc:1.4,knockback:12},
  {pose:'greatspin',label:'回旋击飞',duration:.36,contact:.18,damage:20,range:76,arc:Math.PI*2,knockback:70},
  {pose:'kneelshot1',label:'单膝跪射 · 第一枪',duration:.34,contact:.18,shot:'air'},
  {pose:'kneelshot2',label:'单膝跪射 · 第二枪',duration:.26,contact:.10,shot:'air'},
  {pose:'turnshot',label:'回身换枪 · 第三枪',duration:.46,contact:.34,shot:'ground'},
  {pose:'recover',label:'收势',duration:.16},
];
// The atlas has discrete poses: the gun grip must follow the hands in the same frame.
const GRIPS: Record<GunfuPose, {height:number[];forward:number[];turn:number[]}> = {
  downslash:{height:[48,46,12,7],forward:[1,2,8,7],turn:[-1.35,-1.2,.9,.8]},
  uppercut:{height:[7,32,46,22],forward:[8,4,1,9],turn:[.9,-.4,-1.4,0]},
  sweep:{height:[22,22,21,17],forward:[-4,4,12,3],turn:[-1.3,-.5,.8,1.3]},
  kick:{height:[27,27,30,28],forward:[-2,-2,-2,-2],turn:[0,0,0,0]},
  backflip:{height:[22,23,20,22],forward:[1,0,0,1],turn:[0,0,0,0]},
  airshot:{height:[29,28,28,27],forward:[3,8,6,2],turn:[0,0,0,0]},
  landspin:{height:[12,22,22,22],forward:[2,3,4,8],turn:[0,0,0,0]},
  groundshot:{height:[23,23,10,19],forward:[8,5,2,3],turn:[0,0,0,0]},
  recover:{height:[19,19,19,19],forward:[3,3,3,3],turn:[0,0,0,0]},
  greatslash:{height:[44,43,12,10],forward:[2,2,8,8],turn:[0,0,0,0]},
  greatupper:{height:[10,24,42,24],forward:[8,5,2,5],turn:[0,0,0,0]},
  greatspin:{height:[24,25,24,22],forward:[5,2,8,3],turn:[0,0,0,0]},
  kneelshot1:{height:[25,21,20,23],forward:[4,8,8,3],turn:[0,0,0,0]},
  kneelshot2:{height:[20,20,20,23],forward:[8,8,6,3],turn:[0,0,0,0]},
  turnshot:{height:[22,24,25,24],forward:[0,-3,8,6],turn:[Math.PI,Math.PI/2,0,0]},
};
export function gunfuGrip(pose:GunfuPose,progress:number,character:CharacterId='ember'){if(character==='violet'&&pose==='recover')return {height:24,forward:6,turn:0};const data=GRIPS[pose],frame=Math.min(3,Math.max(0,Math.floor(progress*4))),scale=character==='violet'?1:gunfuBodyScale(pose);return {height:data.height[frame]*scale,forward:data.forward[frame]*scale,turn:data.turn[frame]};}
