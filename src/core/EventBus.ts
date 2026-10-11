import type { Vec2 } from './types';
import type { AttackContext } from '../combat/AttackSystem';
export interface GameEvents {
  elementReaction:{position:Vec2;targetId:number};
  damageApplied: { attack: AttackContext; targetId: number; amount: number; position: Vec2; killed: boolean };
  actorDied: { id: number; faction: 'player' | 'enemy'; encounter: number; runId: number; position: Vec2 };
  perfectDodge: { position: Vec2; runId: number };
  weaponSwitched: { from: number; to: number };
  message: { text: string; tone?: string };
}
export class EventBus {
  private handlers = new Map<keyof GameEvents, Set<(event: never) => void>>();
  on<K extends keyof GameEvents>(key: K, handler: (event: GameEvents[K]) => void) {
    let group = this.handlers.get(key);
    if (!group) { group = new Set(); this.handlers.set(key, group); }
    group.add(handler as (event: never) => void);
    return () => group.delete(handler as (event: never) => void);
  }
  emit<K extends keyof GameEvents>(key: K, event: GameEvents[K]) {
    for (const handler of [...(this.handlers.get(key) ?? [])]) handler(event as never);
  }
  get count() { return [...this.handlers.values()].reduce((total, group) => total + group.size, 0); }
  clear() { this.handlers.clear(); }
}
