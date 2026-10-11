const fs=require('node:fs');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const sharp=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__);
  await page.evaluate(()=>{const app=window.__ASH__.app,w=app.world;app.loop.stop();w.selectCharacter('violet');w.debugWeapon(0,'frost_string');w.debugWeapon(1,'ember_lantern');w.state='playing';w.adventure.started=true;w.settings.shakeStrength=0;w.settings.hitStrength=0;w.player.actor.pos={x:480,y:340};
    for(const x of [560,610,670])w.spawn('shooter',{x,y:330},-1,true);w.ultimate.energy=100;w.ultimate.request({x:650,y:330});
    const ctx=app.canvas.getContext('2d'),draw=ctx.drawImage.bind(ctx);window.v2fx=[];ctx.drawImage=(...args)=>{if(args[0]===app.art.ultimateEffects)window.v2fx.push(Math.floor(args[1]/256)+Math.floor(args[2]/256)*8);return draw(...args);};
  });
  const pages=[],shots=new Set();
  for(let frame=0;frame<64;frame++){
    const time=await page.evaluate(()=>{const app=window.__ASH__.app,w=app.world,input={move:{x:0,y:0},aim:{x:650,y:330},fire:false,skill:false,dash:false,swap:false,interact:false,ultimate:false};
      for(let n=0;n<5;n++){w.step(1/60,input);app.renderer.draw(w,input.aim,60);app.hud.render(w,1/60);}return w.ultimate.elapsed;});
    const png=await page.screenshot();pages.push(await sharp(png).ensureAlpha().raw().toBuffer());
    for(const [name,t]of [['slash',1.08],['spin',1.55],['smile',3.08],['finish',4.15]])if(time>=t&&!shots.has(name)){fs.writeFileSync('artifacts/ultimate-v2-'+name+'.png',png);shots.add(name);}
  }
  await sharp(Buffer.concat(pages),{raw:{width:960,height:540*pages.length,channels:4,pageHeight:540}}).gif({delay:83,loop:0,effort:3}).toFile('artifacts/紫鸢-紫夜终幕-v2.gif');
  const result=await page.evaluate(()=>({effects:[...new Set(window.v2fx)].sort((a,b)=>a-b),ultimate:window.__ASH__.app.world.ultimate.snapshot()}));if(result.effects.length!==32)throw Error('Not all effect frames displayed: '+JSON.stringify(result.effects));if(errors.length)throw Error(errors.join('; '));
  fs.writeFileSync('artifacts/ultimate-v2-preview-report.json',JSON.stringify({result,errors,frames:pages.length},null,2));console.log(JSON.stringify({result,errors,frames:pages.length}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
