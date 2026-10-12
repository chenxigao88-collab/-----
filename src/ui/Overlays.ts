import type { World } from '../world/World';
import { RUNE_BY_ID } from '../data/adventure';
import { REGIONS } from '../data/chapter';
import { UPGRADES, PROGRESSION_RULES, type UpgradeId } from '../room/ProgressionSystem';
export class Overlays {
  readonly element:HTMLDivElement;private lastState='';
  constructor(){this.element=document.createElement('div');this.element.className='overlay';this.element.hidden=true;}
  render(world:World){
    const key=`${world.runId}:${world.state}:${world.resultElapsed>=.5}:${Boolean(world.adventure.panel)}:${world.runes.owned.join(',')}`;if(key===this.lastState)return;this.lastState=key;
    this.element.hidden=Boolean(world.adventure.panel)||!['paused','victory','dead'].includes(world.state)||(world.state==='dead'&&world.resultElapsed<.5);if(this.element.hidden)return;
    const paused=world.state==='paused',win=world.state==='victory';
    const soundControls=paused?`<div class="audio-controls" aria-label="声音设置"><label>背景音乐 <output data-audio-output="musicVolume">${Math.round(world.settings.musicVolume*100)}%</output><input aria-label="背景音乐音量" type="range" min="0" max="1" step=".05" value="${world.settings.musicVolume}" data-audio="musicVolume"></label><label>战斗音效 <output data-audio-output="effectVolume">${Math.round(world.settings.effectVolume*100)}%</output><input aria-label="战斗音效音量" type="range" min="0" max="1" step=".05" value="${world.settings.effectVolume}" data-audio="effectVolume"></label><label class="audio-mute">全部静音<input aria-label="全部静音" type="checkbox" data-audio="mute" ${world.settings.mute?'checked':''}></label></div>`:'';
    const s=world.snapshot() as ReturnType<World['snapshot']> & {gunfu?:{completed:number}};
    const minutes=Math.floor(world.elapsed/60),seconds=Math.floor(world.elapsed%60).toString().padStart(2,'0');
    const result=world.adventureMode?`清理 ${world.adventure.clearedCount} / 22 个战斗房间 · 收集 ${world.adventure.collected} 金币<br>旅程 ${minutes}:${seconds} · 等级 ${world.progression.level}`:`到达第 ${Math.max(1,world.room.wave)} 波`;
    const p=world.progression,stats=world.player.stats;
    const growth=paused&&world.adventureMode?`<div class="pause-growth"><strong>${REGIONS[(world.adventure.template.region??1)-1]} · Lv.${p.level}</strong><p>生命 ${Math.ceil(world.player.actor.health.hp)} / ${world.player.actor.health.maxHP}<br>通用增伤 +${Math.round((stats.damageMultiplier*(1+p.ranks.damage*PROGRESSION_RULES.damage)-1)*100)}% · 枪斗／大招 +${Math.round(p.ranks.gunfu*PROGRESSION_RULES.gunfu*100)}%<br>元素亲和 +${Math.round(p.ranks.element*PROGRESSION_RULES.element*100)}%${world.player.actor.character==='violet'?` · 巨刃 +${Math.round(p.ranks.blade*PROGRESSION_RULES.blade*100)}%`:''}<br>减伤 ${Math.round(p.ranks.defence*PROGRESSION_RULES.defence*100)}% · 闪避冷却 ${stats.dashCooldown.toFixed(2)} 秒</p><p>${(Object.keys(UPGRADES) as UpgradeId[]).filter(id=>p.ranks[id]).map(id=>`${UPGRADES[id].name} ${p.ranks[id]}`).join(' · ')||'尚未选择强化'}</p><p>${world.story.relics.map(id=>({'memory-1':'刻鸟灯罩','memory-2':'维修账单','memory-3':'晚餐凭条'}[id]??id)).join(' · ')||'尚未收集记忆遗物'}${world.adventure.template.region===2?`<br>泄压阀 ${world.story.valves.size} / 3`:''}</p></div>`:'';
    this.element.innerHTML=`<div class="overlay-card"><div class="sigil">${win?'◇':'✧'}</div><h1>${paused?'已暂停':win?'炉心已平息':'冒险结束'}</h1><p>${paused?'WASD 移动 · 左键射击<br>右键逐段连招 · Space 闪避<br>E 交互 · Q 换持 · ESC 继续<br>R 紫夜终幕（一层） · Shift+R 紫鸾·断月（两层）':`${result}<br>有效连招 ${s.gunfu?.completed??0} 次 · 精准闪避 ${world.damage.perfectDodges} 次<br>元素反应 ${s.reactions} 次`}</p>${growth}${soundControls}${world.runes.owned.length?`<div class="pause-runes">${world.runes.owned.map(id=>{const r=RUNE_BY_ID.get(id)!;return `<p><strong>${r.name}</strong> ${r.description}</p>`;}).join('')}</div>`:''}<div class="overlay-actions">${paused?'<button data-command="resume">继续</button>':''}<button data-command="restart">重新启程</button></div></div>`;
  }
}
