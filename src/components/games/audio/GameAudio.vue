<template>
  <div class="game-audio-container" :class="{ 'game-audio-container--rhythm': mode === 'rhythm' }">
    <!-- 游戏头部 -->
    <div class="game-header" v-if="!gameEnded && mode !== 'rhythm'">
      <div class="task-info">
        <h2>{{ taskTitle }}</h2>
        <p class="instruction">{{ currentInstruction }}</p>
      </div>
      <div class="game-stats">
        <div class="stat">
          <span class="label">进度：</span>
          <span class="value">{{ currentRound }} / {{ totalRounds }}</span>
        </div>
        <div class="stat">
          <span class="label">时间：</span>
          <span class="value" :class="{ warning: timeLeft <= 10 }">{{ timeLeft }}s</span>
        </div>
        <div class="stat">
          <span class="label">得分：</span>
          <span class="value">{{ score }}</span>
        </div>
      </div>
    </div>

    <!-- 辨别模式 (Task 5) -->
    <div v-if="mode === 'diff' && !gameEnded" class="game-mode-diff">
      <button class="play-btn" @click="playSounds" :disabled="isPlaying">
        <i class="fas fa-play"></i> 播放声音
      </button>
      <div class="choice-buttons" v-if="soundsPlayed">
        <button
          class="btn-choice btn-same"
          @click="handleDiffChoice(true)"
          :disabled="choiceMade"
        >
          👍 一样
        </button>
        <button
          class="btn-choice btn-diff"
          @click="handleDiffChoice(false)"
          :disabled="choiceMade"
        >
          👎 不一样
        </button>
      </div>
    </div>

    <!-- 指令模式 (Task 6) -->
    <div v-if="mode === 'command' && !gameEnded" class="game-mode-command">
      <!-- 开始按钮：第一轮需要用户点击才能播放语音（浏览器自动播放策略） -->
      <div v-if="currentRound === 0" class="start-prompt">
        <button class="btn-start" @click="startFirstRound">
          <i class="fas fa-play-circle"></i> 点击开始游戏
        </button>
        <p class="start-hint">点击按钮开始听指令做动作游戏</p>
      </div>

      <!-- 语音控制按钮组 -->
      <div v-else class="voice-control">
        <button class="play-btn" @click="playCommand(false)" :disabled="isPlaying">
          <i class="fas fa-redo"></i> 重播指令
        </button>
        <span v-if="isPlaying" class="playing-indicator">
          <i class="fas fa-volume-up"></i> 播放中...
        </span>
      </div>

      <!-- 降级方案：显示文字指令 -->
      <div class="command-text-fallback" v-if="!speechSynthesisSupported && commandPlayed">
        <div class="command-instruction">
          <span class="command-label">指令：</span>
          <span class="command-text">{{ currentCommand }}</span>
        </div>
      </div>

      <!-- 复用 Grid 布局显示选项 -->
      <div class="command-grid" :class="`grid-${gridSize}x${gridSize}`" v-if="commandPlayed">
        <div
          v-for="item in commandOptions"
          :key="item.id"
          class="grid-item"
          :class="{
            selected: item.isSelected,
            correct: item.isCorrect && showResult,
            wrong: !item.isCorrect && item.isSelected && showResult
          }"
          @click="handleCommandClick(item)"
        >
          <div
            class="item-shape"
            :class="`shape-${item.shape}`"
            :style="{ backgroundColor: GAME_COLORS[item.color] }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 节奏模式 (Task 7) - 简化版：看-做模式 -->
    <div v-if="mode === 'rhythm' && !gameEnded" class="game-mode-rhythm">
      <div class="rhythm-playground">
        <div class="rhythm-scene-top">
          <div class="rhythm-status-pills">
            <div class="rhythm-status-pill">
              <span>当前轮次</span>
              <strong>{{ currentRound }} / {{ totalRounds }}</strong>
            </div>
            <div class="rhythm-status-pill">
              <span>当前得分</span>
              <strong>{{ score }}</strong>
            </div>
            <div class="rhythm-status-pill">
              <span>当前难度</span>
              <strong>{{ selectedRhythmDifficulty.label }}</strong>
            </div>
          </div>
          <p class="rhythm-scene-copy">{{ currentInstruction }}</p>
        </div>

        <div class="rhythm-hero-grid">
          <section
            v-if="!isRhythmPlaying && !canRecord && rhythmPattern.length === 0"
            class="difficulty-selector rhythm-card-surface"
          >
            <div class="selector-label">挑选一片节奏森林</div>
            <div class="difficulty-buttons">
              <button
                v-for="card in rhythmDifficultyCards"
                :key="card.key"
                type="button"
                class="diff-btn"
                :class="[card.key, { active: difficulty === card.key }]"
                @click="difficulty = card.key"
              >
                <div class="diff-art" aria-hidden="true">
                  <div v-if="card.key === 'easy'" class="plant-illustration plant-illustration--easy">
                    <span class="plant-ground"></span>
                    <span class="plant-stem"></span>
                    <span class="plant-leaf plant-leaf--left"></span>
                    <span class="plant-leaf plant-leaf--right"></span>
                    <span class="plant-spark"></span>
                  </div>
                  <div v-else-if="card.key === 'medium'" class="plant-illustration plant-illustration--medium">
                    <span class="plant-ground"></span>
                    <span class="plant-bush plant-bush--left"></span>
                    <span class="plant-bush plant-bush--middle"></span>
                    <span class="plant-bush plant-bush--right"></span>
                    <span class="plant-berry plant-berry--one"></span>
                    <span class="plant-berry plant-berry--two"></span>
                  </div>
                  <div v-else class="plant-illustration plant-illustration--hard">
                    <span class="plant-ground"></span>
                    <span class="plant-trunk"></span>
                    <span class="plant-canopy plant-canopy--left"></span>
                    <span class="plant-canopy plant-canopy--center"></span>
                    <span class="plant-canopy plant-canopy--right"></span>
                    <span class="plant-star"></span>
                  </div>
                </div>
                <div class="diff-copy">
                  <span class="diff-label">{{ card.label }}</span>
                  <strong class="diff-title">{{ card.title }}</strong>
                  <span class="diff-desc">{{ card.description }}</span>
                </div>
              </button>
            </div>
          </section>

          <section v-else class="difficulty-selector rhythm-card-surface rhythm-card-surface--compact">
            <div class="selector-label">本轮节奏森林</div>
            <div class="difficulty-preview">
              <div class="difficulty-preview__chip" :class="selectedRhythmDifficulty.key">
                <span>已锁定难度</span>
                <strong>{{ selectedRhythmDifficulty.label }} · {{ selectedRhythmDifficulty.title }}</strong>
              </div>
              <p>完成这一轮后，可以重新挑选难度和节奏速度。</p>
            </div>
          </section>

          <aside class="rhythm-sidekick-stack">
            <section class="rhythm-assistant-card rhythm-card-surface">
              <div class="rhythm-assistant-copy">
                <span class="assistant-badge">耳机小助手</span>
                <h3>鼓点怪陪你一起听拍子</h3>
                <p>先看发亮的鼓点，再用小手跟上去。慢一点也没关系，稳稳做就很棒。</p>
              </div>
              <div class="monster-sidekick" aria-hidden="true">
                <span class="monster-shadow"></span>
                <span class="monster-band"></span>
                <span class="monster-ear monster-ear--left"></span>
                <span class="monster-ear monster-ear--right"></span>
                <span class="monster-horn monster-horn--left"></span>
                <span class="monster-horn monster-horn--right"></span>
                <span class="monster-body"></span>
                <span class="monster-eye monster-eye--left"></span>
                <span class="monster-eye monster-eye--right"></span>
                <span class="monster-blush monster-blush--left"></span>
                <span class="monster-blush monster-blush--right"></span>
                <span class="monster-mouth"></span>
                <span class="monster-foot monster-foot--left"></span>
                <span class="monster-foot monster-foot--right"></span>
              </div>
            </section>

            <section class="rhythm-trophy-rack rhythm-card-surface">
              <span class="trophy-title">星星奖杯架</span>
              <div class="trophy-slots" aria-hidden="true">
                <span class="trophy-slot">☆</span>
                <span class="trophy-slot">☆</span>
                <span class="trophy-slot">☆</span>
              </div>
              <p>训练完成后，这里会留给你的闪亮星星。</p>
            </section>
          </aside>
        </div>

        <div class="phase-indicator rhythm-card-surface">
          <div class="phase-step" :class="{ active: isRhythmPlaying, completed: !isRhythmPlaying && rhythmPattern.length > 0 }">
            <div class="phase-icon-shell">
              <span class="phase-icon">👀</span>
            </div>
            <span class="phase-text">仔细看</span>
            <span class="phase-caption">看清发亮的鼓点</span>
          </div>
          <div class="phase-arrow" aria-hidden="true">➜</div>
          <div class="phase-step" :class="{ active: canRecord }">
            <div class="phase-icon-shell">
              <span class="phase-icon">☝️</span>
            </div>
            <span class="phase-text">跟着做</span>
            <span class="phase-caption">按同样节奏轻轻拍</span>
          </div>
        </div>

        <div class="rhythm-timeline rhythm-card-surface">
          <div class="timeline-title-row">
            <span>节奏轨道</span>
            <strong>{{ rhythmPattern.length > 0 ? `${rhythmPattern.length} 拍` : '等待开始' }}</strong>
          </div>
          <div v-if="rhythmPattern.length > 0" class="timeline-track">
            <div
              v-for="(beat, index) in rhythmPattern"
              :key="index"
              class="beat-marker"
              :class="{
                'demo': isRhythmPlaying && index === currentBeatIndex,
                'user-turn': canRecord && index === currentTapIndex,
                'tapped': tapFeedback[index]?.show,
                'correct': tapFeedback[index]?.show && tapFeedback[index]?.isCorrect,
                'wrong': tapFeedback[index]?.show && !tapFeedback[index]?.isCorrect
              }"
            >
              <div class="beat-circle">
                <span class="beat-number" v-if="!tapFeedback[index]?.show">{{ index + 1 }}</span>
                <span class="beat-accuracy" v-else>{{ tapFeedback[index]?.accuracy }}%</span>
                <div class="beat-ripple" v-if="isRhythmPlaying && index === currentBeatIndex"></div>
              </div>
              <div class="beat-line" v-if="index < rhythmPattern.length - 1"></div>
            </div>
          </div>
          <div v-else class="timeline-placeholder" aria-hidden="true">
            <span class="timeline-placeholder__note">♪</span>
            <span class="timeline-placeholder__dot"></span>
            <span class="timeline-placeholder__dot"></span>
            <span class="timeline-placeholder__dot"></span>
            <span class="timeline-placeholder__note">♫</span>
          </div>
        </div>

        <div class="rhythm-main-area">
          <button
            v-if="!isRhythmPlaying && !canRecord && rhythmPattern.length === 0"
            type="button"
            class="rhythm-start-btn"
            @click="startRhythmGame"
          >
            <span class="rhythm-start-btn__glow" aria-hidden="true"></span>
            <div class="btn-icon">🥁</div>
            <div class="btn-text">开始游戏</div>
            <div class="btn-hint">先看我敲，再跟着做</div>
          </button>

          <div v-else-if="isRhythmPlaying" class="rhythm-status watching rhythm-card-surface">
            <div class="status-icon">👀</div>
            <div class="status-text">仔细看节奏</div>
            <div class="status-subtext">鼓点正在示范，等一下就轮到你啦。</div>
          </div>

          <button
            v-else-if="canRecord"
            type="button"
            class="drum-pad"
            :class="{ 'can-tap': true }"
            @click="handleRhythmTap"
          >
            <span class="drum-pad__glow" aria-hidden="true"></span>
            <div class="drum-surface">
              <div class="drum-center">
                <span class="drum-icon">🥁</span>
                <span class="drum-text">轮到你敲啦</span>
                <span class="drum-subtext">第 {{ currentTapIndex + 1 }} / {{ rhythmPattern.length }} 拍</span>
              </div>
            </div>
            <div class="tap-effects">
              <div
                v-for="n in 3"
                :key="n"
                class="tap-ring"
                :class="{ 'tap-animate': tapEffects[n - 1] }"
              ></div>
            </div>
          </button>
        </div>

        <div class="rhythm-bottom-grid">
          <div class="accuracy-display rhythm-card-surface">
            <div class="accuracy-label">本拍准确度</div>
            <div
              v-if="canRecord && currentTapIndex > 0 && previousTapFeedback?.show"
              class="accuracy-value"
              :class="{ 'good': (previousTapFeedback?.accuracy ?? 0) >= 70, 'bad': (previousTapFeedback?.accuracy ?? 0) < 70 }"
            >
              {{ previousTapFeedback?.accuracy }}%
            </div>
            <div v-else class="accuracy-hint">等鼓点亮起来后，再轻轻跟着拍下去。</div>
          </div>

          <div class="rhythm-progress rhythm-card-surface">
            <div class="progress-text">
              <span v-if="isRhythmPlaying">👀 先看示范节奏</span>
              <span v-else-if="canRecord && rhythmPattern.length > 0">☝️ 第 {{ currentTapIndex + 1 }} / {{ rhythmPattern.length }} 拍</span>
              <span v-else>🎯 按下大鼓开始这一轮</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${rhythmProgressPercentage}%` }"></div>
            </div>
          </div>

          <div class="rhythm-hint rhythm-card-surface">
            <p v-if="rhythmMode === 'follow'">
              <span class="hint-icon">💡</span>
              跟着鼓声一起点击鼓面。节奏越稳定，分数就会越高。
            </p>
            <p v-else>
              <span class="hint-icon">💡</span>
              仔细听节奏，播放完成后重复点击，慢慢把拍子记在心里。
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- 结果界面 -->
    <div class="game-result" v-if="gameEnded">
      <h2>🎵 训练完成！</h2>
      <div class="result-stats">
        <div class="result-item">
          <span class="label">总轮次：</span>
          <span class="value">{{ totalRounds }}</span>
        </div>
        <div class="result-item">
          <span class="label">正确次数：</span>
          <span class="value">{{ correctCount }}</span>
        </div>
        <div class="result-item">
          <span class="label">准确率：</span>
          <span class="value">{{ (accuracy * 100).toFixed(1) }}%</span>
        </div>
        <div class="result-item" v-if="mode === 'rhythm'">
          <span class="label">平均偏差：</span>
          <span class="value">{{ avgTimingError }}ms</span>
        </div>
        <div class="result-item" v-else>
          <span class="label">平均反应时：</span>
          <span class="value">{{ avgResponseTime }}ms</span>
        </div>
      </div>
      <button class="btn-primary" disabled>
        正在生成详细报告...
      </button>
    </div>

    <!-- 反馈 -->
    <div v-if="feedback" class="feedback" :class="feedback.type">
      {{ feedback.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { GameAudioMode, GridSize, GridItem, AudioTrialData, GameSessionData, GameColor, GameShape } from '@/types/games'
import { GAME_COLORS, GAME_SHAPES, TaskID } from '@/types/games'

type CommandOption = GridItem & {
  type: 'shape'
  color: GameColor
  shape: GameShape
  isCorrect: boolean
}

type RhythmDifficulty = 'easy' | 'medium' | 'hard'

// Props
interface Props {
  studentId: number
  taskId: TaskID
  mode: GameAudioMode
  gridSize?: GridSize
  rounds?: number
  timeLimit?: number // 时间限制（秒）- 声音辨别和听指令做动作使用
}

const props = withDefaults(defineProps<Props>(), {
  gridSize: 2,
  rounds: 8, // 减少轮次，避免疲劳
  timeLimit: 60 // 默认60秒，给特殊儿童更多时间
})

// Emits
const emit = defineEmits<{
  finish: [data: GameSessionData]
}>()

// 状态
const currentRound = ref(0)
const timeLeft = ref(props.timeLimit)
const score = ref(0)
const gameEnded = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// 辨别模式
const soundsPlayed = ref(false)
const choiceMade = ref(false)
const isPlaying = ref(false)
const currentSounds = ref<number[]>([])
const isSame = ref(false)

// 指令模式
const commandPlayed = ref(false)
const commandOptions = ref<CommandOption[]>([])
const currentCommand = ref('')

// 节奏模式
const rhythmPattern = ref<number[]>([])
const currentBeatIndex = ref(-1)
const canRecord = ref(false)
const recordedBeats = ref<number[]>([])
const rhythmPlayback = ref<number | null>(null)

// 改进的节奏游戏状态
const rhythmMode = ref<'follow' | 'memory'>('follow') // 跟随模式 vs 记忆模式
const currentTapIndex = ref(0) // 当前应该点击的节拍索引
const tapFeedback = ref<{ index: number; isCorrect: boolean; show: boolean; accuracy?: number }[]>([]) // 点击反馈
const comboCount = ref(0) // 连击计数
const lastBeatTime = ref(0) // 最后一个节拍的时间
const isRhythmPlaying = ref(false) // 是否正在播放节奏
const difficulty = ref<RhythmDifficulty>('medium') // 难度级别

// 难度配置
const difficultyConfig: Record<RhythmDifficulty, { interval: number; tolerance: number; label: string }> = {
  easy: { interval: 1200, tolerance: 0.40, label: '简单' },    // 1200ms间隔，40%容错
  medium: { interval: 800, tolerance: 0.30, label: '中等' },    // 800ms间隔，30%容错
  hard: { interval: 500, tolerance: 0.20, label: '困难' }       // 500ms间隔，20%容错
}

const rhythmDifficultyCards: Array<{
  key: RhythmDifficulty
  label: string
  title: string
  description: string
}> = [
  { key: 'easy', label: '简单', title: '嫩芽节奏', description: '慢一点，看清再跟上，容错更宽松。' },
  { key: 'medium', label: '中等', title: '灌木节奏', description: '标准速度，适合稳定练习整轮节拍。' },
  { key: 'hard', label: '困难', title: '大树节奏', description: '速度更快，需要更稳的节奏控制。' },
]

// 通用
const showResult = ref(false)
const trials = ref<AudioTrialData[]>([])
const trialStartTime = ref<number>(0) // 记录每轮开始时间

// Audio Context（复用以符合浏览器自动播放策略）
const audioContext = ref<AudioContext | null>(null)
const speechSynthesisSupported = ref(
  typeof window !== 'undefined' && 'speechSynthesis' in window
)

// 定时器
const timerInterval = ref<number | null>(null)
const rhythmTimeout = ref<number | null>(null)

// 计算属性
const totalRounds = computed(() => props.rounds)
const correctCount = computed(() => trials.value.filter(t => t.isCorrect).length)
// 正确轮次比例（所有trial中isCorrect的比例）
const accuracy = computed(() => trials.value.length > 0 ? correctCount.value / trials.value.length : 0)

// 真实平均准确率（所有trial的rhythmStats.accuracy平均值）
const realAccuracy = computed(() => {
  const rhythmTrials = trials.value.filter(t => t.rhythmStats)
  if (rhythmTrials.length === 0) return 0
  const totalAcc = rhythmTrials.reduce((sum, t) => sum + (t.rhythmStats?.accuracy || 0), 0)
  return totalAcc / rhythmTrials.length / 100 // 转换为0-1范围
})

const sessionAccuracy = computed(() => (
  props.mode === 'rhythm' ? realAccuracy.value : accuracy.value
))

const avgResponseTime = computed(() => {
  const valid = trials.value.filter(t => t.responseTime > 0)
  if (valid.length === 0) return 0
  return Math.round(valid.reduce((sum, t) => sum + t.responseTime, 0) / valid.length)
})

// 真实平均节奏误差（所有trial的rhythmStats.timingErrorAvg平均值）
const avgTimingError = computed(() => {
  const rhythmTrials = trials.value.filter(t => t.rhythmStats)
  if (rhythmTrials.length === 0) return 0
  const totalError = rhythmTrials.reduce((sum, t) => sum + (t.rhythmStats?.timingErrorAvg || 0), 0)
  return Math.round(totalError / rhythmTrials.length)
})

const taskTitle = computed(() => {
  const titles = {
    diff: '🔊 声音辨别游戏',
    command: '🎧 听指令做动作',
    rhythm: '🎵 节奏模仿游戏'
  }
  return titles[props.mode]
})

const currentInstruction = computed(() => {
  if (props.mode === 'diff') {
    return '点击播放按钮，判断两个声音是否相同'
  } else if (props.mode === 'command') {
    return '仔细听指令，然后点击正确的选项'
  } else {
    return '先听节奏，然后跟着拍打'
  }
})

const previousTapFeedback = computed(() => {
  if (currentTapIndex.value <= 0) {
    return null
  }

  return tapFeedback.value[currentTapIndex.value - 1] ?? null
})

const selectedRhythmDifficulty = computed(() => (
  rhythmDifficultyCards.find(card => card.key === difficulty.value) ?? rhythmDifficultyCards[1]!
))

const rhythmProgressPercentage = computed(() => (
  rhythmPattern.value.length > 0
    ? (currentTapIndex.value / rhythmPattern.value.length) * 100
    : 0
))

const sessionData = computed<GameSessionData>(() => {
  const correct = trials.value.filter(t => t.isCorrect).length
  const omission = trials.value.filter(t => !t.userAnswer && !t.userSelection && !t.userRhythm).length
  const commission = trials.value.filter(t => !t.isCorrect).length

  // 计算疲劳指数
  const midPoint = Math.floor(trials.value.length / 2)
  const firstHalf = trials.value.slice(0, midPoint)
  const secondHalf = trials.value.slice(midPoint)
  const firstHalfAcc = firstHalf.length > 0 ? firstHalf.filter(t => t.isCorrect).length / firstHalf.length : 0
  const secondHalfAcc = secondHalf.length > 0 ? secondHalf.filter(t => t.isCorrect).length / secondHalf.length : 0
  const fatigueIndex = firstHalfAcc > 0 ? secondHalfAcc / firstHalfAcc : 1

  return {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: trials.value[0]?.timestamp || Date.now(),
    endTime: Date.now(),
    duration: props.mode === 'rhythm'
      ? Math.round((Date.now() - (trials.value[0]?.timestamp || Date.now())) / 1000)
      : props.timeLimit,
    trials: trials.value,
    totalTrials: trials.value.length,
    correctTrials: correct,
    accuracy: sessionAccuracy.value,
    avgResponseTime: avgResponseTime.value,
    errors: {
      omission,
      commission
    },
    behavior: {
      impulsivityScore: 0,
      fatigueIndex: Number(fatigueIndex.toFixed(2))
    },
    rhythmStats: props.mode === 'rhythm' ? {
      timingErrorAvg: avgTimingError.value
    } : undefined
  }
})

/**
 * 播放声音（辨别模式）
 */
function playSounds() {
  if (isPlaying.value) return
  isPlaying.value = true

  // 生成两个音调
  const freq1 = 400 + Math.random() * 400
  const isSameSound = Math.random() > 0.5

  currentSounds.value = [freq1]
  if (isSameSound) {
    currentSounds.value.push(freq1)
    isSame.value = true
  } else {
    const freq2 = freq1 + 100 + Math.random() * 200
    currentSounds.value.push(freq2)
    isSame.value = false
  }

  // 播放第一个音
  playTone(freq1, 500)

  // 延迟后播放第二个音 - 特殊儿童需要更长时间处理第一个音
  setTimeout(() => {
    const secondSound = currentSounds.value[1]
    if (secondSound !== undefined) {
      playTone(secondSound, 500)
    }
    isPlaying.value = false
    soundsPlayed.value = true
    // 第二个声音播放后开始计时
    trialStartTime.value = Date.now()
  }, 1500)
}

/**
 * 初始化 AudioContext（必须在用户交互后调用）
 */
function initAudioContext() {
  if (!audioContext.value) {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        audioContext.value = new AudioContextClass()
      }
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
    }
  }

  // 确保 AudioContext 处于运行状态
  if (audioContext.value && audioContext.value.state === 'suspended') {
    audioContext.value.resume()
  }

  return audioContext.value
}

/**
 * 播放音调（使用共享 AudioContext）
 */
function playTone(frequency: number, duration: number) {
  try {
    const ctx = initAudioContext()
    if (!ctx) {
      console.warn('AudioContext not available')
      return
    }

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = frequency

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000)

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.start()
    oscillator.stop(ctx.currentTime + duration / 1000)
  } catch (error) {
    console.error('Audio play error:', error)
  }
}

/**
 * 处理辨别选择
 */
function handleDiffChoice(same: boolean) {
  if (choiceMade.value) return

  choiceMade.value = true
  const isCorrect = same === isSame.value
  // 计算真实反应时间（从第二个声音播放到用户点击的时间）
  // soundsPlayed在第二个声音播放完成后设为true，此时开始计时
  const responseTime = trialStartTime.value > 0 ? Date.now() - trialStartTime.value : 0

  trials.value.push({
    trialId: currentRound.value,
    mode: 'diff',
    sounds: currentSounds.value,
    userAnswer: same,
    isCorrect,
    responseTime,
    timestamp: Date.now()
  })

  showResult.value = true
  if (isCorrect) {
    score.value += 10
    showFeedback('success', '✓ 正确！')
  } else {
    showFeedback('error', '✕ 错误')
  }

  setTimeout(() => {
    startNewRound()
  }, 2500) // 延长反馈时间，特殊儿童需要更多时间理解
}

/**
 * 生成指令选项
 * 使用高区分度颜色作为目标，全部12种颜色作为干扰项
 */
function generateCommandOptions() {
  // 高区分度颜色 - 用于目标颜色（避免相近色调混淆）
  // 选择8种最容易区分的颜色（新增粉色，儿童容易识别）
  const targetColorNames = ['红色', '橙色', '黄色', '绿色', '蓝色', '紫色', '粉色', '青色']
  const targetColorKeys: GameColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan']

  // 全部颜色 - 用于干扰项
  const allColorKeys = Object.keys(GAME_COLORS) as GameColor[]

  // 形状名称和键名 - 使用全部8种形状
  const shapeNames = ['圆形', '方形', '三角形', '正六边形', '五角星', '梯形', '菱形', '直角三角形']
  const shapeKeys = Object.keys(GAME_SHAPES) as GameShape[]

  // 随机选择目标颜色和形状（从高区分度颜色中选择）
  const targetColorIdx = Math.floor(Math.random() * targetColorKeys.length)
  const shapeIdx = Math.floor(Math.random() * shapeKeys.length)

  const selectedColor = targetColorKeys[targetColorIdx] ?? targetColorKeys[0]!
  const selectedShape = shapeKeys[shapeIdx] ?? shapeKeys[0]!
  const colorName = targetColorNames[targetColorIdx]
  const shapeName = shapeNames[shapeIdx]

  currentCommand.value = `请点击${colorName}的${shapeName}`

  // 调试日志：确保颜色和指令匹配
  console.log('[GameAudio] 生成指令:', {
    command: currentCommand.value,
    selectedColor,
    colorName,
    selectedShape,
    shapeName,
    colorHex: GAME_COLORS[selectedColor as keyof typeof GAME_COLORS]
  })

  // 生成选项
  const options: CommandOption[] = []
  const usedCombinations = new Set<string>()

  // 添加正确答案
  options.push({
    id: Date.now(),
    type: 'shape',
    shape: selectedShape,
    color: selectedColor,
    isTarget: true,
    isCorrect: true,
    isSelected: false
  })
  usedCombinations.add(`${selectedColor}-${selectedShape}`)

  // 添加干扰项 - 根据网格大小生成足够数量的选项
  const totalOptions = props.gridSize * props.gridSize
  const maxAttempts = totalOptions * 20 // 最大尝试次数，防止无限循环
  let attempts = 0

  // 使用全部颜色生成干扰项
  while (options.length < totalOptions && attempts < maxAttempts) {
    attempts++
    const c = Math.floor(Math.random() * allColorKeys.length)
    const s = Math.floor(Math.random() * shapeKeys.length)
    const colorKey = allColorKeys[c] ?? allColorKeys[0]!
    const shapeKey = shapeKeys[s] ?? shapeKeys[0]!
    const key = `${colorKey}-${shapeKey}`

    if (!usedCombinations.has(key)) {
      usedCombinations.add(key)
      options.push({
        id: Date.now() + options.length,
        type: 'shape',
        shape: shapeKey,
        color: colorKey,
        isTarget: false,
        isCorrect: false,
        isSelected: false
      })
    }
  }

  // 如果无法生成足够的唯一干扰项，允许重复填充
  while (options.length < totalOptions) {
    const c = Math.floor(Math.random() * allColorKeys.length)
    const s = Math.floor(Math.random() * shapeKeys.length)
    options.push({
      id: Date.now() + options.length,
      type: 'shape',
      shape: shapeKeys[s] ?? shapeKeys[0]!,
      color: allColorKeys[c] ?? allColorKeys[0]!,
      isTarget: false,
      isCorrect: false,
      isSelected: false
    })
  }

  commandOptions.value = options.sort(() => Math.random() - 0.5)

  // 调试日志：验证正确答案的颜色
  const correctOption = commandOptions.value.find(o => o.isCorrect)
  if (correctOption) {
    console.log('[GameAudio] 正确答案:', {
      color: correctOption.color,
      shape: correctOption.shape,
      hex: GAME_COLORS[correctOption.color as keyof typeof GAME_COLORS],
      command: currentCommand.value
    })
  }
}

/**
 * 播放指令（指令模式）
 * @param autoShowOptions 是否在播放快结束时自动显示选项
 */
function playCommand(autoShowOptions = true) {
  if (isPlaying.value) return

  // 如果还没有生成选项，先生成
  if (commandOptions.value.length === 0) {
    generateCommandOptions()
  }

  // 检查语音合成是否可用
  if (speechSynthesisSupported.value && window.speechSynthesis) {
    // 使用语音合成播放指令
    isPlaying.value = true
    const utterance = new SpeechSynthesisUtterance(currentCommand.value)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.8

    // 估算语音时长（中文大约每秒4-5个字）
    const estimatedDuration = currentCommand.value.length * 250 // 毫秒
    console.log('语音指令:', currentCommand.value, '估算时长:', estimatedDuration, 'ms')

    // 方案1：在语音播放到60%时显示选项
    let timeoutId: number | null = null
    if (autoShowOptions) {
      timeoutId = window.setTimeout(() => {
        console.log('setTimeout触发，显示选项')
        if (!commandPlayed.value) {
          commandPlayed.value = true
          trialStartTime.value = Date.now()
        }
      }, Math.max(estimatedDuration * 0.6, 800)) // 至少等待800ms
    }

    // 方案3：最大等待时间（5秒），超时强制显示选项
    const maxWaitTimeout = window.setTimeout(() => {
      console.log('最大等待时间到达，强制显示选项')
      if (!commandPlayed.value) {
        commandPlayed.value = true
        trialStartTime.value = Date.now()
        isPlaying.value = false
      }
    }, 5000)

    // 方案2：语音播放结束时显示选项（双保险）
    utterance.onend = () => {
      clearTimeout(maxWaitTimeout)
      console.log('语音播放结束(onend)')
      isPlaying.value = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      // 不管autoShowOptions如何，onend时都要确保选项显示
      if (!commandPlayed.value) {
        console.log('onend触发显示选项')
        commandPlayed.value = true
        trialStartTime.value = Date.now()
      }
    }

    utterance.onerror = (event) => {
      clearTimeout(maxWaitTimeout)
      console.warn('Speech synthesis error:', event)
      isPlaying.value = false
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = null
      }
      // 出错时立即显示选项（降级到文字）
      commandPlayed.value = true
      trialStartTime.value = Date.now()
      speechSynthesisSupported.value = false
    }

    window.speechSynthesis.speak(utterance)
  } else {
    // 降级方案：直接显示文字指令
    console.log('Speech synthesis not available, using text fallback')
    isPlaying.value = false
    commandPlayed.value = true
    trialStartTime.value = Date.now()
  }
}

/**
 * 处理指令点击
 */
function handleCommandClick(item: CommandOption) {
  if (showResult.value || item.isSelected) return

  // 计算真实反应时间（从选项显示到用户点击的时间差）
  const responseTime = trialStartTime.value > 0 ? Date.now() - trialStartTime.value : 0
  const isCorrect = item.isCorrect

  item.isSelected = true
  showResult.value = true

  trials.value.push({
    trialId: currentRound.value,
    mode: 'command',
    command: currentCommand.value,
    targetAttributes: {
      color: item.color,
      shape: item.shape
    },
    userSelection: item,
    isCorrect,
    responseTime,
    timestamp: Date.now()
  })

  if (isCorrect) {
    score.value += 10
    showFeedback('success', '✓ 正确！')
  } else {
    showFeedback('error', '✕ 再试试看')
  }

  setTimeout(() => {
    startNewRound()
  }, 2500) // 延长反馈时间，特殊儿童需要更多时间理解
}

/**
 * 开始节奏游戏 - 看-做模式（支持3种难度）
 */
function startRhythmGame() {
  if (isRhythmPlaying.value) return

  // 重置状态
  currentTapIndex.value = 0
  recordedBeats.value = []
  tapFeedback.value = []
  comboCount.value = 0

  // 根据难度生成节奏模式
  const config = difficultyConfig[difficulty.value]
  const patternLength = 3 + Math.floor(Math.random() * 2) // 3或4拍
  rhythmPattern.value = []

  for (let i = 0; i < patternLength; i++) {
    rhythmPattern.value.push(i * config.interval)
  }

  // 第一步：播放演示（看）
  playDemoSequence()
}

/**
 * 播放演示序列（看）
 */
function playDemoSequence() {
  isRhythmPlaying.value = true
  isPlaying.value = true
  currentBeatIndex.value = 0

  const config = difficultyConfig[difficulty.value]
  let beatIndex = 0

  const playBeat = () => {
    if (beatIndex >= rhythmPattern.value.length) {
      // 演示完成，进入用户操作阶段
      setTimeout(() => {
        currentBeatIndex.value = -1
        isRhythmPlaying.value = false
        isPlaying.value = false
        canRecord.value = true // 现在轮到用户
        currentTapIndex.value = 0
        recordedBeats.value = []
      }, 600)
      return
    }

    currentBeatIndex.value = beatIndex
    playTone(600, 200) // 播放声音

    beatIndex++
    if (beatIndex < rhythmPattern.value.length) {
      rhythmTimeout.value = window.setTimeout(playBeat, config.interval)
    } else {
      rhythmTimeout.value = window.setTimeout(playBeat, config.interval)
    }
  }

  playBeat()
}

// 点击效果状态
const tapEffects = ref([false, false, false])

function triggerTapEffect() {
  // 触发点击动画效果
  const index = tapEffects.value.findIndex(v => !v)
  if (index !== -1) {
    tapEffects.value[index] = true
    setTimeout(() => {
      tapEffects.value[index] = false
    }, 300)
  }
}

/**
 * 处理节奏拍打 - 评估版：检查时间间隔准确性
 */
function handleRhythmTap() {
  if (!canRecord.value) return

  triggerTapEffect()
  playTone(600, 150) // 用户点击时也播放声音，给反馈

  const now = Date.now()
  
  // 记录点击时间
  if (currentTapIndex.value === 0) {
    // 第一拍：记录开始时间
    recordedBeats.value = [now]
  } else {
    // 后续拍：直接push当前时间
    recordedBeats.value.push(now)
  }
  
  // 计算时间间隔准确度（从第二拍开始）
  let isAccurate = true
  let accuracy = 100
  
  if (currentTapIndex.value > 0) {
    const config = difficultyConfig[difficulty.value]
    const targetInterval = config.interval
    
    // 用户实际间隔（相对于上一拍）
    const firstBeat = recordedBeats.value[0]
    const previousBeat = recordedBeats.value[currentTapIndex.value - 1]
    const userInterval = currentTapIndex.value === 1
      ? (firstBeat !== undefined ? now - firstBeat : 0)
      : (previousBeat !== undefined ? now - previousBeat : 0)
    
    // 计算偏差比例
    const diffRatio = Math.abs(userInterval - targetInterval) / targetInterval
    
    // 根据难度判定：简单40%、中等30%、困难20%容错
    isAccurate = diffRatio < config.tolerance
    accuracy = Math.max(0, Math.round(100 - diffRatio * 100))
  }

  tapFeedback.value[currentTapIndex.value] = {
    index: currentTapIndex.value,
    isCorrect: isAccurate,
    show: true,
    accuracy: accuracy
  }

  // 显示反馈
  if (isAccurate) {
    showFeedback('success', `✨ ${accuracy}% 准确`)
    score.value += 10 + Math.floor(accuracy / 10)
  } else {
    const config = difficultyConfig[difficulty.value]
    const firstBeat = recordedBeats.value[0] ?? now
    const targetTime = firstBeat + (currentTapIndex.value * config.interval)
    const diffMs = Math.abs(now - targetTime)
    showFeedback('error', `时差 ${diffMs}ms`)
    score.value += 5 // 鼓励分
  }

  currentTapIndex.value++

  // 检查是否完成
  if (currentTapIndex.value >= rhythmPattern.value.length) {
    canRecord.value = false
    setTimeout(() => {
      evaluateRhythmRound()
    }, 800)
  }
}

/**
 * 评估节奏轮次 - 基于时间准确度
 */
function evaluateRhythmRound() {
  const pattern = rhythmPattern.value.slice()

  // 计算平均准确率（第一拍不算，从第二拍开始）
  let totalAccuracy = 0
  let validBeats = 0
  
  for (let i = 1; i < tapFeedback.value.length; i++) {
    if (tapFeedback.value[i]?.show) {
      totalAccuracy += tapFeedback.value[i]?.accuracy || 0
      validBeats++
    }
  }
  
  const avgAccuracy = validBeats > 0 ? Math.round(totalAccuracy / validBeats) : 100
  const isCorrect = avgAccuracy >= 70 // 70%以上算通过

  // 计算平均节奏误差（各拍与目标间隔的偏差平均值）
  let totalTimingError = 0
  let timingErrorCount = 0
  const config = difficultyConfig[difficulty.value]
  
  for (let i = 1; i < recordedBeats.value.length; i++) {
    const currentBeat = recordedBeats.value[i]
    const previousBeat = recordedBeats.value[i - 1]
    if (currentBeat === undefined || previousBeat === undefined) {
      continue
    }
    const userInterval = currentBeat - previousBeat
    const targetInterval = config.interval
    const error = Math.abs(userInterval - targetInterval)
    totalTimingError += error
    timingErrorCount++
  }
  
  const avgTimingErrorForTrial = timingErrorCount > 0 ? Math.round(totalTimingError / timingErrorCount) : 0

  trials.value.push({
    trialId: currentRound.value,
    mode: 'rhythm',
    rhythmPattern: pattern,
    userRhythm: recordedBeats.value.slice(),
    isCorrect,
    responseTime: 0,
    timestamp: Date.now(),
    rhythmStats: {
      timingErrorAvg: avgTimingErrorForTrial,
      accuracy: avgAccuracy
    }
  })

  showResult.value = true
  
  if (isCorrect) {
    score.value += 20 + Math.floor(avgAccuracy / 10)
    showFeedback('success', `🎉 准确率 ${avgAccuracy}%！太棒了！`)
  } else {
    score.value += 10
    showFeedback('error', `准确率 ${avgAccuracy}%，继续练习！`)
  }

  // 重置状态，开始下一轮
  setTimeout(() => {
    tapFeedback.value = []
    currentTapIndex.value = 0
    rhythmPattern.value = []
    canRecord.value = false
    startNewRound()
  }, 2000)
}

// 保留旧函数名兼容
const evaluateRhythm = evaluateRhythmRound
const playRhythm = startRhythmGame

/**
 * 播放音效
 * @param type 音效类型: 'success' | 'error'
 */
function playSound(type: 'success' | 'error') {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'success') {
      // 正确音效：愉快的上升音调
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime) // C5
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1) // E5
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2) // G5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } else if (type === 'error') {
      // 错误音效：低沉的下降音调
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.15)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    }
  } catch (error) {
    console.warn('音效播放失败:', error)
  }
}

/**
 * 显示反馈
 */
function showFeedback(type: 'success' | 'error', message: string) {
  feedback.value = { type, message }
  // 播放对应音效
  playSound(type)
  setTimeout(() => {
    feedback.value = null
  }, 2000) // 延长反馈显示时间，特殊儿童需要更多时间理解
}

/**
 * 开始第一轮（用户点击触发，解决浏览器自动播放策略限制）
 */
function startFirstRound() {
  // 初始化 AudioContext（必须在用户交互后调用）
  initAudioContext()

  currentRound.value = 1
  generateCommandOptions()

  // 启动计时器（在用户点击后才开始倒计时）
  if (!timerInterval.value) {
    timerInterval.value = window.setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        endGame()
      }
    }, 1000)
  }

  // 自动播放语音指令
  playCommand(true)
}

/**
 * 开始新的一轮
 */
function startNewRound() {
  if (currentRound.value >= props.rounds) {
    endGame()
    return
  }

  // 重置状态
  showResult.value = false
  feedback.value = null
  soundsPlayed.value = false
  choiceMade.value = false
  commandPlayed.value = false
  commandOptions.value = []
  isSame.value = false
  rhythmPattern.value = []
  recordedBeats.value = []
  canRecord.value = false
  trialStartTime.value = 0 // 重置开始时间

  currentRound.value++

  // 指令模式：自动生成选项并自动播放语音
  if (props.mode === 'command') {
    // 延迟一点时间让上一轮的清理完成
    setTimeout(() => {
      generateCommandOptions()
      // 自动播放语音指令
      playCommand(true)
    }, 100)
  }
}

/**
 * 结束游戏
 */
function endGame() {
  if (gameEnded.value) return
  gameEnded.value = true
  if (timerInterval.value) clearInterval(timerInterval.value)
  emit('finish', sessionData.value)
}

/**
 * 启动游戏
 */
function startGame() {
  // 指令模式：第一轮需要用户点击开始按钮（浏览器自动播放策略）
  // 倒计时在 startFirstRound 中启动
  if (props.mode === 'command') {
    // 不自动开始，等待用户点击开始按钮
    // 此时不启动计时器
  } else {
    // 其他模式自动开始
    startNewRound()

    // 启动计时器
    timerInterval.value = window.setInterval(() => {
      if (props.mode !== 'rhythm') {
        timeLeft.value--
        if (timeLeft.value <= 0) {
          endGame()
        }
      }
    }, 1000)
  }
}

// 生命周期
onMounted(() => {
  startGame()
})

onUnmounted(() => {
  if (timerInterval.value) clearInterval(timerInterval.value)
  if (rhythmTimeout.value) clearTimeout(rhythmTimeout.value)
  window.speechSynthesis.cancel()
})
</script>

<style scoped>
.game-audio-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

/* 游戏头部 */
.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.task-info h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #333;
}

.instruction {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.game-stats {
  display: flex;
  gap: 20px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat .label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.stat .value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat .value.warning {
  color: #e74c3c;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 按钮样式 */
.play-btn {
  display: block;
  margin: 0 auto 30px;
  padding: 16px 32px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.play-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.4);
}

.play-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 辨别模式 */
.choice-buttons {
  display: flex;
  justify-content: center;
  gap: 30px;
}

.btn-choice {
  padding: 20px 40px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-same {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
}

.btn-diff {
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
}

.btn-choice:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.btn-choice:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 指令模式 */
.command-grid {
  display: grid;
  gap: 15px;
  margin-top: 20px;
}

.command-grid.grid-2x2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 120px);
}

.command-grid.grid-3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 100px);
}

.command-grid.grid-4x4 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 80px);
  gap: 10px;
}

.grid-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.grid-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

/* 形状样式 - 使用固定像素尺寸保持1:1比例 */
.item-shape {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}

/* 2x2网格中形状稍大 */
.command-grid.grid-2x2 .item-shape {
  width: 80px;
  height: 80px;
}

/* 3x3网格中形状适中 */
.command-grid.grid-3x3 .item-shape {
  width: 70px;
  height: 70px;
}

/* 4x4网格中形状较小 */
.command-grid.grid-4x4 .item-shape {
  width: 60px;
  height: 60px;
}

/* 8种形状样式 - 使用clip-path */
.shape-circle {
  border-radius: 50%;
}

.shape-triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
}

.shape-hexagon {
  clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%);
}

.shape-star {
  clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
}

.shape-trapezoid {
  clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
}

.shape-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
}

.shape-rightTriangle {
  clip-path: polygon(0% 0%, 100% 0%, 0% 100%);
}

.grid-item.selected {
  transform: scale(0.95);
}

.grid-item.correct {
  border: 3px solid #2ecc71;
}

.grid-item.wrong {
  border: 3px solid #e74c3c;
}

/* 节奏模式 */
.rhythm-play {
  background: linear-gradient(135deg, #9B59B6 0%, #8e44ad 100%);
}

.rhythm-visualizer {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin: 30px 0;
}

.beat-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ddd;
  transition: all 0.2s ease;
}

.beat-dot.active {
  background: #9B59B6;
  transform: scale(1.3);
}

.rhythm-record {
  text-align: center;
}

.btn-rhythm {
  padding: 16px 40px;
  font-size: 18px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  margin-bottom: 20px;
  transition: all 0.3s ease;
}

.btn-rhythm:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
}

.btn-rhythm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.record-progress {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.recorded-beat {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #e74c3c;
  animation: pop 0.3s ease;
}

@keyframes pop {
  0% { transform: scale(0); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 结果界面 */
.game-result {
  text-align: center;
  padding: 40px;
}

.game-result h2 {
  font-size: 32px;
  color: #9B59B6;
  margin-bottom: 30px;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.result-item .label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.result-item .value {
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.btn-primary {
  padding: 12px 32px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* 反馈 */
.feedback {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 20px 40px;
  font-size: 24px;
  font-weight: 700;
  border-radius: 12px;
  animation: fadeInOut 1s ease;
  z-index: 1000;
}

.feedback.success {
  background: #2ecc71;
  color: white;
}

.feedback.error {
  background: #e74c3c;
  color: white;
}

@keyframes fadeInOut {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  15% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.1);
  }
  85% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
}

/* 语音合成降级方案 */
.command-text-fallback {
  margin: 20px auto;
  padding: 16px 24px;
  max-width: 400px;
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 12px;
  text-align: center;
}

.command-instruction {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.command-label {
  font-size: 16px;
  font-weight: 600;
  color: #856404;
}

.command-text {
  font-size: 18px;
  font-weight: 700;
  color: #333;
}

/* 开始按钮样式 */
.start-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 16px;
  margin: 40px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.btn-start {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 48px;
  font-size: 22px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.btn-start:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.btn-start:active {
  transform: scale(0.98);
}

.btn-start i {
  font-size: 28px;
}

.start-hint {
  margin-top: 20px;
  font-size: 16px;
  color: #666;
  text-align: center;
}

/* 语音控制按钮组 */
.voice-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.playing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #e8f4f8;
  border-radius: 20px;
  color: #2c7a7b;
  font-size: 14px;
  font-weight: 500;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* ========== 改进版节奏游戏样式 ========== */

/* 模式选择 */
.rhythm-mode-selector {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
}

.mode-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 30px;
  background: white;
  border: 3px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 140px;
}

.mode-btn:hover {
  border-color: #9B59B6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.2);
}

.mode-btn.active {
  border-color: #9B59B6;
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
}

.mode-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.mode-label {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.mode-desc {
  font-size: 12px;
  color: #666;
}

/* 连击显示 */
.combo-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 20px;
  animation: comboPop 0.3s ease;
}

@keyframes comboPop {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}

.combo-text {
  font-size: 18px;
  color: #666;
}

.combo-count {
  font-size: 36px;
  font-weight: 700;
  color: #e74c3c;
  text-shadow: 2px 2px 4px rgba(231, 76, 60, 0.3);
}

/* 节奏时间线 */
.rhythm-timeline {
  margin-bottom: 40px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
}

.timeline-track {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 30px;
}

.beat-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.beat-circle {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
  border: 3px solid transparent;
}

.beat-number {
  font-size: 20px;
  font-weight: 700;
  color: #999;
}

.beat-marker.played .beat-circle {
  background: #9B59B6;
}

.beat-marker.played .beat-number {
  color: white;
}

.beat-marker.playing .beat-circle {
  background: #9B59B6;
  transform: scale(1.2);
  box-shadow: 0 0 20px rgba(155, 89, 182, 0.6);
}

.beat-marker.playing .beat-number {
  color: white;
}

.beat-marker.expected .beat-circle {
  border-color: #2ecc71;
  animation: expectedPulse 0.8s infinite;
}

@keyframes expectedPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(46, 204, 113, 0); }
}

.beat-marker.tapped.correct .beat-circle {
  background: #2ecc71;
  border-color: #27ae60;
}

.beat-marker.tapped.wrong .beat-circle {
  background: #e74c3c;
  border-color: #c0392b;
}

.beat-marker.tapped .beat-number {
  color: white;
}

.beat-ripple {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 3px solid #9B59B6;
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.beat-line {
  position: absolute;
  top: 50%;
  left: 60px;
  width: 30px;
  height: 3px;
  background: #ddd;
  transform: translateY(-50%);
}

.beat-marker:last-child .beat-line {
  display: none;
}

/* 主交互区域 */
.rhythm-main-area {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 280px;
  margin-bottom: 30px;
}

.rhythm-start-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(102, 126, 234, 0.4);
}

.rhythm-start-btn:hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow: 0 12px 40px rgba(102, 126, 234, 0.5);
}

.btn-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.btn-text {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.btn-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

/* 鼓面 */
.drum-pad {
  position: relative;
  width: 220px;
  height: 220px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.drum-surface {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drum-center {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 30px rgba(231, 76, 60, 0.4),
    inset 0 -4px 20px rgba(0, 0, 0, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
  transition: all 0.1s ease;
}

.drum-pad.can-tap .drum-center {
  background: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
  box-shadow:
    0 8px 30px rgba(46, 204, 113, 0.4),
    inset 0 -4px 20px rgba(0, 0, 0, 0.2),
    inset 0 4px 20px rgba(255, 255, 255, 0.3);
  animation: drumReady 1s infinite;
}

@keyframes drumReady {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.drum-pad:active .drum-center {
  transform: scale(0.95);
  box-shadow:
    0 4px 15px rgba(231, 76, 60, 0.3),
    inset 0 -2px 10px rgba(0, 0, 0, 0.3);
}

.drum-icon {
  font-size: 48px;
  margin-bottom: 4px;
}

.drum-text {
  font-size: 16px;
  font-weight: 600;
  color: white;
}

.drum-ring {
  position: absolute;
  width: 220px;
  height: 220px;
  border: 4px solid rgba(231, 76, 60, 0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.drum-ring.ring-active {
  border-color: rgba(155, 89, 182, 0.6);
  animation: ringPulse 0.8s ease-out;
}

@keyframes ringPulse {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.3); opacity: 0; }
}

/* 点击效果 */
.tap-effects {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.tap-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  border: 3px solid rgba(255, 255, 255, 0.8);
  border-radius: 50%;
  opacity: 0;
}

.tap-ring.tap-animate {
  animation: tapRipple 0.4s ease-out;
}

@keyframes tapRipple {
  0% { transform: scale(0.8); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* 进度条 */
.rhythm-progress {
  margin-bottom: 20px;
  padding: 0 20px;
}

.progress-text {
  text-align: center;
  font-size: 18px;
  color: #666;
  margin-bottom: 12px;
}

.progress-bar {
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9B59B6 0%, #8e44ad 100%);
  border-radius: 6px;
  transition: width 0.3s ease;
}

/* 提示信息 */
.rhythm-hint {
  text-align: center;
  padding: 16px;
  background: #fff9e6;
  border-radius: 12px;
  margin: 0 20px;
}

.rhythm-hint p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.hint-icon {
  margin-right: 4px;
}

/* 响应式适配 */
@media (max-width: 600px) {
  .rhythm-mode-selector {
    flex-direction: column;
    align-items: center;
  }

  .timeline-track {
    gap: 15px;
  }

  .beat-circle {
    width: 45px;
    height: 45px;
  }

  .beat-number {
    font-size: 16px;
  }

  .drum-pad {
    width: 180px;
    height: 180px;
  }

  .drum-center {
    width: 140px;
    height: 140px;
  }

  .drum-icon {
    font-size: 36px;
  }
}

/* ========== 简化版新增样式 ========== */

/* 难度选择器 */
.difficulty-selector {
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
}

.selector-label {
  text-align: center;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.difficulty-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.diff-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border: 3px solid #e0e0e0;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
}

.diff-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.diff-btn.active {
  border-width: 3px;
}

.diff-btn.easy.active {
  border-color: #2ecc71;
  background: linear-gradient(135deg, #d5f5e3 0%, #abebc6 100%);
}

.diff-btn.medium.active {
  border-color: #f39c12;
  background: linear-gradient(135deg, #fdebd0 0%, #f9d79c 100%);
}

.diff-btn.hard.active {
  border-color: #e74c3c;
  background: linear-gradient(135deg, #fadbd8 0%, #f5b7b1 100%);
}

.diff-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.diff-label {
  font-size: 16px;
  font-weight: 700;
  color: #333;
  margin-bottom: 4px;
}

.diff-desc {
  font-size: 12px;
  color: #666;
}

/* 阶段指示器 */
.phase-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 16px;
}

.phase-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 24px;
  background: white;
  border-radius: 12px;
  border: 3px solid #e0e0e0;
  transition: all 0.3s ease;
}

.phase-step.active {
  border-color: #9B59B6;
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
  box-shadow: 0 4px 12px rgba(155, 89, 182, 0.3);
}

.phase-step.completed {
  border-color: #2ecc71;
  background: linear-gradient(135deg, #d5f5e3 0%, #abebc6 100%);
}

.phase-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.phase-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.phase-arrow {
  font-size: 24px;
  color: #999;
}

/* 状态显示 */
.rhythm-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 60px;
  background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
  border-radius: 20px;
  border: 3px solid #ff9800;
  animation: pulse 1.5s infinite;
}

.status-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.status-text {
  font-size: 24px;
  font-weight: 700;
  color: #e65100;
}

/* 节拍标记新状态 */
.beat-marker.demo .beat-circle {
  background: #9B59B6;
  transform: scale(1.3);
  box-shadow: 0 0 30px rgba(155, 89, 182, 0.6);
}

.beat-marker.demo .beat-number {
  color: white;
  font-weight: 700;
}

.beat-marker.user-turn .beat-circle {
  border-color: #2ecc71;
  animation: userTurnPulse 1s infinite;
}

.beat-accuracy {
  font-size: 14px;
  font-weight: 700;
  color: white;
}

@keyframes userTurnPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
  50% { box-shadow: 0 0 0 15px rgba(46, 204, 113, 0); }
}

/* 鼓面副标题 */
.drum-subtext {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin-top: 4px;
}

/* 实时准确率显示 */
.accuracy-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 32px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  border: 2px solid #e0e0e0;
}

.accuracy-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.accuracy-value {
  font-size: 36px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.accuracy-value.good {
  color: #2ecc71;
  text-shadow: 2px 2px 4px rgba(46, 204, 113, 0.3);
}

.accuracy-value.bad {
  color: #e74c3c;
  text-shadow: 2px 2px 4px rgba(231, 76, 60, 0.3);
}

.accuracy-hint {
  font-size: 18px;
  color: #999;
}

/* ========== 节奏模仿卡通重构 ========== */

.game-audio-container--rhythm {
  max-width: none;
  padding: 0;
}

.game-audio-container--rhythm .feedback {
  border-radius: 999px;
  box-shadow: 0 24px 42px rgba(91, 53, 121, 0.22);
}

.game-audio-container--rhythm .game-result {
  padding: 48px 28px;
  border-radius: 40px;
  background: linear-gradient(180deg, rgba(255, 249, 235, 0.95), rgba(255, 242, 213, 0.9));
  box-shadow: 0 26px 50px rgba(145, 102, 34, 0.16);
}

.game-audio-container--rhythm .game-result h2 {
  color: #5a2f86;
}

.game-mode-rhythm {
  color: #5b3579;
}

.rhythm-playground {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.rhythm-card-surface {
  position: relative;
  overflow: hidden;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  background: linear-gradient(180deg, rgba(255, 251, 240, 0.94), rgba(255, 245, 224, 0.88));
  box-shadow:
    0 16px 0 rgba(199, 151, 74, 0.12),
    0 28px 44px rgba(149, 104, 31, 0.12);
}

.rhythm-scene-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14px;
}

.rhythm-status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.rhythm-status-pill {
  min-width: 132px;
  padding: 12px 16px;
  border-radius: 999px;
  background: rgba(255, 252, 244, 0.66);
  border: 1px solid rgba(255, 255, 255, 0.76);
  box-shadow: 0 12px 24px rgba(140, 96, 37, 0.1);
  backdrop-filter: blur(10px);
}

.rhythm-status-pill span {
  display: block;
  margin-bottom: 4px;
  font-size: 0.74rem;
  color: rgba(91, 53, 121, 0.68);
}

.rhythm-status-pill strong {
  font-size: 1rem;
  color: #5f3a88;
}

.rhythm-scene-copy {
  margin: 0;
  font-size: 0.96rem;
  color: rgba(96, 61, 133, 0.86);
}

.rhythm-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 22px;
  align-items: stretch;
}

.difficulty-selector {
  margin: 0;
  padding: 24px;
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.96), rgba(255, 243, 215, 0.9));
}

.selector-label {
  margin-bottom: 18px;
  text-align: left;
  font-size: 1.08rem;
  font-weight: 800;
  color: #5a2f86;
}

.difficulty-buttons {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.diff-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: space-between;
  min-height: 270px;
  padding: 20px 18px 22px;
  border: 0;
  border-radius: 32px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  text-align: left;
  box-shadow:
    0 16px 0 rgba(132, 97, 48, 0.16),
    0 28px 40px rgba(132, 97, 48, 0.16);
}

.diff-btn:hover {
  transform: translateY(-5px) scale(1.015);
}

.diff-btn:active {
  transform: translateY(8px) scale(0.985);
}

.diff-btn.easy {
  background: linear-gradient(180deg, #e5f9d8 0%, #bee99e 100%);
  color: #27441f;
}

.diff-btn.medium {
  background: linear-gradient(180deg, #ffd89e 0%, #ffae52 100%);
  color: #6e3d05;
}

.diff-btn.hard {
  background: linear-gradient(180deg, #cf5c58 0%, #8f2828 100%);
  color: #fff6f3;
}

.diff-btn.active.easy {
  background: linear-gradient(180deg, #e5f9d8 0%, #bee99e 100%);
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.85),
    0 0 0 10px rgba(127, 206, 112, 0.32),
    0 16px 0 rgba(82, 145, 66, 0.24),
    0 28px 40px rgba(82, 145, 66, 0.24);
}

.diff-btn.active.medium {
  background: linear-gradient(180deg, #ffd89e 0%, #ffae52 100%);
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.88),
    0 0 0 10px rgba(255, 176, 62, 0.34),
    0 16px 0 rgba(202, 115, 19, 0.28),
    0 28px 40px rgba(202, 115, 19, 0.26);
}

.diff-btn.active.hard {
  background: linear-gradient(180deg, #cf5c58 0%, #8f2828 100%);
  box-shadow:
    0 0 0 4px rgba(255, 255, 255, 0.84),
    0 0 0 10px rgba(163, 42, 42, 0.28),
    0 16px 0 rgba(110, 22, 22, 0.32),
    0 28px 40px rgba(110, 22, 22, 0.3);
}

.diff-art {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  height: 132px;
  margin-bottom: 16px;
}

.plant-illustration {
  position: relative;
  width: min(100%, 160px);
  height: 124px;
}

.plant-ground {
  position: absolute;
  left: 50%;
  bottom: 2px;
  width: 108px;
  height: 18px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: rgba(95, 66, 21, 0.14);
}

.plant-stem,
.plant-trunk {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
}

.plant-stem {
  width: 12px;
  height: 52px;
  border-radius: 999px;
  background: linear-gradient(180deg, #7bc55c 0%, #41923b 100%);
}

.plant-leaf {
  position: absolute;
  bottom: 42px;
  width: 44px;
  height: 28px;
  border-radius: 28px 28px 8px 28px;
  background: linear-gradient(180deg, #9df07d 0%, #56af45 100%);
}

.plant-leaf--left {
  left: 28px;
  transform: rotate(-28deg);
}

.plant-leaf--right {
  right: 28px;
  transform: scaleX(-1) rotate(-28deg);
}

.plant-spark {
  position: absolute;
  right: 34px;
  top: 22px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 253, 221, 0.98) 0%, rgba(255, 233, 128, 0.88) 60%, transparent 61%);
}

.plant-bush {
  position: absolute;
  bottom: 18px;
  border-radius: 50%;
  background: linear-gradient(180deg, #8bd455 0%, #4b9d3a 100%);
}

.plant-bush--left {
  left: 18px;
  width: 64px;
  height: 58px;
}

.plant-bush--middle {
  left: 50%;
  bottom: 22px;
  width: 76px;
  height: 70px;
  transform: translateX(-50%);
}

.plant-bush--right {
  right: 18px;
  width: 64px;
  height: 58px;
}

.plant-berry {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #fff8c7 0%, #ffb642 65%, #ee7d1d 100%);
}

.plant-berry--one {
  left: 46px;
  top: 30px;
}

.plant-berry--two {
  right: 44px;
  top: 38px;
}

.plant-trunk {
  width: 18px;
  height: 62px;
  border-radius: 999px;
  background: linear-gradient(180deg, #88511d 0%, #5e3311 100%);
}

.plant-canopy {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(180deg, #4fa72f 0%, #2f6f2b 100%);
}

.plant-canopy--left {
  left: 18px;
  top: 24px;
  width: 68px;
  height: 58px;
}

.plant-canopy--center {
  left: 50%;
  top: 4px;
  width: 82px;
  height: 72px;
  transform: translateX(-50%);
}

.plant-canopy--right {
  right: 18px;
  top: 24px;
  width: 68px;
  height: 58px;
}

.plant-star {
  position: absolute;
  top: 12px;
  right: 26px;
  width: 18px;
  height: 18px;
  color: #ffe36a;
  font-size: 18px;
}

.plant-star::before {
  content: '✦';
}

.diff-copy {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.diff-label {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  opacity: 0.82;
}

.diff-title {
  font-size: 1.32rem;
  line-height: 1.12;
}

.diff-desc {
  font-size: 0.92rem;
  line-height: 1.5;
  opacity: 0.9;
}

.rhythm-card-surface--compact {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 222px;
}

.difficulty-preview {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.difficulty-preview__chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  border-radius: 28px;
  box-shadow: 0 14px 28px rgba(132, 97, 48, 0.12);
}

.difficulty-preview__chip span {
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  opacity: 0.8;
}

.difficulty-preview__chip strong {
  font-size: 1.12rem;
}

.difficulty-preview__chip.easy {
  background: linear-gradient(180deg, rgba(230, 248, 216, 0.92), rgba(191, 233, 157, 0.94));
}

.difficulty-preview__chip.medium {
  background: linear-gradient(180deg, rgba(255, 222, 167, 0.94), rgba(255, 177, 82, 0.96));
}

.difficulty-preview__chip.hard {
  background: linear-gradient(180deg, rgba(207, 92, 88, 0.96), rgba(143, 40, 40, 0.98));
  color: #fff7f4;
}

.difficulty-preview p {
  margin: 0;
  font-size: 0.92rem;
  color: rgba(91, 53, 121, 0.78);
}

.rhythm-sidekick-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.rhythm-assistant-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 20px 22px;
  min-height: 214px;
}

.rhythm-assistant-copy {
  max-width: 150px;
}

.assistant-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #9a5c1f;
  background: rgba(255, 241, 201, 0.86);
}

.rhythm-assistant-copy h3 {
  margin: 12px 0 10px;
  font-size: 1.24rem;
  line-height: 1.25;
  color: #5a2f86;
}

.rhythm-assistant-copy p,
.rhythm-trophy-rack p {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(91, 53, 121, 0.78);
}

.monster-sidekick {
  position: relative;
  width: 164px;
  height: 164px;
  flex-shrink: 0;
  animation: rhythmMonsterBounce 3s ease-in-out infinite;
}

.monster-shadow {
  position: absolute;
  left: 26px;
  right: 26px;
  bottom: 10px;
  height: 20px;
  border-radius: 999px;
  background: rgba(83, 56, 101, 0.12);
}

.monster-band {
  position: absolute;
  left: 24px;
  top: 18px;
  width: 116px;
  height: 56px;
  border-radius: 999px 999px 0 0;
  border: 10px solid #5a2f86;
  border-bottom: 0;
}

.monster-ear {
  position: absolute;
  top: 44px;
  width: 26px;
  height: 38px;
  border-radius: 20px;
  background: linear-gradient(180deg, #7248a5 0%, #5a2f86 100%);
}

.monster-ear--left {
  left: 16px;
}

.monster-ear--right {
  right: 16px;
}

.monster-horn {
  position: absolute;
  top: 34px;
  width: 20px;
  height: 28px;
  border-radius: 16px 16px 2px 16px;
  background: linear-gradient(180deg, #ffd873 0%, #f39d39 100%);
}

.monster-horn--left {
  left: 42px;
  transform: rotate(-18deg);
}

.monster-horn--right {
  right: 42px;
  transform: scaleX(-1) rotate(-18deg);
}

.monster-body {
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 26px;
  height: 104px;
  border-radius: 40px 40px 46px 46px;
  background: linear-gradient(180deg, #8fe9ff 0%, #63c5ff 52%, #3ba2ed 100%);
  box-shadow:
    inset 0 10px 16px rgba(255, 255, 255, 0.46),
    0 18px 26px rgba(59, 162, 237, 0.22);
}

.monster-eye {
  position: absolute;
  top: 90px;
  width: 22px;
  height: 28px;
  border-radius: 50%;
  background: #ffffff;
}

.monster-eye::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 10px;
  width: 8px;
  height: 10px;
  border-radius: 50%;
  background: #3b2358;
}

.monster-eye--left {
  left: 56px;
}

.monster-eye--right {
  right: 56px;
}

.monster-blush {
  position: absolute;
  top: 120px;
  width: 18px;
  height: 12px;
  border-radius: 50%;
  background: rgba(255, 132, 164, 0.46);
}

.monster-blush--left {
  left: 48px;
}

.monster-blush--right {
  right: 48px;
}

.monster-mouth {
  position: absolute;
  left: 50%;
  top: 124px;
  width: 28px;
  height: 16px;
  border-bottom: 5px solid #5a2f86;
  border-radius: 0 0 24px 24px;
  transform: translateX(-50%);
}

.monster-foot {
  position: absolute;
  bottom: 16px;
  width: 24px;
  height: 18px;
  border-radius: 18px 18px 12px 12px;
  background: #ff9c4b;
}

.monster-foot--left {
  left: 52px;
}

.monster-foot--right {
  right: 52px;
}

.rhythm-trophy-rack {
  padding: 18px 22px 20px;
}

.trophy-title {
  display: block;
  margin-bottom: 14px;
  font-size: 1rem;
  font-weight: 800;
  color: #5a2f86;
}

.trophy-slots {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.trophy-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 72px;
  border-radius: 24px;
  border: 2px dashed rgba(154, 92, 31, 0.24);
  background: rgba(255, 255, 255, 0.42);
  font-size: 2rem;
  color: rgba(245, 167, 59, 0.44);
}

.phase-indicator {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  margin-bottom: 0;
  padding: 22px 24px;
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.96), rgba(255, 243, 215, 0.9));
}

.phase-step {
  padding: 18px 20px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.86);
  box-shadow: 0 16px 28px rgba(132, 97, 48, 0.1);
}

.phase-icon-shell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  margin-bottom: 12px;
  border-radius: 28px;
  background: linear-gradient(180deg, #ffe2a6 0%, #ffc468 100%);
  box-shadow:
    inset 0 8px 12px rgba(255, 255, 255, 0.48),
    0 14px 22px rgba(202, 115, 19, 0.18);
}

.phase-step.active .phase-icon-shell {
  background: linear-gradient(180deg, #f9d5ff 0%, #d893ff 100%);
  box-shadow:
    0 0 0 6px rgba(215, 148, 255, 0.22),
    inset 0 8px 12px rgba(255, 255, 255, 0.42),
    0 16px 24px rgba(122, 71, 171, 0.2);
}

.phase-step.completed .phase-icon-shell {
  background: linear-gradient(180deg, #dff9ca 0%, #9fe274 100%);
}

.phase-icon {
  margin: 0;
  font-size: 2.2rem;
}

.phase-text {
  font-size: 1.12rem;
  font-weight: 800;
  color: #5a2f86;
}

.phase-caption {
  margin-top: 6px;
  font-size: 0.88rem;
  color: rgba(91, 53, 121, 0.72);
}

.phase-arrow {
  font-size: 2.3rem;
  color: rgba(154, 92, 31, 0.68);
}

.rhythm-timeline {
  margin-bottom: 0;
  padding: 22px 24px 24px;
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.96), rgba(255, 243, 215, 0.9));
}

.timeline-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.timeline-title-row span {
  font-size: 1rem;
  font-weight: 800;
  color: #5a2f86;
}

.timeline-title-row strong {
  font-size: 0.92rem;
  color: rgba(91, 53, 121, 0.72);
}

.timeline-track {
  gap: 22px;
}

.timeline-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-height: 108px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.42);
}

.timeline-placeholder__note {
  font-size: 2rem;
  color: rgba(122, 92, 170, 0.34);
}

.timeline-placeholder__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(255, 186, 96, 0.42);
  box-shadow: 0 0 0 12px rgba(255, 224, 175, 0.26);
}

.beat-circle {
  width: 72px;
  height: 72px;
  background: linear-gradient(180deg, #fffdf7 0%, #ffe7bc 100%);
  border: 3px solid rgba(255, 205, 126, 0.78);
  box-shadow:
    inset 0 8px 12px rgba(255, 255, 255, 0.58),
    0 12px 20px rgba(202, 115, 19, 0.12);
}

.beat-number {
  color: #a0661c;
}

.beat-line {
  left: 72px;
  width: 26px;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 205, 126, 0.58), rgba(255, 160, 89, 0.4));
}

.beat-marker.demo .beat-circle {
  background: linear-gradient(180deg, #f7d6ff 0%, #db9cff 100%);
  border-color: rgba(177, 106, 236, 0.96);
  box-shadow:
    0 0 0 10px rgba(215, 148, 255, 0.18),
    0 18px 28px rgba(122, 71, 171, 0.18);
}

.beat-marker.user-turn .beat-circle {
  border-color: #7ace70;
  box-shadow:
    0 0 0 10px rgba(122, 206, 112, 0.18),
    0 18px 28px rgba(82, 145, 66, 0.18);
}

.beat-marker.tapped.correct .beat-circle {
  background: linear-gradient(180deg, #dff9ca 0%, #9fe274 100%);
  border-color: #6dbe4e;
}

.beat-marker.tapped.wrong .beat-circle {
  background: linear-gradient(180deg, #ffd0cb 0%, #ff8f84 100%);
  border-color: #de5a50;
}

.beat-accuracy {
  color: #5a2f86;
}

.beat-ripple {
  border-color: rgba(177, 106, 236, 0.76);
}

.rhythm-main-area {
  min-height: 300px;
  margin-bottom: 0;
}

.rhythm-start-btn {
  position: relative;
  width: min(480px, 100%);
  min-height: 268px;
  padding: 36px 32px 32px;
  border-radius: 40px;
  background: linear-gradient(180deg, #ffb351 0%, #ff8d2d 56%, #e06d18 100%);
  box-shadow:
    0 18px 0 #c35910,
    0 34px 48px rgba(185, 93, 17, 0.28);
  overflow: hidden;
}

.rhythm-start-btn__glow {
  position: absolute;
  inset: 18px;
  border-radius: 32px;
  background: radial-gradient(circle, rgba(255, 248, 215, 0.74) 0%, rgba(255, 248, 215, 0) 72%);
  filter: blur(12px);
  animation: rhythmButtonBreath 2.2s ease-in-out infinite;
}

.rhythm-start-btn:hover {
  transform: translateY(-6px) scale(1.015);
  box-shadow:
    0 24px 0 #c35910,
    0 40px 52px rgba(185, 93, 17, 0.32);
}

.rhythm-start-btn:active {
  transform: translateY(8px) scale(0.985);
  box-shadow:
    0 10px 0 #c35910,
    0 22px 32px rgba(185, 93, 17, 0.26);
}

.rhythm-start-btn .btn-icon,
.rhythm-start-btn .btn-text,
.rhythm-start-btn .btn-hint {
  position: relative;
  z-index: 1;
}

.rhythm-start-btn .btn-icon {
  font-size: 5rem;
  margin-bottom: 10px;
}

.rhythm-start-btn .btn-text {
  font-size: 2rem;
  color: #fff8ef;
  text-shadow: 0 4px 12px rgba(111, 47, 4, 0.24);
}

.rhythm-start-btn .btn-hint {
  margin-top: 6px;
  font-size: 1rem;
  color: rgba(255, 247, 234, 0.92);
}

.rhythm-status {
  width: min(520px, 100%);
  min-height: 220px;
  padding: 30px 34px;
  background: linear-gradient(180deg, rgba(255, 239, 202, 0.98), rgba(255, 214, 143, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.84);
  animation: rhythmButtonBreath 1.8s ease-in-out infinite;
}

.status-icon {
  font-size: 4rem;
}

.status-text {
  color: #8f4b05;
}

.status-subtext {
  margin-top: 10px;
  font-size: 0.96rem;
  color: rgba(143, 75, 5, 0.78);
}

.drum-pad {
  width: 320px;
  height: 320px;
}

.drum-pad__glow {
  position: absolute;
  inset: 22px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 246, 212, 0.82) 0%, rgba(255, 246, 212, 0) 72%);
  filter: blur(10px);
  animation: rhythmButtonBreath 1.8s ease-in-out infinite;
}

.drum-surface {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffca6d 0%, #ef9636 72%, #cb6314 100%);
  box-shadow:
    inset 0 12px 18px rgba(255, 255, 255, 0.48),
    0 18px 0 #aa5314,
    0 34px 48px rgba(185, 93, 17, 0.28);
}

.drum-center {
  width: 72%;
  height: 72%;
  background: radial-gradient(circle at 34% 30%, #fff9e4 0%, #ffdf9d 58%, #f3a64a 100%);
  box-shadow:
    inset 0 12px 18px rgba(255, 255, 255, 0.58),
    inset 0 -16px 24px rgba(145, 75, 19, 0.18);
}

.drum-pad.can-tap .drum-center {
  background: radial-gradient(circle at 34% 30%, #fff9e4 0%, #ffdf9d 58%, #f3a64a 100%);
  box-shadow:
    inset 0 12px 18px rgba(255, 255, 255, 0.58),
    inset 0 -16px 24px rgba(145, 75, 19, 0.18);
  animation: none;
}

.drum-pad.can-tap .drum-surface {
  animation: rhythmDrumPulse 1.4s ease-in-out infinite;
}

.drum-pad:hover {
  transform: translateY(-4px) scale(1.02);
}

.drum-pad:active {
  transform: translateY(10px) scale(0.975);
}

.drum-pad:active .drum-surface {
  box-shadow:
    inset 0 12px 18px rgba(255, 255, 255, 0.48),
    0 10px 0 #aa5314,
    0 22px 32px rgba(185, 93, 17, 0.24);
}

.drum-icon {
  font-size: 3.6rem;
  margin-bottom: 10px;
}

.drum-text {
  font-size: 1.18rem;
  color: #8f4b05;
}

.drum-subtext {
  color: rgba(143, 75, 5, 0.84);
}

.tap-ring {
  border-color: rgba(255, 215, 153, 0.9);
}

.rhythm-bottom-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
}

.accuracy-display,
.rhythm-progress,
.rhythm-hint {
  margin: 0;
  padding: 20px 22px;
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.96), rgba(255, 243, 215, 0.9));
}

.accuracy-label {
  margin-bottom: 10px;
  font-size: 0.86rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: rgba(91, 53, 121, 0.68);
}

.accuracy-value {
  font-size: 2.4rem;
}

.accuracy-value.good {
  color: #5cae3b;
}

.accuracy-value.bad {
  color: #d74d43;
}

.accuracy-hint {
  font-size: 0.96rem;
  line-height: 1.55;
  color: rgba(91, 53, 121, 0.76);
}

.progress-text {
  margin-bottom: 14px;
  text-align: left;
  font-size: 0.96rem;
  color: rgba(91, 53, 121, 0.84);
}

.progress-bar {
  height: 16px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: inset 0 2px 6px rgba(132, 97, 48, 0.08);
}

.progress-fill {
  background: linear-gradient(90deg, #ffb056 0%, #ff7d49 52%, #bb6dff 100%);
}

.rhythm-hint p {
  font-size: 0.96rem;
  line-height: 1.7;
  color: rgba(91, 53, 121, 0.86);
}

@keyframes rhythmButtonBreath {
  0%, 100% { transform: scale(0.98); opacity: 0.72; }
  50% { transform: scale(1.04); opacity: 1; }
}

@keyframes rhythmDrumPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

@keyframes rhythmMonsterBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@media (max-width: 1180px) {
  .rhythm-hero-grid {
    grid-template-columns: 1fr;
  }

  .rhythm-sidekick-stack {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .difficulty-buttons,
  .rhythm-bottom-grid,
  .rhythm-sidekick-stack {
    grid-template-columns: 1fr;
  }

  .phase-indicator {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .phase-arrow {
    transform: rotate(90deg);
  }
}

@media (max-width: 720px) {
  .rhythm-card-surface,
  .difficulty-selector,
  .accuracy-display,
  .rhythm-progress,
  .rhythm-hint {
    border-radius: 28px;
  }

  .rhythm-assistant-card {
    flex-direction: column;
    text-align: center;
  }

  .rhythm-assistant-copy {
    max-width: none;
  }

  .monster-sidekick {
    width: 148px;
    height: 148px;
  }

  .drum-pad {
    width: 268px;
    height: 268px;
  }

  .rhythm-start-btn {
    min-height: 236px;
  }

  .rhythm-start-btn .btn-icon {
    font-size: 4.2rem;
  }

  .timeline-track {
    gap: 14px;
    flex-wrap: wrap;
  }

  .beat-circle {
    width: 60px;
    height: 60px;
  }

  .beat-line {
    width: 18px;
    left: 60px;
  }
}
</style>
