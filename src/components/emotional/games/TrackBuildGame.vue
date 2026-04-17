<template>
  <div class="track-build-game" :style="rootStyle">
    <div class="backdrop-layer" aria-hidden="true">
      <div class="glow-orb glow-orb--left"></div>
      <div class="glow-orb glow-orb--right"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="sparkle-dot"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <div class="hud-panel">
      <div class="hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.shortLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>线路进度</span>
        <strong>{{ completedLayoutLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>修补轨道</span>
        <strong>{{ repairProgressLabel }}</strong>
      </div>
      <div class="hud-card">
        <span>旋转调整</span>
        <strong>{{ rotationAdjustments }} 次</strong>
      </div>
    </div>

    <div class="stage-layout">
      <section class="play-stage">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ sessionTheme.title }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <article v-if="currentLayout" class="mission-card">
          <div class="mission-card__heading">
            <div>
              <span class="mission-card__chip">当前线路</span>
              <strong>{{ currentLayout.title }}</strong>
            </div>
            <p>{{ currentGoalLabel }}</p>
          </div>

          <p class="mission-card__description">{{ currentLayout.description }}</p>

          <div class="mission-card__clues">
            <span
              v-for="gap in currentLayout.gaps"
              :key="gap.id"
              :class="{ done: isGapFilled(gap.id) }"
            >
              {{ gap.label }}
            </span>
          </div>
        </article>

        <div class="repair-board">
          <article
            v-for="gap in currentLayout?.gaps || []"
            :key="gap.id"
            class="gap-card"
            :class="{
              'gap-card--filled': isGapFilled(gap.id),
              'gap-card--selectable': phase === 'playing' && !props.paused && !isGapFilled(gap.id),
            }"
            @click="handleGapClick(gap)"
          >
            <div class="gap-card__header">
              <span>缺口 {{ getGapIndexLabel(gap.id) }}</span>
              <strong>{{ gap.label }}</strong>
            </div>

            <div class="gap-card__preview">
              <div class="track-tile track-tile--ghost">
                <span class="track-tile__core"></span>
                <span
                  v-for="direction in getTrackDirections(gap.requiredType, gap.requiredRotation)"
                  :key="`${gap.id}-${direction}`"
                  class="track-tile__arm"
                  :class="`track-tile__arm--${direction}`"
                ></span>
              </div>

              <div v-if="getPlacedPiece(gap.id)" class="track-tile track-tile--placed">
                <span class="track-tile__core"></span>
                <span
                  v-for="direction in getTrackDirections(getPlacedPiece(gap.id)!.type, getPlacedPiece(gap.id)!.rotation)"
                  :key="`${gap.id}-placed-${direction}`"
                  class="track-tile__arm"
                  :class="`track-tile__arm--${direction}`"
                ></span>
              </div>

              <div v-else class="gap-card__placeholder">
                {{ selectedPiece ? '点击这里放置' : '先选轨道件' }}
              </div>
            </div>

            <div class="gap-card__footer">
              <strong>{{ isGapFilled(gap.id) ? '已接通' : gap.hint }}</strong>
              <span v-if="isGapFilled(gap.id)">{{ buildPieceCaption(getPlacedPiece(gap.id)!) }}</span>
              <span v-else>看清楚这里需要直着接还是转弯接。</span>
            </div>
          </article>
        </div>

        <section class="tray-panel">
          <div class="tray-panel__header">
            <div>
              <span class="tray-chip">轨道件托盘</span>
              <strong>{{ selectedPiece ? '已选中轨道件，先调方向再点缺口' : '先从托盘里选一块轨道件' }}</strong>
            </div>

            <div class="rotation-actions">
              <button
                class="rotation-button"
                type="button"
                :disabled="!canRotateSelected"
                @click="rotateSelectedPiece(-90)"
              >
                向左转
              </button>
              <button
                class="rotation-button"
                type="button"
                :disabled="!canRotateSelected"
                @click="rotateSelectedPiece(90)"
              >
                向右转
              </button>
            </div>
          </div>

          <div class="tray-grid">
            <button
              v-for="piece in trayPieces"
              :key="piece.id"
              class="piece-card"
              :class="{
                'piece-card--selected': selectedPieceId === piece.id,
              }"
              type="button"
              :disabled="phase !== 'playing' || props.paused"
              @click="selectPiece(piece.id)"
            >
              <div class="track-tile" :class="`track-tile--${piece.type}`">
                <span class="track-tile__core"></span>
                <span
                  v-for="direction in getTrackDirections(piece.type, piece.rotation)"
                  :key="`${piece.id}-${direction}`"
                  class="track-tile__arm"
                  :class="`track-tile__arm--${direction}`"
                ></span>
              </div>

              <div class="piece-card__copy">
                <strong>{{ piece.label }}</strong>
                <span>{{ getRotationLabel(piece.type, piece.rotation) }}</span>
              </div>
            </button>

            <div v-if="trayPieces.length === 0" class="piece-empty-state">
              这一条线路需要的轨道件已经都放上去了。
            </div>
          </div>
        </section>

        <div class="stage-footer">
          <div class="stage-footer__left">
            <strong>{{ fieldStatus }}</strong>
            <span>{{ helperMessage }}</span>
          </div>
          <div class="stage-footer__right">
            <span>错误放置 {{ wrongPlacements }} 次</span>
            <span>选取轨道件 {{ pieceSelections }} 次</span>
          </div>
        </div>
      </section>

      <aside class="instruction-panel">
        <div class="panel-tags">
          <span>精细动作</span>
          <span class="accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h2>轨道修补匠</h2>
        <p>{{ panelDescription }}</p>
        <small>{{ sessionTheme.helperLine }}</small>

        <div class="progress-block">
          <div class="progress-labels">
            <span>选轨道件</span>
            <span>转好方向</span>
            <span>点缺口放置</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: `${Math.round(completionRatio * 100)}%` }"></div>
          </div>
        </div>

        <div class="tip-grid">
          <div class="tip-card">
            <strong>当前线路</strong>
            <span>{{ currentLayout?.title || '准备中' }}</span>
          </div>
          <div class="tip-card">
            <strong>已选轨道件</strong>
            <span>{{ selectedPieceSummary }}</span>
          </div>
          <div class="tip-card">
            <strong>平均修补</strong>
            <span>{{ averagePlacementLabel }}</span>
          </div>
          <div class="tip-card">
            <strong>平均线路</strong>
            <span>{{ averageLayoutLabel }}</span>
          </div>
        </div>

        <div class="focus-card">
          <strong>本轮提示</strong>
          <p>{{ helperMessage }}</p>
        </div>

        <div class="selected-piece-panel">
          <div class="selected-piece-panel__header">
            <span>当前轨道件</span>
            <strong>{{ selectedPiece ? buildPieceCaption(selectedPiece) : '尚未选中' }}</strong>
          </div>

          <div v-if="selectedPiece" class="selected-piece-preview">
            <div class="track-tile track-tile--large" :class="`track-tile--${selectedPiece.type}`">
              <span class="track-tile__core"></span>
              <span
                v-for="direction in getTrackDirections(selectedPiece.type, selectedPiece.rotation)"
                :key="`selected-${direction}`"
                class="track-tile__arm"
                :class="`track-tile__arm--${direction}`"
              ></span>
            </div>
          </div>
        </div>

        <div class="action-row">
          <button
            v-if="phase === 'ready'"
            class="primary-action"
            type="button"
            @click="startRound"
          >
            开始修补轨道
          </button>

          <template v-else-if="phase === 'playing'">
            <button
              class="primary-action"
              type="button"
              @click="startRound"
            >
              换一条线路
            </button>
            <button
              class="secondary-action"
              type="button"
              :disabled="!selectedPiece || props.paused"
              @click="rotateSelectedPiece(90)"
            >
              再转一下当前轨道件
            </button>
          </template>

          <div v-else-if="phase === 'transitioning'" class="completion-note">
            这一条线路已经接通，正在准备下一条。
          </div>

          <div v-else class="completion-note">
            所有轨道都修好了，这一轮的记录正在保存。
          </div>
        </div>

        <p class="finish-note">
          本游戏采用替代控制：先选轨道件，再旋转方向，最后点击缺口放置；修完整轮后会自动保存。
        </p>
      </aside>
    </div>

    <transition name="badge-pop">
      <div v-if="showBadge" class="badge-modal">
        <div class="badge-icon">🛤️</div>
        <strong>轨道小工程师徽章</strong>
        <p>{{ sessionTheme.badgeCopy }}</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type {
  EmotionGameAudioController,
  EmotionGameCompletionPayload,
  EmotionGameDifficulty,
  EmotionGameSettings,
} from '@/types/emotional/games'

type Phase = 'ready' | 'playing' | 'transitioning' | 'celebrating' | 'finished'
type StatusTone = 'neutral' | 'gentle' | 'success'
type TrackPieceType = 'straight' | 'curve'
type Direction = 'top' | 'right' | 'bottom' | 'left'

interface DifficultyConfig {
  shortLabel: string
  introText: string
  readyDescription: string
  activeHint: string
  successText: string
  layoutCount: number
}

interface ThemeDefinition {
  key: string
  title: string
  background: string
  glow: string
  panelTint: string
  accent: string
  helperLine: string
  badgeCopy: string
}

interface GapDefinition {
  id: string
  label: string
  hint: string
  requiredType: TrackPieceType
  requiredRotation: number
}

interface LayoutTemplate {
  id: string
  title: string
  description: string
  helperLine: string
  gapsByDifficulty: Record<EmotionGameDifficulty, readonly GapDefinition[]>
}

interface SessionLayout {
  id: string
  title: string
  description: string
  helperLine: string
  gaps: GapDefinition[]
}

interface SessionPiece {
  id: string
  type: TrackPieceType
  rotation: number
  label: string
}

interface SparkleDot {
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
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  (e: 'complete', payload: EmotionGameCompletionPayload): void
}>()

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    shortLabel: '简单 · 两条短线',
    introText: '先从最短的线路开始，把断开的轨道一段段接回去。',
    readyDescription: '简单模式会给出 2 条短线路，每条只有 2 个缺口，先练习看方向和稳稳放置。',
    activeHint: '先选一块轨道件，再轻轻转方向，最后点到对应缺口上。',
    successText: '这些短短的轨道已经都接好了，小火车又可以稳稳往前走了。',
    layoutCount: 2,
  },
  2: {
    shortLabel: '中等 · 三条线路',
    introText: '这次会多一条线路，需要更稳定地看清每个缺口要怎么接。',
    readyDescription: '中等模式会给出 3 条线路，重点练习连续修补和更稳定的方向判断。',
    activeHint: '先判断这里要直着接还是拐弯接，再把轨道件转到合适方向。',
    successText: '三条线路都被你接通了，方向判断和手部控制都更稳了。',
    layoutCount: 3,
  },
  3: {
    shortLabel: '困难 · 缺口更多',
    introText: '困难模式里每条线路会有更多缺口，要继续保持慢一点、稳一点。',
    readyDescription: '困难模式会给出 3 条更长的线路，每条都有 3 个缺口，重点练习连续旋转与放置控制。',
    activeHint: '一次只盯住一个缺口，先转好，再放上去，不用着急。',
    successText: '更长的线路也已经被你一段段修好了，今天的手眼配合很稳定。',
    layoutCount: 3,
  },
}

const THEMES: readonly ThemeDefinition[] = [
  {
    key: 'sunrise-yard',
    title: '晨光轨道工坊',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.24), transparent 34%), linear-gradient(180deg, #d6ecff 0%, #f6f7e4 42%, #ffd8b8 100%)',
    glow: 'radial-gradient(circle, rgba(124, 174, 255, 0.48), rgba(124, 174, 255, 0))',
    panelTint: 'rgba(255, 255, 255, 0.58)',
    accent: '#4d7cff',
    helperLine: '先看缺口要直着接还是转弯接，再把轨道件轻轻放上去。',
    badgeCopy: '晨光下的线路都修好了，小火车已经可以顺顺地开过去了。',
  },
  {
    key: 'mint-station',
    title: '薄荷站台',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.24), transparent 34%), linear-gradient(180deg, #d8fff1 0%, #eefcf7 36%, #ffe4c4 100%)',
    glow: 'radial-gradient(circle, rgba(111, 214, 184, 0.42), rgba(111, 214, 184, 0))',
    panelTint: 'rgba(255, 255, 255, 0.62)',
    accent: '#2f9f84',
    helperLine: '缺口不需要一次全看完，先修好眼前这一段，再去下一段。',
    badgeCopy: '薄荷站台前的轨道已经重新连上了，今天的修补动作很稳。',
  },
  {
    key: 'amber-depot',
    title: '琥珀机务段',
    background: 'radial-gradient(circle at top, rgba(255,255,255,0.22), transparent 34%), linear-gradient(180deg, #e6ebff 0%, #fff0d4 42%, #ffd0bd 100%)',
    glow: 'radial-gradient(circle, rgba(255, 184, 118, 0.38), rgba(255, 184, 118, 0))',
    panelTint: 'rgba(255, 255, 255, 0.62)',
    accent: '#d07b2f',
    helperLine: '看准方向后再放上去，轨道会更容易一次就接对。',
    badgeCopy: '机务段里的每一段轨道都被你修好了，整条线路又亮了起来。',
  },
]

const LAYOUTS: readonly LayoutTemplate[] = [
  {
    id: 'garden-loop',
    title: '花园环线',
    description: '花坛旁边的轨道断开了，小火车要绕着花园慢慢开过去。',
    helperLine: '看看缺口附近是直着过去，还是要在花坛边转一个弯。',
    gapsByDifficulty: {
      1: [
        {
          id: 'garden-a',
          label: '花坛前直线',
          hint: '这里需要一段横向直轨，把前后两边稳稳接起来。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'garden-b',
          label: '喷泉边转角',
          hint: '这里需要一块转弯轨道，把轨道从右侧引到下方。',
          requiredType: 'curve',
          requiredRotation: 90,
        },
      ],
      2: [
        {
          id: 'garden-a',
          label: '花坛前直线',
          hint: '这里需要一段横向直轨，把前后两边稳稳接起来。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'garden-b',
          label: '喷泉边转角',
          hint: '这里需要一块转弯轨道，把轨道从右侧引到下方。',
          requiredType: 'curve',
          requiredRotation: 90,
        },
      ],
      3: [
        {
          id: 'garden-a',
          label: '花坛前直线',
          hint: '这里需要一段横向直轨，把前后两边稳稳接起来。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'garden-b',
          label: '喷泉边转角',
          hint: '这里需要一块转弯轨道，把轨道从右侧引到下方。',
          requiredType: 'curve',
          requiredRotation: 90,
        },
        {
          id: 'garden-c',
          label: '花棚后侧立轨',
          hint: '这一段要竖着接，让轨道从上面一路连到下面。',
          requiredType: 'straight',
          requiredRotation: 90,
        },
      ],
    },
  },
  {
    id: 'river-bridge',
    title: '河畔桥线',
    description: '桥边有几段轨道松开了，需要重新把转弯和立轨接回去。',
    helperLine: '桥边的轨道更容易看错方向，放之前先确认是不是要转弯。',
    gapsByDifficulty: {
      1: [
        {
          id: 'river-a',
          label: '桥头转角',
          hint: '这里要把轨道从下方接到左侧，需要一块左下弯轨。',
          requiredType: 'curve',
          requiredRotation: 180,
        },
        {
          id: 'river-b',
          label: '河边立轨',
          hint: '这里是一段竖着的直轨，先别急着横放。',
          requiredType: 'straight',
          requiredRotation: 90,
        },
      ],
      2: [
        {
          id: 'river-a',
          label: '桥头转角',
          hint: '这里要把轨道从下方接到左侧，需要一块左下弯轨。',
          requiredType: 'curve',
          requiredRotation: 180,
        },
        {
          id: 'river-b',
          label: '河边立轨',
          hint: '这里是一段竖着的直轨，先别急着横放。',
          requiredType: 'straight',
          requiredRotation: 90,
        },
      ],
      3: [
        {
          id: 'river-a',
          label: '桥头转角',
          hint: '这里要把轨道从下方接到左侧，需要一块左下弯轨。',
          requiredType: 'curve',
          requiredRotation: 180,
        },
        {
          id: 'river-b',
          label: '河边立轨',
          hint: '这里是一段竖着的直轨，先别急着横放。',
          requiredType: 'straight',
          requiredRotation: 90,
        },
        {
          id: 'river-c',
          label: '桥尾转角',
          hint: '这一段要从上方转到右边，记得把弯轨转到上右方向。',
          requiredType: 'curve',
          requiredRotation: 0,
        },
      ],
    },
  },
  {
    id: 'sunrise-depot',
    title: '朝阳机务段',
    description: '机务段门口还有几段轨道没接好，要先修完才能发车。',
    helperLine: '机务段的缺口更多，可以一次只修一段，慢慢来。',
    gapsByDifficulty: {
      1: [
        {
          id: 'depot-a',
          label: '库门前直轨',
          hint: '这里要横着接一段直轨，让轨道顺顺地穿过库门。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'depot-b',
          label: '调车口转角',
          hint: '这里需要把轨道从左侧带到上方，要用左上弯轨。',
          requiredType: 'curve',
          requiredRotation: 270,
        },
      ],
      2: [
        {
          id: 'depot-a',
          label: '库门前直轨',
          hint: '这里要横着接一段直轨，让轨道顺顺地穿过库门。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'depot-b',
          label: '调车口转角',
          hint: '这里需要把轨道从左侧带到上方，要用左上弯轨。',
          requiredType: 'curve',
          requiredRotation: 270,
        },
      ],
      3: [
        {
          id: 'depot-a',
          label: '库门前直轨',
          hint: '这里要横着接一段直轨，让轨道顺顺地穿过库门。',
          requiredType: 'straight',
          requiredRotation: 0,
        },
        {
          id: 'depot-b',
          label: '调车口转角',
          hint: '这里需要把轨道从左侧带到上方，要用左上弯轨。',
          requiredType: 'curve',
          requiredRotation: 270,
        },
        {
          id: 'depot-c',
          label: '发车口转角',
          hint: '这一段要从右边拐到下方，需要一块右下弯轨。',
          requiredType: 'curve',
          requiredRotation: 90,
        },
      ],
    },
  },
]

const sparkles: SparkleDot[] = Array.from({ length: 16 }, (_, index) => ({
  id: index + 1,
  left: 6 + (index * 91) % 88,
  top: 8 + (index * 47) % 74,
  size: 6 + (index % 4) * 2,
  delay: (index % 6) * 0.6,
}))

const phase = ref<Phase>('ready')
const statusTone = ref<StatusTone>('neutral')
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const sessionTheme = ref<ThemeDefinition>(THEMES[0]!)
const sessionLayouts = ref<SessionLayout[]>([])
const currentLayoutIndex = ref(0)
const trayPieces = ref<SessionPiece[]>([])
const placedPiecesByGapId = ref<Record<string, SessionPiece>>({})
const selectedPieceId = ref<string | null>(null)
const stageMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].introText)
const helperMessage = ref(DIFFICULTY_CONFIGS[props.difficulty].activeHint)
const showBadge = ref(false)
const correctPlacements = ref(0)
const wrongPlacements = ref(0)
const rotationAdjustments = ref(0)
const pieceSelections = ref(0)
const placementTimesMs = ref<number[]>([])
const layoutDurationsMs = ref<number[]>([])
const completedLayoutTitles = ref<string[]>([])
const placedPieceLabels = ref<string[]>([])

let roundDirty = false
let hasCompleted = false
let themeCursor = 0
let layoutStartedAt = 0
let lastCorrectPlacementAt = 0
const timers: number[] = []

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const currentLayout = computed(() => sessionLayouts.value[currentLayoutIndex.value] || null)
const selectedPiece = computed(() => trayPieces.value.find((piece) => piece.id === selectedPieceId.value) || null)
const totalTargetGapCount = computed(() => {
  return sessionLayouts.value.reduce((total, layout) => total + layout.gaps.length, 0)
})
const completionRatio = computed(() => {
  if (totalTargetGapCount.value <= 0) {
    return 0
  }

  return Math.max(0, Math.min(1, correctPlacements.value / totalTargetGapCount.value))
})
const completedLayoutLabel = computed(() => {
  if (sessionLayouts.value.length <= 0) {
    return '-'
  }

  return `${completedLayoutTitles.value.length}/${sessionLayouts.value.length} 条`
})
const repairProgressLabel = computed(() => {
  if (totalTargetGapCount.value <= 0) {
    return '-'
  }

  return `${correctPlacements.value}/${totalTargetGapCount.value} 段`
})
const currentGoalLabel = computed(() => {
  if (!currentLayout.value) {
    return '准备开始本轮修补'
  }

  const filledCount = Object.keys(placedPiecesByGapId.value).length
  return `已修 ${filledCount}/${currentLayout.value.gaps.length} 个缺口`
})
const panelDescription = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }

  return difficultyConfig.value.readyDescription
})
const selectedPieceSummary = computed(() => {
  if (!selectedPiece.value) {
    return '先选一块轨道件'
  }

  return buildPieceCaption(selectedPiece.value)
})
const averagePlacementLabel = computed(() => formatResponseTime(averageNumberList(placementTimesMs.value)))
const averageLayoutLabel = computed(() => formatResponseTime(averageNumberList(layoutDurationsMs.value)))
const fieldStatus = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return '整轮轨道都已经接通了'
  }

  if (phase.value === 'transitioning') {
    return '正在切换到下一条线路'
  }

  if (selectedPiece.value) {
    return `当前选中：${buildPieceCaption(selectedPiece.value)}`
  }

  return '先从下方托盘选择一块轨道件'
})
const canRotateSelected = computed(() => {
  return phase.value === 'playing' && !props.paused && !!selectedPiece.value
})
const rootStyle = computed(() => ({
  '--track-background': sessionTheme.value.background,
  '--track-glow': sessionTheme.value.glow,
  '--track-panel-tint': sessionTheme.value.panelTint,
  '--track-accent': sessionTheme.value.accent,
}))

function scheduleTimeout(callback: () => void, delay: number) {
  const timer = window.setTimeout(() => {
    const index = timers.indexOf(timer)
    if (index >= 0) {
      timers.splice(index, 1)
    }
    callback()
  }, delay)

  timers.push(timer)
}

function clearAllTimers() {
  timers.splice(0).forEach((timer) => window.clearTimeout(timer))
}

function averageNumberList(values: number[]) {
  const normalized = values.filter((value) => Number.isFinite(value) && value >= 0)
  if (normalized.length === 0) {
    return 0
  }

  return normalized.reduce((sum, value) => sum + value, 0) / normalized.length
}

function formatResponseTime(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '-'
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`
  }

  return `${(ms / 1000).toFixed(1)}秒`
}

function shuffleArray<T>(items: readonly T[]): T[] {
  const next = [...items]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = next[index]
    next[index] = next[swapIndex] as T
    next[swapIndex] = current as T
  }

  return next
}

function normalizeRotation(rotation: number) {
  const normalized = rotation % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function normalizePieceRotation(type: TrackPieceType, rotation: number) {
  const normalized = normalizeRotation(rotation)
  if (type === 'straight') {
    return normalized % 180 === 0 ? 0 : 90
  }

  return normalized
}

function getTrackDirections(type: TrackPieceType, rotation: number): Direction[] {
  const normalized = normalizePieceRotation(type, rotation)

  if (type === 'straight') {
    return normalized === 0 ? ['left', 'right'] : ['top', 'bottom']
  }

  switch (normalized) {
    case 0:
      return ['top', 'right']
    case 90:
      return ['right', 'bottom']
    case 180:
      return ['bottom', 'left']
    default:
      return ['left', 'top']
  }
}

function getRotationLabel(type: TrackPieceType, rotation: number) {
  const normalized = normalizePieceRotation(type, rotation)

  if (type === 'straight') {
    return normalized === 0 ? '横向' : '纵向'
  }

  switch (normalized) {
    case 0:
      return '上右弯'
    case 90:
      return '右下弯'
    case 180:
      return '下左弯'
    default:
      return '左上弯'
  }
}

function buildPieceCaption(piece: SessionPiece) {
  return `${piece.label} · ${getRotationLabel(piece.type, piece.rotation)}`
}

function getPieceTypeLabel(type: TrackPieceType) {
  return type === 'straight' ? '直轨' : '弯轨'
}

function randomRotationForType(type: TrackPieceType) {
  if (type === 'straight') {
    return Math.random() > 0.5 ? 0 : 90
  }

  const rotations = [0, 90, 180, 270]
  return rotations[Math.floor(Math.random() * rotations.length)]!
}

function pickNextTheme() {
  const theme = THEMES[themeCursor % THEMES.length]!
  themeCursor += 1
  sessionTheme.value = theme
}

function buildLayoutSet(difficulty: EmotionGameDifficulty): SessionLayout[] {
  return shuffleArray(LAYOUTS)
    .slice(0, DIFFICULTY_CONFIGS[difficulty].layoutCount)
    .map((layout) => ({
      id: layout.id,
      title: layout.title,
      description: layout.description,
      helperLine: layout.helperLine,
      gaps: layout.gapsByDifficulty[difficulty].map((gap) => ({ ...gap })),
    }))
}

function createTrayPieces(gaps: GapDefinition[]) {
  return shuffleArray(
    gaps.map((gap, index) => ({
      id: `${gap.id}-${index}`,
      type: gap.requiredType,
      rotation: randomRotationForType(gap.requiredType),
      label: getPieceTypeLabel(gap.requiredType),
    })),
  )
}

function markRoundDirtyOnce() {
  if (roundDirty) {
    return
  }

  roundDirty = true
  props.markRoundDirty?.()
}

function startAmbientIfNeeded() {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // ignore audio setup failures
  })
}

function playSoftCue() {
  if (!props.settings.effectsEnabled) {
    return
  }

  props.audio.playSoftBounce().catch(() => {
    // ignore cue failures
  })
}

function playSuccessCue(line?: string) {
  if (!props.settings.effectsEnabled) {
    return
  }

  Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => {
      if (line) {
        props.audio.speak(line)
      }
    }),
  ])
}

function primeSession(difficulty: EmotionGameDifficulty) {
  clearAllTimers()
  props.audio.stopAmbient()
  props.audio.stopAll()

  activeDifficulty.value = difficulty
  phase.value = 'ready'
  statusTone.value = 'neutral'
  sessionLayouts.value = buildLayoutSet(difficulty)
  currentLayoutIndex.value = 0
  trayPieces.value = []
  placedPiecesByGapId.value = {}
  selectedPieceId.value = null
  showBadge.value = false
  correctPlacements.value = 0
  wrongPlacements.value = 0
  rotationAdjustments.value = 0
  pieceSelections.value = 0
  placementTimesMs.value = []
  layoutDurationsMs.value = []
  completedLayoutTitles.value = []
  placedPieceLabels.value = []
  roundDirty = false
  hasCompleted = false
  layoutStartedAt = 0
  lastCorrectPlacementAt = 0
  stageMessage.value = DIFFICULTY_CONFIGS[difficulty].introText
  helperMessage.value = DIFFICULTY_CONFIGS[difficulty].activeHint
  pickNextTheme()
}

function prepareCurrentLayout() {
  const layout = currentLayout.value
  if (!layout) {
    return
  }

  trayPieces.value = createTrayPieces(layout.gaps)
  placedPiecesByGapId.value = {}
  selectedPieceId.value = null
  layoutStartedAt = Date.now()
  lastCorrectPlacementAt = layoutStartedAt
  statusTone.value = 'neutral'
  stageMessage.value = `先看《${layout.title}》哪里断开了，再选合适的轨道件。`
  helperMessage.value = layout.helperLine
}

function startRound() {
  primeSession(props.difficulty)
  prepareCurrentLayout()
  phase.value = 'playing'
  markRoundDirtyOnce()
  startAmbientIfNeeded()
}

function getGapIndexLabel(gapId: string) {
  const index = currentLayout.value?.gaps.findIndex((gap) => gap.id === gapId) ?? -1
  return index >= 0 ? `${index + 1}` : '-'
}

function getPlacedPiece(gapId: string) {
  return placedPiecesByGapId.value[gapId] || null
}

function isGapFilled(gapId: string) {
  return Boolean(getPlacedPiece(gapId))
}

function selectPiece(pieceId: string) {
  if (phase.value !== 'playing' || props.paused) {
    return
  }

  markRoundDirtyOnce()
  pieceSelections.value += 1
  selectedPieceId.value = pieceId
  statusTone.value = 'neutral'
  stageMessage.value = '轨道件已经选好了，先转好方向，再点缺口放上去。'
  helperMessage.value = '如果方向还不对，可以继续按向左转或向右转。'
}

function rotateSelectedPiece(delta: number) {
  const piece = selectedPiece.value
  if (!piece || phase.value !== 'playing' || props.paused) {
    return
  }

  markRoundDirtyOnce()
  rotationAdjustments.value += 1
  trayPieces.value = trayPieces.value.map((candidate) => {
    if (candidate.id !== piece.id) {
      return candidate
    }

    return {
      ...candidate,
      rotation: normalizePieceRotation(candidate.type, candidate.rotation + delta),
    }
  })

  statusTone.value = 'neutral'
  stageMessage.value = '这块轨道件已经转好了，再看看能不能和缺口对上。'
  helperMessage.value = '方向合适后，点击对应的缺口就可以放置。'
  playSoftCue()
}

function isPieceMatchGap(piece: SessionPiece, gap: GapDefinition) {
  return piece.type === gap.requiredType
    && normalizePieceRotation(piece.type, piece.rotation) === normalizePieceRotation(gap.requiredType, gap.requiredRotation)
}

function finishCurrentLayout() {
  const layout = currentLayout.value
  if (!layout) {
    return
  }

  const now = Date.now()
  layoutDurationsMs.value = [...layoutDurationsMs.value, Math.max(0, now - layoutStartedAt)]
  completedLayoutTitles.value = [...completedLayoutTitles.value, layout.title]

  if (completedLayoutTitles.value.length >= sessionLayouts.value.length) {
    finishSession()
    return
  }

  phase.value = 'transitioning'
  statusTone.value = 'success'
  stageMessage.value = `《${layout.title}》已经接通，准备下一条线路。`
  helperMessage.value = '先休息一下，下一条线路会马上送过来。'

  scheduleTimeout(() => {
    currentLayoutIndex.value += 1
    prepareCurrentLayout()
    phase.value = 'playing'
  }, 980)
}

function handleGapClick(gap: GapDefinition) {
  if (phase.value !== 'playing' || props.paused || isGapFilled(gap.id)) {
    return
  }

  const piece = selectedPiece.value
  if (!piece) {
    statusTone.value = 'gentle'
    stageMessage.value = '先从下方托盘选一块轨道件。'
    helperMessage.value = gap.hint
    playSoftCue()
    return
  }

  markRoundDirtyOnce()

  if (!isPieceMatchGap(piece, gap)) {
    wrongPlacements.value += 1
    statusTone.value = 'gentle'
    stageMessage.value = `${piece.label} 还没有和「${gap.label}」对齐。`
    helperMessage.value = gap.hint
    playSoftCue()
    return
  }

  const now = Date.now()
  correctPlacements.value += 1
  placementTimesMs.value = [...placementTimesMs.value, Math.max(0, now - lastCorrectPlacementAt)]
  lastCorrectPlacementAt = now
  placedPieceLabels.value = [...placedPieceLabels.value, buildPieceCaption(piece)]
  placedPiecesByGapId.value = {
    ...placedPiecesByGapId.value,
    [gap.id]: { ...piece },
  }
  trayPieces.value = trayPieces.value.filter((candidate) => candidate.id !== piece.id)
  selectedPieceId.value = null
  statusTone.value = 'success'
  stageMessage.value = `${gap.label} 已经接通，小火车可以继续往前。`
  helperMessage.value = '继续看看下一处缺口需要直着接，还是转弯接。'
  playSuccessCue(`${gap.label} 接好了。`)

  if (Object.keys(placedPiecesByGapId.value).length >= (currentLayout.value?.gaps.length || 0)) {
    finishCurrentLayout()
  }
}

function buildPerformanceData() {
  return {
    correct_placements: correctPlacements.value,
    target_gap_count: totalTargetGapCount.value,
    completed_layout_count: completedLayoutTitles.value.length,
    target_layout_count: sessionLayouts.value.length,
    wrong_placements: wrongPlacements.value,
    rotation_adjustments: rotationAdjustments.value,
    piece_selections: pieceSelections.value,
    placement_times_ms: [...placementTimesMs.value],
    average_placement_ms: Math.round(averageNumberList(placementTimesMs.value)),
    layout_durations_ms: [...layoutDurationsMs.value],
    average_layout_ms: Math.round(averageNumberList(layoutDurationsMs.value)),
    layout_titles: sessionLayouts.value.map((layout) => layout.title),
    completed_layout_titles: [...completedLayoutTitles.value],
    placed_piece_labels: [...placedPieceLabels.value],
    session_theme_key: sessionTheme.value.key,
    session_theme_title: sessionTheme.value.title,
    control_mode: 'select_rotate_place',
    difficulty_level: activeDifficulty.value,
  }
}

function finishSession() {
  if (phase.value === 'celebrating' || phase.value === 'finished' || hasCompleted) {
    return
  }

  hasCompleted = true
  clearAllTimers()
  props.audio.stopAmbient()
  props.audio.stopAll()
  phase.value = 'celebrating'
  showBadge.value = true
  statusTone.value = 'success'
  stageMessage.value = '所有断开的轨道都已经修好了。'
  helperMessage.value = sessionTheme.value.badgeCopy
  playSuccessCue('整条线路已经接通了。')

  scheduleTimeout(() => {
    phase.value = 'finished'
    emit('complete', {
      performanceData: buildPerformanceData(),
    })
  }, 920)

  scheduleTimeout(() => {
    if (!props.paused) {
      primeSession(activeDifficulty.value)
    }
  }, 2800)
}

watch(() => props.difficulty, (nextDifficulty) => {
  primeSession(nextDifficulty)
})

watch(() => props.paused, (paused) => {
  if (paused) {
    props.audio.stopAmbient()
    return
  }

  if (phase.value === 'playing') {
    startAmbientIfNeeded()
  }
})

onBeforeUnmount(() => {
  clearAllTimers()
  props.audio.stopAmbient()
  props.audio.stopAll()
})

primeSession(props.difficulty)
</script>

<style scoped>
.track-build-game {
  position: relative;
  min-height: calc(100vh - 88px);
  padding: 28px;
  overflow: hidden;
  background: var(--track-background);
  color: #1f3044;
}

.backdrop-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.glow-orb {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 999px;
  background: var(--track-glow);
  filter: blur(10px);
  opacity: 0.92;
}

.glow-orb--left {
  top: -88px;
  left: -64px;
}

.glow-orb--right {
  right: -48px;
  bottom: -92px;
}

.sparkle-dot {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.64);
  animation: sparkle-float 5.4s ease-in-out infinite;
}

.hud-panel {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.hud-card,
.mission-card,
.tray-panel,
.instruction-panel,
.gap-card,
.selected-piece-panel {
  background: var(--track-panel-tint);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 18px 42px rgba(69, 96, 136, 0.14);
}

.hud-card {
  border-radius: 22px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hud-card span {
  font-size: 13px;
  color: #60748a;
}

.hud-card strong {
  font-size: 22px;
  color: #1d2b3b;
}

.stage-layout {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.88fr);
  gap: 24px;
  margin-top: 22px;
}

.play-stage {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.status-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.54);
  box-shadow: 0 14px 32px rgba(64, 92, 132, 0.12);
}

.status-strip span {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #63778a;
}

.status-strip strong {
  font-size: 20px;
  color: #213246;
}

.status-strip[data-tone='gentle'] {
  background: rgba(255, 245, 228, 0.84);
}

.status-strip[data-tone='success'] {
  background: rgba(232, 255, 243, 0.82);
}

.mission-card {
  border-radius: 26px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.mission-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
}

.mission-card__heading strong {
  display: block;
  font-size: 24px;
  color: #1f3044;
  margin-top: 6px;
}

.mission-card__heading p {
  margin: 0;
  font-size: 14px;
  color: #66798c;
  white-space: nowrap;
}

.mission-card__chip,
.tray-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(77, 124, 255, 0.12);
  color: var(--track-accent);
  font-size: 12px;
  font-weight: 700;
}

.mission-card__description {
  margin: 0;
  color: #495f74;
  line-height: 1.6;
}

.mission-card__clues {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.mission-card__clues span {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  color: #53687d;
}

.mission-card__clues span.done {
  background: rgba(90, 196, 128, 0.16);
  color: #2b7e4b;
}

.repair-board {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.gap-card {
  border-radius: 24px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 280px;
}

.gap-card--selectable {
  cursor: pointer;
}

.gap-card--filled {
  background: rgba(240, 255, 247, 0.9);
}

.gap-card__header,
.tray-panel__header,
.selected-piece-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.gap-card__header span,
.tray-panel__header span,
.selected-piece-panel__header span {
  font-size: 12px;
  color: #708398;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.gap-card__header strong,
.tray-panel__header strong,
.selected-piece-panel__header strong {
  display: block;
  color: #1f3044;
  font-size: 18px;
  margin-top: 6px;
}

.gap-card__preview {
  flex: 1;
  min-height: 134px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(240,247,255,0.92) 100%);
  border: 1px dashed rgba(89, 116, 154, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.gap-card__placeholder {
  position: absolute;
  bottom: 14px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: #6a7f94;
  font-size: 12px;
}

.gap-card__footer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gap-card__footer strong {
  font-size: 15px;
  color: #2a3d52;
}

.gap-card__footer span {
  color: #6a7e92;
  line-height: 1.5;
}

.track-tile {
  position: relative;
  width: 116px;
  height: 116px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(35, 50, 72, 0.1) 0%, rgba(35, 50, 72, 0.04) 100%);
}

.track-tile__core {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: #46576d;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 0 10px rgba(250, 199, 104, 0.16);
}

.track-tile__arm {
  position: absolute;
  background: linear-gradient(180deg, #566980 0%, #7f93a8 100%);
  border-radius: 999px;
}

.track-tile__arm--top,
.track-tile__arm--bottom {
  left: 50%;
  width: 22px;
  height: 42px;
  transform: translateX(-50%);
}

.track-tile__arm--top {
  top: 8px;
}

.track-tile__arm--bottom {
  bottom: 8px;
}

.track-tile__arm--left,
.track-tile__arm--right {
  top: 50%;
  width: 42px;
  height: 22px;
  transform: translateY(-50%);
}

.track-tile__arm--left {
  left: 8px;
}

.track-tile__arm--right {
  right: 8px;
}

.track-tile--ghost {
  opacity: 0.24;
}

.track-tile--placed {
  background: linear-gradient(180deg, rgba(90, 196, 128, 0.18) 0%, rgba(90, 196, 128, 0.1) 100%);
  box-shadow: 0 14px 28px rgba(48, 118, 76, 0.16);
}

.track-tile--large {
  width: 130px;
  height: 130px;
}

.tray-panel,
.instruction-panel,
.selected-piece-panel {
  border-radius: 26px;
  padding: 20px 22px;
}

.tray-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rotation-actions {
  display: flex;
  gap: 10px;
}

.rotation-button,
.secondary-action,
.piece-card,
.primary-action {
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.rotation-button,
.secondary-action {
  border: none;
  border-radius: 16px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.92);
  color: #32485c;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(70, 96, 138, 0.12);
}

.rotation-button:disabled,
.secondary-action:disabled,
.primary-action:disabled,
.piece-card:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.rotation-button:not(:disabled):hover,
.secondary-action:not(:disabled):hover,
.primary-action:not(:disabled):hover,
.piece-card:not(:disabled):hover {
  transform: translateY(-1px);
}

.tray-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.piece-card {
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.84);
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.piece-card--selected {
  border-color: rgba(77, 124, 255, 0.64);
  box-shadow: 0 16px 32px rgba(77, 124, 255, 0.16);
}

.piece-card .track-tile {
  width: 92px;
  height: 92px;
}

.piece-card__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}

.piece-card__copy strong {
  color: #24374c;
}

.piece-card__copy span,
.piece-empty-state {
  color: #6c8094;
  font-size: 13px;
  line-height: 1.5;
}

.piece-empty-state {
  grid-column: 1 / -1;
  padding: 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
}

.stage-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 18px 20px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.56);
}

.stage-footer__left,
.stage-footer__right {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stage-footer__left strong,
.instruction-panel h2,
.focus-card strong {
  color: #203245;
}

.stage-footer__left span,
.stage-footer__right span,
.instruction-panel p,
.instruction-panel small,
.focus-card p,
.finish-note {
  color: #677c91;
  line-height: 1.6;
}

.instruction-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.panel-tags span {
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.74);
  color: #516579;
  font-size: 12px;
  font-weight: 700;
}

.panel-tags .accent {
  color: var(--track-accent);
  background: rgba(77, 124, 255, 0.12);
}

.instruction-panel h2 {
  margin: 0;
  font-size: 32px;
}

.instruction-panel p,
.instruction-panel small {
  margin: 0;
}

.progress-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: #6d8093;
}

.progress-track {
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #5aa6ff 0%, #7ad4b6 48%, #ffd27b 100%);
}

.tip-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.tip-card,
.focus-card {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.76);
  border: 1px solid rgba(255, 255, 255, 0.54);
}

.tip-card strong,
.focus-card strong {
  display: block;
  margin-bottom: 6px;
}

.tip-card span {
  color: #5c7389;
  line-height: 1.5;
}

.selected-piece-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 10px;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.primary-action {
  border: none;
  border-radius: 18px;
  padding: 14px 18px;
  background: linear-gradient(135deg, #5a8fff 0%, #62c3c3 100%);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 18px 28px rgba(77, 124, 255, 0.22);
}

.completion-note {
  padding: 14px 16px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  color: #5e7286;
  line-height: 1.6;
}

.badge-modal {
  position: fixed;
  left: 50%;
  bottom: 36px;
  transform: translateX(-50%);
  width: min(360px, calc(100vw - 32px));
  padding: 22px 24px;
  border-radius: 24px;
  background: rgba(30, 45, 63, 0.92);
  color: #f7fbff;
  box-shadow: 0 24px 44px rgba(29, 42, 61, 0.26);
  text-align: center;
  z-index: 20;
}

.badge-icon {
  font-size: 40px;
  margin-bottom: 10px;
}

.badge-modal strong {
  display: block;
  font-size: 22px;
  margin-bottom: 8px;
}

.badge-modal p {
  margin: 0;
  color: rgba(247, 251, 255, 0.82);
  line-height: 1.6;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px);
}

@keyframes sparkle-float {
  0%,
  100% {
    transform: translateY(0);
    opacity: 0.28;
  }
  50% {
    transform: translateY(-8px);
    opacity: 0.84;
  }
}

@media (max-width: 1200px) {
  .stage-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .hud-panel,
  .repair-board,
  .tray-grid,
  .tip-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .track-build-game {
    padding: 18px;
  }

  .hud-panel,
  .repair-board,
  .tray-grid,
  .tip-grid {
    grid-template-columns: 1fr;
  }

  .status-strip,
  .mission-card__heading,
  .tray-panel__header,
  .selected-piece-panel__header,
  .stage-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .rotation-actions,
  .action-row {
    width: 100%;
  }

  .rotation-button,
  .primary-action,
  .secondary-action {
    flex: 1;
  }
}
</style>
