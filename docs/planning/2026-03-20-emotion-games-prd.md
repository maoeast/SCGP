# SCGP 情绪调节互动游戏包 (Emotion Games Pack) 开发规范与 PRD

**文档定位**：指导 AI 智能体（GSD/Codex）进行 H5 互动游戏开发的架构约束与业务需求。
**所属模块**：情绪行为调节模块 (`emotional`) 的子系统。
**技术栈**：Electron + Vue 3 + TypeScript + SQL.js + Canvas API + Web Audio API。

## 一、 全局架构与工程约束 (极其重要)

1. **资产与渲染策略**：
   - **禁止**使用纯 CSS 绘制复杂的动物或人物（避免产生不可维护的冗长 DOM）。
   - **必须**使用内联 SVG（Inline SVG）作为核心视觉元素，配合 CSS `transform` / `@keyframes` 实现动画。
   - 复杂的物理效果（如刮刮乐、粒子爆炸）**必须**使用 HTML5 `<canvas>` 实现。

2. **通用游戏容器 (`GameContainer.vue`)**：
   - 不要为每个游戏重复写外围逻辑。必须先开发一个通用容器组件。
   - 容器必须包含：
     - 左上角：常驻的【退出】大按钮（点击立即停止所有音频和动画，返回上一页）。
     - 右上角：【设置】下拉菜单（控制背景音量、特效开关）。
     - 底层逻辑：统一拦截子游戏抛出的 `onGameComplete` 事件，并自动调用 SQL.js 将数据写入 `game_emotion_records` 表。

3. **特教无障碍规范 (Accessibility)**：
   - 绝对禁止闪烁频率超过 3Hz 的动画（防癫痫）。
   - 错误反馈必须是“温和的物理反馈”（如选项轻轻弹回），绝对禁止红色大叉或刺耳的“嘟嘟”声。
   - 交互热区（按钮/拖拽物）尺寸必须 $\ge$ 64px，适应特殊儿童的粗大动作。
   
4. **严格的素材版权与来源约束 (Legal & Assets)**：
   - **绝对禁止**使用任何有版权风险的网络图片、音频或外部 CDN 链接。
   - **视觉素材**：95% 的核心元素必须通过纯代码（CSS/SVG/Canvas）生成。极少数必须的图标或插画，仅限使用以下零成本、可免费商用且无需署名的开源库：
     - 图标：`Tabler Icons` (推荐), `Heroicons`
     - 插画：`unDraw`
     - 真实图片（如需）：`Picsum Photos`
   - **音频素材**：所有的 UI 音效、白噪音、自然环境音，仅限使用 Web Audio API 程序化生成，或从 `ZapSplat` (免费商用授权区) 下载并本地化存储。

5. **小步递进的三级难度设计 (Difficulty Scaling)**：
   - 所有的游戏必须在状态机中内置 `difficulty: 1 | 2 | 3`（简单/中等/困难）三个级别。
   - **简单（Level 1）**：无干扰项，速度极慢，容错率 100%（适合情绪崩溃期或重度认知障碍儿童）。
   - **中等（Level 2）**：加入少量干扰项（如情绪识别加入“尴尬”等复杂情绪），速度适中。
   - **困难（Level 3）**：加入多重干扰项，要求连续正确或保持一定时长的稳定性（适合情绪平稳期的能力提升）。
   - 游戏默认从 Level 1 开始，教师可在 `GameContainer` 的设置面板中手动调节。
   
## 二、 数据库契约设计 (Database & Type Contracts)

为了保证本地 SQLite (SQL.js) 数据的完整性，以及前端代码的类型安全，请在 `src/database/schema/emotional-schema.sql` 中新增以下两张核心表，并在 `src/types/emotional/games.ts` 中声明对应的 TypeScript 接口。

### 1. 游戏干预记录表 (`game_emotion_records`)
用于记录孩子每次使用安抚游戏的行为数据，为后续生成 IEP 情绪干预报告提供底层数据支撑。

**SQL 建表语句：**
```sql
CREATE TABLE IF NOT EXISTS game_emotion_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  game_code TEXT NOT NULL, -- 游戏唯一标识，如 'G01_BALLOON'
  start_time TEXT NOT NULL,
  duration_ms INTEGER NOT NULL, -- 游戏停留时长
  difficulty_level INTEGER DEFAULT 1, -- 难度：1(简单), 2(中等), 3(困难)
  completion_status TEXT NOT NULL, -- 'completed' (完成并获得奖励) 或 'aborted' (中途退出)
  performance_data TEXT, -- JSON格式，记录特教指标（如：呼气平稳秒数、最高分贝、擦拭次数等）
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**TypeScript 接口定义：**
```typescript
export interface GameEmotionRecord {
  id?: number;
  student_id: number;
  game_code: 'G01_BALLOON' | 'G03_FOREST' | 'G04_WIPE_ICE' | 'G07_MONSTER';
  start_time: string;
  duration_ms: number;
  difficulty_level: 1 | 2 | 3;
  completion_status: 'completed' | 'aborted';
  performance_data: Record<string, any>; // 灵活存储各类游戏的特有指标
  created_at?: string;
}
```

### 2. 学生荣誉徽章表 (`student_badges`)
用于落实特教“正向强化（Positive Reinforcement）”原则。记录孩子在游戏中获得的徽章，支持重复获得（累加次数），用于构建学生档案的“荣誉墙”。

**SQL 建表语句：**
```sql
CREATE TABLE IF NOT EXISTS student_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  badge_code TEXT NOT NULL, -- 徽章唯一标识，如 'BADGE_CALM_WIND'
  badge_name TEXT NOT NULL, -- 徽章展示名称，如 '平静微风徽章'
  game_code TEXT NOT NULL, -- 来源游戏
  unlock_count INTEGER DEFAULT 1, -- 获得次数（重复玩可累加，鼓励持续调节）
  first_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(student_id, badge_code) -- 每个学生每种徽章只有一条记录，通过 count 累加
);
```

**TypeScript 接口定义：**
```typescript
export interface StudentBadge {
  id?: number;
  student_id: number;
  badge_code: string;
  badge_name: string;
  game_code: string;
  unlock_count: number;
  first_earned_at?: string;
  last_earned_at?: string;
}
```

### 3. 数据落库逻辑要求 (给 AI 的执行约束)
- **防抖与静默保存**：游戏过程中的数据落库必须是“静默”的，绝对不能弹出“保存成功”的 Loading 弹窗打断孩子的沉浸感。
- **徽章 Upsert 逻辑**：当孩子完成游戏获得徽章时，调用 API 检查 `student_badges` 表。如果该 `badge_code` 已存在，则 `unlock_count + 1` 并更新 `last_earned_at`；如果不存在，则 `INSERT` 新记录。

## 三、 首期 MVP 游戏开发清单 (Top 4)


请严格按照以下顺序，分阶段（Phases）独立开发。每个游戏必须封装在 `src/views/emotional/games/` 下，并严格实现 `difficulty: 1 | 2 | 3` 的三级难度状态机。

### Phase 1: 游戏01 - 深呼吸热气球 (生理安抚)
- **核心玩法**：按住屏幕吸气（热气球变大），松开呼气（热气球升空）。防缺氧机制：单次按住超 6 秒自动触发呼气。
- **三级难度设计**：
  - **简单 (L1)**：无任何障碍物。只要按住屏幕超过 2 秒并松开，热气球就能平稳升空，100% 成功率。
  - **中等 (L2)**：加入“移动的云朵”。孩子需要观察云朵的位置，在合适的时机松开手指呼气，避开云朵。若碰到云朵，气球会温柔地弹回原位，提示“再试一次”。
  - **困难 (L3)**：加入“风的考验”。需要连续完成 3 次完美的“4秒吸气-6秒呼气”节奏，气球才能最终飞到彩虹岛。
  - **【收尾仪式与奖励】**：
  - **视觉呈现**：热气球平稳降落在五彩斑斓的“彩虹岛”上。小兔子从气球里跳出来，和兔妈妈开心地拥抱。天空中绽放几朵柔和的、纯 CSS 绘制的烟花。
  - **听觉反馈**：播放一段轻柔的竖琴滑音（Glissando），伴随温柔的语音播报：“哇，你的呼吸像微风一样温柔，真棒！”
  - **虚拟奖励**：屏幕中央弹出一枚闪闪发光的**【平静微风徽章 🎐】**，自动存入学生的个人档案荣誉墙。
- **技术点**：Vue 触摸事件 (`touchstart`/`touchend`) + 动态 CSS `scale` 绑定 + Web Audio API 播放轻柔白噪音。

### Phase 2: 游戏03 - 音量魔法森林 (声控调节)
- **核心玩法**：对着麦克风说话，用合适的音量（40-60分贝）唤醒森林里的萤火虫和小动物。
- **三级难度设计**：
  - **简单 (L1)**：极宽的音量容错率（30-70分贝）。只要发出声音，萤火虫就会飞舞。大声尖叫不会有负面反馈，只会温柔提示“嘘，小点声哦”。
  - **中等 (L2)**：收窄目标音量区间（40-60分贝）。需要保持合适音量 3 秒钟，才能唤醒一只小动物。如果尖叫（>70分贝），小动物会暂时躲进树洞。
  - **困难 (L3)**：引入“听觉干扰”。背景会播放微弱的派对音乐，孩子需要排除干扰，连续 10 秒将自己的音量稳定控制在对话区间（40-60分贝）。
  - **【收尾仪式与奖励】**：
  - **视觉呈现**：当唤醒足够数量的小动物后，整个黑夜森林会被温暖的彩色小灯泡点亮。小兔子、小松鼠和小熊会围在一起，做一个可爱的“开心摇摆”动画。
  - **听觉反馈**：播放一段欢快但不刺耳的森林派对八音盒音乐。语音播报：“你找到了最神奇的魔法声音，小动物们都好喜欢你！”
  - **虚拟奖励**：屏幕中央弹出一枚**【魔法声音徽章 🎵】**，自动存入荣誉墙。
- **技术点**：`navigator.mediaDevices.getUserMedia` 获取麦克风流 + `AudioContext.createAnalyser()` 实时计算分贝值映射 UI。

### Phase 3: 游戏04 - 擦亮坏心情 (大动作发泄)
- **核心玩法**：屏幕被一层“冰霜”覆盖，孩子用手指大面积快速滑动擦除冰霜，露出底部的笑脸。
- **三级难度设计**：
  - **简单 (L1)**：单层薄冰，极高灵敏度。手指随便划几下，大面积的冰块就会瞬间融化，立刻给予正向视觉反馈。
  - **中等 (L2)**：引入“重新结冰”机制。如果孩子中途停下不擦了，冰霜会极其缓慢地恢复。需要孩子保持一定的连续大动作输出。
  - **困难 (L3)**：多层厚冰。同一个区域需要反复擦拭 3 次才能彻底擦亮，极大地消耗孩子的体力，达到深度发泄的目的。
  - **【收尾仪式与奖励】**：
  - **视觉呈现**：当最后一块冰霜被擦除时，屏幕底部的“笑脸”或“美丽风景”会瞬间放大并发出柔和的光芒。屏幕边缘飘落 CSS 生成的彩色纸片（Confetti）。
  - **听觉反馈**：播放类似“冰块碎裂变成清脆风铃”的 ASMR 级解压音效。语音播报：“呼——坏心情都被你擦得干干净净啦，太阳出来咯！”
  - **虚拟奖励**：屏幕中央弹出一枚**【阳光笑脸徽章 ☀️】**，自动存入荣誉墙。
- **技术点**：Canvas API。底层画笑脸，顶层画冰霜。监听 `touchmove`，使用 `ctx.globalCompositeOperation = 'destination-out'` 实现刮刮乐效果。

### Phase 4: 游戏07 - 喂食情绪小怪兽 (认知匹配)
- **核心玩法**：将正确的“安抚工具”（如水杯、拥抱图标）拖拽给对应情绪颜色的小怪兽。
- **三级难度设计**：
  - **简单 (L1)**：屏幕只有 1 只小怪兽，下方只有 2 个工具（1 个正确，1 个明显错误）。无限次重选，选错时小怪兽会语音提示“我口渴，想喝水”。
  - **中等 (L2)**：屏幕同时出现 2 只小怪兽（如生气红、难过蓝），下方有 4 个工具。引入“尴尬”、“紧张”等复杂情绪。
  - **困难 (L3)**：屏幕出现 3 只小怪兽。下方的工具放置在“缓慢移动的传送带”上，增加轻微的时间压力和精细动作（手眼协调）挑战。
  - **【收尾仪式与奖励】**：
  - **视觉呈现**：所有小怪兽吃饱了对应的“安抚工具”后，颜色全部变成代表平静的绿色。它们会满足地拍拍圆滚滚的肚子，然后闭上眼睛打起呼噜（进入睡觉状态）。
  - **听觉反馈**：播放小怪兽可爱的打嗝声和轻柔的呼噜声。语音播报：“你太会照顾人了，小怪兽们现在觉得好舒服呀。”
  - **虚拟奖励**：屏幕中央弹出一枚**【情绪小管家徽章 🧸】**，自动存入荣誉墙。
- **技术点**：HTML5 Drag and Drop API 或 Vue 鼠标/触摸坐标追踪实现碰撞检测 + 喂食成功后的 CSS 粒子撒花特效。

## 四、 验收标准 (Acceptance Criteria)

AI 智能体在完成每个阶段的开发后，必须严格对照以下标准进行自测与验收：

### 1. 特教交互与视觉验收 (Special Ed UX & Visuals)
- [ ] **零挫败底线**：测试所有错误操作路径，确保没有任何“Game Over”、红色大叉或刺耳警告音。错误时仅有温和的物理反馈或语音引导。
- [ ] **纯代码资产**：检查 DOM 和代码，确保 95% 以上的核心视觉元素是使用纯 CSS / Inline SVG / Canvas 绘制的，绝对没有引入任何外部版权图片链接。
- [ ] **安全退出机制**：在游戏进行到任意阶段（包括动画播放中），点击右上角的“安静退出（X）”按钮，必须**瞬间停止**所有 Web Audio 音效和 CSS/Canvas 动画，并平滑退回主菜单。
- [ ] **收尾仪式与正向强化**：游戏通关后，必须完整触发专属的视觉动画（如烟花、彩纸）、听觉反馈（如竖琴声、表扬语音），并清晰弹出对应的【荣誉徽章】。

### 2. 核心功能与难度验收 (Core Features & Difficulty)
- [ ] **三级难度生效**：在 `GameContainer` 中切换 Level 1 / 2 / 3 时，游戏内的核心变量（如云朵数量、音量容错率、冰块厚度、传送带速度）必须发生明确的阶梯式变化。
- [ ] **硬件调用正常**：在 Electron 本地环境下，麦克风（Web Audio API 分贝检测）和多点触控（Canvas 滑动/拖拽）能被正常且流畅地调用，无浏览器权限弹窗阻断。

### 3. 数据与底层架构验收 (Data & Architecture)
- [ ] **行为数据静默落库**：游戏正常完成时，`game_emotion_records` 表成功写入 `completion_status: 'completed'` 及特教表现数据；点击“安静退出”时，成功写入 `'aborted'`。整个落库过程无任何 Loading 弹窗打断用户。
- [ ] **徽章 Upsert 逻辑**：获得徽章时，查询 `student_badges` 表。首次获得成功 `INSERT`；重复获得成功执行 `unlock_count + 1` 及更新 `last_earned_at`，不抛出 UNIQUE 约束冲突报错。

### 4. 代码规范验收 (Code Standards)
- [ ] **容器化复用**：所有 4 个 MVP 游戏必须作为子组件挂载在 `GameContainer.vue` 中，绝不在各个游戏内部重复编写退出、设置和落库逻辑。
- [ ] **类型安全**：运行定向的局部 `vue-tsc` 校验（覆盖 `src/views/emotional/games/` 及 `src/types/emotional/games.ts`），必须 0 报错通过。