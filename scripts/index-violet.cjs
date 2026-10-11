const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../public/art');
const specs=[['violet-locomotion.png',['idle'],8],['violet-run-v2.png',['run'],6,6],['violet-run-profile.png',['run'],4,4],['violet-slash.png',['greatslash']],['violet-upper.png',['greatupper']],['violet-spin-kneel.png',['greatspin','kneelshot1']],['violet-kneel-turn.png',['kneelshot2','turnshot']],['violet-utility.png',['dash'],8],['violet-death.png',['death']]];
const dirs=['down','left','right','up'];
async function inspect(file,kinds,sourceCols,frameCount=4){
 const {data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const profile=file==='violet-run-profile.png',rows=profile?2:4;
 const {width,height}=info,cols=sourceCols??kinds.length*frameCount,n=width*height,seen=new Uint8Array(n),owner=new Uint8Array(n),queue=new Int32Array(n),cells=Array.from({length:cols*rows},()=>({x0:width,y0:height,x1:-1,y1:-1,pixels:0}));
 for(let start=0;start<n;start++){
  if(seen[start]||data[start*4+3]<128)continue;
  let read=0,write=1,x0=width,y0=height,x1=-1,y1=-1;queue[0]=start;seen[start]=1;
  while(read<write){const p=queue[read++],x=p%width,y=Math.floor(p/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const next of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>=128){seen[next]=1;queue[write++]=next;}
  }
  if(write<25)continue;
  const col=Math.min(cols-1,Math.floor((x0+x1)/2/width*cols)),row=Math.min(rows-1,Math.floor((y0+y1)/2/height*rows)),cell=cells[row*cols+col];
  for(let n=0;n<write;n++)owner[queue[n]]=row*cols+col+1;
  cell.x0=Math.min(cell.x0,x0);cell.x1=Math.max(cell.x1,x1);cell.y0=Math.min(cell.y0,y0);cell.y1=Math.max(cell.y1,y1);cell.pixels+=write;
 }
 const frames={},landmarks=[];
 for(let row=0;row<rows;row++)for(let col=0;col<kinds.length*frameCount;col++){
  const c=cells[row*cols+col],kind=kinds[Math.floor(col/frameCount)],id=profile?`violet_run_right_${row*cols+col}`:`violet_${kind}_${dirs[row]}_${col%frameCount}`;
  if(c.pixels<500||c.x1-c.x0>width/cols*1.8||c.y1-c.y0>height/4*1.6)throw Error(`Empty or merged frame: ${id} ${JSON.stringify(c)}`);
  if(c.x0===0||c.x1===width-1||c.y0===0||c.y1===height-1)throw Error(`Clipped frame: ${id} ${JSON.stringify(c)}`);
  const hair=(x,y)=>{const p=(y*width+x)*4,r=data[p],g=data[p+1],b=data[p+2];return data[p+3]>=128&&r>120&&g>115&&b>150&&Math.abs(r-g)<35&&b-r<75&&b>=r-10;};
  const cw=c.x1-c.x0+1,ch=c.y1-c.y0+1,hseen=new Uint8Array(cw*ch);let largest=[];
  for(let hy=0;hy<ch;hy++)for(let hx=0;hx<cw;hx++){
    const start=hy*cw+hx;if(hseen[start]||!hair(c.x0+hx,c.y0+hy))continue;
    const part=[start];hseen[start]=1;
    for(let n=0;n<part.length;n++){const p=part[n],x=p%cw,y=Math.floor(p/cw);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,i=ny*cw+nx;if(nx>=0&&nx<cw&&ny>=0&&ny<ch&&!hseen[i]&&hair(c.x0+nx,c.y0+ny)){hseen[i]=1;part.push(i);}}}
    if(part.length>largest.length)largest=part;
  }
  const headMask=new Set(largest),counts=Array(ch).fill(0);for(const p of largest)counts[Math.floor(p/cw)]++;
  const headY=c.y0+counts.findIndex(count=>count>=18);
  if(headY<0)throw Error(`Missing hair anchor: ${id}`);
  let hx0=width,hx1=-1,sum=0,count=0;
  for(let y=headY;y<Math.min(c.y1,headY+45);y++)for(let x=c.x0;x<=c.x1;x++)if(headMask.has((y-c.y0)*cw+x-c.x0)){hx0=Math.min(hx0,x);hx1=Math.max(hx1,x);sum+=x;count++;}
  const headWidth=hx1-hx0+1;let center=sum/count;
  // Face color excludes the long moving hair and gives a stable skull anchor.
  let faceSum=0,faceCount=0;
  if(profile||(file==='violet-run-v2.png'&&row!==3)){for(let y=c.y0;y<c.y0+ch*.52;y++)for(let x=c.x0;x<=c.x1;x++){const p=(y*width+x)*4,r=data[p],g=data[p+1],b=data[p+2];if(owner[y*width+x]===row*cols+col+1&&r>160&&g>90&&b>65&&r-g>18&&g-b>3){faceSum+=x;faceCount++;}}
    if(faceCount<40)throw Error(`Missing face anchor: ${id}`);center=faceSum/faceCount+(profile?-20:row===1?12:row===2?-12:0);}
  // One anatomical scale per sheet: weapon highlights and moving hair must
  // never cause a frame to resize. Sword-tip bounds are separate from feet.
  const scales={'violet-locomotion.png':.23,'violet-run-v2.png':.23,'violet-run-profile.png':.145,'violet-slash.png':.21,'violet-upper.png':.21,'violet-spin-kneel.png':.235,'violet-kneel-turn.png':.205,'violet-utility.png':.23,'violet-death.png':.185};
  const scale=scales[file],feet=profile?[481,951][row]:file==='violet-run-v2.png'?[252,503,752,1009][row]:file==='violet-slash.png'?[260,506,761,1009][row]:file==='violet-upper.png'?[252,507,753,1009][row]:c.y1+1;
  frames[id]={rect:[c.x0,c.y0,c.x1-c.x0+1,c.y1-c.y0+1],size:[Math.round((c.x1-c.x0+1)*scale),Math.round((c.y1-c.y0+1)*scale)],pivot:[Math.round((center-c.x0)*scale),Math.round((feet-c.y0)*scale)]};
  // Compensate the measured pixel-rounding residual in the final game render.
  if(profile)frames[id].pivot[0]+=[0,-1,1,-1,0,0,0,-1][row*cols+col];
  let foreign=false;const spans=[];
  for(let y=c.y0;y<=c.y1;y++){let start=-1;for(let x=c.x0;x<=c.x1+1;x++){
    const label=x<=c.x1?owner[y*width+x]:0,own=label===row*cols+col+1;
    if(label&&!own)foreign=true;
    if(own&&start<0)start=x;
    if(!own&&start>=0){spans.push([start-c.x0,y-c.y0,x-start]);start=-1;}
  }}
  if(foreign)frames[id].clipSpans=spans;
  landmarks.push({id,headWidth,center,faceSum,faceCount,scale:+scale.toFixed(4),height:frames[id].size[1]});
 }
 if(file==='violet-run-v2.png')for(const id of Object.keys(frames))if(id.includes('_left_')||id.includes('_right_'))delete frames[id];
 if(profile)for(const [id,frame]of Object.entries(frames))frames[id.replace('_right_','_left_')]={...frame,flipX:true};
 return {atlas:{file,width,height,frames},landmarks};
}
(async()=>{const results=[];for(const [file,kinds,sourceCols,frameCount] of specs)results.push(await inspect(file,kinds,sourceCols,frameCount));const p=path.join(root,'atlas.json'),atlas=JSON.parse(fs.readFileSync(p,'utf8'));atlas.characters={...atlas.characters,violet:results.map(r=>r.atlas)};fs.writeFileSync(p,JSON.stringify(atlas,null,2));fs.writeFileSync(path.resolve(__dirname,'../artifacts/violet-atlas-report.json'),JSON.stringify(results.map(r=>({file:r.atlas.file,frames:Object.keys(r.atlas.frames).length,landmarks:r.landmarks})),null,2));console.log(results.map(r=>({file:r.atlas.file,frames:Object.keys(r.atlas.frames).length,height:r.landmarks.slice(0,8).map(l=>l.height)})));})().catch(e=>{console.error(e);process.exit(1);});
