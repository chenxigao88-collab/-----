const fs=require('node:fs');
const assert=require('node:assert/strict');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const folder='public/art/';
(async()=>{
  const source=folder+'violet-ultimate-cut-sword-source-v3.png',meta=await sharp(source).metadata();
  const rowBounds=[0,340,644,1024];
  const frames={},pixels=Buffer.alloc(3072*2048*4);
  for(let i=0;i<24;i++){
    let tile;
    if(i<12)tile=sharp(folder+'violet-ultimate-cut-v2.png').extract({left:i%6*512,top:Math.floor(i/6)*512,width:512,height:512});
    else{
      const n=i-12,col=n%4,row=Math.floor(n/4),left=Math.round(col*meta.width/4),right=Math.round((col+1)*meta.width/4),top=rowBounds[row],bottom=rowBounds[row+1],width=right-left,height=bottom-top;
      // One scale for every pose. Pad the generated rows rather than stretching shorter rows.
      tile=sharp(source).extract({left,top,width,height}).extend({bottom:width-height,background:{r:0,g:0,b:0,alpha:0}}).resize(512,512,{kernel:'nearest',fit:'fill'});
    }
    const x=i%6*512,y=Math.floor(i/6)*512;
    const raw=await tile.ensureAlpha().raw().toBuffer();
    // Copy pixels directly: alpha compositing would round translucent edge colours.
    for(let row=0;row<512;row++)raw.copy(pixels,((y+row)*3072+x)*4,row*512*4,(row+1)*512*4);
    frames['ultimate_cut_'+i]={rect:[x,y,512,512],size:[512,512],pivot:[256,256]};
  }
  const file='violet-ultimate-cut-v3.png';
  await sharp(pixels,{raw:{width:3072,height:2048,channels:4}}).png().toFile(folder+file);
  fs.writeFileSync(folder+'violet-ultimate-cut-v3.json',JSON.stringify({file,width:3072,height:2048,frames},null,2));
  const head={left:0,top:0,width:3072,height:1024};
  assert((await sharp(folder+'violet-ultimate-cut-v2.png').extract(head).raw().toBuffer()).equals(await sharp(folder+file).extract(head).raw().toBuffer()),'The first twelve portrait frames must stay pixel-identical');
  console.log('24 portraits, 512 x 512; first 12 pixel-identical; last 12 sword spin');
})().catch(e=>{console.error(e);process.exitCode=1;});
