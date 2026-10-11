# 增加武器、六式动作、近战敌人与反馈（0.4）

当前版本一次右键完整播放六式枪斗，动作规范见[GUNFU-0.4](GUNFU-0.4.md)。GunfuSystem驱动9个内部阶段和两次开火，ResonanceSystem按整套gunfuSequence去重。不要恢复0.3“主攻命中才接短体术”的门槛，也不恢复按Q消耗共鸣的循环。

## 新增普通Gun

在`src/data/weapons.ts`增加WeaponData：新id/displayName、element、description、gun、damage/attackRate/range/projectileSpeed/count/spread、击退、现有类型标识、skillId和sprite/icon。WEAPONS会自动出现在配装界面与Debug下拉列表，WeaponController无需修改。给`public/art/atlas.json`增加对应PNG矩形，并保持默认朝右、透明背景与正确pivot。

比如复制灰针数据为新记录，改名称、伤害和射速；不需要新建一份武器主脚本。技能定义同时决定满枪斗势时的强化终结：空中和落地两枪各37.5%，满势强化仅用于落地枪并沿用该技能形态的37.5%；普通枪械技能、近战、zone、strike复用已有执行器。强化出手消费满势并进入技能冷却；冷却未就绪时使用普通终结且保留满势。要增加全新技能机制，才给AttackSystem增加小型行为处理器与相应测试。当前支持的数据类别只有gun/shotgun/melee，不填尚未实现的beam等类型。

## 新增普通Melee

添加category=melee、range、arc/windup/active/recover、伤害与击退。projectileCount/speed设0；引用已有近战skill和独立刀PNG，继续由MeleeSystem扫描。视觉帧映射到相位，不能反过来用图集帧决定扣血。

刀作为副武器时自动终结呈现拔刀斩，作为当前武器时正常主攻仍可建立衔接机会。不要因枪斗术名称而把近战武器强制转换为枪。验证刀的有效期／后摇会阻止新的右键和手动换持，短滑步能取消动作而不会重置两槽冷却。

## 新增枪斗动作与枪斗势规则

在src/data/gunfu.ts添加或调整姿态、时长、接触点、范围、伤害与握持数据；在GunfuSystem推进阶段并处理取消。现有9阶段组成六式完整动作，总2.34秒，空中/落地各一次开火，末段恢复0.45秒。下劈、上撩、横扫、踢击分别3/3/4/6物理伤害，近身52–60范围，无元素。完美闪避和滑步是同一完整动作的入口，不缩短成一张打击姿态。

自动切换发生于落地第二枪成功出手，结束后保持新武器；物理挥空也继续整套动作并开两枪。两次射击实时读取鼠标方向，不自动改向附近目标。出手失败回滚换持、不吞满势。短闪、受击、死亡与调试替换可以取消，不能补发剩余子弹。腾空高度在Actor.action保存，DamageSystem按airborne判断免伤，不给精准奖励。

四次物理接触使用gunfu=body，两次开枪使用finisher且共享gunfuSequence。ResonanceSystem在整套任意一枪的首次有效命中加20，第二枪和多弹不再加；GunfuSystem以相同标识仅统计一次命中连招。精准时停成功另加20。普通攻击、体术、反应和次生伤害不回充；Q只调整换持。每次攻击内部仍保留chargeGranted和元素/原生效果去重。

新增动作测试至少覆盖主动确认、挥空、窗口过期、取消、保持瞄准、弹体容量失败回滚、一次资源奖励和满势消费时机。现有`tests/gunfu.test.ts`、`tests/combat.test.ts`分别覆盖连招路径和枪斗势／生命周期；不要用单纯调用内部award来替代真实攻击验证。

## 新增元素机制

武器effect支持普通溅射、原生跳电与减速；pierceMultiplier控制穿透衰减，muzzleLength对齐枪口。技能mode支持zone与strike，区域执行由AbilitySystem处理。element配对在data/elements.ts，具体控制／持续机制在ElementSystem。所有反应次生伤害须使用attacks.secondary，原生跳电使用directVariant并共享elementTargets/nativeTargets/reactionHits。原生溅射／跳电伤害使用nativeDamageScale以包含37.5%单枪倍率；反应仍使用damageScale保留其基础数值。区域first-touch、致命主命中、同攻击范围去重和控制保护不可跳过；参照`tests/elements.test.ts`。

敌人的印记、反应冷却、软减速、硬控、保护、熔痕与焰旋灼烧推进enemy时间，精准时停时必须保留剩余期限；新的伤害仍可即时附加状态。玩家留烬／落雷区域推进player时间，冻结敌人时仍可正常结算。这两类时间不可都改成presentation或真实浏览器时间，否则冻结期间会白白耗掉控制与印记。扩展持续机制应明确所属时间域，并测试冻结、恢复、暂停和结束清理。

新增透明武器图集字段weapons，使用独立索引器；旧index-assets保留该字段。生成记录及来源维护在IMAGE_GENERATION和ASSET_CREDITS中。

## 新增Enemy

同AI的数值变种优先扩展数据和kind标识；若要新增真正行为，在EnemyBrain加入一个小策略，复用Enemy实体和伤害组件。0.3敌人全部使用近战，历史kind仍为chaser/shooter/sniper，不得根据旧名称重新生成敌方子弹。EnemyData定义engageRange、attackRange、arc、windup、active、recover、lockLead和可选lunge；攻击由AttackSystem.requestEnemy统一交给MeleeSystem。

炭爪使用贴近扫击，炉眼使用宽弧重击，线棺锁方向后突刺。强化炉眼240HP，Enemy.attackCount=2；第一段及第二段之间仍占用出手名额。新增敌人应接入holdsAttackSlot和最多一只同时出手的协调规则，锁定后的突刺路径不能被群体避让悄悄改变。近战实际碰撞调用DamageSystem时才可传perfectEligible=true；普通弹体／区域／伤害夹具不允许刷精准奖励。

敌人图集id当前约定`${kind}_${frame}`，4帧同时用于移动与攻击阶段表现；若需要更多方向，扩展动画元数据，不复制Renderer和Enemy类。新波次修改`data/waves.ts`。验证全部敌方攻击来自近战、前摇方向锁定、出手名额、强化两段和时停冻结；参考`tests/melee-enemies.test.ts`。

EnemyData.radius按脚底占地宽度设置；hurtbox按可见身体配置radius、offsetY、halfLength与可选offsetX，坐标相对脚点。胶囊总高度为2×(radius+halfLength)，总宽度为2×radius。先打开碰撞诊断对齐头顶、躯干与脚底，再测试身体上部命中和轮廓外落空；不要把整个精灵高度简单变成一个大圆。

## 调整短滑步和精准时停

短滑步参数在`src/data/player.ts`的PLAYER_STATS：400速度、0.14秒、56像素、0.9秒冷却、前0.11秒免伤和前0.07秒完美窗口。PERFECT_DODGE_RULES定义0.30秒敌方冻结、0.12秒渐恢复、2秒active奖励间隔和恢复起点的0.08秒hurt保护。

TimeManager.requestEnemyFreeze返回是否成功，冻结／恢复／奖励间隔内不能叠加刷新。World以time.canRewardPerfect约束DamageSystem，再在perfectDodge事件成功开启冻结后通知GunfuSystem。freezeJustEnded只表示完整冻结转入渐恢复的一步脉冲，不能每帧重复给无敌。敌人钟为0时，EnemyBrain、敌方近战和敌人元素状态均不推进；玩家和presentation继续，全局hit stop仍会短暂停止双方动作。暂停与结束的行为见[architecture](architecture.md)。修改这些参数后运行`tests/dodge-freeze.test.ts`及相关集成测试，确认实际碰撞、单攻击／单滑步去重、debug/hurt无敌不刷奖励和帧率一致性。

## 新增GameFeel preset

修改`data/gameFeel.ts`增加stop/shake/duration/flash/particles/color/sound，调用`feel.play(id,position)`即可。音效ID在AudioManager配置。若新preset需要新的表现型，扩展EffectRenderer；不要让每把武器各写一份震动和顿帧。

## 换正式素材

先检查真实alpha、原图尺寸、四方向顺序、脚点和像素颗粒。AssetManager读取atlas的rect/size/pivot，替换图像不要求更改战斗逻辑。英雄run图和actions图分开，id为run_down_0/idle_down_0/dash_0/death_0等。

`scripts/index-assets.cjs`是本次高分辨率生成候选的矩形索引器，需要sharp；普通开发/运行不需要它。换标准固定帧图集时，直接提供标准rect和统一size/pivot即可，不必再运行该脚本。素材作者、来源、许可或生成记录均维护在ASSET_CREDITS。
