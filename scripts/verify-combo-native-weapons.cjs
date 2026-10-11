const fs=require('node:fs');
const {chromium}=require('C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=(ok,message)=>{if(!ok)throw Error(message);};
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
  const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];await page.routeWebSocket('**',()=>{});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/');await page.waitForFunction(()=>window.__ASH__?.app?.renderer);
  const report={ultimate:[],gunfu:[],errors};
  for(const [primary,offhand,x] of [['ash_needle','gravel_bell',580],['gravel_bell','frost_string',580],['frost_string','ember_lantern',580],['ember_lantern','thunder_branch',580],['thunder_branch','ash_needle',580],['hush_edge','frost_string',700],['frost_string','hush_edge',700]]){
    const result=await page.evaluate(({primary,offhand,x})=>{
      const a=window.__ASH__.app;a.loop.stop();const Constructor=a.world.constructor;a.world.dispose();const w=a.world=new Constructor(1,a.settings,a.audio);
      w.selectCharacter('violet');w.settings.hitStrength=0;w.settings.shakeStrength=0;w.debugWeapon(0,primary);w.debugWeapon(1,offhand);w.state='playing';
      const e=w.spawn('shooter',{x,y:340},-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;const damage=[];
      w.events.on('damageApplied',hit=>{if(hit.attack.ultimateCast!==undefined)damage.push({phase:hit.attack.ultimatePhase,weapon:hit.attack.equippedWeaponId,secondary:hit.attack.secondary,amount:hit.amount});});
      w.ultimate.energy=100;w.ultimate.request({x:800,y:340});let emitted=[];const sampled=[];
      for(let i=0;i<570;i++){
        w.step(1/120,{move:{x:0,y:0},aim:{x:800,y:340},fire:false,skill:false,dash:false,swap:false,interact:false,ultimate:false});a.render(1/120);
        if(!emitted.length&&w.ultimate.elapsed>=2.15)emitted=w.projectiles.projectiles.map(p=>({weapon:p.context.equippedWeaponId,speed:p.speed,range:p.range,pierce:p.pierce,angle:p.angle}));
        if([2.2,2.78,3.28].some(t=>w.ultimate.elapsed>=t&&w.ultimate.elapsed<t+1/120))sampled.push({time:w.ultimate.elapsed,pose:w.player.actor.action?.kind,weapon:w.weapons.current.data.id,melee:w.melee.attacks.map(m=>({weapon:m.context.equippedWeaponId,range:m.hitbox.radius})),projectiles:w.projectiles.projectiles.length});
      }
      return {primary,offhand,x,emitted,sampled,damage,opening:w.ultimate.snapshot().openingDamage[e.actor.id],remaining:e.actor.health.hp,held:w.weapons.current.data.id};
    },{primary,offhand,x});
    const final=result.damage.find(hit=>hit.phase===5);assert(final.amount===Math.round(result.opening*.7),`${primary}: final damage ledger`);
    assert(result.held===offhand,`${primary}: offhand retained`);
    if(primary==='hush_edge'){
      assert(result.emitted.every(p=>p.weapon!=='hush_edge'),'wind sword emits no bullets');assert(!result.damage.some(h=>h.weapon==='hush_edge'),'distant sword misses');
      assert(result.sampled[0].pose==='greatspin'&&result.sampled[0].melee[0]?.range===72,'wind sword uses blade animation and range');
    }else{assert(result.emitted.length===(primary==='gravel_bell'?6:1),`${primary}: native projectile count`);assert(result.emitted.every(p=>p.weapon===primary),`${primary}: actual equipped weapon`);}
    if(offhand==='hush_edge')assert(!result.damage.some(h=>h.weapon==='hush_edge'),'distant offhand sword misses');
    report.ultimate.push(result);
  }
  for(const character of ['ember','violet']){
    const result=await page.evaluate(character=>{
      const a=window.__ASH__.app,Constructor=a.world.constructor;a.world.dispose();const w=a.world=new Constructor(1,a.settings,a.audio);w.selectCharacter(character);w.settings.hitStrength=0;w.settings.shakeStrength=0;w.player.stats.criticalChance=0;w.debugWeapon(0,'hush_edge');w.debugWeapon(1,'ember_lantern');w.state='playing';
      const e=w.spawn('shooter',{x:680,y:340},-1,true);e.actor.health.hp=e.actor.health.maxHP=5000;let swordContacts=0,nativeBullets=0;const poses=new Set();
      w.events.on('damageApplied',hit=>{if(hit.attack.gunfu==='finisher'&&hit.attack.weaponId==='hush_edge')swordContacts++;});
      w.gunfu.request({x:800,y:340});
      for(let n=0;n<400;n++){
        const s=w.gunfu.snapshot(),p=w.player.actor.action;
        if(p&&p.elapsed>=p.duration-.12&&!s.queued)w.gunfu.request({x:800,y:340});
        // Keep the target still to isolate weapon range from enemy decisions.
        w.weapons.step(1/120);w.gunfu.step(1/120,w.settings);w.projectiles.step(1/120,0);w.melee.step(1/120,0);
        w.elements.step(1/120,0);w.abilities.step(1/120);a.render(1/120);
        if(w.player.actor.action)poses.add(w.player.actor.action.kind);
        nativeBullets=Math.max(nativeBullets,w.projectiles.projectiles.filter(p=>p.context.weaponId==='ember_lantern').length);
      }
      return {character,swordContacts,nativeBullets,poses:[...poses],remaining:e.actor.health.hp,held:w.weapons.current.data.id};
    },character);
    assert(result.swordContacts===0,`${character}: distant melee combo misses`);assert(result.nativeBullets===1,`${character}: native fire projectile`);assert(result.remaining<5000,`${character}: offhand fire projectile hits`);report.gunfu.push(result);
  }
  const board=await page.evaluate(()=>{
    const a=window.__ASH__.app,actor=a.world.player.actor,c=document.createElement('canvas');c.width=1000;c.height=560;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#141724';ctx.fillRect(0,0,c.width,c.height);
    actor.character='violet';actor.pos={x:0,y:0};actor.recoil=0;a.world.weapons.active=0;
    for(const [row,angle]of [[0,0],[1,Math.PI]])for(const [col,id]of ['frost_string','ember_lantern','gravel_bell','hush_edge'].entries()){
      a.world.debugWeapon(0,id);actor.aim=angle;actor.action={kind:id==='hush_edge'?'greatspin':'kneelshot1',elapsed:.42,duration:.6,angle,gunfu:true,ultimateTime:2.27};
      ctx.save();ctx.translate(125+col*250,240+row*260);ctx.scale(2.5,2.5);a.renderer.sprites.player(ctx,actor,a.world.weapons.current.data);ctx.restore();
      ctx.fillStyle='#e6d5f4';ctx.font='16px sans-serif';ctx.fillText(a.world.weapons.current.data.displayName,22+col*250,30+row*260);
    }return c.toDataURL().split(',')[1];
  });fs.writeFileSync('artifacts/combo-native-poses.png',Buffer.from(board,'base64'));assert(errors.length===0,errors.join('\n'));
  report.date=new Date().toISOString();fs.writeFileSync('artifacts/combo-native-weapons-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ultimateLoadouts:report.ultimate.length,characters:report.gunfu.map(r=>r.character),errors:report.errors,date:report.date},null,2));
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
