// Stretch attack poses and their contacts together, without slowing world time.
export const ATTACK_PACING={player:1.2,enemy:1.2} as const;
export const enemySwingDuration=(boss=false)=>(boss?.5:.45)*ATTACK_PACING.enemy;
