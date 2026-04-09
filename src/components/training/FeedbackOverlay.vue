<template>
  <Transition name="reward-overlay">
    <div v-if="store.showRewardOverlay" class="feedback-overlay" aria-hidden="true">
      <div class="overlay-burst">
        <span class="burst-title">👍 你真棒</span>
      </div>

      <span
        v-for="piece in confettiPieces"
        :key="`confetti-${piece.id}`"
        class="confetti-piece"
        :style="piece.style"
      />

      <span
        v-for="star in floatingStars"
        :key="`star-${star.id}`"
        class="floating-star"
        :style="star.style"
      >
        ★
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()

const confettiPalette = ['#f87171', '#facc15', '#34d399', '#38bdf8', '#a78bfa', '#fb7185']

const confettiPieces = computed(() => {
  return Array.from({ length: 22 }, (_, index) => {
    const left = 4 + (index % 11) * 8.5
    const delay = (index % 6) * 90
    const duration = 1400 + (index % 5) * 120
    const rotation = index % 2 === 0 ? 14 : -16
    const color = confettiPalette[index % confettiPalette.length]

    return {
      id: index,
      style: {
        '--confetti-color': color,
        '--confetti-color-soft': `${color}cc`,
        '--confetti-delay': `${delay}ms`,
        '--confetti-duration': `${duration}ms`,
        '--confetti-left': `${left}%`,
        '--confetti-spin': `${rotation * 10}deg`,
      },
    }
  })
})

const floatingStars = computed(() => {
  return Array.from({ length: 8 }, (_, index) => {
    const left = 10 + index * 11
    const delay = 120 + index * 70
    const duration = 1050 + (index % 3) * 160

    return {
      id: index,
      style: {
        '--star-left': `${left}%`,
        '--star-delay': `${delay}ms`,
        '--star-duration': `${duration}ms`,
      },
    }
  })
})
</script>

<style scoped>
.feedback-overlay {
  position: fixed;
  inset: 0;
  z-index: 24;
  overflow: hidden;
  pointer-events: none;
}

.overlay-burst {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 18px 26px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  color: #0f172a;
  background: linear-gradient(135deg, rgb(255 255 255 / 0.96) 0%, rgb(254 240 138 / 0.96) 52%, rgb(187 247 208 / 0.96) 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.8),
    0 24px 44px rgb(15 23 42 / 0.18);
  animation: burst-pop 320ms ease-out both;
}

.burst-title {
  font-size: clamp(32px, 5vw, 54px);
  font-weight: 900;
  line-height: 1;
}

.confetti-piece {
  position: absolute;
  top: -10vh;
  left: var(--confetti-left);
  width: 18px;
  height: 44px;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffffff 0%, var(--confetti-color-soft) 36%, var(--confetti-color) 100%);
  box-shadow: 0 10px 20px rgb(255 255 255 / 0.12);
  opacity: 0;
  animation: confetti-fall var(--confetti-duration) ease-in forwards;
  animation-delay: var(--confetti-delay);
}

.floating-star {
  position: absolute;
  top: 34vh;
  left: var(--star-left);
  font-size: clamp(26px, 4vw, 44px);
  color: #fef08a;
  text-shadow: 0 12px 24px rgb(254 240 138 / 0.42);
  opacity: 0;
  animation: star-float var(--star-duration) ease-out forwards;
  animation-delay: var(--star-delay);
}

.reward-overlay-enter-active,
.reward-overlay-leave-active {
  transition: opacity 0.22s ease;
}

.reward-overlay-enter-from,
.reward-overlay-leave-to {
  opacity: 0;
}

@keyframes burst-pop {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-50% + 16px)) scale(0.88);
  }

  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}

@keyframes confetti-fall {
  0% {
    opacity: 0;
    transform: translate3d(0, -8vh, 0) rotate(0deg);
  }

  12% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate3d(24px, 112vh, 0) rotate(var(--confetti-spin));
  }
}

@keyframes star-float {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.7);
  }

  30% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translateY(-140px) scale(1.15);
  }
}

@media (max-width: 768px) {
  .overlay-burst {
    top: 50%;
    width: calc(100% - 28px);
    padding: 16px 18px;
  }

  .confetti-piece {
    width: 14px;
    height: 34px;
  }
}
</style>
