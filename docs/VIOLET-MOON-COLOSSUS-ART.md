# 紫鸾·断月 · 巨月演出修订

0.11.1调整第二大招的表现：最终只出现一轮巨月和一次整体崩解，所有目标的伤害仍逐个结算。操作、两层消耗、满蓄力枪击及数值保持0.11规则。

## 构图

- 敌人羽印从86缩至34像素，透明度0.4；剑裂从100缩至48像素，透明度0.48。删除每名敌人150像素的斩月与190像素的爆发。
- 3.2秒起一轮石质巨月在紫鸢后上方缓慢显现，绘制尺寸360→460；4.1秒起仅一条贯穿月面的斩痕，整块月壳开始分离。
- 4.55秒收剑后只播放一处巨月崩解，尺寸460→560，月壳碎块与紫羽散开。全部绘制在角色、敌人与地面物件之前；取消原有370像素屏幕前景月亮。
- 鸾翼尺寸460×330，最高透明度0.65；紫鸢在整个第二大招中绘制在战斗特效之后，避免被Boss、标记或巨月遮挡。
- 终幕镜头平稳拉远（1.35→1.15倍）。3.8秒锁定月体和镜头中心，即使目标全部死亡也不改变构图；结束时平滑回到正常倍率。

## 素材与生成

使用内置 imagegen，以第一版紫色特效为风格参考，单独绘制[巨月图集](../public/art/violet-moon-colossus-v2.png)。PNG实际透明，1536×1024，6列4行共24帧：月体升起、斩月裂开、单一崩解、鸾翼各6帧。前版48帧继续用于角色与细小标记，总计72帧。

为避免碎片与相邻格子串入，第二次用内置图片编辑增加透明边距。索引保留固定格和共享大小，不根据每帧可见外框缩放；两帧收尾羽尖触及格子边缘的像素不足3%，固定格裁切保证不跨入下一格。

[第二版实机动图](../artifacts/紫鸢-紫鸾断月-v2.gif) · [六阶段预览](../artifacts/moon-ultimate-preview.png)

### 第一轮生成提示词

```text
Use case: stylized-concept. Asset type: a production transparent PNG sprite atlas for a gigantic moon-cleaving purple phoenix ultimate. Input image is the color/style reference; redesign the effects into ONE monumental moon instead of many small effects. Exact 6 columns and 4 rows, 24 equal square cells, landscape 1536x1024. Row1 six frames: a single HUGE dark obsidian-violet moon slowly materializes, with richly textured cratered stone, an extremely thin silver-violet illuminated rim, fine concentric ancient carved bands; increasingly solid, final frames hold a complete massive moon. Row2 six frames: THE SAME SINGLE MOON starts intact with a hairline diagonal cut, one long razor-thin violet-white sword slash cuts entirely through it, two enormous stone halves slowly separate along that cut, sparse giant angular stone fragments. Row3 six frames: ONE single monumental moon detonation, two giant stone halves rupture outward from a compact violet-white core; one immense violet phoenix-feather shockwave flows outward into large shards and eventually sparse feather fragments. This is a slow heavy catastrophic breakup, NOT a dense fuzzy ball of light. Row4 six frames: enormous regal PURPLE PHOENIX wings unfold, long layered crystal feathers, dark purple mass, silver edge highlights, one full wide majestic silhouette, then feathers fade. Every cell one isolated full effect with generous transparent margin, no characters, no scenery, no text, no gridlines. Crisp detailed hand-painted pixel anime game art; dark violet mass and lavender/silver edges, strong readable silhouette. Preserve actual transparent alpha outside the effects, NO solid or gradient background, NO haze across empty areas. All six frames in every row nonempty and distinct. Giant scale is conveyed by large crater plates and fractured stone slabs rather than multiple moons, small swirling circles or clutter. The body of the moon should remain relatively dark so a bright heroine layered in front remains readable.
```

### 最终透明边距编辑提示词

```text
Edit only the layout and padding of this exact transparent atlas. Preserve every moon, sword cut, stone shard, purple phoenix wing, exact artwork style, all 24 poses, color and transparency. Keep EXACTLY 6 columns by 4 rows at 1536x1024. In EACH 256x256 cell, uniformly scale the entire existing effect down to approximately 75% of its current footprint, center it precisely at the center of the cell, and leave at least 25 pixels of genuinely transparent empty margin on every side of every cell. No part of any effect, shard, feather or slash may touch or cross any cell boundary. Do NOT add new artwork or remove frames. Do NOT add a visible grid or background. Actual transparent alpha for all padding. The result must have 24 isolated smaller effects, each centrally positioned in its own cell with safe transparent gutters.
```

## 验证

新增5项渲染回归，覆盖5/8目标时均仅一次背景爆发、前景与覆盖层无斩月或爆发、敌人标记不超过48像素、终幕斩月只一次、目标死亡与移走后镜头及月体锚点稳定。全部797项测试、类型检查及正式构建通过。

浏览器实际Shift+R录制完整演出。另在左右朝向、1/8目标、4.3秒斩月与4.7秒崩解的8种组合中，记录真实绘制调用，全部确认只有一处背景巨月、标记不超过48像素、紫鸢在Boss及全部特效之后绘制且完整留在画面内、Boss没有浮空。见[实机预览](../artifacts/moon-colossus-variants.png)与[检查报告](../artifacts/moon-colossus-variants-report.json)。正式构建检查3份图集及各自索引共6个资源加载、紫鸢选择及Shift+R操作提示，全部通过。
