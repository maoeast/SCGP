# 社交 · 精细 · 安抚游戏包 — 细化开发规范与 PRD

**文档定位**：在 SCGP Emotion Games Pack 全局架构约束基础上，对"社交沟通"、"精细动作"、"情绪安抚"三大类 15 款小游戏进行需求细化与开发实施约束。
**适用场景**：学校融合教育课堂，主交互设备为**触屏显示器**（桌面大屏 / 壁挂触屏一体机），兼顾鼠标操作。
**继承约束**：全部遵循 SCGP PRD 第一章的工程约束（SVG/Canvas 优先、GameContainer 复用、特教无障碍规范、版权洁净、三级难度状态机）。

---

## 一、全局约束与工程架构绑定（Code Agent 必读）

为确保 AI 辅助编程及后续人工维护的代码高度一致，所有新增游戏必须严格遵循现有 `emotional` 模块的架构契约。

### 1.1 触屏显示器专项适配与视觉约束
| 特性 | 约束要求 |
|---|---|
| **屏幕尺寸** | 基准 1920×1080，必须响应式布局（`vh/vw` 或百分比）。 |
| **触控方式** | 热区 ≥ 80px；无鼠标悬停（hover），禁止将核心交互提示依赖 `:hover` 实现。 |
| **多点触控** | 最多支持 10 点同时触控。合作游戏须用 Grid 划分逻辑区域，互不干扰。 |
| **站立使用** | 避免核心可交互元素位于屏幕最底部 15% 区域。 |
| **视觉风格** | 暖色系卡通风格（参考现有 G01/G04 游戏）；使用 `GameContainer` 的 `#94d8ff → #dff4ff → #fff9e5` 背景渐变体系。 |
| **无障碍** | 对比度 ≥ 4.5:1，暂停状态所有动画必须响应 `[data-paused='true']` 的 `animation-play-state: paused`。 |

### 1.2 文件结构与路由约定
每个新游戏必须由以下核心文件构成：
1. **Page 组件**：`src/views/emotional/games/{GameCodePascalCase}Page.vue`
   - 职责：路由页面级入口，解析 Query 参数，向 `GameContainer` 传递 `student-id`、`game-code` 等。
2. **Game 组件**：`src/components/emotional/games/{GameCodePascalCase}Game.vue`
   - 职责：承载游戏核心逻辑和渲染。必须作为插槽内容放入 Page 的 `GameContainer` 中。
3. **路由注册**：`src/router/index.ts`（或其他路由模块化文件）内新增。
   - 路径规范：`/emotional/game/{kebab-case-name}`。
   - 参数：`studentId`, `studentName`, `difficulty`, `module`。

### 1.3 GameContainer 插槽契约
所有新游戏外侧必须包裹 `GameContainer.vue`。Game 组件必须通过作用域插槽接收以下参数并正确响应：
```typescript
interface GameSlotProps {
  difficulty: 1 | 2 | 3;
  settings: EmotionGameSettings; // 音量、特效开关
  isPaused: boolean; // 监听此值暂停内部所有的定时器、动画和事件
  completeGame: (payload: EmotionGameCompletionPayload) => Promise<void>; 
  markRoundDirty: () => void; // 用户执行首次有效操作时调用，标记此局为"已开始且有数据"
  audio: EmotionGameAudioController; // 全局音频控制器
}
```

### 1.4 回调与数据载荷规范 (EmotionGameCompletionPayload)
游戏结束时调用 `completeGame` 应传递以下结构：
```typescript
{
  performanceData: {
    // 必须包含此游戏定义的所有特定字段（见各游戏明细）
    completion_time_ms: number;
    // ...
  },
  badge?: {
    badgeCode: 'BADGE_XXXX',
    badgeName: 'XX徽章'
  }
}
```

### 1.5 数据库与类型定义层扩展
1. **类型扩展**：`src/types/emotional/games.ts` 中的 `EmotionGameCode` 联合类型需追加新定义的 game_code。
2. **Schema 迁移**：
   - 必须通过 `src/database/emotional-games-api.ts` 和 `init.ts` 进行运行时的表迁移。
   - 迁移策略必须使用 `ALTER TABLE RENAME TO _old; CREATE TABLE ...; INSERT INTO ... SELECT * FROM _old; DROP TABLE _old`，安全地扩展 `game_emotion_records` 和 `student_badges` 的 `game_code` CHECK 约束。

---

## 二、第一类：社交沟通与互动游戏 (Social Communication)

**整体设计核心**：轮流（Turn-taking） + 指令理解 + 观点采择。

---

### S01 · 合作造汉堡 🍔 (S01_BURGER)

#### 2.1 教学目标与难度映射

| 维度 | L1 简单 | L2 中等 | L3 困难 |
|---|---|---|---|
| **认知** | 识别 3 种极基础食材名称 | 理解"排除项"指令（不加洋葱） | 处理复合+顺序+特殊备注 |
| **行为指标** | 能点按闪烁的食材，由系统自动组合 | 可正确通过便利贴拖拽下发含有 1 个排除项的订单 | 15s内完成记忆+多达8种食材按序层叠 |

#### 2.2 玩法流程及状态机
**状态字典**：`idle -> ordering -> making -> checking -> win/fail -> idle`
1. **进入(idle)**：屏幕划分为 2 列 Grid，左侧顾客（点单区），右侧厨师（食材区+托盘）。
2. **引导(ordering)**：顾客生成订单要求。L1 自动闪烁并语音播报；L2/L3 需孩子自行拖拽"订单卡"。
3. **制作(making)**：厨师侧触发 `markRoundDirty()`，开始拖拽食材堆叠（以 Stack 数组管理）。
4. **校验(checking)**：对比制作栈和订单需求，符合则进入 `win`（触发撒花动画与 `completeGame`），不符合则进入 `fail`（语音轻柔提示"顺序不对哦"，清空托盘重试）。

#### 2.3 关键规格
- **SVG 素材要求**：底座面包、顶层面包、肉饼、番茄、生菜、芝士、洋葱等各 1 个（基准 120px 大小），收银机 1 个。
- **performance_data**：
  ```typescript
  {
    total_orders_made: number,
    errors_count: number,
    avg_order_time_ms: number,
    max_ingredients_handled: number // 单个订单最多处理了几个食材
  }
  ```
- **错误/边界处理**：不支持双指触控时降级为单人轮流点击（不再强制左右防抖卡死）。

---

### S02 · 表情猜猜乐 🎭 (S02_EMOTION_MIRROR)

#### 2.1 教学目标与难度映射

| 维度 | L1 简单 | L2 中等 | L3 困难 |
|---|---|---|---|
| **认知情绪** | 区分开心 vs 难过（强烈对比） | 识别无聊、紧张等次级混合状态 | 理解同时存在冲突情感（悲喜交集） |
| **行为指标** | 2选1无误选 | 4选1正确并听懂反馈 | 6选项中正确钩选全部合理的多选组合 |

#### 2.2 玩法流程及状态机
**状态字典**：`idle -> presenting_scenario -> awaiting_choice -> evaluating -> reveal -> idle`
1. **场景展示(presenting)**：中间大屏幕展示一张 SVG 情景插画。
2. **选择(awaiting)**：底部展示表情选项气泡（L1 是 2 个，L3 是 6 个多选按钮）。
3. **判定(evaluating)**：匹配预设的正确表情集合。
4. **揭示(reveal)**：选错温和摇头；选对展示放大特效与对应语音解释"他确实有点紧张"。

#### 2.3 关键规格
- **性能规范**：`performance_data`：
  ```json
  { "scenario_count": 3, "correct_first_try": 2, "help_hints_used": 0 }
  ```
- **技术实现**：多选模式须维护 `selectedIds: Set<string>` 状态并在点击"确认"时做集合求交比对。

---

### S03 · 故事接龙板 🧩 (S03_STORY_SEQ)

#### 2.1 教学目标与难度映射

| 维度 | L1 简单 | L2 中等 | L3 困难 |
|---|---|---|---|
| **逻辑推理** | 依照明显数字序号完成3步连线 | 根据事件因果排布4步无序号故事 | 排除干扰项完成5+步复杂时序图 |
| **行为指标** | 借助系统闪烁成功排布3张卡片 | 独立完成4张卡排序并能聆听故事 | 成功剔除1张干扰卡并排序剩余卡 |

#### 2.2 玩法流程及状态机
**状态字典**：`shuffled -> dragging -> snap -> checking_sequence -> playing_story`
1. 底部是散落的故事卡片（Svg draggable），中间是相应数量的插槽。
2. 孩子拖拽卡片吸附到插槽。L1 错误会有排斥力（弹回）。
3. 填满后系统判定顺序。正确则进入动画模式 `playing_story`，自动将卡片放大依序展示并配合 `audio.speak` 播放旁白。

#### 2.3 关键规格
- **performance_data**: 
  `{ sequence_length: number, wrong_placements: number, distraction_card_identified: boolean }`

---

### S04 · 礼物分享派对 🎁 (S04_GIFT_MATCH)

#### 2.1 教学目标与难度映射
| 级别 | 小动物数量 | 礼物干扰项 | 心愿气泡呈现方式 |
|---|---|---|---|
| **L1 简单** | 2 只，心愿常驻展示 | 0 | 语音伴随+大图直接对应 |
| **L2 中等** | 3 只，引入颜色和形状双重匹配 | 1 个相似干扰项 | 气泡5秒后消失，需短期记忆 |
| **L3 困难** | 4 只 | 2 个干扰项 | 传送带下发，有反应时间压力 |

#### 2.2 玩法流程及状态机
处于 `active` 状态时，场景呈现多个动物等待。
L3 下上方 Canvas/SVG 传送带随 `requestAnimationFrame` 步进。将礼物拖到动物头像坐标判定重叠面积 (`getBoundingClientRect`) 激活投喂效果。

#### 2.3 关键规格
- **performance_data**: `{ total_gifts_delivered: number, mistaken_matches: number, average_match_time_ms: number }`

---

### S05 · 动物传声筒 🎤 (S05_ECHO_PARROT)

> **前置检查**：依赖麦克风权限。如果拒绝或捕获失败，UI 必须给出"需要老师帮助开启麦克风"的文案，禁止崩溃跳出。

#### 2.1 教学目标与难度映射
| 级别 | 触发类型 | 游戏反馈 |
|---|---|---|
| **L1** | 任意声音破阈（低阈值） | 鹦鹉开心回放并跳舞，降低开口门槛 |
| **L2** | 需保持 1s 连续声音 | 机器人/怪兽音变声，激发探索欲 |
| **L3** | 限定词卡发声 | 利用 `SpeechRecognition`（若可用）匹配词汇，部分匹配也算过关 |

#### 2.2 关键规格
- **技术绑定**：使用 `MediaRecorder` 和 `AudioContext` （BiquadFilterNode 变声）。音频直接存在内存中不写库。
- **performance_data**: `{ sound_triggers_count: number, max_duration_ms: number, utilized_voice_filters: string[] }`

---

## 三、第二类：精细动作与手眼协调游戏 (Fine Motor)

**整体设计核心**：目标定位 + 路径控制 + 时序协调。重点记录用户的轨迹平滑度、反应时间等底层触控特征。

---

### F01 · 云朵擦擦擦 ☁️ (F01_CLOUD_ERASE)

#### 3.1 教学目标与难度映射
| 级别 | 难度设计 | 教学层目标 |
|---|---|---|
| **L1** | 极薄云层，50%透明，擦除60%即可 | 建立"我的手能改变屏幕画面"的因果关联，鼓励大幅肢体动作。 |
| **L2** | 80%云层，找3只动物，需大面积擦除 | 培养持续输出动力的耐力。 |
| **L3** | 双层云层并会有微慢恢复机制 | 提升空间覆盖规划能力。 |

#### 3.2 玩法与技术规格
- **核心机制**：双层 Canvas，上层遮罩云层，下层目标图案。使用 `globalCompositeOperation = 'destination-out'` 绘制用户轨迹，挖空底层。
- **采集频率**：不宜每帧扫描像素，采用每隔 500ms 抽样 Canvas 的 `getImageData` 来统计透明像素占比（计算 `coverage_percent`）。
- **performance_data**: `{ coverage_percent: number, total_strokes: number, avg_stroke_length_px: number }`

---

### F02 · 连线小星座 ⭐ (F02_STAR_TRACE)

#### 3.1 教学目标与难度映射
| 级别 | 点数量 | 引导提示 | 容错半径（热区） |
|---|---|---|---|
| **L1** | 3靠近点| 脉冲光+长存数字 | ±40px (极大宽容) |
| **L2** | 5点小狗| 触摸后即消失的数字 | ±25px |
| **L3** | 8点火箭| 无提示序列，错连才闪烁 | ±15px |

#### 3.2 玩法与技术规格
- **状态管理**：`expectedNextStarIndex`
- **视觉**：使用 SVG `<path>` 搭配 `stroke-dasharray/dashoffset` 和 `transition` 做出"画线流光"效果，而非点到点生硬瞬现。
- **performance_data**: `{ total_stars: number, errors: number, avg_accuracy_distance_px: number }`

---

### F03 · 分拣小能手 ♻️ (F03_RECYCLING)

**机制**：顶部掉落物体，底部有几个分类框。拖动物体分配。通过 CSS `translateY` 处理下落（性能好），当受到 `touchstart` 拦截时，置 `transition: none`。
- **L1** 2类无时间压力 ；**L2** 3类有落底3次限制； **L3** 4类+垃圾类别快速掉落。
- **performance_data**: `{ sorted_correct: number, sorted_wrong: number, missed_count: number }`

---

### F04 · 轨道修补匠 🚂 (F04_TRACK_BUILD)

**机制**：视觉空间配对。
- **L1/L2/L3** 主要区别在缺口位置差异度，和是否需要进行**多指旋转（双指 Pinch/Rotate 或控制杆）**。单指支持时允许界面提供左右旋转按钮给缺乏双指功能的孩子。
- **performance_data**: `{ pieces_placed: number, rotations_attempted: number, errors: number }`

---

### F05 · 刺破慢气球 🎈 (F05_BALLOONS)

**机制**：
- **L2** 引入"抑制-控制(Inhibition Control)"：混杂普通气球与带有特定图案（如星星）的气球，只允许戳破星星气球，戳错会提示温和语音。
- **performance_data**: `{ correct_hits: number, false_alarms (戳错): number, missed_targets: number }`

---

## 四、第三类：情绪安抚与自我调节游戏 (Calming)

**设计核心**：零失败概率（Zero Failure）、无计时压迫、高确定性感官反馈。

---

### C01 · 吹蒲公英 🌬️ (C01_DANDELION)

#### 4.1 核心玩法
腹式呼吸减压。
- **动作识别**：以"按住"（Touch Hold）时长代表吸气深浅。
- **L2 / L3**：界面附带一个慢放缩放的圆形呼吸引导环（4-7-8 呼吸节律的视觉版）。手指松开触发释放，时长映射到生成的粒子数量和飘散距离。
- **performance_data**: `{ total_breaths: number, avg_hold_duration_ms: number }`

---

### C02 · 水塘波纹 💧 (C02_PUDDLE)

**定位：纯发泄/减压工具。无任务，永远不自动完结，仅由"安静退出"退出。**
- 支持 10 点多触波纹扩散碰撞。采用轻量 Canvas 水波涟漪算法。
- 设置中可调**发泄模式**（强节奏、暗黑赛博背色）或**平静模式**（微波、无对比度）。
- **performance_data**: `{ total_touches: number, max_concurrent_touches: number }`

---

### C03 · 星空八音盒 🎶 (C03_XYLOPHONE)

**定位：感官音乐疗愈。**
- 固定使用五边形大调音阶（Pentatonic Scale: CDEGA），此音阶下**任意组合按键都不会产生不和谐摩擦音**，100%保证孩子听觉体验。
- L3 小小作曲家模式允许记录音符序列，最后化作星星飞向夜空回放。
- **performance_data**: `{ notes_played: number, recording_used: boolean }`

---

### C04 · 魔法沙漏 ⏳ (C04_HOURGLASS)

**定位：等待耐受训练辅助器。**
- 教师设定 1 / 3 / 5 分钟档位。流沙期间画面极简唯美。
- 支持手势左右滑动：横滑仅仅改变底色的 HSL Hue，不打断时间，给予无聊时的即时反馈陪伴。
- **performance_data**: `{ time_completed_ms: number, interruptions_count: number }`

---

### C05 · 我的情绪温度计 🌡️ (C05_MOOD_METER)

> **核心地位**：这是串联一切后续报表的基石。每次开始训练前，或崩溃后，老师用来量化记录的数据工具。它披上了游戏的外衣。

#### 4.1 数据规格绑定
游戏结束时向外吐出的 payload 将被存入 `game_emotion_records` 中的 `performance_data`，该 JSON 格式全量约定如下，不许乱填：
```typescript
{
  mood_score: number, // 1 (最平静/极好) 到 5 (最愤怒/崩溃)
  emotion_tag: string, // happy, sad, angry, scared, bored, anxious 等等
  cause_tag?: string, // 归因（老师辅助选：'not_sure', 'peer_conflict', 'task_difficulty', etc.）
  has_voice_memo: boolean 
}
```

#### 4.2 路由与入口建议
这个模块不应该只在"游戏列表"，将来必须作为一个**全局可访问的侧边栏挂件或悬浮球**存在，作为干预发生时的紧急快照工具。

---

## 五、验收标准与自检 Checklist

任何接手后续开发的工程师（含 AI ）必须确保新游戏在合并前达成：

### 5.1 基础架构级验收
- [ ] 代码放置正确，组件包含 `Page.vue` 和 `Game.vue` 两层。
- [ ] 使用了 `<GameContainer>` 包裹，并正确传递 `difficulty`, `isPaused`, `completeGame` 等插槽参数。
- [ ] 数据库扩展的 Schema 及 `init.ts` 迁移脚本无误，不破坏既有数据。
- [ ] TypeScript 类型检查全部通过，`EmotionGameCode` 加入了新的标示符。

### 5.2 游戏状态级验收
- [ ] 点击「安静退出」能够立刻通过 `isPaused` 暂停动画，并静默将中止事件写入数据库。
- [ ] `performance_data` 生成的数据字段符合当前文档契约，无漏项。
- [ ] 各类声音（BGM、TTS、特效音）全线集成进传入的 `audio` 对象中，避免页面卸载时声音泄露。

### 5.3 辅助功能级验收
- [ ] 热区大小在 1080p 屏幕上大于 80*80px。
- [ ] 对高低难度模式的容错度调参合理（例如碰撞判定框扩大）。
