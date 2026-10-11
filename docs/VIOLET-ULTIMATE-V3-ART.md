# 紫鸢特写：大剑回旋收尾

使用内置 imagegen，透明背景，角色参考 violet-ultimate-cut-source-v2.png，武器参考 violet-slash.png。

前12帧从第二版512×512图集直接保留，构建脚本校验原始像素完全相同。后12帧替换为握剑、蓄势、转身回旋、横斩、刀光爆发、微笑收剑。原图1536×1024，4列3行；按实际行界0/340/644/1024拆分，补齐384方形并以同一倍率最近邻放大至512，不按各帧包围盒缩放。最终图集6列4行，共24帧。

战场角色3.6–4.3秒同步回旋，4.08秒仍为原终击伤害时刻。收势使用巨刃准备姿势。整体4.8秒、五次伤害、两次元素附着和能量机制保持原数值。

素材：public/art/violet-ultimate-cut-sword-source-v3.png；public/art/violet-ultimate-cut-v3.png；public/art/violet-ultimate-cut-v3.json。

构建：scripts/build-ultimate-cut-v3.cjs。实机演出预览：artifacts/紫鸢-紫夜终幕-v3.gif。

验证：316项回归测试通过，类型检查及正式构建通过；实际R键释放时24帧全部绘制，32帧特效全部绘制，左右布局正常，无页面错误。图集前12帧与第二版逐像素一致。

## 最终提示词

```text
Use case: identity-preserve.
Asset type: transparent pixel anime game portrait animation sprite sheet, 12 sequential frames, EXACTLY FOUR columns by THREE rows, uniform square cells, row-major playback.
Input image 1: identity, face and clothing reference from the existing Violet portrait sheet. Input image 2: giant purple crystal greatsword design reference. Create a replacement ending sequence only, with the same adult heroine, lavender long hair, purple eyes, black-violet crystal crown and ribbon, black gloves, white frilled black-violet dress and flowing cape, finely rendered crisp pixel anime shading. Keep the portrait HEAD SIZE the SAME as reference 1, upper-body waist-up framing; never switch to tiny full-body sprites.
Primary request: Violet performs one continuous dramatic greatsword SPINNING SLASH, with two-handed grip and clear torso rotation. No firearms anywhere. 12 frames:
1 reaches toward the greatsword at shoulder while facing front with a cute confident smile;
2 both hands grip the hilt;
3 raises broad crystal blade diagonally over shoulder;
4 coils torso into a three-quarter view, blade behind;
5 side view beginning the spin;
6 back-three-quarter turn with long hair and cape trailing;
7 back view, sword sweeps horizontally around her;
8 opposite side view, broad blade comes around;
9 returns to front-three-quarter, committed swing, hair and cape lagging behind;
10 wide horizontal cut accelerating across the foreground;
11 strong front-facing slash impact pose, luminous ivory/lilac angular sword trail, determined bright eyes;
12 follow-through with blade lowered diagonally, cute proud smile and settling hair/cape.
Weapon is a TWO-HANDED broad jagged dark violet crystal GREAT SWORD much larger than her torso, exactly one sword, same weapon across all frames. Do not confuse sword blade with barrel. Include actual blade silhouettes in all attacking frames, not just glowing arcs. Pose-to-pose rotation anatomically coherent, same head and torso proportions and position, no zoom jumps. Leave adequate empty padding inside every cell so weapon/hair/effects never bleed into neighbouring cells. Allow sword partially cropped at cell edge for close-up framing, but never crop heroine's face. Blade silhouette and swept trail readable even at game size.
Background: genuine transparent alpha throughout empty areas. No floor, no gradient panel, no cell borders, no labels, no text, no watermark, no extra characters. No pistols, guns, rifle, gun barrel, muzzle flash or firing poses. Preserve pixel art, not smooth vector or 3D.
```
