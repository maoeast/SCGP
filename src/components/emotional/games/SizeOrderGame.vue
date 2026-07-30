<template>
  <div class="size-order-game">
    <div class="hud-bar">
      <span class="hud-item">难度 {{ difficultyConfig.label }}</span>
      <span class="hud-item">第 {{ round }} / {{ totalRounds }} 轮</span>
      <span class="hud-item">✅ {{ correctCount }}</span>
    </div>

    <div class="message" :class="messageTone">{{ message }}</div>

    <!-- Items to sort (top row) -->
    <div class="items-row">
      <button
        v-for="item in shuffledItems"
        :key="item.id"
        class="item-chip"
        :class="{ selected: selectedId === item.id, placed: placedIds.has(item.id) }"
        :disabled="props.paused"
        @click="selectItem(item)"
      >
        <div class="item-visual" v-html="renderItem(item)"></div>
      </button>
    </div>

    <!-- Sort slots (bottom row) -->
    <div class="slots-row">
      <button
        v-for="(slot, idx) in slots"
        :key="idx"
        class="slot-box"
        :class="{ filled: slot !== null, target: selectedId !== null && slot === null, correct: slotCorrect[idx], wrong: slotWrong[idx] }"
        :disabled="props.paused"
        @click="placeInSlot(idx)"
      >
        <template v-if="slot !== null">
          <div class="slot-visual" v-html="renderItem(slot)"></div>
        </template>
        <template v-else>
          <span class="slot-number">{{ ascending ? idx + 1 : totalItems - idx }}</span>
        </template>
      </button>
    </div>

    <div class="sort-label">{{ ascending ? '从小到大 →' : '从大到小 →' }}</div>

    <div v-if="props.paused" class="pause-overlay">⏸️ 已暂停</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import type { EmotionGameCompletionPayload } from '@/types/emotional/games'

interface SizeItem {
  id: number
  size: number
  color: string
  label: string
}

const props = defineProps<{
  difficulty: number
  settings: Record<string, any>
  paused: boolean
  markRoundDirty: () => void
  audio: any
}>()

const emit = defineEmits<{ complete: [result: EmotionGameCompletionPayload] }>()

const difficultyConfig = computed(() => {
  const configs: { label: string; items: number; rounds: number; minDiff: number }[] = [
    { label: '简单', items: 3, rounds: 3, minDiff: 24 },
    { label: '中等', items: 4, rounds: 4, minDiff: 14 },
    { label: '困难', items: 5, rounds: 5, minDiff: 8 },
  ]
  return configs[Math.min(props.difficulty - 1, 2)] ?? configs[0]!
})

const colors = ['#f56c6c', '#67c23a', '#409eff', '#e6a23c', '#9060eb']
const itemLabels = ['🍎', '⭐', '🌸', '🎈', '🌙']
const itemNames = ['苹果', '星星', '花朵', '气球', '月亮']

const totalItems = computed(() => difficultyConfig.value.items)
const totalRounds = computed(() => difficultyConfig.value.rounds)

const ascending = ref(true)
const round = ref(1)
const correctCount = ref(0)
const selectedId = ref<number | null>(null)
const placedIds = ref(new Set<number>())
const slots = ref<(SizeItem | null)[]>([])
const slotCorrect = ref<boolean[]>([])
const slotWrong = ref<boolean[]>([])
const message = ref('把物品从小到大排好队')
const messageTone = ref<'info' | 'success' | 'warn'>('info')
const shuffledItems = ref<SizeItem[]>([])
const sortedReference = ref<SizeItem[]>([])

function generateItems(): SizeItem[] {
  const n = totalItems.value
  const minDiff = difficultyConfig.value.minDiff
  const baseSize = 28
  const sizes: number[] = []

  for (let i = 0; i < n; i++) {
    sizes.push(baseSize + i * minDiff + Math.floor(Math.random() * 6))
  }
  sizes.sort((a, b) => a - b)

  return sizes.map((size, i) => ({
    id: i,
    size,
    color: colors[i % colors.length] ?? '#409eff',
    label: itemLabels[i % itemLabels.length] ?? '?',
  }))
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]!
    a[i] = a[j]!
    a[j] = tmp
  }
  return a
}

function startRound() {
  const items = generateItems()
  shuffledItems.value = shuffle(items)
  const sorted = [...items].sort((a, b) => a.size - b.size)
  sortedReference.value = ascending.value ? sorted : [...sorted].reverse()
  slots.value = Array(totalItems.value).fill(null)
  slotCorrect.value = Array(totalItems.value).fill(false)
  slotWrong.value = Array(totalItems.value).fill(false)
  selectedId.value = null
  placedIds.value = new Set()
  ascending.value = round.value % 2 === 1
  message.value = ascending.value ? '把物品从小到大排好队' : '把物品从大到小排好队'
  messageTone.value = 'info'
}

function selectItem(item: SizeItem) {
  if (props.paused || placedIds.value.has(item.id)) return
  selectedId.value = selectedId.value === item.id ? null : item.id
}

function placeInSlot(slotIdx: number) {
  if (props.paused) return
  if (slots.value[slotIdx] !== null) {
    // Tap filled slot to remove item
    const removed = slots.value[slotIdx]!
    slots.value[slotIdx] = null
    placedIds.value.delete(removed.id)
    slotCorrect.value[slotIdx] = false
    slotWrong.value[slotIdx] = false
    return
  }
  if (selectedId.value === null) return

  const item = shuffledItems.value.find((it) => it.id === selectedId.value)
  if (!item) return

  if (item.id === (sortedReference.value[slotIdx]?.id ?? -1)) {
    slots.value[slotIdx] = item
    placedIds.value.add(item.id)
    slotCorrect.value[slotIdx] = true
    slotWrong.value[slotIdx] = false
    selectedId.value = null
    props.markRoundDirty()
    message.value = '✅ 放对了！'
    messageTone.value = 'success'

    // Check if all filled
    if (slots.value.every((s) => s !== null)) {
      correctCount.value++
      setTimeout(() => {
        if (round.value >= totalRounds.value) {
          emit('complete', { performanceData: { correct: correctCount.value, total: totalRounds.value } })
        } else {
          round.value++
          startRound()
        }
      }, 800)
    }
  } else {
    slotWrong.value[slotIdx] = true
    message.value = '再想一想，这个位置放谁更合适？'
    messageTone.value = 'warn'
    setTimeout(() => {
      slotWrong.value[slotIdx] = false
    }, 600)
  }
}

function renderItem(item: SizeItem): string {
  const r = item.size / 2
  return `<svg viewBox="0 0 100 100" width="64" height="64">
    <circle cx="50" cy="50" r="${r}" fill="${item.color}" opacity="0.85" />
    <text x="50" y="56" text-anchor="middle" font-size="20" fill="white">${item.label}</text>
  </svg>`
}

onMounted(() => startRound())
watch(() => props.difficulty, () => { round.value = 1; correctCount.value = 0; startRound() })
</script>

<style scoped>
.size-order-game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 16px;
  position: relative;
}
.hud-bar { display: flex; gap: 20px; font-size: 14px; color: #606266; }
.hud-item { background: #f5f7fa; padding: 4px 12px; border-radius: 10px; }
.message { font-size: 18px; font-weight: 600; min-height: 28px; }
.message.info { color: #303133; }
.message.success { color: #67c23a; }
.message.warn { color: #e6a23c; }

.items-row { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
.item-chip {
  width: 80px; height: 80px; border: 3px solid #dcdfe6; border-radius: 16px;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.item-chip:hover:not(:disabled) { border-color: #409eff; transform: scale(1.05); }
.item-chip.selected { border-color: #409eff; box-shadow: 0 0 0 3px rgba(64,158,255,.25); }
.item-chip.placed { opacity: 0.3; pointer-events: none; }
.item-visual { display: flex; align-items: center; justify-content: center; }

.slots-row { display: flex; gap: 12px; }
.slot-box {
  width: 80px; height: 80px; border: 3px dashed #c0c4cc; border-radius: 16px;
  background: #fafafa; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.slot-box.target { border-color: #409eff; background: #ecf5ff; }
.slot-box.filled { border-style: solid; border-color: #c0c4cc; background: #fff; }
.slot-box.correct { border-color: #67c23a; background: #f0f9eb; }
.slot-box.wrong { border-color: #f56c6c; background: #fef0f0; animation: shake 0.3s; }
.slot-number { font-size: 20px; color: #c0c4cc; font-weight: 600; }
.slot-visual { display: flex; align-items: center; justify-content: center; }
.sort-label { font-size: 14px; color: #909399; }

.pause-overlay {
  position: absolute; inset: 0; background: rgba(255,255,255,.85);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #909399; border-radius: 12px;
}
@keyframes shake {
  0%,100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
</style>
