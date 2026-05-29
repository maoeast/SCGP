# 擦亮坏心情视觉升级 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 升级 WipeSadnessGame.vue 的太阳动画、山丘湖泊、擦拭粒子和庆祝动画四个视觉维度。

**架构：** 仅修改 `src/components/emotional/games/WipeSadnessGame.vue` 一个文件。模板层替换太阳 SVG 和山丘 SVG，脚本层新增冰晶粒子系统（独立 Canvas + rAF 循环），庆祝动画在现有 confetti 基础上扩展金色光雨和冰霜爆碎。

**技术栈：** Vue 3 SFC + Canvas 2D + SVG + CSS keyframes

---

### 任务 1：太阳动画改造

**文件：**
- 修改：`src/components/emotional/games/WipeSadnessGame.vue` 模板第 49-66 行（sun-core 区域）+ 样式

- [ ] **步骤 1：替换太阳 SVG 模板**

将第 49-66 行的 `<div class="sun-core">` 整体替换为：

```html
<div class="sun-core" :style="sunCoreStyle">
  <div class="sun-glow" />
  <svg viewBox="0 0 200 200" class="sun-rays-primary" aria-hidden="true">
    <g transform="translate(100,100)">
      <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" />
      <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(45)" />
      <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(90)" />
      <polygon points="0,-82 6,-42 -6,-42" fill="rgba(255,201,88,0.75)" transform="rotate(135)" />
    </g>
  </svg>
  <svg viewBox="0 0 200 200" class="sun-rays-secondary" aria-hidden="true">
    <g transform="translate(100,100)">
      <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(22.5)" />
      <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(67.5)" />
      <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(112.5)" />
      <rect x="-5" y="-76" width="10" height="30" rx="5" fill="rgba(255,230,150,0.55)" transform="rotate(157.5)" />
    </g>
  </svg>
  <div class="sun-face">
    <svg viewBox="0 0 200 200" aria-hidden="true">
      <circle cx="100" cy="100" r="68" :fill="theme.sunFill" />
      <path d="M72 88 Q82 80 92 88" fill="none" stroke="#5b4a2c" stroke-width="3.5" stroke-linecap="round" />
      <path d="M108 88 Q118 80 128 88" fill="none" stroke="#5b4a2c" stroke-width="3.5" stroke-linecap="round" />
      <path d="M72 120c8 14 20 20 28 20s20-6 28-20" fill="none" stroke="#5b4a2c" stroke-width="4" stroke-linecap="round" />
      <ellipse cx="64" cy="116" rx="10" ry="6" fill="rgba(255,150,150,0.35)" />
      <ellipse cx="136" cy="116" rx="10" ry="6" fill="rgba(255,150,150,0.35)" />
    </svg>
  </div>
</div>
```

- [ ] **步骤 2：替换太阳相关 CSS**

删除 `.sun-svg` 和 `.sun-ray` 规则，替换为：

```css
.sun-glow {
  position: absolute;
  inset: -30%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 204, 82, 0.45), transparent 65%);
  animation: sun-pulse 1.8s ease-in-out infinite;
}

.sun-rays-primary {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  animation: sun-spin 12s linear infinite;
}

.sun-rays-secondary {
  position: absolute;
  inset: -10%;
  width: 120%;
  height: 120%;
  animation: sun-spin 18s linear infinite reverse;
}

.sun-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  animation: sun-warm 3s ease-in-out infinite;
}

.sun-face svg {
  width: 100%;
  height: 100%;
  display: block;
}
```

在 `@keyframes twinkle` 前新增：

```css
@keyframes sun-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes sun-pulse {
  0%, 100% { transform: scale(1); opacity: 0.45; }
  50% { transform: scale(1.18); opacity: 0.75; }
}

@keyframes sun-warm {
  0%, 100% { filter: drop-shadow(0 0 20px rgba(255, 179, 3, 0.3)); }
  50% { filter: drop-shadow(0 0 35px rgba(255, 179, 3, 0.5)); }
}
```

- [ ] **步骤 3：更新 sunCoreStyle 计算属性**

将 `sunCoreStyle` 计算属性（第 324-333 行）替换为：

```typescript
const sunCoreStyle = computed(() => {
  const baseScale = 0.9 + clearedRatio.value * 0.24
  const scale = phase.value === 'celebrating' || phase.value === 'finished'
    ? 1.3
    : phase.value === 'celebrating'
      ? 1.16
      : baseScale
  const glow = 0.28 + clearedRatio.value * 0.44
  return {
    transform: `translateX(-50%) scale(${scale})`,
    boxShadow: `0 0 0 14px rgba(255, 221, 121, ${glow * 0.22}), 0 22px 38px rgba(255, 193, 83, ${glow * 0.4})`,
  }
})
```

- [ ] **步骤 4：运行 type-check 验证无新增错误**

运行：`npm run type-check 2>&1 | grep WipeSadness`

---

### 任务 2：山丘湖泊童话插画替换

**文件：**
- 修改：`src/components/emotional/games/WipeSadnessGame.vue` 模板第 22-47 行（scene-hills 区域）+ Theme 接口 + THEMES 常量 + CSS

- [ ] **步骤 1：扩展 Theme 接口**

在 `Theme` 接口（第 119-130 行）中，将 `hillStops` 和 `lakeStops` 字段替换为多层色板：

```typescript
interface Theme {
  key: string
  title: string
  skyGradient: string
  glowGradient: string
  hillFar: string
  hillMid: string
  hillNear: string
  lakeFill: string
  grassStroke: string
  sunFill: string
  revealTitle: string
  badgeCopy: string
  celebrationLine: string
}
```

- [ ] **步骤 2：更新 THEMES 常量**

将 THEMES（第 199-224 行）替换为：

```typescript
const THEMES: readonly Theme[] = [
  {
    key: 'sunny-valley',
    title: '暖阳山谷',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 34%), linear-gradient(180deg, #8fdcff 0%, #dff6ff 54%, #fff6d8 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 235, 168, 0.88), rgba(255, 235, 168, 0))',
    hillFar: '#a8e6cf',
    hillMid: '#7dcfb6',
    hillNear: '#56c596',
    lakeFill: '#87ceeb',
    grassStroke: '#3da87a',
    sunFill: '#ffd460',
    revealTitle: '坏心情正在散开',
    badgeCopy: '今天的坏心情被你擦得干干净净，阳光笑脸徽章已经亮起来了。',
    celebrationLine: '呼，坏心情都被你擦得干干净净啦，太阳出来咯！',
  },
  {
    key: 'breeze-lake',
    title: '微风湖边',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 34%), linear-gradient(180deg, #a7e3ff 0%, #ecfffb 54%, #fff0c9 100%)',
    glowGradient: 'radial-gradient(circle, rgba(205, 255, 236, 0.9), rgba(205, 255, 236, 0))',
    hillFar: '#b5e8d5',
    hillMid: '#8cd8c0',
    hillNear: '#6ad4a8',
    lakeFill: '#a0d8ec',
    grassStroke: '#4db88a',
    sunFill: '#ffcb52',
    revealTitle: '明亮风景慢慢回来了',
    badgeCopy: '你把湖边的冰霜擦亮了，太阳和微风都在对你笑。',
    celebrationLine: '坏心情被你一点点擦走啦，湖边的阳光又亮起来了。',
  },
]
```

- [ ] **步骤 3：替换山丘 SVG 模板**

将第 22-47 行的 `<div class="scene-hills">` 整体替换为：

```html
<div class="scene-hills">
  <svg viewBox="0 0 900 260" class="scene-hills-svg" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path d="M-20 200 Q100 110 220 150 Q340 100 440 130 Q540 90 660 120 Q760 100 920 160 L920 260 L-20 260Z" :fill="theme.hillFar" opacity="0.6" />
    <path d="M-20 210 Q80 140 200 170 Q320 130 420 155 Q520 120 640 145 Q740 125 920 180 L920 260 L-20 260Z" :fill="theme.hillMid" opacity="0.75" />
    <path d="M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z" :fill="theme.lakeFill" opacity="0.7">
      <animate attributeName="d" dur="4s" repeatCount="indefinite" values="M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z;M180 202 Q340 178 480 192 Q580 188 700 197 L700 218 Q500 228 300 216 Q220 213 180 208Z;M180 200 Q340 175 480 190 Q580 185 700 195 L700 220 Q500 230 300 218 Q220 215 180 210Z" />
    </path>
    <path d="M-20 220 Q60 170 180 195 Q280 165 380 185 Q480 160 580 178 Q680 168 920 200 L920 260 L-20 260Z" :fill="theme.hillNear" />
    <g :stroke="theme.grassStroke" stroke-width="2" fill="none" opacity="0.7">
      <path d="M80 218 Q82 205 84 218" />
      <path d="M90 215 Q92 200 94 215" />
      <path d="M250 198 Q252 183 254 198" />
      <path d="M260 196 Q262 180 264 196" />
      <path d="M254 197 Q256 182 258 197" />
      <path d="M500 185 Q502 170 504 185" />
      <path d="M510 183 Q512 168 514 183" />
      <path d="M680 195 Q682 180 684 195" />
      <path d="M750 190 Q752 175 754 190" />
    </g>
    <g opacity="0.8">
      <circle cx="100" cy="212" r="4" fill="#ffafcc" />
      <circle cx="270" cy="192" r="3.5" fill="#ffd166" />
      <circle cx="520" cy="180" r="4" fill="#cdb4ff" />
      <circle cx="690" cy="188" r="3.5" fill="#ffafcc" />
      <circle cx="780" cy="186" r="4" fill="#ffd166" />
      <circle cx="350" cy="190" r="3" fill="#b8f2e6" />
    </g>
  </svg>
</div>
```

- [ ] **步骤 4：更新 CSS**

将 `.scene-hills` 的 `height: 38%` 改为 `height: 50%`。

- [ ] **步骤 5：运行 type-check**

运行：`npm run type-check 2>&1 | grep WipeSadness`

---

### 任务 3：冰晶飞溅粒子系统

**文件：**
- 修改：`src/components/emotional/games/WipeSadnessGame.vue` 模板 + 脚本 + 样式

- [ ] **步骤 1：在模板中新增粒子画布**

在 `<canvas ref="frostCanvas" class="frost-canvas" />` 之后（第 68 行后）新增：

```html
<canvas ref="particleCanvas" class="particle-canvas" />
```

- [ ] **步骤 2：新增粒子类型和状态变量**

在 `ConfettiPiece` 接口后（第 155 行后）新增：

```typescript
interface IceParticle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  rotation: number
  spin: number
}
```

在 `let confettiPieces: ConfettiPiece[] = []` 后（第 289 行后）新增：

```typescript
const particleCanvas = ref<HTMLCanvasElement | null>(null)
let particleContext: CanvasRenderingContext2D | null = null
let iceParticles: IceParticle[] = []
let particleFrame = 0
const MAX_ICE_PARTICLES = 200
```

- [ ] **步骤 3：新增粒子函数**

在 `onPrimaryPoint` 函数之后（第 667 行后）新增：

```typescript
function spawnIceParticles(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    if (iceParticles.length >= MAX_ICE_PARTICLES) break
    iceParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: -(Math.random() * 4 + 1),
      size: 2 + Math.random() * 4,
      life: 1,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.3,
    })
  }
  if (!particleFrame) {
    particleFrame = window.requestAnimationFrame(stepIceParticles)
  }
}

function stepIceParticles() {
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (!canvas || !ctx) {
    particleFrame = 0
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  iceParticles = iceParticles.filter((p) => p.life > 0)

  for (const p of iceParticles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.08
    p.life -= 0.025
    p.rotation += p.spin

    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.life > 0.5 ? 'rgba(200,230,255,0.9)' : 'rgba(240,248,255,0.9)'
    ctx.beginPath()
    const s = p.size
    ctx.moveTo(0, -s)
    ctx.lineTo(s * 0.6, 0)
    ctx.lineTo(0, s * 0.7)
    ctx.lineTo(-s * 0.6, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.globalAlpha = 1

  if (iceParticles.length > 0) {
    particleFrame = window.requestAnimationFrame(stepIceParticles)
  } else {
    particleFrame = 0
  }
}

function stopIceParticles() {
  if (particleFrame) {
    window.cancelAnimationFrame(particleFrame)
    particleFrame = 0
  }
  iceParticles = []
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}
```

- [ ] **步骤 4：在 paintInterpolatedStroke 中生成粒子**

在 `paintInterpolatedStroke` 函数的 for 循环之后、`strokeDistancePx.value += distance` 之前（第 566 行前）新增：

```typescript
  spawnIceParticles(to.x, to.y, 3)
```

- [ ] **步骤 5：在 resizeCanvases 中初始化粒子画布**

在 `resizeCanvases` 函数中，`initGrid` 调用之前（第 429 行后）新增：

```typescript
  const pc = particleCanvas.value
  if (pc) {
    const pcRect = pc.getBoundingClientRect()
    pc.width = Math.max(1, Math.round(pcRect.width))
    pc.height = Math.max(1, Math.round(pcRect.height))
    particleContext = pc.getContext('2d')
  }
```

- [ ] **步骤 6：在 resetForDifficulty 和 onBeforeUnmount 中清理粒子**

在 `resetForDifficulty` 中 `stopCelebration()` 后新增：

```typescript
  stopIceParticles()
```

在 `onBeforeUnmount` 中 `stopCelebration()` 后新增：

```typescript
  stopIceParticles()
```

- [ ] **步骤 7：新增粒子画布 CSS**

在 `.frost-canvas` 规则之后新增：

```css
.particle-canvas {
  position: absolute;
  inset: 0;
  z-index: 5;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
```

将 `.frost-canvas` 的 z-index 从 4 改为 3（让粒子在冰霜之上）。

- [ ] **步骤 8：运行 type-check**

运行：`npm run type-check 2>&1 | grep WipeSadness`

---

### 任务 4：庆祝动画升级

**文件：**
- 修改：`src/components/emotional/games/WipeSadnessGame.vue` 脚本（runCelebration 函数）

- [ ] **步骤 1：在 ConfettiPiece 后新增 GoldRainPiece 类型**

在 `ConfettiPiece` 接口后新增：

```typescript
interface GoldRainPiece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  life: number
  color: string
}
```

- [ ] **步骤 2：新增 goldenColors 常量**

在 `CONFETTI_COLORS` 之后新增：

```typescript
const GOLDEN_COLORS = ['#ffd166', '#fff275', '#ffe4a0']
```

- [ ] **步骤 3：新增 goldRain 状态变量**

在 `let confettiPieces` 后新增：

```typescript
let goldRainPieces: GoldRainPiece[] = []
```

- [ ] **步骤 4：替换 runCelebration 函数**

将整个 `runCelebration` 函数（第 727-776 行）替换为：

```typescript
function runCelebration() {
  const canvas = celebrationCanvas.value
  const ctx = celebrationContext
  if (!canvas || !ctx) return

  confettiPieces = Array.from({ length: 92 }).map(() => ({
    x: canvas.width * 0.5 + (Math.random() - 0.5) * canvas.width * 0.42,
    y: canvas.height * 0.42 + (Math.random() - 0.5) * 30,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * -7 - 2.8,
    size: Math.random() * 10 + 6,
    rotate: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.25,
    life: 1,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)] || '#ffd166',
  }))

  goldRainPieces = Array.from({ length: 40 }).map(() => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * canvas.height * 0.3,
    vx: (Math.random() - 0.5) * 1.5,
    vy: 1.5 + Math.random() * 2.5,
    size: 3 + Math.random() * 2,
    life: 1,
    color: GOLDEN_COLORS[Math.floor(Math.random() * GOLDEN_COLORS.length)] || '#ffd166',
  }))

  // 冰霜爆碎：大批冰晶从屏幕中心飞散
  spawnIceParticles(canvas.width * 0.5, canvas.height * 0.5, 60)

  const draw = () => {
    if (props.paused) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 五彩纸屑
    confettiPieces = confettiPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.09,
        rotate: piece.rotate + piece.spin,
        life: piece.life - 0.012,
      }))
      .filter((piece) => piece.life > 0)

    confettiPieces.forEach((piece) => {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.translate(piece.x, piece.y)
      ctx.rotate(piece.rotate)
      ctx.fillStyle = piece.color
      ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.64)
      ctx.restore()
    })

    // 金色光雨
    goldRainPieces = goldRainPieces
      .map((piece) => ({
        ...piece,
        x: piece.x + piece.vx,
        y: piece.y + piece.vy,
        vy: piece.vy + 0.03,
        life: piece.life - 0.006,
      }))
      .filter((piece) => piece.life > 0 && piece.y < canvas.height)

    goldRainPieces.forEach((piece) => {
      ctx.save()
      ctx.globalAlpha = piece.life
      ctx.fillStyle = piece.color
      ctx.beginPath()
      ctx.arc(piece.x, piece.y, piece.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })

    ctx.globalAlpha = 1
    if (confettiPieces.length > 0 || goldRainPieces.length > 0) {
      celebrationFrame = window.requestAnimationFrame(draw)
    }
  }

  draw()
}
```

- [ ] **步骤 5：在 resetForDifficulty 中清理 goldRain**

在 `resetForDifficulty` 中 `confettiPieces = []` 后新增：

```typescript
  goldRainPieces = []
```

- [ ] **步骤 6：运行 type-check**

运行：`npm run type-check 2>&1 | grep WipeSadness`

预期：无 WipeSadnessGame 相关错误

- [ ] **步骤 7：Commit**

```bash
git add src/components/emotional/games/WipeSadnessGame.vue docs/superpowers/specs/2026-05-27-wipe-sadness-visual-upgrade-design.md
git commit -m "feat(wipe-sadness): 太阳活力光芒动画 + 童话插画山丘 + 冰晶飞溅粒子 + 爆裂庆祝动画"
```
