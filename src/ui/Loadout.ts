import { STARTER_WEAPONS, SKILLS } from '../data/weapons';
import { ELEMENTS, getReaction } from '../data/elements';
import type { World } from '../world/World';
import type { SpriteRenderer } from '../rendering/SpriteRenderer';
import type { GameCommand } from './DebugPanel';
import { CHARACTERS } from '../data/characters';

export class Loadout {
  readonly element:HTMLDivElement;private controller=new AbortController();
  constructor(sprites:SpriteRenderer,command:(command:GameCommand)=>void) {
    this.element=document.createElement('div');this.element.className='loadout';this.element.hidden=true;
    this.element.innerHTML=`<div class="loadout-card"><h1>选择角色与双武器</h1><div class="character-select">${CHARACTERS.map(c=>`<button class="character-card" data-character="${c.id}" aria-pressed="false"><img src="${sprites.characterPortrait(c.id).toDataURL()}" alt="${c.name}"><span><strong>${c.name} · ${c.tag}</strong><small>${c.description}</small></span></button>`).join('')}</div><p class="loadout-intro" data-character-intro>右键逐段连招 · Q 调整换持</p><div class="loadout-grid">${STARTER_WEAPONS.map(w=>{
      const e=ELEMENTS[w.element],s=SKILLS[w.skillId];
      return `<article data-choice="${w.id}" style="--element-color:${e.color}"><div class="choice-top"><img src="${sprites.weaponIcon(w.icon).toDataURL()}" alt=""><span class="element-label">${e.symbol} · ${e.name}元素</span></div><h2>${w.displayName}</h2><p>${w.description}</p><small>强化终结 ${s.name} · ${s.cooldown}s 冷却</small><div class="choice-actions"><button data-select="${w.id}" data-slot="0">装备 A</button><button data-select="${w.id}" data-slot="1">装备 B</button></div></article>`;
    }).join('')}</div><div class="loadout-summary"><strong data-pair></strong><span data-reaction></span><small data-resonance></small></div><button class="loadout-done" data-done>准备好了</button><small class="loadout-help">返回后按 E 启程 · ESC 返回</small></div>`;
    this.element.addEventListener('click',event=>{
      const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
      if(button.dataset.select)command({type:'loadout-weapon',slot:Number(button.dataset.slot),id:button.dataset.select});
      if(button.dataset.character)command({type:'loadout-character',id:button.dataset.character as 'ember'|'violet'});
      if(button.hasAttribute('data-done'))command({type:'loadout-close'});
    },{signal:this.controller.signal});
  }
  get open(){return !this.element.hidden;}
  show(world:World){this.element.hidden=false;this.sync(world);this.element.querySelector<HTMLButtonElement>('[data-done]')!.focus();}
  hide(){this.element.hidden=true;}
  sync(world:World){
    for(const button of this.element.querySelectorAll<HTMLButtonElement>('[data-character]')){const active=world.player.actor.character===button.dataset.character;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));}
    this.element.querySelector('[data-character-intro]')!.textContent=world.player.actor.character==='violet'?'紫鸢 · 六次右键逐段接招 · 三枪自动瞄准 · 冒险中拾取进阶武器':'余烬 · 五次右键逐段接招 · 两枪自动瞄准 · 冒险中拾取进阶武器';
    const [a,b]=world.weapons.slots.map(s=>s.data),reaction=getReaction(a.element,b.element);
    this.element.querySelector('[data-pair]')!.textContent=`A ${a.displayName} · ${ELEMENTS[a.element].name} ＋ B ${b.displayName} · ${ELEMENTS[b.element].name}`;
    this.element.querySelector('[data-reaction]')!.textContent=reaction?`${reaction.name} · ${reaction.description}`:'同元素 · 以武器特性互补，仍可完成枪斗连招';
    this.element.querySelector('[data-resonance]')!.textContent=`A 起式 → B ${SKILLS[b.skillId].name}终结 / B 起式 → A ${SKILLS[a.skillId].name}终结 · 满枪斗势时强化`;
    for(const button of this.element.querySelectorAll<HTMLButtonElement>('[data-select]')){
      const slot=Number(button.dataset.slot),active=world.weapons.slots[slot].data.id===button.dataset.select;
      button.classList.toggle('selected',active);button.setAttribute('aria-pressed',String(active));button.textContent=active?`已装备 ${slot?'B':'A'}`:`装备 ${slot?'B':'A'}`;
    }
  }
  dispose(){this.controller.abort();this.element.remove();}
}
