import {describe,expect,it} from 'vitest';
import {violetRest} from '../src/rendering/VioletRest';
import {Player} from '../src/actors/Player';
import {emptyInput} from '../src/core/InputManager';
import {defaultDebug} from '../src/data/player';
describe('violet playful rest',()=>{
  it('crouches, aims left and right, smiles, stands and turns her back',()=>{
    const times=[.6,1.3,2.3,3,3.8,4.4,5,5.5];
    expect(times.map(t=>violetRest(t,true,'up').id)).toEqual(['violet_play_down_0','violet_play_left_0','violet_play_left_1','violet_play_right_0','violet_play_right_1','violet_play_down_1','violet_play_stand','violet_play_back']);
  });
  it('walks with all six back frames and bounded visual sway',()=>{
    const frames=new Set<string>();for(let t=5.9;t<7.9;t+=.05){const p=violetRest(t,true,'down');frames.add(p.id);expect(Math.abs(p.x)).toBeLessThanOrEqual(2);expect(Math.abs(p.y)).toBeLessThanOrEqual(3);}expect(frames.size).toBe(6);
  });
  it('alternates performances across interrupted idle sessions without moving the actor',()=>{
    const p=new Player(1),start={...p.actor.pos};p.step(8,emptyInput(),defaultDebug());expect(p.actor.restCount).toBe(1);expect(p.actor.pos).toEqual(start);
    const input=emptyInput();input.fire=true;p.step(.01,input,defaultDebug());expect(p.actor.idleTime).toBe(0);p.step(8,emptyInput(),defaultDebug());expect(p.actor.restCount).toBe(2);expect(violetRest(3,false,'left').id).toBe('violet_rest_left_2');
  });
});
