const DIRECT_URL_RE = /^(?:https?:|data:|blob:|resource:\/\/)/i
const FILE_LIKE_RE = /\.(png|jpe?g|gif|webp|svg)$/i

const LEGACY_PREFIX_MAPPINGS: Array<{ source: string; target: string }> = [
  { source: '/assets/resources/', target: '' },
  { source: 'assets/resources/', target: '' },
  { source: '/assets/scenes/', target: 'images/emotional-scenes/' },
  { source: 'assets/scenes/', target: 'images/emotional-scenes/' },
  { source: '/images/', target: 'images/' },
  { source: 'images/', target: 'images/' },
  { source: '/docs/', target: 'docs/' },
  { source: 'docs/', target: 'docs/' },
  { source: '/videos/', target: 'videos/' },
  { source: 'videos/', target: 'videos/' },
  { source: '/audio/', target: 'audio/' },
  { source: 'audio/', target: 'audio/' },
]

const PRESET_PREFIXES = ['docs/', 'images/', 'videos/', 'audio/'] as const

function trimString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function joinWithBasePath(basePath: string, relativePath: string): string {
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${normalizedBase}${relativePath}`
}

export function normalizePresetResourcePath(value: unknown): string {
  const trimmed = trimString(value)
  if (!trimmed || DIRECT_URL_RE.test(trimmed)) {
    return ''
  }

  for (const mapping of LEGACY_PREFIX_MAPPINGS) {
    if (trimmed.startsWith(mapping.source)) {
      const remainder = trimmed.slice(mapping.source.length).replace(/^[\\/]+/, '')
      return `${mapping.target}${remainder}`
    }
  }

  return PRESET_PREFIXES.some((prefix) => trimmed.startsWith(prefix)) ? trimmed : ''
}

export function normalizePresetResourcePathForStorage(value: unknown): string {
  const trimmed = trimString(value)
  if (!trimmed) {
    return ''
  }

  if (DIRECT_URL_RE.test(trimmed)) {
    return trimmed
  }

  return normalizePresetResourcePath(trimmed) || trimmed
}

export function resolvePresetResourceUrl(value: unknown): string {
  const trimmed = trimString(value)
  if (!trimmed) {
    return ''
  }

  if (DIRECT_URL_RE.test(trimmed)) {
    return trimmed
  }

  const presetPath = normalizePresetResourcePath(trimmed)
  if (presetPath) {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return `resource://${presetPath}`
    }

    return joinWithBasePath(import.meta.env.BASE_URL || '/', `assets/resources/${presetPath}`)
  }

  return trimmed
}

export function isDisplayImageLike(value: unknown): boolean {
  const trimmed = trimString(value)
  if (!trimmed) {
    return false
  }

  return DIRECT_URL_RE.test(trimmed)
    || Boolean(normalizePresetResourcePath(trimmed))
    || trimmed.startsWith('/')
    || FILE_LIKE_RE.test(trimmed)
}
