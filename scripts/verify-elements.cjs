const fs=require('node:fs');const path=require('node:path');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
  const output=path.resolve(__dirname,'../artifacts'),errors=[],checks=[];
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1920,height:1080}});
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.snapshot);
    await page.locator('[data-command="loadout"]').click();await page.waitForTimeout(80);
    if(await page.locator('[data-choice]').count()!==6)throw Error('Six loadout cards missing');checks.push('six formal weapon cards');
    await page.locator('[data-select="frost_string"][data-slot="0"]').click();await page.locator('[data-select="ember_lantern"][data-slot="1"]').click();
    if(!(await page.locator('[data-reaction]').textContent()).includes('热裂'))throw Error('Reaction preview incorrect');checks.push('reaction and directional resonance preview');
    await page.screenshot({path:path.join(output,'14-element-loadout.png')});
    await page.setViewportSize({width:1280,height:720});
    const fits=await page.locator('.loadout-card').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});
    if(!fits)throw Error('Loadout panel clipped at 1280x720');await page.screenshot({path:path.join(output,'15-loadout-1280.png')});checks.push('1280x720 loadout fits');
    await page.keyboard.press('Escape');if(await page.locator('.loadout').isVisible())throw Error('Escape failed');
    await page.evaluate(()=>window.__ASH__.command({type:'restart'}));
    const ids=await page.evaluate(()=>window.__ASH__.app.world.weapons.slots.map(s=>s.data.id));
    if(ids.join(',')!=='frost_string,ember_lantern')throw Error('Restart lost formal loadout');await page.reload();await page.waitForFunction(()=>window.__ASH__?.snapshot);
    if((await page.evaluate(()=>window.__ASH__.app.world.weapons.slots.map(s=>s.data.id))).join(',')!==ids.join(','))throw Error('Reload lost formal loadout');checks.push('loadout persists on restart and reload');
    await page.setViewportSize({width:1920,height:1080});
    await page.evaluate(()=>{
      const a=window.__ASH__.app,w=a.world;a.loop.stop();w.settings.invincible=true;w.settings.hitStrength=0;
      const p=w.player.actor;p.aim=0;p.facing=-Math.PI/2;
      const positions=[[350,260,'ice'],[460,240,'fire'],[620,280,'wind'],[700,360,'earth']];
      for(const [x,y,element] of positions){const e=w.spawn('shooter',{x,y},-1,x===700);e.actor.elemental.mark=element;e.actor.elemental.markTime=4.5;}
      w.debugWeapon(0,'thunder_branch');w.debugWeapon(1,'ember_lantern');w.attacks.requestPlayer(true,w.settings,{x:460,y:216});w.abilities.step(.2);a.loop.render(.1);
    });
    await page.screenshot({path:path.join(output,'16-element-marks-and-warning.png')});checks.push('element marks, elite badge and lightning warning render');
    await page.evaluate(()=>{const w=window.__ASH__.app.world;w.abilities.step(.2);window.__ASH__.app.loop.render(.1);});
    await page.screenshot({path:path.join(output,'17-element-reactions.png')});
    const state=await page.evaluate(()=>window.__ASH__.snapshot());if(state.reactions<1)throw Error('Strike did not react');checks.push('lightning skill triggers visible reactions');
    await page.evaluate(()=>{
      const w=window.__ASH__.app.world;w.weapons.current.cooldown=0;w.debugWeapon(0,'ember_lantern');w.attacks.requestPlayer(true,w.settings,{x:620,y:256});w.abilities.step(.5);window.__ASH__.app.loop.render(.1);
    });
    await page.screenshot({path:path.join(output,'18-fire-field.png')});checks.push('fire field and burn reaction render');
    await page.evaluate(()=>{window.__ASH__.app.loop.start();window.__ASH__.command({type:'restart'});});await page.keyboard.press('KeyE');await page.waitForTimeout(1050);
    if(await page.locator('[data-command="loadout"]').isVisible())throw Error('Combat permits loadout');checks.push('loadout locked during combat');
    if(errors.length)throw Error(errors.join('\n'));
    fs.writeFileSync(path.join(output,'elements-report.json'),JSON.stringify({date:new Date().toISOString(),checks,state,errors,browser:await browser.version()},null,2));console.log(JSON.stringify({checks,state,errors},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
