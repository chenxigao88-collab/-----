import type {ReactionId} from './elements';
export const REACTION_EFFECTS:Record<ReactionId,{duration:number;size:number;color:string;ground:boolean}>={
  thermal:{duration:.78,size:76,color:'#8ae9ff',ground:false},
  blast:{duration:.88,size:132,color:'#ffad67',ground:true},
  burn:{duration:1.05,size:118,color:'#ff9459',ground:true},
  exposure:{duration:.84,size:68,color:'#ffc47f',ground:false},
  fracture:{duration:.76,size:80,color:'#b1cfff',ground:false},
  vortex:{duration:1.08,size:130,color:'#a0e7f3',ground:true},
  bind:{duration:.92,size:78,color:'#91ddf2',ground:false},
  conduct:{duration:.82,size:70,color:'#c7b6ff',ground:false},
  shock:{duration:.9,size:126,color:'#d9b78c',ground:true},
  sand:{duration:1.04,size:122,color:'#cdddba',ground:true},
};
const ENDS=[.06,.14,.25,.39,.55,.71,.86,1];
export function reactionFrame(elapsed:number,duration:number){const p=Math.max(0,Math.min(1,elapsed/duration)),frame=ENDS.findIndex(end=>p<end);return frame<0?7:frame;}
