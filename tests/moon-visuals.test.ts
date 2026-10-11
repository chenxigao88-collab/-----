import {afterEach,describe,expect,it,vi} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import {emptyInput} from '../src/core/InputManager';
import {vec} from '../src/core/types';
import {AssetManager} from '../src/rendering/AssetManager';
import {PaintRenderer} from '../src/rendering/PaintRenderer';
import {UltimateRenderer} from '../src/rendering/UltimateRenderer';

const worlds:World[]=[];
function performance(count:number){
  const w=new World(1,defaultDebug(),new AudioManager());worlds.push(w);
  w.selectCharacter('violet');w.settings.hitStrength=0;w.settings.shakeStrength=0;
  w.player.stats.criticalChance=0;w.player.actor.pos=vec(440,340);w.state='playing';
  w.debugWeapon(0,'hush_edge');w.debugWeapon(1,'hush_edge');w.ultimate.energy=200;
  for(let n=0;n<count;n++){
    const enemy=w.spawn('shooter',vec(560+(n%4)*35,310+Math.floor(n/4)*40),-1,true);
    enemy.actor.health.hp=enemy.actor.health.maxHP=100000;
  }
  expect(w.ultimate.request(vec(900,340),2)).toBe(true);
  expect(w.ultimate.targets).toHaveLength(count);
  return w;
}
function advanceTo(w:World,time:number){
  for(let n=0;w.ultimate.elapsed<time&&n<1000;n++)w.step(1/120,emptyInput());
  expect(w.ultimate.active).toBe(true);
  expect(w.ultimate.elapsed).toBeGreaterThanOrEqual(time);
}
function context(){
  return {globalAlpha:1,save:vi.fn(),restore:vi.fn(),fillRect:vi.fn(),fillText:vi.fn(),
    translate:vi.fn(),scale:vi.fn(),rotate:vi.fn(),drawImage:vi.fn()} as unknown as CanvasRenderingContext2D;
}
const largeFinish=(id:string)=>/burst|split/.test(id)||/^moon_rift_[3-5]$/.test(id);
afterEach(()=>{vi.restoreAllMocks();worlds.forEach(w=>w.dispose());worlds.length=0;});

describe('Moon Sever composition keeps the character in front of a single colossal moon',()=>{
  it.each([5,8])('draws one background moon rupture for %i targets, with no foreground explosions',count=>{
    const w=performance(count);advanceTo(w,4.7);
    const renderer=new UltimateRenderer(new AssetManager()),ctx=context();
    const draw=vi.spyOn(PaintRenderer.prototype,'draw').mockImplementation(()=>{});
    renderer.world(ctx,w,false);
    const bursts=draw.mock.calls.filter(call=>call[1].startsWith('moon_colossus_burst_'));
    expect(bursts).toHaveLength(1);
    expect(bursts[0][4]).toBeGreaterThanOrEqual(400);
    expect(draw.mock.calls.filter(call=>largeFinish(call[1]))).toHaveLength(1);
    draw.mockClear();renderer.world(ctx,w,true);renderer.overlay(ctx,w);
    expect(draw.mock.calls.filter(call=>largeFinish(call[1]))).toEqual([]);
    expect(draw.mock.calls.filter(call=>call[1].startsWith('moon_colossus_'))).toEqual([]);
  });
  it('limits each enemy to small translucent seals and thin rifts during the three sword cuts',()=>{
    const w=performance(8);advanceTo(w,3.35);
    const draw=vi.spyOn(PaintRenderer.prototype,'draw').mockImplementation(()=>{});
    new UltimateRenderer(new AssetManager()).world(context(),w,true);
    expect(draw.mock.calls.length).toBeGreaterThanOrEqual(8);
    const ids=draw.mock.calls.map(call=>call[1]);
    expect(ids.some(id=>id.startsWith('moon_seal_'))).toBe(true);
    expect(ids.some(id=>/^moon_rift_[0-2]$/.test(id))).toBe(true);
    for(const call of draw.mock.calls){
      expect(call[1]).toMatch(/^moon_(?:seal_\d|rift_[0-2])$/);
      expect(call[4]).toBeLessThanOrEqual(48);expect(call[5]).toBeLessThanOrEqual(48);
      expect(call[7]).toBeLessThanOrEqual(.6);
    }
  });
  it('keeps the giant splitting moon out of the foreground and screen overlay',()=>{
    const w=performance(8);advanceTo(w,4.3);
    const renderer=new UltimateRenderer(new AssetManager()),ctx=context();
    const draw=vi.spyOn(PaintRenderer.prototype,'draw').mockImplementation(()=>{});
    renderer.world(ctx,w,false);
    expect(draw.mock.calls.filter(call=>call[1].startsWith('moon_colossus_split_'))).toHaveLength(1);
    draw.mockClear();renderer.world(ctx,w,true);renderer.overlay(ctx,w);
    expect(draw.mock.calls.filter(call=>largeFinish(call[1]))).toEqual([]);
    expect(draw.mock.calls.filter(call=>call[1].startsWith('moon_colossus_'))).toEqual([]);
  });
  it('locks the finale moon and camera even when every target moves and dies',()=>{
    const w=performance(8);advanceTo(w,4.05);
    const renderer=new UltimateRenderer(new AssetManager()),ctx=context();
    const anchor={...w.ultimate.moonAnchor},focus={...w.ultimate.moonFocus};
    renderer.camera(ctx,w);
    const translations=vi.mocked(ctx.translate).mock.calls.map(call=>[...call]);
    const scales=vi.mocked(ctx.scale).mock.calls.map(call=>[...call]);
    for(const target of w.ultimate.targets){target.pos=vec(850,420);target.health.hp=0;}
    w.enemies=[];
    vi.mocked(ctx.translate).mockClear();vi.mocked(ctx.scale).mockClear();renderer.camera(ctx,w);
    expect(vi.mocked(ctx.translate).mock.calls).toEqual(translations);
    expect(vi.mocked(ctx.scale).mock.calls).toEqual(scales);
    advanceTo(w,4.25);
    expect(w.ultimate.moonAnchor).toEqual(anchor);expect(w.ultimate.moonFocus).toEqual(focus);
  });
});
