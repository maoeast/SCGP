# PRD · 双人表情擂台 (Expression Duel)
> SCGP 星愿能力发展平台 · 情绪训练模块 · 社交互动游戏
> 文档版本：v1.0 · 技术栈：Electron + Vue 3 + TypeScript + Vite + SQL.js + MediaPipe FaceLandmarker

---

## 一、游戏概述

### 1.1 训练目标

| 维度 | 说明 |
|------|------|
| 核心能力 | 非语言社交沟通 · 表情识别与模仿 · 情绪共情 |
| 适用人群 | 特殊儿童（ASD、社交障碍等），6–12 岁，**需教师或治疗师陪同** |
| 训练逻辑 | 双向镜像：A 用自己的脸"出题"，B 观察并模仿，完成一次完整的"表情发送→接收→复现"社交闭环 |
| 核心价值 | 这是平台内**唯一需要两个孩子实时互动**的游戏，专门弥补单人训练无法覆盖的社交情境 |

### 1.2 一句话描述

> 两个孩子各占半屏，轮流用自己的表情"出题"，对方看着镜头模仿，MediaPipe 实时计算相似度打分，分数越高越接近"心灵相通"。

### 1.3 双摄像头方案说明

| 场景 | 方案 |
|------|------|
| 理想：两台独立设备 / 一台设备插两路摄像头 | 各自独立 video 流，MediaPipe 各跑一个实例 |
| 退而求其次：只有一路摄像头 | 两个孩子并排坐，摄像头拍全景，MediaPipe 检测多人，取左右两张人脸分别处理 |
| 单人练习模式（降级） | 一个孩子 + 一路摄像头，AI 扮演出题方（从预设表情库随机出题） |

> Codex 须在 `SETUP` 阶段自动枚举设备，依据摄像头数量引导进入对应流程。

---

## 二、文件结构

**只新建以下文件，不修改任何已有文件：**

```
src/
  games/
    expression-duel/
      index.vue                      # 游戏入口，挂载状态机
      components/
        SetupScreen.vue              # 摄像头选择 + 玩家命名
        PlayerPanel.vue              # 单侧玩家面板（摄像头画面 + 状态层）
        CapturePhase.vue             # 出题阶段：表情捕捉倒计时
        FrozenExpressionCard.vue     # 出题方表情定格展示卡
        MimicPhase.vue               # 答题阶段：模仿倒计时 + 实时进度
        SimilarityResult.vue         # 单轮相似度结果动效
        RoundTransition.vue          # 换手过渡动画
        GameOverScreen.vue           # 总结算界面
        TeacherToolbar.vue           # 教师工具栏（顶部悬浮）
      composables/
        useDualCamera.ts             # 双摄像头枚举、初始化、释放
        useMediaPipeDuel.ts          # 两路 FaceLandmarker 实例管理
        useBlendshapeSimilarity.ts   # 相似度计算算法
        useDuelStateMachine.ts       # 游戏状态机（核心逻辑）
        useTeacherControls.ts        # 教师控制逻辑
      config/
        gameConfig.ts                # 所有可调参数（时间、阈值、分值）
      types/
        index.ts                     # 全部 TypeScript 接口定义
      assets/
        sounds/                      # 音效引用（若项目已有音效体系则复用）
```

---

## 三、TypeScript 类型定义（types/index.ts）

```typescript
// ─── 玩家 ────────────────────────────────────────────────────────────
export interface PlayerConfig {
  id: 'left' | 'right';
  name: string;
  cameraDeviceId: string;        // 来自 enumerateDevices
  color: string;                 // 主题色，left:#4FC3F7  right:#FFB74D
}

// ─── Blendshape 快照（出题方捕捉结果）──────────────────────────────
export type BlendshapeMap = Record<string, number>; // key: blendshape 名, value: 0–1

export interface ExpressionSnapshot {
  blendshapes: BlendshapeMap;
  capturedAt: number;            // timestamp
  capturedBy: 'left' | 'right';
  frameDataUrl?: string;         // 定格截图（base64），用于展示给对方
}

// ─── 单轮数据 ────────────────────────────────────────────────────────
export interface DuelRound {
  roundIndex: number;            // 0-based
  setter: 'left' | 'right';     // 出题方
  mimic: 'left' | 'right';      // 答题方
  snapshot: ExpressionSnapshot;
  mimicPeakSimilarity: number;   // 答题过程中最高相似度 0–100
  mimicFinalSimilarity: number;  // 倒计时结束时的相似度
  score: number;                 // 本轮得分
  duration: number;              // 答题实际用时（ms）
}

// ─── 游戏状态机 ──────────────────────────────────────────────────────
export type DuelGamePhase =
  | 'SETUP'           // 摄像头选择 + 命名
  | 'READY'           // 3-2-1 倒计时
  | 'CAPTURING'       // 出题方正在做表情，等待捕捉
  | 'FROZEN'          // 表情定格，展示给答题方（1.5s 过渡）
  | 'MIMICKING'       // 答题方模仿中，倒计时
  | 'SCORING'         // 计算并展示相似度
  | 'ROUND_OVER'      // 单轮结算（2s 后自动继续或换手）
  | 'SWAPPING'        // 换手过渡动画
  | 'GAME_OVER';      // 游戏结束

export interface DuelGameState {
  phase: DuelGamePhase;
  currentRound: number;          // 1-based
  totalRounds: number;
  currentSetter: 'left' | 'right';
  rounds: DuelRound[];
  scores: { left: number; right: number };
  isPaused: boolean;             // 教师暂停
  phaseTimeRemaining: number;    // 当前阶段剩余秒数（用于 UI 倒计时）
}

// ─── 相似度实时帧数据 ────────────────────────────────────────────────
export interface SimilarityFrame {
  similarity: number;            // 0–100，供实时进度条绑定
  timestamp: number;
}
```

---

## 四、游戏配置（config/gameConfig.ts）

```typescript
export const DUEL_CONFIG = {
  // ─── 轮次设置 ──────────────────────────────────────────────────
  TOTAL_ROUNDS: 6,               // 总轮数（每人出题3次）
  ROUNDS_PER_PLAYER: 3,          // 每人出题次数

  // ─── 各阶段时长（秒）──────────────────────────────────────────
  READY_COUNTDOWN: 3,            // 开始前 3-2-1 倒计时
  CAPTURE_HOLD_DURATION_MS: 2000,// 出题方需持续2秒触发捕捉
  FROZEN_DISPLAY_DURATION: 1500, // 定格展示时长（ms）
  MIMIC_COUNTDOWN: 5,            // 答题方倒计时（秒）
  SCORING_DISPLAY: 2000,         // 得分展示时长（ms）
  ROUND_OVER_DISPLAY: 2500,      // 单轮结算展示时长（ms）
  SWAP_ANIMATION: 1200,          // 换手动画时长（ms）

  // ─── MediaPipe 识别参数（特殊儿童宽容配置）────────────────────
  DETECTION_CONFIDENCE: 0.5,     // 人脸检测最低置信度
  LANDMARK_CONFIDENCE: 0.5,
  SMOOTH_FRAMES: 5,              // 滚动平均帧数

  // ─── 相似度计算 ────────────────────────────────────────────────
  // 参与计算的情绪相关 blendshape（27个，排除眼球方向等无关项）
  EMOTION_BLENDSHAPES: [
    'eyeBlinkLeft','eyeBlinkRight','eyeWideLeft','eyeWideRight',
    'eyeSquintLeft','eyeSquintRight',
    'browDownLeft','browDownRight','browInnerUp',
    'browOuterUpLeft','browOuterUpRight',
    'cheekSquintLeft','cheekSquintRight','cheekPuff',
    'noseSneerLeft','noseSneerRight',
    'jawOpen',
    'mouthSmileLeft','mouthSmileRight',
    'mouthFrownLeft','mouthFrownRight',
    'mouthPucker','mouthFunnel','mouthClose',
    'mouthDimpleLeft','mouthDimpleRight','mouthShrugUpper',
  ] as const,

  // 相似度底托（最低得分保障，避免孩子看到0分）
  SIMILARITY_FLOOR: 30,

  // ─── 计分规则 ──────────────────────────────────────────────────
  SCORE_TABLE: [
    { min: 85, score: 100, label: '心灵相通！', stars: 3 },
    { min: 65, score:  75, label: '非常接近！', stars: 2 },
    { min: 45, score:  50, label: '继续加油！', stars: 1 },
    { min:  0, score:  25, label: '再来一次！', stars: 1 }, // 永不为0
  ],

  // ─── 教师加分 ──────────────────────────────────────────────────
  TEACHER_BONUS_POINTS: 10,
} as const;
```

---

## 五、界面布局（27寸横屏 1920×1080）

### 5.1 整体结构

```
┌─────────────────────────────────────────────────────────────────────┐
│  教师工具栏（高度 52px，悬浮覆盖，默认半透明，hover 展开）              │
├──────────────────────────┬──────────────────────────────────────────┤
│                          │                                          │
│   左侧玩家面板            │   右侧玩家面板                            │
│   width: 50%             │   width: 50%                             │
│                          │                                          │
│   摄像头画面              │   摄像头画面                              │
│   （16:9，圆角16px）      │   （16:9，圆角16px）                      │
│                          │                                          │
│   状态叠加层              │   状态叠加层                              │
│   · 玩家姓名标签          │   · 玩家姓名标签                          │
│   · 当前阶段指示器        │   · 当前阶段指示器                        │
│   · 实时相似度进度圈      │   · 实时相似度进度圈                      │
│                          │                                          │
├──────────────────────────┴──────────────────────────────────────────┤
│  底部状态栏（高度 72px）：阶段标题 + 倒计时 + 轮次进度                  │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 各区域规格

#### 教师工具栏（TeacherToolbar.vue）
- 高度：52px，`position: fixed; top: 0; width: 100%; z-index: 100`
- 默认状态：`background: rgba(0,0,0,0.3); backdrop-filter: blur(8px)`，仅显示图标
- Hover 展开：显示完整按钮文字
- 按钮（从左到右）：
  - `⏸ 暂停` / `▶ 继续`（宽 100px）
  - `⏭ 跳过本轮`（宽 100px）
  - `⭐ 鼓励加分 +10`（宽 140px，点击后弹出选择左/右玩家）
  - `👁 查看数据`（宽 100px，切换右下角 debug 面板显示原始 blendshape 数值）
  - `🚪 结束游戏`（宽 100px，右侧对齐）
- 当游戏暂停时，两侧摄像头画面叠加半透明遮罩 + 大字"已暂停"

#### PlayerPanel.vue（左右各一，镜像布局）
- 摄像头画面容器：`width: 100%; aspect-ratio: 16/9; border-radius: 16px; overflow: hidden`
- 人脸检测框：SVG 虚线矩形，颜色跟随玩家主题色（左蓝 `#4FC3F7` / 右橙 `#FFB74D`），检测到人脸时实线 + 呼吸光晕
- 玩家姓名标签：左下角，`background: rgba(0,0,0,0.5); color: white; padding: 6px 14px; border-radius: 20px; font-size: 18px`
- 角色徽章（出题/答题）：右上角，圆形徽章，出题方 `🎯 出题` / 答题方 `🪞 模仿`，字号 14px
- 实时相似度进度圈（仅 MIMICKING 阶段显示）：
  - 位置：摄像头画面中央叠加
  - SVG 圆环，直径 120px，stroke-width 10px
  - 进度颜色：0–49% 灰 → 50–74% 橙 → 75–89% 蓝 → 90–100% 绿
  - 圆心数字：当前相似度百分比，字号 28px

#### FrozenExpressionCard.vue（FROZEN 阶段，覆盖出题方半屏）
- 出题方摄像头画面定格（截图 base64）
- 叠加一层冰蓝色半透明遮罩 `rgba(79,195,247,0.25)`
- 右上角"已定格"徽章，雪花图标 + 字样
- 动效：从摄像头尺寸缩小至卡片大小（240×135px），移动到答题方屏幕中央作为"参考卡"

#### 底部状态栏
- 背景：`#EBF6FF`，高度 72px
- 左侧：左玩家得分（大字 36px，主题色）
- 中央：阶段标题（28px，粗体）+ 倒计时圆圈（SVG，直径 52px）+ 轮次"第 N / M 轮"
- 右侧：右玩家得分（大字 36px，主题色）
- 轮次进度点：中央底部，共 N 个小圆点，已完成轮次填实

---

## 六、游戏状态机（useDuelStateMachine.ts）

### 6.1 状态转移图

```
SETUP
  │ 双摄像头就绪 + 确认开始
  ▼
READY（3-2-1 倒计时）
  │ 倒计时结束
  ▼
CAPTURING（出题方做表情，2s 持续触发捕捉）
  │ 捕捉成功 OR 教师手动跳过
  ▼
FROZEN（定格截图展示 1.5s，截图卡飞入答题方侧）
  │ 展示结束
  ▼
MIMICKING（答题方模仿，5s 倒计时）
  │ 倒计时结束 OR 相似度≥85% 持续 500ms 提前触发
  ▼
SCORING（计算最终得分，展示 2s）
  │ 展示结束
  ▼
ROUND_OVER（单轮结算，2.5s）
  │ 还有下一轮
  ├──────────────────────── 需要换手（当前出题方已完成本半场）
  │                               ▼
  │                         SWAPPING（换手动画 1.2s）
  │                               │
  └──────────────────────────────►┤
                                  ▼
                            CAPTURING（下一轮）
                                  │ 所有轮次完成
                                  ▼
                            GAME_OVER
```

### 6.2 核心状态机实现规格

```typescript
// composables/useDuelStateMachine.ts
import { ref, computed } from 'vue';
import { DUEL_CONFIG } from '../config/gameConfig';
import type { DuelGameState, DuelGamePhase, DuelRound, ExpressionSnapshot } from '../types';

export function useDuelStateMachine(totalRounds = DUEL_CONFIG.TOTAL_ROUNDS) {
  const state = ref<DuelGameState>({
    phase: 'SETUP',
    currentRound: 0,
    totalRounds,
    currentSetter: 'left',  // 第一轮左侧出题
    rounds: [],
    scores: { left: 0, right: 0 },
    isPaused: false,
    phaseTimeRemaining: 0,
  });

  let phaseTimer: ReturnType<typeof setTimeout> | null = null;

  // ─── 阶段推进 ────────────────────────────────────────────────────
  function transitionTo(phase: DuelGamePhase, afterMs?: number) {
    if (phaseTimer) clearTimeout(phaseTimer);
    state.value.phase = phase;
    if (afterMs !== undefined) {
      phaseTimer = setTimeout(() => autoAdvance(phase), afterMs);
    }
  }

  function autoAdvance(from: DuelGamePhase) {
    if (state.value.isPaused) return; // 暂停时不自动推进
    switch (from) {
      case 'READY':     return transitionTo('CAPTURING');
      case 'FROZEN':    return transitionTo('MIMICKING');
      case 'SCORING':   return transitionTo('ROUND_OVER', DUEL_CONFIG.ROUND_OVER_DISPLAY);
      case 'ROUND_OVER': return handleRoundOver();
      case 'SWAPPING':  return transitionTo('CAPTURING');
    }
  }

  function handleRoundOver() {
    const { currentRound, totalRounds, currentSetter } = state.value;
    if (currentRound >= totalRounds) {
      return transitionTo('GAME_OVER');
    }
    // 判断是否换手：每 ROUNDS_PER_PLAYER 轮换一次
    const needSwap = currentRound % DUEL_CONFIG.ROUNDS_PER_PLAYER === 0;
    if (needSwap) {
      state.value.currentSetter = currentSetter === 'left' ? 'right' : 'left';
      transitionTo('SWAPPING', DUEL_CONFIG.SWAP_ANIMATION);
    } else {
      transitionTo('CAPTURING');
    }
  }

  // ─── 关键事件处理 ────────────────────────────────────────────────

  /** 出题方表情捕捉成功，传入 snapshot */
  function onCaptureDone(snapshot: ExpressionSnapshot) {
    // 保存到当前轮次暂存
    state.value['_pendingSnapshot'] = snapshot; // 内部字段
    transitionTo('FROZEN', DUEL_CONFIG.FROZEN_DISPLAY_DURATION);
  }

  /** 答题方模仿倒计时结束，传入最终相似度 */
  function onMimicDone(peakSimilarity: number, finalSimilarity: number) {
    const similarity = Math.max(peakSimilarity, finalSimilarity);
    const floored = Math.max(similarity, DUEL_CONFIG.SIMILARITY_FLOOR);
    const scoreEntry = DUEL_CONFIG.SCORE_TABLE.find(s => floored >= s.min)!;

    const round: DuelRound = {
      roundIndex: state.value.currentRound,
      setter: state.value.currentSetter,
      mimic: state.value.currentSetter === 'left' ? 'right' : 'left',
      snapshot: state.value['_pendingSnapshot'],
      mimicPeakSimilarity: peakSimilarity,
      mimicFinalSimilarity: finalSimilarity,
      score: scoreEntry.score,
      duration: DUEL_CONFIG.MIMIC_COUNTDOWN * 1000, // 简化，实际可记录真实用时
    };

    state.value.rounds.push(round);
    state.value.scores[round.mimic] += scoreEntry.score;
    state.value.currentRound++;

    transitionTo('SCORING', DUEL_CONFIG.SCORING_DISPLAY);
  }

  /** 教师：暂停 / 继续 */
  function togglePause() {
    state.value.isPaused = !state.value.isPaused;
    if (!state.value.isPaused && phaseTimer === null) {
      // 继续时若有待推进的阶段，重新触发（简化：让各阶段组件监听 isPaused 自行处理）
    }
  }

  /** 教师：加分 */
  function addBonus(player: 'left' | 'right') {
    state.value.scores[player] += DUEL_CONFIG.TEACHER_BONUS_POINTS;
  }

  /** 教师：跳过当前轮 */
  function skipRound() {
    if (phaseTimer) clearTimeout(phaseTimer);
    onMimicDone(DUEL_CONFIG.SIMILARITY_FLOOR, DUEL_CONFIG.SIMILARITY_FLOOR);
  }

  const mimicPlayer = computed(() =>
    state.value.currentSetter === 'left' ? 'right' : 'left'
  );

  return {
    state,
    mimicPlayer,
    transitionTo,
    onCaptureDone,
    onMimicDone,
    togglePause,
    addBonus,
    skipRound,
  };
}
```

---

## 七、双摄像头管理（useDualCamera.ts）

```typescript
// composables/useDualCamera.ts
import { ref, onUnmounted } from 'vue';

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export function useDualCamera() {
  const availableCameras = ref<CameraDevice[]>([]);
  const streams = ref<{ left?: MediaStream; right?: MediaStream }>({});
  const error = ref<string | null>(null);

  /** 枚举所有视频输入设备 */
  async function enumerateCameras(): Promise<CameraDevice[]> {
    // 先请求权限，否则 label 为空
    await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableCameras.value = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `摄像头 ${d.deviceId.slice(0, 6)}` }));
    return availableCameras.value;
  }

  /** 启动指定摄像头，绑定到 video 元素 */
  async function startCamera(
    side: 'left' | 'right',
    deviceId: string,
    videoEl: HTMLVideoElement
  ) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      streams.value[side] = stream;
    } catch (e) {
      error.value = `摄像头启动失败：${(e as Error).message}`;
    }
  }

  /** 释放所有摄像头资源（组件卸载时调用）*/
  function releaseAll() {
    Object.values(streams.value).forEach(stream => {
      stream?.getTracks().forEach(t => t.stop());
    });
    streams.value = {};
  }

  onUnmounted(releaseAll);

  return { availableCameras, streams, error, enumerateCameras, startCamera, releaseAll };
}
```

---

## 八、MediaPipe 双实例管理（useMediaPipeDuel.ts）

```typescript
// composables/useMediaPipeDuel.ts
// 关键：两路摄像头各自独立的 FaceLandmarker 实例，避免状态污染

import { ref, onUnmounted } from 'vue';
import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision';
import { DUEL_CONFIG } from '../config/gameConfig';

type Side = 'left' | 'right';

const MODEL_PATH = '/models/face_landmarker.task'; // 打包到 public/models/

export function useMediaPipeDuel() {
  const landmarkers = ref<Partial<Record<Side, FaceLandmarker>>>({});
  const isReady = ref(false);
  const rafIds: Partial<Record<Side, number>> = {};

  // 当前帧的 blendshape 平滑窗口
  const smoothWindows: Partial<Record<Side, number[][]>> = {};

  async function initBoth() {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
      // 离线部署时改为 '/wasm'，将 WASM 文件拷到 public/wasm/
    );

    const createOne = (side: Side) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: DUEL_CONFIG.DETECTION_CONFIDENCE,
        minFaceLandmarksConfidence: DUEL_CONFIG.LANDMARK_CONFIDENCE,
        outputFaceBlendshapes: true,
      });

    // 两个实例并行初始化
    const [lm, rm] = await Promise.all([createOne('left'), createOne('right')]);
    landmarkers.value.left  = lm;
    landmarkers.value.right = rm;
    isReady.value = true;
  }

  /**
   * 启动检测循环
   * @param side       左/右
   * @param videoEl    对应的 <video> 元素
   * @param onFrame    每帧回调，返回平滑后的 blendshape map
   */
  function startDetection(
    side: Side,
    videoEl: HTMLVideoElement,
    onFrame: (blendshapes: Record<string, number> | null) => void
  ) {
    const lm = landmarkers.value[side];
    if (!lm) return;

    // 初始化平滑窗口
    smoothWindows[side] = [];

    let lastTime = -1;
    function loop(nowMs: number) {
      if (videoEl.readyState < 2) {
        rafIds[side] = requestAnimationFrame(loop);
        return;
      }
      if (nowMs !== lastTime) {
        lastTime = nowMs;
        const result: FaceLandmarkerResult = lm.detectForVideo(videoEl, nowMs);

        if (result.faceBlendshapes?.[0]?.categories) {
          const rawMap: Record<string, number> = {};
          result.faceBlendshapes[0].categories.forEach(c => {
            rawMap[c.categoryName] = c.score;
          });
          onFrame(smooth(side, rawMap));
        } else {
          onFrame(null); // 未检测到人脸
        }
      }
      rafIds[side] = requestAnimationFrame(loop);
    }
    rafIds[side] = requestAnimationFrame(loop);
  }

  /** 5 帧滚动平均 */
  function smooth(side: Side, raw: Record<string, number>): Record<string, number> {
    const window = smoothWindows[side]!;
    const values = DUEL_CONFIG.EMOTION_BLENDSHAPES.map(k => raw[k] ?? 0);
    window.push(values);
    if (window.length > DUEL_CONFIG.SMOOTH_FRAMES) window.shift();
    const avg = values.map((_, i) =>
      window.reduce((sum, frame) => sum + frame[i], 0) / window.length
    );
    const result: Record<string, number> = {};
    DUEL_CONFIG.EMOTION_BLENDSHAPES.forEach((k, i) => { result[k] = avg[i]; });
    return result;
  }

  function stopDetection(side: Side) {
    if (rafIds[side]) cancelAnimationFrame(rafIds[side]!);
  }

  function stopAll() {
    (['left', 'right'] as Side[]).forEach(stopDetection);
  }

  onUnmounted(() => {
    stopAll();
    landmarkers.value.left?.close();
    landmarkers.value.right?.close();
  });

  return { isReady, initBoth, startDetection, stopDetection, stopAll };
}
```

---

## 九、相似度计算算法（useBlendshapeSimilarity.ts）

### 9.1 算法说明

采用**加权 L1 距离**，转换为相似度百分比。比纯 L1 更好的地方在于：对高度激活的 blendshape 给予更高权重，避免"两人都是平脸时误判为高相似"。

```typescript
// composables/useBlendshapeSimilarity.ts
import { DUEL_CONFIG } from '../config/gameConfig';

// 高权重 blendshape（主要表情驱动肌肉，权重 2.0）
const HIGH_WEIGHT_KEYS = new Set([
  'jawOpen', 'mouthSmileLeft', 'mouthSmileRight',
  'browDownLeft', 'browDownRight', 'browInnerUp',
  'eyeWideLeft', 'eyeWideRight',
  'mouthFrownLeft', 'mouthFrownRight',
  'cheekPuff', 'mouthPucker',
]);

export function computeSimilarity(
  reference: Record<string, number>,   // 出题方快照
  current: Record<string, number>      // 答题方当前帧（已平滑）
): number {
  const keys = DUEL_CONFIG.EMOTION_BLENDSHAPES;
  let weightedDiffSum = 0;
  let weightSum = 0;

  keys.forEach(k => {
    const weight = HIGH_WEIGHT_KEYS.has(k) ? 2.0 : 1.0;
    const diff = Math.abs((reference[k] ?? 0) - (current[k] ?? 0));
    weightedDiffSum += diff * weight;
    weightSum += weight;
  });

  const avgWeightedDiff = weightedDiffSum / weightSum; // 0–1
  // 将距离转为相似度，并应用 gamma 校正（gamma < 1 使中间段分数更饱满）
  const gamma = 0.7;
  const raw = Math.pow(1 - avgWeightedDiff, 1 / gamma);
  return Math.round(raw * 100);
}

/** 
 * MIMICKING 阶段每帧调用，返回当前相似度
 * 外部维护 peakSimilarity = Math.max(peakSimilarity, result)
 */
export function useRealtimeSimilarity() {
  let peakSimilarity = 0;

  function feedFrame(
    reference: Record<string, number>,
    current: Record<string, number>
  ): number {
    const sim = computeSimilarity(reference, current);
    if (sim > peakSimilarity) peakSimilarity = sim;
    return sim;
  }

  function getPeak() { return peakSimilarity; }
  function reset()   { peakSimilarity = 0; }

  return { feedFrame, getPeak, reset };
}
```

---

## 十、各阶段 UI 规格

### 10.1 SETUP 阶段（SetupScreen.vue）

布局为居中卡片，最大宽度 760px：

1. **标题**："双人表情擂台" + 副标题 "锻炼表情沟通能力 · 需两路摄像头"
2. **摄像头数量提示**：
   - 检测到 2+ 个摄像头 → 绿色 "✓ 检测到 N 个摄像头"
   - 仅检测到 1 个 → 橙色 "⚠ 仅检测到 1 个摄像头，将进入共享镜头模式"
   - 0 个 → 红色 "✗ 未检测到摄像头，请检查设备连接"
3. **玩家配置卡片**（左右两张）：
   - 姓名输入框（`<input>`，占位符 "输入姓名"，字号 20px，高度 56px）
   - 摄像头下拉选择（`<select>`，显示设备名）
   - 小预览窗口（120×68px，实时画面，确认摄像头选对了）
4. **开始按钮**：宽 200px，高 64px，圆角 32px，背景 `#4FC3F7`，字号 22px
   - 必须两名玩家都填写姓名且摄像头可用才激活

### 10.2 CAPTURING 阶段

- 出题方（PlayerPanel）：
  - 摄像头画面正常显示
  - 顶部横幅（从画面上方滑入）："🎯 [姓名]，做一个你最厉害的表情！"，背景出题方主题色
  - 底部进度条：检测到人脸后开始填充，填满 2 秒触发捕捉（progress bar 高度 8px，颜色随玩家主题色）
  - 捕捉时刻：画面短暂白闪（`opacity: 1→0→1`，200ms），然后转为 FROZEN
- 答题方（PlayerPanel）：
  - 摄像头画面正常显示
  - 顶部横幅："⏳ 等待对方出题..."（灰色半透明）

### 10.3 FROZEN 阶段（FrozenExpressionCard.vue）

- 出题方侧：
  - 摄像头画面定格（canvas 截图，不再更新）
  - 叠加冰蓝遮罩 + ❄️"已定格"右上角徽章
- 答题方侧中央：
  - 定格截图以卡片形式从出题方侧飞入（CSS `@keyframes`，300ms）
  - 卡片尺寸：240×135px，白色边框 3px，`box-shadow: 0 8px 32px rgba(0,0,0,0.3)`
  - 卡片上方文字："📸 记住这个表情！"

### 10.4 MIMICKING 阶段（MimicPhase.vue）

- 答题方（PlayerPanel）：
  - 摄像头画面正常显示
  - 实时相似度进度圈（见第五节规格）叠加在画面中央
  - 右下角仍保留参考卡（缩小为 120×68px）
  - 相似度达到 85% 时：画面边框爆发绿色光晕 + 文字"超棒！！"
- 出题方侧：
  - 摄像头正常显示（出题方可以看着对方做）
  - 顶部横幅："👀 看 [对方姓名] 模仿你！"
- 底部状态栏倒计时圆圈：5→0，颜色从蓝渐变到橙（剩余 2 秒变红）

### 10.5 SCORING 阶段（SimilarityResult.vue）

- 屏幕中央弹出结果卡（从底部弹入，高度 320px，宽度 500px，白色圆角卡片）
- 内容：
  - 左右两张头像截图（小圆形）中间一个 ↔ 箭头
  - 大字相似度数字（72px，颜色跟随等级：绿/蓝/橙）+ "% 匹配"
  - 等级标签（如 "心灵相通！"）+ 星星行（1–3 颗）
  - 本轮得分 "+75"（数字从 0 滚动到目标值，duration 600ms）
- 两侧得分栏同步更新（数字滚动动效）

### 10.6 GAME_OVER（GameOverScreen.vue）

- 全屏庆祝界面：彩带粒子（canvas confetti，3 秒）
- 胜者公告（按总分）：大字 "[姓名] 是今天的表情大师！"
- 双方得分对比：大数字，彩色
- 总结数据（教师用）：
  - 平均相似度、最高相似度、最低相似度
  - 各轮星级回顾（6 个小圆点带星星）
- 按钮：`[ 再玩一次 ]`  `[ 返回首页 ]`

---

## 十一、数据记录（SQL.js 写入）

游戏结束时写入以下记录（与项目现有约定保持一致）：

```typescript
interface DuelGameRecord {
  gameId: 'expression-duel';
  sessionId: string;             // uuid，本次游戏唯一标识
  playedAt: string;              // ISO8601
  playerLeft: {
    studentId: string;
    name: string;
    totalScore: number;
    avgSimilarityAsMimic: number; // 作为答题方时的平均相似度
  };
  playerRight: {
    studentId: string;
    name: string;
    totalScore: number;
    avgSimilarityAsMimic: number;
  };
  rounds: DuelRound[];           // 完整轮次数据（见 types/index.ts）
  teacherBonusGiven: { player: 'left' | 'right'; amount: number }[];
  durationMs: number;            // 游戏总时长
}
```

> Codex 注意：调用项目现有的 `gameRecordService` 或直接写 SQL.js。`frameDataUrl`（截图 base64）**不写入数据库**，仅用于当局 UI 展示，避免数据库膨胀。

---

## 十二、Vite + Electron 环境配置提醒

### 12.1 vite.config.ts（已在上一次讨论中确认）

```typescript
export default defineConfig({
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],  // 必须排除，否则 WASM 打包报错
  },
})
```

### 12.2 Electron 主进程 CSP

```typescript
// electron/main.ts
mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src blob:; media-src *;"
        //                                  ↑ WASM 执行必须    ↑ MediaPipe Worker    ↑ 摄像头流
      ],
    },
  });
});
```

### 12.3 模型文件本地化

```
// 构建时将模型文件复制到 public/
public/
  models/
    face_landmarker.task         // 从 @mediapipe/tasks-vision npm 包中提取
  wasm/                          // 离线部署时使用（可选）
    vision_wasm_internal.js
    vision_wasm_internal.wasm
```

---

## 十三、执行顺序与约束

### 13.1 执行顺序（共 12 步，每步完成后告知）

1. 创建完整目录结构和空文件
2. 实现 `types/index.ts`（零依赖，纯类型）
3. 实现 `config/gameConfig.ts`（纯数据）
4. 实现 `useBlendshapeSimilarity.ts`（纯函数，可单独测试）
5. 实现 `useDualCamera.ts`（摄像头枚举与管理）
6. 实现 `useMediaPipeDuel.ts`（MediaPipe 双实例）
7. 实现 `useDuelStateMachine.ts`（游戏状态机核心）
8. 实现 `useTeacherControls.ts`（教师控制，薄层，调用状态机方法）
9. 实现各 UI 组件（SetupScreen → PlayerPanel → CapturePhase → FrozenExpressionCard → MimicPhase → SimilarityResult → RoundTransition → GameOverScreen → TeacherToolbar）
10. 组装 `index.vue`，串联所有组件和 composable
11. 实现数据记录逻辑
12. 验证双摄像头场景 + 单摄像头降级场景

### 13.2 硬性约束

- **不修改**任何与本游戏无关的已有文件
- **不重构**路由、评估中心、其他游戏模块
- `frameDataUrl` 截图**只存内存，不写数据库**
- 两个 `FaceLandmarker` 实例在组件 `onUnmounted` 时必须调用 `.close()` 释放资源，防止 Electron 内存泄漏
- 组件卸载时必须停止所有 `requestAnimationFrame` 循环
- 每步修改前说明将改动哪个文件，等待确认后再执行

---

*文档结束 · SCGP 双人表情擂台 PRD v1.0*
