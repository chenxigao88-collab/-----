import type {World} from '../world/World';
import type {GameCommand} from './DebugPanel';
import {CHAPTER_ROOMS,ROOM_BY_ID,type RoomTemplate} from '../data/adventure';
import {REGIONS} from '../data/chapter';

const kinds:Record<RoomTemplate['kind'],string>={entry:'启程门庭',battle:'战场',treasure:'宝库',shop:'营地 / 商店',elite:'炉门守卫',final:'最终炉心',event:'归途遗物'};
function icon(room:RoomTemplate,done=false){
  const shapes=room.valve?`<circle cx="12" cy="12" r="7"/><path d="M12 3v18M3 12h18M6 6l12 12M6 18L18 6"/>${done?'<path class="map-check" d="m14 19 3 3 6-7"/>':''}`:
    room.kind==='shop'?'<path d="m12 3 8 8-3 10H7L4 11zM9 21v-6h6v6M8 8h8"/>':
    room.kind==='treasure'?'<path d="M4 9h16v12H4zM4 9l3-5h10l3 5M10 9v5h4V9"/>':
    room.kind==='event'?'<path d="M4 5h7l1 2 1-2h7v15h-7l-1 2-1-2H4zM12 7v13"/>':
    room.kind==='entry'?'<path d="M5 21V5h14v16M9 21V9h6v12M3 21h18"/>':
    room.kind==='elite'||room.kind==='final'?'<path d="m3 6 5 4 4-7 4 7 5-4-2 13H5zM7 22h10"/>':
    '<path d="m5 3 13 13M3 5l13 13M14 19l5-5M5 21 18 8M3 19 16 6M14 5l5 5"/>';
  return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
}
export class MapUI {
  readonly element=document.createElement('div');
  private controller=new AbortController();private stamp='';
  constructor(private command:(c:GameCommand)=>void){
    this.element.className='travel-map';this.element.hidden=true;this.element.setAttribute('role','dialog');this.element.setAttribute('aria-modal','true');this.element.setAttribute('aria-label','回廊地图与任务');
    this.element.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;
      if(b.dataset.room)this.command({type:'map-select',id:b.dataset.room});
      else if(b.dataset.region)this.command({type:'map-region',region:Number(b.dataset.region)});
      else if(b.dataset.travel)this.command({type:'map-travel',id:b.dataset.travel});
      else if(b.dataset.close!==undefined)this.command({type:'map-close'});
    },{signal:this.controller.signal});
    this.element.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const buttons=[...this.element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}},{signal:this.controller.signal});
  }
  render(w:World){const map=w.map,wasHidden=this.element.hidden;this.element.hidden=!map.open;if(!map.open){this.stamp='';return;}
    const stamp=JSON.stringify([w.runId,map.region,map.selected,w.adventure.currentId,map.reason(map.selected),[...w.adventure.rooms].map(([id,m])=>[id,m.visited,m.cleared,m.chests.map(c=>c.claimed),m.drops.length]),[...w.story.valves],[...w.story.seen]]);
    if(stamp===this.stamp)return;this.stamp=stamp;
    const focused=this.element.contains(document.activeElement)?(document.activeElement as HTMLButtonElement).dataset:undefined;
    const region=map.region,rooms=CHAPTER_ROOMS.filter(r=>r.region===region),minX=Math.min(...rooms.map(r=>r.grid.x)),maxX=Math.max(...rooms.map(r=>r.grid.x));
    const point=(r:RoomTemplate)=>({x:(600-(maxX-minX)*100)/2+(r.grid.x-minX)*100,y:45+(r.grid.y-(region-1)*4)*90});
    const route=map.route(),edges=new Set<string>();const lines=rooms.flatMap(r=>Object.values(r.doors).flatMap(id=>{
      const other=rooms.find(room=>room.id===id);if(!other)return [];const key=[r.id,other.id].sort().join(':');if(edges.has(key))return [];edges.add(key);
      const a=point(r),b=point(other),i=route.indexOf(r.id),highlight=i>=0&&(route[i-1]===id||route[i+1]===id),explored=w.adventure.rooms.get(r.id)!.visited&&w.adventure.rooms.get(other.id)!.visited;
      return [`<path class="${highlight?'route':explored?'explored':''}" d="M${a.x} ${a.y}H${b.x}V${b.y}"/>`];
    })).join('');
    const nodes=rooms.map(r=>{const m=w.adventure.rooms.get(r.id)!,p=point(r),current=r.id===w.adventure.currentId,done=w.story.valves.has(r.id),pending=r.valve&&!done,memoryPending=r.story&&!w.story.seen.has(r.story);
      const status=!m.visited?'未探索':!m.cleared?'待清场':pending?'阀门待修复':memoryPending?'遗物待查看':'已清场';
      return `<button class="map-node ${m.visited?'visited':'unknown'} ${m.cleared&&m.visited?'cleared':''} ${pending?'valve-pending':''} ${done?'valve-done':''} ${memoryPending?'memory-pending':''} ${current?'current':''} ${r.id===map.selected?'selected':''}" data-room="${r.id}" style="left:${p.x/6}%;top:${p.y/3.6}%" aria-label="${r.name}，${status}${current?'，当前位置':''}" aria-pressed="${r.id===map.selected}"><i>${icon(r,done)}</i><span>${r.name}</span><small>${current?'你在这里':pending?(m.cleared?'待修复':'待清场 / 阀门'):memoryPending?'遗物待查看':m.visited?(r.kind==='shop'?'营地':r.story?'遗物已查看':m.cleared?'已清场':'战斗中'):'未探索'}</small></button>`;
    }).join('');
    const selected=ROOM_BY_ID.get(map.selected)!,memory=w.adventure.rooms.get(selected.id)!,reason=map.reason(selected.id);
    const status=!memory.visited?'未探索 · 已显示位置':!memory.cleared?'尚未清场':selected.valve?(w.story.valves.has(selected.id)?'泄压阀已修复':'清场完成 · 泄压阀尚未修复'):selected.story?(w.story.seen.has(selected.story)?'归途遗物已查看':'归途遗物尚未查看'):'已清场 · 可自由通行';
    const remaining=CHAPTER_ROOMS.filter(r=>r.kind==='battle'&&r.region===region&&!w.adventure.rooms.get(r.id)!.cleared);
    const valves=map.valves,completed=valves.filter(v=>v.done).length;
    const detail=selected.valve&&!w.story.valves.has(selected.id)?'阀门在房间上方中央。清场后靠近，按 E 修复；清场本身不会完成修复。':selected.kind==='shop'?'首次抵达可休息恢复生命，购买武器和符印，并保存旅程。':selected.kind==='elite'?`本区六处战场全部清理后开启${region===2?'，同时需要修复三个泄压阀':''}。`:selected.kind==='event'?'靠近房间中央偏左的遗物，按 E 查看，完成归途记忆。':selected.kind==='final'?'击败灰冠骑士，收取战利品后走向归途灯。':'选择房间查看状态。金色路线沿实际门路连接；跨区域可切换上方标签查看。';
    const rewards=memory.chests.filter(c=>!c.claimed).length;
    this.element.innerHTML=`<section class="map-card"><header class="map-header"><div><small>ASH CORRIDOR / JOURNEY ATLAS</small><h1>回廊地图</h1></div><span class="map-location">当前位置 · ${w.adventure.template.name}<small>打开地图时游戏暂停</small></span><button data-close aria-label="关闭地图">关闭 <kbd>M / ESC</kbd></button></header>
      <nav class="map-tabs" aria-label="地图区域">${REGIONS.map((name,i)=>{const rs=CHAPTER_ROOMS.filter(r=>r.region===i+1),n=rs.filter(r=>w.adventure.rooms.get(r.id)!.visited).length;return `<button data-region="${i+1}" aria-pressed="${region===i+1}" class="${region===i+1?'active':''}"><em>0${i+1}</em>${name}<small>探索 ${n} / ${rs.length}</small></button>`;}).join('')}</nav>
      <div class="map-body"><div class="map-main"><div class="map-board"><svg class="map-links" viewBox="0 0 600 360" preserveAspectRatio="none" aria-hidden="true">${lines}</svg>${nodes}</div><div class="map-legend"><span class="legend-current">● 当前位置</span><span class="legend-clear">● 已清场</span><span class="legend-valve">◉ 阀门待修复</span><span>○ 未探索</span><span class="legend-route">━ 路线指引</span></div><div class="map-detail"><div><small>${kinds[selected.kind]} · 深度 ${selected.depth??1}</small><h2>${selected.name}</h2><strong>${status}</strong><p>${detail}${memory.visited&&(rewards||memory.drops.length)?`<br>可领取：${rewards} 个宝箱 · ${memory.drops.length} 把武器`:''}</p></div><div class="map-travel-action"><button data-travel="${selected.id}" ${reason?'disabled':''}>传送到此处</button><small>${reason||'免费传送 · 已探索的安全房间'}</small></div></div></div>
      <aside class="map-quests"><h2>旅程目标</h2><div class="quest-heading"><strong>熔铸工坊 · 泄压装置</strong><span>${completed} / 3</span></div><p>逐个修复，解除炉门封印</p>${valves.map((v,i)=>`<button class="quest-row ${v.done?'done':''}" data-room="${v.room.id}"><i>${v.done?'✓':String(i+1).padStart(2,'0')}</i><span>${v.room.name}<small>${v.done?'已修复':v.cleared?'待修复 · 靠近阀门按 E':'先清场，再修复阀门'}</small></span><b>›</b></button>`).join('')}<div class="quest-heading regional"><strong>本区炉门封印</strong><span>${6-remaining.length} / 6</span></div><p>${remaining.length?'尚未清理的战场，点击定位':'六处战场已清理'}</p><div class="map-battle-list">${remaining.map(r=>`<button data-room="${r.id}">○ ${r.name}<b>›</b></button>`).join('')||'<span class="quest-done">✓ 本区战场全部完成</span>'}</div><small class="map-travel-note">传送点随探索自动点亮。离开和抵达的房间都需清场；战斗与大招期间可查看地图，暂不能传送。</small></aside></div></section>`;
    if(wasHidden)this.element.querySelector<HTMLButtonElement>('[data-close]')?.focus({preventScroll:true});
    else if(focused){const selector=focused.room?`[data-room="${focused.room}"]`:focused.region?`[data-region="${focused.region}"]`:focused.close!==undefined?'[data-close]':undefined;if(selector)this.element.querySelector<HTMLButtonElement>(selector)?.focus({preventScroll:true});}
  }
  dispose(){this.controller.abort();this.element.remove();}
}
