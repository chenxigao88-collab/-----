import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {VIOLET_MELEE_KINDS,violetMeleeFrame} from '../src/data/violetMelee';
import {PaintRenderer} from '../src/rendering/PaintRenderer';
import {EffectRenderer} from '../src/rendering/EffectRenderer';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {defaultDebug} from '../src/data/player';
import type {SpriteRenderer} from '../src/rendering/SpriteRenderer';
describe('Violet dedicated painted melee',()=>{
  it('all four actions advance through six valid transparent sprite frames',()=>{
    const atlas=JSON.parse(readFileSync(new URL('../public/art/violet-melee-v1.json',import.meta.url),'utf8'));
    const png=readFileSync(new URL(`../public/art/${atlas.file}`,import.meta.url));expect(png[25]).toBe(6);expect(Object.keys(atlas.frames)).toHaveLength(24);
    for(const kind of VIOLET_MELEE_KINDS){
      const seen=new Set<string>();for(let n=0;n<=60;n++)seen.add(violetMeleeFrame(kind,n/60));expect(seen.size).toBe(6);
      for(const id of seen){const [x,y,w,h]=atlas.frames[id].rect;expect(x+w).toBeLessThanOrEqual(atlas.width);expect(y+h).toBeLessThanOrEqual(atlas.height);}
      expect(violetMeleeFrame(kind,99)).toBe(`violet_melee_${kind}_5`);
    }
  });
  it('routes Violet down, rising and spin cuts to independent artwork and preserves Ember art',()=>{
    const world=new World(1,defaultDebug(),new AudioManager()),calls=vi.spyOn(PaintRenderer.prototype,'draw').mockImplementation(()=>{});
    try{
      const ctx={save(){},restore(){},fillText(){}} as unknown as CanvasRenderingContext2D,sprites={art:{}} as unknown as SpriteRenderer;
      world.selectCharacter('violet');world.gunfu.effects=['downslash','uppercut','sweep'].map(kind=>({kind:kind as 'downslash'|'uppercut'|'sweep',pos:{x:300,y:300},angle:0,life:.1,total:.2}));
      new EffectRenderer().draw(ctx,world,sprites);expect(calls.mock.calls.map(call=>call[1])).toEqual(['violet_melee_down_3','violet_melee_upper_3','violet_melee_spin_3']);
      calls.mockClear();world.player.actor.character='ember';new EffectRenderer().draw(ctx,world,sprites);expect(calls.mock.calls.map(call=>call[1])).toEqual(['slash','slash','slash_spin']);
    }finally{calls.mockRestore();world.dispose();}
  });
});
