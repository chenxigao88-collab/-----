import { angleDiff } from '../core/types';
import type { GunfuPose } from '../data/gunfu';
type Facing = 'down' | 'left' | 'right' | 'up';
const angles: Record<Facing, number> = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
export class SpriteAnimator {
  private facing = new Map<number, Facing>();
  body(id: number, angle: number, time: number, moving: boolean, dashing = false) {
    const previous = this.facing.get(id);
    let facing = (Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle)) ? Math.cos(angle) > 0 ? 'right' : 'left' : Math.sin(angle) > 0 ? 'down' : 'up') as Facing;
    if (previous && Math.abs(angleDiff(angle, angles[previous])) < Math.PI / 4 + .087) facing = previous;
    this.facing.set(id, facing);
    if (dashing) return `dash_${['down','left','right','up'].indexOf(facing)}`;
    return moving ? `run_${facing}_${Math.floor(time * 11) % 6}` : `idle_${facing}_0`;
  }
  idleBreath(time: number) { return Math.round(Math.sin(time * Math.PI * 2 / 1.6)); }
  combat(kind:'strike'|'draw'|'counter'|'slide'|'shoot'|GunfuPose,angle:number,elapsed:number,duration:number){
    const facing=Math.abs(Math.cos(angle))>Math.abs(Math.sin(angle))?(Math.cos(angle)>0?'right':'left'):(Math.sin(angle)>0?'down':'up');
    const progress=Math.min(.999,Math.max(0,elapsed/Math.max(.001,duration)));
    if(!['strike','draw','counter','slide','shoot'].includes(kind))return `routine_${kind==='recover'?'groundshot':kind}_${facing}_${kind==='recover'?3:Math.floor(progress*4)}`;
    // Impact is at ~42% of the move, the strongest silhouette is phase 2.
    const frame=progress<.2?0:progress<(kind==='strike'?.32:.4)?1:progress<.64?2:3;
    return `gunfu_${kind==='shoot'?'draw':kind}_${facing}_${kind==='shoot'?(progress<.5?2:3):frame}`;
  }
  clear() { this.facing.clear(); }
}
