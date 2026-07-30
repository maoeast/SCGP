<template>
  <div class="maze-run-game" tabindex="0" @keydown="handleKey" ref="mazeRef">
    <div class="hud-bar">
      <span class="hud-item">难度 {{ difficultyLabel }}</span>
      <span class="hud-item">第 {{ round }} / {{ totalRounds }} 轮</span>
      <span class="hud-item">✅ {{ correctCount }}</span>
      <span class="hud-item" v-if="collectedCount > 0">🎁 {{ collectedCount }}/{{ totalCollectibles }}</span>
    </div>

    <div class="message" :class="messageTone">{{ message }}</div>

    <div class="maze-grid" :style="gridStyle">
      <div
        v-for="(cell, idx) in cells"
        :key="idx"
        class="maze-cell"
        :class="cellClass(cell, idx)"
        @click="moveToCell(idx)"
      >
        <span v-if="cell.isStart">🚪</span>
        <span v-else-if="cell.isEnd">⭐</span>
        <span v-else-if="cell.isCollectible && !cell.collected">💎</span>
        <span v-else-if="cell.player">🐱</span>
        <span v-else-if="cell.isTrail">·</span>
      </div>
    </div>

    <div class="controls-hint">方向键移动 · 点击相邻格移动</div>

    <div v-if="props.paused" class="pause-overlay">⏸️ 已暂停</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, nextTick } from 'vue'
import type { EmotionGameCompletionPayload } from '@/types/emotional/games'

interface Cell {
  row: number
  col: number
  wall: boolean
  isStart: boolean
  isEnd: boolean
  isCollectible: boolean
  collected: boolean
  player: boolean
  isTrail: boolean
}

const props = defineProps<{
  difficulty: number
  settings: Record<string, any>
  paused: boolean
  markRoundDirty: () => void
  audio: any
}>()

const emit = defineEmits<{ complete: [result: EmotionGameCompletionPayload] }>()

const configs: { label: string; size: number; rounds: number; deadEnds: number; collectibles: number }[] = [
  { label: '简单', size: 5, rounds: 3, deadEnds: 0, collectibles: 0 },
  { label: '中等', size: 7, rounds: 4, deadEnds: 3, collectibles: 1 },
  { label: '困难', size: 9, rounds: 4, deadEnds: 4, collectibles: 2 },
] as const
const cfg = computed(() => configs[Math.min(props.difficulty - 1, 2)] ?? configs[0]!)
const difficultyLabel = computed(() => cfg.value.label)
const totalRounds = computed(() => cfg.value.rounds)

const gridSize = computed(() => cfg.value.size)
const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${gridSize.value}, 1fr)`,
  gridTemplateRows: `repeat(${gridSize.value}, 1fr)`,
}))

const round = ref(1)
const correctCount = ref(0)
const cells = ref<Cell[]>([])
const playerIdx = ref(0)
const message = ref('用方向键或点击格子移动，走到 ⭐')
const messageTone = ref<'info' | 'success' | 'warn'>('info')
const collectedCount = ref(0)
const totalCollectibles = ref(0)
const mazeRef = ref<HTMLElement | null>(null)

const N = computed(() => gridSize.value)

function idx(r: number, c: number) { return r * N.value + c }
function cell(i: number): Cell { return cells.value[i]! }
function setCell(i: number, updates: Partial<Cell>) {
  const c = cells.value[i]!
  Object.assign(c, updates)
}

function generateMaze() {
  const n = N.value
  const total = n * n
  const newCells: Cell[] = Array.from({ length: total }, (_, i) => ({
    row: Math.floor(i / n),
    col: i % n,
    wall: false,
    isStart: false,
    isEnd: false,
    isCollectible: false,
    collected: false,
    player: false,
    isTrail: false,
  }))

  // Place walls on border
  for (let i = 0; i < total; i++) {
    const c = newCells[i]!
    if (c.row === 0 || c.row === n - 1 || c.col === 0 || c.col === n - 1) {
      c.wall = true
    }
  }

  // Carve corridors using randomized DFS
  const visited = new Set<number>()
  const startCell = idx(Math.floor(n / 2), 1)
  const endCell = idx(Math.floor(n / 2), n - 2)

  newCells[startCell]!.wall = false
  newCells[endCell]!.wall = false
  newCells[startCell]!.isStart = true
  newCells[endCell]!.isEnd = true

  // Initialize interior walls randomly
  for (let i = 0; i < total; i++) {
    const c = newCells[i]!
    if (c.row > 0 && c.row < n - 1 && c.col > 0 && c.col < n - 1) {
      c.wall = Math.random() < 0.35
    }
  }
  newCells[startCell]!.wall = false
  newCells[endCell]!.wall = false

  // Ensure path exists via BFS
  ensurePath(newCells, startCell, endCell)

  // Add dead ends
  const deadEndsNeeded = cfg.value.deadEnds
  let deadAdded = 0
  const candidates: number[] = []
  for (let i = 0; i < total; i++) {
    if (!newCells[i]!.wall && i !== startCell && i !== endCell) candidates.push(i)
  }
  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = candidates[i]!
    candidates[i] = candidates[j]!
    candidates[j] = tmp
  }
  // Add walls that create dead ends without blocking path
  for (const ci of candidates) {
    if (deadAdded >= deadEndsNeeded) break
    newCells[ci]!.wall = true
    if (hasPath(newCells, startCell, endCell)) {
      deadAdded++
    } else {
      newCells[ci]!.wall = false
    }
  }

  // Place collectibles
  const collNeeded = cfg.value.collectibles
  let collPlaced = 0
  for (const ci of candidates) {
    if (collPlaced >= collNeeded) break
    if (!newCells[ci]!.wall && ci !== startCell && ci !== endCell && !newCells[ci]!.isCollectible) {
      newCells[ci]!.isCollectible = true
      collPlaced++
    }
  }

  newCells[startCell]!.player = true
  cells.value = newCells
  playerIdx.value = startCell
  collectedCount.value = 0
  totalCollectibles.value = collNeeded
  message.value = '用方向键或点击格子移动，走到 ⭐'
  messageTone.value = 'info'
}

function ensurePath(cells: Cell[], start: number, end: number) {
  if (!hasPath(cells, start, end)) {
    // Punch a horizontal corridor through the middle
    const n = N.value
    const midRow = Math.floor(n / 2)
    for (let c = 1; c < n - 1; c++) {
      cells[idx(midRow, c)]!.wall = false
    }
  }
}

function hasPath(cells: Cell[], start: number, end: number): boolean {
  const n = N.value
  const visited = new Set<number>()
  const queue = [start]
  visited.add(start)

  while (queue.length > 0) {
    const cur = queue.shift()!
    if (cur === end) return true
    const r = Math.floor(cur / n)
    const c = cur % n
    for (const [dr, dc] of ([[-1, 0], [1, 0], [0, -1], [0, 1]] as [number, number][])) {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue
      const ni = idx(nr, nc)
      if (cells[ni]!.wall || visited.has(ni)) continue
      visited.add(ni)
      queue.push(ni)
    }
  }
  return false
}

function handleKey(e: KeyboardEvent) {
  if (props.paused) return
  let rowDelta = 0, colDelta = 0
  if (e.key === 'ArrowUp') { rowDelta = -1; colDelta = 0 }
  else if (e.key === 'ArrowDown') { rowDelta = 1; colDelta = 0 }
  else if (e.key === 'ArrowLeft') { rowDelta = 0; colDelta = -1 }
  else if (e.key === 'ArrowRight') { rowDelta = 0; colDelta = 1 }
  else return
  e.preventDefault()

  const cur = cell(playerIdx.value)
  const nr = cur.row + rowDelta
  const nc = cur.col + colDelta
  if (nr < 0 || nr >= N.value || nc < 0 || nc >= N.value) return
  const ni = idx(nr, nc)
  moveToCell(ni)
}

function moveToCell(targetIdx: number) {
  if (props.paused) return
  const target = cell(targetIdx)
  if (target.wall) return

  const cur = cell(playerIdx.value)
  const dr = Math.abs(target.row - cur.row)
  const dc = Math.abs(target.col - cur.col)
  if (dr + dc !== 1) return // Only adjacent moves

  // Move player
  cur.player = false
  cur.isTrail = true
  target.player = true
  playerIdx.value = targetIdx

  if (target.isCollectible && !target.collected) {
    target.collected = true
    collectedCount.value++
    props.markRoundDirty()
    message.value = `💎 收集到宝石！(${collectedCount.value}/${totalCollectibles.value})`
    messageTone.value = 'success'
  }

  if (target.isEnd) {
    const allCollected = collectedCount.value >= totalCollectibles.value
    if (!allCollected && totalCollectibles.value > 0) {
      message.value = `还需要收集 ${totalCollectibles.value - collectedCount.value} 个宝石才能通关`
      messageTone.value = 'warn'
      return
    }
    correctCount.value++
    props.markRoundDirty()
    message.value = '🎉 到达终点！'
    messageTone.value = 'success'
    setTimeout(() => {
      if (round.value >= totalRounds.value) {
        emit('complete', { performanceData: { correct: correctCount.value, total: totalRounds.value } })
      } else {
        round.value++
        generateMaze()
        nextTick(() => mazeRef.value?.focus())
      }
    }, 900)
  }
}

function cellClass(cell: Cell, _idx: number) {
  return {
    'cell-wall': cell.wall,
    'cell-start': cell.isStart,
    'cell-end': cell.isEnd,
    'cell-player': cell.player,
    'cell-collectible': cell.isCollectible && !cell.collected,
    'cell-collected': cell.isCollectible && cell.collected,
    'cell-trail': cell.isTrail && !cell.player,
    'cell-path': !cell.wall && !cell.player,
  }
}

onMounted(() => {
  generateMaze()
  nextTick(() => mazeRef.value?.focus())
})
watch(() => props.difficulty, () => {
  round.value = 1
  correctCount.value = 0
  generateMaze()
  nextTick(() => mazeRef.value?.focus())
})
</script>

<style scoped>
.maze-run-game {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 16px; position: relative; outline: none;
}
.hud-bar { display: flex; gap: 16px; font-size: 14px; color: #606266; }
.hud-item { background: #f5f7fa; padding: 4px 12px; border-radius: 10px; }
.message { font-size: 17px; font-weight: 600; min-height: 26px; }
.message.info { color: #303133; }
.message.success { color: #67c23a; }
.message.warn { color: #e6a23c; }

.maze-grid {
  display: grid; gap: 2px; background: #e5e7eb; padding: 4px; border-radius: 12px;
  width: min(360px, 90vw); aspect-ratio: 1;
}
.maze-cell {
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; font-size: 16px; cursor: default; transition: background 0.15s;
}
.cell-wall { background: #6b7280; }
.cell-start { background: #dbeafe; }
.cell-end { background: #fef3c7; }
.cell-player { background: #bfdbfe; font-size: 18px; }
.cell-collectible { background: #ede9fe; }
.cell-collected { background: #e5e7eb; }
.cell-trail { background: #e0f2fe; color: #93c5fd; }
.cell-path { background: #fff; cursor: pointer; }
.cell-path:hover { background: #f0fdf4; }

.controls-hint { font-size: 12px; color: #c0c4cc; }

.pause-overlay {
  position: absolute; inset: 0; background: rgba(255,255,255,.85);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #909399; border-radius: 12px;
}
</style>
