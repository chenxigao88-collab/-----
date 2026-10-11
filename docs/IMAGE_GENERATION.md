# 图片生成记录

0.4 新增完整六式枪斗的128帧动作，实际提示词及4张最终原图见[GUNFU_ART_0.4.md](GUNFU_ART_0.4.md)。

0.3 新增 64 帧四方向枪斗动作。两张原图、实际提示词、失败草图说明与动画接入记录见 [GUNFU_ART.md](GUNFU_ART.md)。

这四份原图通过内置图片生成工具制作，以已批准的 `E:/work/ash-corridor-design/04-pixel-anime-v2.png` 和已生成主角为参考。它们是本项目的美术候选资产，未下载第三方游戏素材。以下保留实际英文提示词，便于重做与补帧。

运行时仅裁取可见区域并以最近邻采样绘制，不修改源图。生成器不保证逐帧像素与角色细节完全一致，后续精修应校正轮廓、脚底基线、像素颗粒与动画衔接。

## 主角奔跑

项目原图：`public/art/hero-sheet.png`。

```text
Create a production candidate sprite sheet for the silver-haired anime chibi heroine in the reference board. Reference is STYLE AND CHARACTER IDENTITY ONLY. Output a TRUE transparent RGBA background, no gray checkerboard painted into pixels. Pure precise pixel art, individual deliberate crisp pixel clusters and dark outlines, not smooth illustration.
Sheet is landscape 1536x1024, EXACTLY six equally spaced columns and four equally spaced rows (24 sprites total), each cell 256x256. Each sprite occupies central area about 130 wide x180 high, the same proportions and foot baseline at y=224 within every cell. Leave at least30px transparent margins. NO text, no borders, no labels, no shadows, no scene, no weapons, NO guns or swords in hands.
Rows strictly by facing: row1 facing DOWN/front, row2 facing LEFT, row3 facing RIGHT, row4 facing UP/rear. Body remains upright, showing top-down RPG perspective with head and front torso visible; no 360-degree body rotation, no large portrait.
Columns are six consecutive looping RUN CYCLE poses, alternating left/right feet and arm swing. Keep identical head size, face, costume, hair identity, rendering pixel size, body volume and baseline across ALL24 frames. A small practical natural run not high kicks. Character identity: young adult chibi heroine 2.5heads tall, short layered silver ash-gray bob with dark lower layer and copper hair clip, amber eyes, midnight navy short coat with copper details, cream high-neck inner garment and dark leggings, muted red short scarf, dark practical boots, turquoise wrist bracelet. Fully covered practical outfit, no sexualized details. The face must be expressive pixel anime eyes, not faceless. Arms in weapon-ready pose but EMPTY hands to allow separately drawn game weapons. Copy identity and overall design from heroine in reference board, not enemies. Left/right views consistent, back shows hair and scarf. Pixel palette about28 colors. Dark outline1source pixel equivalent, 3-4 shading tones per material. No smooth gradients, no bloom, no anti-aliased painted edges.
All24 poses complete, strict regular grid, clean transparent negative space between cells. Deliver ONLY the transparent sprite sheet.
```

## 房间背景

项目原图：`public/art/room.png`。

```text
Use case: stylized-concept. Create ONLY the environment background for the approved Ash Corridor pixel-art top-down game. The reference is a style/material guide. Remove ALL characters, enemies, weapons, projectiles, laser lines, HUD, icons, health bars, frames, title text and lower character lineup. This is a clean EMPTY room image for a playable game, not a mockup.
Wide 16:9 full frame image, preferably1920x1080. Orthographic top-down RPG perspective with floor tiles, wall fronts and visible wall caps; NOT isometric. A rectangular abandoned furnace sanctum. Main walkable floor spans x5% to95% and y13% to86% of image; that area is COMPLETELY EMPTY of obstacles. All thick walls, barrels, broken pottery, small copper pipes and red cloth banners are OUTSIDE that rectangle, in a thin outer border. Keep no vertical pillars on playable floor. Top wall has a shut original iron door at center. Bottom wall has a small sealed stair-like entry. Small warm ember sconces ONLY along perimeter, 3 on each side max. Floor is refined blue-gray 32pixel-equivalent square stone tiles with restrained bevel highlights, sparse cracks and little moss. A subtle faded broken circular copper seal about20% of image width in the center, low contrast. Source-style deliberate square pixel clusters, 3-5 clustered material tones, dark outlines, detailed textures matching reference. No smooth painting, no blurred bloom, no 3D, no vector polygons. Warm perimeter lamps contrast cool muted slate floor, but keep playable floor uniformly readable, no giant gradients or dramatic black shadow hiding objects. No text anywhere. No game entities or sprite sheet panels. Fill the whole picture with the environment. This is a single original art asset in the SAME style as reference.
```

## 敌人与武器

项目原图：`public/art/objects-sheet.png`。

```text
Production candidate TRANSPARENT sprite sheet for Ash Corridor, matching the original pixel-anime game reference. STRICT regular grid, landscape1536x1024, FOUR columns and FOUR rows, each cell384x256. Transparent RGBA negative space, no painted checkerboard, no labels, no borders, no backgrounds, no cast shadows. Pixel art only with dark crisp outline, deliberate square pixels and short material ramps, no smooth painting. Each image centered in its cell; for enemies foot baseline y=220. Leave generous transparent margins.
Row1 four successive WALK poses of the SAME little charcoal-stone claw beast, shown down/front-three-quarter, expressive narrow orange eyes, ash-gray spiky stone body, two forward hooked claws, small chunky legs. Approximately130x145 within each cell. ALL four frames identical design and volume, subtly alternating step poses, not four different creatures.
Row2 four successive WALK/IDLE poses of the SAME stout bronze furnace sentry, facing front, rounded copper kettle-like body, rectangular orange furnace grille in belly, tiny dark short legs, articulated small copper arms. NO held gun, no large spikes, approximately170x180. Keep identity consistent across four frames.
Row3 four successive WALK/IDLE poses of the SAME slender armored sniper construct, front three-quarter, dark bronze and blue-gray armor, small angular head with single coral glowing eye, short red hanging fabric, thin segmented legs. NO gun or long weapon attached to the body; game draws weapon independently. Approximately90x180, not enormous giant.
Row4 static weapon assets, default pointing RIGHT, individually centered, crisp transparent edges: column1 ivory-and-copper compact pistol with turquoise energy chamber and dark grip, about210x100; column2 brass flared-barrel shotgun with dark grip, about240x110; column3 ivory curved single-edge saber with bronze guard, short muted-red tie, about260x100; column4 very slim bronze sniper rifle with dark stock and long thin barrel, about270x80. Weapons complete, side-view pixel sprites for arbitrary rotation, NO hands or characters.
All assets consistent original handmade-looking pixel art. Use reference ONLY for creature identity and material palette, not copying scene. Precisely4x4 cells, 12 creature poses plus4 isolated weapons. No text, no UI, no decorative palette strips.
```

## 主角待机、冲刺与倒地

项目原图：`public/art/hero-actions.png`。

```text
Create a TRUE TRANSPARENT RGBA supplementary sprite sheet of the EXACT SAME silver-haired heroine in reference image1 (existing run sprite sheet), reference image2 is overall game style. Strict PORTRAIT1024x1536, 4 columns x6 rows, each256x256 cell, exactly24 separate sprites, no text, no borders, no scene, no ground shadows, no checkerboard drawn. Crisp hand-crafted-looking pixel art matching the run sheet: original chibi young adult heroine with short silver/ash bob, copper clip, amber eyes, navy cropped coat, high-neck cream clothes and dark leggings, small red scarf, dark boots, turquoise wrist ornament. Fully clothed practical outfit. EMPTY hands, no gun or sword.
Rows1 through4 are four-frame subtle looping IDLE cycles with BOTH feet firmly planted, relaxed knees and arms held ready, NO running or raising one leg: row1 faces DOWN front, row2 LEFT, row3 RIGHT, row4 UP back. All faces/hair/outfit identical across frames; only very small natural breathing and scarf/hair pixel changes. Approximately160wide x200high per cell, upright foot baseline y=230. Uniform head size and crisp dark outline.
Row5 exactly four DASH poses, one per direction columns1 DOWN,2 LEFT,3 RIGHT,4 UP: compact forward-leaning body with scarf trailing, feet pushing off, no trail graphics.
Row6 four consecutive DEATH/FALLING poses facing front: column1 stagger bent knees, column2 falling kneeling, column3 lying curled on floor, column4 same lying pose relaxed. Tasteful no blood or injury, no weapon. Keep centered around consistent bottom baseline and NEVER overlap cells.
This is a production sheet, not art-direction layout. Deliberate square pixel clusters, restricted material tones, no antialiased painting, no gradients, no lights behind characters. Preserve character identity exactly from provided run sprite sheet, not a new heroine. All24cells evenly aligned with clean transparent gaps.
```


## 0.2 三把元素武器

内置图片生成，透明背景；参照 objects-sheet.png 的旧武器像素材质。实际输出2172×724，项目原图 public/art/element-weapons.png，原图保留。使用 scripts/index-element-weapons.cjs 分别索引霜弦、烬灯、鸣枝，未修改源PNG。

生成器原输出：C:/Users/chenqinghua/.codex/generated_images/01a107b3-2842-7eb0-b6a8-b5f5ff250a3c/exec-2e4a6ac6-0e22-4445-b8c8-f3ee251ffd9b.png

```text
Use case: stylized-concept. Production TRANSPARENT pixel-art weapon atlas for Ash Corridor, matching the material detail, dark outline and crisp pixel clusters of the bottom row weapons in reference image. Reference is style only, NOT an edit of the existing sheet. Wide1536x1024, exactly THREE evenly spaced isolated weapons side by side across the central horizontal row, each in its own512px-wide area, no overlap. Every weapon is side-view facing RIGHT, complete, large enough to crop, no hands, no characters, no scene, no shadows, no labels or text. True RGBA transparency, not a painted checkerboard. LEFT weapon: FROST STRING, an ivory/blue-gray long rifle with bronze grip fittings, ice-blue crystal chamber and slim tapered crystalline muzzle, rear stock on left, barrel on right. MIDDLE weapon: EMBER LANTERN, compact bronze magical handheld lantern weapon, dark iron pistol-like grip left lower part and caged orange-red ember chamber, a short directional copper nozzle pointing right; no long chain or dangling detached parts, no weapon-size glowing aura outside object. RIGHT weapon: THUNDER BRANCH, side-view horizontal arcane wand, short dark blue-black grip at left, forked bronze/charcoal branch tip at right holding small cyan-violet electric gems, no external lightning effects outside object. Restricted pixel palette per weapon, sharp dark outlines, deliberate square pixel clusters, 3-4 material shades. Same handmade anime pixel-RPG style and similar apparent detailing across all three. Center each sprite near x256/768/1280,y512; about350wide by200high maximum, generous transparent gap between them. No smooth painting, no gradients, no bloom. Deliver only the three-weapon transparent atlas.
```
