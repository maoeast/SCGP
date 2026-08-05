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
  DEFAULT_LOGIN_PRIMARY_COLOR,
  DEFAULT_LOGIN_THEME_VARIANT,
  getEffectiveLoginPrimaryColor,
  normalizeLoginThemeVariant,
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

test('default login theme is calm-blue with its primary color', () => {
  assert.equal(DEFAULT_LOGIN_THEME_VARIANT, 'calm-blue')
  assert.equal(DEFAULT_LOGIN_PRIMARY_COLOR, '#4FB3BF')
  // 无配置 / 非法配置时回退到 calm-blue，而不是暖黄
  assert.equal(normalizeLoginThemeVariant(undefined), 'calm-blue')
  assert.equal(normalizeLoginThemeVariant(''), 'calm-blue')
  assert.equal(normalizeLoginThemeVariant('not-a-theme'), 'calm-blue')
  assert.equal(getEffectiveLoginPrimaryColor('calm-blue', null), '#4FB3BF')
})

test('database and settings defaults use calm-blue as the initial theme', () => {
  const sources = {
    init: readFileSync(resolve(projectRoot, 'src/database/init.ts'), 'utf8'),
    mock: readFileSync(resolve(projectRoot, 'src/database/mock-data.ts'), 'utf8'),
    sqljs: readFileSync(resolve(projectRoot, 'src/database/sqljs-init.ts'), 'utf8'),
    settings: readFileSync(resolve(projectRoot, 'src/views/system/SystemSettings.vue'), 'utf8'),
  }

  // login_theme_backgrounds JSON 里含 "warm-glow" 变体属于按主题存储的媒体配置，
  // 因此这里只匹配 login_theme_variant / theme_primary_color 两个 key 的默认值。
  // 按行提取第二个单引号字符串（第一是 key 自身），避免 case 分支/赋值行误匹配。
  const valuesForKey = (source, key) =>
    source
      .split('\n')
      .filter((line) => line.includes(key))
      .map((line) => [...line.matchAll(/'([^'\n]+)'/g)][1]?.[1])
      .filter(Boolean)
  const variantValues = Object.values(sources).flatMap((source) => valuesForKey(source, 'login_theme_variant'))
  const colorValues = Object.values(sources).flatMap((source) => valuesForKey(source, 'theme_primary_color'))
  const settingsInitial = sources.settings.match(/loginThemeVariant: '([^']+)'/)

  assert.ok(variantValues.length >= 4, '应覆盖 init.ts×2 + mock-data + sqljs-init 的默认值')
  assert.deepEqual([...new Set(variantValues)], ['calm-blue'])
  assert.ok(colorValues.length >= 4, '应覆盖 init.ts×2 + mock-data + sqljs-init 的默认值')
  assert.deepEqual([...new Set(colorValues)], ['#4FB3BF'])
  assert.equal(settingsInitial?.[1], 'calm-blue')
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

test('login background rendering keeps video -> image fallback chain (no procedural fallback)', () => {
  const backgroundSource = readFileSync(
    resolve(projectRoot, 'src/components/login/GalaxyBackground.vue'),
    'utf8',
  )
  const loginSource = readFileSync(resolve(projectRoot, 'src/views/Login.vue'), 'utf8')

  // 1. 视频：autoplay muted loop playsinline，加载成功后必须真正 play() 成功
  assert.match(backgroundSource, /<video[\s\S]*?autoplay[\s\S]*?muted[\s\S]*?loop[\s\S]*?playsinline/)
  assert.match(backgroundSource, /@error="handleVideoError"/)
  assert.match(backgroundSource, /@loadeddata="handleVideoLoaded"/)
  assert.match(backgroundSource, /await videoRef\.value\?\.play\(\)/)
  assert.match(backgroundSource, /catch \{[\s\S]*?handleVideoError\(\)/)

  // 2. 图片：作为视频 poster 与纯图片兜底
  assert.match(backgroundSource, /:poster="props\.backgroundImage \|\| undefined"/)
  assert.match(backgroundSource, /@error="handleImageError"/)

  // 3. 无程序化兜底：Three.js 星空背景（StarfieldTunnel）已移除，mp4 → jpg 为最终兜底链
  assert.doesNotMatch(backgroundSource, /StarfieldTunnel/)
  assert.doesNotMatch(backgroundSource, /videoReady/)

  // 4. 登录页把 store 的图片/视频引用传入背景组件
  assert.match(loginSource, /:background-image="systemConfigStore\.activeLoginBackground\.image"/)
  assert.match(loginSource, /:background-video="systemConfigStore\.activeLoginBackground\.video"/)
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
