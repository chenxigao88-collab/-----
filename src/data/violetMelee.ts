export type VioletMeleeKind='down'|'upper'|'spin'|'slash';
export const VIOLET_MELEE_KINDS:readonly VioletMeleeKind[]=['down','upper','spin','slash'];
export function violetMeleeFrame(kind:VioletMeleeKind,progress:number){
  return `violet_melee_${kind}_${Math.min(5,Math.max(0,Math.floor(progress*6)))}`;
}
