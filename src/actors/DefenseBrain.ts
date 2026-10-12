import type {Enemy} from './Enemy';
import type {World} from '../world/World';
import type {DefenseSystem} from '../room/DefenseSystem';
import {blockDistance,type DefenseBlock} from '../world/DefenseNavigation';
import {angleTo,constrain,distance,normal,sub,type Vec2} from '../core/types';
interface DefenseMind {target:number;attackTarget:number;revision:number;planIn:number;path:Vec2[];aggro:number;stuck:number;last:Vec2}
export class DefenseBrain {
  private minds=new Map<number,DefenseMind>();private off:()=>void;
  constructor(private w:World,private d:DefenseSystem){this.off=w.events.on('damageApplied',e=>{
    if(e.attack.faction==='player'&&!e.attack.defenseTurret&&!e.attack.secondary&&e.amount>0&&d.roles.get(e.targetId)==='interceptor'){
      const m=this.minds.get(e.targetId);if(m){m.aggro=2;m.planIn=0;}
    }
  });}
  private target(id:number){return id===this.w.player.actor.id?this.w.player.actor:this.d.blocks.find(b=>b.id===id&&b.hp>0);}
  private aliveTarget(id:number){const t=this.target(id);return t&&('health' in t?t.health.alive:t.hp>0)?t:undefined;}
  private gap(e:Enemy,id:number){const t=this.aliveTarget(id);return t?('health' in t?distance(e.actor.pos,t.pos):blockDistance(t,e.actor.pos)):Infinity;}
  private range(e:Enemy){return this.d.roles.get(e.actor.id)==='artillery'?175:e.actor.hurtbox.radius+(e.kind==='boss'?35:15);}
  private visible(e:Enemy,id:number){const t=this.aliveTarget(id);return Boolean(t&&!this.d.contact(e.actor.pos,t.pos,0,id));}
  step(e:Enemy,dt:number){
    if(dt<=0||!e.actor.health.alive||!this.d.roles.has(e.actor.id))return;
    const a=e.actor,role=this.d.roles.get(a.id)!;
    let m=this.minds.get(a.id);if(!m){m={target:this.d.core.id,attackTarget:this.d.core.id,revision:-1,planIn:0,path:[],aggro:0,stuck:0,last:{...a.pos}};this.minds.set(a.id,m);}
    a.previous={...a.pos};a.animation+=dt;a.status.step(dt);a.invulnerability.step(dt);a.moving=false;a.flash=Math.max(0,a.flash-dt);a.recoil=Math.max(0,a.recoil-dt*8);e.attackCooldown=Math.max(0,e.attackCooldown-dt);m.aggro=Math.max(0,m.aggro-dt);m.planIn-=dt;
    if(e.kind==='boss'){
      if(e.brokenRemaining>0){e.brokenRemaining=Math.max(0,e.brokenRemaining-dt);if(!e.brokenRemaining){e.poise=e.poiseMax;e.enter('Move');e.attackCooldown=.7;}return;}
      e.bossPhase=a.health.hp/a.health.maxHP<.35?3:a.health.hp/a.health.maxHP<.7?2:1;e.bossMove='slam';
    }
    if(a.launch.active){const move=a.launch.step(dt),knock=a.knockback.step(dt);a.pos=this.d.resolve(constrain({x:a.pos.x+move.x+knock.x,y:a.pos.y+move.y+knock.y},a.hurtbox.radius),a.previous,a.hurtbox.radius);a.hurtbox.lift=a.launch.height;return;}
    const hitstunned=e.hitstunRemaining>0;e.hitstunRemaining=Math.max(0,e.hitstunRemaining-dt);
    if(hitstunned||a.elemental.hardTime>0){const move=a.knockback.step(dt);a.pos=this.d.resolve(constrain({x:a.pos.x+move.x,y:a.pos.y+move.y},a.hurtbox.radius),a.previous,a.hurtbox.radius);return;}
    if(e.state==='Stunned'||e.state==='Idle')e.enter('Move');
    e.elapsed+=dt;
    if(e.state==='Attack'){
      // The committed target is never swapped mid-swing, including when a wall is destroyed.
      const target=this.aliveTarget(m.attackTarget);
      if(!target){e.enter('Recover');return;}
      if(e.elapsed>=e.windup&&!e.attackFired){
        e.attackFired=true;
        if(this.gap(e,m.attackTarget)<=this.range(e)+10&&this.visible(e,m.attackTarget)){
          if(role==='bomber')this.d.detonate(e);
          else if(m.attackTarget===this.w.player.actor.id)this.w.attacks.requestEnemy(e,{angle:e.lockedAngle,range:Math.max(e.data.attackRange,this.range(e)+10),arc:role==='boss'?2.5:e.data.arc});
          else if(role==='artillery')this.d.enemyShell(e,target.pos,24+this.d.wave*3);
          else {const damage=role==='boss'?65:role==='breaker'?35:10+this.d.wave*2;this.d.hurt(target as DefenseBlock,damage);
            if(role==='boss')for(const b of this.d.blocks)if(b.id!==target.id&&!b.core&&distance(b.pos,target.pos)<62)this.d.hurt(b,Math.round(damage*.65));this.w.audio.play('slash');}
        }
        e.enter('Recover');
      }return;
    }
    if(e.state==='Recover'){if(e.elapsed>=Math.max(.65,e.data.recover)){e.enter('Move');e.attackCooldown=.45;m.planIn=0;}return;}
    if(m.planIn<=0||m.revision!==this.d.revision||!this.aliveTarget(m.target))this.plan(e,m);
    const target=this.aliveTarget(m.target);if(!target)return;
    a.aim=angleTo(a.pos,target.pos);
    const playerTarget=m.target===this.w.player.actor.id;
    const occupied=[...this.minds].filter(([id,other])=>id!==a.id&&other.attackTarget===m.target&&this.w.enemies.some(n=>n.actor.id===id&&n.actor.health.alive&&n.state==='Attack'));
    const limit=playerTarget?2:8;
    if(this.gap(e,m.target)<=this.range(e)&&this.visible(e,m.target)&&e.attackCooldown<=0&&occupied.length<limit){m.attackTarget=m.target;e.enter('Attack');e.lockedAngle=a.aim;a.facing=a.aim;return;}
    while(m.path.length&&distance(a.pos,m.path[0])<10)m.path.shift();
    const goal=m.path[0]??target.pos,delta=normal(sub(goal,a.pos));
    let separation={x:0,y:0};
    for(const other of this.w.enemies){if(other===e||!other.actor.health.alive)continue;const diff=sub(a.pos,other.actor.pos),d=Math.hypot(diff.x,diff.y),desired=a.hurtbox.radius+other.actor.hurtbox.radius+3;if(d<desired){const away=d>.01?normal(diff):{x:a.id%2?1:-1,y:0};separation.x+=away.x*(desired-d)*2;separation.y+=away.y*(desired-d)*2;}}
    const knock=a.knockback.step(dt),speed=e.data.speed*a.elemental.moveScale;
    const next=constrain({x:a.pos.x+delta.x*speed*dt+separation.x*dt+knock.x,y:a.pos.y+delta.y*speed*dt+separation.y*dt+knock.y},a.hurtbox.radius);
    a.pos=this.d.resolve(next,a.pos,a.hurtbox.radius);a.moving=distance(a.pos,a.previous)>.05;if(a.moving)a.facing=angleTo(a.previous,a.pos);
    m.stuck=distance(a.pos,m.last)<1?m.stuck+dt:0;
    if(distance(a.pos,m.last)>=1)m.last={...a.pos};
    if(m.stuck>.65){m.planIn=0;m.stuck=0;}
  }
  private plan(e:Enemy,m:DefenseMind){
    const role=this.d.roles.get(e.actor.id),p=this.w.player.actor;
    let goal:DefenseBlock|typeof p=this.d.core;
    if(role==='interceptor'&&p.health.alive&&distance(p.pos,e.actor.pos)<(m.aggro>0?180:105)&&distance(p.pos,this.d.core.pos)<330)goal=p;
    else if(role==='artillery')goal=this.d.structures.filter(s=>s.hp>0&&s.kind!=='wall').sort((a,b)=>distance(e.actor.pos,a.pos)-distance(e.actor.pos,b.pos))[0]??this.d.core;
    m.target=goal.id;m.revision=this.d.revision;m.planIn=.8+(e.actor.id%5)*.05;
    if(!this.d.contact(e.actor.pos,goal.pos,e.actor.hurtbox.radius,goal.id)){m.path=[];return;}
    const route=this.d.navigation.route(e.actor.pos,goal.pos,e.actor.hurtbox.radius,this.d.blocks,goal.id,role==='breaker'||role==='boss'?.3:1.4);
    m.path=route.points;
    if(route.blocker)m.target=route.blocker.id;
    // If an unusual footprint leaves no grid route, choose the first actual obstruction.
    else if(!route.points.length){const obstruction=this.d.contact(e.actor.pos,goal.pos,e.actor.hurtbox.radius,goal.id);if(obstruction)m.target=obstruction.id;}
  }
  snapshot(){return [...this.minds].filter(([id])=>this.w.enemies.some(e=>e.actor.id===id&&e.actor.health.alive)).map(([id,m])=>({id,target:m.target,attackTarget:m.attackTarget,path:m.path.length}));}
  clear(){this.off();this.minds.clear();}
}
