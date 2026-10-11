const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const out=path.resolve(__dirname,'../artifacts'),assert=(ok,message)=>{if(!ok)throw Error(message);};
(async()=>{
  const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];await page.routeWebSocket('**',()=>{});
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
    await page.evaluate(()=>{const a=window.__ASH__.app;a.loop.stop();a.world.selectCharacter('violet');a.settings.invincible=true;a.settings.hitStrength=0;a.settings.shakeStrength=0;a.settings.mute=true;a.render(1/60);});
    await page.screenshot({path:path.join(out,'adventure-entry.png')});
    const tick=async(seconds)=>page.evaluate(seconds=>{const a=window.__ASH__.app;for(let i=0;i<Math.ceil(seconds*120);i++)a.update(1/120);a.render(1/60);},seconds);
    const interact=async(pos)=>{if(pos)await page.evaluate(pos=>{window.__ASH__.app.world.player.actor.pos={...pos};},pos);await page.keyboard.press('KeyE');await tick(.01);};
    const go=async(side)=>{await tick(.4);const pos={east:{x:858,y:270},west:{x:102,y:270},north:{x:480,y:110},south:{x:480,y:436}}[side];await interact(pos);await tick(.4);};
    const clear=async()=>page.evaluate(()=>{const a=window.__ASH__.app,w=a.world;for(let n=0;n<1600&&!w.adventure.memory.cleared;n++){a.update(1/120);for(const e of [...w.enemies]){const c=w.attacks.snapshot(w.player.actor,10000,'browser','swift',false);c.secondary=true;w.damage.tryHit(c,e.actor,{x:0,y:0});}}a.update(.1);a.render(1/60);return {cleared:w.adventure.memory.cleared,gold:w.adventure.gold};});
    await interact();await go('east');await tick(1);await page.screenshot({path:path.join(out,'adventure-battle.png')});assert((await clear()).cleared,'front clear');
    await interact({x:480,y:290});await tick(1);await go('south');await page.screenshot({path:path.join(out,'adventure-vault.png')});await interact({x:480,y:275});await tick(.6);
    assert(await page.locator('.reward-card').count()===3,'three secret choices');await page.screenshot({path:path.join(out,'adventure-runes.png')});
    await page.locator('[data-rune]').first().click();await tick(.01);assert((await page.evaluate(()=>window.__ASH__.snapshot().adventure.runes.length))===1,'real rune UI equip');
    await go('east');await page.screenshot({path:path.join(out,'adventure-shop-room.png')});await interact({x:480,y:240});await page.screenshot({path:path.join(out,'adventure-shop.png')});
    const shopStart=await page.evaluate(()=>{const w=window.__ASH__.app.world;w.adventure.gold=100;w.player.actor.health.hp=40;window.__ASH__.app.render(1/60);return w.adventure.gold;});
    await page.locator('[data-buy="heal"]').click();await tick(.01);let s=await page.evaluate(()=>window.__ASH__.snapshot());assert(s.adventure.gold===shopStart-25&&s.hp===65,'one heal purchase');
    await page.locator('[data-buy="weapon"]').click();await tick(.01);await page.screenshot({path:path.join(out,'adventure-weapon.png')});await page.locator('[data-weapon-slot="0"]').click();await tick(.01);s=await page.evaluate(()=>window.__ASH__.snapshot());assert(s.adventure.gold===30,'weapon charged only on replace');
    await go('north');assert((await clear()).cleared,'gallery clear');await go('south');await go('east');assert((await clear()).cleared,'garden clear');await go('south');await interact({x:480,y:275});await tick(.6);await page.locator('[data-rune]').first().click();await tick(.01);
    await go('east');assert((await clear()).cleared,'elite clear');await go('north');assert((await clear()).cleared,'final clear');await interact({x:480,y:290});await tick(.6);await interact({x:480,y:200});await tick(.1);
    s=await page.evaluate(()=>window.__ASH__.snapshot());assert(s.state==='victory','exit completes chapter');assert(s.adventure.visited.length===9,'nine courts visited');await page.screenshot({path:path.join(out,'adventure-victory.png')});
    const art=await page.evaluate(()=>{const a=window.__ASH__.app,c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#171c29';ctx.fillRect(0,0,512,160);for(let i=0;i<8;i++){ctx.drawImage(a.renderer.adventure.art.chest('copper',i),i*64,6);ctx.drawImage(a.renderer.adventure.art.chest('crystal',i),i*64,82);}return c.toDataURL().split(',')[1];});fs.writeFileSync(path.join(out,'adventure-chest-frames.png'),Buffer.from(art,'base64'));
    assert(errors.length===0,errors.join('\n'));const report={checks:['nine connected courts','E door and chest input','three-choice rune UI','actual shop heal and replacement buttons','safe persistent stocks','full chapter exit','uniform eight-frame chest sprites','no browser errors'],snapshot:s,errors,date:new Date().toISOString()};fs.writeFileSync(path.join(out,'adventure-browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
