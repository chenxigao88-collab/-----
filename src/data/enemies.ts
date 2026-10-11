import type { EnemyKind } from '../core/types';
import type { BodyShape } from '../combat/components';
export interface EnemyData {
  kind: EnemyKind; name: string; hp: number; speed: number; radius: number; hurtbox: BodyShape;
  damage: number; windup: number; recover: number; attackRange: number; projectileSpeed: number; sprite: string;
  engageRange: number; arc: number; active: number; lockLead: number;
  attackRest: number;
  lunge?: { distance: number; duration: number };
}
export const ENEMIES: Record<EnemyKind, EnemyData> = {
  chaser: { kind: 'chaser', name: '炭爪', hp: 64, speed: 140, radius: 18, hurtbox: { radius: 18, offsetY: -20, halfLength: 2 }, damage: 9, windup: .42, recover: .95, attackRest: .35, attackRange: 48, engageRange: 44, arc: 1.6, active: .12, lockLead: .12, projectileSpeed: 0, sprite: 'chaser' },
  shooter: { kind: 'shooter', name: '炉眼', hp: 112, speed: 90, radius: 22, hurtbox: { radius: 22, offsetY: -24, halfLength: 2, offsetX: 1 }, damage: 14, windup: .75, recover: 1.35, attackRest: .45, attackRange: 70, engageRange: 66, arc: 3.4, active: .16, lockLead: .12, projectileSpeed: 0, sprite: 'shooter' },
  sniper: { kind: 'sniper', name: '线棺', hp: 52, speed: 160, radius: 10, hurtbox: { radius: 10, offsetY: -26, halfLength: 16, offsetX: 2 }, damage: 10, windup: .55, recover: 1.2, attackRest: .55, attackRange: 44, engageRange: 150, arc: .45, active: .22, lockLead: .18, lunge: { distance: 116, duration: .22 }, projectileSpeed: 0, sprite: 'sniper' },
  shield:{kind:'shield',name:'盾骸卫士',hp:104,speed:85,radius:17,hurtbox:{radius:16,offsetY:-27,halfLength:7},damage:12,windup:.85,recover:1.5,attackRest:.65,attackRange:68,engageRange:62,arc:1.9,active:.2,lockLead:.2,projectileSpeed:0,sprite:'shield'},
  dancer:{kind:'dancer',name:'灰刃舞者',hp:74,speed:150,radius:14,hurtbox:{radius:12,offsetY:-27,halfLength:12},damage:9,windup:.7,recover:1.6,attackRest:.7,attackRange:63,engageRange:60,arc:1.7,active:.18,lockLead:.18,projectileSpeed:0,sprite:'dancer'},
  cantor:{kind:'cantor',name:'钟鸣祭徒',hp:70,speed:80,radius:14,hurtbox:{radius:12,offsetY:-25,halfLength:7},damage:4,windup:1.15,recover:1.5,attackRest:5.5,attackRange:44,engageRange:430,arc:1.4,active:.14,lockLead:.2,projectileSpeed:0,sprite:'cantor'},
  parasite:{kind:'parasite',name:'爆灰寄生体',hp:38,speed:115,radius:13,hurtbox:{radius:13,offsetY:-13,halfLength:2},damage:8,windup:1,recover:2,attackRest:.8,attackRange:70,engageRange:54,arc:Math.PI*2,active:.2,lockLead:.2,projectileSpeed:0,sprite:'parasite'},
  boss:{kind:'boss',name:'灰冠骑士',hp:12000,speed:105,radius:25,hurtbox:{radius:24,offsetY:-49,halfLength:20},damage:22,windup:1,recover:1.7,attackRest:.8,attackRange:140,engageRange:230,arc:2.5,active:.24,lockLead:.22,projectileSpeed:0,sprite:'boss'}
};
export const ENEMY_PRESSURE = { maxAttackers: 1, eliteSecondGap: .45, eliteSecondWindup: .65, slotRecoveryGrace: .3, initialDelay: .4 } as const;
