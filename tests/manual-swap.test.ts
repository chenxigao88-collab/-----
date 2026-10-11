import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {vec} from '../src/core/types';
import {captureCheckpoint,parseCheckpoint,restoreCheckpoint} from '../src/room/CheckpointStore';
const worlds:World[]=[];
function make(character:'ember'|'violet'='ember',adventure=false){
  const w=new World(worlds.length+1,defaultDebug(),new AudioManager(),adventure);worlds.push(w);
  w.selectCharacter(character);w.state='playing';w.settings.invincible=true;w.settings.hitStrength=0;w.settings.shakeStrength=0;return w;
}
function tick(w:World,seconds:number,combo=false){for(let n=0;n<Math.round(seconds*120);n++){
  const input=emptyInput(),s=w.gunfu.snapshot(),a=w.player.actor.action;input.aim=vec(700,340);
  if(combo)input.skill=s.awaiting||Boolean(a&&a.elapsed>=a.duration-.12&&!s.queued);
  w.step(1/120,input);
}}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('Q has its own three-second cooldown',()=>{
  it('blocks repeat swaps until exactly three seconds, without restarting on rejection',()=>{
    const w=make();expect(w.weapons.trySwitch(true)).toBe(false);expect(w.weapons.manualSwitchCooldown).toBe(0);
    expect(w.weapons.trySwitch()).toBe(true);w.weapons.step(.16);expect(w.weapons.trySwitch()).toBe(false);
    expect(w.weapons.manualSwitchCooldown).toBeCloseTo(2.84);w.weapons.step(2.83);expect(w.weapons.trySwitch()).toBe(false);
    w.weapons.step(.01);expect(w.weapons.trySwitch()).toBe(true);expect(w.weapons.active).toBe(0);
  });
  it('allows normal firing while Q is cooling and freezes the cooldown on pause',()=>{
    const w=make();w.weapons.trySwitch();tick(w,.2);const i=emptyInput();i.fire=true;i.aim=vec(700,340);w.step(1/120,i);
    expect(w.attacks.shots).toBe(1);const remaining=w.weapons.manualSwitchCooldown;w.pause();tick(w,4);
    expect(w.weapons.manualSwitchCooldown).toBe(remaining);w.resume();tick(w,remaining+.01);expect(w.weapons.trySwitch()).toBe(true);
  });
  it.each(['ember','violet'] as const)('allows the complete %s combo and its automatic swap during Q cooldown',character=>{
    const w=make(character);w.weapons.trySwitch();tick(w,.17);expect(w.gunfu.request(vec(700,340))).toBe(true);tick(w,2.5,true);
    expect(w.gunfu.busy).toBe(false);expect(w.attacks.shots).toBe(character==='violet'?3:2);expect(w.weapons.active).toBe(0);expect(w.weapons.manualSwitchCooldown).toBeGreaterThan(0);
    expect(w.weapons.manualSwitchCooldown).toBeLessThan(.4);expect(w.weapons.trySwitch()).toBe(false);
  });
  it('allows an ultimate swap with Q blocked and does not start a new Q cooldown',()=>{
    const w=make('violet');w.spawn('boss',vec(570,340));w.weapons.trySwitch();tick(w,.17);w.ultimate.energy=100;
    expect(w.ultimate.request(vec(700,340))).toBe(true);tick(w,3.3);expect(w.weapons.active).toBe(0);
    expect(w.weapons.manualSwitchCooldown).toBe(0);tick(w,1.6);expect(w.weapons.trySwitch()).toBe(true);
  });
  it('preserves remaining Q cooldown across rooms and checkpoints, while accepting old saves',()=>{
    const w=make('violet',true);w.adventure.started=true;w.adventure.currentId='shop';w.adventure.memory.cleared=true;w.room.configure([]);
    w.weapons.trySwitch();w.weapons.step(.4);w.prepareRoomTransition();expect(w.weapons.manualSwitchCooldown).toBeCloseTo(2.6);
    const data=captureCheckpoint(w)!;expect(parseCheckpoint(JSON.stringify(data))).toBeDefined();const clone=make('violet',true);
    restoreCheckpoint(clone,data);expect(clone.weapons.manualSwitchCooldown).toBeCloseTo(2.6);expect(clone.weapons.trySwitch()).toBe(false);
    delete data.manualSwitchCooldown;const old=parseCheckpoint(JSON.stringify(data));expect(old).toBeDefined();restoreCheckpoint(clone,old!);
    expect(clone.weapons.manualSwitchCooldown).toBe(0);data.manualSwitchCooldown=3.01;expect(parseCheckpoint(JSON.stringify(data))).toBeUndefined();
  });
});
