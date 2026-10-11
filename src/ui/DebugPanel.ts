import { WEAPONS } from '../data/weapons';
import type { DebugSettings } from '../data/player';
import type { World } from '../world/World';
import type { GameLoop } from '../core/GameLoop';
import type { EnemyKind, ResonanceType } from '../core/types';
import type { CharacterId } from '../data/characters';
import type { RuneId } from '../data/adventure';
export type GameCommand =
  | {type:'upgrade-choose';id:import('../room/ProgressionSystem').UpgradeId}
  | {type:'story-next'|'story-skip'|'continue-run'}
  | {type:'shop-buy';id:string}
  | {type:'rune-choose';id:RuneId;slot?:number}
  | {type:'loot-weapon';slot:number}
  | {type:'loot-back'}
  | { type: 'pause' | 'resume' | 'restart' | 'debug' | 'heal' | 'fill' | 'skill-cooldown' | 'defaults' | 'loadout' | 'loadout-close' }
  | { type:'loadout-weapon'; slot:number; id:string }
  | { type:'loadout-character'; id:CharacterId }
  | { type: 'spawn'; kind: EnemyKind }
  | { type: 'weapon'; slot: number; id: string }
  | { type: 'resonance-type'; value: ResonanceType | 'default' }
  | { type: 'fixture'; mode: 'pierce' | 'bounce' | 'homing' | 'explosion' }
  | { type: 'setting'; key: keyof DebugSettings; value: number | boolean };
export class DebugPanel {
  readonly element: HTMLDivElement; private controller = new AbortController();
  constructor(private command: (command: GameCommand) => void, private settings: DebugSettings) {
    this.element=document.createElement('div');this.element.className='debug';this.element.hidden=true;
    const options=WEAPONS.map(w=>`<option value="${w.id}">${w.displayName}</option>`).join('');
    const check=(key:keyof DebugSettings,label:string)=>`<label>${label}<input type="checkbox" data-setting="${key}" ${settings[key]?'checked':''}></label>`;
    const range=(key:keyof DebugSettings,label:string,min:number,max:number,step:number)=>`<label>${label}<span><output data-output="${key}">${settings[key]}</output><input type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${settings[key]}"></span></label>`;
    this.element.innerHTML=`<h2>DEBUG / 试炼工作台</h2><div class="note">F2 关闭 · 调试敌人不计入波次<br>修改参数只影响后续攻击</div>
      <h3>玩家 / 房间</h3>${check('invincible','玩家无敌')}<div class="row"><button data-action="heal">恢复满血</button><button data-action="restart">重置房间</button></div>
      <div class="row"><button data-spawn="chaser">+ 炭爪</button><button data-spawn="shooter">+ 炉眼</button><button data-spawn="sniper">+ 线棺</button></div>
      <h3>双武器</h3><label>主槽 A<select data-weapon="0">${options}</select></label><label>副槽 B<select data-weapon="1">${options}</select></label>
      <label>夹具武器属性<select data-resonance><option value="default">默认</option><option value="swift">swift 迅捷</option><option value="heavy">heavy 厚重</option><option value="arcane">arcane 秘能</option></select></label>
      <div class="row"><button data-action="fill">充满枪斗势</button><button data-action="skill-cooldown">强化终结冷却设为 3s</button></div>
      <h3>手感 / 参数</h3>${range('moveSpeed','移动速度',80,400,10)}${range('damageMultiplier','伤害倍率',.1,5,.1)}${range('shakeStrength','镜头震动',0,2,.1)}${range('hitStrength','顿帧强度',0,2,.1)}
      ${check('mute','静音')}${check('screenFlash','受伤屏幕提示')}
      <h3>诊断</h3>${check('collisions','显示碰撞形状')}${check('enemyStates','显示敌人状态')}${check('stats','FPS / 弹体 / 枪斗统计')}
      <h3>弹体能力夹具</h3><div class="row"><button data-fixture="pierce">穿透 1</button><button data-fixture="bounce">反弹 1</button><button data-fixture="homing">追踪</button><button data-fixture="explosion">爆炸</button></div>
      <pre data-stats></pre><div class="row"><button data-action="defaults">恢复调试默认值</button><button data-action="debug">关闭</button></div>`;
    this.element.addEventListener('click',e=>{
      const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!button)return;
      if(button.dataset.action)this.command({type:button.dataset.action} as GameCommand);
      if(button.dataset.spawn)this.command({type:'spawn',kind:button.dataset.spawn as EnemyKind});
      if(button.dataset.fixture)this.command({type:'fixture',mode:button.dataset.fixture as 'pierce'});
    },{signal:this.controller.signal});
    this.element.addEventListener('input',e=>{
      const input=e.target as HTMLInputElement;
      if(input.dataset.setting){const key=input.dataset.setting as keyof DebugSettings;const value=input.type==='checkbox'?input.checked:Number(input.value);this.command({type:'setting',key,value});const output=this.element.querySelector(`[data-output="${key}"]`);if(output)output.textContent=String(value);}
    },{signal:this.controller.signal});
    this.element.addEventListener('change',e=>{
      const select=e.target as HTMLSelectElement;
      if(select.dataset.weapon)this.command({type:'weapon',slot:Number(select.dataset.weapon),id:select.value});
      if(select.hasAttribute('data-resonance'))this.command({type:'resonance-type',value:select.value as ResonanceType|'default'});
    },{signal:this.controller.signal});
  }
  toggle(){this.element.hidden=!this.element.hidden;}
  sync(world:World){for(let i=0;i<2;i++)this.element.querySelector<HTMLSelectElement>(`[data-weapon="${i}"]`)!.value=world.weapons.slots[i].data.id;this.element.querySelector<HTMLSelectElement>('[data-resonance]')!.value=world.weapons.current.typeOverride??'default';}
  render(world:World,loop:GameLoop){if(this.element.hidden)return;const s=world.snapshot() as ReturnType<World['snapshot']> & {gunfu?:{style:number;completed:number;stage:string;window:number;cooldown:number};freeze?:number;freezeCooldown?:number};this.element.querySelector('[data-stats]')!.textContent=`FPS ${Math.round(loop.fps)}\n局 ${s.runId} / ${s.state} / 波 ${s.wave}\nHP ${s.hp} / 命中 ${s.hits}\n敌人 ${s.enemyCount} / 波内 ${s.waveAlive}\n弹体 ${s.projectiles} / 峰值 ${s.peak}\n粒子 ${s.particles} / 音频节点 ${world.audio.nodes}\n枪斗势 ${s.gunfu?.style??0} / 连招 ${s.gunfu?.completed??0}\n连招阶段 ${s.gunfu?.stage??'idle'}\n衔接窗口 ${(s.gunfu?.window??0).toFixed(2)}s / 间隔 ${(s.gunfu?.cooldown??0).toFixed(2)}s\n元素反应 ${s.reactions} / 灼烧 ${s.burns}\n技能区域 ${s.areas}\n精准闪避 ${s.perfectDodges}\n敌方时停 ${(s.freeze??0).toFixed(3)}s / 奖励间隔 ${(s.freezeCooldown??0).toFixed(2)}s\n敌方倍率 ${s.slow.toFixed(2)}\n顿帧 ${s.hitStop.toFixed(3)}s\n订阅 ${s.subscriptions}\n超时丢弃 ${loop.droppedTime.toFixed(3)}s`;
  }
  resetControls(){for(const input of this.element.querySelectorAll<HTMLInputElement>('[data-setting]')){const value=this.settings[input.dataset.setting as keyof DebugSettings];if(input.type==='checkbox')input.checked=Boolean(value);else input.value=String(value);const output=this.element.querySelector(`[data-output="${input.dataset.setting}"]`);if(output)output.textContent=String(value);}}
  dispose(){this.controller.abort();this.element.remove();}
}
