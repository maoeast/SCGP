<template>
  <div class="expression-duel" :data-phase="phase">
    <div class="expression-duel__backdrop" aria-hidden="true">
      <div class="expression-duel__glow expression-duel__glow--left"></div>
      <div class="expression-duel__glow expression-duel__glow--right"></div>
      <span
        v-for="bubble in floatingLights"
        :key="bubble.id"
        class="expression-duel__light"
        :style="{
          left: `${bubble.left}%`,
          top: `${bubble.top}%`,
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          animationDelay: `${bubble.delay}s`,
        }"
      />
    </div>

    <div v-if="!hasRequiredParticipants" class="expression-duel__invalid-card">
      <div class="expression-duel__invalid-icon">🎭</div>
      <h2>双人表情擂台需要 2 名学生共同参与</h2>
      <p>当前没有完整的双人参与信息，请返回游戏大厅重新选择一位搭档后再开始。</p>
      <small>这个游戏会把同一场训练同时写入两名学生的社交沟通训练记录。</small>
    </div>

    <div v-else-if="cameraError" class="expression-duel__invalid-card">
      <div class="expression-duel__invalid-icon">📷</div>
      <h2>摄像头准备失败</h2>
      <p>{{ cameraError }}</p>
      <small>请检查摄像头是否可用，然后返回游戏大厅重新进入。</small>
    </div>

    <template v-else>
      <header class="expression-duel__header">
        <div class="expression-duel__phase-card">
          <span class="expression-duel__phase-chip">表情擂台</span>
          <strong>{{ currentPhaseTitle }}</strong>
          <p>{{ stageMessage }}</p>
        </div>

        <div class="expression-duel__header-metrics">
          <div class="expression-duel__metric-pill">
            <span>当前回合</span>
            <strong>{{ currentRoundDisplay }}</strong>
          </div>
          <div class="expression-duel__metric-pill">
            <span>阶段倒计时</span>
            <strong>{{ phaseCountdownLabel }}</strong>
          </div>
        </div>
      </header>

      <div class="expression-duel__layout">
        <aside class="expression-duel__player-column">
          <article
            v-for="player in players"
            :key="player.side"
            class="expression-duel__player-card"
            :class="{
              'expression-duel__player-card--active': activeSide === player.side,
              'expression-duel__player-card--setter': currentRound?.setterSide === player.side,
              'expression-duel__player-card--mimic': currentRound?.mimicSide === player.side,
            }"
          >
            <div class="expression-duel__player-top">
              <div>
                <span class="expression-duel__player-role">{{ getPlayerRoleLabel(player.side) }}</span>
                <strong>{{ player.name }}</strong>
              </div>
              <span class="expression-duel__player-score">{{ displayScores[player.side] }} 分</span>
            </div>

            <div class="expression-duel__player-stats">
              <div class="expression-duel__stat-box">
                <span>本轮状态</span>
                <strong>{{ getPlayerStatusLabel(player.side) }}</strong>
              </div>
              <div class="expression-duel__stat-box">
                <span>当前相似度</span>
                <strong>{{ player.side === currentRound?.mimicSide ? `${currentSimilarityPercent}%` : '--' }}</strong>
              </div>
              <div class="expression-duel__stat-box">
                <span>最佳相似度</span>
                <strong>{{ player.side === currentRound?.mimicSide ? `${peakSimilarityPercent}%` : '--' }}</strong>
              </div>
            </div>

            <div class="expression-duel__bonus-row">
              <button
                class="expression-duel__bonus-button"
                type="button"
                :disabled="phase === 'booting'"
                @click="awardTeacherBonus(player.side)"
              >
                教师鼓励 +10
              </button>
              <small>累计鼓励 {{ teacherBonuses[player.side] }} 分</small>
            </div>
          </article>
        </aside>

        <section class="expression-duel__stage">
          <div class="expression-duel__stage-frame">
            <video ref="videoRef" class="expression-duel__video" autoplay muted playsinline />

            <div v-if="!cameraReady" class="expression-duel__camera-mask">
              正在连接摄像头...
            </div>
            <div v-else-if="faceCount < 2" class="expression-duel__camera-mask expression-duel__camera-mask--warning">
              请两位同学一起进入镜头
            </div>

            <div
              v-for="overlay in faceOverlays"
              :key="overlay.side"
              class="expression-duel__face-box"
              :class="{
                'expression-duel__face-box--setter': currentRound?.setterSide === overlay.side,
                'expression-duel__face-box--mimic': currentRound?.mimicSide === overlay.side,
              }"
              :style="{
                left: `${overlay.left}%`,
                top: `${overlay.top}%`,
                width: `${overlay.width}%`,
                height: `${overlay.height}%`,
              }"
            >
              <span>{{ overlay.label }}</span>
            </div>
          </div>

          <div class="expression-duel__stage-footer">
            <div class="expression-duel__helper-card">
              <span>当前提示</span>
              <strong>{{ helperMessage }}</strong>
            </div>
            <div class="expression-duel__helper-card">
              <span>镜头模式</span>
              <strong>共享镜头双人模式</strong>
            </div>
          </div>
        </section>

        <aside class="expression-duel__prompt-column">
          <article class="expression-duel__prompt-card">
            <div class="expression-duel__prompt-head">
              <span class="expression-duel__prompt-chip">目标表情</span>
              <strong>{{ currentTargetPrompt?.label || '准备中' }}</strong>
            </div>

            <div class="expression-duel__target-visual">
              <FaceSVG
                v-if="currentTargetPrompt"
                :expression="currentTargetPrompt.expression"
                :size="160"
              />
            </div>

            <p class="expression-duel__prompt-hint">
              {{ currentTargetPrompt?.hint || '摄像头准备好后，会出现本轮的目标表情。' }}
            </p>

            <div v-if="phase === 'capture'" class="expression-duel__progress-card">
              <span>出题表情稳定度</span>
              <div class="expression-duel__progress-bar">
                <div class="expression-duel__progress-fill" :style="{ width: `${captureProgressPercent}%` }"></div>
              </div>
              <strong>{{ captureExpressionPercent }}%</strong>
            </div>

            <div v-else-if="phase === 'mimic'" class="expression-duel__progress-card expression-duel__progress-card--mimic">
              <span>模仿匹配度</span>
              <div class="expression-duel__progress-bar">
                <div class="expression-duel__progress-fill expression-duel__progress-fill--mimic" :style="{ width: `${currentSimilarityPercent}%` }"></div>
              </div>
              <strong>{{ currentSimilarityPercent }}%</strong>
            </div>
          </article>

          <article class="expression-duel__capture-card">
            <div class="expression-duel__prompt-head">
              <span class="expression-duel__prompt-chip">定格参考</span>
              <strong>{{ currentRound ? `${currentRound.setterName} 的表情` : '等待出题' }}</strong>
            </div>

            <div class="expression-duel__snapshot-frame">
              <img
                v-if="capturedSnapshotUrl"
                :src="capturedSnapshotUrl"
                alt="captured-expression"
                class="expression-duel__snapshot-image"
              />
              <FaceSVG
                v-else-if="currentTargetPrompt"
                :expression="currentTargetPrompt.expression"
                :size="120"
              />
              <span v-else class="expression-duel__snapshot-placeholder">等待出题表情</span>
            </div>

            <p class="expression-duel__snapshot-hint">
              {{ captureSnapshotHint }}
            </p>
          </article>
        </aside>
      </div>

      <transition name="expression-duel-pop">
        <div v-if="phase === 'score'" class="expression-duel__result-overlay">
          <div class="expression-duel__result-card">
            <div class="expression-duel__result-emoji">🎉</div>
            <h2>{{ currentRoundResult?.label || '本轮完成' }}</h2>
            <div class="expression-duel__result-stars">
              <span
                v-for="star in 3"
                :key="star"
                class="expression-duel__result-star"
                :class="{ 'expression-duel__result-star--filled': star <= (currentRoundResult?.stars || 1) }"
              >
                ★
              </span>
            </div>
            <p>相似度 {{ peakSimilarityPercent }}% · 本轮得分 {{ currentRoundResult?.score || 0 }} 分</p>
          </div>
        </div>
      </transition>

      <transition name="expression-duel-pop">
        <div v-if="phase === 'finished'" class="expression-duel__result-overlay expression-duel__result-overlay--final">
          <div class="expression-duel__result-card expression-duel__result-card--final">
            <div class="expression-duel__result-emoji">🏆</div>
            <h2>{{ winnerLine }}</h2>
            <p class="expression-duel__final-copy">
              本次共完成 {{ roundSummaries.length }} 轮表情模仿，平均相似度 {{ averageSimilarityLabel }}。
            </p>
            <div class="expression-duel__final-scores">
              <div v-for="player in players" :key="`final-${player.side}`" class="expression-duel__final-score-box">
                <span>{{ player.name }}</span>
                <strong>{{ displayScores[player.side] }} 分</strong>
              </div>
            </div>
            <div class="expression-duel__final-actions">
              <button class="expression-duel__final-button expression-duel__final-button--ghost" type="button" @click="restartSession">
                再玩一局
              </button>
              <button class="expression-duel__final-button expression-duel__final-button--primary" type="button" @click="ensureCompletedPersistence">
                保存本局
              </button>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import type {
  CustomGameLaunchContext,
  EmotionGameAudioController,
  EmotionGameDifficulty,
  EmotionGameSettings,
  GroupGameCompletionPayload,
} from '@/types/emotional/games'
import type { EmotionType, FaceLandmarkPoint } from '@/types/emotional/face-emotion'
import FaceSVG from './expression-detective/FaceSVG.vue'
import {
  assignDuelFacesByHorizontalOrder,
  buildExpressionDuelPerformanceData,
  computeExpressionDuelSimilarity,
  getExpressionDuelDifficultyConfig,
  resolveExpressionDuelRoundScore,
  type ExpressionDuelRoundSummary,
  type ExpressionDuelSide,
} from './expression-duel'

type DuelPhase = 'booting' | 'ready' | 'capture' | 'frozen' | 'mimic' | 'score' | 'finished'

interface DuelPlayer {
  side: ExpressionDuelSide
  name: string
  studentId: number
}

interface EmotionPrompt {
  expression: EmotionType
  label: string
  hint: string
}

interface DuelRoundPlan {
  setterSide: ExpressionDuelSide
  mimicSide: ExpressionDuelSide
  setterName: string
  mimicName: string
  target: EmotionPrompt
}

interface DetectedFaceState {
  side: ExpressionDuelSide
  centerX: number
  centerY: number
  bounds: { x: number; y: number; width: number; height: number }
  landmarks: FaceLandmarkPoint[]
  blendshapes: Record<string, number>
  emotionScores: Record<EmotionType, number>
  dominantEmotion: EmotionType
}

interface FloatingLight {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings: EmotionGameSettings
  paused: boolean
  launchContext: CustomGameLaunchContext
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
  cameraStream?: MediaStream | null
}>()

const emit = defineEmits<{
  complete: [payload: GroupGameCompletionPayload]
}>()

const TARGET_PROMPTS: EmotionPrompt[] = [
  { expression: 'Happy', label: '开心', hint: '嘴角往上，露出轻轻的笑。' },
  { expression: 'Surprised', label: '惊讶', hint: '睁大眼睛，嘴巴张开一点。' },
  { expression: 'Neutral', label: '平静', hint: '让脸放松下来，像安静听老师说话。' },
  { expression: 'Sad', label: '难过', hint: '嘴角往下，小心地皱一皱眉。' },
  { expression: 'Angry', label: '生气', hint: '眉头靠近一点，嘴巴收紧。' },
  { expression: 'Fearful', label: '害怕', hint: '眼睛睁大，眉毛往上提。' },
]

const floatSeed: FloatingLight[] = [
  { id: 1, left: 8, top: 12, size: 12, delay: 0 },
  { id: 2, left: 18, top: 72, size: 8, delay: 0.8 },
  { id: 3, left: 33, top: 16, size: 10, delay: 1.3 },
  { id: 4, left: 54, top: 10, size: 7, delay: 0.4 },
  { id: 5, left: 74, top: 76, size: 11, delay: 1.7 },
  { id: 6, left: 88, top: 20, size: 9, delay: 1.1 },
]

const videoRef = ref<HTMLVideoElement | null>(null)
const phase = ref<DuelPhase>('booting')
const cameraReady = ref(false)
const cameraError = ref('')
const faceCount = ref(0)
const phaseRemainingMs = ref(0)
const stageMessage = ref('正在准备表情擂台...')
const helperMessage = ref('请两位同学一起看向镜头。')
const currentRoundIndex = ref(0)
const roundPlan = ref<DuelRoundPlan[]>([])
const roundSummaries = ref<ExpressionDuelRoundSummary[]>([])
const baseScores = ref<Record<ExpressionDuelSide, number>>({ left: 0, right: 0 })
const teacherBonuses = ref<Record<ExpressionDuelSide, number>>({ left: 0, right: 0 })
const captureExpressionPercent = ref(0)
const captureProgressPercent = ref(0)
const currentSimilarityPercent = ref(0)
const peakSimilarityPercent = ref(0)
const capturedSnapshotUrl = ref('')
const currentRoundResult = ref<{ score: number; stars: 1 | 2 | 3; label: string } | null>(null)
const detectedFaces = ref<Record<ExpressionDuelSide, DetectedFaceState | null>>({ left: null, right: null })

let landmarker: FaceLandmarker | null = null
let rafId: number | null = null
let lastFrameTimestamp = 0
let phaseElapsedMs = 0
let captureStableMs = 0
let mimicStableMs = 0
let bestCaptureScore = 0
let bestCaptureBlendshapes: Record<string, number> | null = null
let completionSent = false
let sessionMarkedDirty = false

const floatingLights = floatSeed

const players = computed<DuelPlayer[]>(() => {
  const ids = Array.isArray(props.launchContext.participantStudentIds)
    ? props.launchContext.participantStudentIds
    : []
  const names = Array.isArray(props.launchContext.participantStudentNames)
    ? props.launchContext.participantStudentNames
    : []

  return [
    {
      side: 'left',
      name: String(names[0] || props.launchContext.studentName || `学生 ${ids[0] || props.launchContext.studentId}`),
      studentId: Number(ids[0] || props.launchContext.studentId || 0),
    },
    {
      side: 'right',
      name: String(names[1] || `学生 ${ids[1] || 0}`),
      studentId: Number(ids[1] || 0),
    },
  ]
})

const hasRequiredParticipants = computed(() => players.value.every((player) => player.studentId > 0 && player.name.trim()))
const config = computed(() => getExpressionDuelDifficultyConfig(props.difficulty))
const currentRound = computed(() => roundPlan.value[currentRoundIndex.value] || null)
const currentTargetPrompt = computed(() => currentRound.value?.target || null)
const activeSide = computed<ExpressionDuelSide | null>(() => {
  if (!currentRound.value) return null
  if (phase.value === 'capture' || phase.value === 'frozen') return currentRound.value.setterSide
  if (phase.value === 'mimic' || phase.value === 'score') return currentRound.value.mimicSide
  return null
})
const displayScores = computed(() => ({
  left: baseScores.value.left + teacherBonuses.value.left,
  right: baseScores.value.right + teacherBonuses.value.right,
}))
const currentPhaseTitle = computed(() => {
  switch (phase.value) {
    case 'ready':
      return '准备开始'
    case 'capture':
      return `${currentRound.value?.setterName || '出题方'} 做表情`
    case 'frozen':
      return '定格参考'
    case 'mimic':
      return `${currentRound.value?.mimicName || '模仿方'} 来模仿`
    case 'score':
      return '本轮结算'
    case 'finished':
      return '本局完成'
    default:
      return '连接摄像头'
  }
})
const currentRoundDisplay = computed(() => `${Math.min(currentRoundIndex.value + 1, roundPlan.value.length)} / ${roundPlan.value.length || 1}`)
const phaseCountdownLabel = computed(() => `${Math.max(0, Math.ceil(phaseRemainingMs.value / 1000))} 秒`)
const averageSimilarityLabel = computed(() => {
  if (roundSummaries.value.length === 0) return '0%'
  const average = roundSummaries.value.reduce((sum, round) => sum + round.similarityRatio, 0) / roundSummaries.value.length
  return `${Math.round(average * 100)}%`
})
const winnerLine = computed(() => {
  const leftScore = displayScores.value.left
  const rightScore = displayScores.value.right
  if (leftScore === rightScore) {
    return `${players.value[0]?.name || '左侧'} 和 ${players.value[1]?.name || '右侧'} 打成平手`
  }

  const winner = leftScore > rightScore ? players.value[0] : players.value[1]
  return `${winner?.name || '本轮赢家'} 是今天的表情默契搭档`
})
const captureSnapshotHint = computed(() => {
  if (phase.value === 'capture') {
    return '出题方把目标表情稳稳保持一下，系统会自动定格。'
  }

  if (phase.value === 'mimic') {
    return '模仿方看着这张参考，尽量把表情做得更像。'
  }

  if (capturedSnapshotUrl.value) {
    return '这是刚刚定格下来的参考表情，只用于本局模仿提示，不会写入数据库。'
  }

  return '等出题方表情定格后，这里会显示本轮参考。'
})

const faceOverlays = computed(() => {
  return (['left', 'right'] as const)
    .map((side) => {
      const face = detectedFaces.value[side]
      if (!face) return null
      return {
        side,
        label: `${players.value.find((player) => player.side === side)?.name || side}${currentRound.value?.setterSide === side ? ' · 出题' : currentRound.value?.mimicSide === side ? ' · 模仿' : ''}`,
        left: Math.max(0, face.bounds.x * 100),
        top: Math.max(0, face.bounds.y * 100),
        width: Math.max(12, face.bounds.width * 100),
        height: Math.max(12, face.bounds.height * 100),
      }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
})

function resolveAssetUrl(assetPath: string) {
  const cleanPath = assetPath.replace(/^\/+/, '')
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return new URL(`${normalizedBase}${cleanPath}`, window.location.href).toString()
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function buildBlendshapeMap(categories: Array<{ categoryName?: string; displayName?: string; score?: number }> | undefined) {
  const result: Record<string, number> = {}
  for (const category of categories || []) {
    const key = String(category.categoryName || category.displayName || '').trim()
    if (!key) continue
    result[key] = Number(category.score || 0)
  }
  return result
}

function computeEmotionScores(blendshapes: Record<string, number>): Record<EmotionType, number> {
  const smile = ((blendshapes.mouthSmileLeft || 0) + (blendshapes.mouthSmileRight || 0)) / 2
  const surprised = (blendshapes.jawOpen || 0) * 0.6
    + (blendshapes.eyeWideLeft || 0) * 0.2
    + (blendshapes.eyeWideRight || 0) * 0.2
  const angry = ((blendshapes.browDownLeft || 0) + (blendshapes.browDownRight || 0)) / 2
  const sad = (((blendshapes.mouthFrownLeft || 0) + (blendshapes.mouthFrownRight || 0)) / 2) * 0.6
    + (blendshapes.browInnerUp || 0) * 0.4
  const fearful = Math.max(0,
    (((blendshapes.eyeWideLeft || 0) + (blendshapes.eyeWideRight || 0)) / 2) * 0.3
    + (blendshapes.browInnerUp || 0) * 0.4
    + (blendshapes.jawOpen || 0) * 0.3
    - smile * 0.5,
  )
  const neutral = smile < 0.2 && surprised < 0.2 && angry < 0.2 && sad < 0.2 && fearful < 0.2 ? 1 : 0

  return {
    Happy: clamp01(smile),
    Surprised: clamp01(surprised),
    Angry: clamp01(angry),
    Sad: clamp01(sad),
    Fearful: clamp01(fearful),
    Neutral: clamp01(neutral),
  }
}

function getDominantEmotion(scores: Record<EmotionType, number>): EmotionType {
  let dominant: EmotionType = 'Neutral'
  let best = -1
  for (const emotion of ['Happy', 'Surprised', 'Angry', 'Sad', 'Fearful', 'Neutral'] as const) {
    if (scores[emotion] > best) {
      best = scores[emotion]
      dominant = emotion
    }
  }
  return dominant
}

function computeBounds(landmarks: FaceLandmarkPoint[]) {
  const xs = landmarks.map((point) => point.x)
  const ys = landmarks.map((point) => point.y)
  const minX = Math.max(0, Math.min(...xs))
  const maxX = Math.min(1, Math.max(...xs))
  const minY = Math.max(0, Math.min(...ys))
  const maxY = Math.min(1, Math.max(...ys))

  return {
    x: minX,
    y: minY,
    width: Math.max(0.12, maxX - minX),
    height: Math.max(0.18, maxY - minY),
  }
}

function pickTargetPool(difficulty: EmotionGameDifficulty) {
  if (difficulty === 1) {
    return TARGET_PROMPTS.filter((prompt) => ['Happy', 'Surprised', 'Neutral'].includes(prompt.expression))
  }

  if (difficulty === 2) {
    return TARGET_PROMPTS.filter((prompt) => ['Happy', 'Surprised', 'Neutral', 'Sad', 'Angry'].includes(prompt.expression))
  }

  return [...TARGET_PROMPTS]
}

function shufflePrompts<T>(items: T[]) {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[copy[index], copy[randomIndex]] = [copy[randomIndex]!, copy[index]!]
  }
  return copy
}

function buildRoundPlanForDifficulty(difficulty: EmotionGameDifficulty) {
  const plan: DuelRoundPlan[] = []
  const prompts = shufflePrompts(pickTargetPool(difficulty))
  const totalRounds = getExpressionDuelDifficultyConfig(difficulty).roundsPerPlayer * 2

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const setterSide: ExpressionDuelSide = roundIndex % 2 === 0 ? 'left' : 'right'
    const mimicSide: ExpressionDuelSide = setterSide === 'left' ? 'right' : 'left'
    const target = prompts[roundIndex % prompts.length] || TARGET_PROMPTS[0]!
    const setter = players.value.find((player) => player.side === setterSide)
    const mimic = players.value.find((player) => player.side === mimicSide)

    plan.push({
      setterSide,
      mimicSide,
      setterName: setter?.name || setterSide,
      mimicName: mimic?.name || mimicSide,
      target,
    })
  }

  return plan
}

function getPlayerRoleLabel(side: ExpressionDuelSide) {
  if (!currentRound.value) return side === 'left' ? '左侧选手' : '右侧选手'
  if (currentRound.value.setterSide === side) return '本轮出题'
  if (currentRound.value.mimicSide === side) return '本轮模仿'
  return side === 'left' ? '左侧选手' : '右侧选手'
}

function getPlayerStatusLabel(side: ExpressionDuelSide) {
  const face = detectedFaces.value[side]
  if (!face) return '未进入镜头'
  if (phase.value === 'capture' && currentRound.value?.setterSide === side) {
    return `${currentTargetPrompt.value?.label || ''} ${captureExpressionPercent.value}%`
  }
  if (phase.value === 'mimic' && currentRound.value?.mimicSide === side) {
    return `${currentSimilarityPercent.value}%`
  }
  return face.dominantEmotion === 'Neutral' ? '准备就绪' : `检测到 ${currentTargetLabel(face.dominantEmotion)}`
}

function currentTargetLabel(expression: EmotionType) {
  return TARGET_PROMPTS.find((prompt) => prompt.expression === expression)?.label || expression
}

function currentFaceVisible(side: ExpressionDuelSide) {
  return Boolean(detectedFaces.value[side])
}

function speak(text: string) {
  if (!props.settings.effectsEnabled) return
  props.audio.speak(text)
}

function startAmbient() {
  if (!props.settings.effectsEnabled) return
  props.audio.ensureReady()
    .then(() => props.audio.startAmbient())
    .catch(() => {
      // ignore audio startup failures
    })
}

function stopAmbient() {
  props.audio.stopAmbient()
}

function markDirtyOnce() {
  if (sessionMarkedDirty) return
  sessionMarkedDirty = true
  props.markRoundDirty?.()
}

function applyPhase(nextPhase: DuelPhase, durationMs = 0) {
  phase.value = nextPhase
  phaseRemainingMs.value = durationMs
  phaseElapsedMs = 0

  if (nextPhase === 'ready') {
    captureStableMs = 0
    mimicStableMs = 0
    captureExpressionPercent.value = 0
    captureProgressPercent.value = 0
    currentSimilarityPercent.value = 0
    peakSimilarityPercent.value = 0
    currentRoundResult.value = null
    capturedSnapshotUrl.value = ''
    bestCaptureScore = 0
    bestCaptureBlendshapes = null
    const round = currentRound.value
    stageMessage.value = round
      ? `第 ${currentRoundIndex.value + 1} 轮准备开始：${round.setterName} 先做“${round.target.label}”表情。`
      : '正在准备下一轮...'
    helperMessage.value = '两位同学都看向镜头，等倒计时结束再开始。'
    startAmbient()
    speak(stageMessage.value)
    return
  }

  if (nextPhase === 'capture') {
    const round = currentRound.value
    markDirtyOnce()
    stageMessage.value = round
      ? `${round.setterName} 请做出“${round.target.label}”表情。`
      : '请先做出目标表情。'
    helperMessage.value = currentTargetPrompt.value?.hint || '把表情稳稳保持一下，系统会自动定格。'
    speak(stageMessage.value)
    return
  }

  if (nextPhase === 'frozen') {
    const round = currentRound.value
    stageMessage.value = round
      ? `${round.setterName} 的表情已定格，准备换 ${round.mimicName} 来模仿。`
      : '表情已定格。'
    helperMessage.value = '看清参考表情，下一步轮到模仿方。'
    speak(stageMessage.value)
    return
  }

  if (nextPhase === 'mimic') {
    const round = currentRound.value
    stageMessage.value = round
      ? `${round.mimicName} 请模仿“${round.target.label}”表情。`
      : '请开始模仿。'
    helperMessage.value = '看着右侧参考卡，把表情做得更像。'
    speak(stageMessage.value)
    return
  }

  if (nextPhase === 'score') {
    const round = currentRound.value
    stageMessage.value = round
      ? `${round.mimicName} 这一轮已经完成，来看得分。`
      : '本轮得分已生成。'
    helperMessage.value = currentRoundResult.value ? currentRoundResult.value.label : '本轮结束'
    return
  }

  if (nextPhase === 'finished') {
    stopAmbient()
    stageMessage.value = winnerLine.value
    helperMessage.value = `本局平均相似度 ${averageSimilarityLabel.value}，可以再来一局或直接保存。`
    speak(winnerLine.value)
  }
}

function captureSnapshot(face: DetectedFaceState | null) {
  if (!face || !videoRef.value) {
    return ''
  }

  const video = videoRef.value
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  if (!videoWidth || !videoHeight) {
    return ''
  }

  const sx = Math.max(0, Math.floor(face.bounds.x * videoWidth))
  const sy = Math.max(0, Math.floor(face.bounds.y * videoHeight))
  const sw = Math.max(24, Math.floor(face.bounds.width * videoWidth))
  const sh = Math.max(24, Math.floor(face.bounds.height * videoHeight))

  const canvas = document.createElement('canvas')
  canvas.width = sw
  canvas.height = sh
  const context = canvas.getContext('2d')
  if (!context) {
    return ''
  }

  context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
  return canvas.toDataURL('image/png')
}

function finalizeCapture(face: DetectedFaceState | null) {
  const round = currentRound.value
  if (!round) return

  const resolvedFace = face || detectedFaces.value[round.setterSide]
  capturedSnapshotUrl.value = captureSnapshot(resolvedFace)
  bestCaptureBlendshapes = resolvedFace?.blendshapes
    ? { ...resolvedFace.blendshapes }
    : bestCaptureBlendshapes

  applyPhase('frozen', config.value.frozenRevealMs)
}

function finalizeMimic(earlySuccess: boolean) {
  const round = currentRound.value
  if (!round) return

  const similarityPercent = Math.max(currentSimilarityPercent.value, peakSimilarityPercent.value)
  peakSimilarityPercent.value = similarityPercent
  const result = resolveExpressionDuelRoundScore(similarityPercent) as { score: number; stars: 1 | 2 | 3; label: string }
  currentRoundResult.value = result
  baseScores.value = {
    ...baseScores.value,
    [round.mimicSide]: baseScores.value[round.mimicSide] + result.score,
  }
  roundSummaries.value = [
    ...roundSummaries.value,
    {
      setterSide: round.setterSide,
      mimicSide: round.mimicSide,
      setterName: round.setterName,
      mimicName: round.mimicName,
      similarityRatio: Number((similarityPercent / 100).toFixed(2)),
      score: result.score,
      mimicDurationMs: Math.round(phaseElapsedMs),
      earlySuccess,
    },
  ]

  if (props.settings.effectsEnabled) {
    props.audio.playSuccessCue().catch(() => {
      // ignore
    })
  }

  applyPhase('score', config.value.scoringRevealMs)
}

function nextRoundOrFinish() {
  if (currentRoundIndex.value >= roundPlan.value.length - 1) {
    applyPhase('finished')
    ensureCompletedPersistence()
    return
  }

  currentRoundIndex.value += 1
  applyPhase('ready', config.value.readyCountdownSeconds * 1000)
}

function ensureCompletedPersistence() {
  if (completionSent || roundSummaries.value.length === 0) {
    return
  }

  completionSent = true
  const performanceData = buildExpressionDuelPerformanceData({
    rounds: roundSummaries.value,
    participantNames: players.value.map((player) => player.name),
    participantStudentIds: players.value.map((player) => player.studentId),
    totalRounds: roundPlan.value.length,
    scores: baseScores.value,
    teacherBonuses: teacherBonuses.value,
    cameraMode: 'shared',
    cameraDeviceLabel: props.cameraStream?.getVideoTracks?.()[0]?.label || '',
    detectedCameraCount: props.cameraStream ? 1 : 0,
  })

  const payload: GroupGameCompletionPayload = {
    participantStudentIds: players.value.map((player) => player.studentId),
    performanceData,
  }

  emit('complete', payload)
}

function awardTeacherBonus(side: ExpressionDuelSide) {
  teacherBonuses.value = {
    ...teacherBonuses.value,
    [side]: teacherBonuses.value[side] + 10,
  }
}

function restartSession() {
  completionSent = false
  sessionMarkedDirty = false
  roundSummaries.value = []
  baseScores.value = { left: 0, right: 0 }
  teacherBonuses.value = { left: 0, right: 0 }
  currentRoundIndex.value = 0
  roundPlan.value = buildRoundPlanForDifficulty(props.difficulty)
  applyPhase('ready', config.value.readyCountdownSeconds * 1000)
}

async function startCameraStream() {
  if (!props.cameraStream || !videoRef.value) {
    cameraError.value = '当前没有可用的摄像头流。'
    return false
  }

  videoRef.value.srcObject = props.cameraStream
  await videoRef.value.play().catch(() => {
    // ignored below
  })

  if (!videoRef.value.videoWidth || !videoRef.value.videoHeight) {
    await new Promise<void>((resolve) => {
      const cleanup = () => {
        videoRef.value?.removeEventListener('loadedmetadata', onReady)
        resolve()
      }

      const onReady = () => cleanup()
      videoRef.value?.addEventListener('loadedmetadata', onReady, { once: true })
      window.setTimeout(cleanup, 1000)
    })
  }

  cameraReady.value = true
  return true
}

async function createFaceLandmarker(delegate: 'GPU' | 'CPU') {
  const vision = await FilesetResolver.forVisionTasks(resolveAssetUrl('/models/wasm/'))
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: resolveAssetUrl('/models/face_landmarker.task'),
      delegate,
    },
    runningMode: 'VIDEO',
    numFaces: 2,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })
}

async function initializeLandmarker() {
  try {
    landmarker = await createFaceLandmarker('GPU')
  } catch {
    landmarker = await createFaceLandmarker('CPU')
  }
}

function detectFaces(now: number) {
  if (!landmarker || !videoRef.value || videoRef.value.readyState < 2) {
    detectedFaces.value = { left: null, right: null }
    faceCount.value = 0
    return
  }

  const result = landmarker.detectForVideo(videoRef.value, now) as {
    faceLandmarks?: FaceLandmarkPoint[][]
    faceBlendshapes?: Array<{ categories?: Array<{ categoryName?: string; displayName?: string; score?: number }> }>
  }

  const candidates = (result.faceLandmarks || []).map((landmarks, index) => {
    const bounds = computeBounds(landmarks)
    const blendshapes = buildBlendshapeMap(result.faceBlendshapes?.[index]?.categories)
    const emotionScores = computeEmotionScores(blendshapes)
    return {
      centerX: bounds.x + bounds.width / 2,
      centerY: bounds.y + bounds.height / 2,
      bounds,
      landmarks,
      blendshapes,
      emotionScores,
      dominantEmotion: getDominantEmotion(emotionScores),
      label: index === 0 ? 'face-1' : 'face-2',
    }
  })

  faceCount.value = candidates.length
  const assigned = assignDuelFacesByHorizontalOrder(candidates)

  detectedFaces.value = {
    left: assigned.left ? { ...assigned.left, side: 'left' } : null,
    right: assigned.right ? { ...assigned.right, side: 'right' } : null,
  }
}

function updatePhase(deltaMs: number) {
  if (props.paused || phase.value === 'booting' || phase.value === 'finished') {
    return
  }

  const round = currentRound.value
  const setterFace = round ? detectedFaces.value[round.setterSide] : null
  const mimicFace = round ? detectedFaces.value[round.mimicSide] : null

  switch (phase.value) {
    case 'ready': {
      if (!currentFaceVisible('left') || !currentFaceVisible('right')) {
        return
      }
      phaseElapsedMs += deltaMs
      phaseRemainingMs.value = Math.max(0, phaseRemainingMs.value - deltaMs)
      if (phaseRemainingMs.value <= 0) {
        applyPhase('capture', config.value.captureCountdownSeconds * 1000)
      }
      break
    }
    case 'capture': {
      const captureScore = setterFace && currentTargetPrompt.value
        ? setterFace.emotionScores[currentTargetPrompt.value.expression] || 0
        : 0
      captureExpressionPercent.value = Math.round(captureScore * 100)
      bestCaptureScore = Math.max(bestCaptureScore, captureScore)
      if (setterFace && captureScore >= bestCaptureScore) {
        bestCaptureBlendshapes = { ...setterFace.blendshapes }
      }

      if (captureScore >= 0.62) {
        captureStableMs += deltaMs
      } else {
        captureStableMs = 0
      }

      captureProgressPercent.value = Math.min(100, Math.round((captureStableMs / 420) * 100))
      phaseElapsedMs += deltaMs
      phaseRemainingMs.value = Math.max(0, phaseRemainingMs.value - deltaMs)

      if (captureStableMs >= 420 || phaseRemainingMs.value <= 0) {
        finalizeCapture(setterFace)
      }
      break
    }
    case 'frozen': {
      phaseElapsedMs += deltaMs
      phaseRemainingMs.value = Math.max(0, phaseRemainingMs.value - deltaMs)
      if (phaseRemainingMs.value <= 0) {
        applyPhase('mimic', config.value.mimicCountdownSeconds * 1000)
      }
      break
    }
    case 'mimic': {
      const similarity = mimicFace && bestCaptureBlendshapes
        ? computeExpressionDuelSimilarity(bestCaptureBlendshapes, mimicFace.blendshapes)
        : 0
      currentSimilarityPercent.value = similarity
      peakSimilarityPercent.value = Math.max(peakSimilarityPercent.value, similarity)

      if (similarity / 100 >= config.value.earlySuccessThreshold) {
        mimicStableMs += deltaMs
      } else {
        mimicStableMs = 0
      }

      phaseElapsedMs += deltaMs
      phaseRemainingMs.value = Math.max(0, phaseRemainingMs.value - deltaMs)

      if (mimicStableMs >= config.value.earlySuccessHoldMs) {
        finalizeMimic(true)
        return
      }

      if (phaseRemainingMs.value <= 0) {
        finalizeMimic(false)
      }
      break
    }
    case 'score': {
      phaseElapsedMs += deltaMs
      phaseRemainingMs.value = Math.max(0, phaseRemainingMs.value - deltaMs)
      if (phaseRemainingMs.value <= 0) {
        nextRoundOrFinish()
      }
      break
    }
  }
}

function gameLoop(timestamp: number) {
  const deltaMs = lastFrameTimestamp > 0 ? timestamp - lastFrameTimestamp : 16
  lastFrameTimestamp = timestamp

  detectFaces(timestamp)
  updatePhase(deltaMs)
  rafId = window.requestAnimationFrame(gameLoop)
}

async function bootstrapGame() {
  cameraError.value = ''
  if (!hasRequiredParticipants.value) {
    return
  }

  const cameraOk = await startCameraStream()
  if (!cameraOk) {
    cameraError.value = '摄像头未能正常启动，请返回上一页后重新进入。'
    return
  }

  try {
    await initializeLandmarker()
  } catch (error) {
    cameraError.value = error instanceof Error ? error.message : '表情识别模型加载失败。'
    return
  }

  roundPlan.value = buildRoundPlanForDifficulty(props.difficulty)
  currentRoundIndex.value = 0
  applyPhase('ready', config.value.readyCountdownSeconds * 1000)
  lastFrameTimestamp = 0
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
  }
  rafId = window.requestAnimationFrame(gameLoop)
}

watch(
  () => props.difficulty,
  () => {
    if (!cameraError.value && phase.value !== 'booting') {
      restartSession()
    }
  },
)

watch(
  () => props.paused,
  (paused) => {
    if (paused) {
      stopAmbient()
    } else if (phase.value !== 'finished' && phase.value !== 'booting') {
      startAmbient()
    }
  },
)

watch(
  () => props.cameraStream,
  (stream) => {
    if (!stream) {
      cameraReady.value = false
    }
  },
)

onMounted(() => {
  void bootstrapGame()
})

onBeforeUnmount(() => {
  stopAmbient()
  if (rafId !== null) {
    window.cancelAnimationFrame(rafId)
  }
  if (landmarker) {
    landmarker.close()
    landmarker = null
  }
})
</script>

<style scoped>
.expression-duel {
  --duel-blue: #67c6ff;
  --duel-green: #84dbb0;
  --duel-gold: #ffd774;
  --duel-ink: #234261;
  --duel-soft: rgba(255, 255, 255, 0.92);
  position: relative;
  min-height: calc(100vh - 144px);
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at top, rgba(255, 255, 255, 0.44), transparent 34%),
    linear-gradient(135deg, #dff5ff 0%, #eefcff 42%, #fff6dd 100%);
  font-family: 'Trebuchet MS', 'Microsoft YaHei', sans-serif;
}

.expression-duel__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.expression-duel__glow {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 999px;
  filter: blur(16px);
  opacity: 0.42;
}

.expression-duel__glow--left {
  left: -60px;
  top: 24px;
  background: radial-gradient(circle, rgba(103, 198, 255, 0.85), transparent 70%);
}

.expression-duel__glow--right {
  right: -40px;
  bottom: 40px;
  background: radial-gradient(circle, rgba(132, 219, 176, 0.82), transparent 72%);
}

.expression-duel__light {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
  animation: duel-float 7.4s ease-in-out infinite;
}

.expression-duel__invalid-card,
.expression-duel__phase-card,
.expression-duel__metric-pill,
.expression-duel__player-card,
.expression-duel__helper-card,
.expression-duel__prompt-card,
.expression-duel__capture-card,
.expression-duel__result-card {
  background: var(--duel-soft);
  border: 1px solid rgba(255, 255, 255, 0.68);
  box-shadow: 0 20px 40px rgba(45, 91, 122, 0.12);
  backdrop-filter: blur(10px);
}

.expression-duel__invalid-card {
  position: relative;
  z-index: 1;
  max-width: 680px;
  margin: 64px auto 0;
  padding: 34px;
  border-radius: 28px;
  text-align: center;
}

.expression-duel__invalid-icon {
  margin-bottom: 14px;
  font-size: 52px;
}

.expression-duel__invalid-card h2 {
  margin: 0 0 12px;
  color: #34506d;
}

.expression-duel__invalid-card p,
.expression-duel__invalid-card small {
  display: block;
  color: #66798f;
  line-height: 1.7;
}

.expression-duel__header,
.expression-duel__layout {
  position: relative;
  z-index: 1;
}

.expression-duel__header {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.expression-duel__phase-card {
  flex: 1;
  padding: 18px 20px;
  border-radius: 24px;
}

.expression-duel__phase-chip,
.expression-duel__prompt-chip,
.expression-duel__player-role {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(103, 198, 255, 0.14);
  color: #2b78a4;
  font-size: 12px;
  font-weight: 700;
}

.expression-duel__phase-card strong {
  display: block;
  margin-top: 10px;
  color: var(--duel-ink);
  font-size: 26px;
}

.expression-duel__phase-card p {
  margin: 10px 0 0;
  color: #5f768f;
  line-height: 1.7;
}

.expression-duel__header-metrics {
  display: flex;
  gap: 12px;
}

.expression-duel__metric-pill {
  min-width: 150px;
  padding: 18px 16px;
  border-radius: 20px;
}

.expression-duel__metric-pill span {
  display: block;
  margin-bottom: 8px;
  color: #70849a;
  font-size: 12px;
}

.expression-duel__metric-pill strong {
  color: var(--duel-ink);
  font-size: 22px;
}

.expression-duel__layout {
  display: grid;
  grid-template-columns: minmax(230px, 0.7fr) minmax(0, 1.55fr) minmax(260px, 0.8fr);
  gap: 18px;
}

.expression-duel__player-column,
.expression-duel__prompt-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.expression-duel__player-card,
.expression-duel__prompt-card,
.expression-duel__capture-card {
  padding: 18px;
  border-radius: 24px;
}

.expression-duel__player-card--active {
  box-shadow: 0 0 0 2px rgba(103, 198, 255, 0.22), 0 20px 40px rgba(45, 91, 122, 0.12);
}

.expression-duel__player-card--setter {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(245, 250, 255, 0.94) 100%);
}

.expression-duel__player-card--mimic {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(246, 255, 250, 0.94) 100%);
}

.expression-duel__player-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.expression-duel__player-top strong {
  display: block;
  margin-top: 10px;
  color: var(--duel-ink);
  font-size: 22px;
}

.expression-duel__player-score {
  color: #3b668a;
  font-size: 22px;
  font-weight: 800;
}

.expression-duel__player-stats {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.expression-duel__stat-box {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(247, 251, 255, 0.88);
  border: 1px solid rgba(103, 198, 255, 0.12);
}

.expression-duel__stat-box span {
  display: block;
  margin-bottom: 6px;
  color: #71839a;
  font-size: 12px;
}

.expression-duel__stat-box strong {
  color: #34506d;
  font-size: 18px;
}

.expression-duel__bonus-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.expression-duel__bonus-button,
.expression-duel__final-button {
  min-height: 48px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.expression-duel__bonus-button {
  color: #2c6b4b;
  background: linear-gradient(135deg, rgba(132, 219, 176, 0.26) 0%, rgba(255, 255, 255, 0.96) 100%);
}

.expression-duel__bonus-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.expression-duel__bonus-row small {
  color: #71849a;
}

.expression-duel__stage {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.expression-duel__stage-frame {
  position: relative;
  min-height: 560px;
  border-radius: 32px;
  overflow: hidden;
  background: rgba(20, 44, 68, 0.22);
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.24), 0 22px 46px rgba(39, 77, 110, 0.16);
}

.expression-duel__video {
  width: 100%;
  height: 100%;
  min-height: 560px;
  object-fit: cover;
  transform: scaleX(-1);
}

.expression-duel__camera-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(17, 34, 50, 0.28);
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
}

.expression-duel__camera-mask--warning {
  background: rgba(36, 57, 81, 0.42);
}

.expression-duel__face-box {
  position: absolute;
  border: 3px dashed rgba(255, 255, 255, 0.94);
  border-radius: 22px;
  box-shadow: 0 0 0 2px rgba(103, 198, 255, 0.18);
}

.expression-duel__face-box span {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(20, 44, 68, 0.72);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.expression-duel__face-box--setter {
  border-color: rgba(255, 214, 116, 0.96);
}

.expression-duel__face-box--mimic {
  border-color: rgba(132, 219, 176, 0.96);
}

.expression-duel__stage-footer {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.expression-duel__helper-card {
  padding: 16px 18px;
  border-radius: 20px;
}

.expression-duel__helper-card span {
  display: block;
  margin-bottom: 8px;
  color: #70849a;
  font-size: 12px;
}

.expression-duel__helper-card strong {
  color: var(--duel-ink);
  line-height: 1.6;
}

.expression-duel__prompt-head strong {
  display: block;
  margin-top: 10px;
  color: var(--duel-ink);
  font-size: 24px;
}

.expression-duel__target-visual,
.expression-duel__snapshot-frame {
  display: grid;
  place-items: center;
  min-height: 196px;
  margin-top: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(250, 253, 255, 0.96) 0%, rgba(244, 251, 255, 0.92) 100%);
  border: 1px solid rgba(103, 198, 255, 0.12);
}

.expression-duel__prompt-hint,
.expression-duel__snapshot-hint {
  margin: 14px 0 0;
  color: #5f768f;
  line-height: 1.7;
}

.expression-duel__snapshot-image {
  max-width: 100%;
  max-height: 180px;
  border-radius: 18px;
  object-fit: cover;
}

.expression-duel__snapshot-placeholder {
  color: #7f8fa1;
  font-size: 16px;
}

.expression-duel__progress-card {
  margin-top: 16px;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255, 249, 227, 0.92);
}

.expression-duel__progress-card--mimic {
  background: rgba(237, 251, 243, 0.94);
}

.expression-duel__progress-card span {
  display: block;
  margin-bottom: 10px;
  color: #7f7a5f;
  font-size: 12px;
}

.expression-duel__progress-card strong {
  color: #34506d;
  font-size: 20px;
}

.expression-duel__progress-bar {
  height: 12px;
  margin-bottom: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.84);
}

.expression-duel__progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #ffd774 0%, #ffac6c 100%);
}

.expression-duel__progress-fill--mimic {
  background: linear-gradient(135deg, #84dbb0 0%, #67c6ff 100%);
}

.expression-duel__result-overlay {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  background: rgba(19, 36, 54, 0.2);
  backdrop-filter: blur(4px);
}

.expression-duel__result-card {
  width: min(420px, calc(100% - 32px));
  padding: 30px 26px;
  border-radius: 30px;
  text-align: center;
}

.expression-duel__result-card--final {
  width: min(540px, calc(100% - 32px));
}

.expression-duel__result-emoji {
  font-size: 56px;
  margin-bottom: 14px;
}

.expression-duel__result-card h2 {
  margin: 0;
  color: var(--duel-ink);
  font-size: 30px;
}

.expression-duel__result-card p {
  margin: 14px 0 0;
  color: #617992;
  line-height: 1.7;
}

.expression-duel__result-stars {
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 18px;
}

.expression-duel__result-star {
  color: #d5dde7;
  font-size: 34px;
}

.expression-duel__result-star--filled {
  color: #ffcf57;
}

.expression-duel__final-copy {
  font-size: 16px;
}

.expression-duel__final-scores {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
}

.expression-duel__final-score-box {
  padding: 16px;
  border-radius: 20px;
  background: rgba(247, 251, 255, 0.9);
}

.expression-duel__final-score-box span {
  display: block;
  margin-bottom: 8px;
  color: #70849a;
  font-size: 13px;
}

.expression-duel__final-score-box strong {
  color: var(--duel-ink);
  font-size: 24px;
}

.expression-duel__final-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-top: 22px;
}

.expression-duel__final-button--ghost {
  min-width: 146px;
  color: #557089;
  background: rgba(244, 249, 255, 0.96);
}

.expression-duel__final-button--primary {
  min-width: 146px;
  color: #ffffff;
  background: linear-gradient(135deg, #67c6ff 0%, #84dbb0 100%);
  box-shadow: 0 14px 28px rgba(66, 143, 187, 0.22);
}

.expression-duel__bonus-button:hover:not(:disabled),
.expression-duel__final-button:hover {
  transform: translateY(-1px);
}

.expression-duel-pop-enter-active,
.expression-duel-pop-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.expression-duel-pop-enter-from,
.expression-duel-pop-leave-to {
  opacity: 0;
  transform: scale(0.96);
}

@keyframes duel-float {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.28;
  }
  50% {
    transform: translateY(-12px);
    opacity: 0.62;
  }
}

@media (max-width: 1200px) {
  .expression-duel__layout {
    grid-template-columns: 1fr;
  }

  .expression-duel__stage-frame {
    min-height: 420px;
  }

  .expression-duel__video {
    min-height: 420px;
  }
}

@media (max-width: 768px) {
  .expression-duel {
    padding: 16px;
  }

  .expression-duel__header,
  .expression-duel__header-metrics,
  .expression-duel__stage-footer,
  .expression-duel__final-scores,
  .expression-duel__final-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .expression-duel__header {
    align-items: stretch;
  }

  .expression-duel__stage-frame {
    min-height: 320px;
  }

  .expression-duel__video {
    min-height: 320px;
  }
}
</style>
