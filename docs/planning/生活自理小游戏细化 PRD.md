# **生活自理小游戏细化 PRD (特教升级版 & 代码驱动范式)**

## **1\. 文档定位与开发范式**

本文件是 daily-living（生活自理）训练入口下首批 5 个自定义小游戏的**细化实施规格**，供 AI 编程助手直接读取并执行。

阅读前提：

* 必须先完成 Phase 0 跨入口底座收口，daily-living 训练入口才能正常注册和落库。  
* 本文件是**实施规格**，不是“当前代码已实现现状”。

**⚠️ 核心开发范式提示（Code-Driven Visuals）：**

* **零外部图像依赖：** 本批游戏禁止依赖外部 .png 或 .jpg 文件。所有视觉元素（角色、物品、背景）必须使用纯 CSS 几何图形、内联 SVG 或 Iconify 开源图标库（如 @iconify/vue）实现，以满足高对比度、清晰轮廓的特教视觉要求。  
* **高性能交互基座：** 鉴于在桌面/大屏触控环境运行，**废弃原生 HTML5 drag API**。拖拽必须使用 VueUse 的 useDraggable 或基于 pointerdown / move / up 实现的自定义逻辑，并加入 300ms 防抖处理。

## ---

**2\. 训练入口注册**

在统一小游戏注册表中新增训练入口常量：

TypeScript

// src/data/custom-game-registry.ts

export const TRAINING\_ENTRY\_CODES \= {  
  // ...现有入口...  
  DAILY\_LIVING: 'daily-living',  
} as const

export type TrainingEntryCode \= typeof TRAINING\_ENTRY\_CODES\[keyof typeof TRAINING\_ENTRY\_CODES\]

export const MODULE\_CODES \= {  
  // ...现有模块...  
  DAILY\_LIVING: 'daily-living',  
} as const

## ---

**3\. 全局架构与特教体验约束**

以下约束适用于本批所有 5 个游戏，AI 助手在开发时必须严格遵守：

### **3.1 布局与运行环境**

* **默认运行场景：** 27 寸触摸大屏，**横向优先**布局。  
* **空间分配：** 主交互区位于中央或中偏左；说明与主按钮位于右侧或右下；状态 / HUD 位于左上独立信息区。  
* **沉浸模式：** 进入游戏后切换全屏沉浸式壳，隐藏平台主导航。  
* **可用性标准：** 所有可交互元素最小点击面积 ≥ 80×80 px。字体大小最小 28px，关键提示 ≥ 36px。

### **3.2 低感官模式 (Low Sensory Mode)**

必须全局监听 isLowSensoryMode 状态。当其为 true 时：

* **视觉：** 禁用结算时的剧烈粒子动画（如烟花），替换为静态的“大拇指”或“笑脸”SVG 放大缓动动画。关闭所有高频闪烁效果，替换为柔和的呼吸灯过渡。  
* **听觉：** 禁用背景音乐，仅保留极轻微的交互反馈音（如正确的“叮”声，且音量自动降低 50%）。

### **3.3 无错教学与真实评估 (Errorless Learning & Assessment)**

引入基于失败次数的递进式引导，**但必须严格记录辅助层级，防止“假阳性”数据污染 IEP 评估**。

* **辅助触发层级 (Prompt Level)：**  
  * **Level 1 (轻视觉辅助)：** 错误 1 次 \-\> 目标正确区域出现半透明虚影或轻微呼吸闪烁。  
  * **Level 2 (强视觉辅助)：** 错误 2 次 \-\> 目标区域常亮高亮，并出现动态 SVG 箭头持续指向目标位置。  
  * **Level 3 (物理辅助/自动完成)：** 错误 3 次 \-\> 系统用 CSS 缓动动画将物品自动移动到正确位置。  
* **数据与评分要求：** 触发的最高辅助层级必须写入 performanceData。若触发了 Level 3 辅助，该题/该局分数必须大幅扣减（或该子项记为 0 分），并在数据中标注 isAutoCompleted: true。

### **3.4 现实迁移闭环 (Generalization Bridge)**

特教游戏不能止步于屏幕。所有游戏在结算动画结束后，必须弹出一个**“现实任务提示卡”**（占满核心视觉区）：

* 视觉呈现：一张柔和的卡片，配合简单的 SVG 图标和文字。  
* 交互：必须由孩子或老师手动点击“去试试”或“完成”按钮才能真正退出游戏，强化记忆锚点。

### **3.5 统一失败/重试态定义 (Failure State Strategy)**

特教系统中**绝不出现“失败”、“错了”、“Game Over”**等强负面字眼和刺耳音效。

* 若因为超时、连续错误或未达标导致流程阻断：  
  * **视觉/文案：** 显示温和的插画（如挠头的小熊），文字统一使用：“我们再试一次吧”、“差一点点就成功了哦”。  
  * **交互：** 提供一个醒目的“重新开始”按钮（绿色或蓝色），以及一个“退出休息”按钮（灰色）。

## ---

**4\. 游戏注册表条目**

在注册表 metadata 中新增 cognitiveLoad（认知负荷）标识，用于后续教师筛选与难度自适应推荐。

TypeScript

const dailyLivingGames: CustomGameDefinition\[\] \= \[  
  {  
    gameCode: 'L01\_WASH\_HANDS',  
    name: '洗手小能手',  
    moduleCode: 'daily-living',  
    trainingEntryCode: 'daily-living',  
    entryPath: '/games/daily-living/wash-hands',  
    maxPlayers: 1,  
    requiredPermissions: \[\],  
    permissionPolicy: 'all\_required',  
    difficultyLocked: false,  
    badge: { badgeCode: 'BADGE\_WASH\_HANDS', badgeName: '洗手达人', visualThemeTag: 'daily-hygiene', iconToken: 'icon-soap-bubble', paletteToken: 'palette-aqua' },  
    metadata: { cognitiveLoad: 'low' }, // 动作模拟为主  
  },  
  {  
    gameCode: 'L02\_DRESS\_UP',  
    name: '我会穿衣服',  
    // ...  
    metadata: { cognitiveLoad: 'low' }, // 简单逻辑顺序  
  },  
  {  
    gameCode: 'L03\_BRUSH\_TEETH',  
    name: '刷牙小卫士',  
    // ...  
    metadata: { cognitiveLoad: 'low' }, // 空间定向轨迹  
  },  
  {  
    gameCode: 'L04\_SET\_TABLE',  
    name: '摆桌子帮帮忙',  
    // ...  
    metadata: { cognitiveLoad: 'medium' }, // 空间+社会化情境  
  },  
  {  
    gameCode: 'L05\_PACK\_BAG',  
    name: '上学包包装一装',  
    // ...  
    metadata: { cognitiveLoad: 'high' }, // 工作记忆+情境推理+干扰排查  
  },  
\]

## ---

**5\. 游戏细化规格**

### **6.1 L01\_WASH\_HANDS · 洗手小能手 (双阶段模型)**

**训练目标：** 建立洗手真实认知，动作规划。

**现实迁移卡：** “去试试真的洗手吧 👋”

**游戏流程规格：**

* **Phase 1：认知排序（前置引导）**  
  * 仅提供 3 个核心步骤图标（打湿、打泡、冲洗），直接使用 Iconify 或内联 SVG。  
  * 拖拽至 3 个空槽，全对后立刻触发平滑过渡进入 Phase 2，不计入核心能力分。  
* **Phase 2：具身操作（核心模拟）**  
  * **开水：** 点击水龙头，通过 CSS 动画流出半透明蓝色水柱。  
  * **打湿：** 将双手拖至水柱下，判定区域重叠后，双手 SVG 变色表示湿润。  
  * **打泡：** 点击旁边的皂液器，双手叠加白色圆形散点图层（代表泡沫）。  
  * **搓洗：** 引导儿童在双手区域左右来回滑动，累计滑动距离达 2000px 视为搓洗完成。  
  * **冲洗：** 再将手放回水柱下，泡沫图层 opacity 渐变至 0。关闭水龙头触发结算。

**数据采集 (performanceData):**

TypeScript

interface WashHandsPerformance {  
  difficulty: 1 | 2 | 3  
  highestPromptLevel: 0 | 1 | 2 | 3  // 记录最高辅助层级  
  isAutoCompleted: boolean           // 是否由系统代劳完成  
  phase2ActionTimes: {             
    wetHandsSec: number  
    soapApplySec: number  
    scrubbingSec: number  
    rinseSec: number  
  }  
  totalDurationSeconds: number  
}

### **6.2 L02\_DRESS\_UP · 我会穿衣服 (层级与遮挡)**

**训练目标：** 掌握穿衣顺序与遮挡关系。

**现实迁移卡：** “看看今天穿了什么衣服 👕”

**交互规格：**

* **基底视觉：** 屏幕中央使用简单纯色几何或卡通轮廓作为模特。右侧列表展示 SVG 格式衣物。  
* **绝对层级约束 (Z-index 约定)：**  
  * 内衣: z-index: 10 | 袜子: z-index: 15 | T恤: z-index: 20 | 裤子: z-index: 25 | 外套: z-index: 30  
* **无错拦截策略：**  
  * 尝试跨层级穿戴，衣物弹回列表。内衣背景呈现绿色柔和呼吸闪烁，弹出气泡：“先穿最里面的哦”。

**数据采集 (performanceData):**

*结构同 L01，包含 highestPromptLevel 与 isAutoCompleted。*

### **6.3 L03\_BRUSH\_TEETH · 刷牙小卫士 (运动计划)**

**训练目标：** 训练手部特定方向的运动规划 (Motor Planning)。

**现实迁移卡：** “去卫生间找找自己的小牙刷 🪥”

**交互规格：**

* **视觉层：** 底图为张嘴（SVG），覆盖 Canvas 绘制的淡黄色“脏污层”。  
* **区域定向引导：** 按顺序激活四大区域，显示对应的**动态节拍箭头**（如上下箭头、横向箭头）。  
* **方向权重擦除算法：** 滑动方向与提示箭头夹角 \< 45°，擦除半径 r \= 30px；若夹角过大（方向错误），擦除半径降为 r \= 5px，隐性鼓励纠正轨迹。

**数据采集 (performanceData):**

TypeScript

interface BrushTeethPerformance {  
  finalCoveragePercent: number  
  directionalAccuracyScore: number  // 运动轨迹正确率得分  
  highestPromptLevel: 0 | 1 | 2 | 3  
  isAutoCompleted: boolean  
  durationSeconds: number  
}

### **6.4 L04\_SET\_TABLE · 摆桌子帮帮忙 (社会化情境)**

**训练目标：** 空间锚点认知与基本餐前家庭参与感。

**现实迁移卡：** “帮家人拿一下筷子吧 🥢”

**交互规格：**

* **情境视觉：** 顶部明确提示“家人要吃饭啦，把碗放在这里”。桌面使用纯 CSS 绘制。  
* **虚影提示 (Ghost Anchors)：** 餐垫区域正确位置渲染对应餐具的淡白色半透明虚影。  
* **磁吸缓动体验：** 距离锚点 ≤ 50px 时触发吸附。必须使用 CSS transition: transform 0.2s ease-out 平滑归位。

**数据采集 (performanceData):**

*结构同上，重点记录错误放置次数及 highestPromptLevel。*

### **6.5 L05\_PACK\_BAG · 上学包包装一装 (执行功能推理)**

**训练目标：** 执行功能（EF）逻辑推理，情境决策。

**现实迁移卡：** “去看看你自己的小书包里面有什么 🎒”

**交互规格：**

* **Phase 1：情境解析**  
  * 难度 2/3 提供情境卡片：如下雨背景（需带雨伞）、操场跑道（需带运动鞋）。  
* **Phase 2：干扰筛选**  
  * 散落区混入强干扰项（如电动玩具）。物品使用系统 Emoji（🍎 📚 🧦）或 Iconify。  
* **Phase 3：温和复盘**  
  * 若装入了玩具，提示：“玩具留在家等我放学哦”。  
* **动态评分系统（严惩“系统代劳”）：**  
  * 满分 100。基础分为目标物品装入率。装错干扰项轻微扣分。  
  * **惩罚机制：** 每触发一次 Level 1/2 提示，单项物品分值折损 20%。若某物品触发 Level 3（自动完成），该物品得分为 0，防止假阳性高分。

**数据采集 (performanceData):**

TypeScript

interface PackBagPerformance {  
  requiredItemCount: number  
  correctlyPackedCount: number  
  wrongItemCount: number  
  contextUnderstandingScore: number // 情境推理得分  
  highestPromptLevel: 0 | 1 | 2 | 3 // 整个游戏达到的最高辅助层级  
  promptCount: number               // 触发提示的总次数  
  isAutoCompleted: boolean  
  score: number                     // 折算提示惩罚后的真实得分  
}

## ---

**6\. 共享资源与组件规范**

* **无图片依赖：** 统一通过 Iconify 引入，建议使用形变清晰的库（如 mdi 或 twemoji）。  
* **音效库：** 放于 src/assets/sounds/daily-living/，统一通过 useSoundManager() 调用。

## **7\. 路由注册**

（维持原注册表路径不变）

## **8\. 验收标准**

* \[ \] IEP 评估数据保真度：触发 Level 3 辅助（自动完成）的记录，其分数必须受到严重扣减，且 isAutoCompleted 必须为 true。  
* \[ \] 所有游戏在结算动画后，必须出现“现实任务提示卡”，且必须手动点击退出。  
* \[ \] 注册表中包含 cognitiveLoad 元数据字段。  
* \[ \] 测试故意不操作或错误操作，确认系统能按照 1 \-\> 2 \-\> 3 级辅助平滑介入。  
* \[ \] 失败/超时情况下，不出现任何负面词汇，引导温和重试。