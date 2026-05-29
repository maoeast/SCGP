# PRD v2：空中魔法指挥棒（Air Conductor）康复训练游戏

**版本**：2.0 | **作者**：审校重写 | **目标读者**：Codex 实现

---

## 1. 功能定位

面向脑瘫、自闭症、大运动发育迟缓儿童的上肢伸展与双侧协调康复训练。  
通过摄像头实时捕捉双臂姿态，将手臂运动映射为 Tone.js 音频参数，  
实现"身体即乐器"的非接触式交互，兼顾康复数据采集与趣味游玩体验。

---

## 2. 技术栈与约束

| 项目 | 规范 |
|---|---|
| 前端框架 | Vue 3 `<script setup lang="ts">` |
| 构建工具 | Vite + Electron |
| 视觉引擎 | `@mediapipe/pose`（使用 `POSE_CONNECTIONS` 骨架，model_complexity: 1） |
| 音频引擎 | Tone.js（双 Synth 架构，详见第 4 节） |
| 样式 | 纯原生 CSS，禁止 Tailwind |
| 布局 | 100vh 单屏无滚动 |
| 数据库 | SQL.js（本地 SQLite） |
| 背景音乐 | 接入 SCGP 共享音乐系统，profile 固定为 `music-minimal`（详见第 7 节） |

> **MediaPipe 模型说明**：
> `model_complexity: 1` 在普通笔记本上可维持 25+ fps；
> 若检测 fps 持续低于 20，自动降为 `model_complexity: 0` 并在面板提示。

---

## 3. 使用的骨骼关键点

仅追踪以下 6 个关键点（不追踪下肢，减少计算量）：

```
LEFT_SHOULDER  = 11
RIGHT_SHOULDER = 12
LEFT_ELBOW     = 13
RIGHT_ELBOW    = 14
LEFT_WRIST     = 15
RIGHT_WRIST    = 16
```

**置信度过滤**：每帧检测到的关键点必须满足 `visibility >= 0.6`，
否则视为"人体离框"，触发离框降级处理（见第 5.4 节）。

---

## 4. TypeScript 接口定义

Codex 必须使用以下接口，不得自行定义替代结构：

```ts
// ── 单帧姿态数据（滤波后）──
interface ArmPose {
  left:  { x: number; y: number; visible: boolean }  // 手腕归一化坐标
  right: { x: number; y: number; visible: boolean }
  leftShoulder:  { y: number }  // 用于"有效抬臂"相对判定
  rightShoulder: { y: number }
  timestamp: number  // performance.now()
}

// ── 游戏状态机 ──
type GamePhase =
  | 'idle'          // 等待开始
  | 'calibrating'   // 校准阶段（3s 采集静息位）
  | 'countdown'     // 3-2-1 倒计时
  | 'playing'       // 训练中
  | 'paused'        // 暂停
  | 'finishing'     // 结束动画播放中
  | 'done'          // 结算完成

// ── 单次训练实时统计 ──
interface SessionStats {
  durationSec: number
  leftArmExtensions: number    // 有效抬举次数
  rightArmExtensions: number
  bilateralCoordSec: number    // 双侧协同累计秒数
  maxReachScore: number        // 0-100，双臂最高同时伸展程度
}

// ── SQL.js 写入记录 ──
interface TrainingRecord {
  studentId: string
  durationSec: number
  leftArmExtensions: number
  rightArmExtensions: number
  bilateralCoordSec: number
  maxReachScore: number
  createdAt: string  // ISO 8601
}

// ── 校准结果 ──
interface CalibrationResult {
  leftShoulderRestY: number   // 静息位肩部 Y（归一化）
  rightShoulderRestY: number
  capturedAt: number
}
```

---

## 5. 核心功能规格

### 5.1 游戏状态机

```
idle ──[点击开始]──► calibrating ──[3s采集完成]──► countdown
                                                      │
                               ◄──[点击暂停]── playing ◄──[3-2-1结束]
                               │
                          paused ──[继续]──► playing
                               
playing ──[点击结束 或 达到训练时长]──► finishing ──► done
```

- `idle`：显示开始界面，摄像头预览但不采集数据
- `calibrating`：自动采集 3 秒，计算左右肩部静息 Y 均值，写入 `CalibrationResult`
- `countdown`：倒计时 3 秒，数字动画居中显示，期间音频引擎预热
- `playing`：主训练阶段，全量数据采集
- `finishing`：播放完成粒子动画（1.5s），写入数据库
- `done`：显示本次训练统计卡片

### 5.2 姿态平滑滤波（指数移动平均）

**不使用简单移动平均**，改用指数平滑，精确实现如下：

```ts
// 平滑系数 α：值越小越平滑，越大响应越快
// α = 0.12 等效约 8 帧滑动窗口，适合脑瘫高频抖动消除
const SMOOTH_ALPHA = 0.12

class PoseSmoother {
  private prev: ArmPose | null = null

  smooth(raw: ArmPose): ArmPose {
    if (!this.prev) { this.prev = raw; return raw }
    const a = SMOOTH_ALPHA
    const lerp = (p: number, c: number) => a * c + (1 - a) * p
    return {
      left:  {
        x: lerp(this.prev.left.x, raw.left.x),
        y: lerp(this.prev.left.y, raw.left.y),
        visible: raw.left.visible,
      },
      right: {
        x: lerp(this.prev.right.x, raw.right.x),
        y: lerp(this.prev.right.y, raw.right.y),
        visible: raw.right.visible,
      },
      leftShoulder:  { y: lerp(this.prev.leftShoulder.y,  raw.leftShoulder.y) },
      rightShoulder: { y: lerp(this.prev.rightShoulder.y, raw.rightShoulder.y) },
      timestamp: raw.timestamp,
    }
  }

  reset() { this.prev = null }
}
```

### 5.3 有效抬臂判定（相对肩部，非绝对坐标）

**原稿问题**：用手腕绝对 Y < 0.4 判断抬臂，坐轮椅/个子矮的儿童会误判。  
**修正方案**：以同侧肩部为基准的相对高度。

```ts
// 有效抬举定义：手腕 Y 比肩部 Y 高出超过 LIFT_THRESHOLD（归一化单位）
// 注意：屏幕 Y 轴向下为正，所以手腕高于肩部时 wristY < shoulderY
const LIFT_THRESHOLD = 0.15   // 手腕需高于肩部至少 15% 屏幕高度

function isArmLifted(wristY: number, shoulderY: number): boolean {
  return shoulderY - wristY > LIFT_THRESHOLD
}

// 抬举计数：需从 lifted=false 变为 lifted=true 才记一次（边沿触发）
// 同一次抬举持续多帧不重复计数；需回落后才能再次触发
// 防抖：回落后至少 300ms 才能再次触发（防止抖动反复计数）
const ARM_COUNT_COOLDOWN_MS = 300
```

### 5.4 人体离框降级处理

```ts
// 检测到 visible < 0.6 的连续帧数超过 OFFFRAME_THRESHOLD 时触发降级
const OFFFRAME_THRESHOLD = 10  // 约 400ms（25fps）

// 降级行为：
// 1. 音量在 0.3s 内 rampTo(-40dB)（不直接静音，避免突然断音）
// 2. 覆盖层显示"请回到摄像头前 📷"提示
// 3. 训练计时器暂停（不计入 durationSec）
// 4. 抬臂/协同统计暂停
// 恢复：连续 5 帧 visible >= 0.6 后，0.3s 内音量恢复，提示消失，计时恢复
```

### 5.5 Tone.js 音频映射（双 Synth 架构）

**架构说明**：左右手各一个独立 `Tone.Synth`，共享一条效果链。  
不使用 PolySynth（PolySynth 设计用于和弦演奏，不适合连续控制场景）。

```
左手 Synth（triangle波）──┐
                           ├──► Tone.Filter ──► Tone.FeedbackDelay ──► Tone.Destination
右手 Synth（sine波）──────┘
```

**音阶配置**（C 大调五声音阶，适合儿童，不存在不和谐音程）：

```ts
const PENTATONIC_SCALE = [
  'C4','D4','E4','G4','A4',
  'C5','D5','E5','G5','A5',
  'C6',
]  // 共 11 个音，index 0=最低(手最低), 10=最高(手最高)
```

**完整映射表**：

| 姿态输入 | 计算方式 | Tone.js 映射 | 音效描述 |
|---|---|---|---|
| 左手腕垂直位置 | `shoulderY - wristY`（相对高度，负值截断为0） | 线性映射 → PENTATONIC_SCALE 索引（左 Synth） | 左手越高音越高 |
| 右手腕垂直位置 | 同上 | 线性映射 → PENTATONIC_SCALE 索引（右 Synth） | 右手越高音越高 |
| 左手腕水平位置 | `wrist.x`（0=左边,1=右边） | 映射 → `filter.frequency`（200Hz ~ 4000Hz，对数映射） | 双手张开音色明亮 |
| 右手腕水平位置 | 同上取均值 | 同上 | 双手合拢音色沉闷 |
| **双臂同时高举** | 左右手均 isArmLifted=true 且 `abs(left.x - right.x) > 0.4` | `delay.wet.rampTo(0.55, 0.3)` + 触发一次和弦 | 魔法高潮音效 |
| **双臂垂下** | 左右手 `shoulderY - wristY < 0`（低于肩部） | `Tone.Destination.volume.rampTo(-40, 0.4)` | 平稳静音 |
| 双臂高举后分开 | `delay.wet` 恢复 | `delay.wet.rampTo(0.1, 0.5)` | 回到正常混响 |

**防抖规则**：  
- 双臂同时高举和弦触发后，冷却时间 **1500ms**，期间不重复触发。  
- 音高变化使用 `exponentialRampToValueAtTime`，过渡时间 **0.08s**，不允许直接赋值。

**音量安全限制**：  
```ts
Tone.Destination.volume.value = -6  // 全局上限 -6dB，初始化时设置，不得超过此值
```

### 5.6 双侧协同时长算法

```ts
// 每帧判定：
// 条件1：左右手均可见（visible >= 0.6）
// 条件2：左右手均处于 isArmLifted=true 状态
// 条件3：左右手高度差在容许范围内：abs(leftRelH - rightRelH) < 0.12
//         （相对高度 = shoulderY - wristY）
// 满足以上三个条件的帧，累计计时（帧时间 ≈ 1000ms/fps，不足帧精度用 deltaTime 累加）

const BILATERAL_SYMMETRY_TOLERANCE = 0.12
```

---

## 6. UI 布局规格（100vh 单屏）

```
┌─────────────────────────────────────────────────────────────────┐
│  [返回准备页]                              [⚙ 设置] [⏸ 暂停]    │  ← topbar 48px
├────────────────────────────────────┬────────────────────────────┤
│                                    │  🎵 音高指示器              │
│   摄像头视频流（video 元素）         │  ████████░░  L            │
│   ┌─────────────────────────────┐  │  ██████░░░░  R            │
│   │  叠加 Canvas 层：           │  │                            │
│   │  · 骨架线（肩-肘-腕）       │  │  📊 本次训练               │
│   │  · 手腕追踪圆点（L/R 色区分）│  │  左臂抬举  ██  12次        │
│   │  · 魔法粒子系统             │  │  右臂抬举  ██   9次        │
│   │  · 离框提示覆盖             │  │  双侧协同  ██  00:42       │
│   └─────────────────────────────┘  │  最高伸展  ██  78分        │
│                                    │                            │
│   宽度：75%                         │  🕐 训练时长：02:15        │
│   video + canvas 绝对定位叠加       │                            │
│   video: z-index 0                 │  ┌──────────────────────┐  │
│   canvas: z-index 1                │  │   开始训练 / 结束训练  │  │
│                                    │  └──────────────────────┘  │
│                                    │  ┌──────────────────────┐  │
│                                    │  │     重新校准          │  │
│                                    │  └──────────────────────┘  │
│                                    │                            │
│                                    │  💾 数据已同步            │
└────────────────────────────────────┴────────────────────────────┘
  75%                                  25%
```

**Canvas 层渲染说明**：
- `video` 元素 + overlay `canvas` 使用相同的 `position: absolute; inset: 0`
- Canvas 分辨率跟随容器尺寸，`ResizeObserver` 监听并同步更新
- 骨架线颜色：左侧 `#4D96FF`，右侧 `#FF6B6B`
- 手腕追踪圆点：半径 12px，带 2px 白色描边

---

## 7. 粒子效果规格

粒子从**手腕位置**发射，手腕移动速度越快，粒子越密集：

```ts
interface MagicParticle {
  x: number; y: number          // Canvas 坐标
  vx: number; vy: number        // 初速度（手腕速度 * 0.3 + 随机扰动）
  life: number                  // 0~1，初始为 1
  decay: number                 // 每帧衰减量，0.02~0.04
  radius: number                // 初始半径 4~10px
  color: string                 // 左手 '#4D96FF'，右手 '#FF6B6B'
                                 // 双臂同时高举时：'#FFD700'
}

// 每帧发射数量：
// 基础 = 2 个/帧/手
// 移动速度（帧间坐标差）> 0.02 时额外 +3 个
// 双臂同时高举状态：总发射量 * 3 倍

// 粒子物理：
// 每帧：x += vx; y += vy; vy += 0.15（重力）; life -= decay
// life <= 0 时移除
// 最大粒子池：500 个（超出时丢弃最老的）
```

---

## 8. 康复数据与 SQL.js 规格

### 8.1 建表 SQL（应用首次启动时执行）

```sql
CREATE TABLE IF NOT EXISTS air_conductor_sessions (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id               TEXT    NOT NULL,
  duration_sec             INTEGER NOT NULL,
  left_arm_extensions      INTEGER NOT NULL DEFAULT 0,
  right_arm_extensions     INTEGER NOT NULL DEFAULT 0,
  bilateral_coord_sec      INTEGER NOT NULL DEFAULT 0,
  max_reach_score          INTEGER NOT NULL DEFAULT 0,
  created_at               TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_acs_student
  ON air_conductor_sessions(student_id, created_at);
```

### 8.2 `trainingDatabase.ts`（不得命名为 mockDatabase）

```ts
// 文件路径：src/database/trainingDatabase.ts
import type { TrainingRecord } from '../types/airConductor'

export function insertAirConductorSession(
  db: import('sql.js').Database,
  record: TrainingRecord
): void {
  const stmt = db.prepare(`
    INSERT INTO air_conductor_sessions
      (student_id, duration_sec, left_arm_extensions, right_arm_extensions,
       bilateral_coord_sec, max_reach_score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run([
    record.studentId,
    record.durationSec,
    record.leftArmExtensions,
    record.rightArmExtensions,
    record.bilateralCoordSec,
    record.maxReachScore,
    record.createdAt,
  ])
  stmt.free()
}

// 读取最近 N 条记录（用于结算页历史对比）
export function getRecentSessions(
  db: import('sql.js').Database,
  studentId: string,
  limit = 5
): TrainingRecord[] {
  const stmt = db.prepare(`
    SELECT * FROM air_conductor_sessions
    WHERE student_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `)
  const rows: TrainingRecord[] = []
  stmt.bind([studentId, limit])
  while (stmt.step()) {
    const r = stmt.getAsObject()
    rows.push({
      studentId:           r.student_id as string,
      durationSec:         r.duration_sec as number,
      leftArmExtensions:   r.left_arm_extensions as number,
      rightArmExtensions:  r.right_arm_extensions as number,
      bilateralCoordSec:   r.bilateral_coord_sec as number,
      maxReachScore:       r.max_reach_score as number,
      createdAt:           r.created_at as string,
    })
  }
  stmt.free()
  return rows
}
```

### 8.3 `studentId` 来源

从 Electron 的 `ipcRenderer` 或 SCGP 全局 Pinia store 中读取当前学生 ID：

```ts
// 优先从 store 读取
import { useStudentStore } from '@/stores/student'
const { currentStudentId } = useStudentStore()
// currentStudentId 不存在时使用 'unknown'，不得抛出异常
```

---

## 9. 背景音乐系统接入

本游戏本身即是音乐交互，背景音乐处理方式与空气木琴相同：

```ts
// 在 AirConductor.vue 的 onMounted 中
import { useMusicController } from '@/audio/game-music-controller'

const music = useMusicController()
music?.setProfile('music-minimal')  // 极轻垫底，不干扰主音
// GamePhase 变化时：
// playing → music?.setState('playing')
// done    → music?.setState('finish')
// 路由离开 → music?.stopMusic()
```

---

## 10. 交付文件清单

| 文件 | 路径 | 说明 |
|---|---|---|
| `AirConductor.vue` | `src/views/games/AirConductor.vue` | 主组件，包含完整 template + script |
| `usePoseAudio.ts` | `src/composables/usePoseAudio.ts` | 姿态捕获、滤波、音频映射、统计 |
| `trainingDatabase.ts` | `src/database/trainingDatabase.ts` | SQL.js 读写封装 |
| `airConductor.ts` | `src/types/airConductor.ts` | 全部 TS 接口定义（第 4 节） |

### `usePoseAudio.ts` 必须返回的接口：

```ts
export function usePoseAudio(videoEl: Ref<HTMLVideoElement | null>) {
  return {
    pose: readonly(pose),                    // Ref<ArmPose | null>
    phase: readonly(phase),                  // Ref<GamePhase>
    stats: readonly(stats),                  // Ref<SessionStats>
    calibration: readonly(calibration),      // Ref<CalibrationResult | null>
    isOffFrame: readonly(isOffFrame),        // Ref<boolean>
    startCalibration: () => void,
    startSession: () => void,
    pauseSession: () => void,
    resumeSession: () => void,
    endSession: () => Promise<void>,         // 写入数据库后 resolve
    dispose: () => void,                     // 清理所有资源
  }
}
```

---

## 11. 生命周期与资源销毁

`onUnmounted` 时必须按顺序执行：

```ts
onUnmounted(async () => {
  cancelAnimationFrame(rafId)              // 1. 停止渲染循环
  hands.close()                            // 2. 关闭 MediaPipe 实例
  videoEl.value?.srcObject                 // 3. 停止摄像头流
    ?.getTracks().forEach(t => t.stop())
  leftSynth.dispose()                      // 4. 释放左手合成器
  rightSynth.dispose()                     // 5. 释放右手合成器
  filter.dispose()                         // 6. 释放滤波器
  feedbackDelay.dispose()                  // 7. 释放延迟效果
  music?.stopMusic()                       // 8. 停止背景音乐
  smoother.reset()                         // 9. 清空平滑器状态
})
```

---

## 12. 游戏注册（接入 SCGP 游戏注册表）

在现有游戏注册表文件中追加一条记录：

```ts
{
  taskId: 'air-conductor',
  label: '空中魔法指挥棒',
  component: () => import('@/views/games/AirConductor.vue'),
  category: 'sensory',
  tags: ['gross-motor', 'bilateral', 'mediapipe-pose'],
  minAge: 5,
  difficulties: ['easy', 'normal', 'hard'],  // 预留，本期可不实现难度差异
  requiresCamera: true,
}
```

---

## 13. 交付验收标准

- [ ] 6 个关键点置信度过滤生效（visibility < 0.6 忽略）
- [ ] 指数平滑滤波 α=0.12 正确实现，不使用简单平均
- [ ] 有效抬臂以肩部为参照系，非绝对 Y 值
- [ ] 左右手各一个独立 Synth，波形不同（triangle / sine）
- [ ] 双臂高举和弦触发有 1500ms 冷却防抖
- [ ] 音高变化全部通过 `exponentialRampToValueAtTime(0.08s)` 过渡
- [ ] 全局音量上限 -6dB，初始化时强制设置
- [ ] 人体离框超 10 帧触发降级，5 帧后恢复
- [ ] 校准阶段采集 3 秒静息位后自动进入倒计时
- [ ] 双侧协同时长以 `deltaTime` 累加，精度不低于 100ms
- [ ] SQL 使用预编译语句，文件命名为 `trainingDatabase.ts`
- [ ] `onUnmounted` 按顺序销毁全部 9 项资源
- [ ] 接入 SCGP 背景音乐系统 `music-minimal` profile
