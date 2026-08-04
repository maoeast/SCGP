<template>
  <div ref="containerRef" class="starfield-tunnel" aria-hidden="true">
    <canvas ref="canvasRef" class="starfield-tunnel__canvas"></canvas>

    <!-- CSS shooting stars -->
    <div class="starfield-tunnel__meteors">
      <span v-for="m in meteors" :key="m.id" class="meteor" :style="m.style"></span>
    </div>

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
  ShaderMaterial,
  Color,
  Clock,
  AdditiveBlending,
} from 'three'
import { type LoginThemeVariant } from '@/utils/login-theme'

const STAR_COUNT = 1800

/* ── Star shaders ── */
const starVert = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aBright;
uniform float uTime;
uniform float uDpr;
varying float vAlpha;
varying float vBright;

void main() {
  // Stronger twinkle: wider amplitude + faster
  float twinkle = sin(uTime * 2.4 + aPhase) * 0.55 + 0.45;
  vAlpha = twinkle * aBright;
  vBright = aBright;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(aSize * uDpr * (260.0 / -mv.z), 0.8);
  gl_Position = projectionMatrix * mv;
}
`

const starFrag = /* glsl */ `
precision highp float;
uniform vec3 uColor;
varying float vAlpha;
varying float vBright;

void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  if (d > 0.5) discard;
  // Brighter core + softer glow halo
  float core = smoothstep(0.5, 0.0, d);
  float glow = smoothstep(0.5, 0.15, d);
  float a = pow(core, 1.2) + glow * 0.4;
  // Boost brightness for visible twinkle
  vec3 col = uColor * (1.0 + vBright * 0.6) + vec3(1.0) * pow(core, 4.0) * 0.5;
  gl_FragColor = vec4(col, a * vAlpha);
}
`

/* ── Theme ── */
function getStarColor(v: LoginThemeVariant): Color {
  if (v === 'calm-blue') return new Color('#d8f0f8')
  if (v === 'lush-green') return new Color('#d8f3dc')
  if (v === 'custom') return new Color('#fff0c0')
  return new Color('#ffe8b0')
}

/* ── Props ── */
interface Props {
  variant?: LoginThemeVariant
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'calm-blue',
})

/* ── Shooting star data ── */
const meteors = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  style: {
    '--delay': `${(i * 2.3) % 14}s`,
    '--dur': `${1.4 + (i % 4) * 0.35}s`,
    '--top': `${4 + (i * 11) % 35}%`,
    '--left': `${5 + (i * 19) % 85}%`,
    '--angle': `${24 + (i * 7) % 18}deg`,
    '--len': `${50 + (i % 5) * 30}px`,
  },
}))

/* ── Refs & state ── */
const containerRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const vignetteRef = ref<HTMLDivElement | null>(null)

let renderer: WebGLRenderer | null = null
let scene: Scene | null = null
let camera: PerspectiveCamera | null = null
let starMat: ShaderMaterial | null = null
let starGeo: BufferGeometry | null = null
let clock: Clock | null = null
let frameId = 0
let mouseX = 0
let mouseY = 0
let resizeObserver: ResizeObserver | null = null

/* ── Apply theme ── */
function applyTheme() {
  if (starMat) {
    starMat.uniforms.uColor!.value.copy(getStarColor(props.variant))
  }
  if (vignetteRef.value) {
    vignetteRef.value.style.background =
      'radial-gradient(circle at center, transparent 0% 45%, rgba(0,0,0,0.3) 100%)'
  }
}

/* ── Scene initialisation ── */
function initScene() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const rect = container.getBoundingClientRect()
  const w = rect.width || 1
  const h = rect.height || 1

  scene = new Scene()
  camera = new PerspectiveCamera(60, w / h, 0.1, 600)

  try {
    renderer = new WebGLRenderer({ canvas, antialias: false, alpha: true })
  } catch {
    return
  }

  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(w, h)

  // ── Star particles ──
  const positions = new Float32Array(STAR_COUNT * 3)
  const sizes = new Float32Array(STAR_COUNT)
  const phases = new Float32Array(STAR_COUNT)
  const brights = new Float32Array(STAR_COUNT)

  for (let i = 0; i < STAR_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 500
    positions[i * 3 + 1] = (Math.random() - 0.5) * 350
    positions[i * 3 + 2] = -15 - Math.random() * 485
    sizes[i] = 1.2 + Math.pow(Math.random(), 1.6) * 6.0
    phases[i] = Math.random() * Math.PI * 2
    brights[i] = 0.25 + Math.random() * 0.75
  }

  starGeo = new BufferGeometry()
  starGeo.setAttribute('position', new Float32BufferAttribute(positions, 3))
  starGeo.setAttribute('aSize', new Float32BufferAttribute(sizes, 1))
  starGeo.setAttribute('aPhase', new Float32BufferAttribute(phases, 1))
  starGeo.setAttribute('aBright', new Float32BufferAttribute(brights, 1))

  starMat = new ShaderMaterial({
    vertexShader: starVert,
    fragmentShader: starFrag,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: getStarColor(props.variant).clone() },
      uDpr: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  scene.add(new Points(starGeo, starMat))
  clock = new Clock()
  applyTheme()
}

/* ── Render loop ── */
function animate() {
  if (!renderer || !scene || !camera || !clock) return

  clock.getDelta()
  const t = clock.getElapsedTime()

  if (starMat) starMat.uniforms.uTime!.value = t

  const sx = Math.sin(t * 0.04) * 4 + mouseX * 3
  const sy = Math.cos(t * 0.035) * 3 + mouseY * 3
  camera.position.x += (sx - camera.position.x) * 0.008
  camera.position.y += (sy - camera.position.y) * 0.008
  camera.lookAt(camera.position.x * 0.15, camera.position.y * 0.15, -100)

  renderer.render(scene, camera)
  frameId = requestAnimationFrame(animate)
}

/* ── Resize ── */
function handleResize() {
  const el = containerRef.value
  if (!el || !renderer || !camera) return
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height) return
  camera.aspect = r.width / r.height
  camera.updateProjectionMatrix()
  renderer.setSize(r.width, r.height)
}

/* ── Mouse ── */
function handleMouseMove(e: MouseEvent) {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1
  mouseY = -((e.clientY / window.innerHeight) * 2 - 1)
}

/* ── Watch variant changes ── */
watch(() => props.variant, () => applyTheme())

/* ── Lifecycle ── */
onMounted(() => {
  initScene()
  frameId = requestAnimationFrame(animate)
  resizeObserver = new ResizeObserver(handleResize)
  if (containerRef.value) resizeObserver.observe(containerRef.value)
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  resizeObserver?.disconnect()
  window.removeEventListener('mousemove', handleMouseMove)
  starGeo?.dispose()
  starMat?.dispose()
  renderer?.dispose()
})
</script>

<style scoped>
.starfield-tunnel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background: url('/loginbg.jpg') center / cover no-repeat;
}

.starfield-tunnel__canvas {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* ── Shooting stars ── */
.starfield-tunnel__meteors {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.meteor {
  position: absolute;
  top: var(--top);
  left: var(--left);
  width: 2px;
  height: 2px;
  background: #fff;
  border-radius: 50%;
  opacity: 0;
  box-shadow: 0 0 6px 2px rgba(255, 255, 255, 0.6);
  animation: meteor-fall var(--dur) var(--delay) linear infinite;
}

.meteor::after {
  content: '';
  position: absolute;
  top: 50%;
  right: 100%;
  width: var(--len);
  height: 1.2px;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.8), transparent);
  transform: translateY(-50%);
}

@keyframes meteor-fall {
  0% {
    opacity: 0;
    transform: translate(0, 0) rotate(var(--angle));
  }
  3% {
    opacity: 1;
  }
  25% {
    opacity: 0.9;
  }
  50% {
    opacity: 0;
    transform: translate(280px, 200px) rotate(var(--angle));
  }
  100% {
    opacity: 0;
    transform: translate(280px, 200px) rotate(var(--angle));
  }
}

.starfield-tunnel__vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
</style>
