<template>
  <div ref="containerRef" class="starfield-tunnel" aria-hidden="true">
    <canvas ref="canvasRef" class="starfield-tunnel__canvas"></canvas>
    <div ref="vignetteRef" class="starfield-tunnel__vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  CanvasTexture,
  FogExp2,
  Color,
  Clock,
  AdditiveBlending,
} from 'three'
import { getLoginThemePreset, type LoginThemeVariant } from '@/utils/login-theme'

const PARTICLE_COUNT = 6000
const TUNNEL_LENGTH = 200
const SPEED = 6
const MAX_RADIUS = 65
const FOG_DENSITY = 0.012
const PARALLAX_STRENGTH = 4

interface Props {
  variant?: LoginThemeVariant
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'warm-glow',
})

const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const vignetteRef = ref<HTMLDivElement | null>(null)

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let geometry: BufferGeometry | null = null
let material: PointsMaterial | null = null
let spriteTexture: CanvasTexture | null = null
let clock: Clock | null = null
let frameId = 0
let mouseX = 0
let mouseY = 0
let resizeObserver: ResizeObserver | null = null
let webglFailed = false

function parseRgbString(rgb: string): Color {
  const match = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (match) {
    return new Color(
      parseInt(match[1]!) / 255,
      parseInt(match[2]!) / 255,
      parseInt(match[3]!) / 255,
    )
  }
  return new Color(0x4fb3bf)
}

function createSpriteTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
  gradient.addColorStop(0.15, 'rgba(255, 255, 255, 0.82)')
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)')
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.08)')
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

function buildParticles() {
  const preset = getLoginThemePreset(props.variant)
  const bgColor = new Color(preset.galaxyBaseGradient)
  const palette = preset.galaxyParticlePalette.map(parseRgbString)

  // Update fog and clear color
  if (scene) {
    scene.fog = new FogExp2(bgColor, FOG_DENSITY)
  }
  if (renderer) {
    renderer.setClearColor(bgColor)
  }

  // Update vignette to match theme background
  if (vignetteRef.value) {
    const bgHex = preset.galaxyBaseGradient
    const rgb = new Color(bgHex)
    const r = Math.round(rgb.r * 255)
    const g = Math.round(rgb.g * 255)
    const b = Math.round(rgb.b * 255)
    vignetteRef.value.style.background = `radial-gradient(circle at center, transparent 0% 40%, rgba(${r}, ${g}, ${b}, 0.25) 65%, rgba(${r}, ${g}, ${b}, 0.6) 100%)`
  }

  // Update particle colors
  if (geometry) {
    const colorAttr = geometry.getAttribute('color')
    if (colorAttr) {
      const colors = colorAttr.array as Float32Array
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const color = palette[Math.floor(Math.random() * palette.length)]!
        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b
      }
      colorAttr.needsUpdate = true
    }
  }
}

function initScene() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const preset = getLoginThemePreset(props.variant)
  const bgColor = new Color(preset.galaxyBaseGradient)
  const palette = preset.galaxyParticlePalette.map(parseRgbString)

  scene = new Scene()
  scene.fog = new FogExp2(bgColor, FOG_DENSITY)

  const rect = container.getBoundingClientRect()
  const width = rect.width || 1
  const height = rect.height || 1

  camera = new PerspectiveCamera(75, width / height, 0.1, 300)
  camera.position.set(0, 0, 0)

  try {
    renderer = new WebGLRenderer({ canvas, antialias: false })
  } catch {
    webglFailed = true
    if (container) {
      container.style.background = `linear-gradient(180deg, ${preset.galaxyBaseGradient}, ${preset.galaxyBaseGradient})`
    }
    return
  }

  renderer.setClearColor(bgColor)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(width, height)

  const positions = new Float32Array(PARTICLE_COUNT * 3)
  const colors = new Float32Array(PARTICLE_COUNT * 3)

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * MAX_RADIUS
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = Math.sin(angle) * radius
    positions[i * 3 + 2] = Math.random() * TUNNEL_LENGTH

    const color = palette[Math.floor(Math.random() * palette.length)]!
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))

  spriteTexture = createSpriteTexture()
  material = new PointsMaterial({
    map: spriteTexture,
    size: 2.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.95,
    vertexColors: true,
    blending: AdditiveBlending,
    depthWrite: false,
  })

  const points = new Points(geometry, material)
  scene.add(points)

  clock = new Clock()

  // Set initial vignette
  buildParticles()
}

function animate() {
  if (!renderer || !scene || !camera || !geometry || !clock) return

  const delta = Math.min(clock.getDelta(), 0.05)
  const posAttr = geometry.getAttribute('position')
  if (!posAttr) return
  const arr = posAttr.array as Float32Array

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const ix = i * 3
    const iy = i * 3 + 1
    const iz = i * 3 + 2
    arr[iz]! -= SPEED * delta
    if (arr[iz]! < -10) {
      arr[iz]! += TUNNEL_LENGTH
      const angle = Math.random() * Math.PI * 2
      const radius = Math.sqrt(Math.random()) * MAX_RADIUS
      arr[ix]! = Math.cos(angle) * radius
      arr[iy]! = Math.sin(angle) * radius
    }
  }
  posAttr.needsUpdate = true

  camera.position.x += (mouseX * PARALLAX_STRENGTH - camera.position.x) * 0.025
  camera.position.y += (mouseY * PARALLAX_STRENGTH - camera.position.y) * 0.025
  camera.lookAt(camera.position.x * 0.3, camera.position.y * 0.3, camera.position.z + 100)

  renderer.render(scene, camera)
  frameId = requestAnimationFrame(animate)
}

function handleResize() {
  const container = containerRef.value
  if (!container || !renderer || !camera) return

  const rect = container.getBoundingClientRect()
  if (!rect.width || !rect.height) return

  camera.aspect = rect.width / rect.height
  camera.updateProjectionMatrix()
  renderer.setSize(rect.width, rect.height)
}

function handleMouseMove(e: MouseEvent) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1)
}

watch(() => props.variant, () => {
  buildParticles()
})

onMounted(() => {
  initScene()

  if (!webglFailed) {
    frameId = requestAnimationFrame(animate)

    resizeObserver = new ResizeObserver(handleResize)
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  window.removeEventListener('mousemove', handleMouseMove)

  geometry?.dispose()
  material?.dispose()
  spriteTexture?.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.starfield-tunnel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.starfield-tunnel__canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.starfield-tunnel__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
