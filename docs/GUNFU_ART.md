# 枪斗动作素材与生成记录

> 此页保留0.3短动作素材。当前完整六式枪斗新增128帧，原图与实际提示词见[GUNFU_ART_0.4.md](GUNFU_ART_0.4.md)。

0.3 的两张动作图集由内置图片生成功能制作，参考现有主角的角色身份与像素材质，使用透明背景。每张 1536×1024，8 列×4 行、32 个完整人物姿态；两张共 64 帧。行顺序为正面、左、右、背面；每种动作有四帧。

## 工程资产

| 图集 | 左四列 | 右四列 |
| --- | --- | --- |
| [hero-gunfu-combat.png](../public/art/hero-gunfu-combat.png) | 贴身打击：准备、蓄力、命中、收回 | 拔枪：触腰、抬手、出手、回收 |
| [hero-gunfu-movement.png](../public/art/hero-gunfu-movement.png) | 滑步：屈膝、迈步、滑行、落脚 | 反击：闪身、转体、出手、回收 |

使用 scripts/index-gunfu.cjs 根据透明区域索引；保留原图，以固定格子横向中心和脚底锚点缩放接入。绘制最近邻采样，原角色奔跑、待机、倒地仍使用既有图集。

首次 64 帧单张图的末行脚部被裁切，已经弃用，保存在 artifacts/hero-gunfu-draft.png，仅作失败记录。当前运行时只加载上表两张完整图集。

## 动作时间和武器配合

近身打击在 0.105 秒进行碰撞与伤害判定；命中姿态保持至 0.155 秒后才衔接 0.25 秒拔枪。拔枪在第 0.105 秒出手。滑步与精准反击使用专门图集；普通射击只使用架枪、后坐姿态。武器、枪口闪光和子弹起点共用动作握持位置；近距离目标采用握持点到枪口的扫掠判定，避免长枪越过目标。

滑步有四阶段与对应残影；脚底锚点固定，人物实际位移由战斗逻辑控制。待机沿用固定姿态做上下约 1 像素呼吸，不使用前后晃动。移动身体朝向由运动方向决定，武器独立随鼠标。

[滑步四帧实机图](../artifacts/24-gunfu-slide.png)和[连招十六帧实机图](../artifacts/25-gunfu-action-sequence.png)由游戏在浏览器中的真实渲染录制，不是静态效果图。生成资产仍有衣物与发丝细节差异，后续可逐像素清稿；没有声称已完成手工精修。

## 实际生成提示词

参考图：public/art/hero-sheet.png 与 public/art/hero-actions.png。以下为实际使用的英文提示词，未改写成理想结果描述。

### 打击与拔枪

原始输出：C:/Users/chenqinghua/.codex/generated_images/01a107b3-2842-7eb0-b6a8-b5f5ff250a3c/exec-d76a2605-9d3f-47de-94aa-54b85a7da552.png

```text
Use case: stylized-concept. Asset type: production transparent pixel-art animation atlas for the EXACT silver-haired heroine in references (CHARACTER IDENTITY references only). Preserve ash silver bob, amber eyes, copper hair clip, navy short coat with ivory trim, cream shirt, dark leggings and boots, red scarf, cyan wrist ornament. Same deliberate crisp pixel clusters and dark outline, original anime pixel art. EMPTY hands posed to hold weapons overlaid by game, NEVER draw any gun/blade. TRUE RGBA transparency, no checkerboard, no background/shadow, no text or labels, no grid borders. EXACTLY32 full-body sprites in regular 8 columns x4 rows, LANDSCAPE1536x1024, each cell192x256. Complete heads and BOOTS, generous clear gap between rows, absolutely no clipping at bottom. Every sprite about120px wide x190px tall, aligned foot baseline cell y224. ALL rows occupy exactly four equal256px bands. Direction row1 DOWN front, row2 LEFT, row3 RIGHT, row4 UP back. Four frames per action, left4 columns first action, right4 second action. All32 sprites sequential poses with SAME head scale and outfit. Visible torso/arms/legs changes, not repeated idle sprites. LEFT4 STRIKE:1 planted guard;2 foot braces and fist chambers;3 strong forward empty-hand gun-butt/palm strike and forward torso lean;4 retract and return guard. RIGHT4 QUICKDRAW:1 reach waist low brace;2 torso twist and raise empty hands;3 arms extend forward braced for gunshot;4 recoil and return guard. Direction per row is strict; down faces camera, up shows back. Stable boot baseline and clear motion.
```

### 滑步与反击

原始输出：C:/Users/chenqinghua/.codex/generated_images/01a107b3-2842-7eb0-b6a8-b5f5ff250a3c/exec-c207fa0c-642d-4f3e-899b-b8f5e3eaef9b.png

```text
Use case: stylized-concept. Asset type: production transparent pixel-art animation atlas for the EXACT silver-haired heroine in references (CHARACTER IDENTITY references only). Preserve ash silver bob, amber eyes, copper hair clip, navy short coat with ivory trim, cream shirt, dark leggings and boots, red scarf, cyan wrist ornament. Same deliberate crisp pixel clusters and dark outline, original anime pixel art. EMPTY hands posed to hold weapons overlaid by game, NEVER draw any gun/blade. TRUE RGBA transparency, no checkerboard, no background/shadow, no text or labels, no grid borders. EXACTLY32 full-body sprites in regular 8 columns x4 rows, LANDSCAPE1536x1024, each cell192x256. Complete heads and BOOTS, generous clear gap between rows, absolutely no clipping at bottom. Every sprite about120px wide x190px tall, aligned foot baseline cell y224. ALL rows occupy exactly four equal256px bands. Direction row1 DOWN front, row2 LEFT, row3 RIGHT, row4 UP back. Four frames per action, left4 columns first action, right4 second action. All32 sprites sequential poses with SAME head scale and outfit. Visible torso/arms/legs changes, not repeated idle sprites. LEFT4 SLIDE:1 knees bend and scarf lifts;2 low side-step;3 sliding lunge with one leg extended and scarf trailing;4 plant foot and rise guard. RIGHT4 COUNTER:1 compact dodge lean;2 turn upper body and reach waist;3 confident extended-arm shooting posture;4 recoil while unwinding torso. Do not duplicate STRIKE poses. Stable character identity. Full boots in row4 up/back, with generous transparent margin below.
```
