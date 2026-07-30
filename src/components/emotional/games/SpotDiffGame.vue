<template>
  <div class="spot-diff-game">
    <div class="hud-bar">
      <span class="hud-item">难度 {{ difficultyLabel }}</span>
      <span class="hud-item">第 {{ round }} / {{ totalRounds }} 轮</span>
      <span class="hud-item">✅ {{ correctCount }}</span>
      <span class="hud-item">🎯 还剩 {{ remainingDiffs }} 处</span>
    </div>

    <div class="message" :class="messageTone">{{ message }}</div>

    <div class="scene-row">
      <div class="scene-panel" @click="handlePanelClick('left', $event)">
        <svg :viewBox="`0 0 400 300`" class="scene-svg">
          <g v-for="el in sceneElements" :key="el.id">
            <component
              :is="renderElement(el, 'left')"
            />
          </g>
        </svg>
        <div class="diff-markers">
          <div
            v-for="d in foundDiffs"
            :key="d.id"
            class="diff-circle left-circle"
            :style="{ left: d.x - 18 + 'px', top: d.y - 18 + 'px' }"
          >✓</div>
        </div>
      </div>
      <div class="scene-panel" @click="handlePanelClick('right', $event)">
        <svg :viewBox="`0 0 400 300`" class="scene-svg">
          <g v-for="el in sceneElements" :key="el.id">
            <component
              :is="renderElement(el, 'right')"
            />
          </g>
        </svg>
        <div class="diff-markers">
          <div
            v-for="d in foundDiffs"
            :key="d.id"
            class="diff-circle right-circle"
            :style="{ left: d.x - 18 + 'px', top: d.y - 18 + 'px' }"
          >✓</div>
        </div>
      </div>
    </div>

    <div v-if="props.paused" class="pause-overlay">⏸️ 已暂停</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, h } from 'vue'
import type { EmotionGameCompletionPayload } from '@/types/emotional/games'

interface SceneElement {
  id: string
  type: string
  x: number
  y: number
  props: Record<string, any>
  altProps?: Record<string, any>
}

interface DiffDef {
  id: string
  x: number
  y: number
  elementId: string
}

const props = defineProps<{
  difficulty: number
  settings: Record<string, any>
  paused: boolean
  markRoundDirty: () => void
  audio: any
}>()

const emit = defineEmits<{ complete: [result: EmotionGameCompletionPayload] }>()

const configs: { label: string; diffs: number; rounds: number; elements: number }[] = [
  { label: '简单', diffs: 1, rounds: 3, elements: 5 },
  { label: '中等', diffs: 2, rounds: 4, elements: 7 },
  { label: '困难', diffs: 3, rounds: 4, elements: 9 },
]
const cfg = computed(() => configs[Math.min(props.difficulty - 1, 2)] ?? configs[0]!)
const difficultyLabel = computed(() => cfg.value.label)
const totalRounds = computed(() => cfg.value.rounds)

const round = ref(1)
const correctCount = ref(0)
const sceneElements = ref<SceneElement[]>([])
const diffDefs = ref<DiffDef[]>([])
const foundDiffs = ref<DiffDef[]>([])
const message = ref('找出左右两幅图中所有不同之处')
const messageTone = ref<'info' | 'success' | 'warn'>('info')

const remainingDiffs = computed(() => diffDefs.value.length - foundDiffs.value.length)

function generateScene() {
  const elCount = cfg.value.elements
  const diffCount = cfg.value.diffs
  const elements: SceneElement[] = []
  const diffs: DiffDef[] = []

  // Generate base elements
  const types = ['sun', 'cloud', 'tree', 'house', 'star', 'flower', 'bird']
  const usedTypes = new Set<string>()

  for (let i = 0; i < elCount; i++) {
    let type: string = types[i % types.length] ?? 'sun'
    while (usedTypes.has(type) && i < types.length) {
      const idx = types.indexOf(type)
      type = types[(idx + 1) % types.length] ?? 'sun'
    }
    usedTypes.add(type)

    const el: SceneElement = {
      id: `el-${i}`,
      type,
      x: 30 + Math.floor(Math.random() * 320),
      y: 30 + Math.floor(Math.random() * 220),
      props: randomProps(type),
    }

    // Pick some elements to be different
    if (diffs.length < diffCount && i > 0) {
      el.altProps = alteredProps(el.props, type)
      diffs.push({ id: `diff-${diffs.length}`, x: el.x, y: el.y, elementId: el.id })
    }

    elements.push(el)
  }

  sceneElements.value = elements
  diffDefs.value = diffs
  foundDiffs.value = []
}

function randomProps(type: string): Record<string, any> {
  const base: Record<string, any> = {}
  switch (type) {
    case 'sun': base.r = 20; base.color = '#fbbf24'; break
    case 'cloud': base.w = 40; base.h = 20; base.color = '#e5e7eb'; break
    case 'tree': base.h = 50; base.w = 14; base.crownColor = '#10b981'; base.trunkColor = '#92400e'; break
    case 'house': base.w = 50; base.h = 40; base.roofColor = '#ef4444'; base.wallColor = '#fef3c7'; base.hasWindow = true; break
    case 'star': base.r = 10; base.color = '#f59e0b'; break
    case 'flower': base.r = 8; base.petalColor = '#ec4899'; base.centerColor = '#fbbf24'; break
    case 'bird': base.size = 14; base.color = '#3b82f6'; break
  }
  return base
}

function alteredProps(orig: Record<string, any>, type: string): Record<string, any> {
  const alt = { ...orig }
  const changes = [
    () => { alt.color = alt.color === '#fbbf24' ? '#ef4444' : '#fbbf24' },
    () => { alt.r = (alt.r || 10) * 1.4 },
    () => { alt.w = (alt.w || 30) * 0.7 },
    () => { alt.h = (alt.h || 20) * 1.5 },
    () => { if (alt.crownColor) alt.crownColor = '#f59e0b' },
    () => { if (alt.roofColor) alt.roofColor = '#3b82f6' },
    () => { if (alt.hasWindow !== undefined) alt.hasWindow = false },
    () => { if (alt.color) alt.color = '#8b5cf6' },
  ]
  const fn = changes[Math.floor(Math.random() * changes.length)]
  if (fn) fn()
  return alt
}

function handlePanelClick(_side: string, event: MouseEvent) {
  if (props.paused) return
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const scaleX = 400 / rect.width
  const scaleY = 300 / rect.height
  const clickX = (event.clientX - rect.left) * scaleX
  const clickY = (event.clientY - rect.top) * scaleY

  // Find nearest unfound diff within 40px
  const hit = diffDefs.value.find((d) => {
    if (foundDiffs.value.some((f) => f.id === d.id)) return false
    const dx = d.x - clickX
    const dy = d.y - clickY
    return Math.sqrt(dx * dx + dy * dy) < 40
  })

  if (hit) {
    foundDiffs.value.push(hit)
    props.markRoundDirty()
    message.value = '✅ 找到了！'
    messageTone.value = 'success'

    if (foundDiffs.value.length === diffDefs.value.length) {
      correctCount.value++
      setTimeout(() => {
        if (round.value >= totalRounds.value) {
          emit('complete', { performanceData: { correct: correctCount.value, total: totalRounds.value } })
        } else {
          round.value++
          generateScene()
        }
      }, 800)
    }
  } else {
    message.value = '再找找，这里好像没有不同'
    messageTone.value = 'warn'
  }
}

// Render each element as SVG vnode
function renderElement(el: SceneElement, side: string) {
  const p = side === 'left' ? el.props : (el.altProps || el.props)
  const base = { x: el.x, y: el.y }

  switch (el.type) {
    case 'sun':
      return h('circle', { cx: el.x, cy: el.y, r: p.r, fill: p.color, opacity: 0.8 })
    case 'cloud':
      return h('ellipse', { cx: el.x, cy: el.y, rx: p.w / 2, ry: p.h / 2, fill: p.color })
    case 'tree':
      return h('g', {}, [
        h('rect', { x: el.x - p.w / 2, y: el.y, width: p.w, height: p.h - 12, fill: p.trunkColor }),
        h('circle', { cx: el.x, cy: el.y - 6, r: p.h / 3, fill: p.crownColor }),
      ])
    case 'house':
      return h('g', {}, [
        h('rect', { x: el.x - p.w / 2, y: el.y - 8, width: p.w, height: p.h, fill: p.wallColor }),
        h('polygon', { points: `${el.x - p.w / 2 - 4},${el.y - 8} ${el.x},${el.y - 22} ${el.x + p.w / 2 + 4},${el.y - 8}`, fill: p.roofColor }),
        p.hasWindow ? h('rect', { x: el.x - 6, y: el.y + 4, width: 12, height: 12, fill: '#93c5fd', rx: 2 }) : null,
      ])
    case 'star':
      return h('polygon', {
        points: starPoints(el.x, el.y, p.r),
        fill: p.color,
      })
    case 'flower':
      return h('g', {}, [
        h('circle', { cx: el.x, cy: el.y, r: p.r * 1.5, fill: p.petalColor }),
        h('circle', { cx: el.x, cy: el.y, r: p.r / 2, fill: p.centerColor }),
      ])
    case 'bird':
      return h('polygon', {
        points: `${el.x - p.size / 2},${el.y + p.size / 3} ${el.x},${el.y - p.size / 2} ${el.x + p.size / 2},${el.y + p.size / 3}`,
        fill: p.color,
      })
    default:
      return h('circle', { cx: el.x, cy: el.y, r: 10, fill: '#ccc' })
  }
}

function starPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.45
    const angle = (Math.PI * i) / 5 - Math.PI / 2
    pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`)
  }
  return pts.join(' ')
}

onMounted(() => generateScene())
watch(() => props.difficulty, () => { round.value = 1; correctCount.value = 0; generateScene() })
</script>

<style scoped>
.spot-diff-game {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 16px; position: relative;
}
.hud-bar { display: flex; gap: 16px; font-size: 14px; color: #606266; }
.hud-item { background: #f5f7fa; padding: 4px 12px; border-radius: 10px; }
.message { font-size: 18px; font-weight: 600; min-height: 28px; }
.message.info { color: #303133; }
.message.success { color: #67c23a; }
.message.warn { color: #e6a23c; }

.scene-row { display: flex; gap: 12px; }
.scene-panel {
  width: 360px; height: 270px; border: 3px solid #dcdfe6; border-radius: 16px;
  background: #f9fafb; cursor: crosshair; position: relative; overflow: hidden;
}
.scene-svg { width: 100%; height: 100%; display: block; }

.diff-markers { pointer-events: none; }
.diff-circle {
  position: absolute; width: 36px; height: 36px; border-radius: 50%;
  background: rgba(103,194,58,.85); color: #fff; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 3px rgba(103,194,58,.3);
}
.pause-overlay {
  position: absolute; inset: 0; background: rgba(255,255,255,.85);
  display: flex; align-items: center; justify-content: center;
  font-size: 28px; color: #909399; border-radius: 12px;
}
</style>
