export type Element = 'fire' | 'ice' | 'lightning' | 'wind' | 'earth';
export type AttackElement = Element | 'none';
export const ELEMENTS: Record<Element, { name: string; symbol: string; color: string }> = {
  fire: { name: '火', symbol: '炎', color: '#ffad68' },
  ice: { name: '冰', symbol: '霜', color: '#9de5ff' },
  lightning: { name: '雷', symbol: '雷', color: '#c3b0ff' },
  wind: { name: '风', symbol: '风', color: '#98e4bc' },
  earth: { name: '岩', symbol: '岩', color: '#e5bd83' },
};
export const ELEMENT_RULES = { markDuration: 5, reactionCooldown: 1.2, controlProtection: 2, exposureMultiplier: 1.25, exposedArmor: .4 } as const;
export type ReactionId = 'thermal' | 'blast' | 'burn' | 'exposure' | 'fracture' | 'vortex' | 'bind' | 'conduct' | 'shock' | 'sand';
export interface ReactionData { id: ReactionId; name: string; elements: [Element, Element]; damage: number; weaponRatio:number; radius: number; description: string }
export const REACTIONS: readonly ReactionData[] = [
  { id:'thermal', name:'热裂', elements:['fire','ice'], damage:24, weaponRatio:.9, radius:0, description:'单体爆发：24＋90%武器基伤，继承角色成长' },
  { id:'blast', name:'爆燃', elements:['fire','lightning'], damage:18, weaponRatio:.6, radius:90, description:'范围爆发：18＋60%武器基伤，轻击退' },
  { id:'burn', name:'焰旋', elements:['fire','wind'], damage:15, weaponRatio:1, radius:100, description:'5秒范围灼烧，总计15＋100%武器基伤，继承元素增益' },
  { id:'exposure', name:'熔痕', elements:['fire','earth'], damage:12, weaponRatio:.35, radius:0, description:'12＋35%武器基伤；直接伤害＋25%、护甲削弱60%，持续5秒' },
  { id:'fracture', name:'霆裂', elements:['ice','lightning'], damage:18, weaponRatio:.6, radius:0, description:'18＋60%武器基伤；硬直0.25秒，减速30%/3秒' },
  { id:'vortex', name:'寒涡', elements:['ice','wind'], damage:12, weaponRatio:.35, radius:110, description:'范围12＋35%武器基伤；减速35%/4秒、轻聚怪' },
  { id:'bind', name:'霜缚', elements:['ice','earth'], damage:14, weaponRatio:.4, radius:0, description:'14＋40%武器基伤；禁足0.6秒，减速30%/3秒' },
  { id:'conduct', name:'导流', elements:['lightning','wind'], damage:16, weaponRatio:.45, radius:150, description:'连接最多3敌人，各16＋45%武器基伤' },
  { id:'shock', name:'震荡', elements:['lightning','earth'], damage:16, weaponRatio:.4, radius:95, description:'范围16＋40%武器基伤，打断尚未发出的攻击' },
  { id:'sand', name:'卷砂', elements:['wind','earth'], damage:16, weaponRatio:.45, radius:110, description:'范围16＋45%武器基伤，周围吸附最多40像素' },
] as const;
export function getReaction(a: AttackElement, b: AttackElement) {
  if (a === 'none' || b === 'none' || a === b) return undefined;
  return REACTIONS.find(r => r.elements.includes(a) && r.elements.includes(b));
}
