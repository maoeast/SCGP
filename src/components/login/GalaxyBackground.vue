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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  backgroundImage?: string
  backgroundVideo?: string
}

const props = withDefaults(defineProps<Props>(), {
  backgroundImage: '',
  backgroundVideo: '',
})

const imageFailed = ref(false)
const videoFailed = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

const handleImageError = () => {
  imageFailed.value = true
}

const handleVideoError = () => {
  videoFailed.value = true
}

const handleVideoLoaded = async () => {
  videoFailed.value = false
  try {
    await videoRef.value?.play()
  } catch {
    handleVideoError()
  }
}

watch(
  () => [props.backgroundImage, props.backgroundVideo],
  () => {
    imageFailed.value = false
    videoFailed.value = false
  },
)
</script>

<style scoped>
.galaxy-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* 兜底渐变：资源为空/加载失败时露出，基于主题色派生，随主题切换自动跟随 */
  background:
    radial-gradient(circle at 22% 18%, color-mix(in srgb, var(--login-primary, #3C9BA6) 28%, transparent), transparent 42%),
    radial-gradient(circle at 80% 78%, color-mix(in srgb, var(--login-brand-end, #2F838C) 22%, transparent), transparent 46%),
    linear-gradient(160deg, var(--login-brand-start, #2F838C) 0%, var(--login-shell-bg, #0b0718) 100%);
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
