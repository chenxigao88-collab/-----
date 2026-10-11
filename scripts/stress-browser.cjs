const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.snapshot);
  await page.evaluate(()=>{
    const app=window.__ASH__.app;app.settings.invincible=true;app.settings.mute=true;app.settings.hitStrength=0;
    for(let i=0;i<20;i++)app.world.spawn(['chaser','shooter','sniper'][i%3],{x:130+(i%5)*165,y:135+Math.floor(i/5)*75});
    window.__STRESS__={samples:[],durations:[],start:performance.now()};
    const original=app.loop.render;app.loop.render=(dt)=>{const t=performance.now();original(dt);window.__STRESS__.durations.push(performance.now()-t);};
    window.__STRESS__.interval=setInterval(()=>{
      const world=app.world;
      while(world.projectiles.projectiles.length<150){const index=world.projectiles.nextId;const e=world.enemies[index%world.enemies.length];const c=world.attacks.snapshot(e.actor,1,'stress','heavy',false);world.projectiles.spawn(c,{x:100+index%740,y:115+index%300},(index%12)*Math.PI/6,{speed:100,range:600});}
      while(world.feel.particles.length<200)world.feel.burst({x:480,y:250},8,'#a6d9c5');
      window.__STRESS__.samples.push({...world.snapshot(),fps:app.loop.fps});
    },200);
  });
  await page.waitForTimeout(60000);
  const report=await page.evaluate(()=>{
    const app=window.__ASH__.app,s=window.__STRESS__;clearInterval(s.interval);
    const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.min(values.length-1,Math.floor(values.length*p))];
    return {durationSeconds:(performance.now()-s.start)/1000,viewport:'1920x1080',canvas:'960x540',dpr:devicePixelRatio,userAgent:navigator.userAgent,
      samples:s.samples.length,enemyCount:app.world.enemies.length,peakProjectiles:app.world.projectiles.peak,
      averageFPS:s.samples.reduce((a,b)=>a+b.fps,0)/s.samples.length,frameIntervalP95Ms:percentile(app.loop.frameSamples,.95),
      averageRenderMs:s.durations.reduce((a,b)=>a+b,0)/s.durations.length,renderP95Ms:percentile(s.durations,.95),snapshot:app.world.snapshot()};
  });
  const output=path.resolve(__dirname,'../artifacts');await page.screenshot({path:path.join(output,'07-stress.png')});
  report.browser=await browser.version();report.errors=errors;fs.writeFileSync(path.join(output,'stress-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(errors.length)throw new Error(errors.join('\n'));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
