import { it, expect } from 'vitest';
import { World } from '../src/world/World';
import { AudioManager } from '../src/feedback/AudioManager';
import { defaultDebug } from '../src/data/player';
import { emptyInput } from '../src/core/InputManager';
import { normal, sub, distance, vec } from '../src/core/types';
import { WEAPONS } from '../src/data/weapons';

it('completes all three waves with normal attacks and live enemy AI',()=>{
  const world=new World(1,defaultDebug(),new AudioManager());
  world.settings.invincible=true; // Removes survival variance; damage, aiming, movement, AI and waves remain live.
  world.startTrial();
  for(let i=0;i<120*100&&world.state==='playing';i++){
    const input=emptyInput(),player=world.player.actor;
    const enemy=[...world.enemies].sort((a,b)=>distance(a.actor.pos,player.pos)-distance(b.actor.pos,player.pos))[0];
    const angle=i/120*.6;
    const target=vec(480+Math.cos(angle)*180,270+Math.sin(angle)*85);
    input.move=normal(sub(target,player.pos));
    if(enemy){input.aim=enemy.actor.hurtbox.center(enemy.actor.pos);input.fire=true;}
    world.step(1/120,input);
  }
  expect(world.state).toBe('victory');expect(world.room.spawnedWaves).toEqual([1,2,3]);
  expect(world.attacks.shots).toBeGreaterThan(10);expect(world.damage.hits).toBeGreaterThan(10);
  expect(world.resonance.meter).toBe(0);expect(world.projectiles.projectiles).toHaveLength(0);
  world.dispose();
});

const pairs=WEAPONS.flatMap((a,i)=>WEAPONS.slice(i+1).map(b=>[a.id,b.id] as const));
it.each(pairs)('completes the live three-wave encounter with %s + %s', (a,b)=>{
  const world=new World(1,defaultDebug(),new AudioManager());world.settings.invincible=true;world.settings.hitStrength=0;
  world.debugWeapon(0,a);world.debugWeapon(1,b);world.startTrial();
  try {
    for(let i=0;i<120*120&&world.state==='playing';i++){
      const input=emptyInput(),p=world.player.actor,e=[...world.enemies].sort((a,b)=>distance(a.actor.pos,p.pos)-distance(b.actor.pos,p.pos))[0];
      if(e){
        const d=distance(e.actor.pos,p.pos);
        input.aim=e.actor.hurtbox.center(e.actor.pos);input.fire=true;
        input.skill=d<55&&world.gunfu.window>0&&world.gunfu.cooldown===0&&!world.gunfu.busy;
        if(d>42)input.move=normal(sub(e.actor.pos,p.pos));
      }
      world.step(1/120,input);
    }
    expect(world.state).toBe('victory');expect(world.room.spawnedWaves).toEqual([1,2,3]);expect(world.projectiles.projectiles).toHaveLength(0);expect(world.abilities.areas).toHaveLength(0);
  }finally{world.dispose();}
});
