import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

const {
  getEffectiveLoginPrimaryColor,
} = jiti('../../src/utils/login-theme.ts')
const {
  createBundledLoginBackgrounds,
  LOGIN_BACKGROUND_PRESET_VERSION,
  hasLoginBackgroundMedia,
  parseLoginBackgrounds,
  serializeLoginBackgrounds,
} = jiti('../../src/utils/login-background.ts')

test('login theme presets own their primary colors while custom keeps its configured color', () => {
  assert.equal(getEffectiveLoginPrimaryColor('warm-glow', '#000000'), '#E6B93C')
  assert.equal(getEffectiveLoginPrimaryColor('calm-blue', '#E6B93C'), '#4FB3BF')
  assert.equal(getEffectiveLoginPrimaryColor('lush-green', '#E6B93C'), '#72BE2F')
  assert.equal(getEffectiveLoginPrimaryColor('lush-green', '#123456', true), '#123456')
  assert.equal(getEffectiveLoginPrimaryColor('custom', '#123456'), '#123456')
})

test('login background config round-trips per theme and tolerates malformed JSON', () => {
  const backgrounds = parseLoginBackgrounds(JSON.stringify({
    'warm-glow': {
      image: 'resource://login-backgrounds/warm-glow/fallback.jpg',
      video: 'resource://login-backgrounds/warm-glow/loop.mp4',
    },
    'calm-blue': {
      image: 'resource://login-backgrounds/calm-blue/fallback.jpg',
      video: '',
    },
  }))

  assert.equal(backgrounds['warm-glow'].video, 'resource://login-backgrounds/warm-glow/loop.mp4')
  assert.equal(backgrounds['calm-blue'].image, 'resource://login-backgrounds/calm-blue/fallback.jpg')
  assert.deepEqual(parseLoginBackgrounds(serializeLoginBackgrounds(backgrounds)), backgrounds)
  assert.deepEqual(parseLoginBackgrounds('{broken'), {
    'warm-glow': { image: '', video: '' },
    'calm-blue': { image: '', video: '' },
    'lush-green': { image: '', video: '' },
    custom: { image: '', video: '' },
  })
})

test('bundled login backgrounds use packaged resources for all presets', () => {
  const bundled = createBundledLoginBackgrounds()

  assert.equal(LOGIN_BACKGROUND_PRESET_VERSION, '1')
  assert.equal(hasLoginBackgroundMedia(bundled), true)

  for (const variant of ['warm-glow', 'calm-blue', 'lush-green']) {
    assert.equal(
      bundled[variant].image,
      `resource://login-backgrounds/${variant}/background.jpg`,
    )
    assert.equal(
      bundled[variant].video,
      `resource://login-backgrounds/${variant}/background.mp4`,
    )
    assert.equal(
      existsSync(resolve(projectRoot, 'assets/resources/login-backgrounds', variant, 'background.jpg')),
      true,
    )
    assert.equal(
      existsSync(resolve(projectRoot, 'assets/resources/login-backgrounds', variant, 'background.mp4')),
      true,
    )
  }
})

test('login background rendering and resource archive keep the fallback contract', () => {
  const backgroundSource = readFileSync(
    resolve(projectRoot, 'src/components/login/GalaxyBackground.vue'),
    'utf8',
  )
  const buttonSource = readFileSync(
    resolve(projectRoot, 'src/components/login/PrimaryButton.vue'),
    'utf8',
  )
  const mainSource = readFileSync(resolve(projectRoot, 'electron/main.mjs'), 'utf8')
  const themeSource = readFileSync(resolve(projectRoot, 'src/utils/login-theme.ts'), 'utf8')
  const settingsSource = readFileSync(resolve(projectRoot, 'src/views/system/SystemSettings.vue'), 'utf8')

  assert.match(backgroundSource, /<video/)
  assert.match(backgroundSource, /@error="handleVideoError"/)
  assert.match(backgroundSource, /backgroundImage/)
  assert.match(themeSource, /'lush-green'/)
  assert.match(settingsSource, /import\.meta\.env\.DEV/)
  assert.match(settingsSource, /login_theme_backgrounds_preset_version/)
  assert.doesNotMatch(buttonSource, /#FFD000|#FF8C00/)
  assert.match(mainSource, /MANAGED_SUBDIRS\s*=\s*\[[^\]]*'login-backgrounds'/)
})
