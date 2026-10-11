const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=path.resolve(__dirname,'../artifacts'),assert=(ok,message)=>{if(!ok)throw Error(message);};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],checks=[];
  await page.routeWebSocket('**',()=>{});
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer&&!document.querySelector('.loading'));
  const assets=await page.evaluate(()=>{
   const a=window.__ASH__.app;a.loop.stop();a.input.clear();a.settings.invincible=true;a.settings.hitStrength=0;a.settings.mute=true;
   a.command({type:'restart'});a.loop.stop();a.input.clear();a.world.selectLoadout(0,'ash_needle');a.world.selectLoadout(1,'gravel_bell');
   a.world.player.actor.pos={x:480,y:340};a.input.aim={x:650,y:318};
   const sprites=a.renderer.sprites,original=sprites.drawFrame.bind(sprites);window.__ROUTINE_FRAMES__=[];
   sprites.drawFrame=(...args)=>{if(args[4])window.__ROUTINE_FRAMES__.push(args[1]);return original(...args);};
   window.__ROUTINE_STEP__=(seconds)=>{const w=a.world,dt=1/120;for(let n=0;n<Math.round(seconds/dt);n++)w.step(dt,{move:{x:0,y:0},aim:{x:650,y:318},fire:false,skill:a.input.take().skill,dash:false,swap:false,interact:false});a.renderer.draw(w,{x:650,y:318},60);a.hud.render(w,.1);return {snapshot:w.snapshot(),action:w.player.actor.action??null,frame:window.__ROUTINE_FRAMES__.at(-1),shots:w.attacks.shots};};
   return a.renderer.art.metadata.gunfuRoutine.map(atlas=>({file:atlas.file,frames:Object.keys(atlas.frames).length}));
  });
  assert(assets.length===4&&assets.every(a=>a.frames===32),'four full 32-frame atlases');checks.push('128 dedicated motion frames loaded');
  const rect=await page.locator('canvas').first().boundingBox();
  await page.mouse.move(rect.x+650*rect.width/960,rect.y+318*rect.height/540);
  await page.mouse.down({button:'right'});
  const held=await page.evaluate(()=>window.__ROUTINE_STEP__(.95));
  await page.mouse.up({button:'right'});
  assert(held.shots===0&&held.snapshot.gunfu.stage==='ready','holding right click cannot auto-chain');checks.push('held right click only executes one segment');
  await page.evaluate(()=>{const a=window.__ASH__.app;a.world.gunfu.clear();a.input.clear();});
  await page.mouse.click(rect.x+650*rect.width/960,rect.y+318*rect.height/540,{button:'right'});
  const start=await page.evaluate(()=>{const a=window.__ASH__.app;a.world.step(1/120,a.input.take());return window.__ROUTINE_STEP__(0);});
  assert(start.action?.kind==='downslash','a real right click starts the full chop');checks.push('real right click starts full routine');
  const records=[],images=[],gifFrames=[];
  for(let n=0;n<36;n++){
   if([3,7,11,23].includes(n))await page.mouse.click(rect.x+650*rect.width/960,rect.y+318*rect.height/540,{button:'right'});
   const record=await page.evaluate(seconds=>window.__ROUTINE_STEP__(seconds),n===0?0:1/15);
   const shot=await page.screenshot();records.push({time:n/15,frame:record.frame,stage:record.snapshot.gunfu.stage,action:record.action,shots:record.shots,weapon:record.snapshot.activeWeapon,pos:record.snapshot.pos});
   const crop=await sharp(shot).extract({left:780,top:475,width:360,height:240}).png().toBuffer();images.push(crop);gifFrames.push({input:crop,left:0,top:n*240});
   if(n===18)await page.screenshot({path:path.join(out,'27-gunfu-backflip.png')});
  }
  const phases=[...new Set(records.map(r=>r.stage))];
  assert(['downslash','uppercut','sweep','kick','backflip','airshot','landspin','groundshot','recover','ready'].every(p=>phases.includes(p)),'every phase rendered');
  assert(records.some(r=>r.frame==='routine_backflip_right_2'),'inverted backflip pose rendered');
  assert(records.some(r=>r.frame==='routine_kick_right_2'),'extended front kick rendered');
  assert(records.at(-1).shots===2&&records.at(-1).weapon==='gravel_bell','exactly two shots and keep final gun');
  const shotChanges=records.filter((r,i)=>i>0&&r.shots>records[i-1].shots);
  assert(shotChanges.length===2&&shotChanges[0].stage==='airshot'&&shotChanges[1].stage==='groundshot','shots occur only airborne then grounded');
  assert(records.find(r=>r.stage==='airshot').action.airborne===true&&records.find(r=>r.stage==='groundshot').action.airborne===false,'air then ground state');
  checks.push('all nine motion phases including recovery','true inverted flip and extended kick poses','exactly one air shot and one ground shot','final gun and recovery preserved');
  const labels=await page.evaluate(records=>records.map((r,i)=>{const c=document.createElement('canvas');c.width=360;c.height=30;const x=c.getContext('2d');x.fillStyle='#0d1820';x.fillRect(0,0,360,30);x.fillStyle='#b5e0d2';x.font='12px Consolas';x.fillText(`${String(i+1).padStart(2,'0')} ${r.stage} ${r.time.toFixed(2)}s / shots ${r.shots}`,8,20);return c.toDataURL().split(',')[1];}),records);
  const tiles=images.map((input,i)=>({input,left:(i%6)*360,top:Math.floor(i/6)*270}));
  tiles.push(...labels.map((label,i)=>({input:Buffer.from(label,'base64'),left:(i%6)*360,top:Math.floor(i/6)*270+240})));
  await sharp({create:{width:2160,height:1620,channels:4,background:'#0d1820'}}).composite(tiles).png().toFile(path.join(out,'26-gunfu-routine-frames.png'));
  for(let n=36;n<44;n++)gifFrames.push({input:images.at(-1),left:0,top:n*240});
  const stacked=await sharp({create:{width:360,height:240*44,channels:4,background:'#0d1820'}}).composite(gifFrames).raw().toBuffer();
  await sharp(stacked,{raw:{width:360,height:240*44,pageHeight:240,channels:4}}).gif({loop:0,delay:Array(44).fill(70),keepDuplicateFrames:true,dither:0}).toFile(path.join(out,'26-gunfu-routine.gif'));
  const animation=await sharp(path.join(out,'26-gunfu-routine.gif'),{animated:true}).metadata();assert(animation.pages===44&&animation.delay.every(ms=>ms===70),'preview has faithful motion timing');
  const directions=await page.evaluate(()=>{
   const a=window.__ASH__.app,result=[];for(const [name,aim] of [['down',{x:480,y:430}],['left',{x:240,y:340}],['right',{x:700,y:340}],['up',{x:480,y:130}]]){
    a.world.gunfu.clear();a.world.weapons.active=0;a.world.weapons.switchLock=0;a.world.player.actor.pos={x:480,y:340};a.world.gunfu.request(aim);
    const seen=new Set();for(let n=0;n<285;n++){const s=a.world.gunfu.snapshot(),pose=a.world.player.actor.action;if([0,1,2,5].includes(s.phase)&&pose&&pose.elapsed>=pose.duration-.12&&!s.queued)a.world.gunfu.request(aim);a.world.gunfu.step(1/120,a.settings,aim);a.renderer.draw(a.world,aim,60);seen.add(window.__ROUTINE_FRAMES__.at(-1));}
    result.push({name,frames:[...seen].filter(id=>id.startsWith('routine_'))});
   }return result;
  });
  assert(directions.every(d=>d.frames.includes(`routine_backflip_${d.name}_2`)&&d.frames.includes(`routine_kick_${d.name}_2`)),'all directions have actual kick and flip');checks.push('four-direction dedicated routine frames');
  const interrupt=await page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;w.gunfu.clear();w.weapons.switchLock=0;w.gunfu.request({x:650,y:318});w.gunfu.step(.5,a.settings);const shots=w.attacks.shots;const input={move:{x:1,y:0},aim:{x:650,y:318},fire:false,skill:false,dash:true,swap:false,interact:false};w.step(1/120,input);for(let n=0;n<300;n++)w.step(1/120,{...input,dash:false,move:{x:0,y:0}});return {before:shots,after:w.attacks.shots,busy:w.gunfu.busy};});
  assert(!interrupt.busy&&interrupt.before===interrupt.after,'dash cancels without delayed fire');checks.push('real short dash cancels with no delayed fire');
  assert(errors.length===0,errors.join('\n'));const report={checks,assets,phases,shotChanges,records,directions,interrupt,errors,browser:browser.version(),date:new Date().toISOString()};fs.writeFileSync(path.join(out,'gunfu-routine-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
