import type {RoomTemplate,DoorSide,Obstacle} from './adventure';
import type {EnemyKind} from '../core/types';
export const REGIONS=['灰烬外庭','熔铸工坊','晶蚀内城'] as const;
export interface TrapTemplate {kind:'fire'|'spikes'|'crystal';x:number;y:number;w:number;h:number;offset:number}
export function depthScale(depth:number){const d=Math.max(1,Math.min(18,depth));const stops=[[1,1,1,1,0],[6,1.45,1.12,1.03,4],[12,2.1,1.25,1.06,10],[18,2.9,1.4,1.1,16]];
  const upper=stops.findIndex(s=>s[0]>=d),a=stops[Math.max(0,upper-1)],b=stops[upper],p=a===b?0:(d-a[0])/(b[0]-a[0]);return {hp:a[1]+(b[1]-a[1])*p,damage:a[2]+(b[2]-a[2])*p,speed:a[3]+(b[3]-a[3])*p,armor:a[4]+(b[4]-a[4])*p};}
export function makeChapter():RoomTemplate[]{
  const rooms:RoomTemplate[]=[{id:'entry',name:'灰烬门庭',kind:'entry',grid:{x:-1,y:0},doors:{},waves:[],obstacles:[],tint:'#807153',region:1,depth:1}];
  const add=(id:string,name:string,kind:RoomTemplate['kind'],region:number,depth:number,x:number,y:number,waves:EnemyKind[][]=[]):RoomTemplate=>{
    const n=rooms.length,obstacles:Obstacle[]=waves.length&&kind!=='final'?[{x:280+(n%3)*45,y:230,w:34,h:26,kind:'pillar'},{x:625-(n%2)*45,y:320,w:48,h:24,kind:'crate'}]:[];
    const r:RoomTemplate={id,name,kind,region,depth,grid:{x,y:y+(region-1)*4},doors:{},waves,obstacles,tint:['#6b9685','#b78350','#a58bca'][region-1]};rooms.push(r);return r;
  };
  const link=(a:RoomTemplate,side:DoorSide,b:RoomTemplate,other:DoorSide)=>{if(a.doors[side]||b.doors[other])throw Error('地图门重复');a.doors[side]=b.id;b.doors[other]=a.id;};
  let previous=rooms[0];
  for(let region=1;region<=3;region++){
    const prefix=['outer','forge','inner'][region-1],names=[['熔炉前厅','落灰回廊','断桥庭院','灯影侧街','旧钟广场','守望长廊'],['铸铁入口','运煤廊桥','齿轮中庭','冷却泵房','淬火车间','熔铸长廊'],['晶蚀城门','无声礼堂','旧日花园','归途街角','王冠回廊','最后的灯室']][region-1];
    const ids=region===1?['front','gallery','garden','outer-4','outer-5','outer-6']:names.map((_,i)=>`${prefix}-${i+1}`);
    const battle:RoomTemplate[]=[];
    for(let i=0;i<6;i++){
      const depth=(region-1)*6+i+1,count=region+4,choose=(wave:number):EnemyKind[]=>{
        const pool:EnemyKind[]=region===1?['chaser','sniper','shooter']:region===2?['chaser','sniper','shooter','shield','dancer','parasite']:['shield','dancer','sniper','shooter','parasite','cantor'];
        const result=Array.from({length:count},(_,j)=>pool[(i*2+wave+j)%pool.length]);
        if(region===1&&i>=3)result[count-1]='shield';if(region===1&&i===2)result[count-1]='parasite';if(region===2&&i>=2&&wave===1)result[count-1]='cantor';return result;
      };
      const [x,y]=[[0,0],[1,0],[2,0],[4,0],[4,1],[2,1]][i];const waves=[choose(0),choose(1)];if(region>=2&&i%2===0||region===1&&i===5)waves.push(choose(2));const r=add(ids[i],names[i],'battle',region,depth,x,y,waves);
      if(i===1||i===3){const kind=i===1?(region===1?'spikes':'fire'):'crystal';r.traps=[{kind,x:385,y:260,w:90,h:36,offset:1.8},{kind,x:545,y:375,w:85,h:30,offset:3.8}];}
      battle.push(r);
      if(region===2&&i>=2&&i<=4)r.valve=true;
    }
    const camp=add(region===1?'shop':`${prefix}-camp`,['旧火驿站','熔铸营地','归途驿亭'][region-1],'shop',region,(region-1)*6+3,3,0);
    const event=add(`${prefix}-memory`,['刻鸟灯罩','泄压终端','未归的餐桌'][region-1],'event',region,(region-1)*6+5,3,1);
    event.story=`memory-${region}`;
    const guard:EnemyKind=region===1?'shooter':region===2?'dancer':'shield';
    const elite=add(region===1?'forge':`${prefix}-warden`,['铸造厅','炉门守卫','晶冠前庭'][region-1],'elite',region,region*6,1,1,[battle[3].waves[0],battle[4].waves[1],[guard,...battle[5].waves[0].slice(0,5)]]);
    const vault=add(region===1?'vault':`${prefix}-vault`,['晶封侧库','旧班长休息室','星灯藏室'][region-1],'treasure',region,(region-1)*6+2,0,1);
    const archive=add(region===1?'archive':`${prefix}-archive`,['封存秘室','工坊纪念室','归途档案室'][region-1],'treasure',region,region*6,2,2);
    link(previous,region===1?'east':'south',battle[0],region===1?'west':'north');
    link(battle[0],'east',battle[1],'west');link(battle[1],'east',battle[2],'west');link(battle[2],'east',camp,'west');link(camp,'east',battle[3],'west');
    link(battle[3],'south',battle[4],'north');link(battle[4],'west',event,'east');link(event,'west',battle[5],'east');link(battle[5],'west',elite,'east');
    link(battle[0],'south',vault,'north');link(vault,'east',elite,'west');link(battle[5],'south',archive,'north');link(camp,'south',event,'north');
    previous=elite;
  }
  const core=add('core','最后一盏归途灯','final',3,18,1,3,[['boss']]);link(previous,'south',core,'north');
  return rooms;
}
