# 云朵擦擦擦 全屏沉浸视觉升级 实施计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 以 WipeSadnessGame.vue 已验证的全屏沉浸架构为基座，全文重写 CloudEraseGame.vue，将冰霜主题替换为暖白云朵主题，并更新注册表权限。

**架构：** 直接复制 WipeSadnessGame.vue 的 HandCameraLayer + Canvas 网格 + 粒子系统架构，仅替换视觉层数据（颜色、纹理、粒子形状、文案）。改动集中在两个文件。

**技术栈：** Vue 3 `<script setup lang="ts">`、Canvas 2D、HandCameraLayer、MediaPipe 手势追踪

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `src/components/emotional/games/CloudEraseGame.vue` | 全文重写 | 云朵擦擦擦游戏全屏沉浸版，基于 WipeSadnessGame.vue 骨架，替换冰霜主题为云朵主题 |
| `src/data/custom-game-registry.ts` | 修改 | F01_CLOUD_ERASE 添加 camera 权限和 degradable 策略 |

---

## 任务 1：全文重写 CloudEraseGame.vue

**文件：**
- 重写：`src/components/emotional/games/CloudEraseGame.vue`

基座文件：`src/components/emotional/games/WipeSadnessGame.vue`（1297 行），以下列出所有需要修改的差异点，未列出的部分保持与基座完全一致。

### 1.1 模板层

- [ ] **步骤 1：复制 WipeSadnessGame.vue 模板，替换根 class 名**

将模板根元素 class 从 `wipe-sadness-game` 改为 `cloud-erase-game`：

```html
<template>
  <div class="cloud-erase-game">
```

其余模板结构（canvas、HandCameraLayer、scene-bg、scene-hills、sun-core、frost-canvas、particle-canvas、instruction、top-hud、bottom-hud）完全保持 WipeSadnessGame.vue 原样，不做任何改动。

### 1.2 脚本层 — 常量与类型

- [ ] **步骤 2：替换 FROST_COLORS 为 CLOUD_COLORS**

```typescript
const CLOUD_COLORS = [
  'rgba(255, 255, 255, 0.96)',
  'rgba(245, 248, 252, 0.93)',
  'rgba(238, 243, 250, 0.90)',
]
```

添加 GOLDEN_COLORS（基座中没有作为顶层常量，需要在 CONFETTI_COLORS 后添加）：

```typescript
const GOLDEN_COLORS = ['#ffd166', '#fff275', '#ffe4a0']
```

添加 GoldRainPiece 接口（基座已有，直接复用）：

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

- [ ] **步骤 3：替换 IceParticle 为 CloudParticle**

接口名改为 CloudParticle，字段不变：

```typescript
interface CloudParticle {
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

变量声明中 `iceParticles` 改为 `cloudParticles`：

```typescript
let cloudParticles: CloudParticle[] = []
```

常量名改为：

```typescript
const MAX_CLOUD_PARTICLES = 200
```

- [ ] **步骤 4：替换 DIFFICULTY_CONFIGS 文案为云朵主题**

```typescript
const DIFFICULTY_CONFIGS: Record<EmotionGameDifficulty, DifficultyConfig> = {
  1: {
    maxStrength: 1,
    brushRadius: 56,
    erodePower: 0.92,
    targetRatio: 0.72,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 22,
    shortLabel: '简单 · 薄云很快散开',
    readyText: '把手指放上去，大范围擦几下，薄薄的云层马上就会散开。',
    helperText: '这一关云层不会重新聚回来，只要放心做大动作，把天空慢慢擦亮就可以。',
    successText: '云层已经被你擦得轻轻散开了，蓝天马上就要露出来啦！',
  },
  2: {
    maxStrength: 1,
    brushRadius: 50,
    erodePower: 0.62,
    targetRatio: 0.84,
    regenDelayMs: 800,
    regenPerSecond: 0.18,
    cellSize: 20,
    shortLabel: '中等 · 停下云会回来',
    readyText: '继续连着擦，别停太久哦，不然云层会慢慢又聚回来。',
    helperText: '这次要保持连续的大动作，让云层没有机会重新盖住蓝天。',
    successText: '你一直没有放弃，云层已经被你越擦越开了！',
  },
  3: {
    maxStrength: 3,
    brushRadius: 46,
    erodePower: 0.46,
    targetRatio: 0.92,
    regenDelayMs: Number.POSITIVE_INFINITY,
    regenPerSecond: 0,
    cellSize: 18,
    shortLabel: '困难 · 厚云要反复擦 3 次',
    readyText: '这是一层厚厚的云。同一个地方要反复擦亮三次，蓝天才会真正露出来。',
    helperText: '遇到厚云别着急，用整只手臂带着手指来回擦，把力量慢慢送出去。',
    successText: '厚云正在一层层散开，你把天空擦得越来越亮了！',
  },
}
```

- [ ] **步骤 5：替换 THEMES 为云朵主题（使用 WipeSadness 的 Theme 接口结构）**

Theme 接口保持与 WipeSadnessGame.vue 完全一致（hillFar/hillMid/hillNear/lakeFill/grassStroke 字段），替换数据：

```typescript
const THEMES: readonly Theme[] = [
  {
    key: 'clear-sky-meadow',
    title: '晴空草坡',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.42), transparent 34%), linear-gradient(180deg, #8fdcff 0%, #dff6ff 54%, #fff6d8 100%)',
    glowGradient: 'radial-gradient(circle, rgba(255, 235, 168, 0.88), rgba(255, 235, 168, 0))',
    hillFar: '#a8e6cf',
    hillMid: '#7dcfb6',
    hillNear: '#56c596',
    lakeFill: '#87ceeb',
    grassStroke: '#3da87a',
    sunFill: '#ffd460',
    revealTitle: '云朵正在慢慢散开',
    badgeCopy: '云朵被你拨开啦，晴空巧手徽章亮起来了。',
    celebrationLine: '云层都被你擦开啦，蓝天出来咯！',
  },
  {
    key: 'breeze-harbor',
    title: '微风晴湾',
    skyGradient: 'radial-gradient(circle at top, rgba(255,255,255,0.36), transparent 34%), linear-gradient(180deg, #a7e3ff 0%, #ecfffb 54%, #fff0c9 100%)',
    glowGradient: 'radial-gradient(circle, rgba(205, 255, 236, 0.9), rgba(205, 255, 236, 0))',
    hillFar: '#b5e8d5',
    hillMid: '#8cd8c0',
    hillNear: '#6ad4a8',
    lakeFill: '#a0d8ec',
    grassStroke: '#4db88a',
    sunFill: '#ffcb52',
    revealTitle: '明亮天空一点点回来了',
    badgeCopy: '你把天空里的云擦亮了，太阳和微风都在对你笑。',
    celebrationLine: '云朵被你一点点擦走啦，晴空和微风都回来了。',
  },
]
```

### 1.3 脚本层 — 计算属性

- [ ] **步骤 6：替换 difficultyLabel 文案**

```typescript
const difficultyLabel = computed(() => {
  if (props.difficulty === 1) return '简单 · 薄云'
  if (props.difficulty === 2) return '中等 · 连续擦'
  return '困难 · 三层厚云'
})
```

- [ ] **步骤 7：替换 instructionText 文案**

```typescript
const instructionText = computed(() => {
  if (props.difficulty === 3) return '厚厚的云层，同一块要反复擦亮三次！'
  if (props.difficulty === 2) return '挥动手臂擦掉云层，别停太久哦！'
  return '挥动手臂，擦掉云层！'
})
```

- [ ] **步骤 8：替换 progressHint 文案**

```typescript
const progressHint = computed(() => {
  if (phase.value === 'celebrating' || phase.value === 'finished') {
    return difficultyConfig.value.successText
  }
  if (phase.value === 'ready') {
    return instructionText.value
  }
  if (regenActive) {
    return '云层在回来，继续擦！'
  }
  const pct = Math.round(clearedRatio.value * 100)
  if (pct < 30) return '云层还很厚，继续用力擦...'
  if (pct < 60) return '越来越晴了...'
  return '快看到蓝天了！'
})
```

### 1.4 脚本层 — 覆盖层纹理

- [ ] **步骤 9：替换 createTemplateCanvas 为棉花云纹理**

```typescript
function createTemplateCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const base = ctx.createLinearGradient(0, 0, width, height)
  base.addColorStop(0, 'rgba(255, 255, 255, 0.96)')
  base.addColorStop(0.55, 'rgba(245, 248, 252, 0.94)')
  base.addColorStop(1, 'rgba(238, 243, 250, 0.90)')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, width, height)

  for (let index = 0; index < 42; index += 1) {
    const x = Math.random() * width
    const y = Math.random() * height
    const radius = 50 + Math.random() * 130
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, 'rgba(255,255,255,0.65)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.32)'
  ctx.lineCap = 'round'
  for (let index = 0; index < 28; index += 1) {
    ctx.lineWidth = 2 + Math.random() * 4
    ctx.beginPath()
    const startX = Math.random() * width
    const startY = Math.random() * height
    const cpX = startX + (Math.random() - 0.5) * 80
    const cpY = startY + Math.random() * 36
    ctx.moveTo(startX, startY)
    ctx.quadraticCurveTo(cpX, cpY, startX + (Math.random() - 0.5) * 140, startY + Math.random() * 50)
    ctx.stroke()
  }

  return canvas
}
```

与基座差异：
- 基底渐变颜色：暖白 `rgba(255,255,255,0.96)` → 微灰蓝 `rgba(238,243,250,0.90)`
- blob 半径：50-130（基座 30-90），更圆润蓬松
- blob 透明度：0.65（基座 0.6）
- 线条：粗线 2-4（基座 1-2），用 quadraticCurveTo 替代 lineTo，模拟柔和云丝

### 1.5 脚本层 — 粒子系统

- [ ] **步骤 10：替换冰晶粒子为云朵粒子函数**

将 `spawnIceParticles` / `stepIceParticles` / `stopIceParticles` 替换为云朵版本：

```typescript
function spawnCloudParticles(x: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    if (cloudParticles.length >= MAX_CLOUD_PARTICLES) break
    cloudParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: -(Math.random() * 2 + 0.5),
      size: 3 + Math.random() * 6,
      life: 1,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.15,
    })
  }
  if (!particleFrame) {
    particleFrame = window.requestAnimationFrame(stepCloudParticles)
  }
}

function stepCloudParticles() {
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (!canvas || !ctx) {
    particleFrame = 0
    return
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  cloudParticles = cloudParticles.filter((p) => p.life > 0)

  for (const p of cloudParticles) {
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.04
    p.life -= 0.018
    p.rotation += p.spin

    ctx.save()
    ctx.globalAlpha = Math.max(0, p.life)
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rotation)
    ctx.fillStyle = p.life > 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(240,245,250,0.9)'
    ctx.beginPath()
    ctx.arc(0, 0, p.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.globalAlpha = 1

  if (cloudParticles.length > 0) {
    particleFrame = window.requestAnimationFrame(stepCloudParticles)
  } else {
    particleFrame = 0
  }
}

function stopCloudParticles() {
  if (particleFrame) {
    window.cancelAnimationFrame(particleFrame)
    particleFrame = 0
  }
  cloudParticles = []
  const canvas = particleCanvas.value
  const ctx = particleContext
  if (canvas && ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }
}
```

与基座差异：
- 物理参数：vx ±3（基座 ±5）、vy -2~0.5（基座 -1~-4+）、重力 0.04（基座 0.08）、生命衰减 0.018（基座 0.025）
- 形状：圆形 `arc()`（基座菱形 moveTo/lineTo）
- 颜色：白色系 `rgba(255,255,255,0.9)` / `rgba(240,245,250,0.9)`（基座冰蓝色）

- [ ] **步骤 11：更新 paintInterpolatedStroke 中粒子调用**

基座中 `spawnIceParticles(to.x, to.y, 3)` 改为：

```typescript
spawnCloudParticles(to.x, to.y, 3)
```

### 1.6 脚本层 — 庆祝动画

- [ ] **步骤 12：更新 runCelebration 添加云朵爆散 + 金雨**

在 `runCelebration` 函数中，将基座的 `spawnIceParticles(canvas.width * 0.5, canvas.height * 0.5, 60)` 改为：

```typescript
spawnCloudParticles(canvas.width * 0.5, canvas.height * 0.5, 60)
```

添加金雨粒子（基座中已有 goldRainPieces 和 draw 循环），确保 goldRainPieces 初始化和绘制代码完全复用基座。

### 1.7 脚本层 — 徽章与完成

- [ ] **步骤 13：更新 maybeCompleteSession 中的徽章数据**

```typescript
emit('complete', {
  performanceData: buildPerformanceData(),
  badge: {
    badgeCode: 'BADGE_CLEAR_SKY',
    badgeName: '晴空巧手徽章',
  },
})
```

### 1.8 脚本层 — 清理引用

- [ ] **步骤 14：全局替换函数名引用**

在所有出现 `stopIceParticles` 的地方改为 `stopCloudParticles`：
- `resetForDifficulty()` 中
- `onBeforeUnmount()` 中

### 1.9 样式层

- [ ] **步骤 15：替换根 class 选择器名**

将所有 CSS 选择器中的 `.wipe-sadness-game` 替换为 `.cloud-erase-game`，其余样式完全保持基座原样。

- [ ] **步骤 16：替换 renderFrostFromGrid 中 FROST_COLORS 引用为 CLOUD_COLORS**

```typescript
ctx.fillStyle = CLOUD_COLORS[(row + col) % CLOUD_COLORS.length] ?? CLOUD_COLORS[0] ?? '#ffffff'
```

- [ ] **步骤 17：运行 type-check**

运行：`npx vue-tsc --noEmit`
预期：通过，无类型错误

---

## 任务 2：更新注册表权限

**文件：**
- 修改：`src/data/custom-game-registry.ts:222-256`（F01_CLOUD_ERASE 条目）

- [ ] **步骤 1：更新 requiredPermissions 和 permissionPolicy**

将 F01_CLOUD_ERASE 的权限配置从：
```typescript
requiredPermissions: [],
permissionPolicy: 'all_required',
```
改为：
```typescript
requiredPermissions: ['camera'],
permissionPolicy: 'degradable',
```

- [ ] **步骤 2：更新 tags 添加手势追踪相关标签**

将 tags 从：
```typescript
tags: ['精细动作', '擦除交互', 'Canvas', '手眼协调'],
```
改为：
```typescript
tags: ['精细动作', '擦除交互', 'Canvas', '手眼协调', '手势追踪', 'MediaPipe'],
```

- [ ] **步骤 3：运行 type-check**

运行：`npx vue-tsc --noEmit`
预期：通过

---

## 任务 3：最终验证与提交

- [ ] **步骤 1：完整 type-check**

运行：`npm run type-check`
预期：通过

- [ ] **步骤 2：提交**

```bash
git add src/components/emotional/games/CloudEraseGame.vue src/data/custom-game-registry.ts
git commit -m "feat(cloud-erase): 全屏沉浸重构 — 以 WipeSadnessGame 为基座替换为暖白云朵主题"
```

---

## 自检

### 规格覆盖度

| 规格章节 | 对应任务 |
|----------|----------|
| 5.1 覆盖层纹理 CLOUD_COLORS | 任务 1 步骤 2, 9, 16 |
| 5.2 云朵粒子 CloudParticle | 任务 1 步骤 3, 10, 11 |
| 5.3 庆祝云朵爆散 | 任务 1 步骤 12 |
| 6.1 Theme 接口 | 任务 1 步骤 5（复用基座接口） |
| 6.2 两个主题数据 | 任务 1 步骤 5 |
| 7 DifficultyConfig 文案 | 任务 1 步骤 4, 6, 7, 8 |
| 8 注册表更新 | 任务 2 步骤 1, 2 |
| 9 不改的部分 | 完全复用基座代码 |

### 占位符扫描

无 "TODO"、"TBD"、"后续实现" 等占位符。所有步骤包含完整代码。

### 类型一致性

- CloudParticle 接口 → spawnCloudParticles/stepCloudParticles/stopCloudParticles 函数签名一致
- CLOUD_COLORS 数组 → renderFrostFromGrid 中引用一致
- Theme 接口与 WipeSadnessGame.vue 完全一致（hillFar/hillMid/hillNear/lakeFill/grassStroke）
- THEMES 数据结构与 Theme 接口字段完全匹配
- DifficultyConfig 接口与 DIFFICULTY_CONFIGS 数据完全匹配
