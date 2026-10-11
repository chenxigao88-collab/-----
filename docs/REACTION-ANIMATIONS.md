# 元素反应逐帧动画

十种元素反应各八帧，共80帧。帧序为起势火花、凝聚、命中、峰值、扩散、碎片、残光、消散；时长0.76～1.08秒，前段较快、消散较慢，不循环爆发。所有伤害、反应范围、灼烧、易伤、减速和控制参数保持原规则。

| 反应 | 主要动画 |
| --- | --- |
| 热裂 | 暖色冲击、蒸汽和碎冰 |
| 爆燃 | 火雷星状爆炸、火花与电枝 |
| 焰旋 | 火焰旋流与余烬 |
| 熔痕 | 熔岩裂纹、岩片和光点 |
| 霆裂 | 冰晶碎裂和电闪 |
| 寒涡 | 冰雾旋流与雪晶 |
| 霜缚 | 冰晶锁链与结晶残留 |
| 导流 | 电核放电与动态三目标电弧 |
| 震荡 | 电岩冲击、碎石与地面波纹 |
| 卷砂 | 风砂旋流、岩屑与尘点 |

持续灼烧、熔痕、禁足和减速显示小幅残留动画，跟随敌人当前身体中心与击飞高度，随实际状态消失。导流连接记录命中目标ID，绘制时读取其当前身体中心；死去目标保留最后命中位置。原生跳电与落雷连线也采用同一像素电弧绘制。

地面波纹先于角色绘制，主爆发在角色上方；峰值减少遮挡，低透明度背景光晕被抑制，缓存圆形边缘消隐避免矩形边框与邻格碎片。每帧固定中心，不按碎片边界缩放。最多30个爆发，名称提示最多6条并避让重叠。动画缓存最多80个96×96像素小画布；暂停冻结，重开清除效果实例。

素材保存于`public/art/reaction-bursts-a.png`和`reaction-bursts-b.png`；元数据由`scripts/index-reaction-effects.cjs`生成，不改绘源PNG。图片由内置图片生成工具生成，两张均1536×1024，8列5行，透明四角。

预览：`artifacts/reaction-animations.gif`；实际游戏画面：`artifacts/reaction-game-6.png`；检查报告：`artifacts/reaction-animation-browser-report.json`、`reaction-production-report.json`。262项自动检查和正式版本验证通过。本轮没有重新进行极限压力测试。

## 原始生成文件与实际提示词

A组源图：`C:/Users/chenqinghua/.codex/generated_images/01a107b3-2842-7eb0-b6a8-b5f5ff250a3c/exec-fd068286-f37b-4e06-bc6a-91a8963a65c1.png`

```text
Create a premium detailed PIXEL ART game VFX sprite animation atlas, TRUE TRANSPARENT PNG, 1536x1024, EXACTLY 8 columns x 5 rows, 40 separate cells, each cell 192px wide and approximately205px tall. Every cell contains ONE centered effect at same fixed center position. No characters, no weapons, no scenery, no labels, no grid, no checkerboard. Crisp stepped pixel edges, small pixel clusters, controlled bright white cores and colored glow pixels; not smooth vector circles. Top-down anime action roguelite quality, expressive detailed combat magic. Transparent margins at least16px inside every cell; absolutely no effect crossing a neighboring cell. Every ROW is a distinct COMPLETE EIGHT-FRAME ONESHOT animation, left to right: frame1 tiny ignition spark; frame2 gathering core; frame3 sharp impact flash; frame4 full peak; frame5 expanding fragments/flow; frame6 separated debris; frame7 sparse fading colored motes; frame8 a few dim trailing pixels, almost empty. Effects grow, transform and dissipate, do NOT simply repeat the same icon eight times. Semi-transparent colored glow only immediately around luminous pixels; background fully transparent. Consistent centers and original pixel game art.
ROW1: FIRE+ICE thermal shatter: orange-white hot core surrounded by cyan sharp ice shards, puff of pearly steam splitting outward, ice fractures melt to small blue-orange pixels. ROW2: FIRE+LIGHTNING blast: fiery orange gold explosive bloom with branching violet lightning forks, jagged star impact, widening flame petals, white core peak. ROW3: FIRE+WIND burning cyclone: swirling orange-red crescent flames and rising sparks forming an open hollow tornado spiral; swirl rotations advance across frames, luminous flow fades into embers. ROW4: FIRE+EARTH molten exposure: glowing molten cracks in suspended dark rock fragments, honey-orange runic slash fissure, small lava droplets, crack glow dims gradually. ROW5: ICE+LIGHTNING fracture: deep blue cyan crystalline star impact split by violet white electricity; sharp ice shards fly radially with thin electric zigzags, fading blue spark dust.
```

B组源图：`C:/Users/chenqinghua/.codex/generated_images/01a107b3-2842-7eb0-b6a8-b5f5ff250a3c/exec-57856e5b-3dd2-4fd5-80c4-18b269d1e287.png`

```text
Create a premium detailed PIXEL ART game VFX sprite animation atlas, TRUE TRANSPARENT PNG, 1536x1024, EXACTLY 8 columns x 5 rows, 40 separate cells, each cell 192px wide and approximately205px tall. Every cell contains ONE centered effect at same fixed center position. No characters, no weapons, no scenery, no labels, no grid, no checkerboard. Crisp stepped pixel edges, small pixel clusters, controlled bright white cores and colored glow pixels; not smooth vector circles. Top-down anime action roguelite quality, expressive detailed combat magic. Transparent margins at least16px inside every cell; absolutely no effect crossing a neighboring cell. Every ROW is a distinct COMPLETE EIGHT-FRAME ONESHOT animation, left to right: frame1 tiny ignition spark; frame2 gathering core; frame3 sharp impact flash; frame4 full peak; frame5 expanding fragments/flow; frame6 separated debris; frame7 sparse fading colored motes; frame8 a few dim trailing pixels, almost empty. Effects grow, transform and dissipate, do NOT simply repeat the same icon eight times. Semi-transparent colored glow only immediately around luminous pixels; background fully transparent. Consistent centers and original pixel game art.
ROW1: ICE+WIND cold vortex: low wide hollow cyan-white swirling mist rings with small angular snowflake shards and sweeping white wind crescents, continuous spiral rotation, fade into frost motes. ROW2: ICE+EARTH frost bind: angular cyan icy chains and dark turquoise crystal roots rise from bottom to clasp the empty center, three sharp ice crystals, freeze flash then falling crystal particles. ROW3: LIGHTNING+WIND conduction: concentrated white violet electric node star with branching thin cyan/violet forks radiating outward, curled windy spark trails, electrical discharge then sparse blue sparks. ROW4: LIGHTNING+EARTH shockwave: jagged golden ochre ground fissures erupt around white violet electrical impact, floating stone chips and expanding open shockwave arcs, cracks and electric fragments fade. ROW5: WIND+EARTH sand spiral: warm ochre sandstone chips and pale mint-white wind crescent ribbons curl inward around an empty center like a compact sand tornado; advancing spiral rotation, brown gold dust trail.
```
