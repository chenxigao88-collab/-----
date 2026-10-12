import {afterEach,describe,expect,it,vi} from 'vitest';
import {World} from '../src/world/World';
import {defaultDebug} from '../src/data/player';
import {AudioManager} from '../src/feedback/AudioManager';
import {AssetManager} from '../src/rendering/AssetManager';
import {SpriteRenderer} from '../src/rendering/SpriteRenderer';
import {getWeapon} from '../src/data/weapons';
import {handPosition} from '../src/actors/Actor';
import {vec} from '../src/core/types';
import atlas from '../public/art/atlas.json';
import type {ArtMetadata} from '../src/rendering/AssetManager';
const worlds:World[]=[];
function make(character:'ember'|'violet'='ember'){const w=new World(worlds.length+1,defaultDebug(),new AudioManager());worlds.push(w);w.selectCharacter(character);w.settings.hitStrength=0;w.player.stats.criticalChance=0;return w;}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;vi.restoreAllMocks();});
describe('readable attack timing',()=>{
  it.each(['ember','violet'] as const)('%s keeps the opening pose visible before dealing its unchanged contact damage',character=>{const w=make(character),e=w.spawn('shooter',vec(520,340),-1,true),hits:number[]=[];w.events.on('damageApplied',h=>{if(h.attack.gunfu==='body')hits.push(h.amount);});expect(w.gunfu.request(vec(700,340))).toBe(true);
    w.gunfu.step(character==='violet'?.17:.14,w.settings);expect(hits).toEqual([]);expect(w.player.actor.action).toBeDefined();w.gunfu.step(.04,w.settings);expect(hits).toEqual([character==='violet'?10:8]);expect(e.actor.health.alive).toBe(true);
  });
  it('rapid gunfire reaches the settle frame rather than restarting every shot',()=>{const w=make(),a=w.player.actor;w.attacks.requestPlayer(false,w.settings,vec(700,340));const action=a.action!;expect(action.duration).toBeCloseTo(.192);w.gunfu.step(.13,w.settings);const shots=w.attacks.shots;w.weapons.current.cooldown=0;expect(w.attacks.requestPlayer(false,w.settings,vec(600,200))).toBe(true);expect(w.attacks.shots).toBe(shots+1);expect(a.action).toBe(action);expect(a.action!.elapsed).toBeCloseTo(.13);expect(a.action!.angle).toBe(a.aim);w.gunfu.step(.07,w.settings);expect(a.action).toBeUndefined();});
  it('ordinary and skill sword animations share the exact windup, strike and recovery clock',()=>{const w=make();w.debugWeapon(0,'hush_edge');for(const skill of [false,true]){w.weapons.current.cooldown=0;expect(w.attacks.requestPlayer(skill,w.settings)).toBe(true);const hit=w.melee.attacks.at(-1)!;expect(hit.windup).toBeGreaterThan(skill?.1:.07);expect(w.player.actor.action!.duration).toBeCloseTo(hit.windup+hit.active+hit.recover);w.melee.clear();}});
  it('an enemy gives extra anticipation time, then delivers exactly one active strike',()=>{const w=make(),e=w.spawn('chaser',vec(520,340));e.enter('Attack');e.lockedAngle=Math.PI;w.brain.step(e,.43,[e]);expect(e.state).toBe('Attack');expect(w.melee.attacks).toHaveLength(0);w.brain.step(e,.08,[e]);expect(e.state).toBe('Recover');expect(w.melee.attacks).toHaveLength(1);expect(w.melee.attacks[0].active).toBeCloseTo(.144);w.brain.step(e,.1,[e]);expect(w.melee.attacks).toHaveLength(1);});
  it('violet displays all four ordinary sword frames and both shooting poses with matching hands',()=>{const w=make('violet'),a=w.player.actor,art=new AssetManager();art.metadata=atlas as unknown as ArtMetadata;const r=new SpriteRenderer(art),draw=vi.spyOn(r,'drawFrame').mockImplementation(()=>{});vi.spyOn(r,'weapon').mockImplementation(()=>{});vi.spyOn(r as unknown as {shadow:()=>void},'shadow').mockImplementation(()=>{});const ctx={} as CanvasRenderingContext2D;
    w.debugWeapon(0,'hush_edge');expect(w.attacks.requestPlayer(false,w.settings)).toBe(true);a.action!.angle=0;for(const t of [.02,.06,.14,.3]){a.action!.elapsed=t;r.player(ctx,a,getWeapon('hush_edge'));}expect(draw.mock.calls.map(c=>c[1])).toEqual([0,1,2,3].map(i=>`violet_greatslash_right_${i}`));
    draw.mockClear();a.action={kind:'shoot',elapsed:.04,duration:.192,angle:0};a.moving=true;a.facing=Math.PI;r.player(ctx,a,getWeapon('ash_needle'));expect(handPosition(a)).toEqual(vec(a.pos.x+8,a.pos.y-25));a.action.elapsed=.14;r.player(ctx,a,getWeapon('ash_needle'));expect(handPosition(a)).toEqual(vec(a.pos.x+6,a.pos.y-24));expect(draw.mock.calls.map(c=>c[1])).toEqual(['violet_turnshot_right_2','violet_turnshot_right_3']);
  });
});
