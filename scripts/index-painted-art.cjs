const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||path.resolve(path.dirname(process.execPath),'../node_modules/sharp'));
const root=path.resolve(__dirname,'../public/art');
const families=['ash_needle','gravel_bell','hush_edge','frost_string','ember_lantern','thunder_branch'];
const weaponIds=[...families,...families.map(id=>id+'_mid'),...families.map(id=>id+'_late'),'wind_burst_mid','wind_burst_late','earth_crossbow_mid','earth_crossbow_late','wind_ring_mid','wind_ring_late'];
const effects=['needle','gravel','crystal','fireball','arc','wind','bolt','ring','wave','muzzle_gold','muzzle_ice','muzzle_arc','slash','slash_spin','explosion','spark'];
// Authored sheets have uneven empty gutters; these regions exclude neighboring art.
const combatRegions=[[0,30,416,215],[416,30,352,215],[768,30,400,215],[1168,20,368,225],[0,260,448,240],[448,260,320,240],[768,260,432,240],[1200,245,336,255],[0,505,476,207],[476,475,332,253],[808,488,382,240],[1190,485,346,247],[0,732,397,292],[397,732,413,292],[810,724,410,300],[1220,728,316,296]];
async function index(file,ids,columns,rows,crop){
  const {data,info}=await sharp(path.join(root,file)).ensureAlpha().raw().toBuffer({resolveWithObject:true}),frames={};
  if([0,info.width-1,info.width*(info.height-1),info.width*info.height-1].some(i=>data[i*4+3]>5))throw Error('Asset background is not transparent: '+file);
  for(let n=0;n<ids.length;n++){
    const col=n%columns,row=Math.floor(n/columns),x=Math.round(col*info.width/columns),y=Math.round(row*info.height/rows),endX=Math.round((col+1)*info.width/columns),endY=Math.round((row+1)*info.height/rows);
    let minX=endX,minY=endY,maxX=x-1,maxY=y-1,visible=0;
    for(let py=y;py<endY;py++)for(let px=x;px<endX;px++)if(data[(py*info.width+px)*4+3]>128){visible++;minX=Math.min(minX,px);minY=Math.min(minY,py);maxX=Math.max(maxX,px);maxY=Math.max(maxY,py);}
    if(visible<15)throw Error('Empty art cell: '+ids[n]);
    const rect=crop?[Math.max(x,minX-3),Math.max(y,minY-3),Math.min(endX,maxX+4)-Math.max(x,minX-3),Math.min(endY,maxY+4)-Math.max(y,minY-3)]:[x,y,endX-x,endY-y];
    const size=crop?heldSize(ids[n],rect):[96,96],pivot=crop?[Math.round(size[0]*(ids[n].includes('ring')?.5:.23)),Math.round(size[1]*.65)]:[48,48];
    frames[ids[n]]={rect,size,pivot};
  }
  return {file,width:info.width,height:info.height,frames};
}
function heldSize(key,rect){const id=key.replace(/^weapon_/,''),tier=id.endsWith('_late')?3:id.endsWith('_mid')?2:1;const base=id.startsWith('hush')?54:id.startsWith('frost')?53:id.startsWith('earth')?53:id.startsWith('thunder')?48:id.startsWith('wind_ring')?27:id.startsWith('wind_burst')?48:id.startsWith('gravel')?40:id.startsWith('ember')?34:35;const width=base+tier*6;return [width,Math.round(rect[3]/rect[2]*width)];}
async function isolatedWeapons(){
  const file='weapon-paint-v2.png',{data,info}=await sharp(path.join(root,file)).raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,seen=new Uint8Array(W*H),parts=[];
  for(let seed=0;seed<W*H;seed++){
    if(seen[seed]||data[seed*4+3]<160)continue;
    const pixels=[seed];seen[seed]=1;let minX=W,minY=H,maxX=0,maxY=0;
    for(let i=0;i<pixels.length;i++){
      const p=pixels[i],x=p%W,y=Math.floor(p/W);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
      for(const next of [p-1,p+1,p-W,p+W])if(next>=0&&next<W*H&&!seen[next]&&Math.abs(next%W-x)<=1&&data[next*4+3]>=160){seen[next]=1;pixels.push(next);}
    }
    if(pixels.length>1000)parts.push({pixels,minX,minY,maxX,maxY});
  }
  if(parts.length!==24)throw Error(`Expected 24 isolated weapon bodies, got ${parts.length}`);
  parts.sort((a,b)=>Math.floor((a.minY+60)/256)-Math.floor((b.minY+60)/256)||a.minX-b.minX);
  const frames={};
  parts.forEach((part,n)=>{
    const x=Math.max(0,part.minX-6),y=Math.max(0,part.minY-6),right=Math.min(W,part.maxX+7),bottom=Math.min(H,part.maxY+7),rect=[x,y,right-x,bottom-y],rows=new Map();
    for(const p of part.pixels){const px=p%W,py=Math.floor(p/W),span=rows.get(py)||[W,-1];span[0]=Math.min(span[0],px);span[1]=Math.max(span[1],px);rows.set(py,span);}
    // Copy original image scanlines around its connected body; do not paint pixels or change source alpha.
    const clipSpans=[];
    for(let py=y;py<bottom;py++){let left=W,end=-1;for(let near=py-6;near<=py+6;near++){const span=rows.get(near);if(span){left=Math.min(left,span[0]-6);end=Math.max(end,span[1]+6);}}if(end>=left)clipSpans.push([Math.max(x,left)-x,py-y,Math.min(right-1,end)-Math.max(x,left)+1]);}
    const id='weapon_'+weaponIds[n],size=heldSize(id,rect),pivot=[Math.round(size[0]*(id.includes('ring')?.5:.23)),Math.round(size[1]*.65)];
    frames[id]={rect,size,pivot,clipSpans};
  });
  return {file,width:W,height:H,frames};
}
async function isolatedReactions(file,ids,ends){
  const {data,info}=await sharp(path.join(root,file)).raw().toBuffer({resolveWithObject:true}),W=info.width,H=info.height,seen=new Uint8Array(W*H),groups=Array.from({length:40},()=>[]);
  for(let seed=0;seed<W*H;seed++){
    if(seen[seed]||data[seed*4+3]<160)continue;
    const pixels=[seed];seen[seed]=1;let sumX=0,sumY=0;
    for(let i=0;i<pixels.length;i++){const p=pixels[i],x=p%W,y=Math.floor(p/W);sumX+=x;sumY+=y;for(const next of [p-1,p+1,p-W,p+W])if(next>=0&&next<W*H&&!seen[next]&&Math.abs(next%W-x)<=1&&data[next*4+3]>=160){seen[next]=1;pixels.push(next);}}
    if(pixels.length<8)continue;
    const row=ends.findIndex(end=>sumY/pixels.length<end),col=Math.min(7,Math.floor(sumX/pixels.length/(W/8)));
    groups[row*8+col].push(...pixels);
  }
  const frames={};
  groups.forEach((pixels,n)=>{
    if(pixels.length<15)throw Error('Empty isolated reaction '+ids[Math.floor(n/8)]+' '+n%8);
    const row=Math.floor(n/8),col=n%8,x=Math.max(0,Math.round(col*W/8)-28),y=Math.max(0,(row?ends[row-1]:0)-12),right=Math.min(W,Math.round((col+1)*W/8)+28),bottom=Math.min(H,ends[row]+12),rows=new Map();
    for(const p of pixels){const px=p%W,py=Math.floor(p/W),span=rows.get(py)||[W,-1];span[0]=Math.min(span[0],px);span[1]=Math.max(span[1],px);rows.set(py,span);}
    const clipSpans=[];
    for(let py=y;py<bottom;py++){let left=W,end=-1;for(let near=py-3;near<=py+3;near++){const span=rows.get(near);if(span){left=Math.min(left,span[0]-3);end=Math.max(end,span[1]+3);}}if(end>=left){const start=Math.max(x,left),last=Math.min(right-1,end);if(last>=start)clipSpans.push([start-x,py-y,last-start+1]);}}
    frames[`fx_${ids[row]}_${col}`]={rect:[x,y,right-x,bottom-y],size:[96,96],pivot:[48,48],clipSpans};
  });
  return {file,width:W,height:H,frames};
}
(async()=>{
  fs.writeFileSync(path.join(root,'weapon-paint-v1.json'),JSON.stringify(await isolatedWeapons(),null,2));
  const combat=await index('combat-paint-v2.png',effects,4,4,false);
  effects.forEach((id,n)=>{combat.frames[id].rect=combatRegions[n];});
  fs.writeFileSync(path.join(root,'combat-paint-v1.json'),JSON.stringify(combat,null,2));
  const metadataPath=path.join(root,'atlas.json'),metadata=JSON.parse(fs.readFileSync(metadataPath));
  const sheets=[];
  for(const [file,ids,ends]of [['reaction-paint-a-v2.png',['burn','thermal','blast','vortex','conduct'],[235,430,617,799,992]],['reaction-paint-b-v2.png',['fracture','bind','exposure','shock','sand'],[210,411,590,772,992]]]){
    sheets.push(await isolatedReactions(file,ids,ends));
  }
  metadata.reactions=sheets;fs.writeFileSync(metadataPath,JSON.stringify(metadata,null,2));
  console.log('Indexed 24 painted weapons, 16 combat sprites and 80 reaction animation frames; original RGBA art preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
