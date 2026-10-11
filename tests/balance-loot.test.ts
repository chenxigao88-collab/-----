import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {CHAPTER_ROOMS} from '../src/data/adventure';
import {getWeapon,weaponPool} from '../src/data/weapons';
import {captureCheckpoint,parseCheckpoint,restoreCheckpoint} from '../src/room/CheckpointStore';
import {vec} from '../src/core/types';
const worlds:World[]=[];
function make(){const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),true);worlds.push(w);w.state='playing';w.adventure.started=true;w.settings.hitStrength=0;return w;}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('stage loot and replacement',()=>{
  it('guarantees four battle rewards and one elite reward per region, without repeat clearing farms',()=>{
    const w=make();for(let region=1;region<=3;region++){
      const rooms=CHAPTER_ROOMS.filter(r=>r.region===region&&['battle','elite'].includes(r.kind));
      for(const room of rooms){w.adventure.currentId=room.id;w.adventure.clearRoom();const memory=w.adventure.memory,before=memory.drops.length;w.adventure.clearRoom();expect(memory.drops).toHaveLength(before);}
      const drops=rooms.flatMap(r=>w.adventure.rooms.get(r.id)!.drops).filter(d=>d.origin==='loot');expect(drops).toHaveLength(5);
      expect(drops.every(d=>getWeapon(d.weapon).tier===region)).toBe(true);
    }
  });
  it('produces one additional weapon from a secret chest and opening again cannot duplicate it',()=>{
    const w=make();w.adventure.currentId='vault';w.adventure.memory.chests.push({id:'secret',kind:'crystal',pos:vec(480,275),opened:false,claimed:false,age:0,offers:[]});w.player.actor.pos=vec(480,275);
    expect(w.adventure.interact()).toBe(true);expect(w.adventure.memory.drops).toHaveLength(1);expect(w.adventure.interact()).toBe(true);expect(w.adventure.memory.drops).toHaveLength(1);
  });
  it.each([1,2,3])('offers current-stage weapons at the region %s camp',region=>{
    const w=make();w.adventure.currentId=region===1?'garden':region===2?'forge-3':'inner-3';w.adventure.memory.cleared=true;
    expect(w.adventure.enterRoom('east')).toBe(true);const stock=w.adventure.shop.find(s=>s.id==='weapon')!;expect(getWeapon(stock.weapon!).tier).toBe(region);expect(stock.price).toBe(30+region*10);
  });
  it('preserves all cooldowns and the old weapon when taking an advanced drop, including camp restoration',()=>{
    const w=make();w.adventure.currentId='shop';w.adventure.memory.cleared=true;const gun=weaponPool(3).find(g=>g.family==='ash_needle')!;
    w.adventure.memory.drops.push({id:'drop-1',weapon:gun.id,pos:vec(530,290),origin:'loot'});w.weapons.current.cooldown=.3;w.weapons.current.skillCooldown=2;w.weapons.manualSwitchCooldown=1.5;
    w.adventure.showPanel({kind:'weapon',source:'ground',sourceId:'drop-1',weapon:gun.id});expect(w.adventure.chooseWeapon(0)).toBe(true);
    expect(w.weapons.current.data.id).toBe(gun.id);expect(w.weapons.current.cooldown).toBe(.3);expect(w.weapons.current.skillCooldown).toBe(2);expect(w.weapons.manualSwitchCooldown).toBe(1.5);
    expect(w.adventure.memory.drops[0].weapon).toBe('ash_needle');expect(w.adventure.memory.drops[0].origin).toBe('discard');
    const data=parseCheckpoint(JSON.stringify(captureCheckpoint(w)));expect(data).toBeDefined();const restored=make();restoreCheckpoint(restored,data!);
    expect(restored.weapons.current.data.id).toBe(gun.id);expect(restored.adventure.memory.drops[0].weapon).toBe('ash_needle');expect(restored.weapons.manualSwitchCooldown).toBe(1.5);
  });
});
