<template>
  <img
    :src="faceImage"
    :alt="expression"
    :width="size"
    :height="size"
    class="face-img"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EmotionType } from '@/types/emotional/face-emotion'

import faceHappy from './assets/face-happy.png'
import faceSurprised from './assets/face-surprised.png'
import faceAngry from './assets/face-angry.png'
import faceSad from './assets/face-sad.png'
import faceFearful from './assets/face-fearful.png'
import faceNeutral from './assets/face-neutral.png'

const props = defineProps<{
  expression: EmotionType
  size?: number
}>()

const faceMap: Record<EmotionType, string> = {
  Happy: faceHappy,
  Surprised: faceSurprised,
  Angry: faceAngry,
  Sad: faceSad,
  Fearful: faceFearful,
  Neutral: faceNeutral,
}

const faceImage = computed(() => faceMap[props.expression])
</script>

<style scoped>
.face-img {
  border-radius: 16px;
  object-fit: contain;
}
</style>
