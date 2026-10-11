// Index fixed regions without changing the generated PNGs. Runtime consumes rectangles directly.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.ASH_SHARP_MODULE || 'C:/Users/chenqinghua/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../public/art');
async function inspect(file, columns, regions, groupNames, scaleByGroup) {
  const { data, info } = await sharp(path.join(root, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const frames = {};
  for (let row = 0; row < regions.length; row++) {
    const [top, bottom] = regions[row], cellWidth = info.width / columns;
    for (let col = 0; col < columns; col++) {
      let left = info.width, right = -1, minY = info.height, maxY = -1, pixels = 0;
      for (let y = top; y < bottom; y++) for (let x = Math.floor(col * cellWidth); x < Math.floor((col + 1) * cellWidth); x++) {
        if (data[(y * info.width + x) * 4 + 3] < 128) continue;
        left = Math.min(left, x); right = Math.max(right, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); pixels++;
      }
      if (pixels < 20) throw new Error(`Missing sprite ${file}:${row}:${col}`);
      const group = groupNames[row];
      const id = group === 'weapons' ? ['pistol','shotgun','blade','rifle'][col] : `${group}_${col}`;
      const s = scaleByGroup[row];
      const width = right - left + 1, height = maxY - minY + 1;
      let pivot;
      if (group === 'weapons') {
        const fractions = [[.27,.64],[.25,.65],[.23,.35],[.22,.6]][col];
        pivot = [Math.round(width * fractions[0] * s), Math.round(height * fractions[1] * s)];
      } else pivot = [Math.round((cellWidth * (col + .5) - left) * s), Math.round(height * s)];
      frames[id] = { rect: [left, minY, width, height], size: [Math.round(width * s), Math.round(height * s)], pivot };
    }
  }
  const corners = [data[3], data[(info.width - 1) * 4 + 3], data[(info.width * (info.height - 1)) * 4 + 3]];
  if (corners.some(v => v > 5)) throw new Error(`Non-transparent atlas corners: ${file}`);
  console.log(file, info.width, info.height, 'alpha corners', corners, 'frames', Object.keys(frames).length);
  return { file, width: info.width, height: info.height, frames };
}
(async () => {
  const hero = await inspect('hero-sheet.png', 6, [[0,256],[256,512],[512,768],[768,1024]], ['run_down','run_left','run_right','run_up'], [.215,.215,.215,.215]);
  const actions = await inspect('hero-actions.png', 4, [[0,270],[270,520],[520,800],[800,1050],[1050,1290],[1290,1536]], ['idle_down','idle_left','idle_right','idle_up','dash','death'], [.215,.215,.215,.215,.215,.215]);
  // Match every running frame to the standing height of the same direction.
  for(const [id,frame] of Object.entries(hero.frames)){
    const direction=id.split('_')[1],height=actions.frames[`idle_${direction}_0`].size[1];
    const ratio=height/frame.size[1];
    frame.size=[Math.round(frame.size[0]*ratio),height];
    frame.pivot=[Math.round(frame.pivot[0]*ratio),height];
  }
  const objects = await inspect('objects-sheet.png', 4, [[0,256],[256,512],[512,812],[812,1024]], ['chaser','shooter','sniper','weapons'], [.235,.22,.205,.14]);
  const previous=JSON.parse(fs.readFileSync(path.join(root,'atlas.json'),'utf8'));
  fs.writeFileSync(path.join(root, 'atlas.json'), JSON.stringify({ hero, actions, objects, weapons:previous.weapons, gunfu:previous.gunfu, gunfuMovement:previous.gunfuMovement,gunfuRoutine:previous.gunfuRoutine,characters:previous.characters,reactions:previous.reactions }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
