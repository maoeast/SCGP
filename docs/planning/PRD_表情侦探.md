# PRD · 表情侦探 (Expression Detective)
> SCGP 星愿能力发展平台 · 情绪训练模块 · 新增小游戏
> 文档版本：v1.0 · 目标执行者：Codex

---

## 一、游戏概述

### 1.1 训练目标

| 维度 | 说明 |
|------|------|
| 核心能力 | 表情识别 → 表情模仿（看懂→做出） |
| 适用人群 | 特殊儿童（ASD、发育迟缓等），6–12 岁 |
| 训练逻辑 | 镜像神经元激活：屏幕展示目标表情，孩子用摄像头实时匹配，强化"观察→执行"链路 |
| 难度分级 | Wave 1（2 种表情）→ Wave 2（4 种）→ Wave 3（快速切换） |

### 1.2 游戏一句话描述

> 屏幕出现一张卡通表情卡，孩子对着摄像头做出相同的表情，匹配度越高得分越高，集满星星解锁下一关。

---

## 二、文件结构

在现有 SCGP 项目中新建以下文件，**不修改其他任何已有文件**：

```
src/
  games/
    expression-detective/
      index.vue               # 游戏主组件（入口）
      components/
        TargetCard.vue         # 目标表情卡片（中央展示）
        CameraPanel.vue        # 摄像头 + 人脸检测叠加层
        MatchMeter.vue         # 右侧匹配度仪表盘
        ResultOverlay.vue      # 关卡结算浮层
      composables/
        useExpressionMatch.ts  # 表情识别 + 滚动平均逻辑
        useLevelConfig.ts      # 关卡配置读取
      config/
        levels.ts              # 关卡数据（Wave / 目标表情序列）
      assets/
        faces/                 # 卡通表情图（SVG，见第五节）
```

> ⚠️ Codex 注意：若项目中已存在 `EmotionGameShell` 公共组件，优先复用其摄像头接入与反馈动效逻辑；若不存在，在本游戏内独立实现，后续再提取。

---

## 三、界面布局（27 寸横屏 1920×1080，触摸屏）

### 3.1 三栏布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  顶部栏：关卡名 + Wave 指示 + 当前学生姓名 + 退出按钮（高度 64px）      │
├──────────────┬───────────────────────────┬──────────────────────────┤
│              │                           │                          │
│  左栏 30%    │       中栏 40%             │       右栏 30%           │
│              │                           │                          │
│  摄像头面板  │   目标表情卡（主视觉）      │   匹配度仪表盘           │
│              │                           │                          │
│  · 实时画面  │   · 卡通大图（240×240px）  │   · 圆形进度环           │
│  · 人脸框    │   · 表情名称（32px）       │   · 百分比数字           │
│  · "检测中"  │   · 引导文字（22px）       │   · 4 颗星星（评级）     │
│    状态指示  │   · 倒计时环               │   · 当前关卡得分         │
│              │                           │                          │
├──────────────┴───────────────────────────┴──────────────────────────┤
│  底部栏：上一关 / 下一关 按钮（居中，高度 72px）                        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 各区域规格

**顶部栏**
- 背景：`#EBF6FF`（淡蓝）
- 左侧：游戏图标（32px）+ 游戏名"表情侦探" + Wave 徽章（`Wave 1`，圆角 pill）
- 右侧：当前学生姓名 + 退出按钮（`安静退出`，与现有平台一致）

**左栏 — 摄像头面板（CameraPanel.vue）**
- 摄像头画面：圆角 24px，`object-fit: cover`，宽高比 4:3
- 人脸检测时：摄像头外框显示蓝色呼吸动效边框（`box-shadow: 0 0 0 4px #4FC3F7`，CSS keyframe pulse）
- 未检测到人脸时：外框变灰 + 提示文字"把脸放进框里"（18px，居中）
- 左下角小徽章：已检测到人脸时显示绿色 "✓ 已检测到" / 未检测到时不显示

**中栏 — 目标表情卡（TargetCard.vue）**
- 卡片尺寸：280×320px，圆角 24px，`background: #FFFFFF`，`box-shadow: 0 4px 20px rgba(0,0,0,0.08)`
- 卡通人脸图：240×240px SVG（见第五节），居中显示
- 表情名称：字号 32px，font-weight 500，颜色 `#333`，居中，名称下方
- 引导文字：字号 20px，颜色 `#888`，如"张大嘴巴，眼睛睁大！"
- 卡片切换动效：新目标出现时从右侧滑入（`transform: translateX(40px)` → `0`，duration 300ms ease-out）
- 倒计时环：卡片右上角，SVG 圆形进度环，直径 52px，倒计时期间描边从满格递减

**右栏 — 匹配度仪表盘（MatchMeter.vue）**
- 圆形进度环：直径 180px，stroke-width 14px，背景环 `#EEE`，进度环颜色按匹配度变色：
  - 0–39%：`#BDBDBD`（灰）
  - 40–59%：`#FFB74D`（橙）
  - 60–79%：`#4FC3F7`（蓝）
  - 80–100%：`#81C784`（绿）
- 进度环中央：匹配百分比数字，字号 36px，font-weight 500
- 中央文字颜色跟随进度环颜色变化
- 进度环下方：4 颗星评级（当次关卡结束后显示，过程中为灰色空星）
- 最下方：本关累计得分，字号 22px

**底部栏**
- 高度 72px，背景 `#F8FBFF`
- 按钮规格：高 56px，宽 144px，圆角 28px（胶囊），字号 18px
- "上一关"：边框按钮，`border: 1.5px solid #B0BEC5`，文字 `#607D8B`
- "下一关"：填充按钮，`background: #4FC3F7`，文字白色，通关后点亮（通关前置灰 `opacity: 0.5`，不可点）

---

## 四、游戏机制

### 4.1 关卡流程

```
游戏启动
    │
    ▼
展示目标表情卡（3 秒倒计时开始）
    │
    ▼
倒计时期间实时检测匹配度（每帧更新右栏进度环）
    │
    ├─ 匹配度 ≥ 80% 且持续 ≥ 300ms → 触发"成功捕捉"动效，本题得满分
    ├─ 倒计时结束（未达标）→ 按最高匹配度记分，继续下一题
    │
    ▼
当前 Wave 所有题目完成
    │
    ▼
结算浮层（ResultOverlay.vue）
    │
    ▼
显示星级 + 鼓励语 + "下一关"按钮亮起
```

### 4.2 单题计分规则

| 最高匹配度 | 得分 | 星星 |
|-----------|------|------|
| ≥ 80% | 100 分 | ★★★ |
| 60–79% | 70 分 | ★★☆ |
| 40–59% | 40 分 | ★☆☆ |
| < 40% | 10 分 | ☆☆☆ |

> 设计原则：**没有 0 分**。只要孩子参与了，至少得 10 分。禁止出现"失败"字样，结算语只有"太棒了""继续加油""再来一次"。

### 4.3 过程反馈（分级，不阻断游戏流程）

| 匹配度区间 | 视觉反馈 | 文字提示 |
|-----------|---------|---------|
| 0–39% | 进度环灰色，无特殊动效 | 无文字（避免焦虑） |
| 40–59% | 进度环变橙，轻微 pulse | "加油！继续！"（淡入淡出，2 秒消失） |
| 60–79% | 进度环变蓝，加速 pulse | "快了！再大一点！" |
| 80–100% | 进度环变绿，爆发光晕 | "太棒了！" + 星星掉落粒子 |

### 4.4 成功捕捉动效（匹配度达到 80% 且持续 300ms）

1. 中栏目标卡片：绿色外框闪烁 → 缩放 1.0 → 1.08 → 1.0（300ms）
2. 右栏进度环：满格绿色 → 爆发粒子（用 CSS `@keyframes` 实现，3–5 个小星星从圆心飞散）
3. 音效（如项目已有音效系统）：播放短促成功音，约 0.5 秒
4. 自动推进到下一题（延迟 800ms，让孩子感受成功动效）

---

## 五、关卡配置（config/levels.ts）

### 5.1 数据结构

```typescript
export interface ExpressionTarget {
  id: string;               // 表情 ID，对应 face-api 的识别键
  label: string;            // 显示名称，如 "开心"
  hint: string;             // 引导文字，如 "张大嘴巴，眼睛弯弯的！"
  assetKey: string;         // 卡通图 SVG 文件名
  faceApiKey: FaceApiExpression; // 对应 face-api.js 的 expressions key
}

export type FaceApiExpression =
  | 'happy'
  | 'surprised'
  | 'neutral'
  | 'angry'
  | 'disgusted'
  | 'fearful'
  | 'sad';

export interface DetectiveLevel {
  waveId: number;
  waveName: string;
  description: string;      // 教师端显示
  rounds: number;           // 本 Wave 出题数量
  timeLimitPerRound: number; // 单题倒计时（秒）
  targets: ExpressionTarget[]; // 本 Wave 可能出现的表情池（随机抽取）
  shuffleTargets: boolean;  // 是否随机打乱顺序
}
```

### 5.2 三个 Wave 配置

```typescript
// config/levels.ts
import type { DetectiveLevel } from './types';

export const DETECTIVE_LEVELS: DetectiveLevel[] = [
  {
    waveId: 1,
    waveName: 'Wave 1 · 初级侦探',
    description: '2 种基础表情，5 题，单题 5 秒',
    rounds: 5,
    timeLimitPerRound: 5,
    shuffleTargets: true,
    targets: [
      {
        id: 'happy',
        label: '开心',
        hint: '咧开嘴笑，眼睛眯起来！',
        assetKey: 'face-happy',
        faceApiKey: 'happy',
      },
      {
        id: 'surprised',
        label: '惊讶',
        hint: '张大嘴巴，眼睛睁大！',
        assetKey: 'face-surprised',
        faceApiKey: 'surprised',
      },
    ],
  },
  {
    waveId: 2,
    waveName: 'Wave 2 · 中级侦探',
    description: '4 种表情，6 题，单题 4 秒',
    rounds: 6,
    timeLimitPerRound: 4,
    shuffleTargets: true,
    targets: [
      { id: 'happy',    label: '开心', hint: '咧开嘴笑，眼睛眯起来！',     assetKey: 'face-happy',    faceApiKey: 'happy' },
      { id: 'surprised',label: '惊讶', hint: '张大嘴巴，眼睛睁大！',       assetKey: 'face-surprised',faceApiKey: 'surprised' },
      { id: 'neutral',  label: '平静', hint: '放松脸，嘴巴轻轻闭上。',     assetKey: 'face-neutral',  faceApiKey: 'neutral' },
      { id: 'sad',      label: '难过', hint: '嘴角往下，眉毛皱一皱。',     assetKey: 'face-sad',      faceApiKey: 'sad' },
    ],
  },
  {
    waveId: 3,
    waveName: 'Wave 3 · 高级侦探',
    description: '4 种表情快速切换，8 题，单题 3 秒',
    rounds: 8,
    timeLimitPerRound: 3,
    shuffleTargets: true,
    targets: [
      { id: 'happy',    label: '开心', hint: '咧开嘴笑！',       assetKey: 'face-happy',    faceApiKey: 'happy' },
      { id: 'surprised',label: '惊讶', hint: '张大嘴巴！',       assetKey: 'face-surprised',faceApiKey: 'surprised' },
      { id: 'neutral',  label: '平静', hint: '放松，自然。',     assetKey: 'face-neutral',  faceApiKey: 'neutral' },
      { id: 'sad',      label: '难过', hint: '嘴角向下。',       assetKey: 'face-sad',      faceApiKey: 'sad' },
    ],
  },
];
```

---

## 六、表情识别逻辑（composables/useExpressionMatch.ts）

### 6.1 完整实现规格

```typescript
// composables/useExpressionMatch.ts

import { ref, computed } from 'vue';
import type { FaceApiExpression } from '../config/types';

// ─── 可调参数（特殊儿童宽容配置）─────────────────────────────────
const SMOOTH_FRAMES     = 5;     // 滚动平均帧数
const SUCCESS_THRESHOLD = 0.80;  // 成功判定置信度
const HINT_THRESHOLD    = 0.40;  // "加油"提示最低置信度
const SUCCESS_HOLD_MS   = 300;   // 成功需持续的毫秒数
// ──────────────────────────────────────────────────────────────────

export function useExpressionMatch() {
  const rawScoreWindow = ref<number[]>([]);  // 滑动窗口
  const smoothedScore  = ref(0);
  const matchPercent   = computed(() => Math.round(smoothedScore.value * 100));

  // 成功持续计时
  let successStartTime: number | null = null;
  const isSuccess = ref(false);

  /**
   * 每帧调用。传入 face-api 返回的 expressions 对象
   * 和当前目标表情的 faceApiKey，返回当帧是否触发成功
   */
  function feedFrame(
    expressions: Record<FaceApiExpression, number>,
    targetKey: FaceApiExpression
  ): boolean {
    const rawScore = expressions[targetKey] ?? 0;

    // 维护滑动窗口
    rawScoreWindow.value.push(rawScore);
    if (rawScoreWindow.value.length > SMOOTH_FRAMES) {
      rawScoreWindow.value.shift();
    }

    // 计算滚动平均
    const avg =
      rawScoreWindow.value.reduce((a, b) => a + b, 0) /
      rawScoreWindow.value.length;
    smoothedScore.value = avg;

    // 成功持续判断
    if (avg >= SUCCESS_THRESHOLD) {
      if (successStartTime === null) {
        successStartTime = Date.now();
      } else if (Date.now() - successStartTime >= SUCCESS_HOLD_MS) {
        isSuccess.value = true;
        return true; // 触发成功
      }
    } else {
      successStartTime = null;
      isSuccess.value = false;
    }

    return false;
  }

  /** 切换题目时重置状态 */
  function reset() {
    rawScoreWindow.value = [];
    smoothedScore.value = 0;
    successStartTime = null;
    isSuccess.value = false;
  }

  return {
    matchPercent,   // 0–100，供 MatchMeter 直接绑定
    isSuccess,      // 成功状态，供动效触发
    feedFrame,
    reset,
  };
}
```

### 6.2 调用方式（index.vue 中）

```typescript
// 在 face-api 的 requestAnimationFrame 检测循环中调用：
const { matchPercent, isSuccess, feedFrame, reset } = useExpressionMatch();

async function detectionLoop() {
  const detections = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions())
    .withFaceExpressions();

  if (detections) {
    const triggered = feedFrame(
      detections.expressions as Record<FaceApiExpression, number>,
      currentTarget.value.faceApiKey
    );
    if (triggered) {
      handleSuccess(); // 播放动效，记分，推进下一题
    }
  }

  requestAnimationFrame(detectionLoop);
}
```

---

## 七、卡通表情图规格（assets/faces/）

### 7.1 要求

- 格式：SVG，每个文件约 2–4 KB
- 尺寸：240×240 viewBox
- 风格：圆润，无锋利角，颜色饱和度适中（非荧光色），背景透明
- 人脸基础形：圆形黄色脸（`#FFD54F`），黑色描边 `stroke-width: 3`
- 眼睛：圆形黑色，大且明显（直径约 24px）
- 嘴巴：简洁弧线，根据表情变化

### 7.2 四种表情特征

| assetKey | 眉毛 | 眼睛 | 嘴巴 |
|----------|------|------|------|
| `face-happy` | 自然平，略弯 | 半闭（上弧线） | 大弧形上扬，露出牙齿 |
| `face-surprised` | 上扬挑起 | 圆睁，瞳孔放大 | 正圆形张开（`<circle>`） |
| `face-neutral` | 平直 | 标准圆形，正视 | 平直细线 |
| `face-sad` | 内侧下压（"八字眉"） | 半闭，眼角微垂 | 下弧线（嘴角向下） |

> Codex 可使用内联 SVG 直接硬编码，无需外部图片资源，便于颜色主题统一。

---

## 八、结算浮层（ResultOverlay.vue）

### 8.1 触发时机

本 Wave 所有题目完成后，从屏幕底部滑入（`translateY(100%)` → `0`，400ms ease-out）。

### 8.2 内容规格

```
┌──────────────────────────────────────────────┐
│                                              │
│      🎉  Wave 1 完成！                        │
│                                              │
│      ★ ★ ★    （根据平均得分显示 1–3 星）      │
│                                              │
│      本关得分：350 分                          │
│                                              │
│      鼓励语（随机从库中取一条）                 │
│      "你是最棒的表情侦探！"                     │
│                                              │
│   [ 再挑战一次 ]    [ 下一关 → ]               │
│                                              │
└──────────────────────────────────────────────┘
```

### 8.3 鼓励语库（随机取一条，禁止负面词汇）

```typescript
export const ENCOURAGEMENTS = [
  '你是最棒的表情侦探！',
  '侦探技能 +1，太厉害了！',
  '每一个表情你都做得很棒！',
  '继续练习，你会越来越厉害！',
  '今天的你超级勇敢！',
  '表情侦探徽章已解锁！',
];
```

### 8.4 星级判定

| Wave 平均得分 | 星级 |
|-------------|------|
| ≥ 80 分 | ★★★ |
| 50–79 分 | ★★☆ |
| < 50 分 | ★☆☆ |

---

## 九、数据记录（接入现有 SQL.js 体系）

在游戏结束时写入以下数据（字段命名与项目现有约定保持一致）：

```typescript
interface DetectiveGameRecord {
  gameId: 'expression-detective';
  studentId: string;
  waveId: number;
  playedAt: string;          // ISO8601
  totalScore: number;
  starRating: 1 | 2 | 3;
  roundDetails: Array<{
    targetExpression: string; // 目标表情 ID
    maxMatchPercent: number;  // 本题最高匹配百分比（0–100）
    score: number;
    timeUsed: number;         // 秒
  }>;
}
```

> Codex 注意：若项目中有统一的 `gameRecordService`，直接调用它写入；如果没有，在 `index.vue` 的 `handleWaveComplete` 回调中写入 SQL.js。

---

## 十、约束与注意事项

### 10.1 严格约束

- 不修改任何与本游戏无关的已有文件
- 不重构现有路由、评估中心、或其他游戏模块
- 摄像头权限申请沿用项目现有的 `useCameraPermission` 方案；若项目无此 composable，在本游戏内独立实现并注明
- 不引入新的大体积 npm 包；face-api.js 若项目已引入则直接使用，若未引入请先确认后再安装

### 10.2 执行顺序建议

1. 创建目录结构和空文件
2. 实现 `config/levels.ts`（纯数据，零依赖）
3. 实现 `useExpressionMatch.ts`（可单独单测）
4. 实现 4 张卡通 SVG 表情图
5. 实现 `CameraPanel.vue`（摄像头接入 + 人脸框）
6. 实现 `TargetCard.vue`（展示目标表情 + 倒计时环）
7. 实现 `MatchMeter.vue`（进度环）
8. 实现 `ResultOverlay.vue`（结算浮层）
9. 组装 `index.vue`（串联所有组件 + 游戏状态机）
10. 接入数据记录

每完成一步请简要说明，等待确认后继续。

---

*文档结束 · SCGP 表情侦探 PRD v1.0*
