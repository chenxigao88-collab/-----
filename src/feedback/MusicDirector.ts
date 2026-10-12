import type {World} from '../world/World';
import type {MusicScene} from './AudioManager';
export function musicScene(world:World):MusicScene{
  if(world.state==='dead'||world.state==='victory')return 'camp';
  if(world.enemies.some(e=>e.kind==='boss'&&e.actor.health.alive))return 'boss';
  if(world.enemies.some(e=>e.actor.health.alive))return 'battle';
  if(world.adventureMode){
    if(!world.adventure.started||world.adventure.template.kind==='shop')return 'camp';
    return world.adventure.locked?'battle':'explore';
  }
  return world.state==='playing'?'battle':'camp';
}
