# 紫鸾·断月 · 0.11

紫鸢第二大招。R沿用紫夜终幕并消耗100能量；Shift+R只在两层全满（200能量）时发动断月，没有满两层时不会退回第一大招。没有可见目标、闪避中、暂停、过门、死亡或其他角色时不释放、不扣能量。

## 演出与机制

演出5.5秒，敌方动作暂停，玩家无敌；暂停仍有效。锁定瞄准方向前方360像素内最多8名可见敌人（第一大招为240像素、5名）。柱子阻挡锁定与穿阵路径；普通敌人可短暂浮空，Boss不会被挑飞、拖动。

| 时段 | 表现与判定 |
|---|---|
| 0–0.8秒 | 背身回眸、双月环升起，出现侧边角色特写 |
| 0.8–2秒 | 当前武器在1.05秒、副武器在1.65秒各发射一次；蓄力武器自动满蓄力，连发、散射、火球等保留原生机制 |
| 2–3.8秒 | 沿三段路径穿阵，保留透明角色残影；2.35、2.95、3.55秒留下三道剑裂，暂不扣血 |
| 3.8–4.55秒 | 紫色鸾翼展开，月光凝成巨刃，出现断月斩 |
| 4.55–5.5秒 | 收剑音响起，三道剑裂同时结算，再追加断月终击；0.12秒打击停顿后紫羽消散 |

自动换持不受Q的3秒限制，结束后保留副武器。演出期间及自身后续伤害不回充；两层能量保留在营地存档，旧版存档兼容。结束时恢复操作并给锁定敌人短暂恢复硬直。

## 数值

- 两次装备武器攻击使用基础武器伤害的1.6倍，仍经过真实弹丸碰撞、散布、穿透、遮挡与元素反应判定。蓄力按100%套用每把武器自己的伤害、弹数或爆炸范围规则。
- 每道剑裂的基础伤害为 `32 + 0.2 ×（两把装备武器基础伤害之和）`。继承等级、锋芒、枪斗与巨刃专精，按敌人的实际减伤结算；穿阵时隔着障碍物的目标不会记录该道裂痕。
- 断月终击逐敌人追加 `已结算的本次枪击、反应与三道剑裂实际伤害总和 × 120%`，四舍五入。实际打空不计账，终击不再重复叠加成长与护甲倍率，仍受当前无敌、护盾和剩余生命限制。
- 目标在收剑之前死亡，不转移伤害给新敌人。弹丸在终击之后才命中则正常伤害，不追溯放大。

## 绘制素材

使用内置 imagegen，参考 [紫鸢人设](紫鸢-人设图.png)，生成两张独立透明PNG。每张1536×1024、6列×4行，共48帧；运行时仅裁切、镜像、旋转与合成这些图片，双枪按装备真实外观叠加。舞台遮罩与文字仍属于界面。

- [角色动作图集](../public/art/violet-moon-body-v1.png)：24个完整角色姿势，含回眸、双枪、穿阵斩与收剑。
- [断月特效图集](../public/art/violet-moon-effects-v1.png)：月环、鸾翼、剑裂、爆发各6帧。
- [实机动图](../artifacts/紫鸢-紫鸾断月-v1.gif)与[六阶段预览](../artifacts/moon-ultimate-preview.png)。

索引由 `scripts/index-moon-ultimate.cjs`生成，检查每帧非空、边角透明与图集边界。

### 角色动作最终提示词

```text
Create a transparent sprite sheet of the attached Violet heroine for her purple phoenix ultimate. EXACTLY 6 columns by 4 rows, 24 equal square cells, 1536x1024. Full body, crisp pixel anime game art, identical head size, feet near bottom center of each cell, generous transparent margin, no text or backgrounds. Preserve lavender long hair, violet eyes, crystal crown, white-frilled black-purple dress, gloves, boots, flowing cape, giant dark-purple crystal sword. Row1 six sequential poses: back-facing sword lowered; glance over shoulder; confident smile; pivot right; left empty gloved hand aiming; left-hand recoil. Row2: side slide; right empty gloved hand aiming; recoil; grip sword; crouch draw; low horizontal slash. Row3: low slash followthrough; rush forward; leaping reverse slash; midair twist; descending slash; back-facing landing. Row4: lowered sword behind; raise sword; final diagonal slash; hold slash; sheath sword; calm back-facing sheath click. No pistols painted because game overlays equipped guns. One sword only, no duplicated limbs. Actual transparent alpha outside character. Each cell is one isolated frame, no touching neighboring cells.
```

### 特效最终提示词

```text
Use case: stylized-concept. Asset type: production transparent PNG pixel-art animation sprite sheet for an original purple phoenix moon-cleaving ultimate in a top-down action game. EXACTLY SIX columns and FOUR rows, 24 equally sized square cells, overall landscape 1536x1024. Each row is one six-frame animation left to right. Row 1: a silver-violet broken moon seal forms from two arcs into a feather-lined crescent, blooms, then dissolves into violet feathers. Row 2: a pair of majestic angular purple phoenix wings unfurls from closed to full wingspan, arches, then folds into a diagonal blade of moonlight and fades. Row 3: three thin diagonal sword rifts progressively appear, held briefly, then the moon is bisected by a bright violet diagonal slash with silver core, fracture shards disperse. Row 4: a final violet moon rupture expands from compact luminous core into a large jagged crescent explosion, outward feather shockwave and fading feather fragments. Sharp authored pixel art with sophisticated hand-painted shading, deep violet, saturated purple, lavender and small silver-white highlights. Distinct silhouettes, no character, no weapons, no floor, no text, no cell borders, no labels. Actual transparent alpha everywhere outside effects. Center each frame identically in its cell, generous empty padding so nothing crosses cell boundaries. No gradients or glow filling the background. Each row must contain six visibly distinct nonempty progressive frames; keep quiet thin rifts in row 3 before the final explosion. These will be drawn as bitmap sprites, never procedural geometry.
```

## 验证

新增测试覆盖双层消耗、原大招保留余量、Shift+R不降级、无目标不消耗、锁定和柱子遮挡、两把真实满蓄力武器、Q冷却绕过、三道裂痕延迟结算、终击不重复增伤、巨刃成长、Boss控制免疫、暂停恢复、路径阻挡、取消无敌与营地存档兼容。29个测试文件共792项通过，类型检查与正式构建通过。开发版浏览器实际按Shift+R完成整段演出，生成58帧、每帧100ms的动图，报告见 `artifacts/moon-ultimate-browser-report.json`。正式版另行验证四个新素材文件全部加载成功、角色选择、Shift+R提示及开发调试入口不对外暴露，报告见 `artifacts/moon-production-report.json`。
