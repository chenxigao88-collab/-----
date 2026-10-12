import {BOUNDS,clamp,distance,type Vec2} from '../core/types';
export interface DefenseBlock {id:number;pos:Vec2;width:number;height:number;hp:number;core?:boolean}
export function blockContains(b:DefenseBlock,p:Vec2,r=0){return Math.abs(p.x-b.pos.x)<b.width/2+r&&Math.abs(p.y-b.pos.y)<b.height/2+r;}
export function blockDistance(b:DefenseBlock,p:Vec2){return Math.hypot(Math.max(0,Math.abs(p.x-b.pos.x)-b.width/2),Math.max(0,Math.abs(p.y-b.pos.y)-b.height/2));}
export function defenseContact(from:Vec2,to:Vec2,radius:number,blocks:readonly DefenseBlock[],ignore?:number){
  let best:{t:number;normal:Vec2;id:number}|null=null;
  for(const b of blocks){if(b.id===ignore||b.hp<=0)continue;
    let enter=0,exit=1,normal={x:0,y:0},miss=false;
    for(const axis of ['x','y'] as const){const delta=to[axis]-from[axis],half=(axis==='x'?b.width:b.height)/2+radius,lo=b.pos[axis]-half,hi=b.pos[axis]+half;
      if(Math.abs(delta)<1e-9){if(from[axis]<lo||from[axis]>hi)miss=true;continue;}
      let a=(lo-from[axis])/delta,c=(hi-from[axis])/delta;const sign=delta>0?-1:1;if(a>c)[a,c]=[c,a];
      if(a>enter){enter=a;normal=axis==='x'?{x:sign,y:0}:{x:0,y:sign};}exit=Math.min(exit,c);
    }
    if(!miss&&enter<=exit&&exit>=0&&enter<=1&&(!best||enter<best.t))best={t:Math.max(0,enter),normal,id:b.id};
  }return best;
}
/** Destructible cells have a siege cost instead of becoming unreachable. */
export class DefenseNavigation {
  static readonly cell=16;
  private readonly columns=49;private readonly rows=22;
  searches=0;
  route(from:Vec2,to:Vec2,radius:number,blocks:readonly DefenseBlock[],goalId:number,breachCost:number){
    this.searches++;
    const point=(id:number):Vec2=>({x:102+(id%this.columns)*16,y:108+Math.floor(id/this.columns)*16});
    const index=(p:Vec2)=>clamp(Math.round((p.y-108)/16),0,this.rows-1)*this.columns+clamp(Math.round((p.x-102)/16),0,this.columns-1);
    const start=index(from),goal=index(to),size=this.columns*this.rows,g=new Float64Array(size).fill(Infinity),prev=new Int32Array(size).fill(-1),closed=new Uint8Array(size),open=new Set<number>([start]);g[start]=0;
    const occupied=(id:number)=>blocks.find(b=>b.id!==goalId&&b.hp>0&&blockContains(b,point(id),radius+1));
    let last=start;
    while(open.size){let current=-1,best=Infinity;for(const id of open){const score=g[id]+distance(point(id),point(goal));if(score<best){current=id;best=score;}}
      if(current<0)break;open.delete(current);last=current;if(current===goal)break;closed[current]=1;
      const x=current%this.columns,y=Math.floor(current/this.columns);
      for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=this.columns||ny>=this.rows)continue;const next=ny*this.columns+nx;if(closed[next])continue;
        const p=point(next);if(p.x<BOUNDS.left+radius||p.x>BOUNDS.right-radius||p.y<BOUNDS.top+radius||p.y>BOUNDS.bottom-radius)continue;
        const block=occupied(next);if(block?.core)continue;
        const cost=g[current]+16+(block?block.hp*breachCost:0);if(cost>=g[next])continue;g[next]=cost;prev[next]=current;open.add(next);
      }
    }
    if(last!==goal)return {points:[] as Vec2[],blocker:undefined as DefenseBlock|undefined};
    const nodes:number[]=[];for(let id=goal;id!==start&&id>=0;id=prev[id])nodes.push(id);nodes.reverse();
    const first=nodes.findIndex(id=>occupied(id));
    return {points:(first<0?nodes:nodes.slice(0,first)).map(point),blocker:first<0?undefined:occupied(nodes[first])};
  }
}
