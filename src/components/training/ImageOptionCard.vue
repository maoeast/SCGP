<template>
  <button
    type="button"
    class="image-option-card"
    :class="{
      'is-selected': selected && feedbackState === 'idle',
      'is-error': visualState === 'error',
      'is-success': visualState === 'success',
      'is-locked': disabled && visualState === 'idle',
    }"
    :disabled="disabled || visualState === 'success'"
    :style="selectionStyle"
    @click="$emit('select')"
  >
    <span v-if="displayEmoji" class="option-emoji" aria-hidden="true">{{ displayEmoji }}</span>
    <strong class="option-label">{{ option.content }}</strong>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { getEmotionCatalogEntry } from '@/features/emotional/emotion-catalog'
import type { OptionData } from '@/stores/useTrainingStore'

const props = defineProps<{
  option: OptionData
  selected?: boolean
  feedbackState?: 'idle' | 'error' | 'success'
  disabled?: boolean
}>()

const emit = defineEmits<{
  select: []
}>()

const SAFE_EMOJI_BY_ICON_NAME: Record<string, string> = {
  calm: '🙂',
  happy: '😊',
  sad: '😢',
  angry: '😠',
  scared: '😨',
  embarrassed: '😳',
  shy: '😊',
  proud: '😄',
}

function sanitizeIconName(raw: string | null): string | null {
  if (!raw) {
    return null
  }

  const normalized = raw
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2060\ufeff]/g, '')
    .trim()
    .toLowerCase()

  if (!normalized || normalized.length <= 1) {
    return null
  }

  return normalized
}

const displayEmoji = computed(() => {
  const normalizedIconName = sanitizeIconName(props.option.icon_name)
  if (normalizedIconName && SAFE_EMOJI_BY_ICON_NAME[normalizedIconName]) {
    return SAFE_EMOJI_BY_ICON_NAME[normalizedIconName]
  }

  if (normalizedIconName) {
    const catalogEmoji = getEmotionCatalogEntry(normalizedIconName, 'calm').emoji?.trim()
    if (catalogEmoji && !/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2060\ufeff]/.test(catalogEmoji)) {
      return catalogEmoji === '🫣' ? '😊' : catalogEmoji
    }
  }

  return '🙂'
})

function withAlpha(hex: string, alpha: string): string {
  const normalized = hex.trim()
  return /^#[0-9a-f]{6}$/i.test(normalized) ? `${normalized}${alpha}` : normalized
}

const selectionStyle = computed(() => {
  const accent = props.option.color_hex?.trim()
  if (!accent) {
    return undefined
  }

  return {
    '--emotion-accent': accent,
    '--emotion-accent-soft': withAlpha(accent, '26'),
    '--emotion-accent-border': withAlpha(accent, '88'),
  }
})

const visualState = computed(() => props.feedbackState ?? 'idle')
</script>

<style scoped>
.image-option-card {
  position: relative;
  width: 100%;
  min-height: 210px;
  border: 2px solid rgb(226 232 240 / 78%);
  border-radius: 28px;
  padding: 24px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  text-align: center;
  cursor: pointer;
  background: rgb(255 255 255 / 95%);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 88%),
    0 22px 44px rgb(15 23 42 / 14%);
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
}

.image-option-card:disabled {
  cursor: default;
}

.image-option-card:active:not(:disabled) {
  transform: scale(0.985);
}

.image-option-card.is-locked {
  opacity: 0.82;
}

.image-option-card.is-selected {
  border-width: 3px;
  border-color: var(--emotion-accent-border, rgb(125 211 252 / 90%));
  background: linear-gradient(180deg, #ffffff 0%, var(--emotion-accent-soft, rgb(191 219 254 / 28%)) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 92%),
    0 24px 44px rgb(15 23 42 / 16%);
}

.image-option-card.is-error {
  border-color: #ef4444;
  box-shadow:
    inset 0 0 0 1px rgb(254 202 202 / 78%),
    0 20px 42px rgb(239 68 68 / 22%);
  animation: option-shake 150ms ease-in-out;
}

.image-option-card.is-success {
  border-width: 3px;
  border-color: #16a34a;
  background: linear-gradient(180deg, #f0fdf4 0%, #dcfce7 100%);
  box-shadow:
    inset 0 0 0 1px rgb(134 239 172 / 88%),
    0 22px 42px rgb(22 163 74 / 18%);
}

.option-emoji {
  font-size: clamp(56px, 8vw, 82px);
  line-height: 1;
  min-height: 1em;
  transition: transform 0.18s ease;
}

.image-option-card.is-selected .option-emoji,
.image-option-card.is-success .option-emoji {
  transform: scale(1.08);
}

.option-label {
  font-size: clamp(22px, 2.7vw, 30px);
  line-height: 1.22;
  font-weight: 900;
  color: #0f172a;
}

@keyframes option-shake {
  0%,
  100% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(-10px);
  }

  75% {
    transform: translateX(10px);
  }
}

@media (max-width: 900px) {
  .image-option-card {
    min-height: 170px;
    padding: 20px 14px;
    border-radius: 24px;
  }

  .option-label {
    font-size: clamp(18px, 3vw, 24px);
  }
}
</style>
