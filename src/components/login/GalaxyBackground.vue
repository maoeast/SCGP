<template>
  <div class="galaxy-background" aria-hidden="true">
    <img
      v-if="props.backgroundImage && !imageFailed"
      :key="props.backgroundImage"
      class="galaxy-background__image"
      :src="props.backgroundImage"
      alt=""
      @error="handleImageError"
    />
    <video
      v-if="props.backgroundVideo && !videoFailed"
      :key="props.backgroundVideo"
      ref="videoRef"
      class="galaxy-background__video"
      :src="props.backgroundVideo"
      :poster="props.backgroundImage || undefined"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      @error="handleVideoError"
      @loadeddata="handleVideoLoaded"
    ></video>
    <StarfieldTunnel
      v-if="(!props.backgroundImage || imageFailed) && (!props.backgroundVideo || videoFailed || !videoReady)"
      :variant="props.variant"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LoginThemeVariant } from '@/utils/login-theme'
import StarfieldTunnel from './StarfieldTunnel.vue'

interface Props {
  variant?: LoginThemeVariant
  backgroundImage?: string
  backgroundVideo?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'warm-glow',
  backgroundImage: '',
  backgroundVideo: '',
})

const imageFailed = ref(false)
const videoFailed = ref(false)
const videoReady = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

const handleImageError = () => {
  imageFailed.value = true
}

const handleVideoError = () => {
  videoFailed.value = true
  videoReady.value = false
}

const handleVideoLoaded = async () => {
  videoFailed.value = false
  videoReady.value = true
  try {
    await videoRef.value?.play()
  } catch {
    handleVideoError()
  }
}

watch(
  () => [props.variant, props.backgroundImage, props.backgroundVideo],
  () => {
    imageFailed.value = false
    videoFailed.value = false
    videoReady.value = false
  },
)
</script>

<style scoped>
.galaxy-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.galaxy-background__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  animation: login-background-fade-in 0.45s ease-out;
}

.galaxy-background__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  animation: login-background-fade-in 0.45s ease-out;
}

@keyframes login-background-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
