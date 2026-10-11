import type {GunfuPose} from './gunfu';

export const MOON_DURATION=5.5;
export const MOON_HITS=[1.05,1.65,2.35,2.95,3.55,4.55] as const;
export const MOON_FINISHER_RATIO=1.2;
export const MOON_STAGES:readonly {start:number;end:number;pose:GunfuPose;first:number;count:number}[]=[
  {start:0,end:.8,pose:'greatupper',first:0,count:4},
  {start:.8,end:1.3,pose:'kneelshot1',first:4,count:2},
  {start:1.3,end:1.9,pose:'turnshot',first:6,count:3},
  {start:1.9,end:2.6,pose:'greatslash',first:9,count:5},
  {start:2.6,end:3.2,pose:'greatupper',first:14,count:3},
  {start:3.2,end:3.8,pose:'greatspin',first:17,count:2},
  {start:3.8,end:4.35,pose:'greatslash',first:19,count:3},
  {start:4.35,end:MOON_DURATION,pose:'recover',first:22,count:2},
];
export function moonBodyIndex(time:number){
  const stage=MOON_STAGES.find(s=>time<s.end)??MOON_STAGES.at(-1)!;
  return stage.first+Math.min(stage.count-1,Math.max(0,Math.floor((time-stage.start)/(stage.end-stage.start)*stage.count)));
}
export function moonBodyFrame(time:number){return `moon_body_${moonBodyIndex(time)}`;}
export function moonEffectFrame(kind:'seal'|'wings'|'rift'|'burst',progress:number){return `moon_${kind}_${Math.min(5,Math.max(0,Math.floor(progress*6)))}`;}
