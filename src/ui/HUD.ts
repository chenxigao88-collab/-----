import type { World } from '../world/World';
import type { SpriteRenderer } from '../rendering/SpriteRenderer';
import { CHAPTER_ROOMS, RUNE_BY_ID } from '../data/adventure';
import { ELEMENTS } from '../data/elements';
import { SKILLS } from '../data/weapons';
import { distance } from '../core/types';
import { AdventureArt, diamond, pixelPanel, runeIcon } from '../rendering/AdventureArt';
import {REGIONS} from '../data/chapter';
import {weaponHit} from './WeaponStats';
import {shotProfile} from '../data/weaponMechanics';
export class HUD {
  readonly element:HTMLDivElement;readonly canvas:HTMLCanvasElement;
  private ctx:CanvasRenderingContext2D;private art=new AdventureArt();private icons=new Map<string,HTMLCanvasElement>();
  private portraits=new Map<string,HTMLCanvasElement>();private trail=100;private lastHP=100;private trailWait=0;
  constructor(private sprites:SpriteRenderer){
    this.element=document.createElement('div');this.element.className='hud pixel-hud';
    this.element.innerHTML='<canvas class="hud-canvas" width="960" height="540" aria-hidden="true"></canvas><button class="pixel-pause" data-command="pause" aria-label="暂停" title="暂停 · ESC">Ⅱ</button><button class="pixel-loadout" data-command="loadout">角色与武器</button><div class="prompt" data-ui="prompt" hidden></div><div class="toast" data-ui="toast" hidden></div><span class="sr-only" data-ui="hp"></span><span class="sr-only" data-ui="room" aria-live="polite"></span><span class="sr-only" data-ui="inventory"></span><div class="flash" data-ui="flash"></div>';
    const continueButton=document.createElement('button');continueButton.className='pixel-continue';continueButton.dataset.command='continue-run';continueButton.textContent='继续上次旅程';continueButton.hidden=true;this.element.append(continueButton);
    this.canvas=this.element.querySelector('canvas')!;this.ctx=this.canvas.getContext('2d')!;
  }
  private icon(id:string){let icon=this.icons.get(id);if(!icon){icon=this.sprites.weaponIcon(id);this.icons.set(id,icon);}return icon;}
  render(w:World,dt:number){
    const c=this.ctx;c.clearRect(0,0,960,540);c.imageSmoothingEnabled=false;c.textBaseline='alphabetic';c.textAlign='left';
    const hp=w.player.actor.health,character=w.player.actor.character;
    if(hp.hp<this.lastHP)this.trailWait=.35;if(hp.hp>this.lastHP)this.trail=hp.hp;this.lastHP=hp.hp;
    this.trailWait=Math.max(0,this.trailWait-dt);if(!this.trailWait)this.trail=Math.max(hp.hp,this.trail-dt*100);
    const theme=character==='violet'?'#b69ad4':'#cda071';pixelPanel(c,18,16,250,57,theme);pixelPanel(c,23,20,46,46,theme);
    let portrait=this.portraits.get(character);if(!portrait){portrait=this.sprites.characterPortrait(character);this.portraits.set(character,portrait);}
    c.drawImage(portrait,22,28,44,36,25,23,40,40);
    c.fillStyle='#5f293e';c.fillRect(78,34,174,13);c.fillStyle='#c28d6c';c.fillRect(79,35,172*Math.min(1,this.trail/hp.maxHP),11);c.fillStyle='#aa4d6a';c.fillRect(79,35,172*hp.hp/hp.maxHP,11);c.fillStyle='#e08aa0';c.fillRect(79,35,172*hp.hp/hp.maxHP,2);c.fillStyle='#703249';c.fillRect(79,44,172*hp.hp/hp.maxHP,2);
    for(let x=122;x<250;x+=43){c.fillStyle='#211b30';c.fillRect(x,36,1,10);}
    c.font='10px Consolas, Microsoft YaHei';c.fillStyle='#f0dacf';c.fillText(`${hp.hp} / ${hp.maxHP}`,78,29);
    if(w.damage.shield>0){c.fillStyle='#a6d4ac';c.fillRect(78,51,Math.min(174,w.damage.shield/8*174),3);}
    if(hp.hp<=25&&Math.floor(w.elapsed*4)%2===0){c.strokeStyle='#e9a3a2';c.strokeRect(18,16,250,57);}
    if(w.adventureMode){
      c.font='10px Consolas';c.fillStyle='#d6c0e5';c.textAlign='right';c.fillText(`Lv.${w.progression.level}`,250,29);c.textAlign='left';c.fillStyle='#292335';c.fillRect(78,59,174,3);c.fillStyle='#d8b178';c.fillRect(78,59,174*(w.progression.level>=12?1:w.progression.xp/w.progression.threshold),3);
      pixelPanel(c,798,16,98,30,'#c7a467');c.drawImage(this.art.coin(Math.floor(w.elapsed*8)),807,24);c.font='bold 12px Consolas';c.fillStyle='#f4d997';c.fillText(String(w.adventure.gold),832,36);if(!w.ultimate.active)this.map(c,w);
      if(w.adventure.roomAnnouncement>0&&!w.special.boss){c.textAlign='center';c.font='13px Microsoft YaHei';c.fillStyle='#e4c7a2';c.fillText(w.adventure.template.name,480,38);c.textAlign='left';}
      const boss=w.special.boss;if(boss){pixelPanel(c,294,16,428,68,'#b99469');c.textAlign='center';c.font='12px Microsoft YaHei';c.fillStyle='#efd7b5';c.fillText(`灰冠骑士 · ${['最后的守门人','裂铠','炉心燃尽'][boss.bossPhase-1]}`,508,31);c.textAlign='left';c.fillStyle='#452a32';c.fillRect(305,38,405,11);c.fillStyle='#c57c63';c.fillRect(305,38,405*boss.actor.health.hp/boss.actor.health.maxHP,11);c.fillStyle='#edb087';c.fillRect(305,38,405*boss.actor.health.hp/boss.actor.health.maxHP,2);c.fillStyle='#2c2837';c.fillRect(305,55,405,3);c.fillStyle=boss.brokenRemaining>0?'#f4d8a8':'#b7a0d0';c.fillRect(305,55,405*(boss.brokenRemaining>0?boss.brokenRemaining/2.5:boss.poise/boss.poiseMax),3);}
    }
    const boss=w.special.boss;
    if(w.adventureMode&&boss){
      c.fillStyle='#e8c397';c.font='9px Microsoft YaHei';c.textAlign='center';
      c.fillText(boss.brokenRemaining>0?`破韧 · ${boss.brokenRemaining.toFixed(1)}s · 受到伤害 +20%`:`韧性 ${Math.ceil(boss.poise)} / ${boss.poiseMax} · 连招、元素反应与精准闪避可破韧`,508,79);c.textAlign='left';
      c.fillStyle='#f2d6ac';for(const threshold of [.65,.3])c.fillRect(Math.round(305+405*threshold),38,1,11);
    }
    pixelPanel(c,18,468,160,51,theme);diamond(c,43,492,13,w.player.dashCooldown>0?'#4b5062':'#9ed9d1');
    c.fillStyle='#182232';if(w.player.dashCooldown>0)c.fillRect(31,480,25,Math.round(25*w.player.dashCooldown/w.player.stats.dashCooldown));
    c.fillStyle='#e7f6dd';c.fillRect(39,489,7,2);c.fillRect(36,492,9,2);c.fillRect(33,495,10,2);
    const style=w.resonance.meter;for(let i=0;i<5;i++){diamond(c,77+i*19,492,6,theme,style>=(i+1)*20);const partial=Math.max(0,Math.min(1,(style-i*20)/20));if(partial>0&&partial<1){c.fillStyle=theme;c.fillRect(73+i*19,496,Math.round(8*partial),1);}}
    if(style>=100){c.fillStyle='#f4ddb2';c.fillRect(69,476,91,1);c.fillRect(69,507,91,1);}
    if(character==='violet'){
      pixelPanel(c,190,468,235,51,w.ultimate.secondReady?'#f0c7ff':w.ultimate.ready?'#e3bedb':'#8a75ab');
      for(let layer=0;layer<2;layer++){c.fillStyle='#20182e';c.fillRect(201+layer*108,499,102,8);c.fillStyle=layer?'#e3b7f4':'#997ac6';c.fillRect(202+layer*108,500,100*Math.max(0,Math.min(1,(w.ultimate.energy-layer*100)/100)),6);}
      c.font='11px Microsoft YaHei';c.fillStyle='#ecd9f9';c.fillText(w.ultimate.active&&w.ultimate.tier===2?'紫鸾·断月':'紫夜终幕 / 紫鸾·断月',202,484);
      c.font='10px Consolas, Microsoft YaHei';c.fillText(w.ultimate.active?'演出中':w.ultimate.secondReady?'R 一层 · Shift+R 断月':w.ultimate.ready?`R 可释放 · 二层 ${Math.floor(w.ultimate.energy-100)}%`:`一层 ${Math.floor(w.ultimate.energy)}% · R`,202,496);
    }
    const swapCooldown=w.weapons.manualSwitchCooldown;
    pixelPanel(c,854,429,80,23,swapCooldown>0?'#6d606f':'#e3bd7d');
    c.font='11px Consolas, Microsoft YaHei';c.fillStyle=swapCooldown>0?'#a99bb2':'#f1dcc0';c.textAlign='right';
    c.fillText(swapCooldown>0?`Q · ${swapCooldown.toFixed(1)}s`:'Q · 换武器',927,445);c.textAlign='left';
    for(let i=0;i<2;i++){
      const slot=w.weapons.slots[i],x=790+i*74,active=i===w.weapons.active,color=ELEMENTS[slot.data.element].color;
      pixelPanel(c,x,456,70,70,active?'#e3bd7d':'#6d606f');c.globalAlpha=active?1:.7;c.drawImage(this.icon(slot.data.icon),x+13,466,44,24);c.globalAlpha=1;
      diamond(c,x+58,467,5,color);c.fillStyle='#f1dcc0';c.font='9px Microsoft YaHei';c.textAlign='center';c.fillText(`${slot.data.displayName.split('·')[0].slice(0,5)} ${['Ⅰ','Ⅱ','Ⅲ'][slot.data.tier-1]}`,x+35,503);c.fillStyle='#d4bedc';c.font='8px Consolas';const profile=shotProfile(slot.data,1);c.fillText(`${slot.data.mechanic?.mode==='charge'?'满 ':''}${weaponHit(w,slot.data,1)}${profile.count>1?`×${profile.count}`:''}`,x+35,521);c.textAlign='left';
      c.fillStyle='#292e40';c.fillRect(x+8,510,54,2);c.fillStyle=color;c.fillRect(x+8,510,54*(1-Math.min(1,slot.cooldown*slot.data.attackRate)),2);
      if(slot.skillCooldown>0){c.fillStyle='#161a29cc';c.fillRect(x+54,462,10,Math.round(10*slot.skillCooldown/SKILLS[slot.data.skillId].cooldown));}
    }
    for(let i=0;i<w.runes.owned.length;i++){const rune=RUNE_BY_ID.get(w.runes.owned[i])!;pixelPanel(c,427+i*36,482,32,32,theme);runeIcon(c,rune.id,443+i*36,498,rune.color,9);}
    const seq=w.gunfu.snapshot();if(w.gunfu.busy){
      const violet=character==='violet',steps=violet?6:5,phase=violet?Math.min(5,seq.phase):[0,1,2,3,3,3,4,4,4][seq.phase],start=480-(steps-1)*13;
      for(let i=0;i<steps;i++){diamond(c,start+i*26,458,4,i===phase?'#f5dca1':'#a299c0',i<=phase);if(i<steps-1){c.fillStyle='#675a73';c.fillRect(start+i*26+6,458,14,1);}}
      if(seq.awaiting){const width=(steps-1)*26+14;c.fillStyle='#dfc495';c.fillRect(start-7,468,width,2);c.fillStyle='#181a28';c.fillRect(start-7+width*seq.window/.45,468,width*(1-seq.window/.45),2);}
    }
    const prompt=this.element.querySelector<HTMLElement>('[data-ui="prompt"]')!;
    const text=w.adventureMode?w.adventure.prompt():w.state==='ready'&&distance(w.player.actor.pos,{x:480,y:375})<=42?'E · 开始试炼':'';
    prompt.textContent=text;prompt.hidden=!text||!['ready','playing'].includes(w.state);
    this.element.querySelector<HTMLElement>('[data-command="loadout"]')!.hidden=w.state!=='ready';
    this.element.querySelector<HTMLElement>('[data-command="continue-run"]')!.hidden=w.state!=='ready'||!w.checkpointAvailable;
    const toast=this.element.querySelector<HTMLElement>('[data-ui="toast"]')!;toast.textContent=w.toast;toast.hidden=w.toastLife<=0;
    this.element.querySelector<HTMLElement>('[data-ui="hp"]')!.textContent=`生命 ${hp.hp} / ${hp.maxHP}`;
    this.element.querySelector<HTMLElement>('[data-ui="room"]')!.textContent=w.adventureMode?`${w.adventure.template.name} · ${w.adventure.locked?'战斗中':'可通行'}`:'余烬试炼';
    this.element.querySelector<HTMLElement>('[data-ui="inventory"]')!.textContent=`${w.weapons.slots.map(s=>s.data.displayName).join('、')} · Q ${swapCooldown>0?`冷却 ${swapCooldown.toFixed(1)}秒`:'可切换'} · ${w.adventureMode?w.adventure.gold:0}金币 · ${w.runes.owned.map(id=>RUNE_BY_ID.get(id)!.name).join('、')}`;
    this.element.querySelector<HTMLElement>('[data-ui="flash"]')!.style.opacity=String(w.settings.screenFlash?w.feel.hurtFlash/.12:0);
  }
  private map(c:CanvasRenderingContext2D,w:World){
    pixelPanel(c,798,52,126,96,'#6b6075');const region=w.adventure.template.region??1,rooms=CHAPTER_ROOMS.filter(r=>r.region===region),seen=new Set<string>();for(const [id,m]of w.adventure.rooms)if(m.visited){seen.add(id);for(const target of Object.values(CHAPTER_ROOMS.find(r=>r.id===id)!.doors))seen.add(target!);}
    const point=(id:string)=>{const r=CHAPTER_ROOMS.find(r=>r.id===id)!;return {x:825+r.grid.x*19,y:79+(r.grid.y-(region-1)*4)*17};};
    c.font='9px Microsoft YaHei';c.fillStyle='#c5b4c8';c.fillText(REGIONS[region-1],805,65);
    c.strokeStyle='#62566b';c.lineWidth=1;for(const r of rooms)if(w.adventure.rooms.get(r.id)!.visited)for(const id of Object.values(r.doors)){if(!rooms.some(r=>r.id===id))continue;const a=point(r.id),b=point(id!);c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
    for(const r of rooms)if(seen.has(r.id)){const p=point(r.id),m=w.adventure.rooms.get(r.id)!;c.fillStyle=m.visited?(r.kind==='shop'?'#ccae6b':r.kind==='treasure'?'#ae91d0':r.kind==='event'?'#80bdca':m.cleared?'#7caa96':'#bc7776'):'#3a364b';c.fillRect(p.x-3,p.y-3,7,7);if(r.id===w.adventure.currentId){c.strokeStyle='#f3dcac';c.strokeRect(p.x-5,p.y-5,11,11);}if(r.kind==='treasure'&&m.chests.some(ch=>ch.claimed)){c.fillStyle='#272736';c.fillRect(p.x-1,p.y-1,3,3);}}
    c.font='9px Consolas';c.fillStyle='#b1a4bd';c.fillText(`DEPTH ${w.adventure.template.depth??1} / 18`,805,139);
  }
}
