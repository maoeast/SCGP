<template>
  <div
    class="game-grid-container"
    :class="{
      'game-grid-container--color': isColorMode,
      'game-grid-container--shape': isWoodMode,
      'game-grid-container--icon': isIconMode,
    }"
  >
    <template v-if="!gameEnded">
      <section v-if="isColorMode" class="color-match-stage">
        <header class="color-top-panel">
          <div class="color-top-panel__row">
            <div class="color-top-panel__aside color-top-panel__aside--left">
              <div class="color-chip">
                <span>学生</span>
                <strong>{{ displayStudentName }}</strong>
              </div>
            </div>

            <div class="color-target-inline">
              <span class="color-target-inline__label">请找出相同的颜色：</span>
              <div
                v-if="currentTarget"
                ref="colorTargetRef"
                class="color-target-jelly"
                :style="currentTargetColorStyle"
              ></div>
            </div>

            <div class="color-top-panel__aside color-top-panel__aside--right">
              <div class="color-chip" :class="{ 'color-chip--warning': timeLeft <= 10 }">
                <span>倒计时</span>
                <strong>{{ timeLeft }}s</strong>
              </div>

              <div class="color-chip">
                <span>得分</span>
                <strong>{{ score }} 分</strong>
              </div>

              <div class="color-chip">
                <span>轮次</span>
                <strong>{{ currentRound }} / {{ totalRounds }}</strong>
              </div>
            </div>
          </div>

          <div class="color-progress-strip">
            <span class="color-progress-strip__label">训练进度</span>
            <div class="color-progress-track">
              <div class="color-progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
            <span class="color-progress-strip__value">{{ currentRound }} / {{ totalRounds }}</span>
          </div>
        </header>

        <div class="color-play-area">
          <div class="color-game-grid" :style="colorGridStyle">
            <button
              v-for="item in gridItems"
              :key="item.id"
              type="button"
              class="color-candy-button"
              :class="{
                'color-candy-button--hit': item.isTarget && item.isSelected && showResult,
                'color-candy-button--reveal': item.isTarget && !item.isSelected && showResult,
                'color-candy-button--miss': !item.isTarget && item.isSelected && showResult
              }"
              :style="[colorCandyButtonStyle, itemMotionStyles[item.id]]"
              @click="handleItemClick(item, $event)"
            >
              <div class="color-candy" :style="[colorCandyInnerStyle, getColorJellyStyle(item.color)]"></div>
            </button>
          </div>
        </div>
      </section>

      <section v-else-if="isIconMode" class="shape-match-stage object-match-stage" :style="iconStageStyle">
        <aside class="sidebar object-sidebar">
          <div class="wood-pill wood-pill--student object-sidebar__student">
            <span>学生</span>
            <strong>{{ displayStudentName }}</strong>
          </div>

          <div class="object-progress-card sidebar__plaque-section">
            <div class="object-progress-card__header">
              <span class="object-progress-card__label">训练进度</span>
              <strong class="object-progress-card__value">{{ currentRound }} / {{ totalRounds }}</strong>
            </div>
            <div class="shape-progress-track object-progress-card__track">
              <div class="shape-progress-fill object-progress-card__fill" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
          </div>

          <div class="object-sidebar__focus">
            <span class="object-sidebar__eyebrow">桌面玩具配对</span>
            <h2>请找到同样的物品</h2>
            <p>先看中央目标积木，再轻触右侧托盘中相同图标的木块。</p>

            <div class="object-target-panel">
              <span class="object-target-panel__label">本轮目标</span>
              <div class="object-target-frame" :class="{ 'object-target-frame--active': woodTargetActive }">
                <div
                  v-if="currentTarget"
                  ref="woodTargetRef"
                  class="object-target-block"
                  :style="[iconTargetBlockSizeStyle, getIconBlockPalette(currentTarget.icon)]"
                >
                  <div class="object-block">
                    <div class="object-block__print">
                      <span class="object-block__icon">
                        {{ currentTarget.icon ? GAME_ICONS[currentTarget.icon] : '' }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="object-sidebar__stats">
            <div class="wood-sign" :class="{ 'wood-sign--warning': timeLeft <= 10 }">
              <span>剩余时间</span>
              <strong>{{ timeLeft }}s</strong>
            </div>
            <div class="wood-sign">
              <span>当前得分</span>
              <strong>{{ score }} 分</strong>
            </div>
          </div>
        </aside>

        <section class="shape-play-area game-tray object-play-area">
          <div class="shape-board game-tray__surface object-board">
            <div class="shape-board__well object-board__well">
              <div class="object-grid-wrap">
                <div class="object-grid" :style="iconGridStyle">
                  <button
                    v-for="item in gridItems"
                    :key="item.id"
                    type="button"
                    class="object-block-button"
                    :class="{
                      'object-block-button--hit': item.isTarget && item.isSelected && showResult,
                      'object-block-button--reveal': item.isTarget && !item.isSelected && showResult,
                      'object-block-button--miss': !item.isTarget && item.isSelected && showResult
                    }"
                    :style="itemMotionStyles[item.id]"
                    @click="handleItemClick(item, $event)"
                  >
                    <div class="object-block-shell" :style="getIconBlockPalette(item.icon)">
                      <div class="object-block">
                        <div class="object-block__print">
                          <span class="object-block__icon">{{ GAME_ICONS[item.icon!] }}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section v-else-if="isShapeMode" class="shape-match-stage" :style="shapeStageStyle">
        <aside class="sidebar">
          <div class="shape-console__status sidebar__plaque-section sidebar__plaque-section--top">
            <div class="wood-pill wood-pill--student">
              <span>学生</span>
              <strong>{{ displayStudentName }}</strong>
            </div>

            <div class="wood-pill">
              <span>进度</span>
              <strong>{{ currentRound }} / {{ totalRounds }}</strong>
            </div>
          </div>

          <div class="shape-target-copy sidebar__target-copy">
            <span class="shape-target-copy__eyebrow">木制积木挑战</span>
            <h2>请找出这个形状</h2>
            <p>轻触右侧托盘中的同款积木。</p>
          </div>

          <div class="shape-target-groove sidebar__target-panel">
            <div class="shape-target-socket sidebar__target-socket" :class="{ 'shape-target-socket--active': woodTargetActive }">
              <div
                v-if="currentTarget"
                ref="woodTargetRef"
                class="shape-target-block"
                :style="shapeTargetBlockSizeStyle"
              >
                <WoodenShapeBlock
                  class="shape-block-shell"
                  :shape-id="currentTarget.shape!"
                  :color="getShapeBlockColor(currentTarget.color)"
                />
              </div>
            </div>
          </div>

          <div class="shape-console__metrics sidebar__plaque-section">
            <div class="wood-sign" :class="{ 'wood-sign--warning': timeLeft <= 10 }">
              <span>剩余时间</span>
              <strong>{{ timeLeft }}s</strong>
            </div>
            <div class="wood-sign">
              <span>当前得分</span>
              <strong>{{ score }} 分</strong>
            </div>
          </div>

          <div class="shape-progress-engraving sidebar__plaque-section sidebar__plaque-section--bottom">
            <span class="shape-progress-engraving__label">训练进度</span>
            <div class="shape-progress-track">
              <div class="shape-progress-fill" :style="{ width: `${progressPercentage}%` }"></div>
            </div>
            <span class="shape-progress-engraving__value">{{ currentRound }} / {{ totalRounds }}</span>
          </div>
        </aside>

        <section class="shape-play-area game-tray">
          <div class="shape-board game-tray__surface">
            <div class="shape-board__well">
              <div class="shape-grid grid-container" :style="shapeGridStyle">
                <button
                  v-for="item in gridItems"
                  :key="item.id"
                  type="button"
                  class="shape-block-button"
                  :class="{
                    'shape-block-button--hit': item.isTarget && item.isSelected && showResult,
                    'shape-block-button--reveal': item.isTarget && !item.isSelected && showResult,
                    'shape-block-button--miss': !item.isTarget && item.isSelected && showResult
                  }"
                  :style="itemMotionStyles[item.id]"
                  @click="handleItemClick(item, $event)"
                >
                  <WoodenShapeBlock
                    class="shape-block-shell"
                    :shape-id="item.shape!"
                    :color="getShapeBlockColor(item.color)"
                  />
                </button>
              </div>
            </div>
          </div>
        </section>
      </section>

      <template v-else>
        <div class="game-header">
          <div class="target-display">
            <div class="target-label">请找出相同的：</div>
            <div class="target-sample" v-if="currentTarget">
              <div v-if="mode === 'icon'" class="target-icon">
                {{ currentTarget.icon ? GAME_ICONS[currentTarget.icon] : '' }}
              </div>
            </div>
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

        <div class="game-grid" :class="`grid-${gridSize}x${gridSize}`">
          <div
            v-for="item in gridItems"
            :key="item.id"
            class="grid-item"
            :class="{
              selected: item.isSelected,
              correct: item.isTarget && showResult,
              wrong: !item.isTarget && showResult && item.isSelected
            }"
            @click="handleItemClick(item, $event)"
          >
            <div v-if="mode === 'icon'" class="item-icon">
              {{ GAME_ICONS[item.icon!] }}
            </div>
          </div>
        </div>
      </template>
    </template>

    <div class="game-result" v-if="gameEnded">
      <h2>🎉 训练完成！</h2>
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
        <div class="result-item">
          <span class="label">平均反应时：</span>
          <span class="value">{{ avgResponseTime }}ms</span>
        </div>
      </div>
      <button class="btn-primary" disabled>
        正在生成详细报告...
      </button>
    </div>

    <div v-if="feedback" class="feedback" :class="feedback.type">
      {{ feedback.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { CSSProperties } from 'vue'
import WoodenShapeBlock from '@/components/games/shared/WoodenShapeBlock.vue'
import type {
  DistractorLevel,
  GameColor,
  GameGridMode,
  GameSessionData,
  GridItem,
  GridSize,
  TrialData,
} from '@/types/games'
import { GAME_COLORS, GAME_ICONS, TaskID } from '@/types/games'

interface Props {
  studentId: number
  studentName?: string
  taskId: TaskID
  mode: GameGridMode
  gridSize?: GridSize
  distractorLevel?: DistractorLevel
  timeLimit?: number
  rounds?: number
}

const props = withDefaults(defineProps<Props>(), {
  studentName: '',
  gridSize: 2,
  distractorLevel: 'medium',
  timeLimit: 60,
  rounds: 8,
})

const emit = defineEmits<{
  finish: [data: GameSessionData]
}>()

const currentRound = ref(0)
const timeLeft = ref(props.timeLimit)
const score = ref(0)
const gridItems = ref<GridItem[]>([])
const currentTarget = ref<GridItem | null>(null)
const showResult = ref(false)
const gameEnded = ref(false)
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)
const colorTargetRef = ref<HTMLElement | null>(null)
const woodTargetRef = ref<HTMLElement | null>(null)
const itemMotionStyles = ref<Record<number, CSSProperties>>({})
const woodTargetActive = ref(false)

const trialStartTime = ref(0)
const trials = ref<TrialData[]>([])
const roundTimeout = ref<number | null>(null)
const timerInterval = ref<number | null>(null)
const feedbackTimeout = ref<number | null>(null)

const isColorMode = computed(() => props.mode === 'color')
const isShapeMode = computed(() => props.mode === 'shape')
const isIconMode = computed(() => props.mode === 'icon')
const isWoodMode = computed(() => isShapeMode.value || isIconMode.value)
const totalRounds = computed(() => props.rounds)
const correctCount = computed(() => trials.value.filter(trial => trial.isCorrect).length)
const accuracy = computed(() => correctCount.value / trials.value.length || 0)
const avgResponseTime = computed(() => {
  const valid = trials.value.filter(trial => trial.responseTime > 0)
  if (valid.length === 0) return 0
  return Math.round(valid.reduce((sum, trial) => sum + trial.responseTime, 0) / valid.length)
})
const progressPercentage = computed(() => {
  if (totalRounds.value <= 0) return 0
  return Math.min(100, Math.max(0, (currentRound.value / totalRounds.value) * 100))
})
const displayStudentName = computed(() => props.studentName.trim() || `学生 ${props.studentId}`)
const currentTargetColorStyle = computed(() => getColorJellyStyle(currentTarget.value?.color))
const colorLayoutMetrics = computed(() => {
  const config = {
    2: {
      gap: 'clamp(16px, 2.4vmin, 26px)',
      size: 'clamp(132px, 19.5vmin, 196px)',
      max: '196px',
    },
    3: {
      gap: 'clamp(12px, 1.8vmin, 18px)',
      size: 'clamp(102px, 15vmin, 150px)',
      max: '150px',
    },
    4: {
      gap: 'clamp(8px, 1.2vmin, 14px)',
      size: 'clamp(72px, 11.2vmin, 108px)',
      max: '108px',
    },
  } as const

  return config[props.gridSize]
})
const colorGridStyle = computed<CSSProperties>(() => {
  const metrics = colorLayoutMetrics.value

  return {
    gridTemplateColumns: `repeat(${props.gridSize}, minmax(0, ${metrics.size}))`,
    gridTemplateRows: `repeat(${props.gridSize}, minmax(0, ${metrics.size}))`,
    gap: metrics.gap,
  }
})
const colorCandyButtonStyle = computed<CSSProperties>(() => {
  const metrics = colorLayoutMetrics.value

  return {
    width: metrics.size,
    height: metrics.size,
    maxWidth: metrics.max,
    maxHeight: metrics.max,
  }
})
const colorCandyInnerStyle = computed<CSSProperties>(() => {
  const metrics = colorLayoutMetrics.value

  return {
    maxWidth: metrics.max,
    maxHeight: metrics.max,
  }
})
const shapeLayoutMetrics = computed(() => {
  const config = {
    2: {
      gap: 'clamp(18px, 1.8vmin, 28px)',
      target: 'clamp(138px, 15vmin, 196px)',
    },
    3: {
      gap: 'clamp(12px, 1.3vmin, 20px)',
      target: 'clamp(120px, 13vmin, 172px)',
    },
    4: {
      gap: 'clamp(10px, 0.95vmin, 16px)',
      target: 'clamp(108px, 11vmin, 152px)',
    },
  } as const

  return config[props.gridSize]
})
const shapeStageStyle = computed<CSSProperties>(() => {
  const metrics = shapeLayoutMetrics.value

  return {
    '--grid-size': `${props.gridSize}`,
    '--grid-gap': metrics.gap,
    '--target-size': metrics.target,
  } as CSSProperties
})
const shapeGridStyle = computed<CSSProperties>(() => {
  const metrics = shapeLayoutMetrics.value

  return {
    '--grid-size': `${props.gridSize}`,
    '--grid-gap': metrics.gap,
  } as CSSProperties
})
const shapeTargetBlockSizeStyle = computed<CSSProperties>(() => {
  return {
    width: 'var(--target-size)',
    height: 'var(--target-size)',
  }
})
const iconLayoutMetrics = computed(() => {
  const config = {
    2: {
      gap: 'clamp(18px, 1.4vmin, 24px)',
      cell: 'clamp(182px, 15.2vmin, 236px)',
      target: 'clamp(170px, 16vmin, 232px)',
      icon: 'clamp(146px, 12.4vmin, 188px)',
      targetIcon: 'clamp(140px, 13.2vmin, 186px)',
      gridMax: '75vh',
      gridPadding: 'clamp(8px, 0.8vmin, 12px)',
    },
    3: {
      gap: 'clamp(14px, 1vmin, 18px)',
      cell: 'clamp(138px, 11.8vmin, 172px)',
      target: 'clamp(152px, 14vmin, 192px)',
      icon: 'clamp(114px, 9.6vmin, 140px)',
      targetIcon: 'clamp(126px, 11.4vmin, 154px)',
      gridMax: '76vh',
      gridPadding: 'clamp(7px, 0.7vmin, 10px)',
    },
    4: {
      gap: 'clamp(12px, 0.9vmin, 18px)',
      cell: 'clamp(132px, 10.6vmin, 168px)',
      target: 'clamp(136px, 12.4vmin, 168px)',
      icon: 'clamp(114px, 8.8vmin, 136px)',
      targetIcon: 'clamp(112px, 10vmin, 134px)',
      gridMax: '88vh',
      gridPadding: 'clamp(6px, 0.45vmin, 8px)',
    },
  } as const

  return config[props.gridSize]
})
const iconStageStyle = computed<CSSProperties>(() => {
  const metrics = iconLayoutMetrics.value

  return {
    '--object-target-size': metrics.target,
    '--object-icon-size': metrics.icon,
    '--object-target-icon-size': metrics.targetIcon,
    '--object-print-inset': '5%',
    '--object-grid-padding': metrics.gridPadding,
  } as CSSProperties
})
const iconGridStyle = computed<CSSProperties>(() => {
  const metrics = iconLayoutMetrics.value

  return {
    '--object-grid-columns': `repeat(${props.gridSize}, minmax(0, ${metrics.cell}))`,
    '--object-grid-rows': `repeat(${props.gridSize}, minmax(0, ${metrics.cell}))`,
    '--object-grid-gap': metrics.gap,
    '--object-grid-max-height': metrics.gridMax,
  } as CSSProperties
})
const iconTargetBlockSizeStyle = computed<CSSProperties>(() => {
  return {
    width: 'var(--object-target-size)',
    height: 'var(--object-target-size)',
  }
})

function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!
}

const sessionData = computed<GameSessionData>(() => {
  const correct = trials.value.filter(trial => trial.isCorrect).length
  const omission = trials.value.filter(trial => trial.isOmission).length
  const commission = trials.value.filter(trial => trial.isCommission).length
  const fastCommissions = trials.value.filter(trial => trial.isCommission && trial.responseTime < 500)
  const impulsivityScore = trials.value.length > 0
    ? (fastCommissions.length / trials.value.length) * 100
    : 0

  const midPoint = Math.floor(trials.value.length / 2)
  const firstHalf = trials.value.slice(0, midPoint)
  const secondHalf = trials.value.slice(midPoint)
  const firstHalfAcc = firstHalf.length > 0 ? firstHalf.filter(trial => trial.isCorrect).length / firstHalf.length : 0
  const secondHalfAcc = secondHalf.length > 0 ? secondHalf.filter(trial => trial.isCorrect).length / secondHalf.length : 0
  const fatigueIndex = firstHalfAcc > 0 ? secondHalfAcc / firstHalfAcc : 1

  return {
    taskId: props.taskId,
    studentId: props.studentId,
    startTime: trials.value[0]?.timestamp || Date.now(),
    endTime: Date.now(),
    duration: props.timeLimit * props.rounds,
    trials: trials.value,
    totalTrials: trials.value.length,
    correctTrials: correct,
    accuracy: accuracy.value,
    avgResponseTime: avgResponseTime.value,
    errors: {
      omission,
      commission,
    },
    behavior: {
      impulsivityScore: Math.round(impulsivityScore),
      fatigueIndex: Number(fatigueIndex.toFixed(2)),
    },
  }
})

function clearRoundTimer() {
  if (roundTimeout.value !== null) {
    clearTimeout(roundTimeout.value)
    roundTimeout.value = null
  }
}

function clearFeedbackTimer() {
  if (feedbackTimeout.value !== null) {
    clearTimeout(feedbackTimeout.value)
    feedbackTimeout.value = null
  }
}

function clampByte(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function normalizeHex(hex: string) {
  const compact = hex.replace('#', '')
  if (compact.length === 3) {
    return compact.split('').map(char => `${char}${char}`).join('')
  }
  if (compact.length === 6) {
    return compact
  }
  return '4b82ff'
}

function hexToRgb(hex: string) {
  const normalized = normalizeHex(hex)
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b].map(channel => clampByte(channel).toString(16).padStart(2, '0')).join('')}`
}

function mixColor(sourceHex: string, targetHex: string, amount: number) {
  const ratio = Math.min(1, Math.max(0, amount))
  const source = hexToRgb(sourceHex)
  const target = hexToRgb(targetHex)

  return rgbToHex({
    r: source.r + (target.r - source.r) * ratio,
    g: source.g + (target.g - source.g) * ratio,
    b: source.b + (target.b - source.b) * ratio,
  })
}

function getColorJellyStyle(color?: GameColor): CSSProperties {
  const base = GAME_COLORS[color ?? 'blue']
  const rgb = hexToRgb(base)

  return {
    '--jelly-base': base,
    '--jelly-light': mixColor(base, '#ffffff', 0.34),
    '--jelly-highlight': mixColor(base, '#ffffff', 0.74),
    '--jelly-shadow': mixColor(base, '#3c1f68', 0.28),
    '--jelly-deep': mixColor(base, '#10223d', 0.22),
    '--jelly-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  } as CSSProperties
}

function getShapeBlockColor(color?: GameColor) {
  return GAME_COLORS[color ?? 'orange']
}

const ICON_BLOCK_BASES = [
  '#cf7865',
  '#d4aa5e',
  '#7ea693',
  '#7f97c4',
  '#c587a7',
  '#dc9462',
  '#8fb06a',
  '#9a86cc',
  '#6aa7a0',
  '#d88972',
] as const

function getIconBlockPalette(icon?: string): CSSProperties {
  const key = icon ?? 'apple'
  const seed = key.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  const base = ICON_BLOCK_BASES[seed % ICON_BLOCK_BASES.length] ?? ICON_BLOCK_BASES[0]
  const rgb = hexToRgb(base)

  return {
    '--object-block-face': mixColor(base, '#ead4b0', 0.12),
    '--object-block-light': mixColor(base, '#fff7eb', 0.48),
    '--object-block-shadow': mixColor(base, '#7a4a21', 0.34),
    '--object-block-edge': mixColor(base, '#4c2d16', 0.4),
    '--object-block-rgb': `${rgb.r}, ${rgb.g}, ${rgb.b}`,
  } as CSSProperties
}

function rememberTargetMotion(item: GridItem, event?: MouseEvent) {
  if ((!isColorMode.value && !isWoodMode.value) || !item.isTarget) return

  const sourceElement = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null
  const targetElement = isColorMode.value ? colorTargetRef.value : woodTargetRef.value
  if (!sourceElement || !targetElement) return

  const sourceRect = sourceElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()
  const deltaX = (targetRect.left + targetRect.width / 2) - (sourceRect.left + sourceRect.width / 2)
  const deltaY = (targetRect.top + targetRect.height / 2) - (sourceRect.top + sourceRect.height / 2)

  itemMotionStyles.value = {
    ...itemMotionStyles.value,
    [item.id]: {
      '--gather-x': `${deltaX}px`,
      '--gather-y': `${deltaY}px`,
    },
  }
}

function startNewRound() {
  if (gameEnded.value) return
  if (currentRound.value >= props.rounds) {
    endGame()
    return
  }

  clearRoundTimer()
  clearFeedbackTimer()

  showResult.value = false
  feedback.value = null
  itemMotionStyles.value = {}
  woodTargetActive.value = false

  const target = generateTarget()
  currentTarget.value = target

  const distractorCount = (props.gridSize * props.gridSize) - 1
  gridItems.value = generateOptions(target, distractorCount)
  trialStartTime.value = Date.now()

  const timePerRound = Math.max(
    (props.timeLimit / props.rounds) * 1000,
    (6 + props.gridSize * 2) * 1000,
  )

  roundTimeout.value = window.setTimeout(() => {
    handleTimeout()
  }, timePerRound)

  currentRound.value++
}

function generateTarget(): GridItem {
  const colors = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'cyan', 'lime', 'coral', 'teal', 'indigo'] as const
  const shapes = ['circle', 'square', 'triangle', 'hexagon', 'star', 'trapezoid', 'diamond', 'rightTriangle'] as const
  const icons = [
    'apple', 'car', 'dog', 'cat', 'star', 'heart', 'ball', 'flower', 'moon', 'sun', 'fish', 'bird',
    'tomato', 'kiwi', 'lemon', 'strawberry', 'corn', 'carrot', 'mushroom', 'hamburger', 'lollipop',
    'cow', 'rabbit', 'swan', 'duck', 'frog', 'shrimp', 'butterfly', 'tiger', 'sunflower', 'basketball', 'football',
  ] as const

  const id = Date.now()

  if (props.mode === 'color') {
    const color = pickRandom(colors)
    return { id, type: 'color', color, isTarget: true, isSelected: false }
  }

  if (props.mode === 'shape') {
    const shape = pickRandom(shapes)
    const color = pickRandom(colors)
    return { id, type: 'shape', shape, color, isTarget: true, isSelected: false }
  }

  const icon = pickRandom(icons)
  return { id, type: 'icon', icon, isTarget: true, isSelected: false }
}

function generateOptions(target: GridItem, count: number): GridItem[] {
  const items: GridItem[] = [target]
  const usedValues = new Set<string>()

  if (target.type === 'color') {
    usedValues.add(target.color!)
  } else if (target.type === 'shape') {
    usedValues.add(`${target.color}-${target.shape}`)
  } else {
    usedValues.add(target.icon!)
  }

  const colors = ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'cyan', 'lime', 'coral', 'teal', 'indigo'] as const
  const shapes = ['circle', 'square', 'triangle', 'hexagon', 'star', 'trapezoid', 'diamond', 'rightTriangle'] as const
  const icons = [
    'apple', 'car', 'dog', 'cat', 'star', 'heart', 'ball', 'flower', 'moon', 'sun', 'fish', 'bird',
    'tomato', 'kiwi', 'lemon', 'strawberry', 'corn', 'carrot', 'mushroom', 'hamburger', 'lollipop',
    'cow', 'rabbit', 'swan', 'duck', 'frog', 'shrimp', 'butterfly', 'tiger', 'sunflower', 'basketball', 'football',
  ] as const

  let attempts = 0
  const maxAttempts = count * 20

  while (items.length < count + 1 && attempts < maxAttempts) {
    attempts++
    let item: GridItem
    let key: string

    if (props.mode === 'color') {
      const color = pickRandom(colors)
      key = color
      item = { id: Date.now() + items.length, type: 'color', color, isTarget: false, isSelected: false }
    } else if (props.mode === 'shape') {
      const shape = pickRandom(shapes)
      const color = pickRandom(colors)
      key = `${color}-${shape}`
      item = { id: Date.now() + items.length, type: 'shape', shape, color, isTarget: false, isSelected: false }
    } else {
      const icon = pickRandom(icons)
      key = icon
      item = { id: Date.now() + items.length, type: 'icon', icon, isTarget: false, isSelected: false }
    }

    if (!usedValues.has(key)) {
      usedValues.add(key)
      items.push(item)
    }
  }

  while (items.length < count + 1) {
    if (props.mode === 'color') {
      const availableColors = colors.filter(color => !usedValues.has(color))
      const fallbackColors = colors.filter(color => color !== target.color)
      const color = availableColors.length > 0
        ? pickRandom(availableColors)
        : pickRandom(fallbackColors.length > 0 ? fallbackColors : colors)

      usedValues.add(color)
      items.push({
        id: Date.now() + items.length,
        type: 'color',
        color,
        isTarget: false,
        isSelected: false,
      })
    } else if (props.mode === 'shape') {
      let color = pickRandom(colors)
      let shape = pickRandom(shapes)
      let key = `${color}-${shape}`
      let safetyCounter = 0

      do {
        color = pickRandom(colors)
        shape = pickRandom(shapes)
        key = `${color}-${shape}`
        safetyCounter++
      } while (usedValues.has(key) && safetyCounter < 100)

      usedValues.add(key)
      items.push({
        id: Date.now() + items.length,
        type: 'shape',
        color,
        shape,
        isTarget: false,
        isSelected: false,
      })
    } else {
      let icon = pickRandom(icons)
      let safetyCounter = 0

      do {
        icon = pickRandom(icons)
        safetyCounter++
      } while (usedValues.has(icon) && safetyCounter < 100)

      usedValues.add(icon)
      items.push({
        id: Date.now() + items.length,
        type: 'icon',
        icon,
        isTarget: false,
        isSelected: false,
      })
    }
  }

  return items.sort(() => Math.random() - 0.5)
}

function playSound(type: 'success' | 'error' | 'timeout') {
  try {
    const AudioCtor = window.AudioContext
      || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    const audioContext = new AudioCtor()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'success') {
      oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.4)
    } else if (type === 'error') {
      oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.15)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.3)
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime)
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    }
  } catch (error) {
    console.warn('音效播放失败:', error)
  }
}

function handleItemClick(item: GridItem, event?: MouseEvent) {
  if (gameEnded.value || showResult.value || item.isSelected) return

  clearRoundTimer()

  const responseTime = Date.now() - trialStartTime.value
  const isCorrect = item.isTarget

  item.isSelected = true
  if (isCorrect && (isColorMode.value || isWoodMode.value)) {
    rememberTargetMotion(item, event)
    if (isWoodMode.value) {
      woodTargetActive.value = true
    }
  }

  showResult.value = true

  if (isCorrect) {
    score.value += 10
    playSound('success')
    showFeedback('success', '✓ 正确！')

    trials.value.push({
      trialId: currentRound.value,
      target: currentTarget.value!,
      options: gridItems.value,
      userChoice: item.id,
      isCorrect: true,
      responseTime,
      isOmission: false,
      isCommission: false,
      timestamp: Date.now(),
    })
  } else {
    playSound('error')
    showFeedback('error', '✕ 再试试看')

    trials.value.push({
      trialId: currentRound.value,
      target: currentTarget.value!,
      options: gridItems.value,
      userChoice: item.id,
      isCorrect: false,
      responseTime,
      isOmission: false,
      isCommission: true,
      timestamp: Date.now(),
    })
  }

  window.setTimeout(() => {
    startNewRound()
  }, 2500)
}

function handleTimeout() {
  if (gameEnded.value || showResult.value) return

  clearRoundTimer()
  showResult.value = true

  trials.value.push({
    trialId: currentRound.value,
    target: currentTarget.value!,
    options: gridItems.value,
    userChoice: null,
    isCorrect: false,
    responseTime: (props.timeLimit / props.rounds) * 1000,
    isOmission: true,
    isCommission: false,
    timestamp: Date.now(),
  })

  playSound('timeout')
  showFeedback('error', '⏱ 时间到')

  window.setTimeout(() => {
    startNewRound()
  }, 1500)
}

function showFeedback(type: 'success' | 'error', message: string) {
  clearFeedbackTimer()
  feedback.value = { type, message }

  feedbackTimeout.value = window.setTimeout(() => {
    feedback.value = null
    feedbackTimeout.value = null
  }, 2000)
}

function endGame() {
  if (gameEnded.value) return

  gameEnded.value = true
  clearRoundTimer()
  clearFeedbackTimer()

  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value)
    timerInterval.value = null
  }

  emit('finish', sessionData.value)
}

function startGame() {
  startNewRound()

  timerInterval.value = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

onMounted(() => {
  startGame()
})

onUnmounted(() => {
  clearRoundTimer()
  clearFeedbackTimer()

  if (timerInterval.value !== null) {
    clearInterval(timerInterval.value)
  }
})
</script>

<style scoped>
.game-grid-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.game-grid-container--color {
  display: flex;
  flex: 1;
  flex-direction: column;
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.color-match-stage {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
}

.color-top-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 16px 28px rgba(83, 122, 188, 0.12);
  backdrop-filter: blur(16px);
}

.color-top-panel__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.color-top-panel__aside {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.color-top-panel__aside--left {
  justify-content: flex-start;
}

.color-top-panel__aside--right {
  justify-content: flex-end;
}

.color-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
  backdrop-filter: blur(12px);
}

.color-chip span {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(79, 49, 125, 0.72);
}

.color-chip strong {
  font-size: 0.92rem;
  line-height: 1;
  color: #523286;
  white-space: nowrap;
}

.color-chip--warning strong {
  color: #d63d67;
}

.color-target-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-width: 0;
}

.color-target-inline__label {
  font-family: "Comic Sans MS", "Marker Felt", "Trebuchet MS", "Microsoft YaHei", sans-serif;
  font-size: clamp(1.1rem, 2.1vw, 1.65rem);
  font-weight: 800;
  line-height: 1.2;
  color: #5a2f86;
  letter-spacing: 0.04em;
  text-align: center;
  text-shadow: 0 4px 0 rgba(255, 255, 255, 0.5);
}

.color-progress-strip {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.color-progress-strip__label,
.color-progress-strip__value {
  font-size: 0.82rem;
  font-weight: 700;
  color: rgba(79, 49, 125, 0.76);
}

.color-progress-track {
  position: relative;
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.54);
  box-shadow: inset 0 2px 6px rgba(88, 114, 171, 0.12);
}

.color-progress-fill {
  position: relative;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ff8b8b 0%, #ffd66c 26%, #8cdb7f 54%, #77c5ff 78%, #ba8bff 100%);
  transition: width 0.45s ease;
}

.color-progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.64), rgba(255, 255, 255, 0.12));
  transform: translateX(-100%);
  animation: colorProgressShine 2.2s linear infinite;
}

.color-play-area {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: hidden;
  padding: clamp(8px, 1.4vmin, 14px);
}

.color-play-area::before,
.color-play-area::after {
  content: '';
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.5);
  filter: blur(1px);
  pointer-events: none;
}

.color-play-area::before {
  top: 10%;
  left: 2%;
  width: 138px;
  height: 42px;
}

.color-play-area::after {
  right: 5%;
  bottom: 12%;
  width: 168px;
  height: 52px;
}

.color-game-grid {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  align-items: center;
  justify-content: center;
  align-content: center;
  width: fit-content;
  max-width: 100%;
  max-height: 100%;
  padding: clamp(6px, 1vmin, 12px);
}

.color-candy-button {
  position: relative;
  display: grid;
  place-items: center;
  padding: clamp(4px, 0.8vmin, 8px);
  aspect-ratio: 1 / 1;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  box-shadow: none;
  overflow: visible;
  transform-origin: center bottom;
  transition: transform 0.18s ease;
  -webkit-tap-highlight-color: transparent;
}

.color-candy-button:hover,
.color-candy-button:focus-visible {
  transform: translateY(-2px);
}

.color-candy-button:focus-visible {
  outline: none;
}

.color-candy-button:hover .color-candy,
.color-candy-button:focus-visible .color-candy,
.color-candy-button:active .color-candy {
  animation: colorJellyBounce 0.7s cubic-bezier(0.22, 1.6, 0.36, 1) both;
}

.color-target-jelly,
.color-candy {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    radial-gradient(circle at 32% 24%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 24%),
    linear-gradient(180deg, var(--jelly-light) 0%, var(--jelly-base) 54%, var(--jelly-shadow) 100%);
  box-shadow:
    inset 0 12px 18px rgba(255, 255, 255, 0.48),
    inset 0 -16px 24px rgba(16, 34, 61, 0.16),
    0 18px 24px rgba(var(--jelly-rgb), 0.2);
}

.color-target-jelly::before,
.color-candy::before {
  content: '';
  position: absolute;
  left: 16%;
  top: 13%;
  width: 42%;
  height: 24%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(255, 255, 255, 0.12));
  transform: rotate(-18deg);
}

.color-target-jelly::after,
.color-candy::after {
  content: '';
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: 9%;
  height: 26%;
  border-radius: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(16, 34, 61, 0.12));
}

.color-target-jelly {
  width: clamp(58px, 6.5vmin, 84px);
  height: clamp(58px, 6.5vmin, 84px);
  flex: 0 0 auto;
  border-radius: 20px;
}

.color-candy {
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  object-fit: contain;
  border-radius: 50%;
}

.color-candy-button--reveal .color-candy {
  box-shadow:
    0 0 0 8px rgba(var(--jelly-rgb), 0.1),
    inset 0 12px 18px rgba(255, 255, 255, 0.48),
    inset 0 -16px 24px rgba(16, 34, 61, 0.16),
    0 18px 24px rgba(var(--jelly-rgb), 0.2);
}

.color-candy-button--hit {
  z-index: 4;
  animation: colorJellyGather 0.85s cubic-bezier(0.2, 0.75, 0.18, 1) forwards;
}

.color-candy-button--hit .color-candy {
  animation: colorJellyFlash 0.85s ease-out forwards;
}

.color-candy-button--miss .color-candy {
  animation: colorJellyShake 0.62s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.game-grid-container--shape {
  display: flex;
  flex: 1;
  width: 100%;
  max-width: none;
  height: 100%;
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

.shape-match-stage {
  display: flex;
  flex: 1;
  gap: clamp(20px, 1.8vw, 30px);
  min-height: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.sidebar {
  position: relative;
  flex: 0 0 30%;
  display: flex;
  flex-direction: column;
  gap: clamp(14px, 1.4vh, 20px);
  min-width: 312px;
  max-width: 30%;
  min-height: 0;
  padding: clamp(24px, 2vw, 32px);
  border-radius: 36px;
  background:
    radial-gradient(circle at 22% 14%, rgba(255, 240, 218, 0.1), transparent 20%),
    radial-gradient(circle at 84% 76%, rgba(255, 236, 208, 0.06), transparent 18%),
    linear-gradient(180deg, rgba(101, 63, 33, 0.98), rgba(67, 40, 18, 0.99)),
    repeating-linear-gradient(
      -7deg,
      rgba(255, 224, 184, 0.04) 0,
      rgba(255, 224, 184, 0.04) 12px,
      rgba(54, 30, 12, 0.14) 12px,
      rgba(54, 30, 12, 0.14) 28px,
      rgba(255, 236, 208, 0.03) 28px,
      rgba(255, 236, 208, 0.03) 38px
    );
  box-shadow:
    0 28px 46px rgba(54, 30, 12, 0.24),
    inset 0 1px 0 rgba(255, 240, 214, 0.16),
    inset 0 -10px 24px rgba(28, 15, 7, 0.42);
}

.sidebar__plaque-section {
  position: relative;
  border: 1px solid rgba(255, 231, 201, 0.12);
  background:
    linear-gradient(180deg, rgba(163, 115, 70, 0.24), rgba(112, 70, 37, 0.34)),
    repeating-linear-gradient(
      -8deg,
      rgba(255, 239, 214, 0.06) 0,
      rgba(255, 239, 214, 0.06) 10px,
      rgba(49, 28, 13, 0.14) 10px,
      rgba(49, 28, 13, 0.14) 24px
    );
  box-shadow:
    inset 0 1px 0 rgba(255, 242, 216, 0.16),
    inset 0 -8px 16px rgba(31, 17, 8, 0.22);
}

.sidebar__plaque-section--top {
  order: 1;
  padding: 22px 18px 16px;
  border-radius: 28px 28px 20px 20px;
}

.sidebar__plaque-section--top::before,
.sidebar__plaque-section--top::after {
  content: '';
  position: absolute;
  top: -18px;
  width: 3px;
  height: 20px;
  border-radius: 999px;
  background: linear-gradient(180deg, #deb885, #8e5d34);
  box-shadow: 0 1px 0 rgba(255, 245, 224, 0.26);
}

.sidebar__plaque-section--top::before {
  left: 36px;
}

.sidebar__plaque-section--top::after {
  right: 36px;
}

.shape-console__status {
  order: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 12px;
}

.wood-pill {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 68px;
  padding: 14px 16px 12px;
  border-radius: 18px;
  background: rgba(255, 246, 233, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 214, 0.08),
    inset 0 -6px 10px rgba(32, 18, 9, 0.16);
}

.wood-pill span {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(255, 232, 204, 0.74);
}

.wood-pill strong {
  font-size: 1rem;
  line-height: 1.2;
  color: #fff7ed;
}

.wood-pill--student strong {
  font-size: 1.14rem;
}

.wood-sign {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-height: 78px;
  padding: 16px 18px 14px;
  border-radius: 18px;
  background: rgba(255, 247, 233, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 240, 214, 0.08),
    inset 0 -6px 10px rgba(32, 18, 9, 0.16);
}

.wood-sign span {
  font-size: 0.76rem;
  font-weight: 700;
  color: rgba(255, 232, 204, 0.74);
}

.wood-sign strong {
  font-size: 1.12rem;
  line-height: 1.2;
  color: #fff7ed;
}

.wood-sign--warning strong {
  color: #ffd7c5;
}

.shape-console__metrics {
  order: 2;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: -6px;
  padding: 0 18px 4px;
  border-radius: 0;
}

.shape-target-copy {
  order: 4;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: clamp(10px, 1.2vh, 18px);
}

.shape-target-copy__eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #5d3416;
  background: linear-gradient(180deg, rgba(250, 232, 205, 0.96), rgba(225, 186, 136, 0.92));
  box-shadow: 0 12px 18px rgba(41, 24, 13, 0.14);
}

.shape-target-copy h2 {
  margin: 0;
  font-family: "Cooper Black", "Comic Sans MS", "Trebuchet MS", "Microsoft YaHei", sans-serif;
  font-size: clamp(2rem, 2.6vw, 3rem);
  line-height: 1;
  letter-spacing: 0.03em;
  color: #fff8ef;
  text-shadow:
    0 3px 0 rgba(80, 45, 19, 0.24),
    0 14px 22px rgba(22, 12, 6, 0.18);
}

.shape-target-copy p {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 238, 214, 0.82);
}

.shape-target-groove {
  order: 5;
  width: 100%;
  padding: clamp(16px, 1.6vmin, 22px);
  overflow: hidden;
  border-radius: 30px;
  background:
    linear-gradient(180deg, rgba(124, 79, 43, 0.98), rgba(72, 42, 20, 0.99)),
    repeating-linear-gradient(
      -8deg,
      rgba(255, 239, 213, 0.06) 0,
      rgba(255, 239, 213, 0.06) 10px,
      rgba(33, 18, 9, 0.14) 10px,
      rgba(33, 18, 9, 0.14) 24px
    );
  box-shadow:
    0 18px 30px rgba(37, 21, 11, 0.18),
    inset 0 1px 0 rgba(255, 240, 214, 0.12),
    inset 0 -10px 22px rgba(26, 13, 7, 0.28);
}

.shape-target-socket {
  display: grid;
  place-items: center;
  min-height: clamp(200px, 27vh, 280px);
  border-radius: 26px;
  background:
    linear-gradient(180deg, rgba(49, 29, 15, 0.98), rgba(29, 17, 9, 1)),
    repeating-linear-gradient(
      -10deg,
      rgba(123, 79, 42, 0.08) 0,
      rgba(123, 79, 42, 0.08) 12px,
      rgba(14, 8, 4, 0.12) 12px,
      rgba(14, 8, 4, 0.12) 28px
    );
  box-shadow:
    inset 0 18px 30px rgba(6, 3, 2, 0.56),
    inset 0 -10px 20px rgba(255, 226, 186, 0.06),
    inset 0 0 0 1px rgba(255, 226, 186, 0.06);
}

.shape-target-socket--active {
  animation: shapeGroovePulse 0.8s ease-out both;
}

.shape-target-block {
  display: grid;
  place-items: center;
  width: var(--target-size);
  height: var(--target-size);
  pointer-events: none;
}

.shape-progress-engraving {
  order: 3;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 74px;
  margin-top: -6px;
  padding: 14px 18px 18px;
  border-radius: 0 0 28px 28px;
}

.shape-progress-engraving__label,
.shape-progress-engraving__value {
  font-size: 0.82rem;
  font-weight: 800;
  color: rgba(255, 232, 204, 0.84);
}

.shape-progress-track {
  position: relative;
  height: 16px;
  overflow: hidden;
  border-radius: 999px;
  background:
    linear-gradient(180deg, rgba(56, 32, 16, 0.88), rgba(32, 18, 10, 0.94));
  box-shadow:
    inset 0 6px 10px rgba(11, 6, 3, 0.34),
    inset 0 -1px 0 rgba(255, 239, 213, 0.08);
}

.shape-progress-fill {
  position: relative;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #ffd28a 0%, #f7b15d 38%, #e28745 72%, #c76332 100%);
  box-shadow:
    0 6px 10px rgba(138, 78, 33, 0.18),
    inset 0 1px 0 rgba(255, 235, 204, 0.38);
  transition: width 0.45s ease;
}

.shape-progress-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.38), rgba(255, 255, 255, 0.08));
  transform: translateX(-100%);
  animation: colorProgressShine 2.2s linear infinite;
}

.shape-play-area {
  flex: 1 1 auto;
  display: flex;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

.game-tray {
  flex: 1 1 70%;
}

.shape-board {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
  padding: clamp(24px, 2.2vw, 34px);
  overflow: hidden;
  border-radius: 42px;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 247, 232, 0.34), rgba(255, 247, 232, 0) 18%),
    repeating-linear-gradient(
      -7deg,
      rgba(229, 192, 141, 0.9) 0,
      rgba(229, 192, 141, 0.9) 20px,
      rgba(214, 171, 116, 0.96) 20px,
      rgba(214, 171, 116, 0.96) 46px,
      rgba(236, 202, 154, 0.9) 46px,
      rgba(236, 202, 154, 0.9) 68px
    );
  box-shadow:
    0 28px 44px rgba(106, 69, 36, 0.18),
    inset 0 28px 34px rgba(255, 247, 233, 0.18),
    inset 0 -28px 34px rgba(138, 97, 52, 0.16),
    inset 0 0 0 2px rgba(122, 77, 39, 0.08);
}

.shape-board::before {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 34px;
  border: 1px solid rgba(122, 77, 39, 0.12);
  box-shadow:
    inset 0 28px 34px rgba(84, 54, 28, 0.22),
    inset 0 -24px 28px rgba(38, 22, 10, 0.14);
  pointer-events: none;
}

.shape-board__well {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: clamp(18px, 1.8vw, 28px);
  overflow: hidden;
  border-radius: 34px;
  background:
    radial-gradient(circle at 50% 24%, rgba(255, 246, 230, 0.38), rgba(255, 246, 230, 0) 28%),
    linear-gradient(180deg, rgba(226, 188, 136, 0.82), rgba(205, 164, 112, 0.88));
  box-shadow:
    inset 0 36px 42px rgba(90, 56, 27, 0.16),
    inset 0 -30px 34px rgba(255, 244, 226, 0.12);
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(var(--grid-size), 1fr);
  gap: var(--grid-gap);
  width: min(100%, 80vh);
  height: min(100%, 80vh);
  max-width: min(100%, 80vh);
  max-height: 80vh;
  aspect-ratio: 1 / 1;
  padding: clamp(8px, 1vmin, 14px);
  justify-content: center;
  align-content: center;
}

.shape-block-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  aspect-ratio: 1 / 1;
  border: 0;
  background: transparent;
  overflow: visible;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.shape-block-button:focus-visible {
  outline: none;
}

.shape-block-shell {
  position: relative;
  width: 74%;
  height: 74%;
  max-width: 100%;
  max-height: 100%;
  aspect-ratio: 1 / 1;
  overflow: visible;
  transition: transform 0.16s ease;
}

.shape-block-button:hover .shape-block-shell,
.shape-block-button:focus-visible .shape-block-shell {
  transform: translateY(-2px);
}

.shape-block-button:active .shape-block-shell {
  transform: none;
}

.shape-target-block > .shape-block-shell {
  width: 100%;
  height: 100%;
}

.shape-block-button:focus-visible .shape-block-shell :deep(.wooden-shape-block__body) {
  outline: 3px solid rgba(255, 247, 232, 0.8);
  outline-offset: 8px;
}

.shape-block-button:active .shape-block-shell {
  transform: translateY(4px);
}

.shape-block-button:active .shape-block-shell :deep(.wooden-shape-block__body) {
  box-shadow:
    0 1px 0 rgba(55, 31, 14, 0.2),
    0 6px 10px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 245, 228, 0.34),
    inset 0 -8px 10px rgba(79, 49, 24, 0.16);
}

.shape-block-button--reveal .shape-block-shell :deep(.wooden-shape-block__body) {
  box-shadow:
    0 0 0 10px rgba(var(--block-rgb), 0.1),
    0 4px 0 rgba(55, 31, 14, 0.18),
    0 11px 18px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 245, 228, 0.4),
    inset 0 -10px 12px rgba(79, 49, 24, 0.14);
}

.shape-block-button--hit {
  z-index: 5;
  animation: shapeBlockFlyIn 0.6s cubic-bezier(0.22, 0.72, 0.18, 1) forwards;
}

.shape-block-button--hit .shape-block-shell :deep(.wooden-shape-block__body) {
  filter: brightness(1.04) saturate(1.04);
}

.shape-block-button--miss .shape-block-shell {
  animation: shapeBlockNudge 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.object-match-stage {
  --object-sidebar-text: rgba(255, 240, 221, 0.84);
  gap: clamp(16px, 1.25vw, 22px);
  align-items: stretch;
  overflow: hidden;
}

.object-sidebar {
  flex: 0 0 30%;
  min-width: clamp(300px, 24vw, 420px);
  max-width: 30%;
  justify-content: space-between;
  gap: clamp(14px, 1.35vh, 20px);
  overflow: hidden;
  background:
    radial-gradient(circle at 16% 12%, rgba(255, 238, 214, 0.14), transparent 18%),
    radial-gradient(circle at 78% 76%, rgba(220, 184, 143, 0.08), transparent 20%),
    linear-gradient(180deg, rgba(89, 56, 33, 0.99), rgba(47, 28, 14, 1)),
    repeating-linear-gradient(
      -7deg,
      rgba(255, 230, 198, 0.04) 0,
      rgba(255, 230, 198, 0.04) 10px,
      rgba(52, 30, 15, 0.18) 10px,
      rgba(52, 30, 15, 0.18) 24px,
      rgba(255, 242, 224, 0.03) 24px,
      rgba(255, 242, 224, 0.03) 36px
    );
  box-shadow:
    0 26px 44px rgba(35, 20, 10, 0.28),
    inset 0 1px 0 rgba(255, 240, 214, 0.16),
    inset 0 -16px 30px rgba(16, 9, 4, 0.44);
}

.object-sidebar__student {
  min-height: 78px;
  padding: 16px 18px 14px;
  background: rgba(255, 248, 235, 0.08);
  box-shadow:
    inset 0 1px 0 rgba(255, 243, 222, 0.12),
    inset 0 -8px 14px rgba(31, 17, 8, 0.18);
}

.object-progress-card {
  display: grid;
  gap: 10px;
  padding: 14px 16px 16px;
  border-radius: 22px;
}

.object-progress-card__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.object-progress-card__label {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--object-sidebar-text);
}

.object-progress-card__value {
  font-size: 1rem;
  color: #fff7ea;
}

.object-progress-card__track {
  height: 12px;
}

.object-progress-card__fill {
  background: linear-gradient(90deg, #f7d79e 0%, #ecb96d 35%, #d98a4b 68%, #ba6837 100%);
}

.object-sidebar__focus {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 12px;
  min-height: 0;
}

.object-sidebar__eyebrow {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #5a3518;
  background: linear-gradient(180deg, rgba(251, 235, 212, 0.96), rgba(226, 191, 145, 0.94));
  box-shadow: 0 12px 18px rgba(33, 20, 11, 0.16);
}

.object-sidebar__focus h2 {
  margin: 0;
  font-family: "Cooper Black", "Comic Sans MS", "Trebuchet MS", "Microsoft YaHei", sans-serif;
  font-size: clamp(1.9rem, 2.2vw, 2.8rem);
  line-height: 1.02;
  letter-spacing: 0.03em;
  color: #fff8ef;
  text-shadow:
    0 3px 0 rgba(80, 45, 19, 0.24),
    0 14px 22px rgba(16, 9, 4, 0.22);
}

.object-sidebar__focus p {
  margin: 0;
  width: 100%;
  max-width: none;
  font-size: 0.96rem;
  line-height: 1.55;
  color: rgba(255, 235, 208, 0.78);
}

.object-target-panel {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(118, 77, 44, 0.96), rgba(67, 39, 20, 0.98)),
    repeating-linear-gradient(
      -8deg,
      rgba(255, 238, 213, 0.06) 0,
      rgba(255, 238, 213, 0.06) 10px,
      rgba(32, 18, 9, 0.14) 10px,
      rgba(32, 18, 9, 0.14) 24px
    );
  box-shadow:
    0 16px 24px rgba(34, 19, 9, 0.18),
    inset 0 1px 0 rgba(255, 240, 214, 0.12),
    inset 0 -10px 20px rgba(18, 10, 4, 0.28);
}

.object-target-panel__label {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: rgba(255, 232, 204, 0.78);
}

.object-target-frame {
  display: grid;
  place-items: center;
  min-height: clamp(190px, 25vh, 272px);
  padding: clamp(18px, 1.6vmin, 24px);
  overflow: hidden;
  border-radius: 22px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255, 245, 232, 0.1), rgba(255, 245, 232, 0) 34%),
    linear-gradient(180deg, rgba(44, 26, 14, 0.99), rgba(25, 15, 8, 1)),
    repeating-linear-gradient(
      -10deg,
      rgba(120, 78, 42, 0.08) 0,
      rgba(120, 78, 42, 0.08) 12px,
      rgba(12, 7, 3, 0.12) 12px,
      rgba(12, 7, 3, 0.12) 28px
    );
  box-shadow:
    inset 0 22px 34px rgba(5, 3, 2, 0.58),
    inset 0 -14px 22px rgba(255, 225, 188, 0.08),
    inset 0 0 0 1px rgba(255, 225, 188, 0.08);
}

.object-target-frame--active {
  animation: shapeGroovePulse 0.8s ease-out both;
}

.object-target-frame--active .object-target-block {
  animation: shapeBlockLand 0.36s ease-out both;
}

.object-target-block {
  display: grid;
  place-items: center;
  width: var(--object-target-size);
  height: var(--object-target-size);
  pointer-events: none;
}

.object-target-block .object-block__icon {
  font-size: var(--object-target-icon-size);
}

.object-sidebar__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.object-play-area {
  flex: 1 1 70%;
  min-width: 0;
  overflow: hidden;
}

.object-board {
  padding: clamp(16px, 1.2vw, 22px);
  overflow: hidden;
  background:
    radial-gradient(circle at 18% 16%, rgba(255, 248, 236, 0.38), rgba(255, 248, 236, 0) 20%),
    radial-gradient(circle at 84% 82%, rgba(232, 204, 167, 0.24), rgba(232, 204, 167, 0) 22%),
    repeating-linear-gradient(
      -8deg,
      rgba(229, 195, 147, 0.94) 0,
      rgba(229, 195, 147, 0.94) 18px,
      rgba(214, 173, 121, 0.98) 18px,
      rgba(214, 173, 121, 0.98) 42px,
      rgba(240, 210, 168, 0.94) 42px,
      rgba(240, 210, 168, 0.94) 66px
    );
  box-shadow:
    0 26px 42px rgba(88, 57, 29, 0.18),
    inset 0 2px 0 rgba(255, 248, 238, 0.22),
    inset 0 74px 104px rgba(255, 249, 238, 0.16),
    inset 0 -38px 62px rgba(127, 89, 49, 0.2),
    inset 0 0 0 2px rgba(122, 77, 39, 0.08);
}

.object-board::before {
  border-color: rgba(140, 96, 52, 0.1);
  box-shadow:
    inset 0 26px 34px rgba(98, 64, 35, 0.16),
    inset 0 -24px 28px rgba(54, 32, 16, 0.1);
}

.object-board__well {
  padding: clamp(10px, 0.9vw, 16px);
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(255, 250, 243, 0.4), rgba(255, 250, 243, 0) 22%),
    radial-gradient(circle at 82% 78%, rgba(232, 209, 178, 0.22), rgba(232, 209, 178, 0) 20%),
    linear-gradient(180deg, rgba(243, 232, 211, 0.98), rgba(232, 215, 188, 0.98));
  box-shadow:
    inset 0 32px 48px rgba(255, 249, 240, 0.2),
    inset 0 -26px 40px rgba(154, 116, 72, 0.14),
    inset 0 0 120px rgba(118, 84, 48, 0.18),
    inset 0 0 0 18px rgba(168, 128, 82, 0.12),
    inset 0 0 0 1px rgba(173, 135, 90, 0.08);
}

.object-grid-wrap {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: var(--object-grid-max-height, 75vh);
  max-width: min(100%, var(--object-grid-max-height, 75vh));
  padding: var(--object-grid-padding, clamp(8px, 0.8vmin, 12px));
  overflow: hidden;
}

.object-grid {
  display: grid;
  grid-template-columns: var(--object-grid-columns);
  grid-template-rows: var(--object-grid-rows);
  gap: var(--object-grid-gap);
  justify-items: center;
  align-items: center;
  justify-content: center;
  align-content: center;
  width: fit-content;
  height: fit-content;
  max-width: 100%;
  max-height: var(--object-grid-max-height, 75vh);
  padding: var(--object-grid-padding, clamp(6px, 0.8vmin, 10px));
  overflow: hidden;
}

.object-block-button {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  padding: 0;
  aspect-ratio: 1 / 1;
  border: 0;
  background: transparent;
  cursor: pointer;
  overflow: visible;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.object-block-button:focus-visible {
  outline: none;
}

.object-block-shell {
  position: relative;
  width: 100%;
  height: 100%;
  aspect-ratio: 1 / 1;
  transition: transform 0.16s ease;
}

.object-block-button:hover .object-block-shell,
.object-block-button:focus-visible .object-block-shell {
  transform: translateY(-1px);
}

.object-block-button:active .object-block-shell {
  transform: translateY(2px);
}

.object-block {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 26%;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 38%),
    repeating-linear-gradient(
      127deg,
      rgba(255, 255, 255, 0.03) 0,
      rgba(255, 255, 255, 0.03) 8px,
      rgba(96, 60, 30, 0.09) 8px,
      rgba(96, 60, 30, 0.09) 18px,
      rgba(255, 255, 255, 0.02) 18px,
      rgba(255, 255, 255, 0.02) 28px
    ),
    linear-gradient(180deg, var(--object-block-light) 0%, var(--object-block-face) 60%, var(--object-block-shadow) 100%);
  box-shadow:
    0 2px 0 rgba(84, 54, 29, 0.34),
    0 8px 0 rgba(72, 46, 24, 0.26),
    0 18px 22px rgba(54, 33, 16, 0.22),
    0 28px 30px rgba(54, 33, 16, 0.08),
    inset 0 1px 0 rgba(255, 246, 231, 0.2),
    inset 0 -16px 18px rgba(86, 52, 25, 0.12);
  transition: transform 0.14s ease, box-shadow 0.14s ease, filter 0.14s ease;
}

.object-block::before {
  content: '';
  position: absolute;
  top: 11%;
  left: 14%;
  width: 32%;
  height: 10%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
  opacity: 0.44;
}

.object-block__print {
  position: absolute;
  inset: var(--object-print-inset);
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 24%;
  background:
    radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0) 34%),
    linear-gradient(180deg, rgba(255, 251, 244, 0.08), rgba(255, 251, 244, 0.01)),
    rgba(104, 70, 41, 0.05);
  box-shadow:
    inset 0 1px 0 rgba(255, 249, 239, 0.18),
    inset 0 -10px 12px rgba(71, 44, 23, 0.06);
}

.object-block__print::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(
      135deg,
      rgba(92, 61, 35, 0.02) 0,
      rgba(92, 61, 35, 0.02) 4px,
      rgba(255, 255, 255, 0.02) 4px,
      rgba(255, 255, 255, 0.02) 8px
    ),
    linear-gradient(180deg, rgba(76, 48, 25, 0), rgba(76, 48, 25, 0.12));
  mix-blend-mode: multiply;
  opacity: 0.65;
  pointer-events: none;
}

.object-block__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 104%;
  height: 104%;
  position: relative;
  z-index: 1;
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
  font-size: var(--object-icon-size);
  line-height: 1;
  text-align: center;
  user-select: none;
  filter: saturate(0.9) contrast(0.98) brightness(0.98) drop-shadow(0 1px 0 rgba(255, 255, 255, 0.18));
  transform: translateY(-1%);
}

.object-block-button:focus-visible .object-block {
  outline: 3px solid rgba(255, 246, 230, 0.82);
  outline-offset: 8px;
}

.object-block-button:active .object-block {
  transform: translateY(3px);
  box-shadow:
    0 1px 0 rgba(62, 37, 19, 0.18),
    0 4px 0 rgba(62, 37, 19, 0.12),
    0 8px 12px rgba(51, 30, 15, 0.1),
    inset 0 1px 0 rgba(255, 246, 231, 0.14),
    inset 0 -8px 10px rgba(86, 52, 25, 0.1);
}

.object-block-button--reveal .object-block {
  box-shadow:
    0 0 0 10px rgba(var(--object-block-rgb), 0.1),
    0 2px 0 rgba(84, 54, 29, 0.34),
    0 8px 0 rgba(72, 46, 24, 0.26),
    0 18px 22px rgba(54, 33, 16, 0.22),
    inset 0 1px 0 rgba(255, 246, 231, 0.2),
    inset 0 -16px 18px rgba(86, 52, 25, 0.12);
}

.object-block-button--hit {
  z-index: 5;
  animation: shapeBlockFlyIn 0.6s cubic-bezier(0.22, 0.72, 0.18, 1) forwards;
}

.object-block-button--hit .object-block {
  filter: brightness(1.02) saturate(1.02);
}

.object-block-button--miss .object-block {
  animation: shapeBlockNudge 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 12px;
}

.target-display {
  display: flex;
  align-items: center;
  gap: 15px;
}

.target-label {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.target-sample {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.target-shape,
.target-icon {
  width: 60px;
  height: 60px;
  border-radius: 8px;
}

.target-icon {
  font-size: 48px;
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
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.stat .value {
  font-size: 20px;
  font-weight: 700;
  color: #333;
}

.stat .value.warning {
  color: #e74c3c;
}

.game-grid {
  display: grid;
  gap: 15px;
  margin-bottom: 20px;
}

.game-grid.grid-2x2 {
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 150px);
}

.game-grid.grid-3x3 {
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 120px);
}

.game-grid.grid-4x4 {
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, 110px);
  gap: 12px;
}

.game-grid.grid-4x4 .grid-item {
  min-height: 100px;
}

.game-grid.grid-4x4 .item-shape {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
}

.game-grid.grid-4x4 .item-icon {
  font-size: 36px;
}

.grid-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
}

.grid-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
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

.item-shape {
  width: 80px;
  height: 80px;
  border-radius: 8px;
  flex-shrink: 0;
}

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

.item-icon {
  font-size: 48px;
}

.game-result {
  text-align: center;
  padding: 40px;
}

.game-grid-container--color .game-result {
  width: min(100%, 920px);
  margin: auto;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 16px 28px rgba(83, 122, 188, 0.12);
  backdrop-filter: blur(16px);
}

.game-grid-container--shape .game-result {
  width: min(100%, 920px);
  margin: auto;
  border-radius: 30px;
  border: 1px solid rgba(123, 82, 44, 0.18);
  background:
    linear-gradient(180deg, rgba(212, 171, 120, 0.94), rgba(180, 128, 74, 0.96)),
    repeating-linear-gradient(
      -8deg,
      rgba(255, 235, 204, 0.14) 0,
      rgba(255, 235, 204, 0.14) 8px,
      rgba(122, 77, 39, 0.08) 8px,
      rgba(122, 77, 39, 0.08) 20px
    );
  box-shadow:
    0 16px 28px rgba(106, 69, 36, 0.14),
    inset 0 1px 0 rgba(255, 242, 219, 0.42);
}

.game-result h2 {
  margin-bottom: 30px;
  font-size: 32px;
  color: #2ecc71;
}

.game-grid-container--color .game-result h2 {
  color: #5a2f86;
}

.game-grid-container--shape .game-result h2 {
  color: #4a2d15;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 30px;
}

.result-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.result-item .label {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
}

.result-item .value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.game-grid-container--color .result-item .value {
  color: #533685;
}

.game-grid-container--shape .result-item .value {
  color: #4a2d15;
}

.btn-primary {
  padding: 12px 32px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.feedback {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 1000;
  transform: translate(-50%, -50%);
  padding: 20px 40px;
  border-radius: 12px;
  font-size: 24px;
  font-weight: 700;
  animation: fadeInOut 1s ease;
}

.feedback.success {
  color: white;
  background: #2ecc71;
}

.feedback.error {
  color: white;
  background: #e74c3c;
}

.game-grid-container--color .feedback.success {
  background: linear-gradient(135deg, #72d67d 0%, #44b96c 100%);
  box-shadow: 0 18px 30px rgba(68, 185, 108, 0.26);
}

.game-grid-container--color .feedback.error {
  background: linear-gradient(135deg, #ff9696 0%, #f05e7a 100%);
  box-shadow: 0 18px 30px rgba(240, 94, 122, 0.24);
}

.game-grid-container--shape .feedback.success {
  background: linear-gradient(135deg, #c98f4f 0%, #966133 100%);
  box-shadow: 0 18px 30px rgba(106, 69, 36, 0.22);
}

.game-grid-container--shape .feedback.error {
  background: linear-gradient(135deg, #b65c48 0%, #89402f 100%);
  box-shadow: 0 18px 30px rgba(106, 69, 36, 0.2);
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

@keyframes colorProgressShine {
  100% {
    transform: translateX(100%);
  }
}

@keyframes colorJellyBounce {
  0% {
    transform: translateY(0) scale(1);
  }
  30% {
    transform: translateY(-10px) scale(1.05, 0.95);
  }
  56% {
    transform: translateY(3px) scale(0.98, 1.02);
  }
  78% {
    transform: translateY(-4px) scale(1.01, 0.99);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes colorJellyShake {
  0%, 100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-14px);
  }
  40% {
    transform: translateX(12px);
  }
  60% {
    transform: translateX(-8px);
  }
  80% {
    transform: translateX(6px);
  }
}

@keyframes colorJellyGather {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  58% {
    opacity: 1;
    transform: translate(calc(var(--gather-x, 0px) * 0.72), calc(var(--gather-y, 0px) * 0.72)) scale(0.72);
  }
  100% {
    opacity: 0;
    transform: translate(var(--gather-x, 0px), var(--gather-y, 0px)) scale(0.18);
  }
}

@keyframes colorJellyFlash {
  0% {
    filter: brightness(1);
  }
  30% {
    filter: brightness(1.22);
  }
  100% {
    filter: brightness(0.95);
  }
}

@keyframes shapeGroovePulse {
  0% {
    box-shadow:
      inset 0 16px 24px rgba(17, 8, 4, 0.46),
      inset 0 -10px 18px rgba(255, 226, 186, 0.06);
  }
  50% {
    box-shadow:
      inset 0 16px 24px rgba(17, 8, 4, 0.5),
      inset 0 -10px 18px rgba(255, 226, 186, 0.14),
      0 0 0 8px rgba(255, 228, 184, 0.16);
  }
  100% {
    box-shadow:
      inset 0 16px 24px rgba(17, 8, 4, 0.46),
      inset 0 -10px 18px rgba(255, 226, 186, 0.06);
  }
}

@keyframes shapeBlockFlyIn {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  58% {
    opacity: 1;
    transform: translate(calc(var(--gather-x, 0px) * 0.78), calc(var(--gather-y, 0px) * 0.78)) scale(0.72);
  }
  82% {
    opacity: 1;
    transform: translate(calc(var(--gather-x, 0px) * 1.04), calc(var(--gather-y, 0px) * 1.04)) scale(0.48);
  }
  100% {
    opacity: 0;
    transform: translate(var(--gather-x, 0px), var(--gather-y, 0px)) scale(0.34);
  }
}

@keyframes shapeBlockLand {
  0% {
    transform: translateY(0) scale(1);
  }
  40% {
    transform: translateY(-3px) scale(1.02);
  }
  72% {
    transform: translateY(1px) scale(0.99);
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes shapeBlockNudge {
  0%, 100% {
    transform: translateX(0);
  }
  24% {
    transform: translateX(-8px);
  }
  48% {
    transform: translateX(7px);
  }
  72% {
    transform: translateX(-5px);
  }
}

@media (max-width: 980px) {
  .color-top-panel__row {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .color-top-panel__aside {
    justify-content: center;
  }

  .color-progress-strip {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .color-progress-track {
    width: 100%;
  }

  .shape-match-stage {
    flex-direction: column;
  }

  .sidebar {
    flex-basis: auto;
    min-width: 0;
    max-width: none;
  }

  .shape-target-copy p {
    max-width: none;
  }

  .object-sidebar__focus p {
    max-width: none;
  }

  .grid-container {
    width: min(100%, 62vh);
    height: min(100%, 62vh);
    max-width: min(100%, 62vh);
    max-height: 62vh;
  }
}

@media (max-width: 720px) {
  .color-top-panel {
    padding: 10px 12px;
    border-radius: 24px;
  }

  .color-target-inline {
    flex-wrap: wrap;
    gap: 8px;
  }

  .color-target-inline__label {
    width: 100%;
  }

  .result-stats {
    flex-wrap: wrap;
    gap: 18px;
  }

  .sidebar {
    padding: 18px;
    border-radius: 30px;
  }

  .object-sidebar__stats {
    grid-template-columns: 1fr;
  }

  .shape-board {
    border-radius: 28px;
  }

  .object-target-frame {
    min-height: clamp(176px, 32vh, 228px);
  }

  .shape-progress-engraving {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  .shape-progress-track {
    width: 100%;
  }

  .grid-container {
    width: min(100%, 52vh);
    height: min(100%, 52vh);
    max-width: min(100%, 52vh);
    max-height: 52vh;
  }
}

@media (max-width: 520px) {
  .color-chip {
    min-height: 36px;
    padding: 0 10px;
  }

  .color-chip span {
    font-size: 0.68rem;
  }

  .color-chip strong,
  .color-progress-strip__label,
  .color-progress-strip__value {
    font-size: 0.78rem;
  }

  .color-target-jelly {
    width: 56px;
    height: 56px;
    border-radius: 18px;
  }

  .feedback {
    width: calc(100vw - 40px);
    padding: 16px 20px;
    font-size: 20px;
    text-align: center;
  }

  .object-progress-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .shape-console__status,
  .shape-console__metrics {
    grid-template-columns: 1fr;
  }

  .wood-pill,
  .wood-sign {
    min-height: 64px;
    padding: 14px 16px 12px;
  }

  .shape-target-copy h2 {
    font-size: 1.2rem;
  }

  .shape-target-socket {
    min-height: 120px;
  }
}
</style>
