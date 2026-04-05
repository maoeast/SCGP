export type LoginThemeVariant = 'warm-glow' | 'calm-blue'

export type LoginThemePreset = {
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
}

interface LoginThemePreset {
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
}

export interface LoginThemeConfig {
  variant: LoginThemeVariant
  primaryColor: string
}

export const DEFAULT_LOGIN_THEME_VARIANT: LoginThemeVariant = 'warm-glow'
export const DEFAULT_LOGIN_PRIMARY_COLOR = '#E6B93C'

export const LOGIN_THEME_PRESETS: Record<LoginThemeVariant, LoginThemePreset> = {
  'warm-glow': {
    label: '暖光',
    primary: '#E6B93C',
    primaryGradientStart: '#E6B93C',
    primaryGradientEnd: '#E38B3A',
    brandStart: '#F2C94C',
    brandEnd: '#F2994A',
    brandSoft: '#FFF8E7',
    pageBg: '#FFF8E7',
    badgeBackground: 'rgba(255, 248, 231, 0.3)',
    badgeText: '#8B6914',
  },
  'calm-blue': {
    label: '静蓝',
    primary: '#3B82F6',
    primaryGradientStart: '#3B82F6',
    primaryGradientEnd: '#1D4ED8',
    brandStart: '#1E3A8A',
    brandEnd: '#3B82F6',
    brandSoft: '#EFF6FF',
    pageBg: '#EFF6FF',
    badgeBackground: 'rgba(219, 234, 254, 0.5)',
    badgeText: '#1E40AF',
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

export function applyLoginThemeVariables(config: Partial<LoginThemeConfig> = {}) {
  if (typeof document === 'undefined') {
    return
  }

  const variant = normalizeLoginThemeVariant(config.variant)
  const preset = getLoginThemePreset(variant)
  const primary = normalizeHexColor(config.primaryColor, preset.primary)
  const style = document.documentElement.style

  style.setProperty('--login-primary', primary)
  style.setProperty('--login-primary-hover', mixHexColors(primary, preset.brandStart, 0.22))
  style.setProperty('--login-primary-soft', mixHexColors(primary, '#ffffff', 0.88))
  style.setProperty('--login-primary-border', mixHexColors(primary, '#ffffff', 0.72))
  style.setProperty('--login-primary-ring', colorToRgba(primary, 0.18))
  style.setProperty('--login-primary-gradient-start', preset.primaryGradientStart)
  style.setProperty('--login-primary-gradient-end', preset.primaryGradientEnd)
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
}
