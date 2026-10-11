const fs=require('node:fs'),path=require('node:path');
const sharp=require(path.resolve(path.dirname(process.execPath),'../node_modules/sharp'));
const root=path.resolve(__dirname,'../public/art');
(async()=>{
  for(const kind of ['effects','body']){
    const file=`violet-moon-${kind}-v1.png`,{data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frames={};
    const corners=[0,info.width-1,info.width*(info.height-1),info.width*info.height-1];
    if(corners.some(p=>data[p*4+3]>10))throw Error(`Opaque atlas background: ${file}`);
    for(let row=0;row<4;row++)for(let col=0;col<6;col++){
      const x=Math.round(col*info.width/6),y=Math.round(row*info.height/4),w=Math.round((col+1)*info.width/6)-x,h=Math.round((row+1)*info.height/4)-y;
      let visible=0;for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)if(data[(py*info.width+px)*4+3]>100)visible++;
      if(visible<40)throw Error(`Empty animation cell ${kind}:${row}:${col}`);
      const id=kind==='body'?`moon_body_${row*6+col}`:`moon_${['seal','wings','rift','burst'][row]}_${col}`;
      frames[id]={rect:[x,y,w,h],size:kind==='body'?[96,96]:[160,160],pivot:kind==='body'?[48,96]:[80,80]};
    }
    fs.writeFileSync(path.join(root,`violet-moon-${kind}-v1.json`),JSON.stringify({file,width:info.width,height:info.height,frames},null,2));
    console.log(`Indexed ${kind}: 24 transparent frames (${info.width}x${info.height}).`);
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
