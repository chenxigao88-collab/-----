import type {World} from '../world/World';
import type {AttackContext} from '../combat/AttackSystem';
import type {Actor} from '../actors/Actor';
import {WEAPONS} from '../data/weapons';
export const PROGRESSION_RULES={levelDamage:.08,levelHP:5,health:20,damage:.2,gunfu:.25,blade:.25,element:.35,defence:.06,dodge:.05} as const;
export const UPGRADES={
  health:{name:'强健',description:`最大生命 +${PROGRESSION_RULES.health}，回复${PROGRESSION_RULES.health}生命`,cap:3,color:'#dd93a8'},
  damage:{name:'锋芒',description:`攻击与元素反应伤害 +${PROGRESSION_RULES.damage*100}%`,cap:4,color:'#ddb77b'},
  gunfu:{name:'枪斗专精',description:`连招、大招及其元素反应伤害 +${PROGRESSION_RULES.gunfu*100}%`,cap:3,color:'#ba9ce7'},
  blade:{name:'巨刃专精',description:`巨刃连招、大招起手刀击及所有近战武器挥斩伤害 +${PROGRESSION_RULES.blade*100}%；末刀随前段伤害成长`,cap:3,color:'#d7a7ef',character:'violet'},
  element:{name:'元素亲和',description:`元素反应伤害 +${PROGRESSION_RULES.element*100}%`,cap:3,color:'#91d3d6'},
  defence:{name:'坚韧',description:`受到伤害降低${PROGRESSION_RULES.defence*100}%`,cap:3,color:'#add5a9'},
  dodge:{name:'轻盈',description:`闪避冷却减少${PROGRESSION_RULES.dodge}秒`,cap:3,color:'#9bc3e1'}
} as const;
export type UpgradeId=keyof typeof UPGRADES;
const OFFENSIVE_UPGRADES:readonly UpgradeId[]=['damage','gunfu','blade','element'];
export class ProgressionSystem {
  level=1;xp=0;earned=0;pending=0;offers:UpgradeId[]=[];
  ranks:Record<UpgradeId,number>={health:0,damage:0,gunfu:0,blade:0,element:0,defence:0,dodge:0};
  constructor(private w:World){}
  get threshold(){return 40+(this.level-1)*12;}
  gain(amount:number){if(!this.w.adventureMode||!this.w.adventure.started||amount<=0)return;this.earned+=amount;if(this.level>=12)return;this.xp+=amount;
    while(this.level<12&&this.xp>=this.threshold){this.xp-=this.threshold;this.level++;this.pending++;const hp=this.w.player.actor.health;hp.maxHP+=PROGRESSION_RULES.levelHP;hp.hp=Math.min(hp.maxHP,hp.hp+PROGRESSION_RULES.levelHP);this.apply();}if(this.level===12)this.xp=0;
  }
  private eligible(id:UpgradeId){const u=UPGRADES[id];return !('character' in u)||u.character===this.w.player.actor.character;}
  prompt(){
    if(!this.pending)return false;
    if(!this.offers.length){
      const choices=(Object.keys(UPGRADES) as UpgradeId[]).filter(id=>this.eligible(id)&&this.ranks[id]<UPGRADES[id].cap);
      const offence=choices.filter(id=>OFFENSIVE_UPGRADES.includes(id));
      const focusedOffence=offence.filter(id=>this.ranks[id]>0),first=focusedOffence.length?focusedOffence:offence;
      if(first.length)this.offers.push(first[Math.floor(this.w.random.next()*first.length)]);
      const focus=choices.filter(id=>this.ranks[id]>0&&!this.offers.includes(id));
      if(focus.length)this.offers.push(focus[Math.floor(this.w.random.next()*focus.length)]);
      while(this.offers.length<3&&choices.some(id=>!this.offers.includes(id))){const available=choices.filter(id=>!this.offers.includes(id));this.offers.push(available[Math.floor(this.w.random.next()*available.length)]);}
    }
    this.w.adventure.showPanel({kind:'upgrade',source:'growth'});return true;
  }
  choose(id:UpgradeId){if(this.w.adventure.panel?.kind!=='upgrade'||!this.pending||!this.offers.includes(id)||!this.eligible(id)||this.ranks[id]>=UPGRADES[id].cap)return false;this.ranks[id]++;this.pending--;this.offers=[];const hp=this.w.player.actor.health;if(id==='health'){hp.maxHP+=PROGRESSION_RULES.health;hp.hp=Math.min(hp.maxHP,hp.hp+PROGRESSION_RULES.health);}this.apply();this.w.events.emit('message',{text:'获得 · '+UPGRADES[id].name});this.w.adventure.closePanel();return true;}
  apply(){const p=this.w.player;p.stats.maxHP=100+(this.level-1)*PROGRESSION_RULES.levelHP+this.ranks.health*PROGRESSION_RULES.health;p.stats.damageMultiplier=1+(this.level-1)*PROGRESSION_RULES.levelDamage;p.stats.dashCooldown=.9-this.ranks.dodge*PROGRESSION_RULES.dodge;}
  private get damageMultiplier(){return 1+this.ranks.damage*PROGRESSION_RULES.damage;}
  private routineMultiplier(c:AttackContext){return c.gunfu||c.ultimateCast!==undefined?1+this.ranks.gunfu*PROGRESSION_RULES.gunfu:1;}
  private bladeMultiplier(c:AttackContext){
    const melee=(id?:string)=>WEAPONS.some(weapon=>weapon.id===id&&weapon.category==='melee');
    const blade=this.w.player.actor.character==='violet'&&(melee(c.weaponId)||melee(c.equippedWeaponId)||(c.gunfu==='body'&&c.gunfuPhase!==undefined&&c.gunfuPhase<3)||(c.ultimateCast!==undefined&&c.ultimatePhase!==undefined&&c.ultimatePhase<2));
    return blade?1+this.ranks.blade*PROGRESSION_RULES.blade:1;
  }
  multiplier(c:AttackContext,target:Actor){
    if(target.faction==='player')return 1-this.ranks.defence*PROGRESSION_RULES.defence;
    // Reactions and echoes are scaled when created; native splash starts from a weapon's base damage.
    return c.secondary&&!c.nativeDamage?1:this.damageMultiplier*this.routineMultiplier(c)*this.bladeMultiplier(c);
  }
  get elementMultiplier(){return 1+this.ranks.element*PROGRESSION_RULES.element;}
  reactionMultiplier(c:AttackContext){return this.damageMultiplier*this.elementMultiplier*this.routineMultiplier(c);}
  restore(data:ReturnType<ProgressionSystem['snapshot']>){this.level=data.level;this.xp=data.xp;this.earned=data.earned;this.pending=data.pending;this.ranks={...data.ranks,blade:data.ranks.blade??0};this.offers=[...data.offers];this.apply();}
  snapshot(){return {level:this.level,xp:this.xp,earned:this.earned,pending:this.pending,ranks:{...this.ranks},offers:[...this.offers]};}
}
