<template>
  <div class="galaxy-background" aria-hidden="true">
    <StarfieldTunnel :variant="variant" />
  </div>
</template>

<script setup lang="ts">
import type { LoginThemeVariant } from '@/utils/login-theme'
import StarfieldTunnel from './StarfieldTunnel.vue'

interface Props {
  variant?: LoginThemeVariant
}

withDefaults(defineProps<Props>(), {
  variant: 'warm-glow',
})
</script>

<style scoped>
.galaxy-background {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
</style>
