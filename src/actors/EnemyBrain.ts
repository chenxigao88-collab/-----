import type { Enemy, EnemyAttackOptions } from './Enemy';
import type { Player } from './Player';
import { add, sub, mul, normal, direction, distance, angleTo, constrain, length, clamp, type Vec2 } from '../core/types';
interface EnemyAttackPort { requestEnemy(enemy: Enemy, options?: EnemyAttackOptions): unknown }
import { ENEMY_PRESSURE } from '../data/enemies';
export class EnemyBrain {
  constructor(private player: Player, private attacks: EnemyAttackPort,private navigate?:(from:Vec2,target:Vec2,radius:number)=>Vec2,private pressure=()=>ENEMY_PRESSURE.maxAttackers as number,private specialAttack?:(enemy:Enemy)=>boolean) {}
  step(enemy: Enemy, dt: number, peers: Enemy[]) {
    // Enemy time can be zero while the player moves during a perfect dodge.
    if (dt <= 0) return;
    if(enemy.kind==='boss')return;
    const actor = enemy.actor;
    enemy.attackCooldown=Math.max(0,enemy.attackCooldown-dt);
    actor.previous = { ...actor.pos }; actor.animation += dt; actor.status.step(dt); actor.moving = false;
    if (!actor.health.alive) { enemy.enter('Dead'); return; }
    const hitstunned = enemy.hitstunRemaining > 0;
    enemy.hitstunRemaining = Math.max(0, enemy.hitstunRemaining - dt);
    if(actor.launch.active){actor.pos=constrain(add(add(actor.pos,actor.launch.step(dt)),actor.knockback.step(dt)),actor.hurtbox.radius);actor.hurtbox.lift=actor.launch.height;actor.invulnerability.step(dt);
      if(!actor.launch.active){enemy.hitstunRemaining=Math.max(.16,enemy.hitstunRemaining);enemy.attackCooldown=Math.max(.45,enemy.attackCooldown);}return;}
    if(hitstunned || (actor.elemental.hardKind==='stun'&&actor.elemental.hardTime>0)) {
      actor.pos=constrain(add(actor.pos,actor.knockback.step(dt)),actor.hurtbox.radius);actor.invulnerability.step(dt);return;
    }
    enemy.elapsed += dt;
    if (enemy.state === 'Idle') { if (enemy.elapsed >= .15) enemy.enter('Move'); }
    else if (enemy.state === 'Stunned') enemy.enter('Move');
    else if (enemy.state === 'Recover') this.recover(enemy, dt);
    else if (enemy.state === 'Move') this.move(enemy, dt, peers);
    else if (enemy.state === 'Attack') this.attack(enemy, dt);
    // A committed attack keeps its announced path; separation must not bend a lunge.
    const separation = enemy.state === 'Move' ? this.separate(enemy, peers) : { x: 0, y: 0 };
    actor.pos = constrain(add(add(actor.pos, mul(separation, dt)), actor.knockback.step(dt)), actor.hurtbox.radius);
    actor.invulnerability.step(dt);
  }
  private attack(enemy: Enemy, dt: number) {
    const actor = enemy.actor, data = enemy.data;
    const lockAt = enemy.windup - data.lockLead;
    // A step crossing the lock instant samples the last aim once.
    if (enemy.elapsed - dt < lockAt) enemy.lockedAngle = angleTo(actor.pos, this.player.actor.pos);
    actor.aim = enemy.lockedAngle; actor.facing = enemy.lockedAngle;
    if (enemy.elapsed >= enemy.windup && !enemy.attackFired) {
      enemy.attackFired = true;
      if(!this.specialAttack?.(enemy))this.attacks.requestEnemy(enemy, { angle: enemy.lockedAngle, arc: data.arc, range: data.attackRange, active: data.active });
      enemy.enter('Recover'); enemy.attackFired = true;
      if (data.lunge) enemy.lungeRemaining = data.lunge.duration;
    }
  }
  private recover(enemy: Enemy, dt: number) {
    const actor = enemy.actor, data = enemy.data;
    if (data.lunge && enemy.lungeRemaining > 0) {
      const travelTime = Math.min(dt, enemy.lungeRemaining);
      const travel = data.lunge.distance / data.lunge.duration * travelTime * actor.elemental.moveScale;
      actor.pos = add(actor.pos, mul(direction(enemy.lockedAngle), travel));
      actor.moving = travel > .001; actor.facing = enemy.lockedAngle;
      enemy.lungeRemaining = Math.max(0, enemy.lungeRemaining - dt);
    }
    if (enemy.attackIndex < enemy.attackCount - 1 && enemy.elapsed >= ENEMY_PRESSURE.eliteSecondGap) {
      enemy.attackIndex++;
      if(distance(actor.pos,this.player.actor.pos)<=data.attackRange+24){
        enemy.enter('Attack');enemy.lockedAngle = angleTo(actor.pos, this.player.actor.pos); actor.aim = enemy.lockedAngle;
      }
    } else if (enemy.elapsed >= data.recover) enemy.enter('Move');
  }
  private move(enemy: Enemy, dt: number, peers: Enemy[]) {
    const a = enemy.actor, target = this.player.actor.pos, d = distance(a.pos, target), data = enemy.data;
    a.aim = angleTo(a.pos, target);
    const occupied = peers.filter(other => other !== enemy && other.holdsAttackSlot).length;
    const pressure=this.pressure(),lastAttack=peers.some(other=>other!==enemy&&other.state==='Attack'&&other.elapsed<.55);
    if (occupied < pressure && !lastAttack && enemy.attackCooldown<=0 && d <= data.engageRange) { this.beginAttack(enemy); return; }
    let movement: Vec2 = normal(sub(this.navigate?.(a.pos,target,a.hurtbox.radius)??target, a.pos));
    const waiting=occupied>=pressure||enemy.attackCooldown>0;
    if (waiting && d < data.engageRange + 65) {
      const tangent = direction(a.aim + (a.id % 2 ? 1 : -1) * Math.PI / 2);
      const radial = clamp((d - (data.engageRange + 24)) / 48, -1, 1);
      movement = normal(add(mul(movement, radial), mul(tangent, .8)));
    }
    const travel = data.speed * dt * a.elemental.moveScale * (waiting?.5:1);
    a.pos = add(a.pos, mul(movement, travel)); a.moving = length(movement) * travel > .001;
    if (a.moving) a.facing = Math.atan2(movement.y, movement.x);
  }
  private beginAttack(enemy: Enemy) {
    enemy.attackIndex = 0; enemy.enter('Attack');
    enemy.lockedAngle = angleTo(enemy.actor.pos, this.player.actor.pos); enemy.actor.aim = enemy.lockedAngle;
  }
  private separate(enemy: Enemy, peers: Enemy[]): Vec2 {
    let result = { x: 0, y: 0 };
    for (const other of peers) {
      if (other === enemy || !other.actor.health.alive) continue;
      const diff = sub(enemy.actor.pos, other.actor.pos), d = length(diff), desired = enemy.actor.hurtbox.radius + other.actor.hurtbox.radius + 4;
      if (d > .01 && d < desired) result = add(result, mul(normal(diff), (desired - d) * 2));
    }
    return result;
  }
}
