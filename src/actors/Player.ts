import { createActor, handPosition, type Actor } from './Actor';
import { PLAYER_STATS, type DebugSettings } from '../data/player';
import { add, angleTo, constrain, direction, length, mul, vec, type Vec2 } from '../core/types';
import type { InputFrame } from '../core/InputManager';
export class Player {
  readonly actor: Actor;
  readonly stats: { -readonly [K in keyof typeof PLAYER_STATS]:number } = { ...PLAYER_STATS };
  dashRemaining = 0; dashCooldown = 0; dashElapsed = Infinity; previousDashElapsed = Infinity;
  dashDirection = vec(1, 0); perfectTriggered = false; dashes = 0;
  constructor(runId: number) { this.actor = createActor(1, runId, 'player', vec(480, 340), this.stats.maxHP, 10); }
  get dashing() { return this.dashRemaining > 0; }
  step(dt: number, input: InputFrame, settings: DebugSettings, movementScale=1) {
    const a = this.actor; a.previous = { ...a.pos };
    a.invulnerability.setDebug(settings.invincible);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.previousDashElapsed = this.dashElapsed;
    if (input.aim.x !== a.pos.x || input.aim.y !== a.pos.y) a.aim = angleTo(handPosition(a), input.aim);
    if (input.dash && this.dashCooldown === 0 && !this.dashing && a.health.alive) {
      this.dashDirection = length(input.move) > 0 ? input.move : mul(direction(a.aim), -1);
      this.dashRemaining = this.stats.dashDuration; this.dashCooldown = this.stats.dashCooldown;
      this.dashElapsed = 0; this.previousDashElapsed = 0; this.perfectTriggered = false; this.dashes++;
      a.invulnerability.grant('dash', this.stats.dashInvulnerableTime);
    }
    const wasDashing = this.dashing;
    const travelDirection = wasDashing ? this.dashDirection : input.move;
    if (dt > 0 && length(travelDirection) > 0) a.facing = Math.atan2(travelDirection.y, travelDirection.x);
    // Split the final dash step so frame rate cannot extend its 56 px travel.
    const dashTime = wasDashing ? Math.min(dt, this.dashRemaining) : 0;
    const movement: Vec2 = wasDashing
      ? add(mul(this.dashDirection, this.stats.dashSpeed * dashTime), mul(input.move, settings.moveSpeed * (dt - dashTime)))
      : mul(input.move, settings.moveSpeed * dt * movementScale);
    a.pos = constrain(add(add(a.pos, movement), a.knockback.step(dt)), a.hurtbox.radius);
    if (dt > 0) a.moving = length(movement) > 0.001;
    const active=a.moving||length(input.move)>0||input.fire||input.skill||input.dash||input.interact||input.swap||input.ultimate||a.action||a.flash>0;
    const previousIdle=a.idleTime;
    a.idleTime=active?0:a.idleTime+dt;
    if(previousIdle<8&&a.idleTime>=8)a.restCount++;
    this.dashRemaining = Math.max(0, this.dashRemaining - dt);
    if (this.dashElapsed < Infinity) this.dashElapsed += dt;
    a.animation += dt; a.status.step(dt);
    // Invulnerability is advanced after collision in World so exact contact times can be checked.
  }
}
