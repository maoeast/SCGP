# 表情能量球重构实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 重构表情能量球小游戏，修复 27 寸横屏布局问题、降低识别门槛适配特殊儿童、增强视觉吸引力和庆祝动效。

**架构：** 保持 MediaPipe FaceLandmarker 检测管线不变，重构 EnergyBallGame.vue 为三栏等宽布局（摄像头 | 能量球 | 表情卡片），新增 hold-time 门控和滚动平均平滑机制，用自研 canvas confetti 替代简单文字庆祝。

**技术栈：** Vue 3 `<script setup>` + CSS animation + Canvas 2D confetti（沿用项目已有模式）

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/emotional/games/EnergyBallGame.vue` | **重构** | 主游戏组件：三栏布局、hold-time 门控、滚动平均、confetti 庆祝 |
| `src/composables/useEmotionDetector.ts` | 不改 | 现有 lerpScores 平滑已足够，滚动平均在游戏层实现 |
| `src/types/emotional/face-emotion.ts` | 不改 | EmotionType / EmotionScores / BlendshapeScores 保持现有定义 |
| `src/components/emotional/games/VisualSupportOverlay.vue` | 不改 | 保持现有面部引导叠层不变 |

**原则：** 所有改动集中在 `EnergyBallGame.vue` 一个文件。不引入新依赖、不新增文件、不改检测管线。

---

## 关键设计决策

### 1. 每关卡独立配置
每个关卡有自己的 `threshold`（置信度阈值）和 `holdDuration`（持续保持时间），不再用全局难度乘数。

```typescript
interface LevelConfig {
  target: EmotionType
  title: string
  subtitle: string
  emoji: string
  color: string
  threshold: number        // 基础置信度阈值（0-1）
  holdDuration: number     // 持续保持门槛（ms）
}

// difficulty 通过降低 threshold 和 holdDuration 适配
// difficulty=1: threshold × 0.75, holdDuration × 1.0
// difficulty=2: threshold × 1.0, holdDuration × 0.8
// difficulty=3: threshold × 1.25, holdDuration × 0.6
```

### 2. Hold-time 门控
在孩子开始积累能量之前，必须连续 `holdDuration` 毫秒保持表情在阈值以上。一旦低于阈值，计时器重置。

### 3. 滚动平均
在能量循环中使用 5 帧滑动窗口平滑检测值，减少单帧抖动导致的误触发。

### 4. 分级反馈
- 能量 ≥ 30%：显示"继续！加油！"文字
- 能量 ≥ 60%：能量球开始 pulse 发光（已有 `glowing` class，降低触发点）
- 能量 ≥ 100%：触发 confetti 庆祝

### 5. Confetti 庆祝
沿用项目已有的 Canvas 2D confetti 模式（参见 EmotionMonsterGame.vue），不引入 canvas-confetti 外部库。

---

## 任务分解

### 任务 1：更新关卡配置 + 难度适配逻辑

**文件：** `src/components/emotional/games/EnergyBallGame.vue`

**范围：** `<script setup>` 区域，替换现有的 `levels` 数组和 `difficultyThreshold`

- [ ] **步骤 1：更新 LevelConfig 接口和 levels 数组**

将现有 `LevelConfig` 替换为包含 `threshold` 和 `holdDuration` 的版本：

```typescript
interface LevelConfig {
  target: EmotionType
  title: string
  subtitle: string
  emoji: string
  color: string
  threshold: number
  holdDuration: number
}

const levels: [LevelConfig, ...LevelConfig[]] = [
  {
    target: 'Happy',
    title: '点亮太阳',
    subtitle: '笑一笑，让太阳亮起来',
    emoji: '☀️',
    color: '#ffd93d',
    threshold: 0.45,
    holdDuration: 300,
  },
  {
    target: 'Surprised',
    title: '吹走乌云',
    subtitle: '张大嘴巴，吹走乌云',
    emoji: '🌤️',
    color: '#74b9ff',
    threshold: 0.40,
    holdDuration: 300,
  },
  {
    target: 'Angry',
    title: '平息小火山',
    subtitle: '皱皱眉，再深呼吸',
    emoji: '🌋',
    color: '#ff6b6b',
    threshold: 0.45,
    holdDuration: 300,
  },
]
```

- [ ] **步骤 2：替换 difficultyThreshold 计算为 getEffectiveThreshold**

删除原有的 `difficultyThreshold` computed，替换为函数：

```typescript
function getEffectiveThreshold(level: LevelConfig): number {
  const multipliers = { 1: 0.75, 2: 1.0, 3: 1.25 } as const
  return clamp01(level.threshold * (multipliers[props.difficulty] ?? 1.0))
}

function getEffectiveHoldDuration(level: LevelConfig): number {
  const multipliers = { 1: 1.0, 2: 0.8, 3: 0.6 } as const
  return Math.round(level.holdDuration * (multipliers[props.difficulty] ?? 1.0))
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}
```

注意：删除原有的 `difficultyThreshold` computed 和 `const energyBallStyle` 中对它的引用，后续步骤会重建。

- [ ] **步骤 3：Commit**

```bash
git add src/components/emotional/games/EnergyBallGame.vue
git commit -m "refactor(energy-ball): 降级识别阈值 + 每关卡独立 holdDuration 配置"
```

---

### 任务 2：实现 hold-time 门控 + 滚动平均

**文件：** `src/components/emotional/games/EnergyBallGame.vue`

**范围：** `<script setup>` 区域的能量积累逻辑（`startEnergyLoop` 函数）

- [ ] **步骤 1：添加 hold-time 跟踪状态**

在 `// ---- State ----` 区域新增：

```typescript
const holdStartTime = ref<number | null>(null)
const holdProgress = computed(() => {
  if (holdStartTime.value === null) return 0
  const elapsed = performance.now() - holdStartTime.value
  const duration = getEffectiveHoldDuration(currentLevel.value)
  return Math.min(1, elapsed / duration)
})
const isHolding = computed(() => holdProgress.value < 1 && holdStartTime.value !== null)
const holdingLongEnough = computed(() => holdProgress.value >= 1)
```

- [ ] **步骤 2：重写 startEnergyLoop**

替换整个 `startEnergyLoop` 函数，加入滚动平均 + hold-time 门控：

```typescript
const ROLLING_WINDOW_SIZE = 5
let scoreWindow: number[] = []

function startEnergyLoop(): void {
  scoreWindow = []
  holdStartTime.value = null

  const tick = () => {
    if (props.paused) {
      energyAccumulator = requestAnimationFrame(tick)
      return
    }

    if (detector.appState.value === 'PLAYING') {
      const target = currentTarget.value
      const rawScore = detector.scores.value[target]
      const threshold = getEffectiveThreshold(currentLevel.value)

      // Rolling average
      scoreWindow.push(rawScore)
      if (scoreWindow.length > ROLLING_WINDOW_SIZE) {
        scoreWindow.shift()
      }
      const smoothedScore = scoreWindow.reduce((a, b) => a + b, 0) / scoreWindow.length

      if (smoothedScore > threshold) {
        // Hold-time gating
        if (holdStartTime.value === null) {
          holdStartTime.value = performance.now()
        }

        const elapsed = performance.now() - holdStartTime.value
        const holdDuration = getEffectiveHoldDuration(currentLevel.value)

        if (elapsed >= holdDuration) {
          const rate = (smoothedScore - threshold) * (0.8 + props.difficulty * 0.3)
          energyLevel.value = Math.min(100, energyLevel.value + rate)

          if (!levelComplete.value && energyLevel.value >= 100) {
            levelComplete.value = true
            completedLevels.value[levelIndex.value] = true
            props.markRoundDirty()
            props.audio.playSuccessCue()
            runCelebration()
          }
        }
      } else {
        holdStartTime.value = null
      }
    }

    energyAccumulator = requestAnimationFrame(tick)
  }
  energyAccumulator = requestAnimationFrame(tick)
}
```

- [ ] **步骤 3：在 nextLevel 和 prevLevel 中重置 hold-time**

在 `nextLevel` 和 `prevLevel` 函数中追加重置：

```typescript
function nextLevel(): void {
  if (levelIndex.value < levels.length - 1) {
    levelIndex.value++
    energyLevel.value = 0
    levelComplete.value = false
    holdStartTime.value = null
    scoreWindow = []
    resetCelebration()
  }
}

function prevLevel(): void {
  if (levelIndex.value > 0) {
    levelIndex.value--
    energyLevel.value = 0
    levelComplete.value = false
    holdStartTime.value = null
    scoreWindow = []
    resetCelebration()
  }
}
```

- [ ] **步骤 4：Commit**

```bash
git add src/components/emotional/games/EnergyBallGame.vue
git commit -m "feat(energy-ball): hold-time 门控 + 5帧滚动平均平滑"
```

---

### 任务 3：实现 confetti 庆祝动效

**文件：** `src/components/emotional/games/EnergyBallGame.vue`

**范围：** `<script setup>` 区域新增 confetti 逻辑 + `<template>` 新增 canvas 元素

- [ ] **步骤 1：添加 confetti 状态和逻辑**

在 `// ---- State ----` 区域新增：

```typescript
interface ConfettiPiece {
  x: number; y: number
  vx: number; vy: number
  size: number; rotate: number; spin: number
  life: number; color: string
}

const CONFETTI_COLORS = ['#ffd93d', '#ff6b6b', '#74b9ff', '#55efc4', '#a29bfe', '#fd79a8']
let confettiPieces: ConfettiPiece[] = []
let celebrationFrame = 0
const celebrationCanvas = ref<HTMLCanvasElement | null>(null)
```

在 `// ---- Energy accumulation ----` 区域之后新增：

```typescript
// ---- Celebration ----

function runCelebration(): void {
  const canvas = celebrationCanvas.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio
  canvas.height = rect.height * window.devicePixelRatio
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

  confettiPieces = Array.from({ length: 80 }).map(() => ({
    x: rect.width * 0.5 + (Math.random() - 0.5) * 160,
    y: rect.height * 0.4 + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -7 - 2.5,
    size: Math.random() * 9 + 5,
    rotate: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.24,
    life: 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] ?? '#ffd93d',
  }))

  const draw = (): void => {
    if (props.paused) return
    ctx.clearRect(0, 0, rect.width, rect.height)

    confettiPieces = confettiPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.08,
        rotate: piece.rotate + piece.spin,
        life: piece.life - 0.012,
      }))
      .filter((piece) => piece.life > 0)

    for (const piece of confettiPieces) {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rotate)
      ctx.fillStyle = piece.color
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.66)
      ctx.restore()
    }

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0) {
      celebrationFrame = window.requestAnimationFrame(draw)
    }
  }

  draw()
}

function resetCelebration(): void {
  if (celebrationFrame) {
    cancelAnimationFrame(celebrationFrame)
    celebrationFrame = 0
  }
  confettiPieces = []
  const canvas = celebrationCanvas.value
  if (canvas) {
    const ctx = canvas.getContext('2d')
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}
```

在 `onBeforeUnmount` 中追加 `resetCelebration()`：

```typescript
onBeforeUnmount(() => {
  stopEnergyLoop()
  resetCelebration()
  detector.dispose()
  stopCamera()
})
```

- [ ] **步骤 2：在 template 的 camera-area 区域末尾添加 confetti canvas**

在 `</div>` (`.camera-area` 的闭合标签) 之前插入：

```html
      <!-- Celebration canvas -->
      <canvas
        ref="celebrationCanvas"
        class="celebration-canvas"
      />
```

- [ ] **步骤 3：Commit**

```bash
git add src/components/emotional/games/EnergyBallGame.vue
git commit -m "feat(energy-ball): 自研 canvas confetti 庆祝动效"
```

---

### 任务 4：重写模板为三栏布局

**文件：** `src/components/emotional/games/EnergyBallGame.vue`

**范围：** `<template>` 区域完整重写

- [ ] **步骤 1：替换整个 template**

```html
<template>
  <section class="energy-ball-game" :class="{ paused }">
    <!-- LEFT: Camera area -->
    <div class="column camera-column">
      <div class="camera-area">
        <video
          ref="videoRef"
          class="camera-feed"
          autoplay
          playsinline
          muted
        />

        <VisualSupportOverlay
          :width="videoWidth"
          :height="videoHeight"
          :landmarks="detector.landmarks.value"
          :face-detected="detector.faceDetected.value"
          :scores="detector.scores.value"
          :active-emotion="currentTarget"
          :threshold="getEffectiveThreshold(currentLevel)"
          :show-calibration="detector.isCalibrating.value"
          :calibration-progress="detector.calibrationProgress.value"
        />

        <!-- Demo emotion badge (bottom-right corner) -->
        <div v-if="detector.appState.value === 'PLAYING'" class="demo-badge">
          <span class="demo-emoji">{{ levelTheme.emoji }}</span>
          <span class="demo-label">{{ levelTheme.subtitle }}</span>
        </div>

        <!-- Camera error -->
        <div v-if="cameraError" class="overlay-prompt">
          <div class="error-card">
            <div class="prompt-icon">📷</div>
            <h3>无法访问摄像头</h3>
            <p>{{ cameraError }}</p>
            <button class="start-button" type="button" @click="retryCamera">
              重试
            </button>
          </div>
        </div>

        <!-- Detector init error -->
        <div v-else-if="detector.initError.value" class="overlay-prompt">
          <div class="error-card">
            <div class="prompt-icon">⚠️</div>
            <h3>表情检测加载失败</h3>
            <p>{{ detector.initError.value }}</p>
          </div>
        </div>

        <!-- Waiting for detector -->
        <div v-else-if="!detector.isReady.value" class="overlay-prompt">
          <div class="prompt-card">
            <div class="prompt-icon loading-icon">🔍</div>
            <h3>正在加载检测模型</h3>
            <p>首次加载可能需要几秒钟...</p>
          </div>
        </div>

        <!-- Calibration: pre-start -->
        <div v-else-if="detector.appState.value === 'CALIBRATION' && !detector.isCalibrating.value" class="overlay-prompt">
          <div class="prompt-card">
            <div class="prompt-icon">📷</div>
            <h3>准备好了吗？</h3>
            <p>请面向摄像头，保持自然表情</p>
            <p v-if="!detector.faceDetected.value" class="hint-text">未检测到人脸，请调整位置</p>
            <button class="start-button" type="button" @click="beginCalibration">
              开始校准
            </button>
          </div>
        </div>

        <!-- Calibration: in progress -->
        <div v-else-if="detector.isCalibrating.value" class="overlay-prompt calibration-active">
          <div class="calibration-card">
            <div class="calibration-ring-visual">
              <svg viewBox="0 0 80 80" width="80" height="80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="5" />
                <circle
                  cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="5"
                  stroke-linecap="round"
                  :stroke-dasharray="2 * Math.PI * 34"
                  :stroke-dashoffset="2 * Math.PI * 34 * (1 - detector.calibrationProgress.value)"
                  class="cal-arc"
                />
              </svg>
              <span class="cal-percent">{{ Math.round(detector.calibrationProgress.value * 100) }}%</span>
            </div>
            <p>看镜头休息一下...</p>
            <p v-if="!detector.faceDetected.value" class="hint-text">未检测到人脸，请面向摄像头</p>
          </div>
        </div>

        <!-- Celebration canvas -->
        <canvas ref="celebrationCanvas" class="celebration-canvas" />
      </div>

      <!-- Face detection indicator (below camera) -->
      <div class="detection-status" :class="{ detected: detector.faceDetected.value }">
        <span class="status-dot" />
        <span>{{ detector.faceDetected.value ? '已检测到人脸' : '未检测到人脸' }}</span>
      </div>
    </div>

    <!-- CENTER: Energy ball -->
    <div class="column center-column">
      <!-- Task instruction -->
      <div class="task-instruction">
        <span class="task-emoji">{{ levelTheme.emoji }}</span>
        <span class="task-text">{{ levelTheme.subtitle }}</span>
      </div>

      <!-- Hold progress ring (visible during hold-time gating) -->
      <div v-if="isHolding && !levelComplete" class="hold-indicator">
        <svg viewBox="0 0 100 100" width="100" height="100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="6" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            :stroke="levelTheme.color"
            stroke-width="6"
            stroke-linecap="round"
            :stroke-dasharray="2 * Math.PI * 44"
            :stroke-dashoffset="2 * Math.PI * 44 * (1 - holdProgress)"
            class="hold-arc"
          />
        </svg>
        <span class="hold-label">保持住...</span>
      </div>

      <!-- Energy ball -->
      <div class="energy-ball-container">
        <div
          class="energy-ball"
          :class="{ glowing: energyLevel >= 60, celebrating: levelComplete }"
          :style="energyBallStyle"
        >
          <span class="ball-emoji">{{ levelTheme.emoji }}</span>
        </div>

        <!-- Tiered feedback -->
        <transition name="fade">
          <span v-if="energyLevel >= 30 && energyLevel < 100 && !levelComplete" class="feedback-text">
            {{ energyLevel >= 60 ? '快到了！继续！' : '继续！加油！' }}
          </span>
        </transition>

        <!-- Energy percentage -->
        <span class="energy-percent" :style="{ color: levelTheme.color }">
          ⚡ {{ Math.round(energyLevel) }}%
        </span>
      </div>

      <!-- Energy bar -->
      <div class="energy-bar-container">
        <div class="energy-bar">
          <div class="energy-fill" :style="{ width: energyLevel + '%', background: energyBarGradient }" />
        </div>
      </div>

      <!-- Level complete banner -->
      <transition name="pop">
        <div v-if="levelComplete" class="level-complete-banner">
          <span class="complete-icon">✨</span>
          <span>太棒了！</span>
        </div>
      </transition>
    </div>

    <!-- RIGHT: Emotion card grid -->
    <div class="column card-column">
      <div class="card-grid">
        <div
          v-for="emotion in emotions"
          :key="emotion"
          class="emotion-card"
          :class="{ active: emotion === currentTarget, detected: detector.scores.value[emotion] > getEffectiveThreshold(currentLevel) }"
        >
          <div class="card-ring-wrapper">
            <svg viewBox="0 0 64 64" width="64" height="64" class="card-ring">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(0,0,0,0.08)" stroke-width="4" />
              <circle
                cx="32" cy="32" r="28" fill="none"
                :stroke="emotionColors[emotion]"
                stroke-width="4"
                stroke-linecap="round"
                :stroke-dasharray="2 * Math.PI * 28"
                :stroke-dashoffset="2 * Math.PI * 28 * (1 - detector.scores.value[emotion])"
                class="card-ring-fill"
              />
            </svg>
            <span class="card-score">{{ Math.round(detector.scores.value[emotion] * 100) }}</span>
          </div>
          <span class="card-emoji">{{ emotionEmojis[emotion] }}</span>
          <span class="card-label">{{ emotionLabels[emotion] }}</span>
        </div>
      </div>

      <!-- Navigation -->
      <div class="nav-buttons">
        <button
          v-if="levelIndex > 0"
          class="nav-btn prev-btn"
          type="button"
          @click="prevLevel"
        >
          上一关
        </button>
        <button
          v-if="levelIndex < levels.length - 1 && levelComplete"
          class="nav-btn next-btn"
          type="button"
          @click="nextLevel"
        >
          下一关
        </button>
        <button
          v-if="levelIndex === levels.length - 1 && levelComplete"
          class="nav-btn finish-btn"
          type="button"
          @click="finishGame"
        >
          完成！
        </button>
      </div>
    </div>
  </section>
</template>
```

- [ ] **步骤 2：更新 script 中的辅助数据**

在 `// ---- Constants ----` 区域补充：

```typescript
const emotionEmojis: Record<EmotionType, string> = {
  Happy: '😄',
  Surprised: '😲',
  Angry: '😠',
  Neutral: '😌',
}

const emotionColors: Record<EmotionType, string> = {
  Happy: '#ffd93d',
  Surprised: '#74b9ff',
  Angry: '#ff6b6b',
  Neutral: '#55efc4',
}
```

更新 `energyBallStyle` computed：

```typescript
const energyBallStyle = computed(() => ({
  borderColor: levelTheme.value.color,
  boxShadow: energyLevel.value > 30
    ? `0 0 ${energyLevel.value * 0.6}px ${levelTheme.value.color}`
    : 'none',
}))

const energyBarGradient = computed(() =>
  `linear-gradient(90deg, #74b9ff, ${levelTheme.value.color}, #ff6b6b)`
)
```

- [ ] **步骤 3：Commit**

```bash
git add src/components/emotional/games/EnergyBallGame.vue
git commit -m "refactor(energy-ball): 三栏布局 + 表情卡片网格 + hold-time 环形进度"
```

---

### 任务 5：重写样式

**文件：** `src/components/emotional/games/EnergyBallGame.vue`

**范围：** `<style scoped>` 区域完整重写

- [ ] **步骤 1：替换整个 style 区域**

```css
<style scoped>
.energy-ball-game {
  display: flex;
  gap: 20px;
  min-height: calc(100vh - 120px);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(135deg, #E3F4FF 0%, #FFF8E1 100%);
}

.energy-ball-game.paused {
  opacity: 0.7;
  pointer-events: none;
}

/* ---- Three-column layout ---- */

.column {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.camera-column {
  flex: 0 0 30%;
  min-width: 0;
}

.center-column {
  flex: 0 0 40%;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.card-column {
  flex: 0 0 28%;
  justify-content: space-between;
}

/* ---- Camera area ---- */

.camera-area {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 24px;
  overflow: hidden;
  background: #1a1a2e;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.camera-feed {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}

.demo-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 12;
}

.demo-emoji {
  font-size: 28px;
}

.demo-label {
  font-size: 14px;
  font-weight: 600;
  color: #2d3436;
}

/* Celebration canvas */
.celebration-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 20;
}

/* ---- Overlays (shared) ---- */

.overlay-prompt {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 15;
}

.prompt-card,
.error-card {
  padding: 28px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.95);
  text-align: center;
  max-width: 300px;
}

.prompt-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.loading-icon {
  animation: spin 2s linear infinite;
}

.prompt-card h3,
.error-card h3 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #2d3436;
}

.prompt-card p,
.error-card p {
  margin: 0 0 16px;
  color: #636e72;
  font-size: 15px;
}

.hint-text {
  color: #e17055 !important;
  font-weight: 600;
  font-size: 14px !important;
  margin-bottom: 12px !important;
}

.start-button {
  padding: 12px 32px;
  border: none;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 17px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 217, 61, 0.4);
}

.error-card {
  background: rgba(255, 235, 235, 0.95);
  color: #c0392b;
}

/* ---- Calibration ---- */

.calibration-active {
  background: rgba(0, 0, 0, 0.35);
}

.calibration-card {
  text-align: center;
  color: #fff;
}

.calibration-ring-visual {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
}

.cal-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.3s ease;
}

.cal-percent {
  position: absolute;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.calibration-card p {
  margin: 4px 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.9);
}

/* ---- Detection status ---- */

.detection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #b2bec3;
  background: rgba(0, 0, 0, 0.04);
}

.detection-status.detected {
  color: #00b894;
  background: rgba(0, 184, 148, 0.08);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #b2bec3;
}

.detection-status.detected .status-dot {
  background: #00b894;
  animation: dot-pulse 1.5s ease-in-out infinite;
}

/* ---- Task instruction ---- */

.task-instruction {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.task-emoji {
  font-size: 32px;
}

.task-text {
  font-size: 22px;
  font-weight: 700;
  color: #2d3436;
}

/* ---- Hold indicator ---- */

.hold-indicator {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.hold-arc {
  transform: rotate(-90deg);
  transform-origin: center;
  transition: stroke-dashoffset 0.1s linear;
}

.hold-label {
  font-size: 14px;
  font-weight: 600;
  color: #636e72;
}

/* ---- Energy ball ---- */

.energy-ball-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.energy-ball {
  width: 220px;
  height: 220px;
  border-radius: 50%;
  border: 5px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 40% 35%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.7));
  transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
}

.energy-ball.glowing {
  animation: ball-pulse 1.2s ease-in-out infinite;
}

.energy-ball.celebrating {
  animation: ball-celebrate 0.6s ease-in-out 3;
}

.ball-emoji {
  font-size: 80px;
}

.feedback-text {
  font-size: 18px;
  font-weight: 700;
  color: #2d3436;
  text-align: center;
  animation: fade-pulse 1.5s ease-in-out infinite;
}

.energy-percent {
  font-size: 24px;
  font-weight: 800;
}

/* ---- Energy bar ---- */

.energy-bar-container {
  width: 240px;
}

.energy-bar {
  width: 100%;
  height: 12px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.energy-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.15s ease;
}

/* ---- Emotion card grid ---- */

.card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.emotion-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 10px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.emotion-card.active {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.emotion-card.detected {
  animation: card-bounce 0.5s ease;
}

.card-ring-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-ring {
  transform: rotate(-90deg);
}

.card-ring-fill {
  transition: stroke-dashoffset 0.15s ease;
}

.card-score {
  position: absolute;
  font-size: 14px;
  font-weight: 700;
  color: #2d3436;
}

.card-emoji {
  font-size: 32px;
}

.card-label {
  font-size: 14px;
  font-weight: 600;
  color: #636e72;
}

/* ---- Level complete banner ---- */

.level-complete-banner {
  padding: 14px 28px;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffd93d, #ff9a3c);
  color: #2d3436;
  font-size: 20px;
  font-weight: 700;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.complete-icon {
  font-size: 26px;
}

/* ---- Navigation ---- */

.nav-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.nav-btn {
  flex: 1;
  max-width: 160px;
  height: 56px;
  border: none;
  border-radius: 28px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.nav-btn:hover {
  transform: translateY(-1px);
}

.prev-btn {
  background: rgba(0, 0, 0, 0.06);
  color: #636e72;
}

.next-btn {
  background: linear-gradient(135deg, #74b9ff, #0984e3);
  color: #fff;
}

.finish-btn {
  background: linear-gradient(135deg, #55efc4, #00b894);
  color: #fff;
}

/* ---- Transitions ---- */

.pop-enter-active,
.pop-leave-active {
  transition: all 0.3s ease;
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ---- Keyframes ---- */

@keyframes ball-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

@keyframes ball-celebrate {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes card-bounce {
  0%, 100% { transform: scale(1); }
  40% { transform: scale(1.08); }
}

@keyframes dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes fade-pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

/* ---- Responsive ---- */

@media (max-width: 900px) {
  .energy-ball-game {
    flex-direction: column;
    padding: 12px;
  }

  .column {
    flex: none !important;
  }

  .camera-area {
    aspect-ratio: 16 / 9;
  }

  .energy-ball {
    width: 160px;
    height: 160px;
  }

  .ball-emoji {
    font-size: 56px;
  }

  .card-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
```

- [ ] **步骤 2：Commit**

```bash
git add src/components/emotional/games/EnergyBallGame.vue
git commit -m "style(energy-ball): 三栏布局样式 + 220px能量球 + 表情卡片 + 触摸友好按钮"
```

---

### 任务 6：类型检查 + 手工验证

**文件：** 全局

- [ ] **步骤 1：运行 type-check**

```bash
npm run type-check
```

预期：无新增报错。如 `vite.config.ts` 有既有报错可以忽略。

- [ ] **步骤 2：启动 Electron 开发环境手工验证**

```bash
npm run electron:dev
```

验证清单：
1. 进入 `情绪调节 → 表情能量球`
2. 摄像头权限授权后，确认三栏布局正常
3. 校准完成后，对镜头笑 → hold-time 环出现 → 保持 300ms → 能量开始积累
4. 能量 30% 时出现"继续！加油！"
5. 能量 60% 时能量球开始 pulse 发光
6. 能量 100% 时触发 confetti 庆祝 + "太棒了！" banner
7. 点击"下一关"，确认能量重置、confetti 消失
8. 完成全部三关后点击"完成！"

- [ ] **步骤 3：更新 `.continue-here.md`**

将当前任务状态更新为已完成，记录验证结果。

---

## 自检

### 规格覆盖度

| 需求 | 对应任务 |
|------|---------|
| 27寸横屏三栏布局 | 任务 4 + 任务 5 |
| 能量球放大至 220px | 任务 5（CSS `.energy-ball { width: 220px; height: 220px; }`） |
| 移除数字条形图 → 2×2 表情卡片 | 任务 4（`card-grid`） |
| 降低置信度阈值 0.45 | 任务 1（`LevelConfig.threshold`） |
| 持续时间 300ms | 任务 1（`LevelConfig.holdDuration`）+ 任务 2（hold-time 门控） |
| 5 帧滚动平均 | 任务 2（`scoreWindow`） |
| 分级反馈 30%/60%/100% | 任务 4（`feedback-text` + `glowing` 阈值调整） |
| confetti 庆祝 | 任务 3（`runCelebration`） |
| 底部导航居中 | 任务 4 + 任务 5 |
| 不改检测管线 | ✅ 不涉及 `useEmotionDetector.ts` |
| 不引入新依赖 | ✅ 使用自研 canvas confetti |

### 占位符扫描
无 TODO / TBD / 后续实现等占位符。

### 类型一致性
- `EmotionType` 使用 `'Happy' | 'Surprised' | 'Angry' | 'Neutral'`（来自 `face-emotion.ts`）
- `EmotionScores` 字段名与 `detector.scores.value[emotion]` 一致
- `LevelConfig` 在同一文件内定义和使用
- `getEffectiveThreshold` / `getEffectiveHoldDuration` 在定义后使用

### 多 Agent 执行策略

| 任务 | 可并行 | 依赖 |
|------|--------|------|
| 任务 1 | 是（Agent A） | 无 |
| 任务 2 | 是（Agent B） | 无（但修改同文件，建议 A→B 顺序） |
| 任务 3 | 是（Agent C） | 无 |
| 任务 4 | 否 | 任务 1-3（模板引用脚本中的变量） |
| 任务 5 | 否 | 任务 4（样式匹配模板结构） |
| 任务 6 | 否 | 任务 1-5 全部完成 |

**推荐执行方案：** 由于任务 1-4 都修改同一文件，最佳方案是单个 Agent 按顺序执行任务 1→2→3→4→5，然后执行任务 6 验证。这样避免多 Agent 改同一文件导致的合并冲突。
