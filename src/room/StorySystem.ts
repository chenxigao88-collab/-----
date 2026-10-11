import type {World} from '../world/World';
import {storyScene} from '../data/story';
export class StorySystem {
  seen=new Set<string>();queue:string[]=[];current?:string;line=0;relics:string[]=[];valves=new Set<string>();
  constructor(private w:World){}
  get scene(){return storyScene(this.current??'',this.w.player.actor.character==='violet');}
  enqueue(id:string){if(!this.seen.has(id)&&!this.queue.includes(id)&&this.current!==id)this.queue.push(id);}
  step(){if(this.w.state!=='playing'||this.w.adventure.panel||this.w.ultimate.active||this.w.adventure.transitionRemaining>0||this.w.adventure.locked&&this.w.adventure.currentId!=='core'&&!this.queue[0]?.startsWith('region-'))return;
    const id=this.queue.shift();if(id){this.current=id;this.line=0;this.w.adventure.showPanel({kind:'story',source:'story'});}}
  next(skip=false){if(!this.current||this.w.adventure.panel?.kind!=='story')return false;if(!skip&&this.line<this.scene.lines.length-1){this.line++;return true;}const id=this.current;this.seen.add(id);this.current=undefined;this.line=0;
    if(id.startsWith('memory-')){this.relics.push(this.sceneRelic(id));this.w.progression.gain(20);this.w.adventure.dropGold({x:480,y:275},12);this.w.events.emit('message',{text:'获得 · '+this.sceneRelic(id)});}
    this.w.adventure.closePanel();if(id==='ending')this.w.completeAdventure();return true;
  }
  private sceneRelic(id:string){return id==='memory-1'?'刻鸟灯罩':id==='memory-2'?'最后一张维修单':'未归的餐券';}
  snapshot(){return {seen:[...this.seen],queue:[...this.queue],current:this.current,line:this.line,relics:[...this.relics],valves:[...this.valves]};}
  restore(data:ReturnType<StorySystem['snapshot']>){this.seen=new Set(data.seen);this.queue=[...data.queue];if(data.current&&!this.seen.has(data.current))this.queue.unshift(data.current);this.current=undefined;this.line=0;this.relics=[...data.relics];this.valves=new Set(data.valves);}
}
