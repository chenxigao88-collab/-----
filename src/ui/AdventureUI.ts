import type { World } from '../world/World';
import type { GameCommand } from './DebugPanel';
import type { SpriteRenderer } from '../rendering/SpriteRenderer';
import { RUNE_BY_ID, type RuneId } from '../data/adventure';
import { ELEMENTS, getReaction } from '../data/elements';
import { getWeapon, TIER_LABELS } from '../data/weapons';
import { runeIcon } from '../rendering/AdventureArt';
import {UPGRADES,type UpgradeId} from '../room/ProgressionSystem';
import {weaponStatLine,weaponVolley} from './WeaponStats';
export class AdventureUI {
  readonly element:HTMLDivElement;private key='';private controller=new AbortController();private icons=new Map<string,string>();
  constructor(private sprites:SpriteRenderer,command:(c:GameCommand)=>void){
    this.element=document.createElement('div');this.element.className='adventure-ui';this.element.hidden=true;
    this.element.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;
      if(b.dataset.buy)command({type:'shop-buy',id:b.dataset.buy});
      else if(b.dataset.upgrade)command({type:'upgrade-choose',id:b.dataset.upgrade as UpgradeId});
      else if(b.dataset.storyNext)command({type:'story-next'});
      else if(b.dataset.storySkip)command({type:'story-skip'});
      else if(b.dataset.rune)command({type:'rune-choose',id:b.dataset.rune as RuneId,slot:b.dataset.replace===undefined?undefined:Number(b.dataset.replace)});
      else if(b.dataset.weaponSlot)command({type:'loot-weapon',slot:Number(b.dataset.weaponSlot)});
      else if(b.dataset.lootBack)command({type:'loot-back'});
    },{signal:this.controller.signal});
  }
  private runeImage(id:RuneId){let url=this.icons.get(id);if(!url){const canvas=document.createElement('canvas');canvas.width=canvas.height=40;runeIcon(canvas.getContext('2d')!,id,20,20,RUNE_BY_ID.get(id)!.color,14);url=canvas.toDataURL();this.icons.set(id,url);}return url;}
  private runeCard(id:RuneId,action:string){const r=RUNE_BY_ID.get(id)!;return `<article class="reward-card" style="--reward-color:${r.color}"><img src="${this.runeImage(id)}" alt=""><small>${r.route}</small><h2>${r.name}</h2><p>${r.description}</p>${action}</article>`;}
  render(w:World){
    const a=w.adventure,p=a.panel;this.element.hidden=!p;if(!p){this.key='';return;}
    const key=JSON.stringify([w.runId,p,a.gold,a.shop,w.runes.owned,w.player.actor.health.hp,w.progression.snapshot(),w.story.current,w.story.line]);if(this.key===key)return;this.key=key;
    let title='',content='';
    if(p.kind==='upgrade'){title=`成长 · Lv.${w.progression.level}`;content=`<p class="reward-note">选择一项强化${w.progression.pending>1?` · 尚有${w.progression.pending}次选择`:''}</p><div class="reward-grid">${w.progression.offers.map(id=>{const u=UPGRADES[id];return `<article class="reward-card" style="--reward-color:${u.color}"><div class="upgrade-sigil" style="color:${u.color}">✧</div><small>${w.progression.ranks[id]} / ${u.cap}</small><h2>${u.name}</h2><p>${u.description}</p><button data-upgrade="${id}">选择</button></article>`;}).join('')}</div>`;}
    if(p.kind==='story'){const scene=w.story.scene,line=scene.lines[w.story.line];title=scene.title;let image='';if(line.portrait==='violet'||line.portrait==='ember')image=this.sprites.characterPortrait(line.portrait).toDataURL();else image=this.sprites.chapterPortrait(line.portrait==='knight'?'boss':'lamp').toDataURL();content=`<div class="story-dialogue"><img src="${image}" alt="${line.speaker}"><div><small>${line.speaker}</small><p>${line.text}</p></div></div><div class="story-actions"><button data-story-skip="true">跳过本段</button><button data-story-next="true">${w.story.line<scene.lines.length-1?'继续':'收好灯，继续前行'}</button></div><small class="story-page">${w.story.line+1} / ${scene.lines.length}</small>`;}
    if(p.kind==='chest'){title='晶封秘藏';content=`<p class="reward-note">选择一枚符印</p><div class="reward-grid">${p.choices?.map(id=>this.runeCard(id,`<button data-rune="${id}">选择</button>`)).join('')}</div>`;}
    if(p.kind==='replace'){title='替换符印';const next=RUNE_BY_ID.get(p.rune!)!;content=`<p class="reward-note">获得「${next.name}」：${next.description}</p><div class="reward-grid">${w.runes.owned.map((id,i)=>this.runeCard(id,`<button data-rune="${p.rune}" data-replace="${i}">替换这枚</button>`)).join('')}</div>`;}
    if(p.kind==='shop'){
      title='旧火行商';content=`<div class="shop-wallet"><span>金币</span><strong>${a.gold}</strong></div><div class="reward-grid">${a.shop.map(item=>{
        const blocked=item.sold||a.gold<item.price||(item.id==='heal'&&w.player.actor.health.hp>=w.player.actor.health.maxHP)||(item.id==='rune'&&(!item.rune||w.runes.has(item.rune)));
        const label=item.sold?'售罄':item.id==='heal'&&w.player.actor.health.hp>=w.player.actor.health.maxHP?'生命已满':a.gold<item.price?'金币不足':`${item.price} 金币`;
        const button=`<button data-buy="${item.id}" ${blocked?'disabled':''}>${label}</button>`;
        if(item.id==='rune'&&item.rune)return this.runeCard(item.rune,button);
        if(item.id==='weapon'&&item.weapon){const gun=getWeapon(item.weapon);return `<article class="reward-card"><img class="reward-weapon" src="${this.sprites.weaponIcon(gun.icon).toDataURL()}" alt=""><small>${TIER_LABELS[gun.tier]} · ${ELEMENTS[gun.element].name}</small><h2>${gun.displayName}</h2><p>${weaponStatLine(w,gun)}</p><p>${gun.description}</p>${button}</article>`;}
        return `<article class="reward-card"><div class="potion-icon" aria-hidden="true"></div><small>补给</small><h2>温烬药</h2><p>立即回复25生命。</p>${button}</article>`;
      }).join('')}</div>`;
    }
    if(p.kind==='weapon'){
      const gun=getWeapon(p.weapon!);title=gun.displayName;content=`<img class="weapon-preview" src="${this.sprites.weaponIcon(gun.icon).toDataURL()}" alt="${gun.displayName}"><p class="reward-note">${TIER_LABELS[gun.tier]} · ${ELEMENTS[gun.element].name} · ${weaponStatLine(w,gun)}${p.price?` · ${p.price}金币`:''}</p><p class="reward-note">${gun.description}</p><div class="reward-grid two">${w.weapons.slots.map((slot,i)=>{const other=w.weapons.slots[1-i].data,after=getReaction(gun.element,other.element),old=weaponVolley(w,slot.data),next=weaponVolley(w,gun),delta=Math.round((next/old-1)*100);return `<article class="reward-card"><small>${i===0?'A':'B'} · ${TIER_LABELS[slot.data.tier]} → ${TIER_LABELS[gun.tier]}</small><h2>${slot.data.displayName} → ${gun.displayName}</h2><p>${weaponStatLine(w,slot.data)}</p><p>完整一轮／满蓄全命中 ${old} → ${next}（${delta>=0?'+':''}${delta}%）</p><p>${after?`${after.name} · ${after.description}`:'同元素搭配'}</p><button data-weapon-slot="${i}" ${other.id===gun.id?'disabled':''}>替换${i===0?'A':'B'}</button></article>`;}).join('')}</div>`;
    }
    this.element.innerHTML=`<div class="reward-panel ${p.kind==='weapon'?'weapon-reward-panel':''} ${p.kind==='story'?'story-panel':''}"><h1>${title}</h1>${content}${p.kind==='story'||p.kind==='upgrade'?'':`<button class="reward-back" data-loot-back="true">${p.kind==='shop'||p.kind==='chest'?'离开':'返回'}</button>`}</div>`;
  }
  dispose(){this.controller.abort();this.element.remove();}
}
