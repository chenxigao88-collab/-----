const fs=require('node:fs'),path=require('node:path');
const sharp=require(process.env.ASH_SHARP_MODULE||'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),atlas=JSON.parse(fs.readFileSync(path.join(root,'public/art/atlas.json'),'utf8'));
(async()=>{
 for(const [id,f] of Object.entries(atlas.hero.frames))if(f.size[1]!==atlas.actions.frames[`idle_${id.split('_')[1]}_0`].size[1])throw Error(`Run height differs: ${id}`);
 const cells=[],rows=['down','left','right','up'],poses=['idle','run0','run5','shoot','downslash','kick','recover'];
 for(let row=0;row<4;row++)for(let col=0;col<poses.length;col++){
  const dir=rows[row],pose=poses[col],id=pose==='idle'?`idle_${dir}_0`:pose.startsWith('run')?`run_${dir}_${pose.slice(3)}`:pose==='shoot'?`gunfu_draw_${dir}_2`:`routine_${pose==='recover'?'groundshot':pose}_${dir}_${pose==='downslash'?0:pose==='kick'?2:3}`;
  const sheet=[atlas.hero,atlas.actions,atlas.gunfu,...atlas.gunfuRoutine].find(a=>a.frames[id]),f=sheet.frames[id],r=f.rect;
  if(pose.startsWith('run')&&f.size[1]!==atlas.actions.frames[`idle_${dir}_0`].size[1])throw Error(`Run height differs: ${id}`);
  if(f.pivot[1]!==f.size[1])throw Error(`Ground anchor changed: ${id}`);
  const sprite=await sharp(path.join(root,'public/art',sheet.file)).extract({left:r[0],top:r[1],width:r[2],height:r[3]}).resize(f.size[0]*3,f.size[1]*3,{kernel:'nearest'}).png().toBuffer();
  const label=Buffer.from(`<svg width="220" height="280"><path d="M0 250H220" stroke="#536270"/><text x="10" y="22" font-size="14" fill="#ddd">${dir}: ${pose}</text></svg>`);
  const cell=await sharp({create:{width:220,height:280,channels:4,background:'#233040'}}).composite([{input:label,left:0,top:0},{input:sprite,left:110-f.pivot[0]*3,top:250-f.pivot[1]*3}]).png().toBuffer();
  cells.push({input:cell,left:col*220,top:row*280});
 }
 await sharp({create:{width:220*poses.length,height:1120,channels:4,background:'#233040'}}).composite(cells).png().toFile(path.join(root,'artifacts/28-hero-scale-comparison.png'));
 console.log('28 idle / run / shoot / combo comparisons; ground anchors preserved.');
})().catch(e=>{console.error(e);process.exit(1);});
