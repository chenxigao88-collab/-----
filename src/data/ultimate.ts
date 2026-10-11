import type {GunfuPose} from './gunfu';
export const ULTIMATE_DURATION=4.8;
export const ULTIMATE_HITS=[1.04,1.54,2.15,2.72,3.22,4.08] as const;
export const ULTIMATE_FINISHER_RATIO=.7;
export const ULTIMATE_CUT_START=2.45;
export const ULTIMATE_CUT_END=4.3;
export const ULTIMATE_FINAL_SPIN_START=3.6;
export const ULTIMATE_STAGES:readonly {start:number;end:number;pose:GunfuPose}[]=[
  {start:0,end:.65,pose:'greatupper'},
  {start:.65,end:1.25,pose:'greatslash'},
  {start:1.25,end:1.85,pose:'greatspin'},
  {start:1.85,end:2.45,pose:'kneelshot1'},
  {start:2.45,end:2.95,pose:'kneelshot2'},
  {start:2.95,end:ULTIMATE_FINAL_SPIN_START,pose:'turnshot'},
  {start:ULTIMATE_FINAL_SPIN_START,end:ULTIMATE_CUT_END,pose:'greatspin'},
  {start:4.3,end:4.8,pose:'recover'}
];
const CUT_DURATIONS=[.05,.05,.05,.05,.05,.05,.07,.07,.09,.12,.12,.08,.075,.075,.075,.075,.075,.075,.075,.075,.075,.075,.125,.125];
export function ultimateCutFrame(elapsed:number){let t=Math.max(0,elapsed-ULTIMATE_CUT_START);for(let i=0;i<CUT_DURATIONS.length;i++){if(t<CUT_DURATIONS[i])return i;t-=CUT_DURATIONS[i];}return 23;}
export function ultimateBodyFrame(elapsed:number,facing:string){
  const t=elapsed;
  if(t<.65)return `violet_ult_blade_${facing}_${Math.min(2,Math.floor(t/.65*3))}`;
  if(t<1.25)return `violet_ult_blade_${facing}_${3+Math.min(4,Math.floor((t-.65)/.6*5))}`;
  if(t<1.85){const p=(t-1.25)/.6;return `violet_greatspin_${facing}_${Math.min(3,Math.floor(p*4))}`;}
  if(t<2.45)return `violet_ult_guns_${facing}_${Math.min(3,Math.floor((t-1.85)/.6*4))}`;
  if(t<2.95)return `violet_ult_guns_${facing}_${4+Math.min(1,Math.floor((t-2.45)/.5*2))}`;
  if(t<ULTIMATE_FINAL_SPIN_START)return `violet_ult_guns_${facing}_${t<3.3?6:7}`;
  if(t<ULTIMATE_CUT_END)return `violet_greatspin_${facing}_${Math.min(3,Math.floor((t-ULTIMATE_FINAL_SPIN_START)/(ULTIMATE_CUT_END-ULTIMATE_FINAL_SPIN_START)*4))}`;
  return `violet_ult_blade_${facing}_0`;
}
