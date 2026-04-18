<template>
  <div class="prototype-game mood-meter-game" :style="themeStyle">
    <div class="prototype-game__backdrop" aria-hidden="true">
      <div class="prototype-game__glow prototype-game__glow--left mood-meter-game__glow"></div>
      <div class="prototype-game__glow prototype-game__glow--right mood-meter-game__glow mood-meter-game__glow--alt"></div>
      <span
        v-for="sparkle in sparkles"
        :key="sparkle.id"
        class="prototype-game__sparkle"
        :style="{
          left: `${sparkle.left}%`,
          top: `${sparkle.top}%`,
          width: `${sparkle.size}px`,
          height: `${sparkle.size}px`,
          animationDelay: `${sparkle.delay}s`,
        }"
      />
    </div>

    <section class="prototype-game__hud">
      <article class="prototype-game__hud-card">
        <span>当前难度</span>
        <strong>{{ difficultyConfig.label }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>完成进度</span>
        <strong>{{ progressLabel }}</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>提示次数</span>
        <strong>{{ promptCount }} 次</strong>
      </article>
      <article class="prototype-game__hud-card">
        <span>当前选择</span>
        <strong>{{ selectedMood?.label || '等待开始' }}</strong>
      </article>
    </section>

    <section class="prototype-game__layout">
      <article class="prototype-game__stage prototype-game__surface">
        <div class="prototype-game__status">
          <span class="prototype-game__eyebrow">{{ stageEyebrow }}</span>
          <strong>{{ stageTitle }}</strong>
          <span class="prototype-game__helper">{{ helperMessage }}</span>
        </div>

        <section v-if="phase === 'ready'" class="mood-meter-game__intro">
          <div class="mood-meter-game__stage-board mood-meter-game__stage-board--intro">
            <div class="mood-meter-game__section-head mood-meter-game__section-head--compact">
              <div>
                <span class="mood-meter-game__section-kicker">情绪主舞台</span>
                <strong>先认识情绪角色、温度计和安抚卡</strong>
              </div>
              <small>主视觉已经切到正式 SVG，舞台会跟着心情、温度和安抚卡变化。</small>
            </div>

            <div class="mood-meter-game__stage-scene mood-meter-game__stage-scene--intro">
              <MoodMeterStageArt
                preview
                focus-area="thermometer"
                :thermometer-zone-ids="previewZoneIds"
                :support-ids="previewSupportIds"
              />
            </div>

            <div class="mood-meter-game__preview-strip">
              <article
                v-for="zone in previewZones"
                :key="zone.id"
                class="mood-meter-game__preview-step"
                :style="{ '--mood-meter-chip-color': zone.color }"
              >
                <span>{{ zone.emoji }}</span>
                <strong>{{ zone.label }}</strong>
                <small>{{ zone.shortHint }}</small>
              </article>
            </div>
          </div>

          <div class="mood-meter-game__intro-copy">
            <h2>先看看现在的心情，再给自己选一个舒服的安抚办法。</h2>
            <p>
              这一轮会先选心情，再把它放到合适的温度区间里，最后挑一张最想试试的安抚卡。
            </p>
          </div>
        </section>

        <section v-else-if="phase === 'mood'" class="mood-meter-game__selection">
          <div class="mood-meter-game__stage-board">
            <div class="mood-meter-game__section-head">
              <div>
                <span class="mood-meter-game__section-kicker">情绪角色</span>
                <strong>先看角色状态，再选心情卡</strong>
              </div>
              <small>左侧角色先给视觉线索，真正的选择仍然在右侧卡片里完成。</small>
            </div>

            <div class="mood-meter-game__stage-scene">
              <MoodMeterStageArt
                :mood-id="stageMoodId"
                :zone-id="stageZoneId"
                :thermometer-zone-ids="temperatureZoneIds"
                :support-ids="previewSupportIds"
                focus-area="character"
              />
            </div>

            <p class="mood-meter-game__stage-note">
              先观察角色表情，再从右侧选一张最像“我现在”的心情卡。
            </p>
          </div>

          <div class="mood-meter-game__grid">
            <button
              v-for="mood in availableMoods"
              :key="mood.id"
              type="button"
              class="mood-meter-game__card"
              :disabled="paused"
              :style="{ '--mood-card-color': mood.color }"
              @click="selectMood(mood)"
            >
              <span class="mood-meter-game__emoji">{{ mood.emoji }}</span>
              <strong>{{ mood.label }}</strong>
              <small>{{ mood.description }}</small>
            </button>
          </div>
        </section>

        <section v-else-if="phase === 'temperature'" class="mood-meter-game__temperature">
          <div class="mood-meter-game__stage-board">
            <div class="mood-meter-game__section-head">
              <div>
                <span class="mood-meter-game__section-kicker">温度计舞台</span>
                <strong>把刚才的心情放进最像的温度区间</strong>
              </div>
              <small>温度越往下越热，也越接近“需要马上帮帮自己”的状态。</small>
            </div>

            <div class="mood-meter-game__stage-scene">
              <MoodMeterStageArt
                :mood-id="selectedMood?.id || stageMoodId"
                :zone-id="stageZoneId"
                :thermometer-zone-ids="temperatureZoneIds"
                :support-ids="supportStageIds"
                focus-area="thermometer"
              />
            </div>

            <div class="mood-meter-game__meter-strip">
              <article
                v-for="zone in availableZones"
                :key="zone.id"
                class="mood-meter-game__meter-chip"
                :class="{ 'is-active': selectedZone?.id === zone.id }"
                :style="{ '--mood-meter-chip-color': zone.color }"
              >
                <span>{{ zone.emoji }}</span>
                <strong>{{ zone.label }}</strong>
                <small>{{ zone.shortHint }}</small>
              </article>
            </div>
          </div>

          <div class="mood-meter-game__temperature-panel">
            <div class="mood-meter-game__temperature-copy">
              <div class="mood-meter-game__selected">
                <span>{{ selectedMood?.emoji }}</span>
                <strong>{{ selectedMood?.label }}</strong>
              </div>
              <p>把这个心情放到最像它的温度区间里，越往下越接近“很激动、很需要帮助”。</p>
            </div>

            <div class="mood-meter-game__temperature-list">
              <button
                v-for="zone in availableZones"
                :key="zone.id"
                type="button"
                class="mood-meter-game__zone"
                :disabled="paused"
                :style="{ background: zone.color }"
                @click="selectTemperature(zone)"
              >
                <div>
                  <strong>{{ zone.label }}</strong>
                  <small>{{ zone.shortHint }}</small>
                </div>
                <span>{{ zone.emoji }}</span>
              </button>
            </div>
          </div>
        </section>

        <section v-else-if="phase === 'support'" class="mood-meter-game__support">
          <header class="mood-meter-game__support-header">
            <div class="mood-meter-game__selected">
              <span>{{ selectedMood?.emoji }}</span>
              <strong>{{ selectedMood?.label }}</strong>
              <small>{{ selectedZone?.label }}</small>
            </div>
            <p>现在选一张最想马上试试的安抚卡，让身体和心情慢慢回到舒服一点的位置。</p>
          </header>

          <div class="mood-meter-game__support-layout">
            <div class="mood-meter-game__stage-board">
              <div class="mood-meter-game__section-head">
                <div>
                  <span class="mood-meter-game__section-kicker">安抚卡舞台</span>
                  <strong>把当前这一轮的安抚卡摆上舞台</strong>
                </div>
                <small>下方会显示这次可选的安抚卡，选中的卡会高亮记录下来。</small>
              </div>

              <div class="mood-meter-game__stage-scene">
                <MoodMeterStageArt
                  :mood-id="selectedMood?.id || stageMoodId"
                  :zone-id="selectedZone?.id || stageZoneId"
                  :thermometer-zone-ids="temperatureZoneIds"
                  :support-ids="supportStageIds"
                  :selected-support-id="selectedSupport?.id || null"
                  focus-area="support"
                />
              </div>

              <p class="mood-meter-game__stage-note">
                选那张“如果现在马上做一做，会让我舒服一点”的卡就可以。
              </p>
            </div>

            <div class="mood-meter-game__grid">
              <button
                v-for="support in availableSupports"
                :key="support.id"
                type="button"
                class="mood-meter-game__card mood-meter-game__card--support"
                :disabled="paused"
                :style="{ '--mood-card-color': support.color }"
                @click="selectSupport(support)"
              >
                <span class="mood-meter-game__emoji">{{ support.emoji }}</span>
                <strong>{{ support.label }}</strong>
                <small>{{ support.description }}</small>
              </button>
            </div>
          </div>
        </section>

        <section v-else class="mood-meter-game__complete">
          <div class="mood-meter-game__complete-layout">
            <div class="mood-meter-game__complete-scene">
              <MoodMeterStageArt
                :mood-id="selectedMood?.id || stageMoodId"
                :zone-id="selectedZone?.id || stageZoneId"
                :thermometer-zone-ids="temperatureZoneIds"
                :support-ids="supportStageIds"
                :selected-support-id="selectedSupport?.id || null"
                focus-area="summary"
                finished
              />
            </div>
            <div class="mood-meter-game__summary">
              <span class="mood-meter-game__emoji">{{ selectedMood?.emoji }}</span>
              <strong>{{ selectedMood?.label }}</strong>
              <small>{{ selectedZone?.label }} · {{ selectedSupport?.label }}</small>
            </div>
          </div>
          <p>这一轮已经记录好了。等保存提示出现后，可以安静返回训练列表。</p>
        </section>
      </article>

      <aside class="prototype-game__aside prototype-game__surface">
        <div class="prototype-game__tags">
          <span class="prototype-game__tag">安抚教具</span>
          <span class="prototype-game__tag prototype-game__tag--accent">{{ difficultyConfig.shortLabel }}</span>
        </div>

        <h1 class="prototype-game__title">我的情绪温度计</h1>
        <p class="prototype-game__copy">
          用颜色和温度把“我现在感觉怎么样”说出来，再给自己选一个合适的安抚办法。
        </p>

        <div class="prototype-game__progress">
          <div class="prototype-game__progress-labels">
            <span>看心情</span>
            <span>放温度</span>
            <span>选安抚卡</span>
          </div>
          <div class="prototype-game__progress-track">
            <div class="prototype-game__progress-fill" :style="{ width: `${progressPercent}%` }"></div>
          </div>
        </div>

        <section class="prototype-game__tip-grid">
          <article class="prototype-game__tip-card">
            <strong>当前步骤</strong>
            <span>{{ stepLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>温度区间</strong>
            <span>{{ selectedZone?.label || '还没选择' }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>安抚建议</strong>
            <span>{{ selectedSupport?.label || previewSupportLabel }}</span>
          </article>
          <article class="prototype-game__tip-card">
            <strong>平均选择</strong>
            <span>{{ averageChoiceLabel }}</span>
          </article>
        </section>

        <div class="prototype-game__actions">
          <button
            v-if="phase === 'ready'"
            type="button"
            class="prototype-game__button prototype-game__button--primary"
            @click="startGame"
          >
            开始看看心情
          </button>

          <template v-else-if="phase === 'mood' || phase === 'temperature' || phase === 'support'">
            <button
              type="button"
              class="prototype-game__button prototype-game__button--secondary"
              :disabled="paused"
              @click="requestPrompt"
            >
              给一点提示
            </button>
            <button
              type="button"
              class="prototype-game__button prototype-game__button--ghost"
              :disabled="paused"
              @click="resetCurrentRound"
            >
              重新开始这一轮
            </button>
          </template>

          <button
            v-else
            type="button"
            class="prototype-game__button prototype-game__button--ghost"
            @click="resetCurrentRound"
          >
            再看一次心情
          </button>
        </div>
      </aside>
    </section>

    <transition name="badge-pop">
      <div v-if="showBadge" class="prototype-game__badge-modal">
        <div class="prototype-game__badge-icon">🌡️</div>
        <strong>心情观察员徽章</strong>
        <p>你已经把现在的心情、温度和安抚办法都说清楚了。</p>
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
} from '@/types/emotional/games'
import MoodMeterStageArt from './MoodMeterStageArt.vue'
import { averageNumberList, clampNumber, shuffleArray } from './prototype-game-utils'

type Phase = 'ready' | 'mood' | 'temperature' | 'support' | 'celebrating' | 'finished'

interface SparkleDot {
  id: number
  left: number
  top: number
  size: number
  delay: number
}

interface DifficultyConfig {
  label: string
  shortLabel: string
  moodCount: number
  zoneIds: string[]
  supportCount: number
}

interface MoodDefinition {
  id: string
  label: string
  emoji: string
  description: string
  color: string
  supportIds: readonly string[]
}

interface TemperatureZone {
  id: string
  label: string
  shortHint: string
  emoji: string
  color: string
  level: number
}

interface SupportDefinition {
  id: string
  label: string
  emoji: string
  description: string
  color: string
}

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  paused: boolean
  markRoundDirty?: () => void
  audio: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: EmotionGameCompletionPayload]
}>()

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    label: '简单 · 三格表达',
    shortLabel: '简单',
    moodCount: 3,
    zoneIds: ['cool', 'steady', 'hot'],
    supportCount: 3,
  },
  2: {
    label: '中等 · 四格表达',
    shortLabel: '中等',
    moodCount: 4,
    zoneIds: ['cool', 'steady', 'warm', 'hot'],
    supportCount: 4,
  },
  3: {
    label: '困难 · 五格表达',
    shortLabel: '困难',
    moodCount: 5,
    zoneIds: ['cool', 'calm-warm', 'warm', 'alert', 'hot'],
    supportCount: 4,
  },
}

const previewSupportIds = ['slow-breath', 'quiet-corner', 'hug-pillow', 'count-down']

const MOODS: ReadonlyArray<MoodDefinition> = [
  {
    id: 'calm',
    label: '平静',
    emoji: '🙂',
    description: '身体放松，心里比较稳。',
    color: 'linear-gradient(135deg, #7dd3fc 0%, #93c5fd 100%)',
    supportIds: ['slow-breath', 'stretch', 'quiet-corner'],
  },
  {
    id: 'shy',
    label: '有点紧张',
    emoji: '😳',
    description: '心里有点缩起来，需要慢慢准备。',
    color: 'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',
    supportIds: ['count-down', 'quiet-corner', 'hug-pillow'],
  },
  {
    id: 'sad',
    label: '难过',
    emoji: '😢',
    description: '想被安慰，想慢慢静下来。',
    color: 'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',
    supportIds: ['hug-pillow', 'soft-music', 'ask-help'],
  },
  {
    id: 'angry',
    label: '生气',
    emoji: '😠',
    description: '身体热热的，想先稳住自己。',
    color: 'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)',
    supportIds: ['slow-breath', 'squeeze-ball', 'ask-help'],
  },
  {
    id: 'overwhelmed',
    label: '很乱很满',
    emoji: '😵',
    description: '脑袋里有很多声音，想先停一下。',
    color: 'linear-gradient(135deg, #fdba74 0%, #f97316 100%)',
    supportIds: ['quiet-corner', 'count-down', 'soft-music'],
  },
]

const TEMPERATURE_ZONES: ReadonlyArray<TemperatureZone> = [
  {
    id: 'cool',
    label: '凉凉的，很平静',
    shortHint: '身体比较放松',
    emoji: '🧊',
    color: 'linear-gradient(135deg, #67e8f9 0%, #60a5fa 100%)',
    level: 1,
  },
  {
    id: 'steady',
    label: '暖暖的，还能稳住',
    shortHint: '有一点起伏，但还舒服',
    emoji: '🌤️',
    color: 'linear-gradient(135deg, #a7f3d0 0%, #86efac 100%)',
    level: 2,
  },
  {
    id: 'calm-warm',
    label: '有点热，需要提醒',
    shortHint: '先停一下会更舒服',
    emoji: '🌥️',
    color: 'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',
    level: 3,
  },
  {
    id: 'warm',
    label: '热热的，需要帮忙',
    shortHint: '已经开始不舒服了',
    emoji: '🌦️',
    color: 'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)',
    level: 4,
  },
  {
    id: 'alert',
    label: '快要满出来了',
    shortHint: '先找老师或安抚工具',
    emoji: '⚠️',
    color: 'linear-gradient(135deg, #fb7185 0%, #ef4444 100%)',
    level: 5,
  },
  {
    id: 'hot',
    label: '很烫，要马上安抚',
    shortHint: '需要立刻停下来帮帮自己',
    emoji: '🔥',
    color: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)',
    level: 5,
  },
]

const SUPPORTS: ReadonlyArray<SupportDefinition> = [
  {
    id: 'slow-breath',
    label: '慢慢呼吸 3 次',
    emoji: '🌬️',
    description: '跟着身体一起放慢一点。',
    color: 'linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)',
  },
  {
    id: 'quiet-corner',
    label: '先去安静角落',
    emoji: '🪴',
    description: '给自己一点安静空间。',
    color: 'linear-gradient(135deg, #86efac 0%, #34d399 100%)',
  },
  {
    id: 'hug-pillow',
    label: '抱一抱抱枕',
    emoji: '🧸',
    description: '让身体有安全感。',
    color: 'linear-gradient(135deg, #f9a8d4 0%, #f472b6 100%)',
  },
  {
    id: 'count-down',
    label: '跟着数到 5',
    emoji: '🖐️',
    description: '慢慢把注意力收回来。',
    color: 'linear-gradient(135deg, #c4b5fd 0%, #8b5cf6 100%)',
  },
  {
    id: 'soft-music',
    label: '听一段轻音乐',
    emoji: '🎵',
    description: '让耳朵先安静下来。',
    color: 'linear-gradient(135deg, #fcd34d 0%, #f59e0b 100%)',
  },
  {
    id: 'squeeze-ball',
    label: '捏一捏解压球',
    emoji: '🫧',
    description: '把手里的紧张慢慢放掉。',
    color: 'linear-gradient(135deg, #67e8f9 0%, #14b8a6 100%)',
  },
  {
    id: 'ask-help',
    label: '告诉老师我需要帮忙',
    emoji: '🙋',
    description: '把需要说出来，也是在照顾自己。',
    color: 'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)',
  },
  {
    id: 'stretch',
    label: '伸一伸肩膀和手臂',
    emoji: '🤸',
    description: '把身体慢慢放松开。',
    color: 'linear-gradient(135deg, #93c5fd 0%, #6366f1 100%)',
  },
]

const sparkles: ReadonlyArray<SparkleDot> = [
  { id: 1, left: 8, top: 16, size: 16, delay: 0.2 },
  { id: 2, left: 18, top: 74, size: 10, delay: 1.1 },
  { id: 3, left: 32, top: 22, size: 18, delay: 0.5 },
  { id: 4, left: 72, top: 14, size: 14, delay: 1.5 },
  { id: 5, left: 84, top: 58, size: 12, delay: 0.8 },
  { id: 6, left: 92, top: 28, size: 9, delay: 1.8 },
]

const phase = ref<Phase>('ready')
const promptCount = ref(0)
const availableMoods = ref<MoodDefinition[]>([])
const availableSupports = ref<SupportDefinition[]>([])
const selectedMood = ref<MoodDefinition | null>(null)
const selectedZone = ref<TemperatureZone | null>(null)
const selectedSupport = ref<SupportDefinition | null>(null)
const helperMessage = ref('先看看心情，再决定现在最需要什么帮助。')
const showBadge = ref(false)
const activeDifficulty = ref<EmotionGameDifficulty>(props.difficulty)
const choiceTimes = ref<number[]>([])
const previewSupportLabel = ref('会按当前心情给出温和建议')

let hasRoundDirty = false
let stageStartedAt = 0
let completeTimer = 0

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[activeDifficulty.value])
const previewZones = computed(() => buildAvailableZones(props.difficulty))
const availableZones = computed(() => buildAvailableZones(activeDifficulty.value))
const paused = computed(() => props.paused)
const progressPercent = computed(() => {
  if (phase.value === 'ready') return 0
  if (phase.value === 'mood') return 18
  if (phase.value === 'temperature') return 46
  if (phase.value === 'support') return 74
  return 100
})
const progressLabel = computed(() => `${Math.round(progressPercent.value)}%`)
const stepLabel = computed(() => {
  if (phase.value === 'ready') return '准备开始'
  if (phase.value === 'mood') return '选一个最像现在的心情'
  if (phase.value === 'temperature') return '把心情放进温度区间'
  if (phase.value === 'support') return '挑一张最想试的安抚卡'
  return '本轮已经完成'
})
const stageEyebrow = computed(() => {
  if (phase.value === 'ready') return '开始前'
  if (phase.value === 'mood') return '第一步'
  if (phase.value === 'temperature') return '第二步'
  if (phase.value === 'support') return '第三步'
  if (phase.value === 'celebrating') return '已完成'
  return '等待保存'
})
const stageTitle = computed(() => {
  if (phase.value === 'ready') return '今天的心情更像哪一种颜色和温度？'
  if (phase.value === 'mood') return '先选一张最像现在的心情卡'
  if (phase.value === 'temperature') return '再把它放到最像的温度区间里'
  if (phase.value === 'support') return '最后选一张最想试试的安抚卡'
  return '本轮情绪快照已经记录完成'
})
const averageChoiceMs = computed(() => averageNumberList(choiceTimes.value))
const averageChoiceLabel = computed(() => {
  if (!averageChoiceMs.value) {
    return '还没有完成选择'
  }

  if (averageChoiceMs.value < 1000) {
    return `${averageChoiceMs.value}ms`
  }

  return `${(averageChoiceMs.value / 1000).toFixed(1)} 秒`
})
const themeStyle = computed(() => ({
  '--prototype-background': selectedMood.value?.color || 'linear-gradient(135deg, #c6f0ff 0%, #fce7f3 52%, #fde68a 100%)',
  '--prototype-progress': selectedSupport.value?.color || 'linear-gradient(135deg, #38bdf8 0%, #c084fc 100%)',
}))
const previewZoneIds = computed(() => previewZones.value.map((zone) => zone.id))
const temperatureZoneIds = computed(() => {
  const source = availableZones.value.length ? availableZones.value : previewZones.value
  return source.map((zone) => zone.id)
})
const stageMoodId = computed(() => selectedMood.value?.id || 'calm')
const stageZoneId = computed(() => selectedZone.value?.id || resolveMoodPreviewZone(stageMoodId.value))
const supportStageIds = computed(() => {
  if (availableSupports.value.length) {
    return availableSupports.value.map((support) => support.id).slice(0, 4)
  }

  if (selectedMood.value) {
    return [...selectedMood.value.supportIds].slice(0, 4)
  }

  return [...previewSupportIds]
})

function buildAvailableZones(difficulty: EmotionGameDifficulty) {
  const zoneIds = DIFFICULTY_CONFIGS[difficulty].zoneIds
  return zoneIds
    .map((zoneId) => TEMPERATURE_ZONES.find((zone) => zone.id === zoneId) || null)
    .filter((zone): zone is TemperatureZone => zone !== null)
}

function resolveMoodPreviewZone(moodId: string) {
  if (moodId === 'angry') {
    return 'hot'
  }

  if (moodId === 'overwhelmed') {
    return 'alert'
  }

  if (moodId === 'shy') {
    return 'calm-warm'
  }

  if (moodId === 'sad') {
    return 'steady'
  }

  return 'cool'
}

function resolveSupportFitScore(mood: MoodDefinition, support: SupportDefinition) {
  const supportRank = mood.supportIds.indexOf(support.id)
  if (supportRank === 0) return 1
  if (supportRank === 1) return 0.85
  if (supportRank === 2) return 0.7
  return 0.4
}

function markDirtyOnce() {
  if (hasRoundDirty) {
    return
  }

  hasRoundDirty = true
  props.markRoundDirty?.()
}

function resetChoiceTimer() {
  stageStartedAt = Date.now()
}

function pushChoiceTime() {
  if (!stageStartedAt) {
    return
  }

  choiceTimes.value.push(Date.now() - stageStartedAt)
}

function resetCurrentRound() {
  window.clearTimeout(completeTimer)
  showBadge.value = false
  promptCount.value = 0
  selectedMood.value = null
  selectedZone.value = null
  selectedSupport.value = null
  choiceTimes.value = []
  activeDifficulty.value = props.difficulty
  availableMoods.value = []
  availableSupports.value = []
  helperMessage.value = '先看看心情，再决定现在最需要什么帮助。'
  previewSupportLabel.value = '会按当前心情给出温和建议'
  phase.value = 'ready'
  stageStartedAt = 0
  props.audio.stopAmbient()
}

function buildMoodDeck(difficulty: EmotionGameDifficulty) {
  return shuffleArray(MOODS).slice(0, DIFFICULTY_CONFIGS[difficulty].moodCount)
}

function buildSupportDeck(mood: MoodDefinition, difficulty: EmotionGameDifficulty) {
  const recommended = mood.supportIds
    .map((supportId) => SUPPORTS.find((support) => support.id === supportId) || null)
    .filter((support): support is SupportDefinition => support !== null)

  const distractors = shuffleArray(
    SUPPORTS.filter((support) => !mood.supportIds.includes(support.id)),
  )

  return shuffleArray([
    ...recommended,
    ...distractors.slice(0, Math.max(0, DIFFICULTY_CONFIGS[difficulty].supportCount - recommended.length)),
  ]).slice(0, DIFFICULTY_CONFIGS[difficulty].supportCount)
}

function startGame() {
  markDirtyOnce()
  activeDifficulty.value = props.difficulty
  availableMoods.value = buildMoodDeck(props.difficulty)
  helperMessage.value = '从这些心情卡里，找一张最像“我现在”的。'
  phase.value = 'mood'
  resetChoiceTimer()

  props.audio.ensureReady().then(() => props.audio.startAmbient()).catch(() => {
    // Keep the flow playable without audio.
  })
  props.audio.speak('先看看这些心情卡，选一张最像你现在感觉的。')
}

function selectMood(mood: MoodDefinition) {
  if (paused.value || phase.value !== 'mood') {
    return
  }

  selectedMood.value = mood
  pushChoiceTime()
  helperMessage.value = '很好，再把这个心情放到最像它的温度里。'
  phase.value = 'temperature'
  previewSupportLabel.value = mood.supportIds
    .map((supportId) => SUPPORTS.find((support) => support.id === supportId)?.label || '')
    .filter(Boolean)
    .slice(0, 2)
    .join(' / ') || '会给出安抚建议'
  resetChoiceTimer()
  props.audio.playSoftBounce().catch(() => {
    // Soft feedback is optional.
  })
}

function selectTemperature(zone: TemperatureZone) {
  if (paused.value || phase.value !== 'temperature' || !selectedMood.value) {
    return
  }

  selectedZone.value = zone
  availableSupports.value = buildSupportDeck(selectedMood.value, activeDifficulty.value)
  pushChoiceTime()
  helperMessage.value = '最后挑一张现在最想试试的安抚卡。'
  phase.value = 'support'
  resetChoiceTimer()
  props.audio.playSoftBounce().catch(() => {
    // Soft feedback is optional.
  })
}

function requestPrompt() {
  if (paused.value || (phase.value !== 'mood' && phase.value !== 'temperature' && phase.value !== 'support')) {
    return
  }

  promptCount.value += 1

  if (phase.value === 'mood') {
    helperMessage.value = '可以先想一想：身体是放松的、缩起来的，还是快要炸出来了？'
  } else if (phase.value === 'temperature') {
    helperMessage.value = '越往下表示越热、越满、越需要马上安抚。'
  } else {
    helperMessage.value = '选那张“如果现在马上做一做，会让我舒服一点”的卡。'
  }

  props.audio.speak(helperMessage.value)
}

function selectSupport(support: SupportDefinition) {
  if (paused.value || phase.value !== 'support' || !selectedMood.value || !selectedZone.value) {
    return
  }

  selectedSupport.value = support
  pushChoiceTime()
  helperMessage.value = '这张安抚卡已经选好了，先把它记下来。'
  phase.value = 'celebrating'
  showBadge.value = true

  props.audio.stopAmbient()
  void Promise.allSettled([
    props.audio.playSuccessCue(),
    Promise.resolve().then(() => props.audio.speak('已经选好安抚卡了，做得很好。')),
  ])

  completeTimer = window.setTimeout(() => {
    phase.value = 'finished'
    emit('complete', buildCompletionPayload())
  }, 850)
}

function buildCompletionPayload(): EmotionGameCompletionPayload {
  const mood = selectedMood.value || availableMoods.value[0] || MOODS[0]!
  const zone = selectedZone.value || availableZones.value[0] || TEMPERATURE_ZONES[0]!
  const support = selectedSupport.value || availableSupports.value[0] || SUPPORTS[0]!

  return {
    performanceData: {
      event: 'game_complete',
      mood_checkin_count: 1,
      selected_mood_id: mood.id,
      selected_mood_label: mood.label,
      selected_temperature_level: zone.level,
      selected_temperature_zone: zone.id,
      selected_temperature_label: zone.label,
      support_card_id: support.id,
      support_card_label: support.label,
      support_fit_score: Number(resolveSupportFitScore(mood, support).toFixed(2)),
      prompt_count: promptCount.value,
      highest_prompt_level: clampNumber(promptCount.value, 0, 3),
      choice_times_ms: [...choiceTimes.value],
      average_choice_ms: averageChoiceMs.value,
      available_mood_ids: availableMoods.value.map((item) => item.id),
      available_support_ids: availableSupports.value.map((item) => item.id),
      difficulty_level: activeDifficulty.value,
    },
  }
}

watch(
  () => props.difficulty,
  (difficulty) => {
    if (phase.value !== 'ready') {
      return
    }

    activeDifficulty.value = difficulty
  },
)

watch(
  () => props.paused,
  (isPaused) => {
    if (!isPaused || phase.value === 'ready' || phase.value === 'finished') {
      return
    }

    props.audio.stopAmbient()
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(completeTimer)
  props.audio.stopAll()
})
</script>

<style scoped>
@import './prototype-game-shared.css';

.mood-meter-game__glow {
  background: rgba(125, 211, 252, 0.48);
}

.mood-meter-game__glow--alt {
  background: rgba(244, 114, 182, 0.32);
}

.mood-meter-game__intro {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
  gap: 24px;
  align-items: stretch;
  min-height: 100%;
}

.mood-meter-game__selection,
.mood-meter-game__temperature,
.mood-meter-game__support-layout,
.mood-meter-game__complete-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 24px;
  align-items: start;
}

.mood-meter-game__stage-board {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 18px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.52);
}

.mood-meter-game__section-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.mood-meter-game__section-head strong {
  display: block;
  color: #17304d;
  font-size: 1.08rem;
}

.mood-meter-game__section-head small,
.mood-meter-game__stage-note {
  line-height: 1.6;
  color: rgba(23, 48, 77, 0.72);
}

.mood-meter-game__section-kicker {
  display: block;
  margin-bottom: 6px;
  color: rgba(23, 48, 77, 0.64);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mood-meter-game__stage-scene {
  position: relative;
  min-height: 320px;
  overflow: hidden;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(226, 239, 255, 0.86) 100%);
}

.mood-meter-game__stage-scene--intro,
.mood-meter-game__complete-scene {
  min-height: 340px;
}

.mood-meter-game__preview-strip,
.mood-meter-game__meter-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.mood-meter-game__preview-step,
.mood-meter-game__meter-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 20px;
  color: #17304d;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(255, 255, 255, 0.76) 100%),
    var(--mood-meter-chip-color);
  box-shadow: 0 14px 26px rgba(33, 53, 71, 0.1);
}

.mood-meter-game__preview-step span,
.mood-meter-game__meter-chip span {
  font-size: 1.3rem;
}

.mood-meter-game__meter-chip.is-active {
  box-shadow: 0 18px 34px rgba(56, 189, 248, 0.18);
  outline: 1px solid rgba(56, 189, 248, 0.42);
}

.mood-meter-game__stage-note {
  margin: 0;
}

.mood-meter-game__intro-copy h2 {
  margin: 0 0 10px;
  font-size: 2rem;
  line-height: 1.2;
}

.mood-meter-game__intro-copy p {
  margin: 0;
  line-height: 1.8;
  color: rgba(33, 53, 71, 0.78);
}

.mood-meter-game__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.mood-meter-game__card,
.mood-meter-game__zone {
  border: 0;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.mood-meter-game__card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  min-height: 170px;
  padding: 18px;
  border-radius: 24px;
  text-align: left;
  color: #143043;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.76) 100%),
    var(--mood-card-color);
  box-shadow: 0 16px 32px rgba(33, 53, 71, 0.12);
}

.mood-meter-game__card:hover:not(:disabled),
.mood-meter-game__zone:hover:not(:disabled) {
  transform: translateY(-2px);
}

.mood-meter-game__card:disabled,
.mood-meter-game__zone:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.mood-meter-game__emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  font-size: 1.8rem;
  background: rgba(255, 255, 255, 0.74);
}

.mood-meter-game__card strong,
.mood-meter-game__zone strong {
  font-size: 1.08rem;
}

.mood-meter-game__card small,
.mood-meter-game__zone small,
.mood-meter-game__selected small {
  line-height: 1.55;
  color: rgba(20, 48, 67, 0.74);
}

.mood-meter-game__temperature {
  gap: 18px;
}

.mood-meter-game__temperature-panel {
  display: grid;
  gap: 18px;
  align-self: stretch;
}

.mood-meter-game__temperature-copy,
.mood-meter-game__support-header {
  padding: 18px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.62);
}

.mood-meter-game__selected {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.74);
}

.mood-meter-game__selected span {
  font-size: 1.6rem;
}

.mood-meter-game__temperature-copy p,
.mood-meter-game__support-header p {
  margin: 14px 0 0;
  line-height: 1.7;
}

.mood-meter-game__temperature-list {
  display: grid;
  gap: 12px;
}

.mood-meter-game__zone {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 84px;
  padding: 16px 18px;
  border-radius: 22px;
  color: #17304d;
}

.mood-meter-game__zone span {
  font-size: 1.5rem;
}

.mood-meter-game__support {
  display: grid;
  gap: 18px;
}

.mood-meter-game__complete {
  min-height: 100%;
}

.mood-meter-game__complete-scene {
  position: relative;
  overflow: hidden;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.94) 0%, rgba(226, 239, 255, 0.86) 100%);
}

.mood-meter-game__card--support {
  min-height: 154px;
}

.mood-meter-game__summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 18px 24px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.7);
  text-align: center;
}

.mood-meter-game__summary span {
  font-size: 2rem;
}

@media (max-width: 1100px) {
  .mood-meter-game__intro,
  .mood-meter-game__selection,
  .mood-meter-game__temperature,
  .mood-meter-game__support-layout,
  .mood-meter-game__complete-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .mood-meter-game__preview-strip,
  .mood-meter-game__meter-strip,
  .mood-meter-game__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .mood-meter-game__section-head {
    flex-direction: column;
  }
}
</style>
