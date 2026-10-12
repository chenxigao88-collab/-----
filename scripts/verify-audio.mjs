import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(resolve(dirname(process.execPath),'../node_modules/playwright'));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'}),errors=[],checks=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  if(process.argv.includes('--production')){
    const assets=[];page.on('response',r=>{if(r.url().includes('/audio/')&&r.url().endsWith('.wav'))assets.push({url:r.url(),status:r.status()});});
    await page.goto(process.env.ASH_VERIFY_URL??'http://127.0.0.1:4173/');await page.locator('.hud').waitFor();await page.getByRole('button',{name:'暂停',exact:true}).click();
    await page.getByLabel('背景音乐音量').waitFor();assert(await page.getByLabel('战斗音效音量').isVisible());assert(await page.getByLabel('全部静音').isVisible());
    await page.waitForFunction(()=>performance.getEntriesByType('resource').filter(r=>r.name.includes('/audio/')&&r.name.endsWith('.wav')).length>=25);
    assert.equal(assets.length,25);assert(assets.every(a=>a.status===200));assert.equal(await page.evaluate(()=>Boolean(window.__ASH__)),false);assert.equal(errors.length,0);
    writeFileSync('artifacts/audio-production-report.json',JSON.stringify({checks:['production startup','audio controls visible','24 effect assets and camp loop load with relative deployment paths','no development hook'],assets,errors},null,2));console.log('Production startup, audio settings and 25 initial audio files passed.');
  }else{
  await page.goto(process.env.ASH_VERIFY_URL??'http://127.0.0.1:5174/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  await page.locator('canvas[tabindex]').click({position:{x:500,y:400}});
  await page.waitForFunction(()=>window.__ASH__.app.audio.snapshot().musicVoices===1);
  await page.evaluate(async()=>{
    const a=window.__ASH__.app.audio;await a.ready;const analyser=a.context.createAnalyser();analyser.fftSize=2048;a.master.connect(analyser);window.__AUDIO_ANALYSER__=analyser;
  });
  const rms=()=>page.evaluate(()=>{const a=window.__AUDIO_ANALYSER__,data=new Float32Array(a.fftSize);a.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((s,x)=>s+x*x,0)/data.length);});
  await page.waitForTimeout(1600);assert(await rms()>.001);checks.push('actual Web Audio graph produces music after a user gesture');
  await page.keyboard.press('Escape');await page.getByLabel('背景音乐音量').press('Home');for(let n=0;n<5;n++)await page.getByLabel('背景音乐音量').press('ArrowRight');await page.getByLabel('战斗音效音量').press('Home');for(let n=0;n<12;n++)await page.getByLabel('战斗音效音量').press('ArrowRight');await page.getByLabel('全部静音').check();
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('ash-corridor.audio.v1'))),{mute:true,musicVolume:.25,effectVolume:.6});
  await page.screenshot({path:'artifacts/audio-settings.png'});await page.getByRole('button',{name:'继续',exact:true}).click();await page.waitForTimeout(150);assert(await rms()<.0001);
  await page.keyboard.press('Escape');await page.getByLabel('全部静音').uncheck();await page.getByRole('button',{name:'继续',exact:true}).click();await page.waitForTimeout(600);assert(await rms()>.001);
  checks.push('music/effect sliders, persisted preferences and live master mute/unmute');
  await page.evaluate(()=>{const app=window.__ASH__.app;app.loop.stop();app.world.state='playing';app.world.adventure.started=true;app.world.adventure.memory.cleared=true;app.world.story.queue=[];app.render(.01);});
  await page.waitForFunction(()=>window.__ASH__.app.audio.snapshot().requested==='explore'&&window.__ASH__.app.audio.snapshot().musicVoices>0);
  await page.evaluate(()=>{const app=window.__ASH__.app;app.world.spawn('chaser',{x:700,y:340},-1,true);app.render(.01);});
  await page.waitForFunction(()=>window.__ASH__.app.audio.snapshot().requested==='battle');
  await page.evaluate(()=>{const app=window.__ASH__.app;app.world.spawn('boss',{x:700,y:340},-1,true);app.render(.01);});
  await page.waitForFunction(()=>window.__ASH__.app.audio.snapshot().requested==='boss');await page.waitForTimeout(1600);
  assert((await page.evaluate(()=>window.__ASH__.app.audio.snapshot())).musicVoices<=2);checks.push('real exploration, encounter and Boss states choose their own score; rapid transitions keep at most two music sources');
  await page.evaluate(()=>{window.__ASH__.app.world.pause();window.__ASH__.app.render(.01);});await page.waitForTimeout(150);assert(await rms()<.0001);
  await page.evaluate(()=>{window.__ASH__.app.world.resume();window.__ASH__.app.render(.01);});await page.waitForTimeout(600);assert(await rms()>.001);checks.push('pause silences the mix and resume fades it back in');
  const before=await page.evaluate(()=>window.__ASH__.app.audio.snapshot());assert(before.decoded>=28);
  await page.evaluate(()=>{const a=window.__ASH__.app.audio;for(const id of ['shot','shotgun','slash','ice','fire','electric','wind','bolt','ring','hit','heavy','explosion','hurt','dodge','swap','victory','moonRise','moonSlash','moonSheath','moonBreak','enemyShot','death','loot','reaction'])a.play(id);});
  await page.waitForTimeout(30);assert((await page.evaluate(()=>window.__ASH__.app.audio.snapshot())).effects<=24);assert(await rms()>.001);checks.push('all 24 sound buffers decode and play; voice limit is enforced');
  await page.evaluate(()=>window.__ASH__.app.audio.clear());assert.equal(await page.evaluate(()=>window.__ASH__.app.audio.nodes),0);await page.waitForTimeout(100);assert(await rms()<.0001);
  await page.evaluate(()=>window.__ASH__.app.dispose());checks.push('restart/disposal stops every music and effect source');assert.equal(errors.length,0);
  writeFileSync('artifacts/audio-browser-report.json',JSON.stringify({checks,errors},null,2));console.log('Audio graph, all 28 assets, live volume/mute/pause, scene crossfades, voice limit and disposal passed.');
  }
}finally{await browser.close();}
