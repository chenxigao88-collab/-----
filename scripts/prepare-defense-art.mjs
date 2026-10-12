import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {copyFileSync,writeFileSync,mkdirSync} from 'node:fs';
const require=createRequire(import.meta.url),sharp=require(resolve(dirname(process.execPath),'../node_modules/sharp'));
const source=process.argv[2];if(!source)throw new Error('Pass the generated sprite atlas path.');
const meta=await sharp(source).metadata(),size=meta.width/4;
if(meta.width!==meta.height||!meta.hasAlpha)throw new Error('Expected square transparent 4x4 sprite atlas.');
const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const names=['core','core_damaged','wall','wall_damaged','ballista','mortar','frost','lightning','breaker','artillery','bomber','ruin','spawn','foundation','shell','blast'];
const widths=[100,100,42,42,56,60,52,54,62,56,44,42,50,50,24,110],frames={};
for(let n=0;n<16;n++){
  const ox=Math.round((n%4)*size),oy=Math.round(Math.floor(n/4)*size),cw=Math.round((n%4+1)*size)-ox,ch=Math.round((Math.floor(n/4)+1)*size)-oy;let left=cw,top=ch,right=0,bottom=0;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++)if(data[((oy+y)*info.width+ox+x)*4+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  left=Math.max(0,left-2);top=Math.max(0,top-2);right=Math.min(cw-1,right+2);bottom=Math.min(ch-1,bottom+2);
  const w=right-left+1,h=bottom-top+1,dw=widths[n],dh=Math.round(h/w*dw);
  frames[`defense_${names[n]}`]={rect:[ox+left,oy+top,w,h],size:[dw,dh],pivot:[Math.round(dw/2),dh]};
}
mkdirSync('public/art',{recursive:true});copyFileSync(source,'public/art/defense-v1.png');
writeFileSync('public/art/defense-v1.json',JSON.stringify({file:'defense-v1.png',width:meta.width,height:meta.height,frames},null,2));
console.log(`Prepared sixteen authored defense sprites (${meta.width}×${meta.height}, alpha preserved).`);
