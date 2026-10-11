const fs=require('node:fs');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
  const input='public/art/violet-ultimate-cut-source.png',meta=await sharp(input).metadata(),frames={},tiles=[];
  for(let i=0;i<8;i++){
    const col=i%4,row=Math.floor(i/4),left=Math.round(col*meta.width/4),top=Math.round(row*meta.height/2),width=Math.round((col+1)*meta.width/4)-left,height=Math.round((row+1)*meta.height/2)-top;
    const tile=await sharp(input).extract({left,top,width,height}).resize(512,512,{kernel:'nearest'}).png().toBuffer();
    tiles.push({input:tile,left:col*512,top:row*512});frames[`ultimate_cut_${i}`]={rect:[col*512,row*512,512,512],size:[512,512],pivot:[256,512]};
  }
  await sharp({create:{width:2048,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile('public/art/violet-ultimate-cut-v1.png');
  fs.writeFileSync('public/art/violet-ultimate-cut-v1.json',JSON.stringify({file:'violet-ultimate-cut-v1.png',width:2048,height:1024,frames},null,2));
  console.log('Eight 512x512 transparent cut-in frames prepared.');
})();
