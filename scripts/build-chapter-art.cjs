const fs=require('node:fs');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const folder='public/art/';
async function bodies(kind,cols){
 const source=folder+`chapter-${kind}-source-v1.png`,meta=await sharp(source).metadata(),tiles=[],frames={},size=kind==='boss'?180:kind==='parasite'?82:90,base=320,cell=192;
 for(let i=0;i<cols*4;i++){
  const col=i%cols,row=Math.floor(i/cols),left=Math.round(col*meta.width/cols),right=Math.round((col+1)*meta.width/cols),top=Math.round(row*meta.height/4),bottom=Math.round((row+1)*meta.height/4),width=right-left,height=bottom-top;
  const {data,info}=await sharp(source).extract({left,top,width,height}).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const seen=new Uint8Array(width*height),parts=[];
  for(let start=0;start<seen.length;start++)if(!seen[start]&&data[start*4+3]>24){const pixels=[start];seen[start]=1;let l=width,r=0;
   for(let head=0;head<pixels.length;head++){const at=pixels[head],x=at%width,y=Math.floor(at/width);l=Math.min(l,x);r=Math.max(r,x);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const next=ny*width+nx;if(!seen[next]&&data[next*4+3]>24){seen[next]=1;pixels.push(next);}}}parts.push({pixels,l,r});}
  parts.sort((a,b)=>b.pixels.length-a.pixels.length);if(!parts.length)throw Error('Empty sprite '+kind+i);const main=parts[0],center=(main.l+main.r)/2,keep=new Uint8Array(width*height);
  for(const part of parts)if(part===main||part.pixels.length>main.pixels.length*.08||Math.abs((part.l+part.r)/2-center)<width*.22)for(const at of part.pixels)keep[at]=1;
  for(let p=0;p<keep.length;p++)if(!keep[p])data[p*4+3]=0;
  let footY=0,footL=width,footR=0;
  for(let y=0;y<height;y++)for(let x=Math.floor(width*.2);x<width*.8;x++)if(data[(y*width+x)*4+3]>180)footY=y;
  for(let y=Math.max(0,footY-7);y<=footY;y++)for(let x=Math.floor(width*.2);x<width*.8;x++)if(data[(y*width+x)*4+3]>180){footL=Math.min(footL,x);footR=Math.max(footR,x);}
  const footX=footL<=footR?(footL+footR)/2:width/2,offsetX=Math.round(160-footX),offsetY=282-footY,extractX=Math.max(0,-offsetX),extractY=Math.max(0,-offsetY),outX=Math.max(0,offsetX),outY=Math.max(0,offsetY);
  const part=await sharp(data,{raw:info}).extract({left:extractX,top:extractY,width:Math.min(width-extractX,base-outX),height:Math.min(height-extractY,base-outY)}).png().toBuffer();
  const staged=await sharp({create:{width:base,height:base,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:part,left:outX,top:outY}]).png().toBuffer();
  const png=await sharp(staged).resize(cell,cell,{kernel:'nearest'}).png().toBuffer(),x=col*cell,y=row*cell;
  tiles.push({input:png,left:x,top:y});frames[`chapter_${kind}_${i}`]={rect:[x,y,cell,cell],size:[size,size],pivot:[size/2,282/base*size]};
 }
 const file=`chapter-${kind}-v1.png`;await sharp({create:{width:cols*cell,height:4*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(folder+file);
 fs.writeFileSync(folder+`chapter-${kind}-v1.json`,JSON.stringify({file,width:cols*cell,height:4*cell,frames},null,2));console.log(kind,Object.keys(frames).length);
}
async function props(){const source=folder+'chapter-props-source-v1.png',meta=await sharp(source).metadata(),frames={},tiles=[],cell=256;
 for(let i=0;i<16;i++){const col=i%4,row=Math.floor(i/4),left=Math.round(col*meta.width/4),top=Math.round(row*meta.height/4),right=Math.round((col+1)*meta.width/4),bottom=Math.round((row+1)*meta.height/4);tiles.push({input:await sharp(source).extract({left,top,width:right-left,height:bottom-top}).resize(cell,cell,{kernel:'nearest'}).png().toBuffer(),left:col*cell,top:row*cell});frames[`chapter_prop_${['lamp','spikes','fire','crystal'][row]}_${col}`]={rect:[col*cell,row*cell,cell,cell],size:[64,64],pivot:[32,59]};}
 const file='chapter-props-v1.png';await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(folder+file);fs.writeFileSync(folder+'chapter-props-v1.json',JSON.stringify({file,width:1024,height:1024,frames},null,2));
}
(async()=>{for(const kind of ['shield','dancer','cantor','parasite','boss'])await bodies(kind,kind==='boss'?8:6);await props();for(const kind of ['outer','forge','inner'])await sharp(folder+`chapter-${kind}-source-v1.png`).resize(960,540,{kernel:'nearest'}).png().toFile(folder+`chapter-${kind}-room-v1.png`);})().catch(e=>{console.error(e);process.exitCode=1;});
