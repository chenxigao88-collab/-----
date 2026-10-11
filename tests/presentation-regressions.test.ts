import { describe, expect, it, vi } from 'vitest';
import atlas from '../public/art/atlas.json';
import { World } from '../src/world/World';
import { AudioManager } from '../src/feedback/AudioManager';
import { defaultDebug } from '../src/data/player';
import { emptyInput } from '../src/core/InputManager';
import { vec } from '../src/core/types';
import { SpriteAnimator } from '../src/rendering/SpriteAnimator';
import { AssetManager, type ArtMetadata } from '../src/rendering/AssetManager';
import { SpriteRenderer } from '../src/rendering/SpriteRenderer';
import { segmentCapsule, sweptSectorCapsule } from '../src/world/Collision';

const make = () => new World(1, defaultDebug(), new AudioManager());

describe('body facing and stationary breathing', () => {
  it.each([
    [vec(0, -1), 'up'], [vec(0, 1), 'down'], [vec(-1, 0), 'left'], [vec(1, 0), 'right'],
  ])('faces travel direction %j while aiming in the opposite direction', (move, facing) => {
    const w = make(), input = emptyInput(), actor = w.player.actor;
    input.move = move; input.aim = vec(actor.pos.x - move.x*200, actor.pos.y - 13 - move.y*200);
    w.step(1/120, input);
    const animator = new SpriteAnimator();
    expect(animator.body(actor.id,actor.facing,actor.animation,actor.moving)).toContain(`run_${facing}_`);
    expect(Math.cos(actor.aim)*move.x + Math.sin(actor.aim)*move.y).toBeCloseTo(-1);
    w.dispose();
  });
  it('keeps the last movement facing after stopping, even when the mouse moves', () => {
    const w = make(), input = emptyInput(); input.move=vec(-1,0); w.step(1/120,input);
    input.move=vec(); input.aim=vec(900,200); w.step(1/120,input);
    expect(w.player.actor.facing).toBe(Math.PI); expect(w.player.actor.moving).toBe(false);
    expect(new SpriteAnimator().body(1,w.player.actor.facing,3,false)).toBe('idle_left_0'); w.dispose();
  });
  it('faces the dash direction and preserves it in the afterimage', () => {
    const w = make(), input = emptyInput(); input.move=vec(0,-1); input.dash=true; input.aim=vec(900,340); w.step(1/120,input);
    expect(new SpriteAnimator().body(1,w.player.actor.facing,0,true,w.player.dashing)).toBe('dash_3');
    expect(w.feel.ghosts[0].facing).toBe(-Math.PI/2); w.dispose();
  });
  it('uses one standing pose: breathing changes only height, with no horizontal or foot drift', () => {
    const art = new AssetManager(); art.metadata=atlas as unknown as ArtMetadata; art.sheet=()=>({} as HTMLImageElement);
    const renderer = new SpriteRenderer(art), draw = vi.fn(), ctx={ drawImage: draw } as unknown as CanvasRenderingContext2D;
    const animator = renderer.animator;
    for (let frame=0;frame<120;frame++) {
      const time=frame/60, id=animator.body(1,Math.PI/2,time,false);
      expect(id).toBe('idle_down_0'); renderer.drawFrame(ctx,id,480,340,true,false,animator.idleBreath(time));
    }
    const destinations = draw.mock.calls.map(args=>args.slice(5) as number[]);
    expect(new Set(destinations.map(d=>d[0])).size).toBe(1);
    expect(new Set(destinations.map(d=>d[2])).size).toBe(1);
    expect(destinations.every(d=>d[1]+d[3]===340)).toBe(true);
    const heights=destinations.map(d=>d[3]); expect(Math.max(...heights)-Math.min(...heights)).toBe(2);
  });
});

describe('monster silhouette hurtboxes', () => {
  it.each(['chaser','shooter','sniper'] as const)('hits the visible upper body of %s, rather than requiring a foot shot', kind => {
    const w=make(), enemy=w.spawn(kind,vec(320,280)), body=enemy.actor.hurtbox.capsule(enemy.actor.pos);
    const context=w.attacks.snapshot(w.player.actor,14,'test','swift',false);
    w.projectiles.spawn(context,vec(200,body.top.y-body.radius+4),0,{speed:2000,range:500}); w.projectiles.step(.1,.1);
    expect(enemy.actor.health.hp).toBe(enemy.data.hp-14); w.dispose();
  });
  it.each(['chaser','shooter','sniper'] as const)('does not hit empty space beneath %s', kind => {
    const w=make(), enemy=w.spawn(kind,vec(320,280)), context=w.attacks.snapshot(w.player.actor,14,'test','swift',false);
    w.projectiles.spawn(context,vec(200,290),0,{speed:2000,range:500}); w.projectiles.step(.1,.1);
    expect(enemy.actor.health.hp).toBe(enemy.data.hp); w.dispose();
  });
  it('keeps the slender sniper narrow instead of expanding a circle around its entire height', () => {
    const w=make(), enemy=w.spawn('sniper',vec(320,280)), body=enemy.actor.hurtbox.capsule(enemy.actor.pos);
    expect(segmentCapsule(vec(body.top.x+18,200),vec(body.top.x+18,300),body.top,body.bottom,body.radius+2)).toBeNull(); w.dispose();
  });
  it('handles a moving upper body in the same swept collision test', () => {
    const w=make(), enemy=w.spawn('sniper',vec(340,280)); enemy.actor.previous=vec(300,280);
    const context=w.attacks.snapshot(w.player.actor,14,'test','swift',false);
    w.projectiles.spawn(context,vec(200,235),0,{speed:2000,range:500}); w.projectiles.step(.1,.1);
    expect(enemy.actor.health.hp).toBe(enemy.data.hp-14); w.dispose();
  });
  it('uses the visible body for melee range as well as projectile hits', () => {
    const w=make(), enemy=w.spawn('shooter',vec(535,380)), context=w.attacks.snapshot(w.player.actor,34,'test','heavy',true);
    w.melee.spawn(context,w.player.actor,40,1,0,.1,.1,0); w.melee.step(.1,.1);
    expect(enemy.actor.health.hp).toBe(enemy.actor.health.maxHP-34); w.dispose();
  });
  it('does not extend a melee edge beyond its visible endpoint', () => {
    expect(sweptSectorCapsule(vec(),{top:vec(71,25),bottom:vec(71,35),radius:5},70,0,.1)).toBe(false);
  });
  it('targets the body center when homing instead of steering toward the floor', () => {
    const w=make(); w.spawn('sniper',vec(320,220)); const context=w.attacks.snapshot(w.player.actor,14,'test','swift',false);
    w.projectiles.spawn(context,vec(180,200),0,{speed:200,range:500,homing:1}); w.projectiles.step(.1,.1);
    expect(w.projectiles.projectiles[0].angle).toBeLessThan(0); w.dispose();
  });
});
