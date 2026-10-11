import type {World} from '../world/World';
import {CHAPTER_ROOMS,RUNE_BY_ID} from '../data/adventure';
import {WEAPONS} from '../data/weapons';
import {CHARACTERS} from '../data/characters';
import {UPGRADES,PROGRESSION_RULES} from './ProgressionSystem';
export function captureCheckpoint(w:World){if(!w.adventure.started||w.adventure.template.kind!=='shop'||!w.player.actor.health.alive||w.state==='dead'||w.state==='victory')return undefined;
  return {version:1 as const,character:w.player.actor.character,hp:w.player.actor.health.hp,pos:{...w.player.actor.pos},elapsed:w.elapsed,seed:w.random.snapshot(),
    weapons:w.weapons.slots.map(s=>({id:s.data.id,cooldown:s.cooldown,skillCooldown:s.skillCooldown})),active:w.weapons.active,manualSwitchCooldown:w.weapons.manualSwitchCooldown as number|undefined,dash:w.player.dashCooldown,meter:w.resonance.meter,energy:w.ultimate.energy,
    runes:[...w.runes.owned],guardCooldown:w.runes.guardCooldown,progression:w.progression.snapshot(),story:w.story.snapshot(),adventure:w.adventure.save()};
}
export type RunCheckpoint=NonNullable<ReturnType<typeof captureCheckpoint>>;
const finite=(v:unknown,min=0,max=1e7)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
export function parseCheckpoint(raw:string|null):RunCheckpoint|undefined {try{if(!raw||raw.length>250000)return;const d=JSON.parse(raw) as RunCheckpoint;
  if(d.version!==1||!CHARACTERS.some(c=>c.id===d.character)||!finite(d.hp,1,215)||!finite(d.elapsed)||!finite(d.pos?.x,96,864)||!finite(d.pos?.y,102,440)||!finite(d.seed,0,0xffffffff)||!finite(d.dash,0,1)||!finite(d.meter,0,100)||!finite(d.energy,0,200))return;
  if(!Array.isArray(d.weapons)||d.weapons.length!==2||d.weapons[0].id===d.weapons[1].id||!d.weapons.every(s=>WEAPONS.some(w=>w.id===s.id)&&finite(s.cooldown,0,30)&&finite(s.skillCooldown,0,30))||(d.active!==0&&d.active!==1))return;
  if(d.manualSwitchCooldown!==undefined&&!finite(d.manualSwitchCooldown,0,3))return;
  const p=d.progression;
  // Existing v1 checkpoints predate the optional blade upgrade.
  if(p?.ranks&&p.ranks.blade===undefined)p.ranks.blade=0;
  if(!p||!Number.isInteger(p.level)||!finite(p.level,1,12)||!finite(p.xp,0,200)||!finite(p.earned)||!Number.isInteger(p.pending)||!finite(p.pending,0,11)||!p.ranks||Object.keys(p.ranks).some(id=>!(id in UPGRADES))||!Object.entries(UPGRADES).every(([id,u])=>{const n=p.ranks[id as keyof typeof UPGRADES];return Number.isInteger(n)&&finite(n,0,u.cap)&&(!('character' in u)||u.character===d.character||n===0);})||!Array.isArray(p.offers)||p.offers.length>3||!p.offers.every(id=>{const u=UPGRADES[id];return u&&(!('character' in u)||u.character===d.character);}))return;
  if(Object.values(p.ranks).reduce((a,b)=>a+b,0)+p.pending!==p.level-1||d.hp>100+(p.level-1)*PROGRESSION_RULES.levelHP+p.ranks.health*PROGRESSION_RULES.health)return;
  if(!Array.isArray(d.runes)||d.runes.length>3||new Set(d.runes).size!==d.runes.length||!d.runes.every(id=>{const r=RUNE_BY_ID.get(id);return r&&(!r.character||r.character===d.character);})||!finite(d.guardCooldown,0,8))return;
  const a=d.adventure,camp=CHAPTER_ROOMS.find(r=>r.id===a?.currentId);if(!a||camp?.kind!=='shop'||!finite(a.gold)||!finite(a.spent)||!finite(a.collected)||!finite(a.seed,0,0xffffffff)||!Array.isArray(a.rooms)||a.rooms.length!==35||new Set(a.rooms.map(m=>m.id)).size!==35||!Array.isArray(a.layouts)||a.layouts.length!==35||!Array.isArray(a.shops)||!Array.isArray(a.rested))return;
  for(const m of a.rooms){if(!CHAPTER_ROOMS.some(r=>r.id===m.id)||typeof m.visited!=='boolean'||typeof m.cleared!=='boolean'||!Array.isArray(m.chests)||!Array.isArray(m.coins)||!Array.isArray(m.drops)||!Array.isArray(m.feats))return;for(const c of m.chests)if(!Array.isArray(c.offers)||!c.offers.every(id=>RUNE_BY_ID.has(id))||!finite(c.pos?.x,0,960)||!finite(c.pos?.y,0,540))return;for(const c of m.coins)if(!finite(c.id)||!finite(c.value)||!finite(c.pos?.x,0,960)||!finite(c.pos?.y,0,540))return;for(const drop of m.drops)if(!WEAPONS.some(w=>w.id===drop.weapon))return;}
  if(!a.rooms.find(m=>m.id===a.currentId)?.cleared)return;
  if(new Set(a.layouts.map(r=>r.id)).size!==35||!a.rested.every(id=>CHAPTER_ROOMS.some(r=>r.id===id&&r.kind==='shop')))return;
  for(const r of a.layouts){const canonical=CHAPTER_ROOMS.find(c=>c.id===r.id);if(!canonical||JSON.stringify(r.doors)!==JSON.stringify(canonical.doors)||r.kind!==canonical.kind||r.region!==canonical.region||r.depth!==canonical.depth||r.story!==canonical.story||r.valve!==canonical.valve||JSON.stringify(r.traps)!==JSON.stringify(canonical.traps)||!Array.isArray(r.obstacles)||!Array.isArray(r.waves)||r.waves.length!==canonical.waves.length)return;for(const o of r.obstacles)if(!finite(o.x,85,850)||!finite(o.y,100,430)||!finite(o.w,1,100)||!finite(o.h,1,100))return;for(const wave of r.waves)if(!Array.isArray(wave)||wave.length>7||!wave.every(k=>['chaser','shooter','sniper','shield','dancer','cantor','parasite','boss'].includes(k)))return;}
  for(const [id,items]of a.shops)if(!CHAPTER_ROOMS.some(r=>r.id===id&&r.kind==='shop')||!Array.isArray(items)||items.some(item=>!finite(item.price)||item.weapon&&!WEAPONS.some(w=>w.id===item.weapon)||item.rune&&!RUNE_BY_ID.has(item.rune)))return;
  const s=d.story;if(!s||!Array.isArray(s.seen)||!Array.isArray(s.queue)||!Array.isArray(s.relics)||!Array.isArray(s.valves)||![...s.seen,...s.queue,...s.relics,...s.valves].every(v=>typeof v==='string'&&v.length<100))return;
  return d;
 }catch{return;}}
export function restoreCheckpoint(w:World,d:RunCheckpoint){w.selectCharacter(d.character);d.weapons.forEach((s,i)=>{w.weapons.replace(i,s.id);w.weapons.slots[i].cooldown=s.cooldown;w.weapons.slots[i].skillCooldown=s.skillCooldown;});w.weapons.active=d.active;
  w.weapons.manualSwitchCooldown=d.manualSwitchCooldown??0;
  w.progression.restore(d.progression);w.player.actor.health.maxHP=w.player.stats.maxHP;w.player.actor.health.hp=d.hp;w.player.actor.pos={...d.pos};w.player.actor.previous={...d.pos};w.player.dashCooldown=d.dash;w.runes.owned=[...d.runes];w.runes.guardCooldown=d.guardCooldown;w.resonance.meter=d.meter;w.ultimate.energy=d.energy;w.elapsed=d.elapsed;w.random.restore(d.seed);w.story.restore(d.story);w.adventure.restore(d.adventure);w.state='playing';w.previousState='playing';w.room.configure([]);}
export interface SaveStorage {getItem(key:string):string|null;setItem(key:string,value:string):void;removeItem(key:string):void}
export class CheckpointStore {
  static key='ash-corridor.chapter-checkpoint.v1';
  constructor(private storage?:SaveStorage){}
  read(){try{return parseCheckpoint(this.storage?.getItem(CheckpointStore.key)??null);}catch{return;}}
  write(w:World){const data=captureCheckpoint(w);if(!data)return false;try{if(!this.storage)return false;this.storage.setItem(CheckpointStore.key,JSON.stringify(data));return true;}catch{return false;}}
  clear(){try{this.storage?.removeItem(CheckpointStore.key);}catch{/* Adventure remains playable without persistence. */}}
}
