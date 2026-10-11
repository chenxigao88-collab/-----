import type { WeaponController } from './WeaponController';
import type { Player } from '../actors/Player';
import type { EventBus } from '../core/EventBus';
import type { AttackContext } from './AttackSystem';
/** Style rewards deliberate gun-fu completion, never manual swapping. */
export class ResonanceSystem {
  meter=0;activations=0;private off:()=>void;
  private rewardedSequences=new Set<number>();
  get ready(){return this.meter>=100;}
  constructor(private weapons:WeaponController,private player:Player,private events:EventBus){this.off=events.on('damageApplied',e=>this.onHit(e.attack));}
  onHit(attack:AttackContext){
    if(attack.faction!=='player'||attack.secondary||attack.chargeGranted)return;
    attack.chargeGranted=true;if(attack.gunfu==='finisher'){
      const sequence=attack.gunfuSequence;
      if(sequence!==undefined){
        if(this.rewardedSequences.has(sequence))return;
        this.rewardedSequences.add(sequence);
        if(this.rewardedSequences.size>100)this.rewardedSequences.delete(this.rewardedSequences.values().next().value!);
      }
      this.award(20);
    }
  }
  award(amount:number){const was=this.ready;this.meter=Math.min(100,this.meter+amount);if(!was&&this.ready)this.events.emit('message',{text:'枪斗势满 · 下一次连招可释放强化终结'});}
  consume(){if(!this.ready)return false;this.meter=0;this.activations++;return true;}
  clear(){this.meter=0;this.rewardedSequences.clear();for(const s of this.weapons.slots)s.pending=undefined;this.player.actor.status.clear();}
  dispose(){this.off();this.clear();}
}
