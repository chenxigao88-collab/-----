import type { EnemyKind } from '../core/types';
export const WAVES: readonly (readonly EnemyKind[])[] = [['chaser','chaser'], ['chaser','chaser','sniper','shooter'], ['chaser','shooter','shooter','sniper','sniper']];
export const SPAWN_POINTS = [{ x: 180, y: 145 }, { x: 780, y: 145 }, { x: 180, y: 405 }, { x: 780, y: 405 }, { x: 480, y: 115 }, { x: 480, y: 420 }];
