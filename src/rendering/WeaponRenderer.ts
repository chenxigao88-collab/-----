import type {World} from '../world/World';
import {ELEMENTS} from '../data/elements';
import {handPosition} from '../actors/Actor';
import {shotProfile,type BulletStyle} from '../data/weaponMechanics';
import type {AssetManager} from './AssetManager';
import {PaintRenderer} from './PaintRenderer';
import {violetMeleeFrame} from '../data/violetMelee';
const dimensions:Record<BulletStyle,[number,number]>={needle:[31,13],gravel:[15,15],crystal:[26,16],fireball:[38,32],arc:[51,23],wind:[31,25],bolt:[51,22],ring:[34,34],wave:[60,57]};
export class WeaponRenderer {
  draw(c:CanvasRenderingContext2D,w:World,art:AssetManager){
    const paint=new PaintRenderer(art);
    for(const flash of w.feel.weaponFlashes){
      const id=flash.style==='wave'&&w.player.actor.character==='violet'?violetMeleeFrame('slash',1-flash.life/flash.total):flash.style==='crystal'?'muzzle_ice':flash.style==='arc'?'muzzle_arc':flash.style==='fireball'?'fireball':flash.style==='ring'||flash.style==='wave'||flash.style==='wind'?'wind':'muzzle_gold';
      const size=25+flash.charge*14;
      paint.draw(c,id,flash.pos.x+Math.cos(flash.angle)*8,flash.pos.y+Math.sin(flash.angle)*8,size*1.4,size,flash.angle,flash.life/flash.total);
    }
    for(const p of w.projectiles.projectiles){
      if(p.delay>0)continue;
      const [width,height]=dimensions[p.style],scale=p.style==='fireball'?.65+p.charged*.7:p.style==='bolt'?1+p.charged*.2:1;
      const artId=p.style==='wave'&&p.context.sourceId===w.player.actor.id&&w.player.actor.character==='violet'?violetMeleeFrame('slash',.45):p.context.faction==='enemy'?'fireball':p.style;
      // Trail silhouettes come from the same authored projectile, never line segments.
      if(p.style!=='ring')for(let i=0;i<p.trail.length;i+=3){const point=p.trail[i];paint.draw(c,artId,point.x,point.y,width*scale,height*scale,p.angle,.08+.12*i/Math.max(1,p.trail.length));}
      paint.draw(c,artId,p.pos.x,p.pos.y,width*scale,height*scale,p.style==='ring'?p.traveled*.045:p.angle);
    }
    const a=w.player.actor,gun=w.weapons.current.data,slot=w.weapons.active,hand=handPosition(a),q=w.attacks.charge;
    c.save();c.textAlign='center';c.font='bold 10px Microsoft YaHei';
    if(w.attacks.charging){
      const color=ELEMENTS[gun.element].color,id=gun.family==='frost_string'?'muzzle_ice':gun.family==='ember_lantern'?'fireball':'bolt';
      paint.draw(c,id,hand.x,hand.y,22+q*20,22+q*20,a.aim,.35+q*.5);
      const count=shotProfile(gun,q).count;if(gun.family==='frost_string')for(let i=0;i<count;i++){const angle=w.elapsed*2+i*Math.PI*2/count;paint.draw(c,'crystal',hand.x+Math.cos(angle)*20,hand.y+Math.sin(angle)*20,12,9,angle);}
      c.fillStyle='#151827';c.fillRect(a.pos.x-28,a.pos.y-74,56,5);c.fillStyle=color;c.fillRect(a.pos.x-27,a.pos.y-73,54*q,3);
      c.fillText(gun.family==='frost_string'?`蓄晶 · ${count}枚`:gun.family==='ember_lantern'?'蓄火 · 扩大爆炸':'蓄弩 · 重矢',a.pos.x,a.pos.y-80);
    }else if(gun.family==='thunder_branch'){
      const hot=w.attacks.overheated[slot]>0;c.fillStyle='#151827';c.fillRect(a.pos.x-28,a.pos.y-74,56,5);c.fillStyle=hot?'#ff946b':'#c49aff';c.fillRect(a.pos.x-27,a.pos.y-73,w.attacks.heat[slot]*54,3);if(hot)c.fillText('过热 · 冷却',a.pos.x,a.pos.y-80);
    }else if(gun.family==='hush_edge'&&w.attacks.blade[slot]>0){c.fillStyle='#c9ffdf';c.fillText(w.attacks.blade[slot]>=3?'剑气就绪':`剑势 ${w.attacks.blade[slot]} / 3`,a.pos.x,a.pos.y-70);}
    c.restore();
  }
}
