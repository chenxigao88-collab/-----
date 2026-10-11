const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../public/art');
const heroScale=require('../src/data/hero-scale.json');
async function inspect(file,kinds){
 const {data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const frames={},directions=['down','left','right','up'],scale=heroScale.legacy.sourceScale;
 for(let row=0;row<4;row++)for(let col=0;col<8;col++){
  const left=Math.floor(col*info.width/8),right=Math.floor((col+1)*info.width/8),top=Math.floor(row*info.height/4),bottom=Math.floor((row+1)*info.height/4);
  let x0=right,y0=bottom,x1=-1,y1=-1;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)if(data[(y*info.width+x)*4+3]>=128){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<x0)throw Error(`Empty gunfu frame ${row}:${col}`);
  const kind=kinds[col<4?0:1],id=`gunfu_${kind}_${directions[row]}_${col%4}`;
  const center=left+(right-left)*.5;
  frames[id]={rect:[x0,y0,x1-x0+1,y1-y0+1],size:[Math.round((x1-x0+1)*scale),Math.round((y1-y0+1)*scale)],pivot:[Math.round((center-x0)*scale),Math.round((y1-y0+1)*scale)]};
 }
 const corners=[0,info.width-1,info.width*(info.height-1),info.width*info.height-1].map(p=>data[p*4+3]);if(corners.some(a=>a>0))throw Error('Gunfu sheet is not transparent');
 console.log(JSON.stringify({size:[info.width,info.height],frames:Object.keys(frames).length,corners},null,2));
 return {file,width:info.width,height:info.height,frames};
}
(async()=>{
 const gunfu=await inspect('hero-gunfu-combat.png',['strike','draw']),gunfuMovement=await inspect('hero-gunfu-movement.png',['slide','counter']);
 const atlasPath=path.join(root,'atlas.json'),atlas=JSON.parse(fs.readFileSync(atlasPath,'utf8'));Object.assign(atlas,{gunfu,gunfuMovement});fs.writeFileSync(atlasPath,JSON.stringify(atlas,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
