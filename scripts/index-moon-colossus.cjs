const fs = require('node:fs');
const path = require('node:path');
const sharp = require(path.resolve(path.dirname(process.execPath), '../node_modules/sharp'));

const root = path.resolve(__dirname, '../public/art');
const file = 'violet-moon-colossus-v2.png';
const kinds = ['rise', 'split', 'burst', 'wings'];
const columns = 6;
const rows = 4;

(async () => {
  const { data, info } = await sharp(path.join(root, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 1536 || info.height !== 1024) {
    throw Error(`Unexpected atlas dimensions: ${info.width}x${info.height}; expected 1536x1024.`);
  }

  const alpha = (x, y) => data[(y * info.width + x) * info.channels + 3];
  const corners = [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]];
  if (corners.some(([x, y]) => alpha(x, y) > 10)) {
    throw Error(`Opaque atlas background: ${file}`);
  }
  let transparent = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] <= 10) transparent++;
  }
  if (transparent < info.width * info.height * 0.2) {
    throw Error(`Insufficient transparent background: ${file}`);
  }

  const frames = {};
  const cellWidth = info.width / columns;
  const cellHeight = info.height / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      let visible = 0;
      let unsafeBoundary = 0;
      for (let localY = 0; localY < cellHeight; localY++) {
        for (let localX = 0; localX < cellWidth; localX++) {
          const opacity = alpha(x + localX, y + localY);
          if (opacity > 100) visible++;
          // Allow faint glow, but reject opaque artwork clipped by a cell edge.
          const boundary = localX === 0 || localY === 0 || localX === cellWidth - 1 || localY === cellHeight - 1;
          if (boundary && opacity > 100) unsafeBoundary++;
        }
      }
      const id = `moon_colossus_${kinds[row]}_${col}`;
      if (visible < 40) throw Error(`Empty animation cell: ${id}`);
      // Tiny feather tips may touch the edge; reject clipping of a substantial silhouette.
      if (unsafeBoundary > (cellWidth + cellHeight) * 2 * 0.03) {
        throw Error(`Artwork touches animation cell boundary: ${id} (${unsafeBoundary} opaque edge pixels).`);
      }
      if (unsafeBoundary) console.warn(`Sparse feather tips at cell edge: ${id} (${unsafeBoundary} pixels).`);
      // All frames keep the authored grid and a shared scale/center.
      frames[id] = {
        rect: [x, y, cellWidth, cellHeight],
        size: [512, 512],
        pivot: [256, 256],
      };
    }
  }

  fs.writeFileSync(
    path.join(root, 'violet-moon-colossus-v2.json'),
    JSON.stringify({ file, width: info.width, height: info.height, frames }, null, 2),
  );
  console.log(`Indexed colossus: 24 transparent frames (${info.width}x${info.height}), within fixed grid bounds.`);
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
