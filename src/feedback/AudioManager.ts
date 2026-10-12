export type MusicScene='camp'|'explore'|'battle'|'boss';
const SOUND_IDS=['shot','shotgun','slash','ice','fire','electric','wind','bolt','ring','hit','heavy','explosion','hurt','dodge','swap','victory','moonRise','moonSlash','moonSheath','moonBreak','enemyShot','death','loot','reaction'] as const;
const priority=(id:string)=>id.startsWith('moon')||id==='victory'?3:['hurt','dodge','explosion'].includes(id)?2:1;
type Voice={source:AudioBufferSourceNode;gain:GainNode;priority:number};
type MusicVoice={source:AudioBufferSourceNode;gain:GainNode};
export class AudioManager {
  private context?:AudioContext;private master?:GainNode;private effects?:GainNode;private musicBus?:GainNode;
  private active=new Set<Voice>();private musicVoices=new Set<MusicVoice>();private current?:MusicVoice;
  private encoded=new Map<string,Promise<ArrayBuffer|undefined>>();private decoded=new Map<string,Promise<AudioBuffer|undefined>>();
  private recent=new Map<string,number>();private serial=0;private revision=0;private effectsRevision=0;private disposed=false;private paused=false;
  private mute=false;private musicVolume=.45;private effectVolume=.75;private scene?:MusicScene;private requested?:MusicScene;
  private ready?:Promise<void>;private base=`${import.meta.env.BASE_URL}audio/`;
  get muted(){return this.mute;}
  set muted(value:boolean){if(value===this.mute)return;this.mute=value;this.ramp(this.master,value?0:.8,.03);}
  preload(){if(typeof window==='undefined')return;for(const id of SOUND_IDS)void this.bytes(`sfx-${id}`);void this.bytes('music-camp');}
  private bytes(id:string){let job=this.encoded.get(id);if(!job){job=fetch(`${this.base}${id}.wav`).then(r=>r.ok?r.arrayBuffer():undefined).catch(()=>undefined);this.encoded.set(id,job);}return job;}
  private buffer(id:string){let job=this.decoded.get(id);if(!job){job=this.bytes(id).then(async bytes=>{if(!bytes||!this.context||this.disposed)return;try{return await this.context.decodeAudioData(bytes.slice(0));}catch{return undefined;}});this.decoded.set(id,job);}return job;}
  async unlock(){
    if(this.disposed)return;
    try{
      if(!this.context){
        this.context=new AudioContext();const ctx=this.context;
        this.master=ctx.createGain();this.master.gain.value=this.mute?0:.8;
        this.effects=ctx.createGain();this.effects.gain.value=this.effectVolume;
        this.musicBus=ctx.createGain();this.musicBus.gain.value=this.paused?0:this.musicVolume;
        const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-12;compressor.knee.value=12;compressor.ratio.value=4;compressor.attack.value=.003;compressor.release.value=.2;
        this.effects.connect(this.master);this.musicBus.connect(this.master);this.master.connect(compressor);compressor.connect(ctx.destination);
      }
      if(this.context.state==='suspended')await this.context.resume();
      this.ready??=Promise.all(SOUND_IDS.map(id=>this.buffer(`sfx-${id}`))).then(()=>{});
      if(this.scene&&this.requested!==this.scene)void this.startMusic(this.scene);
    }catch{/* Autoplay restrictions never prevent playing the game. */}
  }
  setVolumes(music:number,effects:number){
    if(Number.isFinite(music)&&music!==this.musicVolume){this.musicVolume=Math.max(0,Math.min(1,music));this.ramp(this.musicBus,this.paused?0:this.musicVolume,.08);}
    if(Number.isFinite(effects)&&effects!==this.effectVolume){this.effectVolume=Math.max(0,Math.min(1,effects));this.ramp(this.effects,this.effectVolume,.03);}
  }
  setScene(scene:MusicScene,paused=false){
    if(this.disposed)return;
    if(paused!==this.paused){this.paused=paused;if(paused)this.clearEffects();this.ramp(this.musicBus,paused?0:this.musicVolume,paused?.06:.4);}
    this.scene=scene;if(this.context?.state==='running'&&this.requested!==scene)void this.startMusic(scene);
  }
  private ramp(node:GainNode|undefined,value:number,duration:number){if(!node||!this.context)return;const now=this.context.currentTime;node.gain.cancelAndHoldAtTime(now);node.gain.linearRampToValueAtTime(value,now+duration);}
  private async startMusic(scene:MusicScene){
    this.requested=scene;const revision=++this.revision,buffer=await this.buffer(`music-${scene}`),ctx=this.context;
    if(!buffer||!ctx||!this.musicBus||this.disposed||revision!==this.revision)return;
    for(const voice of this.musicVoices)if(voice!==this.current){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();this.musicVoices.delete(voice);}
    const source=ctx.createBufferSource(),gain=ctx.createGain(),voice={source,gain},now=ctx.currentTime;
    source.buffer=buffer;source.loop=true;source.connect(gain);gain.connect(this.musicBus);gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(1,now+1.2);
    source.onended=()=>{source.disconnect();gain.disconnect();this.musicVoices.delete(voice);};this.musicVoices.add(voice);
    if(this.current){this.ramp(this.current.gain,0,1.2);try{this.current.source.stop(now+1.25);}catch{}}
    this.current=voice;source.start();
  }
  play(id:string){
    const ctx=this.context;if(!ctx||ctx.state!=='running'||!this.effects||this.mute||this.paused||this.disposed)return;
    const sound=(SOUND_IDS as readonly string[]).includes(id)?id:'hit',now=ctx.currentTime;
    if(now-(this.recent.get(sound)??-10)<(sound==='hit'?.045:.028))return;this.recent.set(sound,now);
    const revision=this.effectsRevision;
    void this.buffer(`sfx-${sound}`).then(buffer=>{
      if(!buffer||!this.context||!this.effects||this.disposed||this.mute||this.paused||ctx.currentTime-now>.2||revision!==this.effectsRevision)return;
      const rank=priority(sound);
      if(this.active.size>=24){const victim=[...this.active].find(v=>v.priority<rank);if(!victim)return;try{victim.source.stop();}catch{}this.active.delete(victim);}
      const source=ctx.createBufferSource(),gain=ctx.createGain(),voice={source,gain,priority:rank};
      source.buffer=buffer;source.playbackRate.value=sound==='victory'||sound.startsWith('moon')?1:1+((this.serial++%7)-3)*.012;
      gain.gain.value=sound==='enemyShot'?.45:sound==='hit'?.5:.8;source.connect(gain);gain.connect(this.effects);
      source.onended=()=>{source.disconnect();gain.disconnect();this.active.delete(voice);};this.active.add(voice);source.start();
      if(rank>=2){this.ramp(this.current?.gain,.45,.035);const node=this.current?.gain;if(node)node.gain.linearRampToValueAtTime(1,ctx.currentTime+(sound==='moonBreak'?1.5:.55));}
    });
  }
  private clearEffects(){this.effectsRevision++;for(const v of this.active){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}this.active.clear();this.recent.clear();}
  clear(){this.revision++;this.clearEffects();for(const v of this.musicVoices){try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}this.musicVoices.clear();this.current=undefined;this.scene=undefined;this.requested=undefined;}
  get nodes(){return this.active.size+this.musicVoices.size;}
  snapshot(){return {scene:this.scene,requested:this.requested,paused:this.paused,muted:this.mute,musicVolume:this.musicVolume,effectVolume:this.effectVolume,effects:this.active.size,musicVoices:this.musicVoices.size,decoded:this.decoded.size,state:this.context?.state??'locked'};}
  dispose(){this.disposed=true;this.clear();void this.context?.close();}
}
