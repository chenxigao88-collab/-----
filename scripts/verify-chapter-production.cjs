const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(__dirname,'../artifacts'),assert=(ok,message)=>{if(!ok)throw Error(message);};
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[],assets=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);if(r.url().includes('adventure-atlas-v1'))assets.push([r.url(),r.status()]);});
  await page.goto('http://127.0.0.1:4173/');await page.locator('.hud').waitFor();assert(await page.evaluate(()=>!window.__ASH__),'production has no development hook');
  await page.locator('[data-command="loadout"]').click();await page.locator('[data-character="violet"]').click();await page.locator('[data-select="frost_string"][data-slot="0"]').click();await page.locator('[data-select="ember_lantern"][data-slot="1"]').click();await page.locator('[data-done]').click();
  await page.screenshot({path:path.join(out,'chapter-production.png')});assert(await page.locator('.brand,.build-label,.hint-small,.pair-hint,.gunfu-cue').count()===0,'combat clutter removed');
  await page.keyboard.press('F2');await page.locator('[data-setting="invincible"]').check();await page.locator('[data-setting="damageMultiplier"]').fill('5');await page.locator('[data-setting="damageMultiplier"]').dispatchEvent('input');await page.keyboard.press('F2');
  await page.keyboard.press('KeyE');await page.locator('[data-story-skip]').waitFor();await page.locator('[data-story-skip]').click();await page.keyboard.down('KeyW');await page.waitForTimeout(315);await page.keyboard.up('KeyW');await page.keyboard.down('KeyD');await page.waitForTimeout(1700);await page.keyboard.up('KeyD');await page.keyboard.press('KeyE');
  await page.screenshot({path:path.join(out,'chapter-production-door.png')});
  await page.waitForFunction(()=>document.querySelector('[data-ui="room"]')?.textContent.includes('熔炉前厅'));
  let routines=0;for(let n=0;n<10;n++){
    for(const wait of [330,310,370,350,270,680]){await page.mouse.click(600,285,{button:'right'});await page.waitForTimeout(wait);}routines++;
    if((await page.locator('[data-ui="room"]').textContent()).includes('可通行'))break;
  }
  assert((await page.locator('[data-ui="room"]').textContent()).includes('可通行'),'actual manual combos clear production court');
  await page.locator('[data-upgrade]').first().click();await page.waitForTimeout(100);
  await page.waitForFunction(()=>!document.querySelector('[data-ui="inventory"]')?.textContent.includes('20金币'),{},{timeout:4000});
  const inventory=await page.locator('[data-ui="inventory"]').textContent();assert(!inventory.includes('20金币'),'enemy gold collected');
  await page.screenshot({path:path.join(out,'chapter-production-clear.png')});
  await page.keyboard.press('Escape');await page.locator('.overlay').waitFor({state:'visible'});assert(await page.locator('.overlay').isVisible(),'pause reachable');await page.locator('[data-command="restart"]').click();await page.locator('[data-command="loadout"]').waitFor();assert((await page.locator('[data-ui="inventory"]').textContent()).includes('20金币'),'restart resets run gold');
  await page.locator('[data-command="loadout"]').click();assert(await page.locator('[data-character="violet"]').getAttribute('aria-pressed')==='true','character persists on restart');await page.locator('[data-done]').click();
  await page.setViewportSize({width:640,height:360});await page.waitForTimeout(100);const bounds=await page.locator('.stage').boundingBox();assert(bounds.width<=640&&bounds.height<=360,'small viewport scales entire pixel GUI');
  assert(assets.length===2&&assets.every(([,status])=>status===200),'atlas image and metadata in production');assert(errors.length===0,errors.join('\n'));
  const report={mode:'Production keyboard/manual-combo UI fixture with debug invincibility and damage x5; not a balance playtest',checks:['production without developer hooks','persisted character and loadout','actual keyboard room entry','manual six-segment combos and clear','gold pickup','clutter removed','run restart','small viewport','generated atlas loaded'],routines,inventory,assets,errors,date:new Date().toISOString()};fs.writeFileSync(path.join(out,'chapter-production-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
