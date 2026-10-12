import type {World} from '../world/World';
import type {GameCommand} from './DebugPanel';
import type {SpriteRenderer} from '../rendering/SpriteRenderer';
import {DEFENSE_RULES,STRUCTURES,type StructureKind} from '../data/defense';
import {getWeapon} from '../data/weapons';
export class DefenseUI {
  readonly element=document.createElement('div');private key='';private images=new Map<string,string>();private controller=new AbortController();
  constructor(private sprites:SpriteRenderer,command:(c:GameCommand)=>void){
    this.element.className='defense-ui';this.element.hidden=true;
    this.element.addEventListener('click',event=>{const b=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;
      if(b.dataset.buildKind)command({type:'defense-tool',kind:b.dataset.buildKind as StructureKind|'inspect'});
      else if(b.dataset.defenseAction)command({type:b.dataset.defenseAction as 'defense-toggle'});
      else if(b.dataset.supply)command({type:'defense-weapon',id:b.dataset.supply,slot:Number(b.dataset.slot)});
    },{signal:this.controller.signal});
  }
  private image(kind:StructureKind){let image=this.images.get(kind);if(!image){const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const c=canvas.getContext('2d')!;c.imageSmoothingEnabled=false;this.sprites.drawFrame(c,STRUCTURES[kind].frame,32,61,true);image=canvas.toDataURL();this.images.set(kind,image);}return image;}
  render(w:World){
    this.element.hidden=!w.defenseMode||!['ready','playing'].includes(w.state)||Boolean(w.adventure.panel);if(this.element.hidden){this.key='';return;}
    const d=w.defense,s=d.structures.find(s=>s.id===d.selected&&s.hp>0),key=JSON.stringify([w.runId,d.phase,d.wave,d.gold,d.core.hp,d.walls,d.towers,d.buildOpen,d.tool,d.rotation,s?.id,s?.hp,s?.level,s?.construction?Math.ceil(s.construction*10):0,Math.ceil(d.intermission),d.alive.length,d.spawned,d.supply,w.progression.level,w.ultimate.active]);
    if(key===this.key)return;this.key=key;
    const prep=d.phase==='preparation',pause=d.phase==='intermission',build=d.buildOpen&&!w.ultimate.active;
    const disabled=!d.canBuild?'disabled':'';
    const cards=(Object.keys(STRUCTURES) as StructureKind[]).map(kind=>{const data=STRUCTURES[kind],limit=kind==='wall'?d.walls>=12:d.towers>=6;return `<button class="build-card ${d.tool===kind?'selected':''}" data-build-kind="${kind}" title="${data.description}" ${d.gold<data.price||limit||!d.canBuild?'disabled':''}><img src="${this.image(kind)}" alt=""><span>${data.name}<small>${data.price}金币</small></span></button>`;}).join('');
    const info=s?`<div class="structure-tools"><strong>${STRUCTURES[s.kind].name} · Lv.${s.level} · ${s.hp}/${s.maxHP}</strong><button data-defense-action="defense-repair" ${s.hp>=s.maxHP||s.construction>0||d.gold<d.repairCost(s)?'disabled':''}>修理 ${d.repairCost(s)}金</button><button data-defense-action="defense-upgrade" ${s.level>=3||s.construction>0||d.gold<d.upgradeCost(s)?'disabled':''}>${s.level>=3?'已满级':`升级 ${d.upgradeCost(s)}金`}</button><button data-defense-action="defense-sell" ${d.phase==='wave'?'disabled':''}>拆除返还 ${Math.floor(STRUCTURES[s.kind].price*.6*s.hp/s.maxHP)}金</button></div>`:'';
    this.element.innerHTML=`<div class="defense-status"><div class="defense-title"><strong>余烬炉心</strong><span>${prep?'自由构建 · 准备就绪后开战':pause?`整备 ${Math.ceil(d.intermission)}秒`:`第 ${d.wave} / 6 波 · 存活 ${d.alive.length}`}</span></div><div class="core-track"><i style="width:${Math.max(0,d.core.hp/DEFENSE_RULES.coreHP)*100}%"></i></div><small>核心 ${d.core.hp} / ${DEFENSE_RULES.coreHP} · Lv.${w.progression.level}</small></div><div class="defense-wallet"><strong>${d.gold}</strong> 金币<small>墙 ${d.walls}/12 · 炮塔 ${d.towers}/6</small></div><div class="defense-controls"><button data-defense-action="defense-toggle" ${disabled}>${build?'返回战斗 · B':'建造工事 · B'}</button>${prep||pause?`<button data-defense-action="defense-start" ${w.progression.pending?'disabled':''}>${prep?'开始防守':'提前开始下一波'}</button>`:''}${prep?'<button data-defense-action="adventure-entry">返回关卡选择</button>':''}</div>${build?`<div class="build-tray">${cards}<button class="build-card inspect ${d.tool==='inspect'?'selected':''}" data-build-kind="inspect"><span>管理<small>点选工事</small></span></button></div><div class="build-hint">左键放置／选择 · 右键返回战斗 · F 旋转围墙 · 战斗中施工 ${DEFENSE_RULES.buildTime}秒</div>${info}`:''}${d.supply.length?`<div class="defense-supply"><strong>武器补给 · 免费选择一把</strong>${d.supply.map(id=>{const gun=getWeapon(id);return `<div><span>${gun.displayName}</span><button data-supply="${id}" data-slot="0" ${w.weapons.slots[1].data.id===id?'disabled':''}>换A</button><button data-supply="${id}" data-slot="1" ${w.weapons.slots[0].data.id===id?'disabled':''}>换B</button></div>`;}).join('')}</div>`:''}`;
  }
  dispose(){this.controller.abort();this.element.remove();}
}
