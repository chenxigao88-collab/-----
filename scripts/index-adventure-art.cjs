const fs=require('node:fs'),path=require('node:path');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
  const file=path.resolve(__dirname,'../public/art/adventure-atlas-v1.png');
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=(x,y)=>data[(y*info.width+x)*4+3],bands=[];
  let start=-1,last=-1;
  for(let y=0;y<info.height;y++){let count=0;for(let x=0;x<info.width;x++)if(alpha(x,y)>96)count++;
    if(count>30){if(start<0)start=y;last=y;}else if(start>=0&&y-last>7){bands.push([start,last+1]);start=-1;}
  }
  if(start>=0)bands.push([start,last+1]);const rows=bands.filter(([a,b])=>b-a>50);if(rows.length!==6)throw Error(`Expected six sprite rows, got ${JSON.stringify(rows)}`);
  const boundaries=[0,...rows.slice(1).map((row,i)=>Math.floor((rows[i][1]+row[0])/2)),info.height];
  const frames={};
  for(let row=0;row<6;row++)for(let col=0;col<4;col++){
    const left=Math.floor(col*info.width/4),right=Math.floor((col+1)*info.width/4),top=boundaries[row],bottom=boundaries[row+1];
    let x0=right,y0=bottom,x1=left,y1=top,base=top;
    for(let y=top;y<bottom;y++){let count=0;for(let x=left;x<right;x++)if(alpha(x,y)>96){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}if(count>(row<4?40:8))base=y+1;}
    const merchant=row>=4;let sum=0,count=0;
    for(let y=Math.max(y0,base-(merchant?18:35));y<base-(merchant?1:8);y++)for(let x=left;x<right;x++)if(alpha(x,y)>160){sum+=x;count++;}
    const center=count?sum/count:(x0+x1)/2,scale=merchant?.24:.22,index=(row%2)*4+col,key=merchant?`merchant_${index}`:`${row<2?'copper':'crystal'}_${index}`;
    frames[key]={rect:[x0,y0,x1-x0+1,y1-y0+1],size:[Math.round((x1-x0+1)*scale),Math.round((y1-y0+1)*scale)],pivot:[Math.round((center-x0)*scale),Math.round((base-y0)*scale)]};
  }
  const metadata={file:path.basename(file),width:info.width,height:info.height,frames};fs.writeFileSync(path.resolve(__dirname,'../public/art/adventure-atlas-v1.json'),JSON.stringify(metadata,null,2));
  console.log(JSON.stringify({rows,frames:Object.keys(frames).length,alphaChannels:info.channels,metadata},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
