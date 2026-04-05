<template>
  <div class="galaxy-background" aria-hidden="true">
    <canvas ref="canvasRef" class="galaxy-background__canvas"></canvas>
    <div class="galaxy-background__vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

interface GalaxyParticle {
  orbitRadius: number
  angle: number
  speed: number
  size: number
  glowSize: number
  alpha: number
  color: string
  tilt: number
  spread: number
  pulseOffset: number
}

interface DustStar {
  x: number
  y: number
  size: number
  alpha: number
  color: string
  blur: number
}

interface GalaxySystem {
  centerX: number
  centerY: number
  coreRadius: number
  glowRadius: number
  pulseSpeed: number
  tint: string
  particles: GalaxyParticle[]
}

const canvasRef = ref<HTMLCanvasElement | null>(null)

const galaxyPalette = [
  'rgb(255, 250, 238)',
  'rgb(255, 239, 190)',
  'rgb(255, 227, 157)',
  'rgb(255, 206, 132)',
  'rgb(255, 191, 214)',
  'rgb(255, 168, 205)',
  'rgb(255, 124, 179)',
  'rgb(255, 232, 200)',
]
const dustPalette = [
  'rgb(255, 248, 228)',
  'rgb(255, 235, 188)',
  'rgb(255, 220, 167)',
  'rgb(255, 206, 226)',
  'rgb(255, 241, 214)',
]

let frameId = 0
let lastTimestamp = 0
let cssWidth = 0
let cssHeight = 0
let systems: GalaxySystem[] = []
let dustStars: DustStar[] = []

const choose = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!
const randomBetween = (min: number, max: number) => min + Math.random() * (max - min)

function createParticles(
  width: number,
  radiusScale: number,
  countScale: number,
  sizeBoost: number,
  speedBoost: number,
) {
  const maxRadius = Math.min(width * radiusScale, 380 * radiusScale / 0.38)
  const count = Math.max(24, Math.round(width * countScale))

  return Array.from({ length: count }, () => {
    const radiusProgress = Math.pow(Math.random(), 1.75)
    const orbitRadius = 18 + radiusProgress * maxRadius
    const inverseRadius = 1 - radiusProgress

    return {
      orbitRadius,
      angle: Math.random() * Math.PI * 2,
      speed: randomBetween(0.00018, 0.00042) * speedBoost + inverseRadius * 0.00032 * speedBoost,
      size: (randomBetween(0.7, 2.8) + inverseRadius * 1.6) * sizeBoost,
      glowSize: (randomBetween(6, 16) + inverseRadius * 18) * sizeBoost,
      alpha: randomBetween(0.42, 0.94),
      color: choose(galaxyPalette),
      tilt: randomBetween(0.42, 0.62),
      spread: randomBetween(1.02, 1.24),
      pulseOffset: Math.random() * Math.PI * 2,
    }
  })
}

function createDustStars(width: number, height: number) {
  const count = Math.max(90, Math.min(180, Math.round(width * 0.08)))

  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: randomBetween(0.5, 1.9),
    alpha: randomBetween(0.28, 0.88),
    color: choose(dustPalette),
    blur: randomBetween(0, 2),
  }))
}

function resizeScene() {
  const canvas = canvasRef.value
  if (!canvas) {
    return
  }

  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) {
    return
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  cssWidth = rect.width
  cssHeight = rect.height
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  systems = [
    {
      centerX: cssWidth * 0.28,
      centerY: cssHeight * 0.52,
      coreRadius: 82,
      glowRadius: cssWidth * 0.34,
      pulseSpeed: 0.0012,
      tint: 'rgba(255, 140, 188, 0.08)',
      particles: createParticles(cssWidth, 0.38, 0.14, 1, 1),
    },
    {
      centerX: cssWidth * 0.82,
      centerY: cssHeight * 0.18,
      coreRadius: 28,
      glowRadius: cssWidth * 0.13,
      pulseSpeed: 0.0018,
      tint: 'rgba(255, 189, 120, 0.07)',
      particles: createParticles(cssWidth, 0.12, 0.036, 0.52, 1.35),
    },
    {
      centerX: cssWidth * 0.1,
      centerY: cssHeight * 0.73,
      coreRadius: 24,
      glowRadius: cssWidth * 0.11,
      pulseSpeed: 0.0016,
      tint: 'rgba(255, 166, 208, 0.06)',
      particles: createParticles(cssWidth, 0.1, 0.028, 0.46, 1.28),
    },
  ]
  dustStars = createDustStars(cssWidth, cssHeight)
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const mainSystem = systems[0]
  if (!mainSystem) {
    return
  }

  ctx.clearRect(0, 0, cssWidth, cssHeight)

  const baseGradient = ctx.createLinearGradient(0, 0, 0, cssHeight)
  baseGradient.addColorStop(0, '#fff8e7')
  baseGradient.addColorStop(1, '#fff8e7')
  ctx.fillStyle = baseGradient
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  const lowerGlow = ctx.createRadialGradient(mainSystem.centerX, cssHeight, 0, mainSystem.centerX, cssHeight, cssWidth * 0.6)
  lowerGlow.addColorStop(0, 'rgba(242, 201, 76, 0.12)')
  lowerGlow.addColorStop(0.42, 'rgba(242, 201, 76, 0.05)')
  lowerGlow.addColorStop(1, 'rgba(242, 201, 76, 0)')
  ctx.fillStyle = lowerGlow
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  const galaxyGlow = ctx.createRadialGradient(mainSystem.centerX, mainSystem.centerY, 0, mainSystem.centerX, mainSystem.centerY, mainSystem.glowRadius)
  galaxyGlow.addColorStop(0, 'rgba(255, 216, 138, 0.14)')
  galaxyGlow.addColorStop(0.18, 'rgba(255, 187, 214, 0.12)')
  galaxyGlow.addColorStop(0.42, 'rgba(255, 153, 198, 0.06)')
  galaxyGlow.addColorStop(1, 'rgba(255, 153, 198, 0)')
  ctx.fillStyle = galaxyGlow
  ctx.fillRect(0, 0, cssWidth, cssHeight)

  systems.slice(1).forEach((system) => {
    const subGlow = ctx.createRadialGradient(system.centerX, system.centerY, 0, system.centerX, system.centerY, system.glowRadius)
    subGlow.addColorStop(0, 'rgba(255, 244, 214, 0.1)')
    subGlow.addColorStop(0.28, system.tint)
    subGlow.addColorStop(1, 'rgba(255, 153, 198, 0)')
    ctx.fillStyle = subGlow
    ctx.fillRect(0, 0, cssWidth, cssHeight)
  })
}

function drawDustStars(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.globalCompositeOperation = 'screen'

  dustStars.forEach((star) => {
    ctx.save()
    ctx.globalAlpha = star.alpha
    ctx.fillStyle = star.color
    ctx.shadowBlur = star.blur * 10
    ctx.shadowColor = star.color
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })

  ctx.restore()
}

function drawGalaxyCore(ctx: CanvasRenderingContext2D, system: GalaxySystem, time: number, intensity: number) {
  const pulse = 1 + Math.sin(time * system.pulseSpeed) * 0.04
  const glow = ctx.createRadialGradient(system.centerX, system.centerY, 0, system.centerX, system.centerY, system.coreRadius * pulse)
  glow.addColorStop(0, `rgba(255, 252, 241, ${0.9 * intensity})`)
  glow.addColorStop(0.16, `rgba(255, 236, 188, ${0.86 * intensity})`)
  glow.addColorStop(0.32, `rgba(255, 210, 140, ${0.64 * intensity})`)
  glow.addColorStop(0.52, `rgba(255, 157, 198, ${0.34 * intensity})`)
  glow.addColorStop(1, 'rgba(255, 157, 198, 0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(system.centerX, system.centerY, system.coreRadius * pulse, 0, Math.PI * 2)
  ctx.fill()
}

function drawParticle(
  ctx: CanvasRenderingContext2D,
  system: GalaxySystem,
  particle: GalaxyParticle,
  time: number,
  delta: number,
) {
  particle.angle += particle.speed * delta

  const pulse = 0.84 + (Math.sin(time * 0.0016 + particle.pulseOffset) + 1) * 0.18
  const orbitX = Math.cos(particle.angle) * particle.orbitRadius * particle.spread
  const orbitY = Math.sin(particle.angle) * particle.orbitRadius * particle.tilt
  const wave = Math.cos(particle.angle * 2.1 + particle.pulseOffset) * particle.orbitRadius * 0.045

  const x = system.centerX + orbitX
  const y = system.centerY + orbitY + wave

  const tangentX = -Math.sin(particle.angle)
  const tangentY = Math.cos(particle.angle) * particle.tilt
  const tailLength = particle.glowSize * 1.6 + particle.orbitRadius * 0.055
  const tailX = x - tangentX * tailLength
  const tailY = y - tangentY * tailLength

  const tailGradient = ctx.createLinearGradient(x, y, tailX, tailY)
  tailGradient.addColorStop(0, particle.color)
  tailGradient.addColorStop(0.35, particle.color.replace(')', ', 0.45)').replace('rgb', 'rgba'))
  tailGradient.addColorStop(1, 'rgba(255,255,255,0)')

  ctx.save()
  ctx.globalCompositeOperation = 'screen'
  ctx.globalAlpha = particle.alpha * pulse
  ctx.strokeStyle = tailGradient
  ctx.lineWidth = Math.max(0.8, particle.size * 0.9)
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(tailX, tailY)
  ctx.stroke()

  const glow = ctx.createRadialGradient(x, y, 0, x, y, particle.glowSize * pulse)
  glow.addColorStop(0, particle.color)
  glow.addColorStop(0.24, particle.color.replace(')', ', 0.78)').replace('rgb', 'rgba'))
  glow.addColorStop(0.58, particle.color.replace(')', ', 0.26)').replace('rgb', 'rgba'))
  glow.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, particle.glowSize * pulse, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = particle.color
  ctx.beginPath()
  ctx.arc(x, y, particle.size * pulse, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawScene(timestamp: number) {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) {
    return
  }

  const delta = Math.min(32, lastTimestamp ? timestamp - lastTimestamp : 16)
  lastTimestamp = timestamp

  if (!systems.length) {
    frameId = window.requestAnimationFrame(drawScene)
    return
  }

  drawBackground(ctx)
  drawDustStars(ctx)
  systems.forEach((system, index) => {
    drawGalaxyCore(ctx, system, timestamp, index === 0 ? 1 : 0.64)
    system.particles.forEach((particle) => {
      drawParticle(ctx, system, particle, timestamp, delta)
    })
  })

  frameId = window.requestAnimationFrame(drawScene)
}

const handleResize = () => {
  resizeScene()
}

onMounted(() => {
  resizeScene()
  lastTimestamp = 0
  frameId = window.requestAnimationFrame(drawScene)
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.cancelAnimationFrame(frameId)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.galaxy-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #fff8e7;
}

.galaxy-background__canvas,
.galaxy-background__vignette {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.galaxy-background__canvas {
  display: block;
}

.galaxy-background__vignette {
  pointer-events: none;
  background:
    radial-gradient(circle at center, transparent 0 54%, rgba(242, 201, 76, 0.08) 74%, rgba(242, 153, 74, 0.16) 100%),
    linear-gradient(180deg, rgba(255, 248, 231, 0) 0%, rgba(242, 153, 74, 0.06) 100%);
}
</style>
