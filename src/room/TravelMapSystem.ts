import type {World} from '../world/World';
import {CHAPTER_ROOMS,ROOM_BY_ID} from '../data/adventure';

export class TravelMapSystem {
  open=false;
  selected='entry';
  region=1;
  private resumeOnClose=false;
  constructor(private world:World){}
  toggle(){if(this.open){this.close();return true;}
    const w=this.world;
    if(!w.adventureMode||w.adventure.panel||!['ready','playing','paused'].includes(w.state))return false;
    this.selected=w.adventure.currentId;this.region=w.adventure.template.region??1;
    this.resumeOnClose=w.state!=='paused';w.pause();this.open=true;return true;
  }
  close(){if(!this.open)return;this.open=false;if(this.resumeOnClose)this.world.resume();}
  select(id:string){const room=ROOM_BY_ID.get(id);if(!room)return;this.selected=id;this.region=room.region??1;}
  reason(id:string){
    const w=this.world,a=w.adventure,m=a.rooms.get(id);
    if(!w.adventureMode||!a.started)return '启程后解锁传送';
    if(!w.player.actor.health.alive||!['playing','paused'].includes(w.state))return '当前无法传送';
    if(a.panel)return '请先完成当前选择';
    if(a.locked||w.enemies.some(e=>e.actor.health.alive)||w.room.pending.length)return '清场后才能传送';
    if(w.ultimate.active||w.gunfu.busy||w.player.dashRemaining>0||w.player.actor.launch.active||a.transitionRemaining>0)return '动作结束后才能传送';
    if(!m?.visited)return '先抵达这个房间，点亮传送';
    if(!m.cleared)return '这个房间尚未清场';
    if(id===a.currentId)return '你已在此处';
    return '';
  }
  travel(id:string){if(!this.open||this.reason(id))return false;
    if(!this.world.adventure.teleport(id))return false;
    this.selected=id;this.world.audio.play('swap');this.world.events.emit('message',{text:`归途传送 · ${this.world.adventure.template.name}`});this.close();return true;
  }
  get valves(){return CHAPTER_ROOMS.filter(r=>r.valve).map(r=>({room:r,done:this.world.story.valves.has(r.id),cleared:this.world.adventure.rooms.get(r.id)!.cleared}));}
  // Keep the route tied to the real doors, including links between regions.
  route(target=this.selected){const start=this.world.adventure.currentId,queue=[start],parent=new Map<string,string>();parent.set(start,'');
    for(let i=0;i<queue.length;i++){const id=queue[i];if(id===target)break;for(const next of Object.values(ROOM_BY_ID.get(id)!.doors))if(next&&!parent.has(next)){parent.set(next,id);queue.push(next);}}
    if(!parent.has(target))return [];const path=[target];while(path[0]!==start)path.unshift(parent.get(path[0])!);return path;
  }
}
