<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const emit = defineEmits<{
  open: []
}>()

const hasBlockingSurface = ref(false)
let drawerObserver: MutationObserver | null = null

function updateBlockingSurfaceVisibility() {
  hasBlockingSurface.value = Array.from(
    document.querySelectorAll<HTMLElement>('.el-overlay.is-drawer, .training-layout'),
  ).some((overlay) => {
    const styles = window.getComputedStyle(overlay)

    return styles.display !== 'none'
      && styles.visibility !== 'hidden'
      && overlay.getClientRects().length > 0
  })
}

onMounted(() => {
  updateBlockingSurfaceVisibility()

  drawerObserver = new MutationObserver(updateBlockingSurfaceVisibility)
  drawerObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  })
})

onBeforeUnmount(() => {
  drawerObserver?.disconnect()
  drawerObserver = null
})

function handleClick() {
  emit('open')
}
</script>

<template>
  <button
    v-if="!hasBlockingSurface"
    class="ai-floating-button"
    type="button"
    aria-label="打开 AI 智能体"
    aria-describedby="ai-floating-button-tooltip"
    @click="handleClick"
  >
    <span class="ai-floating-button__motion">
      <svg
        class="ai-floating-button__shape"
        viewBox="0 0 60 60"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="ai-floating-button-gradient" x1="7" y1="5" x2="53" y2="55" gradientUnits="userSpaceOnUse">
            <stop stop-color="#C1E3F7" />
            <stop offset="0.52" stop-color="#9FD3EF" />
            <stop offset="1" stop-color="#79BFE3" />
          </linearGradient>
        </defs>
        <circle
          class="ai-floating-button__background"
          cx="30"
          cy="30"
          r="27"
          fill="url(#ai-floating-button-gradient)"
        />
        <g class="ai-floating-button__face">
          <g class="ai-floating-button__eyes">
            <g class="ai-floating-button__eye-dots">
              <circle class="ai-floating-button__eye-dot" cx="21" cy="23" r="3.5" />
              <circle class="ai-floating-button__eye-dot" cx="39" cy="23" r="3.5" />
            </g>
            <g class="ai-floating-button__happy-eyes">
              <path d="M 15.5 24.5 Q 21 18.5 26.5 24.5" />
              <path d="M 33.5 24.5 Q 39 18.5 44.5 24.5" />
            </g>
          </g>
          <path
            class="ai-floating-button__mouth"
            d="M 20.5 35 C 24 42.5, 36 42.5, 39.5 35"
          />
        </g>
      </svg>
    </span>
    <span id="ai-floating-button-tooltip" class="ai-floating-button__tooltip" role="tooltip">
      打开 AI 助手
    </span>
  </button>
</template>

<style scoped>
.ai-floating-button {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 9999;
  width: 60px;
  height: 60px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-button:hover,
.ai-floating-button:focus-visible {
  transform: scale(1.08);
}

.ai-floating-button:focus-visible {
  outline: 2px solid var(--el-color-primary-light-5, #a0cfff);
  outline-offset: 4px;
  border-radius: 50%;
}

.ai-floating-button__motion {
  --ai-floating-face-color: #596273;

  position: relative;
  display: block;
  width: 60px;
  height: 60px;
  filter: drop-shadow(0 8px 16px rgba(43, 128, 174, 0.26));
  animation: ai-floating-button-float 2.6s ease-in-out infinite;
}

.ai-floating-button__shape {
  display: block;
  width: 60px;
  height: 60px;
  overflow: visible;
}

.ai-floating-button__face {
  transform-box: fill-box;
  transform-origin: center;
  pointer-events: none;
  animation: ai-floating-button-look 6.4s ease-in-out infinite;
}

.ai-floating-button__eye-dot {
  fill: var(--ai-floating-face-color);
  transform-box: fill-box;
  transform-origin: center;
  animation: ai-floating-button-blink 5.2s ease-in-out infinite;
}

.ai-floating-button__eye-dots,
.ai-floating-button__happy-eyes {
  transition: opacity 0.2s ease, transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-button__happy-eyes {
  opacity: 0;
  transform: translateY(1px) scale(0.84);
  transform-box: fill-box;
  transform-origin: center;
}

.ai-floating-button__happy-eyes path,
.ai-floating-button__mouth {
  fill: none;
  stroke: var(--ai-floating-face-color);
  stroke-linecap: round;
  stroke-width: 3.4;
}

.ai-floating-button__mouth {
  transform-box: fill-box;
  transform-origin: center;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-button:hover .ai-floating-button__eye-dots,
.ai-floating-button:focus-visible .ai-floating-button__eye-dots {
  opacity: 0;
  transform: scaleY(0.3);
}

.ai-floating-button:hover .ai-floating-button__happy-eyes,
.ai-floating-button:focus-visible .ai-floating-button__happy-eyes {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.ai-floating-button:hover .ai-floating-button__mouth,
.ai-floating-button:focus-visible .ai-floating-button__mouth {
  transform: translateY(1px) scaleX(1.04);
}

.ai-floating-button__tooltip {
  position: absolute;
  top: 50%;
  right: calc(100% + 12px);
  width: max-content;
  max-width: calc(100vw - 108px);
  padding: 8px 11px;
  border: 1px solid rgba(74, 152, 198, 0.16);
  border-radius: 8px;
  background: var(--el-bg-color, #fff);
  box-shadow: 0 8px 20px rgba(49, 57, 104, 0.16);
  color: var(--el-text-color-primary, #303133);
  font-size: 13px;
  line-height: 1.3;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-50%) scale(0.88);
  transform-origin: right center;
  transition: opacity 0.18s ease, transform 0.24s cubic-bezier(0.4, 0, 0.2, 1);
}

.ai-floating-button__tooltip::after {
  position: absolute;
  top: 50%;
  right: -5px;
  width: 9px;
  height: 9px;
  border-top: 1px solid rgba(74, 152, 198, 0.16);
  border-right: 1px solid rgba(74, 152, 198, 0.16);
  background: var(--el-bg-color, #fff);
  content: '';
  transform: translateY(-50%) rotate(45deg);
}

.ai-floating-button:hover .ai-floating-button__tooltip,
.ai-floating-button:focus-visible .ai-floating-button__tooltip {
  opacity: 1;
  transform: translateY(-50%) scale(1);
  animation: ai-floating-button-tooltip-in 0.42s cubic-bezier(0.2, 0.9, 0.25, 1.2) both;
}

@keyframes ai-floating-button-float {
  0%, 100% {
    opacity: 0.92;
    transform: translateY(0);
  }

  50% {
    opacity: 1;
    transform: translateY(-4px);
  }
}

@keyframes ai-floating-button-tooltip-in {
  0% {
    opacity: 0;
    transform: translateY(-50%) scale(0.88);
  }

  70% {
    opacity: 1;
    transform: translateY(-50%) scale(1.03);
  }

  100% {
    opacity: 1;
    transform: translateY(-50%) scale(1);
  }
}

@keyframes ai-floating-button-look {
  0%, 16%, 44%, 58%, 86%, 100% {
    transform: translateX(0);
  }

  22%, 36% {
    transform: translateX(-3px);
  }

  64%, 78% {
    transform: translateX(3px);
  }
}

@keyframes ai-floating-button-blink {
  0%, 41%, 44%, 72%, 75%, 100% {
    transform: scaleY(1);
  }

  42.5%, 73.5% {
    transform: scaleY(0.12);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-floating-button,
  .ai-floating-button__motion,
  .ai-floating-button__tooltip,
  .ai-floating-button__face,
  .ai-floating-button__eye-dot,
  .ai-floating-button__eye-dots,
  .ai-floating-button__happy-eyes,
  .ai-floating-button__mouth {
    animation: none;
    transition-duration: 0.01ms;
  }
}
</style>
