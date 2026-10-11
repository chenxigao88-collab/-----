const fs=require('node:fs');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const folder='public/art/';
async function grid(kind,columns,rows,cellSize,rowBounds){
  const source=folder+`violet-ultimate-${kind}-source-v2.png`,meta=await sharp(source).metadata(),frames={},tiles=[];
  const body=kind==='blade'||kind==='guns';
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
    const left=Math.round(col*meta.width/columns),right=Math.round((col+1)*meta.width/columns),top=rowBounds?.[row]??Math.round(row*meta.height/rows),bottom=rowBounds?.[row+1]??Math.round((row+1)*meta.height/rows),width=right-left,height=bottom-top;
    let tile=sharp(source).extract({left,top,width,height});
    if(body){
      const {data,info}=await tile.ensureAlpha().raw().toBuffer({resolveWithObject:true});
      // Remove disconnected pieces of neighboring sprites in the generated grid.
      const visited=new Uint8Array(width*height),components=[];
      for(let start=0;start<visited.length;start++){
        if(visited[start]||data[start*4+3]<16)continue;
        const pixels=[start];visited[start]=1;let l=width,r=0;
        for(let head=0;head<pixels.length;head++){
          const at=pixels[head],x=at%width,y=Math.floor(at/width);l=Math.min(l,x);r=Math.max(r,x);
          for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
            const nx=x+dx,ny=y+dy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const next=ny*width+nx;
            if(!visited[next]&&data[next*4+3]>=16){visited[next]=1;pixels.push(next);}
          }
        }components.push({pixels,l,r});
      }
      components.sort((a,b)=>b.pixels.length-a.pixels.length);const main=components[0],center=(main.l+main.r)/2,kept=new Uint8Array(width*height);
      for(const component of components)if(component===main||Math.abs((component.l+component.r)/2-center)<width*.23||component.pixels.length>main.pixels.length*.12)for(const pixel of component.pixels)kept[pixel]=1;
      for(let i=0;i<kept.length;i++)if(!kept[i])data[i*4+3]=0;
      let footY=0,footLeft=info.width,footRight=0;
      for(let y=0;y<height;y++)for(let x=Math.floor(width*.23);x<width*.77;x++)if(data[(y*width+x)*4+3]>160)footY=y;
      for(let y=Math.max(0,footY-6);y<=footY;y++)for(let x=Math.floor(width*.23);x<width*.77;x++)if(data[(y*width+x)*4+3]>160){footLeft=Math.min(footLeft,x);footRight=Math.max(footRight,x);}
      const anchorX=footLeft<=footRight?(footLeft+footRight)/2:width/2;
      // Fixed 320px staging canvas; the body uses one scale in every frame.
      const base=320,offsetX=Math.round(base/2-anchorX),offsetY=282-footY;
      const extractX=Math.max(0,-offsetX),extractY=Math.max(0,-offsetY),outX=Math.max(0,offsetX),outY=Math.max(0,offsetY),visibleW=Math.min(width-extractX,base-outX),visibleH=Math.min(height-extractY,base-outY);
      const part=await sharp(data,{raw:info}).extract({left:extractX,top:extractY,width:visibleW,height:visibleH}).png().toBuffer();
      tile=sharp(await sharp({create:{width:base,height:base,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:part,left:outX,top:outY}]).png().toBuffer());
    }
    const png=await tile.resize(cellSize,cellSize,{kernel:'nearest',fit:'fill'}).png().toBuffer(),x=col*cellSize,y=row*cellSize;
    tiles.push({input:png,left:x,top:y});
    const id=kind==='cut'?`ultimate_cut_${row*columns+col}`:kind==='effects'?`ultimate_fx_${['slash','spin','finish','muzzle'][row]}_${col}`:`violet_ult_${kind}_${['down','right','up'][row]}_${col}`;
    const frame={rect:[x,y,cellSize,cellSize],size:body?(kind==='guns'?[68,68]:[76,76]):[cellSize,cellSize],pivot:body?(kind==='guns'?[34,59.925]:[38,66.975]):[cellSize/2,cellSize/2]};if(kind==='guns'&&row===1)frame.flipX=true;frames[id]=frame;
    if(body&&row===1)frames[`violet_ult_${kind}_left_${col}`]={...frame,flipX:kind!=='guns'};
  }
  const file=`violet-ultimate-${kind}-v2.png`;
  await sharp({create:{width:columns*cellSize,height:rows*cellSize,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(tiles).png().toFile(folder+file);
  fs.writeFileSync(folder+`violet-ultimate-${kind}-v2.json`,JSON.stringify({file,width:columns*cellSize,height:rows*cellSize,frames},null,2));console.log(kind,Object.keys(frames).length);
}
(async()=>{await grid('cut',6,4,512);await grid('blade',8,3,192,[0,286,534,768]);await grid('guns',8,3,192,[0,279,531,768]);await grid('effects',8,4,256);})();
