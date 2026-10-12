import { CHAPTER_ROOMS, DOOR_POSITIONS, ENTRY_POSITIONS, ROOM_BY_ID, RUNE_BY_ID, type DoorSide, type RuneId, type RoomTemplate } from '../data/adventure';
import { getWeapon, weaponPool, TIER_LABELS } from '../data/weapons';
import { distance, normal, sub, Random,type Vec2 } from '../core/types';
import type { World } from '../world/World';
export interface Chest {id:string;kind:'copper'|'crystal';pos:Vec2;opened:boolean;claimed:boolean;age:number;offers:RuneId[]}
export interface Coin {id:number;pos:Vec2;value:number;age:number;picked:boolean}
export interface WeaponDrop {id:string;weapon:string;pos:Vec2;origin?:'loot'|'discard'}
export interface RoomMemory {visited:boolean;cleared:boolean;chests:Chest[];coins:Coin[];drops:WeaponDrop[];feats:Set<string>}
export interface ShopItem {id:'heal'|'rune'|'weapon';price:number;sold:boolean;rune?:RuneId;weapon?:string}
export interface AdventurePanel {kind:'chest'|'shop'|'weapon'|'replace'|'upgrade'|'story';source:'chest'|'shop'|'ground'|'growth'|'story';sourceId?:string;choices?:RuneId[];rune?:RuneId;weapon?:string;price?:number;pos?:Vec2}
export interface FurnaceState {warning:number;cooldown:number;firing:number}
export class AdventureSystem {
  readonly rooms=new Map<string,RoomMemory>();currentId='entry';started=false;gold=20;spent=0;collected=0;
  private layouts=new Map<string,RoomTemplate>();
  panel?:AdventurePanel;shop:ShopItem[]=[];transitionRemaining=0;roomAnnouncement=0;
  shops=new Map<string,ShopItem[]>();rested=new Set<string>();
  furnace:FurnaceState={warning:0,cooldown:0,firing:0};
  private nextCoin=1;private nextDrop=1;private off:(()=>void)[]=[];
  private lootRandom:Random;
  constructor(private world:World,readonly enabled:boolean){
    this.lootRandom=new Random((Date.now()^world.runId*7919)>>>0);
    for(const r of CHAPTER_ROOMS){
      this.rooms.set(r.id,{visited:r.id==='entry',cleared:r.waves.length===0,chests:[],coins:[],drops:[],feats:new Set()});
      const mirrorX=this.lootRandom.next()>.5,mirrorY=this.lootRandom.next()>.5;
      this.layouts.set(r.id,{...r,obstacles:r.obstacles.map(o=>({...o,x:mirrorX?960-o.x-o.w:o.x,y:mirrorY?540-o.y-o.h:o.y})),waves:r.waves.map(wave=>wave.map(kind=>kind==='chaser'&&this.lootRandom.next()<.2?'sniper':kind==='sniper'&&this.lootRandom.next()<.15?'chaser':kind))});
    }
    this.off.push(world.events.on('actorDied',e=>{if(!enabled||e.faction!=='enemy'||e.runId!==world.runId||this.memory.cleared)return;const enemy=world.enemies.find(a=>a.actor.id===e.id);if(enemy?.encounter!==world.room.wave)return;this.dropGold(e.position,enemy.elite?12:3);
      if(this.template.kind==='battle'&&!this.memory.feats.has('weapon-kill-drop')&&this.lootRandom.next()<.04){this.memory.feats.add('weapon-kill-drop');this.dropWeapon(e.position);}
    }));
    this.off.push(world.events.on('perfectDodge',e=>{if(e.runId===world.runId)this.feat('dodge');}));
    this.off.push(world.events.on('elementReaction',()=>this.feat('reaction')));
    this.off.push(world.events.on('damageApplied',e=>{if(e.attack.faction==='player'&&!e.attack.secondary&&!e.attack.nativeContinuation&&e.attack.gunfuShot==='ground')this.feat('finish');}));
  }
  get template():RoomTemplate{return this.layouts.get(this.currentId)!;}
  get memory(){return this.rooms.get(this.currentId)!;}
  get locked(){return this.started&&!this.memory.cleared;}
  get clearedCount(){return CHAPTER_ROOMS.filter(r=>r.waves.length&&this.rooms.get(r.id)!.cleared).length;}
  private feat(id:string){if(this.enabled&&this.started&&this.locked)this.memory.feats.add(id);}
  private shuffle<T>(values:T[]):T[]{const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(this.lootRandom.next()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
  private offers(){
    const available=this.world.runes.available,owned=this.world.runes.owned.map(id=>RUNE_BY_ID.get(id)!.route),routes=['追击','反击','元素'] as const;
    const counts=new Map(routes.map(route=>[route,owned.filter(r=>r===route).length]));
    const order=[...routes].sort((a,b)=>counts.get(b)!-counts.get(a)!);const picked:RuneId[]=[];
    for(const route of order){const candidates=available.filter(r=>r.route===route&&!picked.includes(r.id));if(candidates.length)picked.push(this.shuffle(candidates)[0].id);}
    for(const r of this.shuffle(available))if(picked.length<3&&!picked.includes(r.id))picked.push(r.id);
    return picked.slice(0,3);
  }
  start(){if(!this.enabled||this.started)return false;this.started=true;this.world.state='playing';this.roomAnnouncement=2;this.world.story.enqueue('intro');return true;}
  dropGold(pos:Vec2,value:number){if(value>0)this.memory.coins.push({id:this.nextCoin++,pos:{...pos},value,age:0,picked:false});}
  private pickWeapon(){
    const pool=weaponPool(this.template.region??1),equipped=new Set(this.world.weapons.slots.map(s=>s.data.id));
    const seen=new Set([...this.rooms.values()].flatMap(m=>[...m.feats].filter(f=>f.startsWith('weapon-seen:')).map(f=>f.slice(12))));
    const fresh=pool.filter(w=>!equipped.has(w.id)&&!seen.has(w.id)),available=pool.filter(w=>!equipped.has(w.id));
    return this.shuffle(fresh.length?fresh:available.length?available:pool)[0];
  }
  private dropWeapon(pos:Vec2){const weapon=this.pickWeapon();if(!weapon)return;
    const offset=this.memory.drops.length%4;
    this.memory.drops.push({id:`drop-${this.nextDrop++}`,weapon:weapon.id,pos:{x:Math.max(110,Math.min(850,pos.x+offset*27)),y:Math.max(112,Math.min(430,pos.y))},origin:'loot'});
    this.memory.feats.add(`weapon-seen:${weapon.id}`);this.world.events.emit('message',{text:`武器掉落 · ${TIER_LABELS[weapon.tier]} ${weapon.displayName} · 靠近按 E`});
  }
  clearRoom(){
    if(this.memory.cleared)return;
    this.memory.cleared=true;
    this.world.progression.gain(this.template.kind==='elite'?36:this.template.kind==='final'?0:16);
    const special=this.template.kind==='elite'||this.template.kind==='final';
    this.memory.chests.push({id:`${this.currentId}-clear`,kind:'copper',pos:{x:480,y:290},opened:false,claimed:false,age:0,offers:[]});
    this.dropGold({x:480,y:310},['dodge','reaction','finish'].filter(f=>this.memory.feats.has(f)).length*2);
    const cleared=CHAPTER_ROOMS.filter(r=>r.kind==='battle'&&r.region===this.template.region&&this.rooms.get(r.id)!.cleared).length;
    if(this.template.kind==='elite'||this.template.kind==='battle'&&(cleared===1||cleared%2===0))this.dropWeapon({x:540,y:335});
    this.world.events.emit('message',{text:special?'炉卫已退 · 战利箱解封':'清场 · 门锁已打开'});
  }
  enterRoom(side:DoorSide){
    if(!this.started||this.locked||this.panel||this.world.gunfu.busy||this.world.ultimate.active||this.transitionRemaining>0||this.world.state!=='playing')return false;
    const targetId=this.template.doors[side];if(!targetId)return false;
    const fromId=this.currentId,target=this.layouts.get(targetId)!;
    if(target.kind==='elite'&&!this.rooms.get(target.id)!.cleared){const remaining=CHAPTER_ROOMS.filter(r=>r.region===target.region&&r.kind==='battle'&&!this.rooms.get(r.id)!.cleared).length;if(remaining){this.world.events.emit('message',{text:`炉门封印 · 还需清理${remaining}处战场`});return false;}
      if(target.region===2&&this.world.story.valves.size<3){this.world.events.emit('message',{text:`炉门封印 · 还需修复${3-this.world.story.valves.size}处泄压阀`});return false;}}
    this.currentId=targetId;const entry=(Object.entries(target.doors) as [DoorSide,string][]).find(([,id])=>id===fromId)?.[0];
    if(!entry){this.currentId=fromId;return false;}
    this.world.prepareRoomTransition();
    this.world.player.actor.pos={...ENTRY_POSITIONS[entry]};this.world.player.actor.previous={...this.world.player.actor.pos};
    this.world.player.actor.facing=entry==='north'?Math.PI/2:entry==='south'?-Math.PI/2:entry==='west'?0:Math.PI;
    this.world.player.actor.moving=false;this.transitionRemaining=.3;this.roomAnnouncement=1.8;
    const memory=this.memory;memory.visited=true;
    if(target.kind==='treasure'&&!memory.chests.length)memory.chests.push({id:`${target.id}-secret`,kind:'crystal',pos:{x:480,y:275},opened:false,claimed:false,age:0,offers:[]});
    this.shop=this.shops.get(targetId)??[];
    if(target.kind==='shop'&&!this.shop.length){
      const rune=this.offers()[0],weapon=this.pickWeapon();
      this.shop=[{id:'heal',price:25,sold:false},{id:'rune',price:45,sold:false,rune},{id:'weapon',price:30+(target.region??1)*10,sold:false,weapon:weapon?.id}];
      this.shops.set(targetId,this.shop);
    }
    if(target.kind==='shop'){this.world.story.enqueue(`camp-${target.region}`);if(!this.rested.has(targetId)){this.rested.add(targetId);const h=this.world.player.actor.health,hp=h.hp;h.hp=Math.min(h.maxHP,h.hp+25);this.world.events.emit('message',{text:`营地休息 · 生命 +${h.hp-hp}`});}}
    if((target.region??1)>(this.layouts.get(fromId)!.region??1))this.world.story.enqueue(`region-${target.region}`);
    if(target.kind==='final'&&!memory.cleared)this.world.story.enqueue('boss-intro');
    const special=target.kind==='elite'||target.kind==='final',waves=target.waves.map(wave=>this.shuffle(wave));
    if(special){const last=waves[ waves.length-1],guard=last.indexOf(target.waves[target.waves.length-1][0]);if(guard>0)[last[0],last[guard]]=[last[guard],last[0]];}
    this.world.room.configure(waves,special);
    if(!memory.cleared){this.world.room.start();for(const p of this.world.room.pending)p.remaining+=.4;}
    return true;
  }
  showPanel(panel:AdventurePanel){this.panel=panel;this.world.pause();}
  private show(panel:AdventurePanel){this.showPanel(panel);}
  closePanel(){this.panel=undefined;this.world.resume();}
  back(){
    if(!this.panel)return;
    const p=this.panel;
    if(p.kind==='upgrade')return;
    if(p.kind==='story'){this.world.story.next(true);return;}
    if(p.kind==='replace'||p.kind==='weapon'){
      if(p.source==='shop'){this.panel={kind:'shop',source:'shop'};return;}
      if(p.source==='chest'){const c=this.memory.chests.find(c=>c.id===p.sourceId);if(c){this.panel={kind:'chest',source:'chest',sourceId:c.id,choices:c.offers};return;}}
    }
    this.closePanel();
  }
  private nearest(){
    const pos=this.world.player.actor.pos;
    const targets:{kind:'chest'|'shop'|'door'|'ground'|'exit'|'memory'|'valve';id:string;pos:Vec2;label:string}[]=[];
    if(this.template.story&&!this.world.story.seen.has(this.template.story))targets.push({kind:'memory',id:this.template.story,pos:{x:440,y:255},label:'查看归途遗物'});
    if(this.template.valve&&this.memory.cleared&&!this.world.story.valves.has(this.currentId))targets.push({kind:'valve',id:this.currentId,pos:{x:480,y:165},label:'修复泄压阀'});
    for(const c of this.memory.chests)if(!c.claimed)targets.push({kind:'chest',id:c.id,pos:c.pos,label:c.opened?'选择符印':'开启宝箱'});
    for(const drop of this.memory.drops){const weapon=getWeapon(drop.weapon);targets.push({kind:'ground',id:drop.id,pos:drop.pos,label:`${TIER_LABELS[weapon.tier]} · ${weapon.displayName}`});}
    if(this.template.kind==='shop')targets.push({kind:'shop',id:'shop',pos:{x:480,y:240},label:'查看商店'});
    if(this.started&&!this.locked)for(const [side,id]of Object.entries(this.template.doors) as [DoorSide,string][])targets.push({kind:'door',id:side,pos:DOOR_POSITIONS[side],label:ROOM_BY_ID.get(id)!.name});
    if(this.template.kind==='final'&&this.memory.cleared&&this.world.story.seen.has('boss-defeat')&&this.memory.chests.every(c=>c.claimed))targets.push({kind:'exit',id:'exit',pos:{x:480,y:200},label:'离开炉心'});
    return targets.filter(t=>distance(pos,t.pos)<58).sort((a,b)=>distance(pos,a.pos)-distance(pos,b.pos))[0];
  }
  prompt(){if(!this.started)return distance(this.world.player.actor.pos,{x:480,y:375})<48?'E · 启程':'';if(this.transitionRemaining>0||this.world.gunfu.busy)return '';const t=this.nearest();return t?`E · ${t.label}`:'';}
  interact(){
    if(!this.enabled||this.panel||this.transitionRemaining>0||this.world.gunfu.busy||this.world.ultimate.active)return false;
    if(!this.started){if(distance(this.world.player.actor.pos,{x:480,y:375})<48)return this.start();return false;}
    const t=this.nearest();if(!t)return false;
    if(t.kind==='door')return this.enterRoom(t.id as DoorSide);
    if(t.kind==='shop'){this.show({kind:'shop',source:'shop'});return true;}
    if(t.kind==='exit'){this.world.story.enqueue('ending');return true;}
    if(t.kind==='memory'){this.world.story.enqueue(t.id);return true;}
    if(t.kind==='valve'){this.world.story.valves.add(t.id);this.world.progression.gain(12);this.world.events.emit('message',{text:`泄压装置修复 · ${this.world.story.valves.size} / 3`});return true;}
    if(t.kind==='ground'){const drop=this.memory.drops.find(d=>d.id===t.id)!;this.show({kind:'weapon',source:'ground',sourceId:drop.id,weapon:drop.weapon,pos:drop.pos});return true;}
    const c=this.memory.chests.find(c=>c.id===t.id)!;
    if(c.opened){if(c.kind==='crystal'&&c.age>=.5)this.show({kind:'chest',source:'chest',sourceId:c.id,choices:c.offers});return true;}
    c.opened=true;c.age=0;this.world.audio.play('loot');
    if(c.kind==='crystal'){c.offers=this.offers();this.dropGold(c.pos,18);this.dropWeapon({x:c.pos.x+60,y:c.pos.y+48});if(!c.offers.length)c.claimed=true;this.world.events.emit('message',{text:'宝箱获得 · 金币 ×18 · 武器已落地'+(c.offers.length?' · 可选择一枚符印':'')});}
    else {
      c.claimed=true;const coins=this.template.kind==='elite'||this.template.kind==='final'?14:6;this.dropGold(c.pos,coins);
      const hp=this.world.player.actor.health,before=hp.hp;
      if(hp.hp<hp.maxHP*.5&&this.world.random.next()<.4)hp.hp=Math.min(hp.maxHP,hp.hp+8);
      this.world.events.emit('message',{text:`宝箱获得 · 金币 ×${coins}`+(hp.hp>before?` · 生命 +${hp.hp-before}`:'')});
    }
    return true;
  }
  buy(id:string){
    if(this.panel?.kind!=='shop'||this.world.state!=='paused')return false;
    const item=this.shop.find(i=>i.id===id);if(!item||item.sold||this.gold<item.price)return false;
    if(item.id==='heal'){const health=this.world.player.actor.health;if(health.hp>=health.maxHP)return false;health.hp=Math.min(health.maxHP,health.hp+25);this.pay(item);return true;}
    if(item.id==='rune'&&item.rune){this.takeRune(item.rune,{kind:'replace',source:'shop',rune:item.rune,price:item.price});return true;}
    if(item.id==='weapon'&&item.weapon){this.panel={kind:'weapon',source:'shop',weapon:item.weapon,price:item.price};return true;}
    return false;
  }
  private pay(item:ShopItem){this.gold-=item.price;this.spent+=item.price;item.sold=true;this.world.audio.play('loot');}
  chooseRune(id:RuneId,replace?:number){
    const p=this.panel;if(!p||this.world.state!=='paused')return false;
    if(p.kind==='replace'){if(p.rune!==id)return false;return this.finishRune(id,p,replace);}
    if(p.kind!=='chest'||!p.choices?.includes(id))return false;
    return this.takeRune(id,{...p,rune:id},replace);
  }
  private takeRune(id:RuneId,source:AdventurePanel,replace?:number){
    if(!this.world.runes.available.some(r=>r.id===id))return false;
    if(this.world.runes.owned.length>=3&&replace===undefined){this.panel={...source,kind:'replace',rune:id};return true;}
    return this.finishRune(id,source,replace);
  }
  private finishRune(id:RuneId,p:AdventurePanel,replace?:number){
    const stock=p.source==='shop'?this.shop.find(i=>i.id==='rune'):undefined;
    const chest=p.source==='chest'?this.memory.chests.find(c=>c.id===p.sourceId):undefined;
    if(p.source==='shop'&&(!stock||stock.sold||stock.rune!==id||this.gold<stock.price))return false;
    if(p.source==='chest'&&(!chest||chest.claimed||!chest.offers.includes(id)))return false;
    if(!this.world.runes.equip(id,replace))return false;
    if(stock)this.pay(stock);if(chest)chest.claimed=true;
    this.world.events.emit('message',{text:`获得 · ${RUNE_BY_ID.get(id)!.name}`});
    if(stock)this.panel={kind:'shop',source:'shop'};else this.closePanel();return true;
  }
  chooseWeapon(slot:number){
    const p=this.panel;if(p?.kind!=='weapon'||!p.weapon||(slot!==0&&slot!==1)||this.world.state!=='paused'||this.world.weapons.slots[1-slot].data.id===p.weapon)return false;
    const stock=p.source==='shop'?this.shop.find(i=>i.id==='weapon'):undefined;
    const drop=p.source==='ground'?this.memory.drops.find(d=>d.id===p.sourceId):undefined;
    if(p.source==='shop'&&(!stock||stock.sold||stock.weapon!==p.weapon||this.gold<stock.price))return false;
    if(p.source==='ground'&&(!drop||drop.weapon!==p.weapon))return false;
    const old=this.world.weapons.slots[slot];
    // Preserve the slot's current cooldown; replacement cannot reset a charged skill.
    this.world.weapons.replace(slot,p.weapon);this.world.weapons.slots[slot].cooldown=old.cooldown;this.world.weapons.slots[slot].skillCooldown=old.skillCooldown;
    if(drop){drop.weapon=old.data.id;drop.origin='discard';}
    else this.memory.drops.push({id:`drop-${this.nextDrop++}`,weapon:old.data.id,pos:{x:530,y:290},origin:'discard'});
    this.world.events.emit('message',{text:`换装 · ${getWeapon(p.weapon).displayName} · 旧武器留在地上`});
    if(stock)this.pay(stock);this.world.audio.play('loot');this.closePanel();return true;
  }
  step(dt:number,enemyDt=dt){
    if(!this.enabled||dt<=0)return;
    this.transitionRemaining=Math.max(0,this.transitionRemaining-dt);this.roomAnnouncement=Math.max(0,this.roomAnnouncement-dt);
    for(const c of this.memory.chests)if(c.opened){c.age+=dt;if(c.kind==='crystal'&&!c.claimed&&c.age>=.5&&c.age-dt<.5)this.show({kind:'chest',source:'chest',sourceId:c.id,choices:c.offers});}
    for(const coin of this.memory.coins){if(coin.picked)continue;coin.age+=dt;const p=this.world.player.actor.pos,d=distance(coin.pos,p);
      if(coin.age>.3&&(this.memory.cleared||d<65)){const delta=normal(sub(p,coin.pos)),speed=Math.min(d,dt*420);coin.pos.x+=delta.x*speed;coin.pos.y+=delta.y*speed;if(distance(coin.pos,p)<14){coin.picked=true;this.gold+=coin.value;this.collected+=coin.value;}}
    }
    this.stepFurnace(enemyDt);
    this.world.story.step();
    if(!this.panel&&!this.locked&&!this.world.story.queue.length)this.world.progression.prompt();
  }
  private stepFurnace(dt:number){
    const pos=this.template.furnace;if(!pos)return;
    const f=this.furnace;f.cooldown=Math.max(0,f.cooldown-dt);f.firing=Math.max(0,f.firing-dt);
    if(f.warning>0){f.warning=Math.max(0,f.warning-dt);if(!f.warning){f.firing=.3;f.cooldown=3;
      for(const enemy of this.world.enemies)if(distance(enemy.actor.pos,pos)<60){const c=this.world.attacks.snapshot(this.world.player.actor,10,'furnace','heavy',false);c.secondary=true;this.world.damage.tryHit(c,enemy.actor,{x:0,y:0});}
      if(distance(this.world.player.actor.pos,pos)<60&&this.world.enemies[0]){const c=this.world.attacks.snapshot(this.world.enemies[0].actor,6,'furnace','heavy',false);c.secondary=true;c.environment=true;this.world.damage.tryHit(c,this.world.player.actor,{x:0,y:0});}
      this.world.feel.burst(pos,12,'#f0a15e');
    }}else if(f.cooldown<=0&&this.locked&&this.world.enemies.some(e=>distance(e.actor.pos,pos)<48&&Math.hypot(e.actor.knockback.velocity.x,e.actor.knockback.velocity.y)>30))f.warning=.5;
  }
  dispose(){this.off.forEach(off=>off());this.panel=undefined;this.rooms.clear();}
  save(){return {currentId:this.currentId,gold:this.gold,spent:this.spent,collected:this.collected,rooms:[...this.rooms].map(([id,m])=>({id,...m,feats:[...m.feats]})),layouts:[...this.layouts.values()],shops:[...this.shops],rested:[...this.rested],seed:this.lootRandom.snapshot()};}
  restore(data:ReturnType<AdventureSystem['save']>){this.started=true;this.currentId=data.currentId;this.gold=data.gold;this.spent=data.spent;this.collected=data.collected;this.rooms.clear();for(const {id,feats,...m}of data.rooms)this.rooms.set(id,{...m,feats:new Set(feats)});this.layouts=new Map(data.layouts.map(r=>[r.id,r]));this.shops=new Map(data.shops);this.shop=this.shops.get(this.currentId)??[];this.rested=new Set(data.rested);this.lootRandom.restore(data.seed);this.nextCoin=1+Math.max(0,...data.rooms.flatMap(m=>m.coins.map(c=>c.id)));this.nextDrop=1+data.rooms.reduce((n,m)=>n+m.drops.length,0);this.panel=undefined;this.transitionRemaining=0;this.roomAnnouncement=2;}
  snapshot(){return {room:this.currentId,gold:this.gold,cleared:this.clearedCount,visited:[...this.rooms].filter(([,r])=>r.visited).map(([id])=>id),runes:[...this.world.runes.owned],panel:this.panel?.kind??null};}
}
