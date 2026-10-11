import { vec, type Vec2, type Faction } from '../core/types';
import { HealthComponent, HurtboxComponent, KnockbackComponent, LaunchComponent, StatusComponent, InvulnerabilityComponent, ElementalComponent } from '../combat/components';
import { gunfuGrip,type GunfuPose } from '../data/gunfu';
import heroScale from '../data/hero-scale.json';
import type { CharacterId } from '../data/characters';
export interface Actor {
  id: number; runId: number; faction: Faction; pos: Vec2; previous: Vec2;
  character:CharacterId;
  aim: number; facing: number; moving: boolean; animation: number; recoil: number; flash: number; idleTime:number; restCount:number;
  health: HealthComponent; hurtbox: HurtboxComponent; knockback: KnockbackComponent;
  status: StatusComponent; invulnerability: InvulnerabilityComponent;
  elemental: ElementalComponent;
  launch:LaunchComponent;
  action?:{kind:'strike'|'draw'|'counter'|'shoot'|GunfuPose;elapsed:number;duration:number;angle:number;gunfu?:boolean;lift?:number;airborne?:boolean;ultimateTime?:number};
}
export function createActor(id: number, runId: number, faction: Faction, pos: Vec2, hp: number, radius: number): Actor {
  return { id, runId, faction, character:'ember', pos: { ...pos }, previous: { ...pos }, aim: 0, facing: Math.PI / 2, moving: false, animation: 0, recoil: 0, flash: 0, idleTime:0, restCount:0,
    health: new HealthComponent(hp), hurtbox: new HurtboxComponent(radius, faction), knockback: new KnockbackComponent(), status: new StatusComponent(), invulnerability: new InvulnerabilityComponent(), elemental:new ElementalComponent(),launch:new LaunchComponent() };
}
export const handPosition = (actor: Actor) => {
  const a=actor.action,p=a?Math.min(1,a.elapsed/a.duration):0;
  if(a?.gunfu){
    const grip=gunfuGrip(a.kind as GunfuPose,p,actor.character);
    return vec(actor.pos.x+Math.cos(a.angle)*grip.forward,actor.pos.y-grip.height-(a.lift??0));
  }
  if(actor.character==='violet')return vec(actor.pos.x,actor.pos.y-23);
  const height=a?.kind==='shoot'?20:a?.kind==='draw'?(p<.4?10:20):a?.kind==='counter'?(p<.4?13:21):a?.kind==='strike'?18:13;
  return vec(actor.pos.x,actor.pos.y-height*(a?heroScale.legacy.gripScale:1));
};
