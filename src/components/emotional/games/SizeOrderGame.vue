<template>
  <div class="size-order-game" :class="{ 'is-paused': props.paused }">
    <div class="hud-panel">
      <div class="hud-card"><span>当前难度</span><strong>{{ difficultyConfig.shortLabel }}</strong></div>
      <div class="hud-card"><span>已完成</span><strong>{{ completedRounds }} 轮</strong></div>
      <div class="hud-card"><span>答对</span><strong>{{ correctRounds }} 轮</strong></div>
      <div class="hud-card"><span>排序目标</span><strong>{{ sortGoalLabel }}</strong></div>
    </div>

    <div class="stage-layout">
      <section class="stage-panel">
        <div class="status-strip" :data-tone="statusTone">
          <span>{{ statusLabel }}</span>
          <strong>{{ stageMessage }}</strong>
        </div>

        <!-- 待排序物品区 -->
        <div class="items-area" :data-count="items.length">
          <div
            v-for="item in items"
            :key="item.id"
            class="item-card"
            :class="itemCardClass(item.id)"
            :data-dimension="roundDimension"
            @pointerdown="onItemPointerDown($event, item)"
          >
            <div class="item-figure" :style="figureStyle(item)">
              <img
                class="figure-img"
                :class="figureFitClass(item)"
                :src="itemImageSrc(item)"
                :alt="item.name"
                draggable="false"
              />
            </div>
            <span v-if="selectedId === item.id" class="item-hint">再点一个空槽放进去</span>
          </div>

          <div v-if="items.length === 0 && phase === 'playing'" class="items-done-note">
            ✨ 都排好啦！
          </div>
        </div>

        <!-- 排序槽位区 -->
        <div class="slots-area">
          <div class="slots-arrow" aria-hidden="true">
            <span>{{ sortGoalLabel }}</span>
            <span class="arrow-glyph">{{ ascending ? '→' : '←' }}</span>
          </div>
          <div class="slots-row">
            <button
              v-for="(slot, idx) in slots"
              :key="idx"
              type="button"
              class="slot-box"
              :class="slotClass(idx)"
              :disabled="props.paused"
              @click="onSlotClick(idx)"
            >
              <template v-if="slot !== null">
                <div class="slot-figure" :style="figureStyle(slot)">
                  <img
                    class="figure-img"
                    :class="figureFitClass(slot)"
                    :src="itemImageSrc(slot)"
                    :alt="slot.name"
                    draggable="false"
                  />
                </div>
                <span class="slot-remove-hint">点一下取回</span>
              </template>
              <template v-else>
                <span class="slot-placeholder">{{ slotGlyph(idx) }}</span>
              </template>
            </button>
          </div>
        </div>

        <div v-if="feedbackVisible" class="feedback-strip" :data-tone="feedbackTone">
          <span>{{ feedbackText }}</span>
        </div>
      </section>
    </div>

    <div v-if="dragItem" class="drag-layer" aria-hidden="true">
      <div
        class="drag-figure"
        :style="{
          ...figureStyle(dragItem),
          left: `${dragX}px`,
          top: `${dragY}px`,
        }"
      >
        <img
          class="figure-img"
          :class="figureFitClass(dragItem)"
          :src="itemImageSrc(dragItem)"
          :alt="dragItem.name"
          draggable="false"
        />
      </div>
    </div>

    <Transition name="badge-pop">
      <div v-if="showBadge" class="badge-overlay">
        <div class="badge-card">
          <span class="badge-icon">📏</span>
          <p class="badge-name">{{ badgeName }}</p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { EmotionGameDifficulty } from '@/types/emotional/games'
import type { EmotionGameAudioController } from '@/types/emotional/games'
import type { CustomGameCompletionPayload } from '@/types/emotional/games'

const props = defineProps<{
  difficulty: EmotionGameDifficulty
  settings?: Record<string, unknown>
  paused?: boolean
  markRoundDirty?: () => void
  audio?: EmotionGameAudioController
}>()

const emit = defineEmits<{
  complete: [payload: CustomGameCompletionPayload]
}>()

type SortDimension = 'size' | 'length'

interface ItemTypeDef {
  kind: string
  dimension: SortDimension
  name: string
  /** 对应 assets/resources/images/cognitive/size-order/{imageKey}.png */
  imageKey: string
}

interface SizeItem {
  id: string
  kind: string
  name: string
  value: number // 视觉尺寸（px）：大小物品=边长，长短物品=长度
}

interface DifficultyConfig {
  shortLabel: string
  itemCount: number
  roundCount: number
  /** 相邻物品连续量乘性比值（越小越难分辨） */
  adjacentRatio: number
  badge: { badgeCode: string; badgeName: string }
}

const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    shortLabel: 'L1 基础',
    itemCount: 3,
    roundCount: 3,
    adjacentRatio: 1.45,
    badge: { badgeCode: 'BADGE_ORDER_HELPER', badgeName: '排队小队长徽章' },
  },
  2: {
    shortLabel: 'L2 进阶',
    itemCount: 4,
    roundCount: 4,
    adjacentRatio: 1.3,
    badge: { badgeCode: 'BADGE_ORDER_HELPER', badgeName: '排队小队长徽章' },
  },
  3: {
    shortLabel: 'L3 挑战',
    itemCount: 5,
    roundCount: 5,
    adjacentRatio: 1.15,
    badge: { badgeCode: 'BADGE_ORDER_HELPER', badgeName: '排队小队长徽章' },
  },
}

const difficultyConfig = computed(() => DIFFICULTY_CONFIGS[props.difficulty])

// ========== 物品集（AI 生成贴纸底图，路径见 assets/resources/images/cognitive/size-order/） ==========
// 运行时尺寸由 CSS 控制：
// - 大小维度物品：1:1 底图，width/height = value 等比缩放
// - 长短维度物品：2:1 底图（物品从左端贯穿右端），width = value + height 固定 + cover/left 裁右端

interface ItemTypeDef {
  kind: string
  dimension: SortDimension
  name: string
  /** 对应 assets/resources/images/cognitive/size-order/{imageKey}.png */
  imageKey: string
}

// 大小维度
const SIZE_ITEMS: ItemTypeDef[] = [
  { kind: 'apple', dimension: 'size', name: '苹果', imageKey: 'apple' },
  { kind: 'tree', dimension: 'size', name: '大树', imageKey: 'tree' },
  { kind: 'elephant', dimension: 'size', name: '小象', imageKey: 'elephant' },
  { kind: 'house', dimension: 'size', name: '房子', imageKey: 'house' },
  { kind: 'turtle', dimension: 'size', name: '乌龟', imageKey: 'turtle' },
  { kind: 'sun', dimension: 'size', name: '太阳', imageKey: 'sun' },
  { kind: 'bear', dimension: 'size', name: '小熊', imageKey: 'bear' },
  { kind: 'watermelon', dimension: 'size', name: '西瓜', imageKey: 'watermelon' },
]

// 长短维度
const LENGTH_ITEMS: ItemTypeDef[] = [
  { kind: 'pencil', dimension: 'length', name: '铅笔', imageKey: 'pencil' },
  { kind: 'rope', dimension: 'length', name: '麻绳', imageKey: 'rope' },
  { kind: 'carrot', dimension: 'length', name: '胡萝卜', imageKey: 'carrot' },
  { kind: 'banana', dimension: 'length', name: '香蕉', imageKey: 'banana' },
  { kind: 'cucumber', dimension: 'length', name: '黄瓜', imageKey: 'cucumber' },
  { kind: 'snake', dimension: 'length', name: '小蛇', imageKey: 'snake' },
  { kind: 'sausage', dimension: 'length', name: '香肠', imageKey: 'sausage' },
  { kind: 'toothbrush', dimension: 'length', name: '牙刷', imageKey: 'toothbrush' },
]

const ALL_ITEM_TYPES: ItemTypeDef[] = [...SIZE_ITEMS, ...LENGTH_ITEMS]

// ========== 状态 ==========

type Phase = 'playing' | 'done'
type StatusTone = 'neutral' | 'success' | 'error'

const phase = ref<Phase>('playing')
const statusTone = ref<StatusTone>('neutral')
const statusLabel = ref('比一比')
const stageMessage = ref('把这些好朋友按顺序排好队')

const roundDimension = ref<SortDimension>('size')
const ascending = ref(true)
const items = ref<SizeItem[]>([]) // 待排序物品（打乱顺序）
const slots = ref<(SizeItem | null)[]>([]) // 槽位（从左到右 = 排序结果）
const sortedReference = ref<SizeItem[]>([]) // 正确顺序
const roundKindName = ref('苹果')

const completedRounds = ref(0)
const correctRounds = ref(0)
const feedbackVisible = ref(false)
const feedbackTone = ref<'success' | 'error'>('success')
const feedbackText = ref('')
const showBadge = ref(false)
const badgeName = ref(DIFFICULTY_CONFIGS[1].badge.badgeName)

const selectedId = ref<string | null>(null)

// 拖拽状态
const dragItem = ref<SizeItem | null>(null)
const dragX = ref(0)
const dragY = ref(0)
let dragPointerId: number | null = null
let dragStartClientX = 0
let dragStartClientY = 0
let dragMoved = false

// 统计
interface RoundStat {
  itemKind: string
  dimension: SortDimension
  ascending: boolean
  itemCount: number
  wrongAttempts: number
  responseTimeMs: number
}
const roundStats = ref<RoundStat[]>([])
const responseTimesMs = ref<number[]>([])
const wrongAttemptsTotal = ref(0)
const dragCount = ref(0)
const tapCount = ref(0)
const roundStartTime = ref(Date.now())
let boardDirty = false

// 本轮开始时的累计错误数（用于计算本轮错误数）
let roundStartWrongAttempts = 0

let roundId = 0
let badgeTimer: ReturnType<typeof setTimeout> | null = null
let completeTimer: ReturnType<typeof setTimeout> | null = null
let nextRoundTimer: ReturnType<typeof setTimeout> | null = null
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

function clearTimers() {
  if (badgeTimer) { clearTimeout(badgeTimer); badgeTimer = null }
  if (completeTimer) { clearTimeout(completeTimer); completeTimer = null }
  if (nextRoundTimer) { clearTimeout(nextRoundTimer); nextRoundTimer = null }
  if (feedbackTimer) { clearTimeout(feedbackTimer); feedbackTimer = null }
}

// ========== 连续量生成 ==========

function buildItemValues(count: number, adjacentRatio: number): number[] {
  // 等比序列：视觉尺寸从 maxSize 起逐级除以比值，保证相邻差异 = 1 - 1/ratio
  // L1 ratio 1.45 → 相邻差 31%（PRD ≥30%）；L3 ratio 1.15 → 相邻差 13%（PRD ≥10%）
  const maxSize = 180
  const values: number[] = []
  let current = maxSize
  for (let i = 0; i < count; i += 1) {
    values.push(Math.round(current * 10) / 10)
    current /= adjacentRatio
  }
  values.reverse()
  return values
}

function pickDimension(): SortDimension {
  // L1 只比大小；L2 起随机大小/长短
  if (props.difficulty === 1) {
    return 'size'
  }
  return Math.random() < 0.5 ? 'size' : 'length'
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i] as T
    a[i] = a[j] as T
    a[j] = tmp
  }
  return a
}

function startRound() {
  clearTimers()
  const config = difficultyConfig.value
  const dimension = pickDimension()
  const typePool = dimension === 'size' ? SIZE_ITEMS : LENGTH_ITEMS
  const type = typePool[Math.floor(Math.random() * typePool.length)]!
  const values = buildItemValues(config.itemCount, config.adjacentRatio)
  const ascendingDir = Math.random() < 0.5

  roundId += 1
  const roundItems: SizeItem[] = values.map((value, i) => ({
    id: `r${roundId}-${i}`,
    kind: type.kind,
    name: type.name,
    value,
  }))

  roundDimension.value = dimension
  ascending.value = ascendingDir
  roundKindName.value = type.name
  sortedReference.value = [...roundItems].sort((a, b) => a.value - b.value)
  if (!ascendingDir) {
    sortedReference.value.reverse()
  }
  items.value = shuffle(roundItems)
  slots.value = Array<SizeItem | null>(config.itemCount).fill(null)
  selectedId.value = null
  feedbackVisible.value = false
  phase.value = 'playing'
  roundStartWrongAttempts = wrongAttemptsTotal.value
  statusTone.value = 'neutral'
  statusLabel.value = '比一比'
  stageMessage.value = `把这些${type.name}按${sortGoalLabel.value}排好队`
  roundStartTime.value = Date.now()
}

const sortGoalLabel = computed(() => {
  const sizeText = roundDimension.value === 'size'
    ? (ascending.value ? '从小到大' : '从大到小')
    : (ascending.value ? '从短到长' : '从长到短')
  return sizeText
})

// ========== 判定与放置 ==========

function slotGlyph(idx: number) {
  // 空槽提示：L1 给数字顺序脚手架，高难度不给（避免直接抄数字）
  if (props.difficulty === 1) {
    return ascending.value ? String(idx + 1) : String(sortedReference.value.length - idx)
  }
  return '·'
}

function expectedItemForSlot(idx: number): SizeItem | undefined {
  return sortedReference.value[idx]
}

function isCorrectPlacement(item: SizeItem, idx: number) {
  return expectedItemForSlot(idx)?.id === item.id
}

function markBoardDirtyOnce() {
  if (boardDirty) return
  boardDirty = true
  props.markRoundDirty?.()
}

function placeItem(item: SizeItem, idx: number) {
  if (props.paused || phase.value !== 'playing') return
  if (slots.value[idx] !== null) return

  const correct = isCorrectPlacement(item, idx)
  if (correct) {
    slots.value[idx] = item
    items.value = items.value.filter((it) => it.id !== item.id)
    selectedId.value = null
    props.audio?.playSoftBounce?.()
    showFeedback('success', '放对啦，继续！')
    checkRoundComplete()
  } else {
    wrongAttemptsTotal.value += 1
    showFeedback('error', '再比一比，这个位置放谁更合适？')
    props.audio?.playSoftBounce?.()
  }
}

function showFeedback(tone: 'success' | 'error', text: string) {
  feedbackTone.value = tone
  feedbackText.value = text
  feedbackVisible.value = true
  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }
  feedbackTimer = setTimeout(() => {
    feedbackVisible.value = false
  }, 1600)
}

function checkRoundComplete() {
  if (slots.value.some((slot) => slot === null)) return

  // 本轮完成
  completedRounds.value += 1
  correctRounds.value += 1
  const responseTimeMs = Math.max(0, Math.round(Date.now() - roundStartTime.value))
  const roundWrongAttempts = Math.max(0, wrongAttemptsTotal.value - roundStartWrongAttempts)
  responseTimesMs.value = [...responseTimesMs.value, responseTimeMs]
  roundStats.value = [...roundStats.value, {
    itemKind: roundKindName.value,
    dimension: roundDimension.value,
    ascending: ascending.value,
    itemCount: difficultyConfig.value.itemCount,
    wrongAttempts: roundWrongAttempts,
    responseTimeMs,
  }]

  statusTone.value = 'success'
  statusLabel.value = '排好啦！'
  stageMessage.value = '这些好朋友已经按顺序排好队啦。'

  if (completedRounds.value >= difficultyConfig.value.roundCount) {
    finishSession()
  } else {
    nextRoundTimer = setTimeout(() => {
      if (!props.paused) startRound()
    }, 1800)
  }
}

function buildPerformanceData() {
  const total = responseTimesMs.value.length
  const correct = correctRounds.value
  const avgRtMs = total > 0
    ? Math.round(responseTimesMs.value.reduce((s, t) => s + t, 0) / total)
    : 0

  // 字段严格对齐认知落库契约（cognitive-games-api 只认 accuracy_ratio /
  // average_response_ms / 嵌套 actual_params），与 K03/K04 样板一致。
  return {
    paradigm: 'size_order',
    difficulty_level: props.difficulty,
    total_rounds: total,
    correct_rounds: correct,
    accuracy_ratio: total > 0 ? parseFloat((correct / total).toFixed(4)) : 0,
    average_response_ms: avgRtMs,
    response_times_ms: [...responseTimesMs.value],
    wrong_attempts: wrongAttemptsTotal.value,
    drag_operations: dragCount.value,
    tap_operations: tapCount.value,
    actual_params: {
      session_type: 'K06_SIZE_ORDER',
      rounds: roundStats.value,
    },
  }
}

function finishSession() {
  phase.value = 'done'
  showBadge.value = true
  badgeName.value = difficultyConfig.value.badge.badgeName
  props.audio?.playSuccessCue?.()

  badgeTimer = setTimeout(() => {
    showBadge.value = false
  }, 700)

  completeTimer = setTimeout(() => {
    emit('complete', {
      performanceData: buildPerformanceData(),
      badge: difficultyConfig.value.badge,
    } as CustomGameCompletionPayload)
  }, 1500)
}

function resetBoard() {
  clearTimers()
  boardDirty = false
  selectedId.value = null
  dragItem.value = null
  dragPointerId = null
  completedRounds.value = 0
  correctRounds.value = 0
  responseTimesMs.value = []
  roundStats.value = []
  wrongAttemptsTotal.value = 0
  dragCount.value = 0
  tapCount.value = 0
  feedbackVisible.value = false
  startRound()
}

// ========== 交互：拖拽 + 点选双路径（PRD §1 备用路径） ==========

function itemCardClass(id: string) {
  return {
    'card--selected': selectedId.value === id,
    'card--dragging': dragItem.value?.id === id,
    'card--dimmed': phase.value !== 'playing',
  }
}

function slotClass(idx: number) {
  return {
    'slot--filled': slots.value[idx] !== null,
    'slot--target': selectedId.value !== null && slots.value[idx] === null,
  }
}

function onItemPointerDown(event: PointerEvent, item: SizeItem) {
  if (props.paused || phase.value !== 'playing') return
  if (items.value.some((it) => it.id === item.id) === false) return

  dragPointerId = event.pointerId
  dragStartClientX = event.clientX
  dragStartClientY = event.clientY
  dragMoved = false
  selectedId.value = item.id

  try {
    ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  } catch {
    // ignore capture failures
  }

  const onMove = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== dragPointerId) return
    const dx = moveEvent.clientX - dragStartClientX
    const dy = moveEvent.clientY - dragStartClientY
    if (!dragMoved && Math.hypot(dx, dy) > 12) {
      // 超过阈值 → 进入拖拽模式
      dragMoved = true
      dragItem.value = item
      dragCount.value += 1
      markBoardDirtyOnce()
    }
    if (dragMoved) {
      dragX.value = moveEvent.clientX
      dragY.value = moveEvent.clientY
    }
  }

  const onUp = (upEvent: PointerEvent) => {
    if (upEvent.pointerId !== dragPointerId) return
    cleanup()

    if (dragMoved) {
      // 拖拽落点：检测槽位
      const targetIdx = hitTestSlot(upEvent.clientX, upEvent.clientY)
      dragItem.value = null
      if (targetIdx !== null) {
        placeItem(item, targetIdx)
      } else {
        showFeedback('error', '把它拖到下面的空位里试试')
      }
    } else {
      // 视为点选（备用路径：点选起点）
      tapCount.value += 1
      markBoardDirtyOnce()
      // 已选中的再次点击 → 取消选中
      if (selectedId.value === item.id) {
        selectedId.value = null
      } else {
        selectedId.value = item.id
      }
    }
  }

  const cleanup = () => {
    dragPointerId = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onUp)
}

function onSlotClick(idx: number) {
  if (props.paused || phase.value !== 'playing') return
  const slot = slots.value[idx]
  if (slot != null) {
    // 点击已放置物品 → 取回（L3 允许"先放后调"；低难度同样宽容）
    slots.value[idx] = null
    items.value = [...items.value, slot]
    selectedId.value = null
    return
  }
  // 点选终点：把选中的物品放进空槽
  if (selectedId.value !== null) {
    const item = items.value.find((it) => it.id === selectedId.value)
    if (item) {
      tapCount.value += 1
      placeItem(item, idx)
    }
  }
}

function hitTestSlot(clientX: number, clientY: number): number | null {
  const slotElements = document.querySelectorAll('.slot-box')
  for (let i = 0; i < slotElements.length; i += 1) {
    const rect = slotElements[i]!.getBoundingClientRect()
    const margin = Math.min(24, rect.width * 0.18)
    if (
      clientX >= rect.left - margin
      && clientX <= rect.right + margin
      && clientY >= rect.top - margin
      && clientY <= rect.bottom + margin
    ) {
      if (slots.value[i] === null) {
        return i
      }
      return null // 落到已填槽 → 不放置
    }
  }
  return null
}

// ========== 尺寸与图片渲染 ==========

function figureStyle(item: SizeItem) {
  const type = ALL_ITEM_TYPES.find((t) => t.kind === item.kind)
  const isLength = type?.dimension === 'length'
  if (isLength) {
    // 2:1 底图：固定高度，宽度按 value 控制（裁右端 → 长度精确、粗细不变）
    return {
      width: `${item.value}px`,
      height: '96px',
    }
  }
  // 1:1 底图：等比缩放
  return {
    width: `${item.value}px`,
    height: `${item.value}px`,
  }
}

function figureFitClass(item: SizeItem) {
  const type = ALL_ITEM_TYPES.find((t) => t.kind === item.kind)
  return type?.dimension === 'length' ? 'figure-img--cover' : 'figure-img--contain'
}

function itemImageSrc(item: SizeItem) {
  const type = ALL_ITEM_TYPES.find((t) => t.kind === item.kind)
  if (!type) return ''
  // 预置资源经 resource:// 协议解析（打包后位于 resources/assets/resources/images/cognitive/size-order/）
  return `resource://images/cognitive/size-order/${type.imageKey}.png`
}

// ========== 生命周期 ==========

watch(
  () => props.difficulty,
  () => resetBoard(),
)

onUnmounted(() => {
  clearTimers()
})

resetBoard()
</script>

<style scoped>
.size-order-game {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 22px;
  min-height: 100%;
  position: relative;
  background:
    radial-gradient(circle at 15% 12%, rgba(255, 255, 255, 0.7), transparent 34%),
    linear-gradient(180deg, #e8f7f3 0%, #d5f0ea 55%, #c9e9e4 100%);
}

.hud-panel {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.hud-card {
  min-height: 72px;
  padding: 14px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 12px 24px rgba(38, 104, 96, 0.12);
  backdrop-filter: blur(8px);
}

.hud-card span {
  display: block;
  margin-bottom: 6px;
  color: #5c7a75;
  font-size: 13px;
}

.hud-card strong {
  display: block;
  color: #1f4a44;
  font-size: 20px;
}

.stage-layout {
  flex: 1;
}

.stage-panel {
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 36px rgba(40, 100, 92, 0.14);
  backdrop-filter: blur(10px);
  padding: 22px 26px;
  min-height: calc(100vh - 320px);
}

.status-strip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.status-strip span {
  color: #4c7a74;
  font-size: 13px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.status-strip strong {
  color: #1f4a44;
  font-size: 25px;
  line-height: 1.35;
}

.status-strip[data-tone='success'] strong {
  color: #2d9d6e;
}

.status-strip[data-tone='error'] strong {
  color: #c9774b;
}

/* ===== 物品区 ===== */
.items-area {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: center;
  gap: 26px;
  min-height: 220px;
  padding: 18px 10px;
  border-radius: 24px;
  background: rgba(226, 244, 240, 0.5);
  border: 2px dashed rgba(90, 150, 140, 0.3);
}

.items-done-note {
  align-self: center;
  color: #3d9c74;
  font-size: 22px;
  font-weight: 600;
}

.item-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 150px;
  min-height: 150px;
  padding: 14px;
  border-radius: 26px;
  border: 4px solid rgba(80, 140, 130, 0.28);
  background: #fff;
  box-shadow: 0 14px 26px rgba(40, 100, 92, 0.16);
  cursor: grab;
  touch-action: none;
  user-select: none;
  transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, opacity 140ms ease;
}

.item-card:active {
  cursor: grabbing;
}

.item-card.card--selected {
  border-color: #35b28a;
  box-shadow: 0 0 0 6px rgba(53, 178, 138, 0.2), 0 16px 30px rgba(40, 100, 92, 0.2);
  transform: translateY(-4px);
}

.item-card.card--dragging {
  opacity: 0.35;
}

.item-card.card--dimmed {
  opacity: 0.55;
}

.item-figure,
.slot-figure {
  display: flex;
  align-items: center;
  justify-content: center;
}

.figure-img {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 14px;
  user-select: none;
  -webkit-user-drag: none;
}

.figure-img--contain {
  object-fit: contain;
}

.figure-img--cover {
  object-fit: cover;
  object-position: left;
}

.item-hint {
  color: #2d9d6e;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

/* ===== 槽位区 ===== */
.slots-area {
  margin-top: 22px;
}

.slots-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 12px;
  color: #2f6b60;
  font-size: 17px;
  font-weight: 700;
}

.arrow-glyph {
  font-size: 22px;
}

.slots-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 22px;
}

.slot-box {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 180px;
  min-height: 190px;
  padding: 12px;
  border-radius: 26px;
  border: 4px dashed rgba(90, 150, 140, 0.5);
  background: rgba(255, 255, 255, 0.66);
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease;
  touch-action: manipulation;
}

.slot-box.slot--target {
  border-color: #35b28a;
  background: rgba(53, 178, 138, 0.1);
  box-shadow: 0 0 0 5px rgba(53, 178, 138, 0.16);
}

.slot-box.slot--filled {
  border-style: solid;
  border-color: rgba(53, 178, 138, 0.55);
  background: rgba(255, 255, 255, 0.92);
}

.slot-placeholder {
  color: rgba(70, 120, 110, 0.45);
  font-size: 30px;
  font-weight: 700;
}

.slot-remove-hint {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  color: rgba(70, 120, 110, 0.55);
  font-size: 12px;
}

/* ===== 反馈条 ===== */
.feedback-strip {
  margin-top: 18px;
  padding: 14px 20px;
  border-radius: 18px;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
}

.feedback-strip[data-tone='success'] {
  background: rgba(53, 178, 138, 0.16);
  color: #1f8a63;
}

.feedback-strip[data-tone='error'] {
  background: rgba(240, 150, 90, 0.16);
  color: #b96a35;
}

/* ===== 拖拽层 ===== */
.drag-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  pointer-events: none;
}

.drag-figure {
  position: fixed;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 18px 22px rgba(30, 80, 72, 0.35));
  opacity: 0.92;
  pointer-events: none;
}

.drag-figure svg {
  display: block;
}

/* ===== 徽章 ===== */
.badge-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(30, 60, 56, 0.25);
  backdrop-filter: blur(4px);
}

.badge-card {
  padding: 34px 44px;
  border-radius: 30px;
  text-align: center;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 26px 44px rgba(30, 70, 64, 0.25);
}

.badge-icon {
  font-size: 54px;
}

.badge-name {
  margin: 12px 0 0;
  color: #1f4a44;
  font-size: 24px;
  font-weight: 700;
}

.badge-pop-enter-active,
.badge-pop-leave-active {
  transition: opacity 260ms ease, transform 260ms ease;
}

.badge-pop-enter-from,
.badge-pop-leave-to {
  opacity: 0;
  transform: scale(0.92);
}

.is-paused {
  opacity: 0.7;
  pointer-events: none;
}

@media (max-width: 1080px) {
  .hud-panel {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .item-card {
    min-width: 120px;
    min-height: 120px;
  }

  .slot-box {
    width: 140px;
    min-height: 150px;
  }
}
</style>
