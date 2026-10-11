const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../public/art');
const heroScale=require('../src/data/hero-scale.json');
const specs=[['hero-gunfu-slashes.png',['downslash','uppercut']],['hero-gunfu-sweep-kick.png',['sweep','kick']],['hero-gunfu-aerial.png',['backflip','airshot']],['hero-gunfu-landing.png',['landspin','groundshot']]];
async function inspect(file,kinds){
 const {data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const {width,height}=info,n=width*height,visited=new Uint8Array(n),queue=new Int32Array(n),cells=Array.from({length:32},()=>({x0:width,y0:height,x1:-1,y1:-1,pixels:0}));
 // Generated grids have slight row/column offsets; connected transparent silhouettes avoid cutting boots.
 for(let start=0;start<n;start++){
  if(visited[start]||data[start*4+3]<128)continue;
  let read=0,write=1,x0=width,y0=height,x1=-1,y1=-1;queue[0]=start;visited[start]=1;
  while(read<write){
   const p=queue[read++],x=p%width,y=Math.floor(p/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const neighbor of [x>0?p-1:-1,x<width-1?p+1:-1,y>0?p-width:-1,y<height-1?p+width:-1]){
    if(neighbor>=0&&!visited[neighbor]&&data[neighbor*4+3]>=128){visited[neighbor]=1;queue[write++]=neighbor;}
   }
  }
  if(write<25)continue;
  const col=Math.max(0,Math.min(7,Math.floor(((x0+x1)/2)/width*8))),row=Math.max(0,Math.min(3,Math.floor(((y0+y1)/2)/height*4)));
  const cell=cells[row*8+col];cell.x0=Math.min(cell.x0,x0);cell.x1=Math.max(cell.x1,x1);cell.y0=Math.min(cell.y0,y0);cell.y1=Math.max(cell.y1,y1);cell.pixels+=write;
 }
 const group=kinds[0]==='downslash'?'slashes':kinds[0]==='sweep'?'sweepKick':kinds[0]==='backflip'?'aerial':'landing';
 const frames={},dirs=['down','left','right','up'],scale=heroScale[group].sourceScale;
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){
  const {x0,y0,x1,y1,pixels}=cells[row*8+col];
  if(pixels<300||x1<x0)throw Error(`Empty ${file} ${row}:${col}`);
  if(x0===0||x1===width-1||y0===0||y1===height-1||x1-x0>width/8*1.3||y1-y0>height/4*1.3)throw Error(`Clipped/merged ${file} ${row}:${col}`);
  const kind=kinds[col<4?0:1],id=`routine_${kind}_${dirs[row]}_${col%4}`,aerial=kind==='backflip'||kind==='airshot';
  let center=(x0+x1)/2;
  if(!aerial){let sum=0,count=0;for(let y=y0;y<y0+(y1-y0)*.5;y++)for(let x=x0;x<=x1;x++){const p=(y*width+x)*4,r=data[p],g=data[p+1],b=data[p+2];if(data[p+3]>=128&&r>155&&g>145&&b>140&&Math.abs(r-g)<30&&Math.abs(g-b)<30){sum+=x;count++;}}if(count>30)center=sum/count;}
  frames[id]={rect:[x0,y0,x1-x0+1,y1-y0+1],size:[Math.round((x1-x0+1)*scale),Math.round((y1-y0+1)*scale)],pivot:[Math.round((center-x0)*scale),Math.round((aerial?(y1-y0+1)/2:y1-y0+1)*scale)]};
 }
 const corners=[0,width-1,width*(height-1),width*height-1].map(p=>data[p*4+3]);if(corners.some(a=>a!==0))throw Error(`${file} opaque corners`);
 console.log(JSON.stringify({file,size:[width,height],frames:Object.keys(frames).length,corners}));
 return {file,width,height,frames};
}
(async()=>{const gunfuRoutine=[];for(const [file,kinds] of specs)gunfuRoutine.push(await inspect(file,kinds));const atlasPath=path.join(root,'atlas.json'),atlas=JSON.parse(fs.readFileSync(atlasPath,'utf8'));atlas.gunfuRoutine=gunfuRoutine;fs.writeFileSync(atlasPath,JSON.stringify(atlas,null,2));})().catch(e=>{console.error(e);process.exit(1);});
