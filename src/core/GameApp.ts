import { GameLoop } from './GameLoop';
import { InputManager, emptyInput } from './InputManager';
import { AssetManager } from '../rendering/AssetManager';
import { Renderer } from '../rendering/Renderer';
import { World } from '../world/World';
import { HUD } from '../ui/HUD';
import { DebugPanel, type GameCommand } from '../ui/DebugPanel';
import { Overlays } from '../ui/Overlays';
import { AudioManager } from '../feedback/AudioManager';
import { defaultDebug } from '../data/player';
import { validateData } from '../data/validateData';
import { distance, vec } from './types';
import { Loadout } from '../ui/Loadout';
import { STARTER_WEAPONS } from '../data/weapons';
import { CHARACTERS,type CharacterId } from '../data/characters';
import { AdventureUI } from '../ui/AdventureUI';
import {CheckpointStore,restoreCheckpoint} from '../room/CheckpointStore';
export class GameApp {
  readonly settings=defaultDebug();readonly audio=new AudioManager();readonly art=new AssetManager();
  readonly loop:GameLoop;world:World;private runId=1;
  readonly canvas:HTMLCanvasElement;private stage:HTMLDivElement;private controller=new AbortController();
  private input?:InputManager;private renderer?:Renderer;private hud?:HUD;private debug?:DebugPanel;private overlays=new Overlays();
  private frame=emptyInput();private disposed=false;
  private loadout?:Loadout;private loadoutIds:[string,string]=['ash_needle','gravel_bell'];
  private characterId:CharacterId='ember';
  private adventureUI?:AdventureUI;
  private checkpoint=new CheckpointStore();private saveClock=0;private lastCamp='';
  constructor(private root:HTMLElement){
    root.innerHTML='<div class="shell"><div class="stage"><canvas width="960" height="540" aria-label="灰烬回廊，WASD移动，鼠标瞄准，右键逐段连招，E交互，ESC暂停"></canvas><div class="loading">灰烬回廊<small>正在准备炉室与行者…</small></div></div></div>';
    this.canvas=root.querySelector('canvas')!;this.canvas.tabIndex=0;this.stage=root.querySelector('.stage')!;
    try{const saved=JSON.parse(localStorage.getItem('ash-corridor.loadout.v1')??'null');if(Array.isArray(saved)&&saved.length===2&&saved[0]!==saved[1]&&saved.every(id=>STARTER_WEAPONS.some(w=>w.id===id)))this.loadoutIds=[saved[0],saved[1]];}catch{/* Storage may be unavailable. */}
    this.world=new World(this.runId,this.settings,this.audio,true);this.applyLoadout();
    try{this.checkpoint=new CheckpointStore(localStorage);}catch{/* Storage can be disabled. */}this.world.checkpointAvailable=Boolean(this.checkpoint.read());
    window.addEventListener('beforeunload',()=>this.checkpoint.write(this.world),{signal:this.controller.signal});
    try{const saved=localStorage.getItem('ash-corridor.character.v1');if(CHARACTERS.some(c=>c.id===saved)){this.characterId=saved as CharacterId;this.world.selectCharacter(this.characterId);}}catch{/* Selection remains available without storage. */}
    this.loop=new GameLoop(dt=>this.update(dt),dt=>this.render(dt));
    window.addEventListener('resize',this.resize,{signal:this.controller.signal});this.resize();
    root.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('[data-command]');if(button){void this.audio.unlock();this.command({type:button.dataset.command} as GameCommand);}},{signal:this.controller.signal});
  }
  async start(){validateData();await this.art.load();if(this.disposed)return;
    this.renderer=new Renderer(this.canvas,this.art);this.hud=new HUD(this.renderer.sprites);this.debug=new DebugPanel(command=>this.command(command),this.settings);
    this.loadout=new Loadout(this.renderer.sprites,command=>this.command(command));
    this.adventureUI=new AdventureUI(this.renderer.sprites,command=>this.command(command));this.stage.append(this.adventureUI.element);
    this.stage.querySelector('.loading')?.remove();this.stage.append(this.hud.element,this.overlays.element,this.loadout.element);this.root.append(this.debug.element);this.debug.sync(this.world);
    this.input=new InputManager(this.canvas,()=>this.world.feel.offset,key=>this.command({type:key==='F2'?'debug':'pause'}),()=>{this.world.pause();this.loop.resetClock();},()=>{void this.audio.unlock();});
    this.loop.start();
    if(import.meta.env.DEV)Object.assign(window,{__ASH__:{app:this,snapshot:()=>this.world.snapshot(),command:(c:GameCommand)=>this.command(c)}});
  }
  private resize=()=>{const available=Math.min(window.innerWidth/960,window.innerHeight/540);const scale=available>=1?Math.floor(available):available;this.stage.style.width=`${960*scale}px`;this.stage.style.height=`${540*scale}px`;};
  private update(dt:number){if(!this.input)return;this.frame=this.input.take();this.world.step(dt,this.frame);this.saveClock+=dt;
    if(this.world.state==='dead'||this.world.state==='victory'){this.checkpoint.clear();this.world.checkpointAvailable=false;return;}
    const camp=this.world.adventure.started&&this.world.adventure.template.kind==='shop'?this.world.adventure.currentId:'';
    if(camp&&(camp!==this.lastCamp||this.saveClock>=2)){this.saveClock=0;this.lastCamp=camp;this.world.checkpointAvailable=this.checkpoint.write(this.world);}
    if(!camp)this.lastCamp='';
  }
  private render(dt:number){this.audio.muted=this.settings.mute;this.renderer?.draw(this.world,this.frame.aim,this.loop.fps);this.hud?.render(this.world,dt);this.overlays.render(this.world);this.adventureUI?.render(this.world);this.debug?.render(this.world,this.loop);}
  command(command:GameCommand){
    if(this.world.adventure.panel&&(command.type==='pause'||command.type==='resume')){this.world.adventure.back();this.input?.clear();this.loop.resetClock();if(this.world.state!=='paused')this.canvas.focus({preventScroll:true});return;}
    if(this.loadout?.open&&(command.type==='pause'||command.type==='resume')){this.command({type:'loadout-close'});return;}
    switch(command.type){
      case 'upgrade-choose':this.world.progression.choose(command.id);this.input?.clear();this.loop.resetClock();break;
      case 'story-next':case 'story-skip':this.world.story.next(command.type==='story-skip');this.input?.clear();this.loop.resetClock();break;
      case 'continue-run':{const saved=this.checkpoint.read();if(this.world.state!=='ready'||!saved)break;this.world.dispose();this.world=new World(++this.runId,this.settings,this.audio,true);restoreCheckpoint(this.world,saved);this.world.checkpointAvailable=true;this.lastCamp='';this.input?.clear();this.loop.resetClock();this.debug?.sync(this.world);break;}
      case 'pause': if(this.world.state==='paused')this.world.resume();else this.world.pause();this.input?.clear();this.loop.resetClock();break;
      case 'resume':this.world.resume();this.input?.clear();this.loop.resetClock();break;
      case 'restart':this.checkpoint.clear();this.lastCamp='';this.loadout?.hide();this.world.dispose();this.world=new World(++this.runId,this.settings,this.audio,true);this.applyLoadout();this.renderer?.sprites.animator.clear();this.input?.clear();this.loop.resetClock();this.debug?.sync(this.world);break;
      case 'shop-buy':this.world.adventure.buy(command.id);this.input?.clear();break;
      case 'rune-choose':this.world.adventure.chooseRune(command.id,command.slot);this.input?.clear();this.loop.resetClock();break;
      case 'loot-weapon':this.world.adventure.chooseWeapon(command.slot);this.input?.clear();this.loop.resetClock();break;
      case 'loot-back':this.world.adventure.back();this.input?.clear();this.loop.resetClock();break;
      case 'loadout':if(this.world.state==='ready'){this.world.pause();this.input?.clear();this.loadout?.show(this.world);}break;
      case 'loadout-close':if(this.loadout?.open){this.loadout.hide();this.world.resume();this.input?.clear();this.loop.resetClock();}break;
      case 'loadout-weapon':if(this.loadout?.open&&this.world.selectLoadout(command.slot,command.id)){this.loadoutIds=this.world.weapons.slots.map(s=>s.data.id) as [string,string];try{localStorage.setItem('ash-corridor.loadout.v1',JSON.stringify(this.loadoutIds));}catch{/* Keep this run playable without storage. */}this.loadout.sync(this.world);this.debug?.sync(this.world);}break;
      case 'loadout-character':if(this.loadout?.open&&this.world.selectCharacter(command.id)){this.characterId=command.id;try{localStorage.setItem('ash-corridor.character.v1',command.id);}catch{/* Selection remains available without storage. */}this.renderer?.sprites.animator.clear();this.loadout.sync(this.world);}break;
      case 'debug':this.debug?.toggle();this.input?.clear();this.debug?.sync(this.world);if(this.debug?.element.hidden)this.canvas.focus({preventScroll:true});break;
      case 'heal':if(this.world.player.actor.health.alive)this.world.player.actor.health.heal();break;
      case 'fill':this.world.resonance.meter=100;this.world.events.emit('message',{text:'DEBUG · 枪斗势已充满'});break;
      case 'skill-cooldown':this.world.weapons.current.skillCooldown=3;break;
      case 'spawn':{
        if(this.world.state==='dead'||this.world.state==='victory')break;
        const player=this.world.player.actor.pos;const points=[vec(180,140),vec(780,140),vec(180,405),vec(780,405)];const farthest=points.sort((a,b)=>distance(b,player)-distance(a,player))[0];this.world.spawn(command.kind,farthest);break;
      }
      case 'weapon':this.world.debugWeapon(command.slot,command.id);this.debug?.sync(this.world);break;
      case 'resonance-type':this.world.weapons.current.typeOverride=command.value==='default'?undefined:command.value;this.world.resonance.clear();this.debug?.sync(this.world);break;
      case 'fixture':this.world.attacks.fixture(command.mode==='pierce'?{pierce:1}:command.mode==='bounce'?{bounce:1}:command.mode==='homing'?{homing:3}:{explosionRadius:55});break;
      case 'defaults':Object.assign(this.settings,defaultDebug());this.world.weapons.slots.forEach(slot=>slot.typeOverride=undefined);this.world.resonance.clear();this.debug?.resetControls();this.debug?.sync(this.world);break;
      case 'setting':{const key=command.key;if(typeof this.settings[key]===typeof command.value)Object.assign(this.settings,{[key]:command.value});this.world.player.actor.invulnerability.setDebug(this.settings.invincible);break;}
    }
    if(['shop-buy','rune-choose','loot-weapon','story-next','story-skip','upgrade-choose'].includes(command.type))this.checkpoint.write(this.world);
    if(['resume','restart','loadout-close','rune-choose','loot-weapon','loot-back','story-next','story-skip','upgrade-choose','continue-run'].includes(command.type)&&this.world.state!=='paused')this.canvas.focus({preventScroll:true});
  }
  private applyLoadout(){this.loadoutIds.forEach((id,slot)=>this.world.weapons.replace(slot,id));this.world.selectCharacter(this.characterId);}
  dispose(){this.disposed=true;this.loop.stop();this.input?.dispose();this.debug?.dispose();this.loadout?.dispose();this.adventureUI?.dispose();this.world.dispose();this.audio.dispose();this.controller.abort();this.root.replaceChildren();if(import.meta.env.DEV)delete (window as Window&{__ASH__?:unknown}).__ASH__;}
}
