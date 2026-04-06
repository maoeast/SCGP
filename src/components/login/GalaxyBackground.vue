<template>
  <div class="galaxy-background" aria-hidden="true">
    <div
      v-if="variant === 'custom' && customBgImage"
      class="galaxy-background__image"
      :style="{ backgroundImage: `url(${customBgImage})` }"
    ></div>
    <div
      v-else-if="variant === 'custom'"
      class="galaxy-background__fallback"
    ></div>
    <StarfieldTunnel v-else :variant="variant" />
  </div>
</template>

<script setup lang="ts">
import type { LoginThemeVariant } from '@/utils/login-theme'
import StarfieldTunnel from './StarfieldTunnel.vue'

interface Props {
  variant?: LoginThemeVariant
  customBgImage?: string
}

withDefaults(defineProps<Props>(), {
  variant: 'warm-glow',
  customBgImage: '',
})
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
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.galaxy-background__fallback {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
}
</style>
