# C05 与 L01-L05 视觉重做计划

> 文档类型：现行专题规划
> 状态：当前有效
> 最后更新：2026-04-17
> 适用范围：`C05_MOOD_METER`、`L01_WASH_HANDS`、`L02_DRESS_UP`、`L03_BRUSH_TEETH`、`L04_SET_TABLE`、`L05_PACK_BAG`

## 1. 文档目的

本文件用于把当前已经落地的 `C05_MOOD_METER` 与 `life-skills` `L01-L05` 最小可运行实现，收敛为下一轮会话可直接执行的视觉重做约束。

它回答的是：

- 当前 UI 为什么“不够用”
- 哪些游戏不适合继续靠纯 `CSS` 几何块硬撑
- 哪些游戏仍然适合走 `SVG`，但必须升级为正式资产
- 下一轮应按什么顺序重做
- 哪些代码与记录摘要必须保留，不能在视觉重做时打断

本文件**不是**新的玩法 PRD，也**不是**重做 `Phase 0` 底座。

## 2. 当前代码现实

截至 `2026-04-17`，以下事实已经成立：

- `C05_MOOD_METER` 与 `L01-L05` 的：
  - 注册表
  - 页面路由
  - 页面壳
  - 可运行小游戏组件
  - 完成/中断记录写入
  - 记录详情摘要
  已经接通。
- 当前逻辑验证结论：
  - 大逻辑已通过人工验证
  - 主要问题集中在**视觉质量与场景可信度**
- 当前 6 个新游戏的视觉实现现实：
  - 大量依赖 `prototype-game-shared.css`
  - 大量使用 `CSS` 渐变、圆角块、伪几何图形、系统 emoji 充当正式美术
  - 部分游戏把“真实物体/身体部位/空间场景”直接用程序化块面拼出来

当前相关实现主要落在：

- `src/components/emotional/games/MoodMeterGame.vue`
- `src/components/emotional/games/WashHandsGame.vue`
- `src/components/emotional/games/DressUpGame.vue`
- `src/components/emotional/games/BrushTeethGame.vue`
- `src/components/emotional/games/SetTableGame.vue`
- `src/components/emotional/games/PackBagGame.vue`
- `src/components/emotional/games/prototype-game-shared.css`

## 3. 核心判断

### 3.1 不是 “SVG 不行”

真正的问题不是 `SVG` 本身，而是当前实现把：

- `CSS` 占位块
- 程序员式几何拼图
- emoji 直出

当成了正式可交付视觉。

### 3.2 视觉技术分工应固定为三层

下一轮必须改成下面的职责分工：

- `CSS`
  - 只负责布局、间距、HUD、卡片、按钮、状态条、转场、响应式
- `SVG`
  - 负责角色、衣物、牙齿、手、餐具、书包、温度计等**正式静态视觉资产**
- `Canvas`
  - 只负责必须依赖连续笔触/流体/擦除/覆盖率计算的交互层

一句话：

- `CSS` 负责“界面”
- `SVG` 负责“物体”
- `Canvas` 负责“动作反馈”

## 4. 逐游戏判断

### 4.1 `C05_MOOD_METER`

结论：

- 仍适合走 **UI-first 的 `CSS + SVG`**

原因：

- 它本质上是：
  - 选择卡片
  - 温度区间
  - 安抚卡流程
- 它不像洗手/刷牙那样要求高拟真的身体动作模拟

重做要求：

- 保留卡片式交互和温度流程
- 去掉当前大面积“玻璃卡 + 渐变块 + emoji 主视觉”的占位感
- 增加正式的：
  - 情绪角色插画
  - 温度计 SVG
  - 安抚卡图标系统

不需要：

- 引入 Canvas 主交互层

### 4.2 `L01_WASH_HANDS`

结论：

- **不适合继续靠纯 CSS 造型**
- 必须改成 **正式 SVG 资产 + 少量 Canvas/动画辅助**

原因：

- 它包含明确的真实物体与身体部位：
  - 水龙头
  - 水流
  - 双手
  - 泡泡
  - 洗手池
- 用户会天然拿它和现实洗手动作比对
- 纯 CSS 几何块很容易看起来像 demo，而不是训练游戏

重做要求：

- 水龙头、洗手池、双手、皂液器改成正式 SVG
- 水流、泡泡、搓洗反馈可继续保留为程序化动画
- HUD 和步骤卡保留平台化样式，但主舞台视觉必须改成插画资产

### 4.3 `L02_DRESS_UP`

结论：

- **不适合继续靠 CSS 拼“人”和“衣服层”**
- 适合改成 **分层 SVG 角色 + 分层衣物资产**

原因：

- 穿衣顺序训练的可信度高度依赖：
  - 人物轮廓
  - 衣物形状
  - 叠穿遮挡关系
- 当前块面层叠只能表达“顺序”，很难表达“穿衣”

重做要求：

- 角色底模改成标准 SVG
- 各衣物拆成单独 SVG asset
- 通过层级控制遮挡，而不是让 CSS 色块代替衣物
- 天气情境可以保留在旁侧信息卡，不必做成大场景图

### 4.4 `L03_BRUSH_TEETH`

结论：

- **不适合继续靠 CSS 画口腔和牙刷**
- 应改成 **SVG 主舞台 + Canvas 脏污/刷动反馈**

原因：

- 这是典型“动作轨迹 + 覆盖率”游戏
- 视觉可信度依赖：
  - 嘴型
  - 牙面区域
  - 牙刷方向
- 交互可信度依赖：
  - 脏污被刷掉
  - 不同方向的刷动反馈

重做要求：

- 嘴、牙齿、牙刷、区域箭头改成正式 SVG
- 脏污层和覆盖率计算放到 Canvas
- 不再让程序化矩形牙齿承担正式视觉

### 4.5 `L04_SET_TABLE`

结论：

- 可以继续走 **UI + 平面场景型 `CSS + SVG`**
- 但必须从“占位式几何桌面”升级到“正式桌面插画”

原因：

- 它的核心是空间锚点和摆放，不需要高拟真的人体动画
- 但餐具、桌面、餐垫、虚影如果太像占位块，会直接拉低完成度

重做要求：

- 桌面、餐垫、餐具全部改成正式 SVG
- 餐位锚点保留 ghost anchor 机制
- 允许继续使用 CSS 做卡片/布局/高亮

### 4.6 `L05_PACK_BAG`

结论：

- 可以继续走 **信息架构驱动的 `CSS + SVG`**
- 但必须把书包与情境视觉从“图标堆叠”升级为正式插画系统

原因：

- 它本质上更像“情境判断 + 物品筛选”
- 重点不在复杂物理模拟，而在：
  - 情境卡
  - 物品辨识
  - 装包结果反馈

重做要求：

- 书包主体改成正式 SVG
- 情境卡增加正式插画背景
- 物品图标统一一套风格，不再混用系统 emoji 作为主视觉

## 5. 重做优先级

下一轮不要六个一起平均改。

推荐顺序：

### Wave A：先改最不适合纯 CSS 的三项

1. `L01_WASH_HANDS`
2. `L02_DRESS_UP`
3. `L03_BRUSH_TEETH`

原因：

- 这三项当前违和感最强
- 都属于“身体/物体/动作模拟类”
- 继续在现有块面上修饰，投入产出比很差

### Wave B：再统一优化 UI-first 的三项

4. `C05_MOOD_METER`
5. `L04_SET_TABLE`
6. `L05_PACK_BAG`

原因：

- 这三项更接近“卡片 + 场景 + 轻交互”
- 结构可以保留，重点是升级视觉资产与整体风格

## 6. 下一轮必须保留的实现边界

视觉重做时，不要把已经接好的业务链路打回去。

必须保留：

- 当前路由路径不变
- `custom-game-registry` 中的 `gameCode / entryPath / trainingEntryCode` 不变
- 当前完成/中断记录写入链路不变
- 当前 `performanceData` 主字段尽量延续
- 当前 `GameRecordDetail.vue` 摘要分支继续可读

可以替换：

- 组件内部主舞台视觉
- 组件内部交互控件样式
- asset 组织方式
- `prototype-game-shared.css` 的视觉语言

## 7. 资产与代码组织建议

建议下一轮按下面方式收口：

### 7.1 资产目录

建议新增：

- `src/assets/custom-games/mood-meter/`
- `src/assets/custom-games/life-skills/wash-hands/`
- `src/assets/custom-games/life-skills/dress-up/`
- `src/assets/custom-games/life-skills/brush-teeth/`
- `src/assets/custom-games/life-skills/set-table/`
- `src/assets/custom-games/life-skills/pack-bag/`

### 7.2 共享样式

当前 `prototype-game-shared.css` 只适合临时原型，不适合继续作为正式视觉基线。

下一轮建议：

- 保留一份共享游戏壳样式
- 但拆掉“统一玻璃卡原型风格”
- 只留下：
  - 沉浸式舞台布局
  - HUD 栅格
  - 响应式断点
  - 通用按钮/状态区基础骨架

### 7.3 emoji 使用规则

下一轮应把 emoji 降级为：

- 辅助提示
- 文案陪衬
- fallback 图标

不要再让 emoji 充当：

- 主角色
- 主道具
- 主舞台视觉

## 8. 验收标准

进入下一轮实现时，至少要满足这些验收标准：

- [ ] `WashHands / DressUp / BrushTeeth` 不再以纯 CSS 几何块承担主体物体造型
- [ ] `MoodMeter / SetTable / PackBag` 的主视觉不再以 emoji 充当正式资产
- [ ] 视觉重做后不改变现有路由、落库和记录摘要链路
- [ ] 沉浸式页面仍完整铺满可视区，不露出 `Layout` 黑底或外层背景
- [ ] 页面视觉风格从“原型页面”提升为“正式训练游戏”
- [ ] 教师一眼能看出当前游戏在模拟什么真实任务，而不是先猜几何块代表什么

## 9. 给下一轮 Codex 的建议读取顺序

如果下一轮直接进入视觉重做，建议先读：

1. `AGENTS.md`
2. `.continue-here.md`
3. `docs/planning/2026-04-17-custom-games-visual-rework-plan.md`
4. 当前目标游戏组件文件

建议下一轮提示词：

```text
继续 SCGP，自定义小游戏视觉重做。

先读：
1. AGENTS.md
2. .continue-here.md
3. docs/planning/2026-04-17-custom-games-visual-rework-plan.md

任务：
- 不改路由、注册表、落库、记录摘要链路
- 只重做 C05_MOOD_METER 与 L01-L05 的视觉实现
- 先从 WashHands / DressUp / BrushTeeth 开始

约束：
- CSS 只负责布局和界面骨架
- SVG 负责正式物体/角色/道具
- Canvas 只在需要连续动作反馈时使用
- 不再使用 emoji 或 CSS 几何块充当正式主视觉
```
