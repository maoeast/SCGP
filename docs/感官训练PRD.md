## 🤖 Assistant

这是一个为您整理好的、结构清晰的 Markdown 格式 PRD 文档。您可以直接保存为 `PRD.md` 文件发送给 Claude Code 或其他开发人员。

***

```markdown
# 产品需求文档 (PRD): 特殊教育感官训练与评估系统 (SEST)

**项目名称**: SpecialEd-Sensory-Trainer (SEST)
**版本**: 1.0 (MVP)
**适用角色**: 特殊教育专家 / 全栈开发
**技术栈**: Vue 3 (Composition API), TypeScript, Electron, SQL.js, Pinia, Element Plus, ECharts

---

## 1. 项目概述 (Overview)
本项目旨在为有特殊需求（如 ASD, ADHD, LD）的学生提供一套基于数字化的感官训练工具。系统不应被设计为零散的小游戏集合，而是基于**三大核心感知引擎**构建的评估平台。

目标是不仅提供训练，更要通过后台记录的微观行为数据（反应时、误报率、脱靶率），生成符合特殊教育标准的 IEP（个性化教育计划）辅助报告。

---

## 2. 训练任务架构映射 (Task Mapping)

为了最大化代码复用率，我们将 7 个具体任务归纳为 3 个通用组件引擎：

| ID | 任务名称 | 归属引擎组件 | 核心特教训练点 |
| :--- | :--- | :--- | :--- |
| **1** | 颜色配对游戏 | `GameGrid.vue` | 视觉分辨、抗色彩干扰 |
| **2** | 形状识别游戏 | `GameGrid.vue` | 视觉细节捕捉、形状恒常性 |
| **3** | 物品配对游戏 | `GameGrid.vue` | 视觉闭合、语义分类认知 |
| **4** | 视觉追踪游戏 | `VisualTracker.vue` | 平滑追踪 (Smooth Pursuit)、眼手协调 |
| **5** | 声音辨别游戏 | `GameAudio.vue` (Mode: Diff) | 听觉分辨 (Pitch/Volume) |
| **6** | 听指令做动作 | `GameAudio.vue` (Mode: Command) | 视听统合、听觉工作记忆 |
| **7** | 节奏模仿游戏 | `GameAudio.vue` (Mode: Rhythm) | 时间知觉 (Temporal Processing)、听觉排序 |

---

## 3. 功能详细设计 (Functional Specs)

### 3.1 视觉辨别引擎 (Visual Grid Engine)
*   **组件**: `src/components/games/visual/GameGrid.vue`
*   **适用任务**: ID 1, 2, 3
*   **Props**:
    *   `mode`: `'color' | 'shape' | 'icon'`
    *   `gridSize`: `number` (例如 2x2, 3x3, 4x4)
    *   `distractorLevel`: `low | high` (干扰项与目标的相似程度)
*   **交互逻辑**:
    1.  屏幕上方显示“目标样本”（如红色方块）。
    2.  下方网格生成多个干扰项和 1 个正确答案。
    3.  点击正确 -> 播放积极音效 -> 进入下一关。
    4.  点击错误 -> 记录“误报 (Commission Error)” -> 播放提示音 -> 试次继续。
    5.  倒计时结束未点 -> 记录“漏报 (Omission Error)” -> 自动下一关。

### 3.2 视觉动态引擎 (Visual Motion Engine)
*   **组件**: `src/components/games/visual/VisualTracker.vue`
*   **适用任务**: ID 4 (视觉追踪训练)
*   **技术依赖**: WebGazer.js (本地静态资源，支持离线使用)

#### Props
| 属性名 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `studentId` | `number` | 必填 | 学生ID，用于数据关联 |
| `taskId` | `TaskID` | 必填 | 任务标识符 |
| `duration` | `number` | 30 | 游戏时长（秒） |
| `targetSize` | `number` | 100 | 目标大小（像素） |
| `targetSpeed` | `number` | 1.5 | 目标移动速度系数 |
| `useEyeTracking` | `boolean` | `true` | 是否启用眼动追踪模式 |

#### 核心功能

**1. 双模式支持**
- **眼动追踪模式**: 使用 WebGazer.js 通过普通摄像头追踪视线
  - 视线焦点显示战斗机瞄准器样式的准星（半透明绿色光环+十字线）
  - 系统每 100ms 检测一次视线焦点是否在目标半径内
  - 摄像头预览窗口显示在右上角，带追踪状态指示

- **鼠标追踪模式**: 按住鼠标/手指跟随目标移动
  - 鼠标光标显示为白色圆环+中心点
  - 系统每 100ms 检测一次触点是否在目标半径内

- **自动降级**: 未检测到摄像头或用户拒绝权限时，自动切换到鼠标模式

**2. 游戏化校准界面（眼动模式）**
- **主题**: 蝴蝶追逐糖果
- **校准点**: 9点网格布局（左上、中上、右上、左中、中心、右中、左下、中下、右下）
- **交互流程**:
  1. 蝴蝶出现在校准点位置，提示"快看这里！"
  2. 用户视线靠近蝴蝶时，开始 1200ms 倒计时（圆环进度条）
  3. 倒计时期间保持注视，蝴蝶变开心状态
  4. 校准点完成，收集糖果进度+1，蝴蝶飞到下一个位置
  5. 完成全部9点后，自动进入游戏
- **跳过选项**: 校准进度≥2时，显示"跳过，用鼠标玩"按钮

**3. 游戏界面**
- **星空主题背景**: 动态闪烁的星星
- **移动目标**: 发光星星，带光晕和旋转光芒效果
- **准星/光标**:
  - 眼动模式: 80px绿色战斗机瞄准器（外圈+十字线+中心点+锁定指示）
  - 鼠标模式: 30px白色圆环+中心点
- **连击系统**:
  - 视线/鼠标重新进入目标时连击+1
  - 2秒内未命中则连击重置
  - 连击≥5时显示金色特效
- **实时统计**: 倒计时、在靶率百分比、模式标识

**4. 结果界面**
- 庆祝动画和评级徽章（🏆太棒了！/🥈很好！/🥉不错！/💪继续加油！）
- 显示训练时长、在靶时间、在靶率
- 模式标识（👁️ 眼动追踪模式）
- "查看完整报告"按钮

#### 数据输出
```typescript
interface TrackingData {
  timeOnTarget: number;        // 在靶总时间（毫秒）
  totalTime: number;           // 总训练时间（毫秒）
  timeOnTargetPercent: number; // 在靶时间百分比 (0-1)
  samplePoints: Array<{       // 采样点数据
    time: number;              // 时间戳
    onTarget: boolean;         // 是否在目标内
  }>;
}

interface GameSessionData {
  taskId: TaskID;
  studentId: number;
  startTime: number;
  endTime: number;
  duration: number;
  trackingData: TrackingData;
  accuracy: number;            // 同 timeOnTargetPercent
  trackingStats: {
    timeOnTargetPercent: number;
    useEyeTracking: boolean;   // 实际使用的模式
  };
}
```

#### 错误处理
- **摄像头未找到**: `NotFoundError` → 自动降级到鼠标模式
- **权限被拒绝**: `PermissionDeniedError` → 自动降级到鼠标模式
- **WebGazer 初始化失败**: 捕获异常 → 降级到鼠标模式，无报错弹窗
- **组件卸载**: 安全停止 WebGazer，清理所有定时器和动画帧

### 3.3 听觉综合引擎 (Audio Unified Engine)
*   **组件**: `src/components/games/audio/GameAudio.vue`
*   **适用任务**: ID 5, 6, 7
*   **模式分化**:
    *   **Task 5 (辨别)**: 播放 Tone A 和 Tone B。UI 显示“一样”和“不一样”两个大按钮。
    *   **Task 6 (指令)**:
        *   利用 `window.speechSynthesis` 播放指令：“请点击红色的圆形”。
        *   UI 复用 Grid 布局，显示 [红圆, 蓝圆, 红方, 蓝方]。
        *   错误分析：点“红方”代表颜色对但形状错；点“蓝圆”代表形状对但颜色错。
    *   **Task 7 (节奏)**:
        *   系统播放节奏序列（如：滴-滴滴）。
        *   UI 显示一个巨大的“拍打”按钮。
        *   记录用户点击的时间戳数组，计算与标准节奏的偏差值。

---

## 4. 数据库设计 (Data Schema)

使用 SQL.js (SQLite) 进行本地存储。

### 表结构: `training_records`

| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| `id` | INTEGER PK | 自增主键 |
| `student_id` | INTEGER | 关联学生表 |
| `task_id` | INTEGER | 对应任务 ID (1-7) |
| `timestamp` | INTEGER | 训练结束时间戳 |
| `duration` | INTEGER | 训练总时长 (秒) |
| `accuracy_rate` | REAL | 综合准确率 (0.0 - 1.0) |
| `avg_response_time` | INTEGER | 平均反应时 (ms) |
| `raw_data` | TEXT | **关键**: 存储详细行为数据的 JSON 字符串 |

### `raw_data` JSON 结构定义

```typescript
interface RawDataDetails {
// 错误分析
errors: {
 omission: number; // 漏报次数 (注意力不集中)
 commission: number; // 误报次数 (冲动/抑制控制差)
};

// 行为特征
behavior: {
 impulsivity_score: number; // 基于极短反应时的错误计算出的分数
 fatigue_index: number; // 后半程准确率 / 前半程准确率
 distractor_pattern?: string; // (可选) 易错干扰项特征，如 "color_confusion"
};

// 仅针对听觉节奏任务
rhythm_stats?: {
 timing_error_avg: number; // 平均节奏偏差 (ms)
};

// 仅针对视觉追踪任务
tracking_stats?: {
 time_on_target_percent: number; // 在靶时间百分比
 use_eye_tracking: boolean;      // 是否使用眼动追踪模式
};
}
```

---

## 5. IEP 报告生成逻辑

系统需包含一个 `IEPGenerator` 类，根据 `task_id` 和 SQL 中的数据生成自然语言报告。

### 判定规则示例
*   **规则 A (冲动型)**: 若 `avg_response_time < 500ms` 且 `commission_errors` 高 -> 输出：“该生反应迅速但准确率较低，表现出冲动型认知风格，建议加强抑制控制训练。”
*   **规则 B (迟缓型)**: 若 `avg_response_time > 3000ms` 且 `omission_errors` 高 -> 输出：“该生信息处理速度较慢，且伴有注意力流失，建议增加视觉显著性提示。”
*   **规则 C (视听统合)**: 若 Task 6 (听指令) 错误率远高于 Task 1 (看图)，则输出：“该生具备基础的视觉分辨能力，但在处理听觉指令转换为视觉动作时存在困难（视听统合障碍）。”

*(详细文案库见 `src/utils/iep-templates.ts`)*

---

## 6. 开发优先级 (MVP Roadmap)

1.  **Phase 1 (基础架构)**:
    *   搭建 Electron + Vue3 环境。
    *   初始化 SQL.js 数据库。
    *   实现通用的 `GameGrid.vue` (搞定 Task 1, 2, 3)。
2.  **Phase 2 (听觉与高级视觉)**:
    *   实现 `GameAudio.vue` (Task 6 优先，因为它是基于 Grid 的变体)。
    *   实现 `VisualTracker.vue`。
3.  **Phase 3 (数据与报告)**:
    *   完善数据埋点（JSON 结构）。
    *   编写 `IEPGenerator` 逻辑。
    *   实现历史记录查看页面（图表展示）。

---
```
