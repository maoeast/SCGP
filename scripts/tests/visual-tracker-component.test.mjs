import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const source = readFileSync(resolve(projectRoot, 'src/components/games/visual/VisualTracker.vue'), 'utf8')
const previewCardSource = readFileSync(resolve(projectRoot, 'src/components/games/GamePreviewCard.vue'), 'utf8')
const gamePlaySource = readFileSync(resolve(projectRoot, 'src/views/games/GamePlay.vue'), 'utf8')

test('VisualTracker uses the deterministic tracking engine instead of WebGazer', () => {
  assert.match(source, /visual-tracking-engine/)
  assert.match(source, /resolveTrackingTarget/)
  assert.match(source, /createTrackingSample/)
  assert.match(source, /summarizeTrackingSamples/)
  assert.doesNotMatch(source, /webgazer/i)
  assert.doesNotMatch(source, /showCalibration/)
})

test('VisualTracker emits enriched tracking stats for reports', () => {
  assert.match(source, /followStability/)
  assert.match(source, /breakCount/)
  assert.match(source, /longestStreakMs/)
  assert.match(source, /inputMode/)
})

test('VisualTracker uses child-friendly target and follow cursor sizes', () => {
  assert.match(source, /targetSize:\s*128/)
  assert.match(source, /Math\.max\(96,\s*props\.targetSize\s*\*\s*0\.82\)/)
  assert.match(source, /--cursor-size/)
  assert.match(source, /Math\.max\(150,\s*props\.targetSize\s*\*\s*1\.34\)/)
})

test('VisualTracker shows locked-on breathing glow feedback', () => {
  assert.match(source, /\.follow-cursor\.is-locked/)
  assert.match(source, /cursor-lock-breathe/)
  assert.match(source, /cursor-lock-ripple/)
  assert.match(source, /box-shadow:[\s\S]*rgba\(140,\s*255,\s*202,\s*0\.88\)/)
})

test('Visual tracking launch defaults expose larger size presets', () => {
  assert.match(previewCardSource, /targetSize:\s*128/)
  assert.match(previewCardSource, /:value="104"/)
  assert.match(previewCardSource, /:value="128"/)
  assert.match(previewCardSource, /:value="152"/)
  assert.match(gamePlaySource, /targetSize\s*=\s*ref<number>\(Number\(route\.query\.targetSize\)\s*\|\|\s*128\)/)
})
