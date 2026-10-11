# 紫鸢：巨刃与三连枪

在开战前的角色与双武器界面选择「紫鸢」。原角色「余烬」仍可选择。角色选择保存在当前浏览器，重开和刷新保留；开战后不能换角色。

右键每按一次执行一段，六段为：巨刃下劈 → 上挑 → 回旋击退 → 单膝跪射第一枪 → 保持跪姿第二枪 → 回身换枪第三枪。最后自动收势。段间窗口0.45秒，段末0.12秒可缓存一次输入。按住不会连发，空房间可练习。停在跪射段会保持姿势，移动或超时站起；闪避或受击取消连招。

前三段伤害为4、4、8；第三段回旋最多击飞三个敌人，范围76，离地最高30像素，滞空0.8秒、向外移动36像素，精英高度和位移为80%。飞行期间不能移动追击或攻击，落地后有0.16秒恢复和至少0.45秒攻击间隔；命中箱、射击瞄准点与血条跟随高度，地面影子保留。三个武器段在各自攻击时自动瞄准最近存活敌人，使用装备武器的原有弹丸与碰撞逻辑，前两枪能瞄准空中目标，第三段换到另一把；目标可能因移动、距离或遮挡而未被命中。装备缄锋时对应段改为近战回旋，按实际范围判定，不发射替代子弹。每次采用基础攻击的0.25倍率，总预算仍为0.75；三个武器段共享一次20点枪斗势奖励。满势强化只在第三段触发。生命、移速和短闪避沿用原角色。

当前九张1536×1024透明图集，共172个索引帧：

| 图集 | 用途 | 索引帧数 |
| --- | --- | --- |
| violet-locomotion.png | 四方向待机；旧跑步帧停用 | 16 |
| violet-run-v2.png | 上下方向六帧跑步 | 12 |
| violet-run-profile.png | 侧向八帧跑步，左向由同源帧镜像得到 | 16 |
| violet-slash.png | 四方向巨刃下劈 | 16 |
| violet-upper.png | 四方向上挑 | 16 |
| violet-spin-kneel.png | 四方向回旋、下跪过渡 | 32 |
| violet-kneel-turn.png | 四方向跪射、回身换枪 | 32 |
| violet-utility.png | 四方向短闪避；未使用另一半倒地帧 | 16 |
| violet-death.png | 四方向受击与倒地 | 16 |

使用内置图片生成工具，依据用户提供的角色参考：银紫长发、呆毛、紫色眼睛与头饰、黑色披风紫色内衬、白色战斗裙、黑色长靴，保持可爱且利落的像素少女气质。待机上下轻微呼吸；跑动与动作包含发丝和披风摆动。原始生成图片未重新绘制。

动作以脚点为锚、按每张图的解剖比例校准固定缩放，保留抬刀扩大画面和跪姿变矮的正常变化。回旋轮换四向帧完成360度转身，回身先转背再面向射击目标。第一跪射的后半段复用第二跪射的单膝姿态；武器独立绘制跟随握持点，前三段巨刃直接包含在原始动作帧中。

`scripts/index-violet.cjs`索引透明连通轮廓；对于裁剪框内的邻帧碎片，记录行跨度遮罩，渲染时缓存独立画面，避免邻帧刀刃或头发混入。没有用整幅动作边界强行统一人物高度。生成帧仍有少量发丝、衣物细节差异，未完成逐像素人工清稿。

素材目录：`public/art/`；动作预览：`artifacts/violet-combo.gif`；尺寸对照：`artifacts/violet-rendered-poses.png`；检查报告：`artifacts/violet-browser-report.json`。

## 继续制作时可复用的提示词

以下是维护用提示词模板，非逐次调用的完整历史记录。保持同一人物参考和已生成待机图作为后续动作参考。

“Create a crisp detailed anime chibi pixel-art character animation atlas on a truly transparent background. Same silver-lavender long-haired girl, purple eyes, purple hair ornament, cute confident expression, black cape with lavender lining, modest white battle dress, black boots. Consistent head size and anatomy across every frame; fixed foot baseline per row. Hair and cape flow with each pose. No text, labels, grid lines, ground, shadow, scenery, anti-aliased vector edges, or neighboring-frame overlap. Four rows in order DOWN, LEFT, RIGHT, UP, with generous transparent gutters.”

分别追加：

- 待机与跑步：8列，每行前4帧上下微呼吸、后4帧跑步；长发与披风连续摆动。
- 下劈：4列，预备抬巨刃、举刃蓄力、向下劈击、低位收势，保持身体与头部尺寸。
- 上挑：4列，低位准备、由下向上挑刃、上挑最高点、回落收势，刀尖不能跨邻格。
- 回旋与下跪：8列，前4帧巨刃回旋扫击、后4帧从站立降为单膝跪姿并抬手持枪。
- 跪射与回身：8列，前4帧保持单膝跪姿两手持枪、射击后坐与恢复；后4帧转背拔另一把枪、旋回朝敌、射击与收势。
- 闪避：8列原图，只使用前4列短距离闪身动作，发尾和披风拉出动态。
- 倒地：4列，从失衡受击到侧倒，再到安静倒地；留足横躺空间，保持头部尺寸。

## 验证

2026-10-05跑步与击飞修复：侧向八帧含落脚、屈膝、脚下通过与腾步，按16帧/秒循环。使用面部颜色与固定解剖比例建立身体中心，排除披风和长发对锚点的影响，并校准最终像素取整误差。实测左右八帧面部横向跨度均0.822像素，纵向自然起伏1.882像素；原左跑第三帧锚点偏移约16像素已消除。

本轮10个测试文件246项通过，类型检查和正式构建通过。新增击飞时点、垂直命中箱、滞空禁攻、落地、时停/暂停、两次空中追击、最多三个目标、重复与次生伤害不可重启击飞、大步长落地检查。运行浏览器动画测量与正式版操作验证。预览为`artifacts/violet-running-fixed.gif`、`artifacts/violet-launch-fixed.gif`，证据为`artifacts/violet-motion-fix-report.json`。新图使用内置图片生成，原始提示词与来源见[VIOLET-MOTION-ART.md](VIOLET-MOTION-ART.md)。

首次接入时9个测试文件239项检查通过。浏览器验证角色选择、刷新保留、六次独立右键、三枪时点、最后一枪换武器、四向姿态、1024×768菜单可达与无运行错误。原角色另外运行原有枪斗动作与正式版本回归脚本。

长期配装平衡、音效听感、低性能设备与其他浏览器尚未人工验收。
