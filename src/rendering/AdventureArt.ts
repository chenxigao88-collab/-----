import type { RuneId } from '../data/adventure';
import type { Atlas } from './AssetManager';
const rect=(c:CanvasRenderingContext2D,color:string,x:number,y:number,w:number,h:number)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
export function pixelPanel(c:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,accent='#aa895b'){
  rect(c,'#070c16',x,y,w,h);rect(c,'#403747',x+2,y+2,w-4,h-4);rect(c,accent,x+3,y+3,w-6,1);rect(c,'#84705c',x+3,y+4,1,h-7);rect(c,'#171c2a',x+5,y+5,w-10,h-10);rect(c,'#22283a',x+6,y+6,w-12,2);rect(c,'#0d1420',x+6,y+h-8,w-12,2);
  for(const [dx,dy]of [[3,3],[w-6,3],[3,h-6],[w-6,h-6]]){rect(c,'#e6c68d',x+dx,y+dy,2,2);rect(c,'#0a111a',x+dx+1,y+dy+1,1,1);}
}
export function diamond(c:CanvasRenderingContext2D,x:number,y:number,size:number,color:string,filled=true){
  for(let row=-size;row<=size;row++){const width=size-Math.abs(row);rect(c,'#090d1b',x-width-1,y+row,width*2+3,1);if(width)rect(c,filled?color:'#343445',x-width,y+row,width*2+1,1);}
  if(filled){rect(c,'#fff1d6',x-1,y-size+2,2,2);rect(c,'#ffffff66',x-size+2,y,Math.max(1,size-2),1);}
}
export function runeIcon(c:CanvasRenderingContext2D,id:RuneId,x:number,y:number,color:string,size=12){
  diamond(c,x,y,size,color);const ink='#292036';
  if(id==='feather'||id==='landing'){for(let i=0;i<8;i++)rect(c,ink,x-4+i,y+4-i,3,1);rect(c,ink,x-4,y+1,2,4);}
  else if(id==='hunt'||id==='mark'){rect(c,ink,x-5,y-4,2,8);rect(c,ink,x+3,y-4,2,8);rect(c,ink,x-3,y,6,2);}
  else if(id==='counter'){rect(c,ink,x-5,y-4,9,2);rect(c,ink,x-5,y-3,2,7);rect(c,ink,x-5,y+3,6,2);}
  else if(id==='conduit'){rect(c,ink,x,y-5,2,10);rect(c,ink,x-5,y-1,10,2);}
  else if(id==='gather'){rect(c,ink,x-6,y-4,2,8);rect(c,ink,x+4,y-4,2,8);rect(c,ink,x-4,y-1,3,2);rect(c,ink,x+1,y-1,3,2);}
  else if(id==='afterglow'){rect(c,ink,x-2,y-2,5,5);rect(c,ink,x-1,y-6,2,2);rect(c,ink,x-6,y-1,2,2);rect(c,ink,x+4,y-1,2,2);}
  else if(id==='echo'){for(const i of [-4,0,4])rect(c,ink,x+i,y-3,2,7-Math.abs(i)/2);}
  else {rect(c,ink,x-4,y-4,9,2);rect(c,ink,x-4,y-2,2,5);rect(c,ink,x+3,y-2,2,5);rect(c,ink,x-2,y+3,5,2);}
}
/** Native pixel sprites share fixed grids and pivots across every frame. */
export class AdventureArt {
  private cache=new Map<string,HTMLCanvasElement>();
  private source?:HTMLImageElement;private metadata?:Atlas;
  useAtlas(source:HTMLImageElement,metadata:Atlas){this.source=source;this.metadata=metadata;this.cache.clear();}
  private sprite(key:string,w:number,h:number,x:number,y:number){return this.make(`atlas-${key}`,w,h,c=>{const f=this.metadata!.frames[key];c.drawImage(this.source!,...f.rect,Math.round(x-f.pivot[0]),Math.round(y-f.pivot[1]),...f.size);});}
  private make(key:string,w:number,h:number,draw:(c:CanvasRenderingContext2D)=>void){let image=this.cache.get(key);if(!image){image=document.createElement('canvas');image.width=w;image.height=h;const c=image.getContext('2d')!;c.imageSmoothingEnabled=false;draw(c);this.cache.set(key,image);}return image;}
  chest(kind:'copper'|'crystal',frame:number){
    frame=Math.max(0,Math.min(7,Math.floor(frame)));
    if(this.source&&this.metadata)return this.sprite(`${kind}_${frame}`,64,64,32,56);
    return this.make(`chest-${kind}-${frame}`,64,64,c=>{
      const crystal=kind==='crystal',wood=crystal?'#3c304f':'#624333',light=crystal?'#675075':'#9d7251',metal=crystal?'#9080a7':'#bf955f',gem=crystal?'#c49aff':'#e8bf77';
      rect(c,'#080c1877',10,55,45,4);rect(c,'#11111d',10,33,44,23);rect(c,metal,12,34,40,20);rect(c,wood,15,36,34,15);rect(c,light,16,37,32,2);
      for(let y=41;y<50;y+=4){rect(c,'#211c2b',17,y,30,1);rect(c,light,18,y+1,9,1);}
      for(const x of [14,45]){rect(c,'#282638',x,35,5,19);rect(c,metal,x+1,35,3,18);rect(c,'#e5cc9e',x+1,38,1,2);rect(c,'#e5cc9e',x+1,48,1,2);}
      rect(c,'#201b2d',28,40,9,10);rect(c,metal,29,41,7,8);diamond(c,32,45,3,gem);
      const lift=[0,1,3,7,12,16,19,20][frame],top=28-lift,height=frame<3?13:Math.max(6,13-Math.floor(frame/2));
      if(frame>1){rect(c,'#0c1020',15,32,34,5);rect(c,gem,19,33,27,2);for(let i=0;i<4;i++)rect(c,frame<6?'#eee0ff':'#a28bc0',22+i*6,30-i%2*3,2,2);}
      rect(c,'#10101b',10,top,44,height);rect(c,metal,12,top+1,40,height-2);rect(c,wood,17,top+3,30,height-5);rect(c,light,18,top+3,28,2);
      rect(c,metal,14,top+1,4,height-1);rect(c,metal,45,top+1,4,height-1);rect(c,'#eed6ac',13,top+1,38,1);rect(c,'#322738',12,top+height-2,40,2);
      if(crystal)diamond(c,32,top+6,4,gem);
    });
  }
  coin(frame:number){return this.make(`coin-${frame%8}`,16,16,c=>{
    const w=[10,8,5,3,5,8,10,11][frame%8],x=Math.floor((16-w)/2);
    rect(c,'#30202a',x,4,w,9);rect(c,'#926135',x,3,w,8);rect(c,'#ddb354',x+1,3,Math.max(1,w-2),7);rect(c,'#ffe5a0',x+1,3,Math.max(1,w-3),1);rect(c,'#bc853f',x+1,9,Math.max(1,w-2),2);if(w>5){rect(c,'#976532',7,5,2,4);rect(c,'#fff0bd',6,5,1,3);}
  });}
  merchant(frame:number){if(this.source&&this.metadata)return this.sprite(`merchant_${frame%8}`,96,96,48,88);return this.make(`merchant-${frame%4}`,96,96,c=>{
    c.scale(2,2);const bob=frame%4===1?1:0,sw=frame%4===2?1:0;
    rect(c,'#060b1577',10,44,28,3);
    for(let y=14;y<41;y++){const width=y<20?10:y<28?13:14;rect(c,'#121624',24-width-sw,y+bob,width*2+sw*2,1);}
    rect(c,'#61415c',13,25+bob,23,14);rect(c,'#8c646e',15,27+bob,19,10);rect(c,'#a88280',17,28+bob,2,9);rect(c,'#342839',20,27+bob,11,13);
    rect(c,'#1b192a',15,9+bob,18,19);rect(c,'#61526c',17,10+bob,14,16);rect(c,'#96809a',18,11+bob,12,3);rect(c,'#2d243b',17,17+bob,14,9);
    rect(c,'#e3bfa6',19,17+bob,10,8);rect(c,'#f2d4b3',20,17+bob,7,5);rect(c,'#d2becb',18,14+bob,12,5);rect(c,'#eee0d5',19,14+bob,10,2);rect(c,'#d2becb',18,18+bob,2,6);rect(c,'#d2becb',29,18+bob,2,6);
    rect(c,'#3b2b49',21,20+bob,2,2);rect(c,'#3b2b49',26,20+bob,2,2);rect(c,'#ce858c',20,22+bob,2,1);rect(c,'#ce858c',27,22+bob,2,1);
    rect(c,'#ceab71',20,26+bob,10,2);diamond(c,25,27+bob,2,'#b6d9cd');
    rect(c,'#bc9470',32,29+bob,5,6);rect(c,'#e9c8a8',12,29+bob,4,3);rect(c,'#e9c8a8',34,28+bob,4,3);
    rect(c,'#71545f',17,37,16,6);rect(c,'#211e2a',17,42,6,3);rect(c,'#211e2a',27,42,6,3);rect(c,'#c39a76',17,43,5,1);rect(c,'#c39a76',27,43,5,1);
  });}
  obstacle(kind:'pillar'|'crate',w:number,h:number){return this.make(`${kind}-${w}-${h}`,w+12,h+48,c=>{
    if(kind==='pillar'){
      rect(c,'#070e1877',3,43,w+8,h);rect(c,'#181c28',5,4,w+2,h+43);rect(c,'#56606a',7,6,w-2,h+38);rect(c,'#788089',8,8,w-4,3);rect(c,'#3b4552',w-5,12,9,h+31);
      for(let y=16;y<h+37;y+=13){rect(c,'#28323d',7,y,w-2,2);rect(c,'#66717a',9,y+2,w-14,1);}
      for(let i=0;i<12;i++){const x=9+(i*13)%(w-10),y=13+(i*17)%(h+19);rect(c,i%3?'#46515d':'#89909a',x,y,3,1);}
      rect(c,'#272b38',15,14,1,6);rect(c,'#272b38',16,19,3,1);rect(c,'#414943',7,h+31,7,4);rect(c,'#788263',8,h+32,4,1);
      rect(c,'#333640',3,h+35,w+8,8);rect(c,'#74737b',5,h+35,w+4,2);rect(c,'#bea57b',w/2+3,20,3,6);rect(c,'#303647',w/2+2,22,1,4);
    }else{
      rect(c,'#080e1877',3,48,w+8,h-2);rect(c,'#171a23',4,30,w+3,h+12);rect(c,'#785441',6,32,w-1,h+8);rect(c,'#a98259',7,33,w-3,4);
      for(let x=9;x<w;x+=10){rect(c,'#3d3436',x,39,2,h-1);rect(c,'#956c4c',x+2,39,2,h-2);}
      for(let i=0;i<12;i++){const x=10+(i*7)%(w-13),y=40+(i*11)%(h-4);rect(c,i%2?'#523e35':'#b08559',x,y,3,1);}
      for(const x of [8,w-3]){rect(c,'#40404a',x,33,4,h+7);rect(c,'#bca784',x,35,2,3);rect(c,'#bca784',x,54,2,2);}
      rect(c,'#1e2330',5,h+38,w+1,3);rect(c,'#6c5b4b',9,h+36,w-8,2);
    }
  });}
}
