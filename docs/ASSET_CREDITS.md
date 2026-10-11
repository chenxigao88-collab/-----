# 素材来源与维护

0.7章节新增三张区域场景、四种普通敌人24帧图集、灰冠骑士32帧图集，以及灯与机关16帧，均使用内置图片生成功能；工程保存原图与固定锚点游戏图集。实际提示词、生成原路径与处理说明见[CHAPTER-ART-0.7.md](CHAPTER-ART-0.7.md)。

元素反应新增`reaction-bursts-a.png`、`reaction-bursts-b.png`，由内置图片生成功能生成，每图5种反应×8帧，共80帧。原图透明背景，固定中心网格索引；运行时缓存局部光晕和边缘遮罩，原始图片未修改。实际提示词与来源见[REACTION-ANIMATIONS.md](REACTION-ANIMATIONS.md)。

跑步修复新增`violet-run-v2.png`（上下方向六帧）和`violet-run-profile.png`（侧向八帧，左右同源镜像），均由内置图片生成功能生成。当前紫鸢九张原图172个索引帧，旧图中的跑步帧停用。实际提示词和生成文件路径见[VIOLET-MOTION-ART.md](VIOLET-MOTION-ART.md)。

紫鸢新增七张原始透明图集由内置图片生成工具生成，参照本轮用户提供的少女角色图。文件为`violet-locomotion.png`、`violet-slash.png`、`violet-upper.png`、`violet-spin-kneel.png`、`violet-kneel-turn.png`、`violet-utility.png`、`violet-death.png`。使用`index-violet.cjs`建立160帧索引及邻帧隔离遮罩；图片原文件未手工改绘。用途、尺寸校准与维护提示词见[VIOLET.md](VIOLET.md)。早期拥挤下劈稿仅作为废稿保存，不加载到游戏。

| 文件 | 来源 | 用途 |
| --- | --- | --- |
| public/art/hero-sheet.png | 内置图片生成，参照已批准的原创风格图 | 四方向各六帧奔跑 |
| public/art/hero-actions.png | 内置图片生成，参照前一主角图 | 四方向各四帧待机、四方向冲刺、四帧倒地 |
| public/art/hero-gunfu-combat.png | 内置图片生成，参照现有主角 | 四方向打击、拔枪，各四帧，共32帧 |
| public/art/hero-gunfu-movement.png | 内置图片生成，参照现有主角 | 四方向滑步、反击，各四帧，共32帧 |
| public/art/hero-gunfu-slashes.png | 内置图片生成，参照现有主角 | 四方向下劈、上撩，32帧 |
| public/art/hero-gunfu-sweep-kick.png | 内置图片生成，参照现有主角 | 四方向横扫、正踢，32帧 |
| public/art/hero-gunfu-aerial.png | 内置图片生成，参照现有主角 | 四方向后空翻、空中射击，32帧 |
| public/art/hero-gunfu-landing.png | 内置图片生成，参照现有主角 | 四方向落地旋身、开枪收势，32帧 |
| public/art/objects-sheet.png | 内置图片生成，参照已批准的原创风格图 | 三敌人各四帧、四把武器 |
| public/art/element-weapons.png | 内置图片生成，参照旧武器图集的原创像素材质 | 霜弦、烬灯、鸣枝三把独立武器 |
| public/art/room.png | 内置图片生成，参照已批准的原创风格图 | 独立空房间背景 |
| public/art/atlas.json | scripts/index-assets.cjs、index-element-weapons.cjs、index-gunfu.cjs、index-gunfu-routine.cjs分析原图透明区域 | 裁剪矩形、尺寸、脚点／腾空锚点 |
| public/favicon.svg | 本项目编写 | 页签图标 |
| 音效 | AudioManager 即时合成 | 射击、受击、强化终结、滑步等反馈 |

没有引入外部游戏角色、第三方素材包、网络字体或外部音频。用户提供的两张截图用于理解风格，没有放进运行时资产。生成提示词见 [IMAGE_GENERATION.md](IMAGE_GENERATION.md)。源图保留透明背景，房间图例外。

美术当前仍需要人工精修：主角待机使用每个方向固定站姿，仅作上下呼吸；生成动作间服装与发丝存在轻微差别。敌人只有正面四姿态，近战的准备、出手与恢复按状态选帧，已移除持枪表现。房间为整体背景图，并非可扩展瓦片集。新增枪斗动作的原图与实际提示词见 [GUNFU_ART.md](GUNFU_ART.md)。

后续素材缺口按优先级：①统一主角帧并细修待机；②敌人四方向移动/攻击/死亡；③可拼接地板、墙角、门与装饰瓦片；④第二房间与首领；⑤专用 UI 像素图标、正式音效与配乐。建议继续沿用现有 atlas 的尺寸和脚底锚点规则，接入说明见 [extension-guide.md](extension-guide.md)。
