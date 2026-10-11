export interface RestPose {id:string;x:number;y:number;breath:boolean}
export function violetRest(elapsed:number,playful:boolean,facing:string):RestPose {
  if(!playful){const frame=elapsed<1.2?0:elapsed<2.4?1:2;return {id:`violet_rest_${facing}_${frame}`,x:0,y:0,breath:frame===2};}
  const t=elapsed%9;
  let id='violet_play_down_0',x=0,y=0;
  if(t<.4)id='violet_idle_down_0';
  else if(t<1.1)id='violet_play_down_0';
  else if(t<2.1)id='violet_play_left_0';
  else if(t<2.6)id='violet_play_left_1';
  else if(t<3.6)id='violet_play_right_0';
  else if(t<4.1)id='violet_play_right_1';
  else if(t<4.7)id='violet_play_down_1';
  else if(t<5.3)id='violet_play_stand';
  else if(t<5.9)id='violet_play_back';
  else if(t<7.9){const step=t-5.9;id=`violet_run_up_${Math.floor(step*6)%6}`;x=Math.round(Math.sin(step*Math.PI*3)*2);y=-Math.round(Math.sin(step/2*Math.PI)*3);}
  else if(t<8.5)id='violet_play_back';
  else id='violet_idle_down_0';
  return {id,x,y,breath:false};
}
