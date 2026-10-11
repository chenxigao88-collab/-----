const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
  const root=path.resolve(__dirname,'../public/art');
  const {data,info}=await sharp(path.join(root,'element-weapons.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const regions=[[0,875],[875,1400],[1400,2172]],ids=['frost','lantern','wand'],scales=[.065,.075,.065],frames={};
  if(info.width!==2172||info.height!==724)throw new Error('Unexpected generated weapon atlas dimensions');
  for(let i=0;i<3;i++){
    let minX=info.width,minY=info.height,maxX=-1,maxY=-1;
    for(let y=0;y<info.height;y++)for(let x=regions[i][0];x<regions[i][1];x++)if(data[(y*info.width+x)*4+3]>=128){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    if(maxX<minX)throw new Error('Empty weapon region');
    const w=maxX-minX+1,h=maxY-minY+1,s=scales[i];
    frames[ids[i]]={rect:[minX,minY,w,h],size:[Math.round(w*s),Math.round(h*s)],pivot:[Math.round(w*s*(i===1?.25:.23)),Math.round(h*s*.65)]};
  }
  const corners=[0,info.width-1,info.width*(info.height-1),info.width*info.height-1].map(p=>data[p*4+3]);
  if(corners.some(alpha=>alpha>0))throw new Error('Atlas background is not transparent');
  const file=path.join(root,'atlas.json'),atlas=JSON.parse(fs.readFileSync(file,'utf8'));
  atlas.weapons={file:'element-weapons.png',width:info.width,height:info.height,frames};fs.writeFileSync(file,JSON.stringify(atlas,null,2));
  console.log(JSON.stringify({dimensions:[info.width,info.height],alphaCorners:corners,frames},null,2));
})().catch(e=>{console.error(e);process.exit(1);});
