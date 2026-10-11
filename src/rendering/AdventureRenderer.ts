import { DOOR_POSITIONS, type DoorSide } from '../data/adventure';
import type { World } from '../world/World';
import type { SpriteRenderer } from './SpriteRenderer';
import { AdventureArt, diamond } from './AdventureArt';
import { getWeapon } from '../data/weapons';
export class AdventureRenderer {
  readonly art=new AdventureArt();
  ground(c:CanvasRenderingContext2D,w:World){
    if(!w.adventureMode)return;
    const a=w.adventure,t=a.template;c.save();c.fillStyle=t.tint;c.globalAlpha=.055;c.fillRect(88,94,785,354);c.globalAlpha=1;
    // Broken copper inlays give each court a readable footprint.
    c.fillStyle=t.tint+'45';for(let x=180;x<800;x+=48){c.fillRect(x,180,25,1);c.fillRect(x,395,25,1);}for(let y=196;y<395;y+=48){c.fillRect(178,y,1,25);c.fillRect(780,y,1,25);}
    for(const side of Object.keys(t.doors) as DoorSide[]){const p=DOOR_POSITIONS[side],locked=!a.started||a.locked;
      const vertical=side==='west'||side==='east';c.fillStyle='#080c16';c.fillRect(p.x-(vertical?20:33),p.y-(vertical?42:32),vertical?40:66,vertical?70:46);
      c.fillStyle='#534b52';c.fillRect(p.x-(vertical?19:32),p.y-(vertical?40:30),vertical?38:64,vertical?66:43);
      c.fillStyle=locked?'#362c37':'#132731';c.fillRect(p.x-(vertical?13:25),p.y-(vertical?34:25),vertical?26:50,vertical?57:32);
      c.fillStyle='#a68c69';for(let i=0;i<4;i++)c.fillRect(p.x-24+i*15,p.y-29,7,2);
      if(locked){c.fillStyle='#7f6560';for(let i=-2;i<=2;i++)c.fillRect(p.x+i*8,p.y-24,3,32);diamond(c,p.x,p.y-7,5,'#b95e70');}
      else {c.fillStyle='#87bdb044';c.fillRect(p.x-(vertical?8:23),p.y-10,vertical?16:46,15);diamond(c,p.x,p.y-19,3,'#a9dac4');}
    }
    for(const coin of a.memory.coins)if(!coin.picked){const lift=coin.age<.3?Math.sin(coin.age/.3*Math.PI)*12:Math.sin(w.elapsed*4+coin.id)*1;c.drawImage(this.art.coin(Math.floor(w.elapsed*12+coin.id)%8),Math.round(coin.pos.x-8),Math.round(coin.pos.y-16-lift));}
    const furnace=t.furnace;if(furnace){const f=a.furnace;
      c.fillStyle='#151926';c.fillRect(furnace.x-30,furnace.y-12,60,24);c.fillStyle='#73635e';c.fillRect(furnace.x-28,furnace.y-11,56,2);
      for(let x=-24;x<26;x+=8){c.fillStyle=f.warning>0?'#e9b47a':'#784d41';c.fillRect(furnace.x+x,furnace.y-8,4,17);}
      if(f.warning>0||f.firing>0){c.fillStyle=f.firing>0?'#eea26a55':'#df805933';c.fillRect(furnace.x-52,furnace.y-40,104,77);c.strokeStyle='#edb176';c.setLineDash([4,4]);c.strokeRect(furnace.x-52,furnace.y-40,104,77);c.setLineDash([]);}
      if(f.firing>0)for(let i=0;i<12;i++){c.fillStyle=i%2?'#ffd59d':'#ec8763';c.fillRect(furnace.x-25+i*5,furnace.y-20-Math.floor(Math.sin(i+w.elapsed*30)*8),3,14);}
    }
    if(t.kind==='final'&&a.memory.cleared&&a.memory.chests.every(ch=>ch.claimed)){diamond(c,480,194,12,'#c3a1ef');}
    c.restore();
  }
  objects(c:CanvasRenderingContext2D,w:World,sprites:SpriteRenderer):{y:number;draw:()=>void}[]{
    if(!w.adventureMode)return [];const a=w.adventure,items:{y:number;draw:()=>void}[]=[];
    for(const o of a.template.obstacles)items.push({y:o.y+o.h,draw:()=>c.drawImage(this.art.obstacle(o.kind,o.w,o.h),o.x-6,o.y-42)});
    for(const chest of a.memory.chests)items.push({y:chest.pos.y,draw:()=>{const frame=chest.opened?Math.min(7,Math.floor(chest.age/.075)):0;c.drawImage(this.art.chest(chest.kind,frame),chest.pos.x-32,chest.pos.y-56);if(chest.kind==='crystal'&&chest.opened&&!chest.claimed&&chest.age>.4)diamond(c,chest.pos.x,chest.pos.y-47+Math.round(Math.sin(w.elapsed*3)*2),6,'#ccb0f7');}});
    for(const drop of a.memory.drops)items.push({y:drop.pos.y,draw:()=>{const weapon=w.weapons.slots.find(s=>s.data.id===drop.weapon)?.data;
      c.fillStyle='#0b112477';c.fillRect(drop.pos.x-22,drop.pos.y-2,44,5);const data=weapon??getWeapon(drop.weapon),color=['#cbb793','#97dbe3','#e8b2ef'][data.tier-1];c.strokeStyle=color;c.lineWidth=1;c.beginPath();c.ellipse(drop.pos.x,drop.pos.y,24,6,0,0,Math.PI*2);c.stroke();c.drawImage(sprites.weaponIcon(data.icon),drop.pos.x-22,drop.pos.y-26+Math.round(Math.sin(w.elapsed*3)*2));c.fillStyle=color;c.font='9px Consolas';c.textAlign='center';c.fillText(['Ⅰ','Ⅱ','Ⅲ'][data.tier-1],drop.pos.x,drop.pos.y-31);c.textAlign='left';}});
    if(a.template.kind==='shop'){
      items.push({y:214,draw:()=>c.drawImage(this.art.merchant(Math.floor(w.elapsed*3)%8),432,122)});
      items.push({y:245,draw:()=>{
        c.fillStyle='#151321';c.fillRect(414,214,132,31);c.fillStyle='#775346';c.fillRect(416,215,128,27);c.fillStyle='#b17e62';c.fillRect(416,215,128,3);c.fillStyle='#593e4c';c.fillRect(417,221,126,19);c.fillStyle='#ad876c';c.fillRect(422,223,116,2);
        for(let i=0;i<3;i++){const x=439+i*40,item=a.shop[i];if(item?.sold)continue;if(item?.id==='heal'){c.fillStyle='#918399';c.fillRect(x-3,202,6,4);c.fillStyle='#c887a1';c.fillRect(x-5,207,10,10);c.fillStyle='#f0cada';c.fillRect(x-3,208,2,5);}else if(item?.id==='rune')diamond(c,x,209,7,'#c4a1e4');else if(item?.weapon)c.drawImage(sprites.weaponIcon(getWeapon(item.weapon).icon),x-20,195);}
      }});
    }
    return items;
  }
}
