import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {WEAPONS} from '../src/data/weapons';
import type {Atlas} from '../src/rendering/AssetManager';
const load=(file:string)=>JSON.parse(readFileSync(new URL(`../public/art/${file}`,import.meta.url),'utf8')) as Atlas;
describe('painted game assets',()=>{
  it('every equippable weapon resolves to its own valid sprite region',()=>{
    const atlas=load('weapon-paint-v1.json');expect(Object.keys(atlas.frames)).toHaveLength(24);
    expect(new Set(WEAPONS.map(w=>w.sprite)).size).toBe(24);
    for(const weapon of WEAPONS){expect(weapon.icon).toBe(weapon.sprite);expect(atlas.frames[weapon.sprite]).toBeDefined();}
  });
  it('all used combat PNG rectangles are present and inside their source images',()=>{
    const weapons=load('weapon-paint-v1.json'),combat=load('combat-paint-v1.json');
    for(const id of ['needle','gravel','crystal','fireball','arc','wind','bolt','ring','wave','muzzle_gold','muzzle_ice','muzzle_arc','slash','slash_spin','explosion','spark'])expect(combat.frames[id]).toBeDefined();
    for(const atlas of [weapons,combat])for(const frame of Object.values(atlas.frames)){const [x,y,w,h]=frame.rect;expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(w).toBeGreaterThan(0);expect(h).toBeGreaterThan(0);expect(x+w).toBeLessThanOrEqual(atlas.width);expect(y+h).toBeLessThanOrEqual(atlas.height);expect(frame.size.every(n=>n>0)).toBe(true);}
  });
  it('PNG sheets retain alpha and isolated scanlines never sample outside a frame',()=>{
    const metadata=JSON.parse(readFileSync(new URL('../public/art/atlas.json',import.meta.url),'utf8'));
    for(const atlas of [load('weapon-paint-v1.json'),load('combat-paint-v1.json'),...metadata.reactions] as Atlas[]){
      const png=readFileSync(new URL(`../public/art/${atlas.file}`,import.meta.url));expect(png[25]).toBe(6);
      expect(png.readUInt32BE(16)).toBe(atlas.width);expect(png.readUInt32BE(20)).toBe(atlas.height);
      for(const frame of Object.values(atlas.frames))for(const [x,y,length]of frame.clipSpans??[]){expect(x).toBeGreaterThanOrEqual(0);expect(y).toBeGreaterThanOrEqual(0);expect(length).toBeGreaterThan(0);expect(x+length).toBeLessThanOrEqual(frame.rect[2]);expect(y).toBeLessThan(frame.rect[3]);}
    }
  });
});
