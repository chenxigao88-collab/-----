import { WEAPONS, SKILLS, WEAPON_TIERS } from './weapons';
import { ENEMIES } from './enemies';
import { COMBINATIONS } from './resonance';
export function validateData() {
  const ids = new Set<string>(), stages = new Set<string>();
  for (const weapon of WEAPONS) {
    const m=weapon.mechanic;
    if(!m||m.mode==='charge'&&(!Number.isFinite(m.chargeTime)||m.chargeTime!<=0||m.chargeTime!>1.2||!m.chargeKind)||m.mode==='burst'&&(!Number.isFinite(m.interval)||m.interval!<=0))throw new Error(`无效武器机制: ${weapon.id}`);
    const stage=`${weapon.family}:${weapon.tier}`, effect=weapon.effect, skill=SKILLS[weapon.skillId];
    if (ids.has(weapon.id) || stages.has(stage) || !weapon.family || !WEAPON_TIERS.includes(weapon.tier) || !Number.isFinite(weapon.damage) || weapon.damage <= 0 || !Number.isFinite(weapon.attackRate) || weapon.attackRate <= 0 || weapon.range <= 0 || !skill || !Number.isFinite(skill.damage) || skill.damage <= 0 || skill.cooldown <= 0) throw new Error(`无效武器数据: ${weapon.id}`);
    if ((weapon.armorPierce!==undefined && (!Number.isFinite(weapon.armorPierce) || weapon.armorPierce<0 || weapon.armorPierce>1)) || !Number.isInteger(weapon.pierce) || weapon.pierce<0 || weapon.pierce>3 || !Number.isInteger(weapon.bounce) || weapon.bounce<0 || weapon.bounce>2 || (weapon.pierceMultiplier!==undefined && (!Number.isFinite(weapon.pierceMultiplier) || weapon.pierceMultiplier<=0 || weapon.pierceMultiplier>1))) throw new Error(`无效武器穿透: ${weapon.id}`);
    if (effect && (['splash','splashRadius','chain','chainRange','pull'] as const).some(key=>effect[key]!==undefined && (!Number.isFinite(effect[key]) || effect[key]!<=0))) throw new Error(`无效武器效果: ${weapon.id}`);
    if (effect && (['splashTargets','chainTargets'] as const).some(key=>effect[key]!==undefined && (!Number.isInteger(effect[key]) || effect[key]!<1 || effect[key]!>5))) throw new Error(`无效武器目标数: ${weapon.id}`);
    if (effect?.slow!==undefined && (!Number.isFinite(effect.slow) || effect.slow<=0 || effect.slow>=1)) throw new Error(`无效武器减速: ${weapon.id}`);
    if (weapon.category==='melee' && (!weapon.melee || weapon.projectileCount!==0 || weapon.melee.arc<=0 || weapon.melee.arc>Math.PI*2 || weapon.melee.windup<0 || weapon.melee.active<=0 || weapon.melee.recover<0)) throw new Error(`无效近战武器: ${weapon.id}`);
    if (weapon.category !== 'melee' && (weapon.projectileSpeed <= 0 || !Number.isInteger(weapon.projectileCount) || weapon.projectileCount < 1 || weapon.projectileCount>8)) throw new Error(`无效弹体: ${weapon.id}`);
    ids.add(weapon.id);stages.add(stage);
  }
  for (const data of Object.values(ENEMIES)) {
    const body = data.hurtbox;
    if (data.hp <= 0 || data.windup <= 0 || !Number.isFinite(body.radius) || body.radius <= 0 || !Number.isFinite(body.halfLength) || body.halfLength < 0 || !Number.isFinite(body.offsetY) || !Number.isFinite(body.offsetX ?? 0)) throw new Error(`无效敌人: ${data.kind}`);
  }
  const keys = COMBINATIONS.map(c => `${c.from}>${c.to}`);
  if (new Set(keys).size !== keys.length) throw new Error('共鸣组合重复');
}
