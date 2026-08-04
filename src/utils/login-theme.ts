export type LoginThemeVariant = 'warm-glow' | 'calm-blue' | 'lush-green' | 'custom'

export interface LoginThemePreset {
  label: string
  primary: string
  primaryGradientStart: string
  primaryGradientEnd: string
  brandStart: string
  brandEnd: string
  brandSoft: string
  pageBg: string
  badgeBackground: string
  badgeText: string
  /** Shell outer background */
  shellBg: string
  /** Shell veil gradient (CSS) */
  shellVeil: string
  /** Layout container background */
  layoutBg: string
  /** Layout border color */
  layoutBorder: string
  /** Layout box-shadow (CSS) */
  layoutShadow: string
  /** Brand panel gradient (CSS) */
  brandPanelBg: string
  /** Brand panel text color */
  brandPanelText: string
  /** Brand panel school badge text */
  brandBadgeText: string
  /** Brand panel tagline color */
  brandTagline: string
  /** Form pane background (CSS) */
  formPaneBg: string
  /** Button box-shadow color for glow effect */
  buttonShadow: string
  /** Button disabled gradient start */
  buttonDisabledStart: string
  /** Button disabled gradient end */
  buttonDisabledEnd: string
  /** Galaxy background base color */
  galaxyBg: string
  /** Galaxy vignette gradient (CSS) */
  galaxyVignette: string
  /** Galaxy particle palette */
  galaxyParticlePalette: string[]
  /** Galaxy dust palette */
  galaxyDustPalette: string[]
  /** Galaxy background base gradient (CSS) */
  galaxyBaseGradient: string
  /** Galaxy lower glow colors */
  galaxyLowerGlow: string[]
  /** Galaxy main glow color stops */
  galaxyMainGlow: string[]
  /** Galaxy core glow colors */
  galaxyCoreGlow: string[]
}

export interface LoginThemeConfig {
  variant: LoginThemeVariant
  primaryColor: string
  customBgImage?: string
  cardBgOpacity?: number
  /** Development-only override for tuning preset interaction colors. */
  allowPresetPrimaryColorOverride?: boolean
}

export const DEFAULT_LOGIN_THEME_VARIANT: LoginThemeVariant = 'calm-blue'
export const DEFAULT_LOGIN_PRIMARY_COLOR = '#4FB3BF'

export const LOGIN_THEME_PRESETS: Record<LoginThemeVariant, LoginThemePreset> = {
  'warm-glow': {
    label: '暖黄',
    primary: '#E6B93C',
    primaryGradientStart: '#E6B93C',
    primaryGradientEnd: '#E38B3A',
    brandStart: '#F2C94C',
    brandEnd: '#F2994A',
    brandSoft: '#FFF8E7',
    pageBg: '#FFF8E7',
    badgeBackground: 'rgba(255, 248, 231, 0.3)',
    badgeText: '#8B6914',
    shellBg: '#0b0718',
    shellVeil:
      'radial-gradient(circle at 20% 14%, rgba(255, 246, 214, 0.04), transparent 18%), radial-gradient(circle at 84% 18%, rgba(255, 202, 224, 0.05), transparent 14%), linear-gradient(135deg, rgba(8, 8, 18, 0.04) 0%, rgba(11, 7, 24, 0.14) 100%)',
    layoutBg: 'rgba(13, 7, 24, 0.34)',
    layoutBorder: 'rgba(255, 255, 255, 0.16)',
    layoutShadow: '0 36px 100px rgba(2, 6, 23, 0.42)',
    brandPanelBg:
      'radial-gradient(circle at 18% 78%, rgba(255, 248, 214, 0.34), transparent 24%), radial-gradient(circle at 82% 18%, rgba(255, 219, 132, 0.28), transparent 18%), linear-gradient(160deg, #f2c94c 0%, #f5bf57 38%, #f2994a 100%)',
    brandPanelText: '#4f3412',
    brandBadgeText: '#6a4518',
    brandTagline: 'rgba(255, 255, 255, 0.72)',
    formPaneBg:
      'radial-gradient(circle at left center, rgba(255, 216, 131, 0.08), transparent 24%), linear-gradient(180deg, rgba(255, 251, 246, 0.92) 0%, rgba(255, 255, 255, 0.97) 100%)',
    buttonShadow: 'rgba(227, 139, 58, 0.3)',
    buttonDisabledStart: '#d4c9a8',
    buttonDisabledEnd: '#c9b896',
    galaxyBg: '#fff8e7',
    galaxyVignette:
      'radial-gradient(circle at center, transparent 0 54%, rgba(242, 201, 76, 0.08) 74%, rgba(242, 153, 74, 0.16) 100%), linear-gradient(180deg, rgba(255, 248, 231, 0) 0%, rgba(242, 153, 74, 0.06) 100%)',
    galaxyParticlePalette: [
      'rgb(255, 160, 10)',
      'rgb(255, 120, 0)',
      'rgb(230, 100, 0)',
      'rgb(255, 180, 20)',
      'rgb(200, 80, 0)',
      'rgb(255, 90, 0)',
      'rgb(255, 200, 40)',
      'rgb(240, 140, 0)',
    ],
    galaxyDustPalette: [
      'rgb(255, 160, 10)',
      'rgb(255, 130, 0)',
      'rgb(230, 100, 0)',
      'rgb(255, 190, 30)',
      'rgb(200, 80, 0)',
    ],
    galaxyBaseGradient: '#fff8e7',
    galaxyLowerGlow: [
      'rgba(242, 201, 76, 0.12)',
      'rgba(242, 201, 76, 0.05)',
      'rgba(242, 201, 76, 0)',
    ],
    galaxyMainGlow: [
      'rgba(255, 216, 138, 0.14)',
      'rgba(255, 187, 214, 0.12)',
      'rgba(255, 153, 198, 0.06)',
      'rgba(255, 153, 198, 0)',
    ],
    galaxyCoreGlow: [
      'rgba(255, 252, 241, 0.9)',
      'rgba(255, 236, 188, 0.86)',
      'rgba(255, 210, 140, 0.64)',
      'rgba(255, 157, 198, 0.34)',
      'rgba(255, 157, 198, 0)',
    ],
  },
  'calm-blue': {
    label: '静蓝',
    primary: '#4FB3BF',
    primaryGradientStart: '#4FB3BF',
    primaryGradientEnd: '#3A98A3',
    brandStart: '#3A98A3',
    brandEnd: '#4FB3BF',
    brandSoft: '#DFF4F6',
    pageBg: '#EDF5F7',
    badgeBackground: 'rgba(79, 179, 191, 0.18)',
    badgeText: '#1A4A50',
    shellBg: '#D6ECF0',
    shellVeil:
      'radial-gradient(circle at 20% 14%, rgba(79, 179, 191, 0.12), transparent 18%), radial-gradient(circle at 84% 18%, rgba(166, 221, 224, 0.15), transparent 14%), linear-gradient(135deg, rgba(214, 236, 240, 0.08) 0%, rgba(79, 179, 191, 0.18) 100%)',
    layoutBg: 'rgba(255, 255, 255, 0.62)',
    layoutBorder: 'rgba(79, 179, 191, 0.28)',
    layoutShadow: '0 36px 100px rgba(58, 152, 163, 0.22)',
    brandPanelBg:
      'radial-gradient(circle at 18% 78%, rgba(166, 221, 224, 0.5), transparent 24%), radial-gradient(circle at 82% 18%, rgba(123, 198, 185, 0.4), transparent 18%), linear-gradient(160deg, #3A98A3 0%, #4FB3BF 50%, #7BC6B9 100%)',
    brandPanelText: '#ffffff',
    brandBadgeText: '#1A4A50',
    brandTagline: 'rgba(255, 255, 255, 0.85)',
    formPaneBg:
      'radial-gradient(circle at left center, rgba(79, 179, 191, 0.1), transparent 24%), linear-gradient(180deg, rgba(244, 250, 251, 0.94) 0%, rgba(255, 255, 255, 0.98) 100%)',
    buttonShadow: 'rgba(58, 152, 163, 0.35)',
    buttonDisabledStart: '#b0cdd2',
    buttonDisabledEnd: '#98bfc4',
    galaxyBg: '#D6ECF0',
    galaxyVignette:
      'radial-gradient(circle at center, transparent 0 54%, rgba(58, 152, 163, 0.12) 74%, rgba(58, 152, 163, 0.22) 100%), linear-gradient(180deg, rgba(214, 236, 240, 0) 0%, rgba(58, 152, 163, 0.1) 100%)',
    galaxyParticlePalette: [
      'rgb(79, 179, 191)',
      'rgb(58, 152, 163)',
      'rgb(123, 198, 185)',
      'rgb(166, 221, 224)',
      'rgb(150, 210, 218)',
      'rgb(110, 200, 195)',
      'rgb(200, 238, 240)',
      'rgb(90, 168, 178)',
    ],
    galaxyDustPalette: [
      'rgb(79, 179, 191)',
      'rgb(123, 198, 185)',
      'rgb(166, 221, 224)',
      'rgb(150, 210, 218)',
      'rgb(90, 168, 178)',
    ],
    galaxyBaseGradient: '#D6ECF0',
    galaxyLowerGlow: [
      'rgba(58, 152, 163, 0.18)',
      'rgba(58, 152, 163, 0.08)',
      'rgba(58, 152, 163, 0)',
    ],
    galaxyMainGlow: [
      'rgba(79, 179, 191, 0.2)',
      'rgba(123, 198, 185, 0.16)',
      'rgba(58, 152, 163, 0.08)',
      'rgba(58, 152, 163, 0)',
    ],
    galaxyCoreGlow: [
      'rgba(240, 252, 253, 0.92)',
      'rgba(166, 221, 224, 0.88)',
      'rgba(79, 179, 191, 0.68)',
      'rgba(58, 152, 163, 0.38)',
      'rgba(58, 152, 163, 0)',
    ],
  },
  'lush-green': {
    label: '润绿',
    primary: '#72BE2F',
    primaryGradientStart: '#72BE2F',
    primaryGradientEnd: '#55A923',
    brandStart: '#9BD6E8',
    brandEnd: '#A9D9C1',
    brandSoft: '#E8F7EF',
    pageBg: '#E8F6F2',
    badgeBackground: 'rgba(255, 255, 255, 0.3)',
    badgeText: '#3C7567',
    shellBg: '#CBEAE8',
    shellVeil:
      'radial-gradient(circle at 18% 16%, rgba(255, 255, 255, 0.28), transparent 22%), radial-gradient(circle at 82% 84%, rgba(114, 190, 47, 0.12), transparent 24%), linear-gradient(135deg, rgba(155, 214, 232, 0.14) 0%, rgba(169, 217, 193, 0.22) 100%)',
    layoutBg: 'rgba(255, 255, 255, 0.32)',
    layoutBorder: 'rgba(255, 255, 255, 0.52)',
    layoutShadow: '0 36px 100px rgba(65, 137, 111, 0.22)',
    brandPanelBg:
      'radial-gradient(circle at 22% 18%, rgba(255, 255, 255, 0.32), transparent 24%), radial-gradient(circle at 76% 78%, rgba(114, 190, 47, 0.2), transparent 26%), linear-gradient(155deg, #9BD6E8 0%, #9DD4DF 46%, #A9D9C1 100%)',
    brandPanelText: '#ffffff',
    brandBadgeText: '#3C7567',
    brandTagline: 'rgba(255, 255, 255, 0.84)',
    formPaneBg:
      'radial-gradient(circle at left center, rgba(114, 190, 47, 0.1), transparent 26%), linear-gradient(180deg, rgba(250, 255, 253, 0.94) 0%, rgba(255, 255, 255, 0.98) 100%)',
    buttonShadow: 'rgba(87, 169, 35, 0.34)',
    buttonDisabledStart: '#C4D7C5',
    buttonDisabledEnd: '#B2C9B6',
    galaxyBg: '#CBEAE8',
    galaxyVignette:
      'radial-gradient(circle at center, transparent 0 54%, rgba(114, 190, 47, 0.08) 74%, rgba(65, 156, 139, 0.16) 100%), linear-gradient(180deg, rgba(203, 234, 232, 0) 0%, rgba(169, 217, 193, 0.14) 100%)',
    galaxyParticlePalette: [
      'rgb(114, 190, 47)',
      'rgb(87, 169, 35)',
      'rgb(74, 167, 155)',
      'rgb(113, 194, 177)',
      'rgb(155, 214, 232)',
      'rgb(164, 214, 128)',
      'rgb(207, 239, 224)',
      'rgb(82, 150, 139)',
    ],
    galaxyDustPalette: [
      'rgb(114, 190, 47)',
      'rgb(87, 169, 35)',
      'rgb(113, 194, 177)',
      'rgb(155, 214, 232)',
      'rgb(82, 150, 139)',
    ],
    galaxyBaseGradient: '#CBEAE8',
    galaxyLowerGlow: [
      'rgba(114, 190, 47, 0.16)',
      'rgba(114, 190, 47, 0.07)',
      'rgba(114, 190, 47, 0)',
    ],
    galaxyMainGlow: [
      'rgba(155, 214, 232, 0.2)',
      'rgba(113, 194, 177, 0.17)',
      'rgba(114, 190, 47, 0.08)',
      'rgba(114, 190, 47, 0)',
    ],
    galaxyCoreGlow: [
      'rgba(247, 255, 250, 0.92)',
      'rgba(207, 239, 224, 0.88)',
      'rgba(114, 190, 47, 0.64)',
      'rgba(74, 167, 155, 0.34)',
      'rgba(74, 167, 155, 0)',
    ],
  },
  custom: {
    label: '自定义',
    primary: '#E6B93C',
    primaryGradientStart: '#E6B93C',
    primaryGradientEnd: '#c99a2e',
    brandStart: '#f2c94c',
    brandEnd: '#f2994a',
    brandSoft: '#FFF8E7',
    pageBg: '#1a1a2e',
    badgeBackground: 'rgba(255, 255, 255, 0.15)',
    badgeText: '#ffffff',
    shellBg: '#1a1a2e',
    shellVeil: 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.2) 100%)',
    layoutBg: 'rgba(255, 255, 255, 0.08)',
    layoutBorder: 'rgba(255, 255, 255, 0.18)',
    layoutShadow: '0 36px 100px rgba(0, 0, 0, 0.4)',
    brandPanelBg:
      'linear-gradient(160deg, #2d2d44 0%, #3a3a5c 100%)',
    brandPanelText: '#ffffff',
    brandBadgeText: '#ffffff',
    brandTagline: 'rgba(255, 255, 255, 0.7)',
    formPaneBg: 'rgba(255, 255, 255, 0.06)',
    buttonShadow: 'rgba(230, 185, 60, 0.3)',
    buttonDisabledStart: '#8a8a9a',
    buttonDisabledEnd: '#7a7a8a',
    galaxyBg: '#1a1a2e',
    galaxyVignette: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 100%)',
    galaxyParticlePalette: [
      'rgb(230, 185, 60)',
      'rgb(200, 160, 40)',
      'rgb(180, 140, 30)',
      'rgb(255, 200, 60)',
      'rgb(170, 130, 30)',
      'rgb(210, 170, 50)',
      'rgb(240, 195, 55)',
      'rgb(190, 150, 35)',
    ],
    galaxyDustPalette: [
      'rgb(230, 185, 60)',
      'rgb(200, 160, 40)',
      'rgb(180, 140, 30)',
      'rgb(255, 200, 60)',
      'rgb(170, 130, 30)',
    ],
    galaxyBaseGradient: '#1a1a2e',
    galaxyLowerGlow: [
      'rgba(230, 185, 60, 0.12)',
      'rgba(230, 185, 60, 0.05)',
      'rgba(230, 185, 60, 0)',
    ],
    galaxyMainGlow: [
      'rgba(230, 185, 60, 0.14)',
      'rgba(200, 160, 40, 0.12)',
      'rgba(180, 140, 30, 0.06)',
      'rgba(180, 140, 30, 0)',
    ],
    galaxyCoreGlow: [
      'rgba(255, 255, 240, 0.9)',
      'rgba(230, 210, 150, 0.86)',
      'rgba(200, 170, 80, 0.64)',
      'rgba(180, 140, 60, 0.34)',
      'rgba(180, 140, 60, 0)',
    ],
  },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function normalizeHexPair(value: string) {
  return value.length === 1 ? `${value}${value}` : value
}

export function normalizeLoginThemeVariant(value: string | undefined | null): LoginThemeVariant {
  if (value && value in LOGIN_THEME_PRESETS) {
    return value as LoginThemeVariant
  }
  return DEFAULT_LOGIN_THEME_VARIANT
}

export function normalizeHexColor(value: string | undefined | null, fallback: string) {
  if (!value) {
    return fallback
  }

  const trimmed = value.trim()
  const normalized = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback
  }

  if (normalized.length === 3) {
    const expanded = normalized.split('').map(normalizeHexPair).join('')
    return `#${expanded.toLowerCase()}`
  }

  return `#${normalized.toLowerCase()}`
}

function hexToRgb(hex: string) {
  const normalized = normalizeHexColor(hex, DEFAULT_LOGIN_PRIMARY_COLOR).slice(1)
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function mixHexColors(colorA: string, colorB: string, weight = 0.5) {
  const ratio = clamp(weight, 0, 1)
  const a = hexToRgb(colorA)
  const b = hexToRgb(colorB)

  return rgbToHex(
    a.r * (1 - ratio) + b.r * ratio,
    a.g * (1 - ratio) + b.g * ratio,
    a.b * (1 - ratio) + b.b * ratio,
  )
}

export function colorToRgba(hex: string, alpha: number) {
  const rgb = hexToRgb(hex)
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${clamp(alpha, 0, 1)})`
}

export function getLoginThemePreset(variant: LoginThemeVariant) {
  return LOGIN_THEME_PRESETS[variant]
}

export function getEffectiveLoginPrimaryColor(
  variant: LoginThemeVariant,
  configuredColor?: string | null,
  allowPresetPrimaryColorOverride = false,
) {
  const preset = getLoginThemePreset(variant)
  if (variant !== 'custom' && !allowPresetPrimaryColorOverride) {
    return preset.primary
  }
  return normalizeHexColor(configuredColor, preset.primary)
}

export function applyLoginThemeVariables(config: Partial<LoginThemeConfig> = {}) {
  if (typeof document === 'undefined') {
    return
  }

  const variant = normalizeLoginThemeVariant(config.variant)
  const preset = getLoginThemePreset(variant)
  const primary = getEffectiveLoginPrimaryColor(
    variant,
    config.primaryColor,
    config.allowPresetPrimaryColorOverride,
  )
  const style = document.documentElement.style

  const isCustom = variant === 'custom'
  // Every variant derives the button gradient from the effective primary color.
  // This prevents a preset's active state from retaining a stale warm-orange color.
  const gradientStart = primary
  const gradientEnd = isCustom
    ? mixHexColors(primary, '#000000', 0.18)
    : mixHexColors(primary, preset.primaryGradientEnd, 0.45)
  const buttonShadow = colorToRgba(primary, 0.3)

  style.setProperty('--login-primary', primary)
  style.setProperty('--login-primary-hover', mixHexColors(primary, preset.brandStart, 0.22))
  style.setProperty('--login-primary-soft', mixHexColors(primary, '#ffffff', 0.88))
  style.setProperty('--login-primary-border', mixHexColors(primary, '#ffffff', 0.72))
  style.setProperty('--login-primary-ring', colorToRgba(primary, 0.18))
  style.setProperty('--login-primary-gradient-start', gradientStart)
  style.setProperty('--login-primary-gradient-end', gradientEnd)
  style.setProperty('--login-page-bg', preset.pageBg)
  style.setProperty('--login-brand-start', preset.brandStart)
  style.setProperty('--login-brand-end', preset.brandEnd)
  style.setProperty('--login-brand-soft', preset.brandSoft)
  style.setProperty('--login-brand-badge-bg', preset.badgeBackground)
  style.setProperty('--login-brand-badge-text', preset.badgeText)
  style.setProperty('--login-surface', '#ffffff')
  style.setProperty('--login-surface-soft', '#f7fafd')
  style.setProperty('--login-text', '#1f2937')
  style.setProperty('--login-muted', '#5f6b7a')
  style.setProperty('--login-border', '#dbe5f0')
  style.setProperty('--login-border-strong', '#c6d6e8')
  style.setProperty('--login-shell-bg', preset.shellBg)
  style.setProperty('--login-shell-veil', preset.shellVeil)
  style.setProperty('--login-layout-bg', preset.layoutBg)
  style.setProperty('--login-layout-border', preset.layoutBorder)
  style.setProperty('--login-layout-shadow', preset.layoutShadow)
  style.setProperty('--login-brand-panel-bg', preset.brandPanelBg)
  style.setProperty('--login-brand-panel-text', preset.brandPanelText)
  style.setProperty('--login-brand-badge-text', preset.brandBadgeText)
  style.setProperty('--login-brand-tagline', preset.brandTagline)

  // Card opacity — shared across all themes
  const cardOpacity = typeof config.cardBgOpacity === 'number' ? config.cardBgOpacity : 0.94
  const safeOpacity = String(clamp(cardOpacity, 0.3, 1.0))
  style.setProperty('--login-card-bg-opacity', safeOpacity)

  // For preset themes, the form pane is near-opaque white, which blocks
  // the background even when the card is transparent. Apply the same card
  // opacity to the form pane so the background (starfield) shows through.
  if (isCustom) {
    style.setProperty('--login-form-pane-bg', preset.formPaneBg)
  } else {
    // Preserve the theme tint colour but use card opacity
    const tint = variant === 'calm-blue'
      ? '244,250,251'
      : variant === 'lush-green'
        ? '247,253,249'
        : '255,251,246'
    style.setProperty(
      '--login-form-pane-bg',
      `linear-gradient(180deg, rgba(${tint},${safeOpacity}) 0%, rgba(255,255,255,${safeOpacity}) 100%)`,
    )
  }

  style.setProperty('--login-button-shadow', buttonShadow)
  style.setProperty('--login-button-disabled-start', preset.buttonDisabledStart)
  style.setProperty('--login-button-disabled-end', preset.buttonDisabledEnd)

  style.setProperty('--login-custom-bg-image', config.customBgImage ? `url(${config.customBgImage})` : 'none')
}
