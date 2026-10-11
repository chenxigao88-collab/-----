# 第一章美术资产（0.7）

2026-10-06，使用内置 imagegen 工具生成。所有新素材为生成模式，怪物与 Boss 使用已有人物／怪物素材作为风格参考，不复制其角色身份。怪物、Boss、机关图集均请求透明背景，场景使用不透明背景。

最终游戏资产是 public/art/chapter-*-v1.png / .json，以及 chapter-outer/forge/inner-room-v1.png。保存的 source-v1 原图可用于继续补帧。四种普通敌人各24帧，Boss32帧，灯、地刺、火裂、紫晶共16帧；帧固定脚底锚点，普通90像素、寄生体82像素、Boss180像素显示框。图集源尺寸与请求尺寸可能不同，构建脚本读取实际尺寸后分格并隔离邻格碎片，等比例放入固定画布，不按每帧独立缩放。

复建：node scripts/build-chapter-art.cjs。依赖 Sharp；脚本当前使用本机工具运行时路径，其他机器需改为当地已安装的 Sharp 路径。运行游戏不需要这些工具依赖。

## shield

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-6e3f9965-2e36-48aa-9222-0c812e5eed6e.png

工程原图：public/art/chapter-shield-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: production transparent sprite sheet for an original pixel anime top-down action game Ash Corridor. The supplied image is ONLY a style / pixel scale reference for enemies. Draw ONE consistent new enemy: a stout charcoal skeletal guard in battered iron armour, orange eye slit, holding a broad ash shield in the LEFT hand and a short cleaver in the other. Clear shield silhouette, warm amber highlights.
EXACT layout six equal columns by four equal rows, 24 isolated sprites, preferably 1536x1024, each cell square. Reading row-major. Fixed camera elevated three-quarter view, facing down-right in every pose; coherent proportions and body height across frames, centered ground foot anchor, no camera zoom.
Row 1 SIX subtle idle breathing poses. Row 2 SIX successive walking frames with complete gait loop. Row 3 SIX consecutive attack animation poses: ready, wind up, strongest anticipation, striking, follow-through, recover; weapon or abdomen action easy to read. For beetle the attack swells then bursts small embers.
Row 4 TWO hit-flinch poses then FOUR consecutive dying/collapse/dissolve poses, ending in sparse embers.
Medium: carefully clustered crisp game pixel art with subtle anime fantasy charm, dark outlines, 3–5 shade ramps per material, match style of supplied enemy sprites, no painterly brush, no 3D render, no blur.
Transparent alpha background everywhere outside sprites. Lots of padding so hair/cape/weapon NEVER crosses a cell. No grid borders, captions, shadows, text, UI or watermark. Frame silhouettes are readable at around 48–65 pixels tall in game.
```

## dancer

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-798a0e8d-a7c0-499f-8617-bad261ac38da.png

工程原图：public/art/chapter-dancer-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: production transparent sprite sheet for an original pixel anime top-down action game Ash Corridor. The supplied image is ONLY a style / pixel scale reference for enemies. Draw ONE consistent new enemy: a nimble masked ash swordswoman/automaton with a short torn crimson cape, two curved iron blades, ember seams, lean silhouette.
EXACT layout six equal columns by four equal rows, 24 isolated sprites, preferably 1536x1024, each cell square. Reading row-major. Fixed camera elevated three-quarter view, facing down-right in every pose; coherent proportions and body height across frames, centered ground foot anchor, no camera zoom.
Row 1 SIX subtle idle breathing poses. Row 2 SIX successive walking frames with complete gait loop. Row 3 SIX consecutive attack animation poses: ready, wind up, strongest anticipation, striking, follow-through, recover; weapon or abdomen action easy to read. For beetle the attack swells then bursts small embers.
Row 4 TWO hit-flinch poses then FOUR consecutive dying/collapse/dissolve poses, ending in sparse embers.
Medium: carefully clustered crisp game pixel art with subtle anime fantasy charm, dark outlines, 3–5 shade ramps per material, match style of supplied enemy sprites, no painterly brush, no 3D render, no blur.
Transparent alpha background everywhere outside sprites. Lots of padding so hair/cape/weapon NEVER crosses a cell. No grid borders, captions, shadows, text, UI or watermark. Frame silhouettes are readable at around 48–65 pixels tall in game.
```

## cantor

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-cf2bc8e8-89bb-4de1-8191-70a95e8d714b.png

工程原图：public/art/chapter-cantor-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: production transparent sprite sheet for an original pixel anime top-down action game Ash Corridor. The supplied image is ONLY a style / pixel scale reference for enemies. Draw ONE consistent new enemy: a small hooded furnace priest automaton in antique bronze and dark plum robes, carrying a bell staff with glowing amber core, round hood and hanging little bells. Support caster rather than modern gunman.
EXACT layout six equal columns by four equal rows, 24 isolated sprites, preferably 1536x1024, each cell square. Reading row-major. Fixed camera elevated three-quarter view, facing down-right in every pose; coherent proportions and body height across frames, centered ground foot anchor, no camera zoom.
Row 1 SIX subtle idle breathing poses. Row 2 SIX successive walking frames with complete gait loop. Row 3 SIX consecutive attack animation poses: ready, wind up, strongest anticipation, striking, follow-through, recover; weapon or abdomen action easy to read. For beetle the attack swells then bursts small embers.
Row 4 TWO hit-flinch poses then FOUR consecutive dying/collapse/dissolve poses, ending in sparse embers.
Medium: carefully clustered crisp game pixel art with subtle anime fantasy charm, dark outlines, 3–5 shade ramps per material, match style of supplied enemy sprites, no painterly brush, no 3D render, no blur.
Transparent alpha background everywhere outside sprites. Lots of padding so hair/cape/weapon NEVER crosses a cell. No grid borders, captions, shadows, text, UI or watermark. Frame silhouettes are readable at around 48–65 pixels tall in game.
```

## parasite

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-877679ac-47d1-4a9a-a0cd-382109f403f8.png

工程原图：public/art/chapter-parasite-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: production transparent sprite sheet for an original pixel anime top-down action game Ash Corridor. The supplied image is ONLY a style / pixel scale reference for enemies. Draw ONE consistent new enemy: a cute-but-dangerous squat ember beetle, six short legs, charcoal shell and swollen glowing orange furnace abdomen with violet crystal shards. Clearly a low crawling creature, no human face.
EXACT layout six equal columns by four equal rows, 24 isolated sprites, preferably 1536x1024, each cell square. Reading row-major. Fixed camera elevated three-quarter view, facing down-right in every pose; coherent proportions and body height across frames, centered ground foot anchor, no camera zoom.
Row 1 SIX subtle idle breathing poses. Row 2 SIX successive walking frames with complete gait loop. Row 3 SIX consecutive attack animation poses: ready, wind up, strongest anticipation, striking, follow-through, recover; weapon or abdomen action easy to read. For beetle the attack swells then bursts small embers.
Row 4 TWO hit-flinch poses then FOUR consecutive dying/collapse/dissolve poses, ending in sparse embers.
Medium: carefully clustered crisp game pixel art with subtle anime fantasy charm, dark outlines, 3–5 shade ramps per material, match style of supplied enemy sprites, no painterly brush, no 3D render, no blur.
Transparent alpha background everywhere outside sprites. Lots of padding so hair/cape/weapon NEVER crosses a cell. No grid borders, captions, shadows, text, UI or watermark. Frame silhouettes are readable at around 48–65 pixels tall in game.
```

## boss

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-c375d553-44ce-44f2-abdf-3630b92fd971.png

工程原图：public/art/chapter-boss-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: transparent production BOSS sprite animation sheet for original pixel anime action game Ash Corridor. Style reference only supplied enemy sheet. New boss "Grey-Crown Knight": towering broad-shouldered old knight in BLACK IRON armour with a broken crown helmet, cracked glowing amber furnace heart in chest, heavy worn crimson cloak, enormous BROAD MOLTEN GREAT SWORD. Knight looks solemn and tragic, not comical; dark iron orange fissures, pale ivory blade edge, violet crystal corruption on shoulder.
EXACTLY EIGHT equal columns by FOUR equal rows, 32 distinct frames, landscape2048x1024, fixed square cells. One consistent boss, same body/head scale, fixed foot anchor and elevated three-quarter camera facing down-right. Weapon fits within each padded cell, no neighbouring sprite bleed.
Row1: four subtle idle breathing frames then four walking/dragging sword frames.
Row2: four successive readable wind-up sword poses then four successive wide horizontal greatsword slash poses.
Row3: four successive overhead sword ground-slam poses then four successive backhand return-sweep poses, cape follows spin.
Row4: four armour-break/kneeling exposed-core stagger poses then four dying kneel, sword set down, fading core, quiet collapse poses.
Detailed CRISP PIXEL ART with anime dark fantasy sensibility, actual anatomically distinct poses, not copies and not rendered 3D. Silhouette must work at120px tall in game, larger than heroine. Transparent alpha, no background, no floor shadow, no text, no cells/borders/labels, no UI/watermark.
```

## props

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-c851485a-9d92-4647-ab9a-dcb16455e5d6.png

工程原图：public/art/chapter-props-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: transparent game animation sprite sheet, four columns by four rows, sixteen square padded cells, 1024x1024. Crisp detailed pixel anime dark-fantasy RPG style matching reference. Four distinct PROP rows:
row1 FOUR successive frames of a small antique copper lantern called the homeward lamp with a tiny engraved bird on top, warm ivory flame flickering; upright, no hands.
row2 FOUR successive frames of a rusty floor spike grate: resting, telegraph gleam, spikes rising, fully raised. Flat overhead ground angle, no oversized scenery.
row3 FOUR successive frames of a narrow cracked floor fire vent: dark crack, ember warning, low fire surge, fading embers, overhead view.
row4 FOUR successive frames of a small violet crystalline floor growth: quiet low shards, soft gleam, curling purple mist, gleam fades.
Uniform layout. Objects isolated, no overlapping adjacent cells. Transparent alpha background, no shadows outside objects, no text, captions, cell borders, watermark. Do not draw characters.
```

## outer

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-5e024384-b8d8-4d86-b6fe-8e2f93c3ba46.png

工程原图：public/art/chapter-outer-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: background room for original top-down pixel anime action roguelite, reference image gives camera, border shape and game pixel style. Create a NEW room: abandoned open-air courtyards of an ash city, cool grey flagstones, moss tufts, low broken walls, tall wrought iron lamps and quiet dawn-blue light, warm tiny lanterns around edges. Landscape 16:9, ideally1536x864. Fixed overhead three-quarter RPG camera. A LARGE FLAT UNOBSTRUCTED walkable central rectangle covers x9% to91%, y17% to83% of image. All bulky structures MUST stay outside that rectangle. Thin decorative floor inlays only in the centre. Keep a generous empty combat floor. Continuous wall framing at all edges; gameplay doors will be drawn by the game later. No centre pillars, obstacles, props, characters, enemies, treasure chests, UI, text, labels or watermark. Carefully clustered detailed pixel art, strong readable edges, limited dark muted ramps, warm/cool rim accents, no blur, no 3D, no photo. Match reference pixel density and fixed camera, do not simply recolor reference.
```

## forge

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-fb24badd-312f-472d-930c-472ef46bb04a.png

工程原图：public/art/chapter-forge-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: background room for original top-down pixel anime action roguelite, reference image gives camera, border shape and game pixel style. Create a NEW room: ancient mechanical foundry, dark iron and copper floor tiles, heavy furnace architecture, molten orange vents and pipes along the perimeter, warm amber furnace light, small violet crystals beginning to intrude. Landscape 16:9, ideally1536x864. Fixed overhead three-quarter RPG camera. A LARGE FLAT UNOBSTRUCTED walkable central rectangle covers x9% to91%, y17% to83% of image. All bulky structures MUST stay outside that rectangle. Thin decorative floor inlays only in the centre. Keep a generous empty combat floor. Continuous wall framing at all edges; gameplay doors will be drawn by the game later. No centre pillars, obstacles, props, characters, enemies, treasure chests, UI, text, labels or watermark. Carefully clustered detailed pixel art, strong readable edges, limited dark muted ramps, warm/cool rim accents, no blur, no 3D, no photo. Match reference pixel density and fixed camera, do not simply recolor reference.
```

## inner

原始生成结果：C:\Users\chenqinghua\.codex\generated_images\01a107b3-2842-7eb0-b6a8-b5f5ff250a3c\exec-4940a2d8-f54f-4a65-8f1f-d609d966ea9f.png

工程原图：public/art/chapter-inner-source-v1.png

实际提示词：

```text
Use case: stylized-concept. Asset: background room for original top-down pixel anime action roguelite, reference image gives camera, border shape and game pixel style. Create a NEW room: silent crystallised gothic inner-city hall, blue-grey and muted purple floor tiles, broken ceremonial walls, lilac crystalline growths on the perimeter, cold violet light and a central engraved crown sigil, dignified sombre atmosphere. Landscape 16:9, ideally1536x864. Fixed overhead three-quarter RPG camera. A LARGE FLAT UNOBSTRUCTED walkable central rectangle covers x9% to91%, y17% to83% of image. All bulky structures MUST stay outside that rectangle. Thin decorative floor inlays only in the centre. Keep a generous empty combat floor. Continuous wall framing at all edges; gameplay doors will be drawn by the game later. No centre pillars, obstacles, props, characters, enemies, treasure chests, UI, text, labels or watermark. Carefully clustered detailed pixel art, strong readable edges, limited dark muted ramps, warm/cool rim accents, no blur, no 3D, no photo. Match reference pixel density and fixed camera, do not simply recolor reference.
```

