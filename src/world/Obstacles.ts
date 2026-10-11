import type { Obstacle } from '../data/adventure';
import { clamp, distance, type Vec2 } from '../core/types';
export function blocked(point:Vec2,radius:number,obstacles:Obstacle[]){
  return obstacles.some(o=>point.x>o.x-radius&&point.x<o.x+o.w+radius&&point.y>o.y-radius&&point.y<o.y+o.h+radius);
}
export function obstacleContact(from:Vec2,to:Vec2,radius:number,obstacles:Obstacle[]){
  let best:{t:number;normal:Vec2}|null=null;
  for(const o of obstacles){
    const bounds={left:o.x-radius,right:o.x+o.w+radius,top:o.y-36-radius,bottom:o.y+o.h+radius};
    let enter=0,exit=1,normal={x:0,y:0},miss=false;
    for(const axis of ['x','y'] as const){const delta=to[axis]-from[axis],low=axis==='x'?bounds.left:bounds.top,high=axis==='x'?bounds.right:bounds.bottom;
      if(Math.abs(delta)<1e-9){if(from[axis]<low||from[axis]>high)miss=true;continue;}
      let a=(low-from[axis])/delta,b=(high-from[axis])/delta;const sign=delta>0?-1:1;if(a>b)[a,b]=[b,a];
      if(a>enter){enter=a;normal=axis==='x'?{x:sign,y:0}:{x:0,y:sign};}exit=Math.min(exit,b);
    }
    if(!miss&&enter<=exit&&exit>=0&&enter<=1&&(!best||enter<best.t))best={t:Math.max(0,enter),normal};
  }
  return best;
}
export function resolveObstacles(pos:Vec2,previous:Vec2,radius:number,obstacles:Obstacle[]):Vec2{
  let p={...pos};
  for(const o of obstacles){
    const left=o.x-radius,right=o.x+o.w+radius,top=o.y-radius,bottom=o.y+o.h+radius;
    if(p.x<=left||p.x>=right||p.y<=top||p.y>=bottom)continue;
    if(previous.x<=left)p.x=left;else if(previous.x>=right)p.x=right;
    else if(previous.y<=top)p.y=top;else if(previous.y>=bottom)p.y=bottom;
    else {const sides=[{d:p.x-left,x:left,y:p.y},{d:right-p.x,x:right,y:p.y},{d:p.y-top,x:p.x,y:top},{d:bottom-p.y,x:p.x,y:bottom}].sort((a,b)=>a.d-b.d);p={x:sides[0].x,y:sides[0].y};}
  }
  return p;
}
function visible(a:Vec2,b:Vec2,radius:number,obstacles:Obstacle[]){
  const steps=Math.ceil(distance(a,b)/8);
  for(let i=1;i<=steps;i++){const t=i/steps;if(blocked({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},radius,obstacles))return false;}
  return true;
}
/** Tiny visibility graph: two columns of pillars need reliable routes, not random nudges. */
export function navigationPoint(from:Vec2,target:Vec2,radius:number,obstacles:Obstacle[]):Vec2{
  if(visible(from,target,radius,obstacles))return target;
  const nodes=[from,target,...obstacles.flatMap(o=>{const pad=radius+5;return [{x:o.x-pad,y:o.y-pad},{x:o.x+o.w+pad,y:o.y-pad},{x:o.x-pad,y:o.y+o.h+pad},{x:o.x+o.w+pad,y:o.y+o.h+pad}];})]
    .map(p=>({x:clamp(p.x,110,850),y:clamp(p.y,115,430)}));
  const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set<number>();costs[0]=0;
  while(visited.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;
    if(current<0||!Number.isFinite(costs[current]))break;if(current===1)break;visited.add(current);
    for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&visible(nodes[current],nodes[i],radius,obstacles)){const cost=costs[current]+distance(nodes[current],nodes[i]);if(cost<costs[i]){costs[i]=cost;previous[i]=current;}}
  }
  if(previous[1]<0)return target;let node=1;while(previous[node]>0)node=previous[node];return nodes[node];
}
