# 需求文档与技术蓝图：儿童情绪场景训练全屏沉浸式重构

> **文档版本：** v1.3 (完整最终版)
> **适用场景：** 情绪行为模块 → 情绪与场景训练功能  
> **阅读对象：** AI 编程助手 / 开发者  
> **使用约定：** 本文档已按阶段拆解任务，请 AI 助手**不要尝试在一次回答中生成所有代码**，应在每个阶段确认后再进行下一阶段。

---

## 1. 项目背景与重构目标

当前情绪行为模块的"情绪与场景训练"功能，采用**左右分栏 + 多选题问卷**的交互模式，认知负荷较高。

**本次重构目标：**
将训练流程彻底改造为「分步骤全屏沉浸式交互绘本」风格：
- 每次只聚焦一个问题，一屏一任务。
- 强化大图、大字、语音辅助朗读（TTS），并增加占位符动态替换功能以增强代入感。
- 夸张的视听正误反馈（音效与动效严格对齐），激励儿童继续作答。
- 完善退出机制、教师介入后门与底层数据结构，实现完全数据驱动。

---

## 2. 技术栈约束

| 层级 | 技术选型 |
|------|---------|
| 核心框架 | Vue 3（Composition API，`<script setup>`）+ TypeScript |
| 构建与环境 | Vite + Electron（桌面端） |
| 本地数据库 | SQL.js（SQLite） |
| CSS 框架 | Tailwind CSS |
| 状态管理 | Pinia |
| 动效库 | VueUse + 原生 CSS Keyframes（或 @vueuse/motion） |
| 音频播放 | Howler.js（管理系统全局音效 SFX 与 TTS 音频） |

---

## 3. 核心数据模型（SQL.js Schema）

> **重要约束：** 为保证跨平台（Windows/macOS）兼容性，数据库中存储的所有相对路径必须强制使用正斜杠 `/`（例如 `scenes/reading.jpg`）。

```sql
-- 1. 场景主表
CREATE TABLE scenes (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    title                VARCHAR(100)  NOT NULL,           
    background_image_url VARCHAR(255),                     -- 相对路径，必须使用 '/'
    target_emotion       VARCHAR(50),                      
    character_name       VARCHAR(50)   DEFAULT '小朋友',   -- 用于替换 {name} 占位符
    created_at           TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- 2. 场景线索表
CREATE TABLE clues (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id      INTEGER      NOT NULL,
    content       VARCHAR(255) NOT NULL,   
    display_order INTEGER      DEFAULT 0,  
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 3. 步骤/题目表 (step_index: 1~4)
CREATE TABLE steps (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id      INTEGER      NOT NULL,
    step_index    INTEGER      NOT NULL, 
    question_text TEXT         NOT NULL, -- 可含 {name} 占位符，如"{name}为什么觉得平静？"
    step_type     VARCHAR(50)  NOT NULL, -- 枚举: 'emotion' | 'reason' | 'need' | 'response'
    audio_url     VARCHAR(255),          
    UNIQUE (scene_id, step_index),
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE
);

-- 4. 选项表
CREATE TABLE options (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id       INTEGER      NOT NULL,
    content       TEXT         NOT NULL,            
    icon_name     VARCHAR(50),                       
    color_hex     VARCHAR(7),                        
    color_label   VARCHAR(20),                       
    is_correct    BOOLEAN      NOT NULL CHECK (is_correct IN (0, 1)),      
    feedback_text TEXT,                              
    FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
);

-- 5. 渐进提示表
CREATE TABLE hints (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    step_id       INTEGER      NOT NULL,
    hint_level    INTEGER      NOT NULL, 
    hint_text     TEXT         NOT NULL, 
    UNIQUE (step_id, hint_level),
    FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE
);

-- 6. 训练结果记录表
CREATE TABLE training_records (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    scene_id         INTEGER   NOT NULL,
    student_id       INTEGER,                               
    stars            INTEGER   NOT NULL CHECK (stars IN (1,2,3)),
    hint_level_sum   INTEGER   NOT NULL DEFAULT 0,          
    completed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scene_id) REFERENCES scenes(id)
);
```

---

## 4. 状态机设计（Pinia Store）

文件路径：`src/stores/useTrainingStore.ts`

### 4.1 State & Getters 定义

```typescript
interface TrainingState {
  currentStepIndex: number; // 0=引导, 1-4=答题, 5=结算
  scene: SceneData | null;
  steps: StepData[];
  hintLevelPerStep: [number, number, number, number];
  answers: Record<number, number>;
  
  inputLocked: boolean;      // 动效播放期间为 true，屏蔽所有用户点击
  isTransitioning: boolean;  // 步骤过渡动画标识
  isExitModalVisible: boolean; // 退出确认弹窗的显示状态
  
  availableTTSEngine: 'edge' | 'cosyvoice' | 'webspeech' | null;
}

// Getters
// 实时将题目文本中的 {name} 替换为当前 scene.character_name
// UI 展示和 TTS 播报均必须使用此解析后的文本
const parsedQuestionText = computed(() => {
  if (!state.scene || !currentStepData.value) return '';
  return currentStepData.value.question_text.replace(/{name}/g, state.scene.character_name);
});
```

### 4.2 核心 Action

```typescript
async function nextStep(): Promise<void>
function recordError(stepIndex: number): void
function calculateStars(): 1 | 2 | 3 
async function saveRecord(): Promise<void>

// 控制与特权
function toggleExitModal(show: boolean): void
function exitTraining(): void     // 调用 Vue Router 返回主页 router.push('/home')
function forceNext(): void        // 无视 inputLocked
function forceReset(): void       
function forceEnd(): void         
```

---

## 5. TTS 与 音效(SFX) 管理模块

### 5.1 TTS 降级链与预处理

接口定义支持 AbortSignal 以便随时中断网络请求：
```typescript
export interface ITTSService {
  play(text: string, signal?: AbortSignal): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
  isAvailable(): Promise<boolean>;
}
```
**策略：** EdgeTTS → CosyVoiceLocal → WebSpeechAPI。在 `useTrainingStore` 中 `watch(currentStepIndex, () => ttsService.stop())`，防止步骤切换时串音。传入 TTS 播放的必须是 Store 中的 `parsedQuestionText`。

### 5.2 全局音效 (SFX) 规范
引入 `Howler.js` 封装统一的 `useSound` hook。
全局基础音效（点击、选对、选错、撒花、过场）不存入数据库，直接作为静态资源打包在前端工程的 `assets/sounds/` 目录下。必须保证**音效触发时机与动画关键帧严格对齐**。

### 5.3 Electron 跨平台资源路径解析
注册 `app://` 自定义协议，并使用 `path.normalize` 防御 Windows/macOS 路径分隔符差异：
```typescript
// main/protocol.ts
import { protocol } from 'electron';
import path from 'path';

protocol.registerFileProtocol('app', (request, callback) => {
  const relativePath = request.url.replace('app://training-assets/', '');
  // 使用 normalize 自动处理跨平台斜杠问题
  const absolutePath = path.normalize(path.join(__dirname, '../resources/training-assets', relativePath));
  callback({ path: absolutePath });
});
```

---

## 6. UI 组件架构

### 6.1 组件树

```
TrainingSession.vue          
├── TrainingLayout.vue       
│   ├── SceneIntroStep.vue   
│   └── QuestionStep.vue     
│       ├── QuestionPresenter.vue   ← 展示 parsedQuestionText + TTS 按钮
│       └── OptionBoard.vue         
│           ├── ImageOptionCard.vue 
│           └── TextOptionBlock.vue 
├── FeedbackOverlay.vue      
├── ExitConfirmDialog.vue    ← 退出确认弹窗 (UI 居中，半透明黑色遮罩)
└── TeacherControlPanel.vue  
```

### 6.2 关键组件规格
*   **`TrainingLayout.vue`**: 右上角配置「退出训练（X）」按钮，点击调用 `store.toggleExitModal(true)`。
*   **`QuestionPresenter.vue`**: 必须绑定 Store 的 `parsedQuestionText` getter，而非原始 DB 文本。
*   **`ExitConfirmDialog.vue`**: 包含“继续训练”和“确认退出”按钮，确认则调用 `store.exitTraining()`。
*   **`FeedbackOverlay.vue`**: 仅答对触发，停留 **1.5 秒** 后消失并切换步骤，存在期间 `inputLocked = true`。

---

## 7. 完整交互与音画同步流程

```
[进入步骤 N]
    │
    ▼
inputLocked = false → (可选) 自动触发 TTS 朗读 parsedQuestionText
    │
    ▼
[等待用户点击]
    │
    ├─── 点击错误 ──→ inputLocked = true
    │                    │
    │                    ▼
    │                 播放 Error 音效 (Howler) + 触发 Shake 动画 (同步执行)
    │                    │
    │                 (150ms 动画结束)
    │                    │
    │                 hintLevelPerStep[N-1] += 1 → 弹出 Toast 提示
    │                    │
    │                 inputLocked = false ← 回到等待状态
    │
    └─── 点击正确 ──→ inputLocked = true
                         │
                         ▼
                      播放 Success 音效 (Howler) + 选项变绿动画
                         │
                         ▼
                      (300ms 后) 弹出 FeedbackOverlay + 播放撒花音效
                         │
                         ▼
                      (1.5s 后) ttsService.stop() 切断旧语音
                         │
                         ▼
                      isTransitioning = true → 当前步骤 UI 淡出 (300ms)
                         │
                         ▼
                      currentStepIndex += 1 → 新步骤淡入
```

---

## 8. 分阶段实施计划

请严格按以下阶段顺序执行，**每阶段完成并经开发者确认后，再进入下一阶段**：

| 阶段 | 任务 | 验收标准 |
|------|------|---------|
| **Phase 1** | DB Schema 建表 + 填充包含 `{name}` 占位符的测试数据 | SQL 可执行，数据关联正确 |
| **Phase 2** | `useTrainingStore` 实现（含 getter、评星、锁定、退出 action） | 单元测试覆盖逻辑核心 |
| **Phase 3** | TTS 模块抽象化 + `Howler.js` 全局音效 Hook 封装 | 可播报 `parsedQuestionText`，中断机制正常 |
| **Phase 4** | 骨架布局 + `SceneIntroStep.vue` + `ExitConfirmDialog.vue` | UI 壳子可用，退出逻辑通畅 |
| **Phase 5** | `QuestionStep.vue` + 各类型选项组件（严格遵循音画同步要求） | 正误交互逻辑与动效无 Bug |
| **Phase 6** | `FeedbackOverlay.vue` + 结算页 + `TeacherControlPanel.vue` | 全流程端到端闭环并写入 DB |