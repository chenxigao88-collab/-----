import type {World} from '../world/World';
import type {Enemy} from '../actors/Enemy';
import {createActor,type Actor} from '../actors/Actor';
import type {AttackContext} from '../combat/AttackSystem';
import {STRUCTURES,DEFENSE_RULES,DEFENSE_WAVES,defenseEnemy,defenseSpawn,type StructureKind,type DefenseRole} from '../data/defense';
import {angleTo,distance,type Vec2} from '../core/types';
import {weaponPool} from '../data/weapons';
import {DefenseNavigation,blockContains,defenseContact,type DefenseBlock} from '../world/DefenseNavigation';
import {DefenseBrain} from '../actors/DefenseBrain';

export interface Structure extends DefenseBlock {kind:StructureKind;maxHP:number;level:number;construction:number;cooldown:number;aim:number;flash:number;actor:Actor;frostHits:Map<number,number>}
export interface DefenseVisual {kind:'spawn'|'ruin'|'blast'|'pulse'|'chain';pos:Vec2;age:number;duration:number;radius:number;points?:Vec2[]}
export interface DefenseShell {from:Vec2;pos:Vec2;age:number;duration:number;radius:number;context:AttackContext;enemy:boolean;damage:number}
export interface DefensePending {role:DefenseRole;kind:Enemy['kind'];pos:Vec2;remaining:number}
export type BuildTool=StructureKind|'inspect';
export class DefenseSystem {
  readonly core:DefenseBlock={id:-1,pos:{...DEFENSE_RULES.corePos},width:58,height:42,hp:DEFENSE_RULES.coreHP,core:true};
  readonly structures:Structure[]=[];readonly navigation=new DefenseNavigation();readonly brain:DefenseBrain;
  readonly roles=new Map<number,DefenseRole>();
  gold:number=DEFENSE_RULES.initialGold;spent=0;earned=0;wave=0;phase:'preparation'|'wave'|'intermission'|'won'|'lost'='preparation';
  buildOpen=true;tool:BuildTool='wall';selected?:number;rotation=false;revision=0;intermission=0;waveClock=0;spawned=0;kills=0;destroyed=0;
  pending:DefensePending[]=[];visuals:DefenseVisual[]=[];shells:DefenseShell[]=[];supply:string[]=[];
  failure='';private nextId=-100;private spawnClock=0;private knownWeapons=new Set<string>();private lastWarning=-10;private clock=0;private offs:(()=>void)[]=[];
  constructor(readonly world:World,readonly enabled:boolean){
    this.brain=new DefenseBrain(world,this);
    this.offs.push(world.events.on('actorDied',e=>{
      if(!enabled||e.faction!=='enemy'||e.runId!==world.runId||this.phase!=='wave')return;
      const role=this.roles.get(e.id);if(!role)return;
      const reward=role==='boss'?100:role==='breaker'||role==='artillery'?5:2;this.gold+=reward;this.earned+=reward;this.kills++;
      this.world.progression.gain(role==='boss'?40:role==='raider'||role==='interceptor'?5:10);
      if(role==='bomber')this.bombDeath(e.id,e.position);
    }));
  }
  get blocks():DefenseBlock[]{return [this.core,...this.structures.filter(s=>s.hp>0)];}
  get walls(){return this.structures.filter(s=>s.hp>0&&s.kind==='wall').length;}
  get towers(){return this.structures.filter(s=>s.hp>0&&s.kind!=='wall').length;}
  get alive(){return this.world.enemies.filter(e=>e.actor.health.alive&&this.roles.has(e.actor.id));}
  get canBuild(){return this.enabled&&['ready','playing'].includes(this.world.state)&&!this.world.ultimate.active&&!this.world.adventure.panel&&this.phase!=='won'&&this.phase!=='lost';}
  contact(from:Vec2,to:Vec2,radius=0,ignore?:number){return defenseContact(from,to,radius,this.blocks,ignore);}
  resolve(goal:Vec2,previous:Vec2,radius:number){
    let p={...goal};const contact=this.contact(previous,p,radius);
    if(contact){const t=Math.max(0,contact.t-.001);p={x:previous.x+(goal.x-previous.x)*t,y:previous.y+(goal.y-previous.y)*t};
      const slide=contact.normal.x?{x:p.x,y:goal.y}:{x:goal.x,y:p.y};if(!this.contact(p,slide,radius))p=slide;
    }
    for(const b of this.blocks)if(blockContains(b,p,radius)){
      const sides=[{d:p.x-(b.pos.x-b.width/2-radius),x:b.pos.x-b.width/2-radius,y:p.y},{d:b.pos.x+b.width/2+radius-p.x,x:b.pos.x+b.width/2+radius,y:p.y},{d:p.y-(b.pos.y-b.height/2-radius),x:p.x,y:b.pos.y-b.height/2-radius},{d:b.pos.y+b.height/2+radius-p.y,x:p.x,y:b.pos.y+b.height/2+radius}].sort((a,b)=>a.d-b.d);
      p={x:sides[0].x,y:sides[0].y};
    }return p;
  }
  position(raw:Vec2){
    let p={x:Math.round(raw.x/4)*4,y:Math.round(raw.y/4)*4};
    if(this.tool==='wall'){
      const width=this.rotation?24:32,height=this.rotation?32:24;
      for(const s of this.structures.filter(s=>s.hp>0&&s.kind==='wall')){
        const choices=[{x:s.pos.x+(s.width+width)/2,y:s.pos.y},{x:s.pos.x-(s.width+width)/2,y:s.pos.y},{x:s.pos.x,y:s.pos.y+(s.height+height)/2},{x:s.pos.x,y:s.pos.y-(s.height+height)/2}];
        const near=choices.find(c=>distance(c,p)<9);if(near){p=near;break;}
      }
    }return p;
  }
  placement(raw:Vec2,kind:StructureKind=this.tool==='inspect'?'wall':this.tool){
    const p=this.position(raw),data=STRUCTURES[kind],width=kind==='wall'&&this.rotation?data.height:data.width,height=kind==='wall'&&this.rotation?data.width:data.height;
    let reason='';
    if(!this.canBuild)reason='当前无法建造';
    else if(p.x-width/2<145||p.x+width/2>815||p.y-height/2<145||p.y+height/2>405)reason='为四周出生口保留空间';
    else if(this.gold<data.price)reason='金币不足';
    else if(kind==='wall'?this.walls>=DEFENSE_RULES.wallLimit:this.towers>=DEFENSE_RULES.towerLimit)reason=kind==='wall'?'围墙已达12段上限':'炮塔已达6座上限';
    else if(this.blocks.some(b=>Math.abs(b.pos.x-p.x)<(b.width+width)/2-.01&&Math.abs(b.pos.y-p.y)<(b.height+height)/2-.01))reason='与核心或工事重叠';
    else if([this.world.player.actor,...this.world.enemies.map(e=>e.actor)].some(a=>a.health.alive&&Math.abs(a.pos.x-p.x)<width/2+a.hurtbox.radius+2&&Math.abs(a.pos.y-p.y)<height/2+a.hurtbox.radius+2))reason='不能压住角色或敌人';
    return {pos:p,width,height,valid:!reason,reason};
  }
  place(raw:Vec2){
    if(this.tool==='inspect'){this.selected=this.structures.filter(s=>s.hp>0&&blockContains(s,raw,8)).sort((a,b)=>distance(a.pos,raw)-distance(b.pos,raw))[0]?.id;return Boolean(this.selected);}
    const preview=this.placement(raw);if(!preview.valid){this.world.events.emit('message',{text:preview.reason});return false;}
    const kind=this.tool,data=STRUCTURES[kind],id=this.nextId--,actor=createActor(id,this.world.runId,'player',preview.pos,data.hp,12);
    this.structures.push({id,kind,pos:preview.pos,width:preview.width,height:preview.height,hp:data.hp,maxHP:data.hp,level:1,construction:this.phase==='wave'?DEFENSE_RULES.buildTime:0,cooldown:.15,aim:0,flash:0,actor,frostHits:new Map()});
    this.gold-=data.price;this.spent+=data.price;this.revision++;this.world.audio.play('loot');return true;
  }
  toggle(){if(!this.canBuild)return false;this.buildOpen=!this.buildOpen;this.selected=undefined;this.world.attacks.cancelPrimary();return true;}
  selectTool(kind:BuildTool){if(!this.canBuild)return false;this.buildOpen=true;this.tool=kind;this.selected=undefined;return true;}
  private get chosen(){return this.structures.find(s=>s.id===this.selected&&s.hp>0);}
  repairCost(s:Structure){return Math.max(1,Math.ceil(STRUCTURES[s.kind].price*DEFENSE_RULES.repairRatio*(1-s.hp/s.maxHP)));}
  repair(){const s=this.chosen;if(!this.canBuild||!s||s.construction>0||s.hp>=s.maxHP)return false;const cost=this.repairCost(s);if(this.gold<cost)return false;this.gold-=cost;this.spent+=cost;s.hp=s.maxHP;s.flash=.15;this.world.audio.play('loot');return true;}
  upgradeCost(s:Structure){return Math.ceil(STRUCTURES[s.kind].price*(s.level===1?.75:1));}
  upgrade(){const s=this.chosen;if(!this.canBuild||!s||s.level>=3||s.construction>0)return false;const cost=this.upgradeCost(s);if(this.gold<cost)return false;this.gold-=cost;this.spent+=cost;const old=s.maxHP;s.level++;s.maxHP=Math.round(STRUCTURES[s.kind].hp*(1+(s.level-1)*.45));s.hp+=s.maxHP-old;s.construction=this.phase==='wave'?DEFENSE_RULES.buildTime:0;this.revision++;this.world.audio.play('loot');return true;}
  sell(){const s=this.chosen;if(!this.canBuild||!s||this.phase==='wave')return false;const value=Math.floor(STRUCTURES[s.kind].price*DEFENSE_RULES.refundRatio*s.hp/s.maxHP);this.gold+=value;s.hp=0;this.selected=undefined;this.revision++;this.visuals.push({kind:'ruin',pos:{...s.pos},age:0,duration:1.5,radius:30});return true;}
  startWave(){
    if(!this.enabled||!['ready','playing'].includes(this.world.state)||!['preparation','intermission'].includes(this.phase)||this.world.adventure.panel)return false;
    if(this.world.progression.pending){this.world.progression.prompt();return false;}
    this.world.state='playing';this.phase='wave';this.wave++;this.waveClock=0;this.spawnClock=0;this.spawned=0;this.intermission=0;this.supply=[];this.buildOpen=false;this.selected=undefined;
    this.world.events.emit('message',{text:`余烬炉心 · 第${this.wave}波${this.wave===6?' · 攻城灰冠来袭':''}`});return true;
  }
  step(dt:number,enemyDt:number){
    if(!this.enabled||dt<=0)return;this.clock+=dt;
    for(const s of this.structures){s.construction=Math.max(0,s.construction-dt);s.flash=Math.max(0,s.flash-dt);}
    for(const v of this.visuals)v.age+=dt;this.visuals=this.visuals.filter(v=>v.age<v.duration);
    if(this.phase==='intermission'){
      if(this.world.progression.pending){this.world.progression.prompt();return;}
      this.intermission=Math.max(0,this.intermission-dt);if(!this.intermission)this.startWave();return;
    }
    if(this.phase!=='wave'||enemyDt<=0)return;
    this.waveClock+=enemyDt;this.spawnClock-=enemyDt;
    const plan=DEFENSE_WAVES[this.wave-1];
    if(this.spawned<plan.count&&this.spawnClock<=0&&this.alive.length+this.pending.length<DEFENSE_RULES.maxAlive){
      const side=plan.sides[this.spawned%plan.sides.length],spec=defenseEnemy(this.wave,this.spawned);this.pending.push({...spec,pos:defenseSpawn(side,this.spawned),remaining:1.1});
      this.spawned++;this.spawnClock+=plan.interval;
    }
    for(const p of this.pending){p.remaining-=enemyDt;if(p.remaining<=0)this.spawnEnemy(p.role,p.pos,p.kind);}
    this.pending=this.pending.filter(p=>p.remaining>0);
    for(const s of this.structures)if(s.hp>0&&s.kind!=='wall'&&s.construction<=0)this.tower(s,enemyDt);
    this.stepShells(enemyDt);
    if(this.core.hp<=0){this.failure='核心被摧毁';this.phase='lost';return;}
    if(this.spawned>=plan.count&&!this.pending.length&&!this.alive.length&&!this.shells.some(s=>s.enemy))this.completeWave();
  }
  spawnEnemy(role:DefenseRole,pos:Vec2,kind?:Enemy['kind']){
    const e=this.world.spawn(kind??(role==='boss'?'boss':role==='breaker'?'shooter':role==='artillery'?'cantor':role==='bomber'?'parasite':'chaser'),pos,-2);
    const factor=1.35+Math.max(0,this.wave-1)*.48;e.actor.health.hp=e.actor.health.maxHP=role==='boss'?4200:Math.round(e.data.hp*factor*(role==='breaker'?1.5:1));
    e.data.speed*=role==='breaker'?.65:role==='boss'?.58:role==='artillery'?.72:.63;e.attackCooldown=.45;this.roles.set(e.actor.id,role);return e;
  }
  private completeWave(){
    if(this.wave>=DEFENSE_RULES.waves){this.phase='won';return;}
    const reward=60+this.wave*10;this.gold+=reward;this.earned+=reward;this.phase='intermission';this.intermission=DEFENSE_RULES.intermission;this.buildOpen=true;
    this.world.player.actor.health.hp=Math.min(this.world.player.actor.health.maxHP,this.world.player.actor.health.hp+25);
    if([2,4,5].includes(this.wave)){
      const tier=this.wave===2?2:3,pool=weaponPool(tier).filter(g=>!this.knownWeapons.has(g.id)&&!this.world.weapons.slots.some(s=>s.data.id===g.id));
      this.supply=[];while(this.supply.length<3&&pool.length){const index=Math.floor(this.world.random.next()*pool.length);this.supply.push(pool.splice(index,1)[0].id);}this.supply.forEach(id=>this.knownWeapons.add(id));
    }
    this.world.events.emit('message',{text:`防守成功 · +${reward}金币 · 生命恢复25 · 整备25秒`});
  }
  claimWeapon(id:string,slot:number){if(this.phase!=='intermission'||this.world.state!=='playing'||!this.supply.includes(id)||(slot!==0&&slot!==1)||this.world.weapons.slots[1-slot].data.id===id)return false;this.world.debugWeapon(slot,id);this.supply=[];this.world.audio.play('loot');return true;}
  hurt(block:DefenseBlock,amount:number){
    if(block.hp<=0||amount<=0)return;block.hp=Math.max(0,block.hp-Math.round(amount));
    if('flash' in block)(block as Structure).flash=.15;
    if(block.core){if(this.clock-this.lastWarning>3){this.lastWarning=this.clock;this.world.events.emit('message',{text:'核心受到攻击 · 立即拦截！'});}return;}
    if(block.hp===0){this.revision++;this.destroyed++;if(this.selected===block.id)this.selected=undefined;this.visuals.push({kind:'ruin',pos:{...block.pos},age:0,duration:6,radius:36});this.world.audio.play('explosion');const side=block.pos.x<390?'西侧':block.pos.x>570?'东侧':block.pos.y<280?'北侧':'南侧';this.world.events.emit('message',{text:`${side}工事被摧毁 · 防线出现缺口`});}
  }
  enemyShell(e:Enemy,pos:Vec2,damage:number,radius=48){
    const context=this.world.attacks.snapshot(e.actor,damage,'siege-shell','heavy',true);context.environment=true;context.knockback=0;
    this.shells.push({from:{...e.actor.pos},pos:{...pos},age:0,duration:.85,radius,context,enemy:true,damage});
  }
  private towerContext(s:Structure,damage:number){const c=this.world.attacks.snapshot(s.actor,damage,`defense-${s.kind}`,'arcane',s.kind==='mortar');c.defenseTurret=true;c.nativeContinuation=true;c.chargeGranted=true;c.feelGranted=true;c.knockback=0;c.element=STRUCTURES[s.kind].element;c.reactionBaseDamage=damage;return c;}
  private tower(s:Structure,dt:number){
    s.cooldown=Math.max(0,s.cooldown-dt);if(s.cooldown>0)return;
    const data=STRUCTURES[s.kind],range=data.range+(s.level-1)*16;
    const origin={x:s.pos.x,y:s.pos.y-24};
    const candidates=this.alive.filter(e=>distance(s.pos,e.actor.pos)<=range&&(s.kind==='mortar'||!this.contact(origin,e.actor.hurtbox.center(e.actor.pos),0,s.id))).sort((a,b)=>distance(a.actor.pos,this.core.pos)-distance(b.actor.pos,this.core.pos)||a.actor.id-b.actor.id);
    if(!candidates.length){s.cooldown=.12;return;}
    const damage=data.damage*(1+(s.level-1)*.55),c=this.towerContext(s,damage),target=candidates[0];s.aim=angleTo(origin,target.actor.hurtbox.center(target.actor.pos));s.cooldown=data.interval/(1+(s.level-1)*.12);s.flash=.12;
    if(s.kind==='ballista'){
      for(const spread of [-.045,.045])this.world.projectiles.spawn(c,origin,s.aim+spread,{speed:620,range:range+45,radius:3,style:'bolt',pierce:s.level>=3?1:0});this.world.audio.play('bolt');
    }else if(s.kind==='mortar'){
      this.shells.push({from:origin,pos:{...target.actor.pos},age:0,duration:.65,radius:60+(s.level-1)*12,context:c,enemy:false,damage});this.world.audio.play('fire');
    }else if(s.kind==='frost'){
      const hit=candidates.slice(0,6+s.level*2);
      for(const e of hit){if(!e.actor.health.alive)continue;this.world.damage.tryHit(c,e.actor,{x:0,y:0});e.actor.elemental.slow(.35,2.2);const count=(s.frostHits.get(e.actor.id)??0)+1;s.frostHits.set(e.actor.id,count);if(count%3===0&&e.kind!=='boss'&&e.actor.elemental.control('root',.7,.3,1)){e.stun();this.world.melee.cancel(e.actor.id);}}
      this.visuals.push({kind:'pulse',pos:{...s.pos},age:0,duration:.5,radius:range});this.world.audio.play('ice');
    }else{
      const chain=[target];while(chain.length<3+(s.level===3?1:0)){const last=chain.at(-1)!,next=this.alive.filter(e=>!chain.includes(e)&&distance(last.actor.pos,e.actor.pos)<100&&!this.contact(last.actor.hurtbox.center(last.actor.pos),e.actor.hurtbox.center(e.actor.pos),0)).sort((a,b)=>distance(last.actor.pos,a.actor.pos)-distance(last.actor.pos,b.actor.pos))[0];if(!next)break;chain.push(next);}
      const points=[origin];for(const e of chain){this.world.damage.tryHit(c,e.actor,{x:0,y:0});points.push(e.actor.hurtbox.center(e.actor.pos));}
      this.visuals.push({kind:'chain',pos:origin,points,age:0,duration:.22,radius:range});this.world.audio.play('electric');
    }
  }
  private stepShells(dt:number){
    const active=this.shells;this.shells=[];
    for(const s of active){s.age+=dt;if(s.age<s.duration){this.shells.push(s);continue;}
      this.visuals.push({kind:'blast',pos:{...s.pos},age:0,duration:.55,radius:s.radius});this.world.audio.play('explosion');
      if(s.enemy){for(const b of this.blocks)if(distance(b.pos,s.pos)<s.radius+Math.max(b.width,b.height)/2)this.hurt(b,s.damage);if(distance(this.world.player.actor.pos,s.pos)<s.radius)this.world.damage.tryHit(s.context,this.world.player.actor,{x:0,y:0});}
      else {for(const e of this.alive)if(distance(e.actor.pos,s.pos)<s.radius+e.actor.hurtbox.radius&&!this.contact(s.pos,e.actor.hurtbox.center(e.actor.pos),0))this.world.damage.tryHit(s.context,e.actor,{x:0,y:0});if(s.context.element==='fire'){const field=this.world.attacks.secondary(s.context,s.damage*.15);field.nativeDamage=true;this.world.abilities.spawn({context:field,pos:s.pos,mode:'zone',radius:s.radius*.65,duration:1.2,delay:0});}}
    }
  }
  private bombDeath(id:number,pos:Vec2){
    const c=this.world.attacks.snapshot(this.world.player.actor,55,'defense-bomb-chain','heavy',true);c.secondary=true;c.nativeContinuation=true;c.chargeGranted=true;c.knockback=0;
    this.visuals.push({kind:'blast',pos:{...pos},age:0,duration:.55,radius:65});
    for(const e of this.alive)if(e.actor.id!==id&&distance(e.actor.pos,pos)<65&&!this.contact(pos,e.actor.hurtbox.center(e.actor.pos),0))this.world.damage.tryHit(c,e.actor,{x:0,y:0});this.world.audio.play('explosion');
  }
  detonate(e:Enemy){
    const pos={...e.actor.pos};for(const b of this.blocks)if(distance(b.pos,pos)<65+Math.max(b.width,b.height)/2)this.hurt(b,70);
    const c=this.world.attacks.snapshot(e.actor,18,'defense-bomber','heavy',true);c.environment=true;if(distance(this.world.player.actor.pos,pos)<70)this.world.damage.tryHit(c,this.world.player.actor,{x:0,y:0});
    // A self-detonation neither pays a kill bounty nor triggers the friendly chain explosion.
    this.roles.delete(e.actor.id);e.actor.health.hp=0;this.world.events.emit('actorDied',{id:e.actor.id,faction:'enemy',encounter:e.encounter,runId:e.actor.runId,position:pos});this.visuals.push({kind:'blast',pos,age:0,duration:.6,radius:70});
  }
  dispose(){this.offs.forEach(off=>off());this.brain.clear();this.pending=[];this.shells=[];this.visuals=[];this.roles.clear();}
  snapshot(){return {phase:this.phase,wave:this.wave,gold:this.gold,coreHP:this.core.hp,walls:this.walls,towers:this.towers,buildOpen:this.buildOpen,kills:this.kills,destroyed:this.destroyed,spawned:this.spawned,pending:this.pending.length,alive:this.alive.length,intermission:this.intermission,structures:this.structures.filter(s=>s.hp>0).map(s=>({id:s.id,kind:s.kind,pos:{...s.pos},hp:s.hp,level:s.level,construction:s.construction})),minds:this.brain.snapshot()};}
}
