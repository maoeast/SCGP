import type {
  EmotionalBaseEmotion,
  EmotionalColorToken,
} from '@/types/emotional'

export type LegacyEmotionalBaseEmotion = 'anger'

export interface EmotionalCatalogEntry {
  value: EmotionalBaseEmotion
  label: string
  englishLabel: string
  bilingualLabel: string
  emoji: string
  colorToken: EmotionalColorToken
  colorHex: string
  colorLabel: string
}

export const EMOTIONAL_BASE_EMOTIONS: EmotionalBaseEmotion[] = [
  'calm',
  'happy',
  'sad',
  'angry',
  'scared',
  'embarrassed',
  'shy',
  'proud',
]

export const EMOTION_COLOR_PRESETS: Record<EmotionalBaseEmotion, {
  token: EmotionalColorToken
  hex: string
  label: string
}> = {
  calm: { token: 'green', hex: '#7BCFA0', label: '绿色' },
  happy: { token: 'yellow', hex: '#F7C948', label: '黄色' },
  sad: { token: 'blue', hex: '#5B8DEF', label: '蓝色' },
  angry: { token: 'red', hex: '#E5484D', label: '红色' },
  scared: { token: 'purple', hex: '#7E57C2', label: '紫色' },
  embarrassed: { token: 'magenta', hex: '#E64980', label: '玫红色' },
  shy: { token: 'peach', hex: '#F6B7A9', label: '蜜桃粉' },
  proud: { token: 'gold', hex: '#F59E0B', label: '金橙色' },
}

export const EMOTIONAL_BASE_EMOTION_META: Record<EmotionalBaseEmotion, EmotionalCatalogEntry> = {
  calm: {
    value: 'calm',
    label: '平静',
    englishLabel: 'Calm',
    bilingualLabel: '平静 / Calm',
    emoji: '😌',
    colorToken: EMOTION_COLOR_PRESETS.calm.token,
    colorHex: EMOTION_COLOR_PRESETS.calm.hex,
    colorLabel: EMOTION_COLOR_PRESETS.calm.label,
  },
  happy: {
    value: 'happy',
    label: '开心',
    englishLabel: 'Happy',
    bilingualLabel: '开心 / Happy',
    emoji: '😊',
    colorToken: EMOTION_COLOR_PRESETS.happy.token,
    colorHex: EMOTION_COLOR_PRESETS.happy.hex,
    colorLabel: EMOTION_COLOR_PRESETS.happy.label,
  },
  sad: {
    value: 'sad',
    label: '难过',
    englishLabel: 'Sad',
    bilingualLabel: '难过 / Sad',
    emoji: '😢',
    colorToken: EMOTION_COLOR_PRESETS.sad.token,
    colorHex: EMOTION_COLOR_PRESETS.sad.hex,
    colorLabel: EMOTION_COLOR_PRESETS.sad.label,
  },
  angry: {
    value: 'angry',
    label: '生气',
    englishLabel: 'Angry',
    bilingualLabel: '生气 / Angry',
    emoji: '😠',
    colorToken: EMOTION_COLOR_PRESETS.angry.token,
    colorHex: EMOTION_COLOR_PRESETS.angry.hex,
    colorLabel: EMOTION_COLOR_PRESETS.angry.label,
  },
  scared: {
    value: 'scared',
    label: '害怕',
    englishLabel: 'Scared',
    bilingualLabel: '害怕 / Scared',
    emoji: '😨',
    colorToken: EMOTION_COLOR_PRESETS.scared.token,
    colorHex: EMOTION_COLOR_PRESETS.scared.hex,
    colorLabel: EMOTION_COLOR_PRESETS.scared.label,
  },
  embarrassed: {
    value: 'embarrassed',
    label: '尴尬',
    englishLabel: 'Embarrassed',
    bilingualLabel: '尴尬 / Embarrassed',
    emoji: '😳',
    colorToken: EMOTION_COLOR_PRESETS.embarrassed.token,
    colorHex: EMOTION_COLOR_PRESETS.embarrassed.hex,
    colorLabel: EMOTION_COLOR_PRESETS.embarrassed.label,
  },
  shy: {
    value: 'shy',
    label: '害羞',
    englishLabel: 'Shy',
    bilingualLabel: '害羞 / Shy',
    emoji: '🫣',
    colorToken: EMOTION_COLOR_PRESETS.shy.token,
    colorHex: EMOTION_COLOR_PRESETS.shy.hex,
    colorLabel: EMOTION_COLOR_PRESETS.shy.label,
  },
  proud: {
    value: 'proud',
    label: '自豪',
    englishLabel: 'Proud',
    bilingualLabel: '自豪 / Proud',
    emoji: '🏆',
    colorToken: EMOTION_COLOR_PRESETS.proud.token,
    colorHex: EMOTION_COLOR_PRESETS.proud.hex,
    colorLabel: EMOTION_COLOR_PRESETS.proud.label,
  },
}

const LEGACY_EMOTION_ALIASES: Record<LegacyEmotionalBaseEmotion, EmotionalBaseEmotion> = {
  anger: 'angry',
}

export const EMOTIONAL_BASE_EMOTION_OPTIONS = EMOTIONAL_BASE_EMOTIONS.map((value) => ({
  value,
  label: EMOTIONAL_BASE_EMOTION_META[value].label,
}))

export function isEmotionalBaseEmotion(value: unknown): value is EmotionalBaseEmotion {
  return typeof value === 'string' && EMOTIONAL_BASE_EMOTIONS.includes(value as EmotionalBaseEmotion)
}

export function normalizeEmotionalBaseEmotion(
  value: unknown,
  fallback: EmotionalBaseEmotion,
): EmotionalBaseEmotion {
  return parseEmotionalBaseEmotion(value) || fallback
}

export function parseEmotionalBaseEmotion(value: unknown): EmotionalBaseEmotion | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (isEmotionalBaseEmotion(normalized)) {
    return normalized
  }

  if (normalized in LEGACY_EMOTION_ALIASES) {
    return LEGACY_EMOTION_ALIASES[normalized as LegacyEmotionalBaseEmotion]
  }

  return null
}

export function normalizeEmotionalBaseEmotionList(
  value: unknown,
  targetEmotion: EmotionalBaseEmotion,
): EmotionalBaseEmotion[] {
  const source = Array.isArray(value) ? value : EMOTIONAL_BASE_EMOTIONS
  const unique = Array.from(
    new Set(
      source
        .filter((item): item is string => typeof item === 'string')
        .map((item) => normalizeEmotionalBaseEmotion(item, targetEmotion))
    )
  )

  if (!unique.includes(targetEmotion)) {
    unique.unshift(targetEmotion)
  }

  return unique.length > 0 ? unique : [...EMOTIONAL_BASE_EMOTIONS]
}

export function getEmotionCatalogEntry(
  emotion: unknown,
  fallback: EmotionalBaseEmotion,
): EmotionalCatalogEntry {
  return EMOTIONAL_BASE_EMOTION_META[normalizeEmotionalBaseEmotion(emotion, fallback)]
}
