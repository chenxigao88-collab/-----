const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  const output = path.resolve(__dirname, '../artifacts');
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('.hud').waitFor();
  if (await page.evaluate(() => typeof window.__ASH__ !== 'undefined')) throw new Error('Development hook leaked into production');
  await page.locator('[data-command="loadout"]').click();
  if(await page.locator('[data-choice]').count()!==6)throw new Error('Production loadout missing weapons');
  await page.locator('[data-select="frost_string"][data-slot="0"]').click();
  await page.locator('[data-select="ember_lantern"][data-slot="1"]').click();
  if(!(await page.locator('[data-reaction]').textContent()).includes('热裂'))throw new Error('Production element preview failed');
  await page.locator('[data-select="ash_needle"][data-slot="0"]').click();
  await page.locator('[data-select="gravel_bell"][data-slot="1"]').click();
  await page.locator('[data-done]').click();
  await page.locator('.overlay').waitFor({state:'hidden'});
  await page.mouse.click(1300,636,{button:'right'});
  const routineStages=[];
  let followingPresses=0;
  for(let n=0;n<70;n++){await page.waitForTimeout(55);const hint=await page.locator('[data-ui="gunfu-hint"]').textContent();routineStages.push(hint);if(hint.startsWith('再按右键')&&followingPresses<4){await page.mouse.click(1300,636,{button:'right'});followingPresses++;}}
  if(followingPresses!==4)throw new Error('Manual combo must need five separate right clicks');
  for(const stage of ['拿枪下劈','上撩','横扫','正踢','后空翻','空中射击','落地旋身','落地开枪','收势'])if(!routineStages.includes(stage))throw new Error(`Production routine missing ${stage}: ${[...new Set(routineStages)].join(' / ')}`);
  if(!(await page.locator('.weapon.active .weapon-name').textContent()).includes('砾钟'))throw new Error('Production routine did not retain final gun');
  await page.keyboard.press('KeyQ');await page.waitForTimeout(170);
  await page.keyboard.down('KeyD');await page.waitForTimeout(100);await page.keyboard.up('KeyD');
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1100);
  if (!(await page.locator('[data-ui="wave"]').textContent()).includes('01 / 03')) throw new Error('Production encounter did not start');
  await page.mouse.move(600, 380);
  await page.mouse.down(); await page.waitForTimeout(350); await page.mouse.up();
  await page.screenshot({ path: path.join(output, '10-production.png') });
  await page.keyboard.press('KeyQ'); await page.waitForTimeout(150);
  if (!(await page.locator('.weapon.active .weapon-name').textContent()).includes('砾钟')) throw new Error('Production weapon switch failed');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '继续试炼' }).waitFor();
  await page.getByRole('button', { name: '继续试炼' }).click();
  await page.keyboard.press('F2');
  if (!(await page.locator('.debug').isVisible())) throw new Error('Production debug panel failed');
  if (errors.length) throw new Error(errors.join('\n'));
  const report = { checks: ['production assets', 'no development global', 'six-weapon loadout', 'element reaction preview', 'complete right-click routine in production', 'E starts encounter', 'shooting', 'Q switch', 'pause/resume UI', 'F2 panel'], routineStages:[...new Set(routineStages)],errors, browser: await browser.version(), date: new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'production-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.goto('http://127.0.0.1:5173/'); await page.waitForFunction(() => window.__ASH__?.snapshot);
  await page.evaluate(() => {
    const a = window.__ASH__.app; a.command({ type: 'setting', key: 'invincible', value: true }); a.loop.stop();
    const input = { move: { x: 0, y: 0 }, aim: { x: 700, y: 220 }, fire: false, skill: false, dash: false, swap: false, interact: true };
    a.world.step(1 / 120, input); input.interact = false;
    for (let n = 0; n < 2; n++) {
      for (let i = 0; i < 150; i++) a.world.step(1 / 120, input);
      for (const e of [...a.world.enemies]) a.world.damage.tryHit(a.world.attacks.snapshot(a.world.player.actor, 10000, 'browser-test', 'swift', false), e.actor, { x: 1, y: 0 });
      for (let i = 0; i < 300; i++) a.world.step(1 / 120, input);
    }
    for (let i = 0; i < 600; i++) {
      a.world.step(1 / 120, input);
      if (a.world.enemies.some(e => e.kind === 'sniper' && e.state === 'Attack' && e.elapsed > .6 && e.elapsed < .74)) break;
    }
    if (a.world.state !== 'playing' || a.world.room.wave !== 3) throw new Error('Third-wave capture fixture failed');
    a.loop.render(.1);
  });
  await page.screenshot({ path: path.join(output, '08-final-wave.png') });
  await page.evaluate(() => {
    const a = window.__ASH__.app; a.command({ type: 'setting', key: 'invincible', value: false });
    const source = a.world.enemies[0].actor;
    a.world.damage.tryHit(a.world.attacks.snapshot(source, 10000, 'browser-test', 'heavy', false), a.world.player.actor, { x: 1, y: 0 });
    a.world.step(1 / 120, { move: { x: 0, y: 0 }, aim: { x: 700, y: 220 }, fire: false, skill: false, dash: false, swap: false, interact: false });
    a.loop.start();
  });
  await page.getByRole('heading', { name: '试炼中断' }).waitFor();
  await page.screenshot({ path: path.join(output, '09-death.png') });
  await page.getByRole('button', { name: '再次试炼' }).click(); await page.waitForTimeout(100);
  const reset = await page.evaluate(() => window.__ASH__.snapshot());
  if (reset.state !== 'ready' || reset.hp !== 100 || reset.projectiles !== 0) throw new Error('Restart from death failed');
  fs.writeFileSync(path.join(output, 'death-report.json'), JSON.stringify({ checks: ['death animation/result', 'restart from death'], reset, errors, date: new Date().toISOString() }, null, 2));
  if (errors.length) throw new Error(errors.join('\n'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
