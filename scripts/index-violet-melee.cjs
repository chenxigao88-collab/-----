const fs=require('node:fs'),path=require('node:path');
const sharp=require(path.resolve(path.dirname(process.execPath),'../node_modules/sharp'));
const root=path.resolve(__dirname,'../public/art');
(async()=>{
  const file='violet-melee-v1.png',{data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frames={};
  if([0,info.width-1,info.width*(info.height-1),info.width*info.height-1].some(p=>data[p*4+3]>5))throw Error('Violet melee PNG background is not transparent');
  const kinds=['down','upper','spin','slash'];
  for(let row=0;row<4;row++)for(let n=0;n<6;n++){
    const x=Math.round(n*info.width/6),y=Math.round(row*info.height/4),w=Math.round((n+1)*info.width/6)-x,h=Math.round((row+1)*info.height/4)-y;
    let visible=0;for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)if(data[(py*info.width+px)*4+3]>100)visible++;
    if(visible<15)throw Error(`Empty violet melee frame ${row}:${n}`);
    frames[`violet_melee_${kinds[row]}_${n}`]={rect:[x,y,w,h],size:[128,128],pivot:[64,64]};
  }
  fs.writeFileSync(path.join(root,'violet-melee-v1.json'),JSON.stringify({file,width:info.width,height:info.height,frames},null,2));
  console.log('Indexed 24 independent purple melee animation frames.');
})().catch(e=>{console.error(e);process.exitCode=1;});
