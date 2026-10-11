const fs=require('node:fs');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];await page.routeWebSocket('**',()=>{});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  const report={casts:[],errors};
  for(const preset of ['baseline','growth','blade','critical']){
    const result=await page.evaluate(preset=>{
      const app=window.__ASH__.app;app.loop.stop();const Constructor=app.world.constructor;app.world.dispose();const w=app.world=new Constructor(1,app.settings,app.audio);
      w.selectCharacter('violet');w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.stats.criticalChance=0;w.debugWeapon(0,'ember_lantern');w.debugWeapon(1,'frost_string');w.state='playing';
      if(preset!=='baseline'){w.progression.level=12;Object.assign(w.progression.ranks,{damage:4,gunfu:3,element:3,blade:preset==='blade'?3:0});w.progression.apply();}
      if(preset==='critical'){w.player.stats.criticalChance=1;w.player.stats.criticalDamage=2;}
      const e=w.spawn('shooter',{x:570,y:340},-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;
      const damage=[];w.events.on('damageApplied',hit=>{if(hit.attack.ultimateCast!==undefined)damage.push({phase:hit.attack.ultimatePhase,weapon:hit.attack.equippedWeaponId,secondary:hit.attack.secondary,critical:hit.attack.critical,amount:hit.amount});});
      w.ultimate.energy=100;w.ultimate.request({x:800,y:340});
      for(let n=0;n<560;n++){w.step(1/120,{move:{x:0,y:0},aim:{x:800,y:340},fire:false,skill:false,dash:false,swap:false,interact:false,ultimate:false});app.render(1/120);}
      return {preset,damage,opening:w.ultimate.snapshot().openingDamage[e.actor.id],remaining:e.actor.health.hp};
    },preset);
    const final=result.damage.find(hit=>hit.phase===5);assert(final.amount===Math.round(result.opening*.7),`${preset}: exact final ratio`);
    report.casts.push(result);
  }
  const [base,growth,blade,critical]=report.casts;
  const shot=r=>r.damage.find(hit=>hit.phase===2&&!hit.secondary).amount,reaction=r=>r.damage.filter(hit=>hit.secondary).reduce((a,b)=>a+b.amount,0);
  assert(shot(base)===10&&shot(growth)===18,'actual gun growth 10 to 18');assert(reaction(base)===20&&reaction(growth)===47,'actual thermal growth 20 to 47');
  assert(blade.damage[0].amount===33&&blade.damage[1].amount===22,'blade opening grows to 33 / 22');assert(shot(critical)===36,'critical weapon growth');
  await page.evaluate(()=>{
    const app=window.__ASH__.app,Constructor=app.world.constructor;app.world.dispose();const w=app.world=new Constructor(1,app.settings,app.audio,true);w.selectCharacter('violet');w.state='playing';w.adventure.started=true;w.progression.gain(40);w.random.next=()=>.43;w.progression.prompt();app.render(0);
  });
  await page.locator('[data-upgrade="blade"]').waitFor();await page.screenshot({path:'artifacts/violet-blade-upgrade.png'});
  const description=await page.locator('.reward-card').filter({has:page.locator('[data-upgrade="blade"]')}).textContent();assert(description.includes('15%'),'blade upgrade displayed');
  await page.locator('[data-upgrade="blade"]').click();report.choice=await page.evaluate(()=>({rank:window.__ASH__.app.world.progression.ranks.blade,pending:window.__ASH__.app.world.progression.pending,panel:window.__ASH__.app.world.adventure.panel?.kind??null}));
  assert(report.choice.rank===1&&report.choice.pending===0&&report.choice.panel===null,'actual upgrade button applies choice');
  await page.keyboard.press('Escape');await page.evaluate(()=>window.__ASH__.app.render(0));
  const growthText=await page.locator('.pause-growth').textContent();assert(growthText.includes('巨刃 +15%')&&growthText.includes('元素亲和')&&growthText.includes('枪斗／大招'),'pause growth reflects new bonus categories');
  report.pause=growthText;assert(errors.length===0,errors.join('\n'));
  report.date=new Date().toISOString();fs.writeFileSync('artifacts/ultimate-growth-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({shots:report.casts.map(r=>[r.preset,shot(r)]),reactions:report.casts.map(r=>[r.preset,reaction(r)]),bladeOpening:blade.damage.slice(0,2).map(r=>r.amount),choice:report.choice,errors},null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
