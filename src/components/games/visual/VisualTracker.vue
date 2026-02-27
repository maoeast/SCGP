<template>
  <div class="visual-tracker-container">
    <!-- 游戏化校准界面 -->
    <div v-if="showCalibration && !gameEnded" class="calibration-overlay">
      <div class="calibration-scene">
        <!-- 独立调试面板 -->
        <div v-if="isDev" class="debug-panel" :class="{ 'debug-panel-collapsed': debugPanelCollapsed }">
          <div class="debug-panel-header" @click="debugPanelCollapsed = !debugPanelCollapsed">
            <span>🔧 调试信息</span>
            <span class="debug-toggle">{{ debugPanelCollapsed ? '展开' : '收起' }}</span>
          </div>
          <div v-show="!debugPanelCollapsed" class="debug-panel-content">
            <div class="debug-row">
              <strong>窗口:</strong> {{ windowWidth }}x{{ windowHeight }} | <strong>缩放:</strong> {{ devicePixelRatio.toFixed(2) }}x
            </div>
            <div class="debug-row">
              <strong>视线:</strong> ({{ gazeX.toFixed(0) }}, {{ gazeY.toFixed(0) }})
            </div>
            <div class="debug-row">
              <strong>目标:</strong> 点{{ currentCalibrationIndex + 1 }}/9
            </div>
            <div class="debug-row">
              <strong>距离:</strong> {{ debugDistance.toFixed(0) }}px / {{ CALIBRATION_THRESHOLD }}px
              <span :class="debugDistance < CALIBRATION_THRESHOLD ? 'status-ok' : 'status-fail'">
                {{ debugDistance < CALIBRATION_THRESHOLD ? '✓' : '✗' }}
              </span>
            </div>
            <div class="debug-row">
              <strong>追踪:</strong> {{ isTrackingGaze ? '✓ 正常' : '✗ 丢失' }}
            </div>
            <div class="debug-row">
              <strong>阶段:</strong> {{ calibrationPhase }}
            </div>
            <div class="debug-logs">
              <div v-for="(log, index) in debugLogs.slice(-5)" :key="index" class="debug-log-item">
                {{ log }}
              </div>
            </div>
          </div>
        </div>

        <!-- 进度指示器 - 糖果进度条 -->
        <div class="candy-progress">
          <div class="candy-track">
            <div
              v-for="i in calibrationPoints.length"
              :key="i"
              class="candy-slot"
              :class="{ 'candy-filled': i <= calibrationProgress }"
            >
              <span v-if="i <= calibrationProgress">🍬</span>
              <span v-else>⚪</span>
            </div>
          </div>
          <div class="progress-text">
            收集糖果 {{ calibrationProgress }}/{{ calibrationPoints.length }}
          </div>
        </div>

        <!-- 甜甜圈瞄准目标 -->
        <div
          class="aim-target"
          :style="calibrationPointStyle"
          @click="calibrationProgress < 2 ? handleCalibrationClick() : null"
        >
          <!-- 阶段1: 吸引 - 外圈旋转发光 -->
          <div
            class="aim-ring-outer"
            :class="{
              'phase-attract': calibrationPhase === 'attract',
              'phase-lock': calibrationPhase === 'lock',
              'phase-capture': calibrationPhase === 'capture'
            }"
          >
            <div class="aim-ring-glow"></div>
            <div class="aim-ring-pattern"></div>
          </div>

          <!-- 阶段3: 内芯 - 采集触发点 -->
          <div
            class="aim-core"
            :class="{
              'core-active': calibrationPhase === 'capture',
              'core-locked': isCalibratingPoint
            }"
          >
            <div class="core-dot"></div>
            <div v-if="calibrationPhase === 'capture'" class="core-flash"></div>
          </div>

          <!-- 音效提示（视觉反馈） -->
          <div v-if="calibrationPhase === 'capture'" class="sound-wave">
            <span></span><span></span><span></span>
          </div>

          <!-- 提示文字 -->
          <div class="aim-hint">
            {{ calibrationProgress < 2 ? '点击圆心！' : getPhaseHint() }}
          </div>

          <!-- 调试信息 -->
          <div v-if="isDev" class="debug-distance">
            <small>视线:({{ gazeX.toFixed(0) }},{{ gazeY.toFixed(0) }}) | 距离:{{ debugDistance.toFixed(0) }}px | 追踪:{{ isTrackingGaze ? '✓' : '✗' }}</small>
          </div>

          <!-- 视线位置指示器（调试用）- 使用和目标相同的坐标系统 -->
          <div
            v-if="calibrationProgress >= 0 && isTrackingGaze"
            class="gaze-debug-dot"
            :style="gazeDebugDotStyle"
          >
            👁️
          </div>

          <!-- 视线偏低提示 -->
          <div v-if="calibrationProgress >= 2 && isTrackingGaze && debugDistance > CALIBRATION_THRESHOLD && debugDistance < CALIBRATION_THRESHOLD * 2 && gazeY > (calibrationPoints[currentCalibrationIndex]?.y / 100 * windowHeight + 50)" class="gaze-hint-adjust">
            👆 请稍微往上看一点
          </div>
        </div>

        <!-- 校准提示 -->
        <div class="calibration-tips">
          <div class="tip-card">
            <span class="tip-icon">🎯</span>
            <p>{{ calibrationProgress < 2 ? '先点击2次建立眼动模型' : '盯着圆心看' }}</p>
            <p class="tip-small">{{ calibrationProgress < 2 ? '然后就可以用眼动追踪了' : '保持头部不动，距离屏幕30-50cm' }}</p>
          </div>
          <div class="tip-card tip-glasses" v-if="calibrationProgress >= 2">
            <span class="tip-icon">👓</span>
            <p class="tip-small">戴眼镜用户请注意：</p>
            <p class="tip-small">调整角度避免镜片反光，或切换到鼠标模式</p>
          </div>
        </div>

        <!-- 摄像头预览（校准阶段） -->
        <div v-if="useEyeTracking" class="calibration-camera-preview">
          <video ref="calibrationVideo" class="camera-video" autoplay playsinline muted></video>
          <canvas ref="calibrationCanvas" class="camera-canvas"></canvas>
          <div class="camera-status" :class="{ 'status-active': isTrackingGaze }">
            <span class="status-dot"></span>
            {{ isTrackingGaze ? '已检测到眼睛' : '请将面部对准摄像头' }}
          </div>
        </div>

        <!-- 跳过按钮 -->
        <button v-if="calibrationProgress >= 2" class="btn-skip" @click="skipCalibration">
          跳过，用鼠标玩 🖱️
        </button>
      </div>
    </div>

    <!-- 摄像头预览小窗口 -->
    <div v-if="useEyeTracking && !showCalibration && !gameEnded" class="camera-preview">
      <video ref="webgazerVideo" class="camera-video" autoplay playsinline muted></video>
      <canvas ref="webgazerCanvas" class="camera-canvas"></canvas>
      <div class="camera-status" :class="{ 'status-active': isTrackingGaze }">
        <span class="status-dot"></span>
        {{ isTrackingGaze ? '追踪中' : '准备中' }}
      </div>
    </div>

    <!-- 游戏头部 -->
    <div class="game-header" v-if="!gameEnded && !showCalibration">
      <div class="instructions">
        <h2>🎯 视觉追踪训练</h2>
        <p v-if="useEyeTracking" class="instruction-highlight">
          用眼睛跟着星星移动！
        </p>
        <p v-else>
          按住鼠标跟着星星移动
        </p>
      </div>
      <div class="game-stats">
        <div class="stat-card">
          <span class="stat-icon">⏱️</span>
          <span class="stat-value" :class="{ warning: timeLeft <= 10 }">{{ timeLeft }}秒</span>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🎯</span>
          <span class="stat-value">{{ (timeOnTargetPercent * 100).toFixed(0) }}%</span>
        </div>
        <div v-if="useEyeTracking" class="stat-card mode-card">
          <span class="stat-icon">👁️</span>
          <span class="stat-label">眼动模式</span>
        </div>
      </div>
    </div>

    <!-- 游戏区域 -->
    <div
      v-if="!gameEnded && !showCalibration"
      class="game-area"
      ref="trackingAreaRef"
      @mousedown="handleStart"
      @touchstart="handleStart"
      @mouseup="handleEnd"
      @touchend="handleEnd"
      @mousemove="handleMove"
      @touchmove="handleMove"
    >
      <!-- 星空背景 -->
      <div class="stars-bg">
        <div v-for="i in 20" :key="i" class="star" :style="getStarStyle(i)"></div>
      </div>

      <!-- 移动目标 (发光的星星) -->
      <div
        class="star-target"
        ref="targetRef"
        :style="targetStyle"
      >
        <div class="star-glow"></div>
        <div class="star-core">⭐</div>
        <div class="star-rays">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>

      <!-- 调试：目标检测范围圈 -->
      <div
        v-if="isDev && useEyeTracking && trackingAreaRef"
        class="target-debug-ring"
        :style="targetDebugRingStyle"
      ></div>

      <!-- 视线准星 (眼动模式) -->
      <div
        v-if="useEyeTracking"
        class="gaze-crosshair"
        :style="gazeIndicatorStyle"
      >
        <!-- 外圈 -->
        <div class="crosshair-ring"></div>
        <!-- 十字线 -->
        <div class="crosshair-lines">
          <span class="line-h"></span>
          <span class="line-v"></span>
        </div>
        <!-- 中心点 -->
        <div class="crosshair-center"></div>
        <!-- 状态指示 -->
        <div v-if="isOnTarget" class="target-locked">🔒</div>
      </div>

      <!-- 调试：显示视线坐标数值 -->
      <div v-if="isDev && useEyeTracking && trackingAreaRef" class="gaze-debug-info">
        视线:{{ gazeX.toFixed(0) }},{{ gazeY.toFixed(0) }} | 缩放:{{ devicePixelRatio.toFixed(2) }}x | 在靶:{{ isOnTarget ? '✓' : '✗' }}
      </div>

      <!-- 鼠标追踪点 (鼠标模式) -->
      <div
        v-if="!useEyeTracking && isTracking"
        class="mouse-cursor"
        :style="indicatorStyle"
      >
        <div class="cursor-ring"></div>
        <div class="cursor-dot"></div>
      </div>

      <!-- 连击提示 -->
      <div v-if="comboCount > 0" class="combo-display" :class="{ 'combo-high': comboCount >= 5 }">
        <span class="combo-text">连击 x{{ comboCount }}</span>
        <div class="combo-stars">
          <span v-for="i in Math.min(comboCount, 5)" :key="i">⭐</span>
        </div>
      </div>
    </div>

    <!-- 结果界面 -->
    <div class="game-result" v-if="gameEnded">
      <div class="result-celebration">
        <div class="celebration-stars">🎉✨🎊</div>
        <h2>太棒了！</h2>
        <p class="result-subtitle">你完成了视觉追踪训练</p>
      </div>

      <div class="result-cards">
        <div class="result-card time-card">
          <div class="card-icon">⏱️</div>
          <div class="card-label">训练时长</div>
          <div class="card-value">{{ duration }}秒</div>
        </div>

        <div class="result-card target-card">
          <div class="card-icon">🎯</div>
          <div class="card-label">在靶时间</div>
          <div class="card-value">{{ (timeOnTarget / 1000).toFixed(1) }}秒</div>
        </div>

        <div class="result-card accuracy-card" :class="getRatingClass()">
          <div class="card-icon">{{ getRatingEmoji() }}</div>
          <div class="card-label">在靶率</div>
          <div class="card-value highlight">{{ (timeOnTargetPercent * 100).toFixed(0) }}%</div>
          <div class="rating-badge" :class="getRatingClass()">{{ getRatingText() }}</div>
        </div>
      </div>

      <div v-if="useEyeTracking" class="mode-tag">
        <span>👁️ 眼动追踪模式</span>
      </div>

      <button class="btn-primary" @click="$emit('finish', sessionData)">
        查看完整报告 📊
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { TrackingData, GameSessionData } from '@/types/games'
import { TaskID } from '@/types/games'

// WebGazer 从 CDN 加载，作为全局变量
declare const webgazer: any

// Props
interface Props {
  studentId: number
  taskId: TaskID
  duration?: number
  targetSize?: number
  targetSpeed?: number
  useEyeTracking?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  duration: 30,
  targetSize: 100,
  targetSpeed: 1.5,
  useEyeTracking: true
})

const emit = defineEmits<{
  finish: [data: GameSessionData]
}>()

// ==================== 眼动追踪状态 ====================
const webgazerVideo = ref<HTMLVideoElement | null>(null)
const webgazerCanvas = ref<HTMLCanvasElement | null>(null)
const calibrationVideo = ref<HTMLVideoElement | null>(null)
const calibrationCanvas = ref<HTMLCanvasElement | null>(null)
const gazeX = ref(0)
const gazeY = ref(0)
const isTrackingGaze = ref(false)
const showGazeIndicator = ref(true)
const gazeCheckInterval = ref<number | null>(null)
const isOnTarget = ref(false)

// ==================== 开发调试用 ====================
const isDev = ref(import.meta.env.DEV)
const debugDistance = ref(999)
const windowWidth = ref(window.innerWidth)
const windowHeight = ref(window.innerHeight)
const devicePixelRatio = ref(window.devicePixelRatio || 1)
const debugPanelCollapsed = ref(true) // 调试面板默认收起
const debugLogs = ref<string[]>([]) // 调试日志数组

// 添加调试日志的函数
function addDebugLog(message: string) {
  if (!isDev.value) return
  const time = new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
  debugLogs.value.push(`[${time}] ${message}`)
  // 只保留最近20条
  if (debugLogs.value.length > 20) {
    debugLogs.value.shift()
  }
}

// ==================== 校准状态 ====================
const showCalibration = ref(props.useEyeTracking)
const calibrationProgress = ref(0)
const calibrationPoints = ref([
  { x: 15, y: 25 }, { x: 50, y: 20 }, { x: 85, y: 25 },
  { x: 20, y: 50 }, { x: 50, y: 50 }, { x: 80, y: 50 },
  { x: 15, y: 75 }, { x: 50, y: 80 }, { x: 85, y: 75 }
])
const currentCalibrationIndex = ref(0)
const isCalibratingPoint = ref(false)
const calibrationStartTime = ref(0)
// 校准参数（根据测试调整）
const CALIBRATION_DURATION = 1500 // 1.5秒完成一个采集周期
const CALIBRATION_THRESHOLD = 150 // 检测范围150px

// 三阶段校准状态
const calibrationPhase = ref<'attract' | 'lock' | 'capture'>('attract')
const phaseTimer = ref<number | null>(null)
const PHASE_ATTRACT_DURATION = 800 // 吸引阶段0.8秒
const PHASE_LOCK_DURATION = 500 // 锁定阶段0.5秒
const PHASE_CAPTURE_DURATION = 200 // 采集阶段0.2秒

// 视线稳定性检测
const gazeHistory = ref<Array<{ x: number; y: number; time: number }>>([])
const GAZE_HISTORY_WINDOW = 300 // 300ms内的视线历史
const GAZE_STABILITY_THRESHOLD = 80 // 视线抖动超过80px认为不稳定

// ==================== 游戏状态 ====================
const timeLeft = ref(props.duration)
const gameEnded = ref(false)
const isTracking = ref(false)
const targetX = ref(50)
const targetY = ref(50)
const pointerX = ref(50)
const pointerY = ref(50)
const timeOnTarget = ref(0)
const totalTime = ref(0)
const samplePoints = ref<Array<{ time: number; onTarget: boolean }>>([])
const lastSampleTime = ref(0)
const comboCount = ref(0)
const comboTimer = ref<number | null>(null)

// Refs
const trackingAreaRef = ref<HTMLElement | null>(null)
const targetRef = ref<HTMLElement | null>(null)

// 定时器
const gameTimer = ref<number | null>(null)
const animationFrame = ref<number | null>(null)
const moveDirection = ref({ x: 1, y: 1 })

// ==================== 计算属性 ====================
const targetStyle = computed(() => ({
  left: `${targetX.value}%`,
  top: `${targetY.value}%`,
  width: `${props.targetSize}px`,
  height: `${props.targetSize}px`
}))

const targetDebugRingStyle = computed(() => {
  if (!trackingAreaRef.value) return {}
  // 游戏判定半径：固定140px
  const radiusPx = 140
  return {
    left: `${targetX.value}%`,
    top: `${targetY.value}%`,
    width: `${radiusPx * 2}px`,
    height: `${radiusPx * 2}px`,
    transform: 'translate(-50%, -50%)'
  }
})

const indicatorStyle = computed(() => ({
  left: `${pointerX.value}%`,
  top: `${pointerY.value}%`
}))

const gazeIndicatorStyle = computed(() => {
  if (!trackingAreaRef.value) {
    // 游戏区域未就绪时使用屏幕坐标百分比
    return {
      left: `${(gazeX.value / window.innerWidth) * 100}%`,
      top: `${(gazeY.value / window.innerHeight) * 100}%`,
      opacity: isTrackingGaze.value ? 1 : 0.3
    }
  }
  const rect = trackingAreaRef.value.getBoundingClientRect()
  const relativeX = ((gazeX.value - rect.left) / rect.width) * 100
  const relativeY = ((gazeY.value - rect.top) / rect.height) * 100

  return {
    left: `${relativeX}%`,
    top: `${relativeY}%`,
    opacity: isTrackingGaze.value ? 1 : 0.3
  }
})

const calibrationPointStyle = computed(() => {
  const point = calibrationPoints.value[currentCalibrationIndex.value]
  return {
    left: `${point.x}%`,
    top: `${point.y}%`
  }
})

// 视线调试点样式 - 使用与校准目标相同的容器参考系
const gazeDebugDotStyle = computed(() => {
  // 获取容器实际尺寸（与 checkCalibrationGaze 使用相同的参考系）
  const calibrationScene = document.querySelector('.calibration-scene') as HTMLElement
  if (!calibrationScene) {
    // 容器还未渲染，使用视口作为fallback
    return {
      left: `${(gazeX.value / window.innerWidth) * 100}%`,
      top: `${(gazeY.value / window.innerHeight) * 100}%`
    }
  }

  const rect = calibrationScene.getBoundingClientRect()

  // 将视线屏幕坐标转换为容器内的百分比
  // 公式: (视线屏幕坐标 - 容器左偏移) / 容器宽度 * 100%
  const relativeX = ((gazeX.value - rect.left) / rect.width) * 100
  const relativeY = ((gazeY.value - rect.top) / rect.height) * 100

  return {
    left: `${relativeX}%`,
    top: `${relativeY}%`
  }
})

const countdownRingStyle = computed(() => {
  if (!isCalibratingPoint.value) return {}
  const elapsed = Date.now() - calibrationStartTime.value
  const progress = Math.min(elapsed / CALIBRATION_DURATION, 1)
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (progress * circumference)
  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset
  }
})

const timeOnTargetPercent = computed(() => {
  return totalTime.value > 0 ? timeOnTarget.value / totalTime.value : 0
})

const sessionData = computed<GameSessionData>(() => ({
  taskId: props.taskId,
  studentId: props.studentId,
  startTime: Date.now() - totalTime.value,
  endTime: Date.now(),
  duration: props.duration,
  trackingData: {
    timeOnTarget: timeOnTarget.value,
    totalTime: totalTime.value,
    timeOnTargetPercent: timeOnTargetPercent.value,
    samplePoints: samplePoints.value
  },
  totalTrials: 0,
  correctTrials: 0,
  accuracy: timeOnTargetPercent.value,
  avgResponseTime: 0,
  errors: { omission: 0, commission: 0 },
  behavior: { impulsivityScore: 0, fatigueIndex: 1 },
  trackingStats: {
    timeOnTargetPercent: timeOnTargetPercent.value,
    useEyeTracking: props.useEyeTracking
  }
}))

// ==================== 辅助函数 ====================
function getStarStyle(index: number) {
  const size = 2 + Math.random() * 4
  const left = Math.random() * 100
  const top = Math.random() * 100
  const delay = Math.random() * 3
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`
  }
}

function getRatingEmoji(): string {
  const percent = timeOnTargetPercent.value
  if (percent >= 0.8) return '🏆'
  if (percent >= 0.6) return '🥈'
  if (percent >= 0.4) return '🥉'
  return '💪'
}

function getRatingText(): string {
  const percent = timeOnTargetPercent.value
  if (percent >= 0.8) return '太棒了！'
  if (percent >= 0.6) return '很好！'
  if (percent >= 0.4) return '不错！'
  return '继续加油！'
}

function getRatingClass(): string {
  const percent = timeOnTargetPercent.value
  if (percent >= 0.8) return 'excellent'
  if (percent >= 0.6) return 'good'
  if (percent >= 0.4) return 'average'
  return 'keep-trying'
}

// ==================== WebGazer 集成 ====================
const isWebGazerReady = ref(false)

// 尝试结束之前的 WebGazer 实例并释放摄像头
async function cleanupWebGazer() {
  try {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      cameraStream = null
      console.log('[摄像头] 已释放之前的流')
    }
    // 尝试结束 WebGazer（仅当已加载时）
    try {
      if ((window as any).webgazer) {
        (window as any).webgazer.end()
        console.log('[WebGazer] 已结束之前的实例')
      }
    } catch (e) {
      // 忽略错误
    }
    // 等待一下确保资源释放
    await new Promise(resolve => setTimeout(resolve, 500))
  } catch (e) {
    console.warn('[清理] 清理时出错:', e)
  }
}

async function initWebGazer() {
  if (!props.useEyeTracking) return

  // 检查 webgazer 是否已加载
  if (typeof window === 'undefined' || !(window as any).webgazer) {
    console.warn('[WebGazer] 未加载 webgazer.js，降级到鼠标模式')
    fallbackToMouseMode()
    return
  }

  // 先清理之前的资源
  await cleanupWebGazer()

  try {
    // 检查是否有摄像头设备
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    if (videoDevices.length === 0) {
      console.warn('未检测到摄像头设备，切换到鼠标模式')
      fallbackToMouseMode()
      return
    }

    console.log(`[摄像头] 检测到 ${videoDevices.length} 个视频设备:`)
    videoDevices.forEach((device, i) => {
      console.log(`  ${i + 1}. ${device.label || '未知设备'}`)
    })

    // 初始化 WebGazer（强制 640x480@30fps，避免 1080P 导致 CPU 飙升）
    try {
      // 先设置摄像头约束（在 begin() 之前）
      const cameraConstraints = {
        video: {
          width: { exact: 640 },
          height: { exact: 480 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: 'user'
        }
      }

      // WebGazer 3.0+ 使用 setCameraParameters
      // WebGazer 2.x 可能使用不同的 API，这里做兼容性处理
      const wg = (window as any).webgazer
      if (wg.setCameraParameters) {
        wg.setCameraParameters(cameraConstraints)
        console.log('[WebGazer] 已设置摄像头参数: 640x480@30fps')
      } else if (wg.setCameraConstraints) {
        wg.setCameraConstraints(cameraConstraints)
        console.log('[WebGazer] 已设置摄像头约束: 640x480@30fps')
      }

      await wg
        .setGazeListener((data: { x: number; y: number } | null, elapsedTime: number) => {
          if (data) {
            const scale = window.devicePixelRatio || 1
            gazeX.value = data.x / scale
            gazeY.value = data.y / scale
            isTrackingGaze.value = true

            // 调试日志：每500ms输出一次视线坐标
            if (isDev.value && showCalibration.value && Date.now() % 500 < 50) {
              addDebugLog(`视线: (${gazeX.value.toFixed(0)}, ${gazeY.value.toFixed(0)})`)
            }

            if (showCalibration.value) {
              checkCalibrationGaze(gazeX.value, gazeY.value)
            }
          } else {
            isTrackingGaze.value = false
            if (isDev.value && Date.now() % 1000 < 50) {
              addDebugLog('未检测到视线')
            }
          }
        })
        .begin()

      console.log('[WebGazer] 初始化成功，正在追踪...')

    } catch (wgError: any) {
      // 如果是 "Device in use" 错误，等待后重试
      if (wgError.message?.includes('Device in use') || wgError.name === 'NotReadableError') {
        console.warn('[WebGazer] 摄像头被占用，等待后重试...')
        await cleanupWebGazer()
        await new Promise(resolve => setTimeout(resolve, 1000))

        // 重试一次
        try {
          const wg = (window as any).webgazer
          const cameraConstraints = {
            video: {
              width: { exact: 640 },
              height: { exact: 480 },
              frameRate: { ideal: 30, max: 30 },
              facingMode: 'user'
            }
          }
          if (wg.setCameraParameters) {
            wg.setCameraParameters(cameraConstraints)
          } else if (wg.setCameraConstraints) {
            wg.setCameraConstraints(cameraConstraints)
          }

          await wg
            .setGazeListener((data: { x: number; y: number } | null, elapsedTime: number) => {
              if (data) {
                const scale = window.devicePixelRatio || 1
                gazeX.value = data.x / scale
                gazeY.value = data.y / scale
                isTrackingGaze.value = true

                if (showCalibration.value) {
                  checkCalibrationGaze(gazeX.value, gazeY.value)
                }
              } else {
                isTrackingGaze.value = false
              }
            })
            .begin()
          console.log('[WebGazer] 重试成功')
        } catch (retryError) {
          console.error('[WebGazer] 重试失败:', retryError)
          fallbackToMouseMode()
          return
        }
      } else {
        console.error('[WebGazer] 初始化失败:', wgError)
        fallbackToMouseMode()
        return
      }
    }

    const wg = (window as any).webgazer
    wg.showPredictionPoints(false)
    wg.showVideo(false)
    wg.showFaceOverlay(false)
    wg.showFaceFeedbackBox(false)

    isWebGazerReady.value = true
    console.log('[校准] 准备开始校准，前2个点请点击圆心')

    // 延迟一下再尝试获取预览流（避免冲突）
    setTimeout(async () => {
      try {
        // 尝试从 WebGazer 获取视频元素
        const videoElement = document.getElementById('webgazerVideoFeed') as HTMLVideoElement
        if (videoElement && videoElement.srcObject && calibrationVideo.value) {
          // 复用 WebGazer 的流
          calibrationVideo.value.srcObject = videoElement.srcObject
          cameraStream = videoElement.srcObject as MediaStream
          console.log('[摄像头] 预览流已设置（复用 WebGazer）')
        } else {
          // 尝试独立获取预览流（同样强制 640x480）
          const constraints = {
            video: {
              width: { exact: 640 },
              height: { exact: 480 },
              frameRate: { ideal: 30, max: 30 }
            }
          }
          const stream = await navigator.mediaDevices.getUserMedia(constraints)
          if (calibrationVideo.value) {
            calibrationVideo.value.srcObject = stream
            cameraStream = stream
            console.log('[摄像头] 预览流已获取: 640x480@30fps')
          }
        }
      } catch (e) {
        console.warn('[摄像头] 预览流获取失败:', e)
      }
    }, 1000)

  } catch (error) {
    console.error('初始化失败:', error)
    fallbackToMouseMode()
  }
}

// 降级到鼠标模式（不调用 webgazer.end()）
function fallbackToMouseMode() {
  showCalibration.value = false
  startGame()
}

// 获取阶段提示文字
function getPhaseHint(): string {
  switch (calibrationPhase.value) {
    case 'attract':
      return '看这里！准备瞄准...'
    case 'lock':
      return '跟着圈缩小，看圆心！'
    case 'capture':
      return '叮！完成！'
    default:
      return '快看这里！'
  }
}

// 阶段管理
function startPhaseTimer() {
  // 清除之前的定时器
  if (phaseTimer.value) {
    clearTimeout(phaseTimer.value)
  }

  // 阶段1: 吸引
  calibrationPhase.value = 'attract'

  // 阶段2: 锁定（吸引结束后）
  phaseTimer.value = window.setTimeout(() => {
    calibrationPhase.value = 'lock'

    // 阶段3: 采集（锁定结束后）
    phaseTimer.value = window.setTimeout(() => {
      calibrationPhase.value = 'capture'

      // 采集完成，触发校准点
      phaseTimer.value = window.setTimeout(() => {
        completeCalibrationPoint()
      }, PHASE_CAPTURE_DURATION)
    }, PHASE_LOCK_DURATION)
  }, PHASE_ATTRACT_DURATION)
}

function clearPhaseTimer() {
  if (phaseTimer.value) {
    clearTimeout(phaseTimer.value)
    phaseTimer.value = null
  }
  calibrationPhase.value = 'attract'
}

function checkCalibrationGaze(x: number, y: number) {
  // 前2个点用点击校准（建立WebGazer初始模型），之后用眼动追踪
  if (calibrationProgress.value < 2) {
    return  // 前2个点依靠点击 @click="handleCalibrationClick"
  }

  const point = calibrationPoints.value[currentCalibrationIndex.value]

  // 获取校准容器的实际位置和尺寸（校准目标显示在这个容器内）
  const calibrationScene = document.querySelector('.calibration-scene') as HTMLElement
  if (!calibrationScene) return

  const rect = calibrationScene.getBoundingClientRect()

  // 将百分比坐标转换为实际屏幕坐标（基于容器实际位置）
  const targetScreenX = rect.left + (point.x / 100) * rect.width
  const targetScreenY = rect.top + (point.y / 100) * rect.height

  // 调试：输出容器和窗口尺寸信息
  if (isDev.value && currentCalibrationIndex.value === 0 && calibrationProgress.value === 2) {
    console.log(`[校准] 容器: ${rect.width.toFixed(0)}x${rect.height.toFixed(0)} 视口: ${window.innerWidth}x${window.innerHeight}`)
    console.log(`[校准] 容器偏移: left=${rect.left.toFixed(0)}, top=${rect.top.toFixed(0)}`)
  }

  const distance = Math.sqrt(Math.pow(x - targetScreenX, 2) + Math.pow(y - targetScreenY, 2))
  debugDistance.value = distance  // 更新调试信息

  // 视线稳定性检测 - 记录最近300ms的视线位置
  const now = Date.now()
  gazeHistory.value.push({ x, y, time: now })
  // 清理过期数据
  gazeHistory.value = gazeHistory.value.filter(g => now - g.time < GAZE_HISTORY_WINDOW)

  // 计算视线稳定性（历史位置的最大偏差）
  let gazeStable = true
  if (gazeHistory.value.length >= 3) {
    let maxDeviation = 0
    const latest = gazeHistory.value[gazeHistory.value.length - 1]
    for (const g of gazeHistory.value) {
      const dev = Math.sqrt(Math.pow(g.x - latest.x, 2) + Math.pow(g.y - latest.y, 2))
      if (dev > maxDeviation) maxDeviation = dev
    }
    gazeStable = maxDeviation < GAZE_STABILITY_THRESHOLD
  }

  // 调试日志 - 显示稳定性状态
  if (isDev.value) {
    const status = distance < CALIBRATION_THRESHOLD ? '✓在范围内' : '✗太远'
    const stability = gazeStable ? '稳定' : '抖动'
    addDebugLog(`点${currentCalibrationIndex.value + 1}: 距离${distance.toFixed(0)}px ${status} | ${stability}`)
  }

  // 三阶段校准逻辑（增加稳定性要求）
  if (distance < CALIBRATION_THRESHOLD && gazeStable) {
    if (!isCalibratingPoint.value) {
      // 视线进入范围且稳定，开始三阶段动画
      isCalibratingPoint.value = true
      startPhaseTimer()
      console.log('[校准] 开始三阶段动画')
    }
    // 在范围内时，让动画继续执行（由 startPhaseTimer 的定时器控制）
  } else {
    // 视线离开范围或不稳�定，重置
    if (isCalibratingPoint.value) {
      console.log('[校准] 视线离开或不稳定，重置')
      clearPhaseTimer()
    }
    isCalibratingPoint.value = false
  }
}

function completeCalibrationPoint() {
  const point = calibrationPoints.value[currentCalibrationIndex.value]
  const wg = (window as any).webgazer
  if (wg) {
    wg.recordScreenPosition(point.x, point.y, 'click')
  }

  // 清除阶段定时器
  clearPhaseTimer()

  // 显示完成效果
  console.log('[校准] 采集完成!')

  calibrationProgress.value++
  isCalibratingPoint.value = false

  if (currentCalibrationIndex.value < calibrationPoints.value.length - 1) {
    setTimeout(() => {
      currentCalibrationIndex.value++
    }, 300)
  } else {
    setTimeout(finishCalibration, 500)
  }
}

function showCandyExplosion(x: number, y: number) {
  // 糖果爆炸效果已在CSS中实现
}

function handleCalibrationClick() {
  completeCalibrationPoint()
}

// 摄像头流引用
let cameraStream: MediaStream | null = null

function finishCalibration() {
  showCalibration.value = false

  // 将视频流从校准预览转移到游戏预览
  setTimeout(() => {
    if (cameraStream && webgazerVideo.value) {
      webgazerVideo.value.srcObject = cameraStream
    } else if (calibrationVideo.value?.srcObject && webgazerVideo.value) {
      webgazerVideo.value.srcObject = calibrationVideo.value.srcObject
    }
  }, 100)

  startGame()
}

function skipCalibration() {
  showCalibration.value = false
  // 只在 webgazer 成功初始化后才调用 end
  if (isWebGazerReady.value) {
    try {
      const wg = (window as any).webgazer
      if (wg) {
        wg.end()
      }
    } catch (e) {
      console.warn('停止 WebGazer 时出错:', e)
    }
    isWebGazerReady.value = false
  }
  startGame()
}

// ==================== 游戏逻辑 ====================
function startGazeCheck() {
  if (!props.useEyeTracking) return

  gazeCheckInterval.value = window.setInterval(() => {
    if (gameEnded.value || !trackingAreaRef.value) return

    const now = Date.now()
    const rect = trackingAreaRef.value.getBoundingClientRect()

    // 计算目标在屏幕上的绝对位置（CSS像素）
    const targetScreenX = rect.left + (targetX.value / 100) * rect.width
    const targetScreenY = rect.top + (targetY.value / 100) * rect.height

    // 使用绝对坐标计算距离（和校准阶段一致）
    const distance = Math.sqrt(
      Math.pow(gazeX.value - targetScreenX, 2) +
      Math.pow(gazeY.value - targetScreenY, 2)
    )

    // 游戏判定半径：固定140px（约1.75倍目标半径，确保流畅体验）
    const targetRadiusPx = 140
    const wasOnTarget = isOnTarget.value
    isOnTarget.value = distance < targetRadiusPx

    // 调试日志 - 每2秒输出一次
    if (isDev.value && now % 2000 < 100) {
      console.log(`[游戏] 视线:(${gazeX.value.toFixed(0)},${gazeY.value.toFixed(0)}) 目标:(${targetScreenX.toFixed(0)},${targetScreenY.toFixed(0)}) 距离:${distance.toFixed(0)}px 半径:${targetRadiusPx.toFixed(0)}px 在靶:${isOnTarget.value}`)
    }

    samplePoints.value.push({
      time: now,
      onTarget: isOnTarget.value
    })

    if (isOnTarget.value && isTrackingGaze.value) {
      timeOnTarget.value += 100

      // 连击系统
      if (!wasOnTarget) {
        comboCount.value++
        if (comboTimer.value) clearTimeout(comboTimer.value)
        comboTimer.value = window.setTimeout(() => {
          comboCount.value = 0
        }, 2000)
      }
    }

    totalTime.value += 100

    if (samplePoints.value.length > 1000) {
      samplePoints.value = samplePoints.value.slice(-500)
    }
  }, 100)
}

function updateTargetPosition() {
  if (!trackingAreaRef.value) return

  const margin = 12

  if (Math.random() < 0.02) {
    moveDirection.value = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    }
  }

  const magnitude = Math.sqrt(
    moveDirection.value.x ** 2 + moveDirection.value.y ** 2
  )
  if (magnitude > 0) {
    moveDirection.value.x /= magnitude
    moveDirection.value.y /= magnitude
  }

  targetX.value += moveDirection.value.x * props.targetSpeed * 0.1
  targetY.value += moveDirection.value.y * props.targetSpeed * 0.1

  if (targetX.value <= margin || targetX.value >= 100 - margin) {
    moveDirection.value.x *= -1
    targetX.value = Math.max(margin, Math.min(100 - margin, targetX.value))
  }
  if (targetY.value <= margin || targetY.value >= 100 - margin) {
    moveDirection.value.y *= -1
    targetY.value = Math.max(margin, Math.min(100 - margin, targetY.value))
  }

  animationFrame.value = requestAnimationFrame(updateTargetPosition)
}

function handleStart(e: Event) {
  if (props.useEyeTracking) return
  e.preventDefault()
  isTracking.value = true
  updatePointerPosition(e)
}

function handleEnd(e: Event) {
  if (props.useEyeTracking) return
  e.preventDefault()
  isTracking.value = false
}

function handleMove(e: Event) {
  if (!isTracking.value || !trackingAreaRef.value || props.useEyeTracking) return
  e.preventDefault()
  updatePointerPosition(e)
}

function updatePointerPosition(e: Event) {
  if (!trackingAreaRef.value) return

  const rect = trackingAreaRef.value.getBoundingClientRect()
  let clientX: number, clientY: number

  if ('touches' in (e as TouchEvent)) {
    const touch = (e as TouchEvent).touches[0]
    clientX = touch.clientX
    clientY = touch.clientY
  } else {
    clientX = (e as MouseEvent).clientX
    clientY = (e as MouseEvent).clientY
  }

  pointerX.value = ((clientX - rect.left) / rect.width) * 100
  pointerY.value = ((clientY - rect.top) / rect.height) * 100
}

function sampleData() {
  if (props.useEyeTracking) return

  const now = Date.now()

  if (now - lastSampleTime.value >= 100) {
    const targetCenterX = targetX.value
    const targetCenterY = targetY.value

    const distance = Math.sqrt(
      (pointerX.value - targetCenterX) ** 2 +
      (pointerY.value - targetCenterY) ** 2
    )

    const onTarget = distance < 8

    samplePoints.value.push({ time: now, onTarget })

    if (onTarget && isTracking.value) {
      timeOnTarget.value += 100
    }
    totalTime.value += 100
    lastSampleTime.value = now
  }

  animationFrame.value = requestAnimationFrame(sampleData)
}

function startGame() {
  timeLeft.value = props.duration
  gameEnded.value = false
  timeOnTarget.value = 0
  totalTime.value = 0
  samplePoints.value = []
  comboCount.value = 0
  lastSampleTime.value = Date.now()

  updateTargetPosition()

  if (props.useEyeTracking) {
    startGazeCheck()
  } else {
    sampleData()
  }

  gameTimer.value = window.setInterval(() => {
    timeLeft.value--

    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

function endGame() {
  gameEnded.value = true
  isTracking.value = false

  if (gameTimer.value) clearInterval(gameTimer.value)
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value)
  if (gazeCheckInterval.value) clearInterval(gazeCheckInterval.value)
  if (comboTimer.value) clearTimeout(comboTimer.value)

  // 只在 webgazer 成功初始化后才调用 end
  if (isWebGazerReady.value) {
    try {
      const wg = (window as any).webgazer
      if (wg) {
        wg.end()
      }
    } catch (e) {
      console.warn('停止 WebGazer 时出错:', e)
    }
    isWebGazerReady.value = false
  }

  // 停止摄像头流
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
    cameraStream = null
  }
}

// ==================== 窗口大小变化处理 ====================
function handleResize() {
  // 更新窗口尺寸
  windowWidth.value = window.innerWidth
  windowHeight.value = window.innerHeight
  devicePixelRatio.value = window.devicePixelRatio || 1
}

// ==================== 生命周期 ====================
onMounted(async () => {
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)

  if (props.useEyeTracking) {
    await initWebGazer()
  } else {
    startGame()
  }
})

onUnmounted(() => {
  // 移除窗口大小监听
  window.removeEventListener('resize', handleResize)

  if (gameTimer.value) clearInterval(gameTimer.value)
  if (animationFrame.value) cancelAnimationFrame(animationFrame.value)
  if (gazeCheckInterval.value) clearInterval(gazeCheckInterval.value)
  if (comboTimer.value) clearTimeout(comboTimer.value)
  if (phaseTimer.value) clearTimeout(phaseTimer.value)

  // 只在 webgazer 成功初始化后才调用 end
  if (isWebGazerReady.value) {
    try {
      const wg = (window as any).webgazer
      if (wg) {
        wg.end()
      }
    } catch (e) {
      console.warn('停止 WebGazer 时出错:', e)
    }
    isWebGazerReady.value = false
  }

  // 停止摄像头流
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop())
    cameraStream = null
  }
})
</script>

<style scoped>
.visual-tracker-container {
  width: 100%;
  max-width: 1400px; /* 全屏下更宽 */
  margin: 0 auto;
  padding: 20px 40px; /* 增加左右边距 */
  height: 100vh; /* 占满视口高度 */
  display: flex;
  flex-direction: column;
}

/* ==================== 游戏化校准界面 ==================== */
.calibration-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.calibration-scene {
  width: 90%;
  max-width: 900px;
  height: 80vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* 糖果进度条 */
.candy-progress {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
}

.candy-track {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
}

.candy-slot {
  font-size: 28px;
  transition: all 0.3s ease;
  filter: grayscale(100%);
  opacity: 0.5;
}

.candy-slot.candy-filled {
  filter: grayscale(0%);
  opacity: 1;
  animation: candy-pop 0.3s ease;
}

@keyframes candy-pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.progress-text {
  font-size: 20px;
  color: #333;
  font-weight: 600;
}

/* ==================== 甜甜圈瞄准目标 ==================== */
.aim-target {
  position: absolute;
  transform: translate(-50%, -50%);
  cursor: pointer;
  z-index: 10;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 外圈 - 吸引阶段 */
.aim-ring-outer {
  position: absolute;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

/* 阶段1: 吸引 - 旋转发光 */
.aim-ring-outer.phase-attract {
  width: 180px;
  height: 180px;
  animation: ring-rotate 2s linear infinite;
}

.aim-ring-outer.phase-attract .aim-ring-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 8px solid rgba(100, 200, 255, 0.6);
  box-shadow: 0 0 30px rgba(100, 200, 255, 0.5), inset 0 0 30px rgba(100, 200, 255, 0.3);
  animation: ring-pulse 1s ease-in-out infinite;
}

.aim-ring-outer.phase-attract .aim-ring-pattern {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 4px dashed rgba(255, 100, 150, 0.4);
}

@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.05); opacity: 1; }
}

/* 阶段2: 锁定 - 缩小 */
.aim-ring-outer.phase-lock {
  width: 100px;
  height: 100px;
  animation: ring-shrink 0.5s ease-out forwards;
}

.aim-ring-outer.phase-lock .aim-ring-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 6px solid rgba(255, 200, 100, 0.8);
  box-shadow: 0 0 20px rgba(255, 200, 100, 0.6);
}

@keyframes ring-shrink {
  0% { transform: scale(1.8); }
  100% { transform: scale(1); }
}

/* 阶段3: 采集 - 高亮 */
.aim-ring-outer.phase-capture {
  width: 60px;
  height: 60px;
  opacity: 0;
  transition: opacity 0.1s;
}

/* 内芯 */
.aim-core {
  position: absolute;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.aim-core .core-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle, #ff6b6b 0%, #ee5a5a 100%);
  box-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
  transition: all 0.2s ease;
}

.aim-core.core-locked .core-dot {
  width: 30px;
  height: 30px;
  background: radial-gradient(circle, #ffd93d 0%, #ffb800 100%);
  box-shadow: 0 0 20px rgba(255, 200, 50, 0.8);
}

.aim-core.core-active .core-dot {
  width: 50px;
  height: 50px;
  background: radial-gradient(circle, #6bcf7f 0%, #4ecdc4 100%);
  box-shadow: 0 0 40px rgba(100, 220, 130, 1);
  animation: core-flash-anim 0.2s ease;
}

@keyframes core-flash-anim {
  0% { transform: scale(1); }
  50% { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.core-flash {
  position: absolute;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, transparent 70%);
  animation: flash-expand 0.3s ease-out forwards;
}

@keyframes flash-expand {
  0% { transform: scale(0.5); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

/* 音波效果 */
.sound-wave {
  position: absolute;
  display: flex;
  gap: 4px;
}

.sound-wave span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6bcf7f;
  animation: sound-wave-anim 0.5s ease-in-out infinite;
}

.sound-wave span:nth-child(1) { animation-delay: 0s; }
.sound-wave span:nth-child(2) { animation-delay: 0.1s; }
.sound-wave span:nth-child(3) { animation-delay: 0.2s; }

@keyframes sound-wave-anim {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.5); opacity: 1; }
}

/* 提示文字 */
.aim-hint {
  position: absolute;
  top: 110%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-top: 20px;
}

/* 倒计时环 */
.countdown-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
  pointer-events: none;
}

.countdown-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.3);
  stroke-width: 8;
}

.ring-progress {
  fill: none;
  stroke: #ff6b9d;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.1s linear;
}

/* 蝴蝶提示 */
.butterfly-hint {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 20px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  font-size: 16px;
  color: #333;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 目标检测范围圈（调试） */
.target-debug-ring {
  position: absolute;
  border: 2px dashed rgba(0, 255, 0, 0.5);
  border-radius: 50%;
  pointer-events: none;
  z-index: 15;
}

/* 游戏区调试图层 */
.gaze-debug-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #0f0;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-family: monospace;
  z-index: 100;
  pointer-events: none;
}

/* 视线调整提示 */
.gaze-hint-adjust {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 193, 7, 0.9);
  color: #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: bold;
  white-space: nowrap;
  animation: hint-bounce 1s ease-in-out infinite;
  z-index: 100;
}

@keyframes hint-bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-5px); }
}

/* 视线位置调试指示器 - 使用absolute定位，与目标甜甜圈相同坐标系统 */
.gaze-debug-dot {
  position: absolute;
  transform: translate(-50%, -50%);
  font-size: 24px;
  z-index: 9999;
  pointer-events: none;
  filter: drop-shadow(0 0 10px rgba(0, 255, 0, 0.8));
  animation: gaze-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes gaze-pulse {
  from { transform: translate(-50%, -50%) scale(1); }
  to { transform: translate(-50%, -50%) scale(1.2); }
}

/* 调试距离显示 */
.debug-distance {
  position: absolute;
  top: 120%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 50px;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  font-size: 12px;
  color: #0f0;
  white-space: nowrap;
}

/* 校准提示 */
.calibration-tips {
  position: absolute;
  bottom: 100px;
}

.tip-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.tip-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.tip-card p {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.tip-small {
  font-size: 14px !important;
  color: #666 !important;
  margin-top: 5px !important;
}

.tip-card.tip-glasses {
  margin-top: 15px;
  background: rgba(255, 243, 205, 0.9);
  border: 1px solid #ffc107;
}

/* 跳过按钮 */
.btn-skip {
  position: absolute;
  bottom: 30px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.8);
  color: #666;
  border: 2px solid #ddd;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.btn-skip:hover {
  background: white;
  border-color: #999;
}

/* ==================== 校准阶段摄像头预览 ==================== */
.calibration-camera-preview {
  position: absolute;
  bottom: 30px;
  right: 30px;
  width: 200px;
  height: 150px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.3);
  z-index: 100;
}

.calibration-camera-preview .camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1); /* 镜像显示，像照镜子 */
}

.calibration-camera-preview .camera-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.calibration-camera-preview .camera-status {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 11px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* ==================== 游戏阶段摄像头预览 ==================== */
.camera-preview {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 140px;
  height: 105px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  border: 3px solid rgba(255, 255, 255, 0.2);
}

.camera-video,
.camera-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.camera-status {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff6b6b;
  animation: pulse-dot 1.5s infinite;
}

.camera-status.status-active .status-dot {
  background: #2ecc71;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ==================== 游戏头部 ==================== */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px 25px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.instructions h2 {
  margin: 0 0 8px 0;
  font-size: 26px;
}

.instruction-highlight {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 14px;
  border-radius: 20px;
  display: inline-block;
}

.game-stats {
  display: flex;
  gap: 15px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.stat-icon {
  font-size: 24px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
}

.stat-value.warning {
  color: #ffeb3b;
  animation: pulse-bright 1s infinite;
}

@keyframes pulse-bright {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.stat-label {
  font-size: 12px;
  opacity: 0.9;
}

.mode-card {
  background: rgba(255, 215, 0, 0.25);
}

/* ==================== 游戏区域 ==================== */
.game-area {
  position: relative;
  width: 100%;
  height: calc(100vh - 220px); /* 全屏自适应高度 */
  min-height: 500px;
  max-height: 800px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  border-radius: 24px;
  overflow: hidden;
  cursor: crosshair;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.5), 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* 星空背景 */
.stars-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.star {
  position: absolute;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s infinite;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.2); }
}

/* 星星目标 */
.star-target {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.star-glow {
  position: absolute;
  width: 150%;
  height: 150%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.6) 0%, transparent 70%);
  border-radius: 50%;
  animation: star-pulse 2s ease-in-out infinite;
}

@keyframes star-pulse {
  0%, 100% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.3); opacity: 1; }
}

.star-core {
  font-size: 50px;
  z-index: 1;
  filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.8));
  animation: star-rotate 10s linear infinite;
}

@keyframes star-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.star-rays {
  position: absolute;
  width: 200%;
  height: 200%;
}

.star-rays span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.6), transparent);
  transform-origin: center;
}

.star-rays span:nth-child(1) { transform: translate(-50%, -50%) rotate(0deg); }
.star-rays span:nth-child(2) { transform: translate(-50%, -50%) rotate(45deg); }
.star-rays span:nth-child(3) { transform: translate(-50%, -50%) rotate(90deg); }
.star-rays span:nth-child(4) { transform: translate(-50%, -50%) rotate(135deg); }

/* ==================== 视线准星 (战斗机瞄准器样式) ==================== */
.gaze-crosshair {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 20;
  width: 80px;
  height: 80px;
}

/* 外圈 */
.crosshair-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70px;
  height: 70px;
  border: 3px solid rgba(0, 255, 136, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.5), inset 0 0 20px rgba(0, 255, 136, 0.2);
  animation: crosshair-pulse 1s ease-in-out infinite;
}

@keyframes crosshair-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.05); }
}

/* 十字线 */
.crosshair-lines {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
}

.line-h, .line-v {
  position: absolute;
  background: rgba(0, 255, 136, 0.9);
  box-shadow: 0 0 10px rgba(0, 255, 136, 0.8);
}

.line-h {
  top: 50%;
  left: 10%;
  width: 80%;
  height: 2px;
  transform: translateY(-50%);
}

.line-v {
  top: 10%;
  left: 50%;
  width: 2px;
  height: 80%;
  transform: translateX(-50%);
}

/* 中心点 */
.crosshair-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: rgba(0, 255, 136, 1);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(0, 255, 136, 1);
}

/* 锁定指示 */
.target-locked {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 20px;
  animation: lock-bounce 0.5s ease;
}

@keyframes lock-bounce {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.3); }
}

/* ==================== 鼠标光标 ==================== */
.mouse-cursor {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.cursor-ring {
  width: 30px;
  height: 30px;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.cursor-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 10px;
  height: 10px;
  background: white;
  border-radius: 50%;
}

/* ==================== 连击显示 ==================== */
.combo-display {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 25px;
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 25px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: combo-pop 0.3s ease;
  box-shadow: 0 4px 20px rgba(255, 107, 107, 0.4);
}

.combo-high {
  background: linear-gradient(135deg, #ffd700, #ff6b9d);
}

.combo-text {
  font-size: 18px;
  font-weight: 700;
  color: white;
}

.combo-stars {
  font-size: 14px;
  margin-top: 4px;
}

@keyframes combo-pop {
  0% { transform: translateX(-50%) scale(0); }
  50% { transform: translateX(-50%) scale(1.1); }
  100% { transform: translateX(-50%) scale(1); }
}

/* ==================== 结果界面 ==================== */
.game-result {
  text-align: center;
  padding: 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 24px;
  color: white;
}

.result-celebration {
  margin-bottom: 30px;
}

.celebration-stars {
  font-size: 48px;
  margin-bottom: 10px;
  animation: celebration-bounce 1s ease infinite;
}

@keyframes celebration-bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.result-celebration h2 {
  font-size: 36px;
  margin: 0 0 10px 0;
}

.result-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
}

.result-cards {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 30px;
}

.result-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  padding: 25px 35px;
  color: #333;
  min-width: 140px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
}

.result-card:hover {
  transform: translateY(-5px);
}

.card-icon {
  font-size: 36px;
  margin-bottom: 10px;
}

.card-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.card-value.highlight {
  font-size: 36px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.rating-badge {
  display: inline-block;
  margin-top: 10px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
}

.rating-badge.excellent {
  background: linear-gradient(135deg, #2ecc71, #27ae60);
  color: white;
}

.rating-badge.good {
  background: linear-gradient(135deg, #3498db, #2980b9);
  color: white;
}

.rating-badge.average {
  background: linear-gradient(135deg, #f39c12, #e67e22);
  color: white;
}

.rating-badge.keep-trying {
  background: linear-gradient(135deg, #e74c3c, #c0392b);
  color: white;
}

.mode-tag {
  margin-bottom: 25px;
}

.mode-tag span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255, 215, 0, 0.2);
  border: 2px solid rgba(255, 215, 0, 0.5);
  border-radius: 25px;
  font-size: 14px;
}

.btn-primary {
  padding: 16px 40px;
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  background: white;
  border: none;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

/* ==================== 独立调试面板 ==================== */
.debug-panel {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 320px;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 12px;
  border: 2px solid #00ff88;
  box-shadow: 0 8px 32px rgba(0, 255, 136, 0.3);
  z-index: 9999;
  font-family: 'Courier New', monospace;
  color: #00ff88;
  overflow: hidden;
  transition: all 0.3s ease;
}

.debug-panel-collapsed {
  width: 140px;
}

.debug-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  background: rgba(0, 255, 136, 0.15);
  border-bottom: 1px solid rgba(0, 255, 136, 0.3);
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  user-select: none;
}

.debug-panel-header:hover {
  background: rgba(0, 255, 136, 0.25);
}

.debug-toggle {
  font-size: 12px;
  opacity: 0.8;
}

.debug-panel-content {
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
}

.debug-row {
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.5;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.debug-row strong {
  color: #ffd700;
  font-weight: bold;
}

.debug-row small {
  font-size: 11px;
  opacity: 0.9;
}

.status-ok {
  color: #00ff88;
  font-weight: bold;
  font-size: 16px;
}

.status-fail {
  color: #ff6b6b;
  font-weight: bold;
  font-size: 16px;
}

.debug-logs {
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(0, 255, 136, 0.3);
  max-height: 150px;
  overflow-y: auto;
}

.debug-log-item {
  font-size: 11px;
  margin-bottom: 5px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  border-left: 3px solid #00ff88;
  line-height: 1.4;
  word-break: break-all;
}

/* 自定义滚动条 */
.debug-logs::-webkit-scrollbar {
  width: 6px;
}

.debug-logs::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
}

.debug-logs::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 136, 0.5);
  border-radius: 3px;
}

.debug-logs::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 136, 0.8);
}

/* 打印样式 */
@media print {
  .game-header,
  .camera-preview,
  .debug-panel {
    display: none;
  }
}
</style>
