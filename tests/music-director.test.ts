import {afterEach,describe,expect,it} from 'vitest';
import {World} from '../src/world/World';
import {AudioManager} from '../src/feedback/AudioManager';
import {musicScene} from '../src/feedback/MusicDirector';
import {defaultDebug} from '../src/data/player';
import {readFileSync} from 'node:fs';
const worlds:World[]=[];
function make(){const w=new World(1,defaultDebug(),new AudioManager(),true);worlds.push(w);return w;}
afterEach(()=>{worlds.forEach(w=>w.dispose());worlds.length=0;});
describe('contextual soundtrack',()=>{
  it('chooses camp, exploration, encounters and Boss music from real room state',()=>{
    const w=make();expect(musicScene(w)).toBe('camp');
    w.adventure.started=true;w.state='playing';w.adventure.memory.cleared=true;expect(musicScene(w)).toBe('explore');
    w.adventure.memory.cleared=false;expect(musicScene(w)).toBe('battle');
    const boss=w.spawn('boss',{x:700,y:340},-1,true);expect(musicScene(w)).toBe('boss');
    w.pause();expect(musicScene(w)).toBe('boss');boss.actor.health.hp=0;w.adventure.memory.cleared=true;expect(musicScene(w)).toBe('explore');
    w.adventure.currentId='shop';expect(musicScene(w)).toBe('camp');w.state='victory';expect(musicScene(w)).toBe('camp');
  });
  it('ships four complete stereo loops and 24 valid PCM sound files',()=>{
    const manifest=JSON.parse(readFileSync('public/audio/manifest.json','utf8'));
    expect(Object.keys(manifest.music)).toHaveLength(4);expect(Object.keys(manifest.sounds)).toHaveLength(24);
    for(const [id,asset]of Object.entries({...manifest.music,...manifest.sounds}) as [string,{file:string;duration:number;peak:number}][]){
      const wav=readFileSync(`public/audio/${asset.file}`);expect(wav.toString('ascii',0,4)).toBe('RIFF');expect(wav.toString('ascii',8,12)).toBe('WAVE');
      expect(wav.readUInt16LE(22)).toBe(2);expect(wav.readUInt32LE(24)).toBe(22050);expect(wav.readUInt16LE(34)).toBe(16);
      expect(asset.peak).toBeGreaterThan(.05);expect(asset.peak).toBeLessThan(.91);
      if(id in manifest.music){expect(asset.duration).toBeGreaterThan(14);const start=wav.readInt16LE(44),end=wav.readInt16LE(wav.length-4);expect(Math.abs(start-end)/32768).toBeLessThan(.04);}
    }
  });
  it('remains safe when browser audio is unavailable and clamps independent volumes',()=>{
    const audio=new AudioManager();audio.setScene('boss');audio.setVolumes(-1,3);audio.play('moonBreak');audio.muted=true;
    expect(audio.snapshot()).toMatchObject({state:'locked',musicVolume:0,effectVolume:1,muted:true});audio.clear();expect(audio.nodes).toBe(0);audio.dispose();
  });
});
