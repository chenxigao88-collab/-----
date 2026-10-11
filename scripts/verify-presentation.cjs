const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [], directions = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/'); await page.waitForFunction(() => window.__ASH__?.snapshot);
  await page.evaluate(() => {
    const sprites = window.__ASH__.app.renderer.sprites, original = sprites.drawFrame.bind(sprites);
    window.__POSES__ = [];
    sprites.drawFrame = (...args) => {
      if (args[4] && (args[1].startsWith('idle_') || args[1].startsWith('run_'))) {
        window.__POSES__.push({ id: args[1], x: args[2], y: args[3], breath: args[6] || 0 });
        if (window.__POSES__.length > 300) window.__POSES__.shift();
      }
      return original(...args);
    };
  });
  const output = path.resolve(__dirname, '../artifacts');
  await page.waitForTimeout(1900);
  const idle = await page.evaluate(() => {
    const poses = window.__POSES__;
    return { ids: [...new Set(poses.map(p=>p.id))], x: [...new Set(poses.map(p=>p.x))], y: [...new Set(poses.map(p=>p.y))], breath: [...new Set(poses.map(p=>p.breath))] };
  });
  if (idle.ids.length !== 1 || idle.x.length !== 1 || idle.y.length !== 1 || !idle.breath.includes(-1) || !idle.breath.includes(1)) throw new Error('Idle pose drifts or does not breathe vertically');
  await page.screenshot({ path: path.join(output, '11-standing-fix.png') });
  for (const [key, facing, aim] of [['KeyW','up',[960,1040]], ['KeyS','down',[960,180]], ['KeyD','right',[10,680]], ['KeyA','left',[1900,680]]]) {
    await page.mouse.move(...aim); await page.keyboard.down(key); await page.waitForTimeout(180);
    const result = await page.evaluate(() => ({ ...window.__POSES__.at(-1), aim: window.__ASH__.app.world.player.actor.aim, facing: window.__ASH__.app.world.player.actor.facing }));
    if (!result.id.startsWith(`run_${facing}_`)) throw new Error(`Wrong movement facing: ${JSON.stringify(result)}`);
    if (Math.cos(result.aim-result.facing) > -.7) throw new Error('Body direction is not independent from opposite mouse aiming');
    directions.push(result);
    if (facing === 'left') await page.screenshot({ path: path.join(output, '12-direction-fix.png') });
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(50); await page.mouse.move(960,0); await page.waitForTimeout(100);
  const stopped = await page.evaluate(() => window.__POSES__.at(-1));
  if (stopped.id !== 'idle_left_0') throw new Error('Mouse changed stationary body facing');
  const bodies = await page.evaluate(() => {
    const a = window.__ASH__.app; a.loop.stop(); a.command({type:'restart'}); a.settings.collisions=true;
    ['chaser','shooter','sniper'].forEach((kind,i)=>a.world.spawn(kind,{x:240+i*240,y:280})); a.loop.render(.1);
    return a.world.enemies.map(e=>({kind:e.kind,foot:e.actor.pos,body:e.actor.hurtbox.capsule(e.actor.pos),footRadius:e.actor.hurtbox.radius}));
  });
  await page.screenshot({ path: path.join(output, '13-monster-hurtboxes.png') });
  if (errors.length) throw new Error(errors.join('\n'));
  const report = { idle, directions, stopped, bodies, errors, date: new Date().toISOString() };
  fs.writeFileSync(path.join(output,'presentation-report.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
