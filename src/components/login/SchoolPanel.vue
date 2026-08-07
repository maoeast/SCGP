<template>
  <section class="school-panel">
    <span class="school-panel__decor school-panel__decor--halo" aria-hidden="true"></span>
    <span class="school-panel__decor school-panel__decor--stars" aria-hidden="true"></span>
    <span class="school-panel__decor school-panel__decor--orbit" aria-hidden="true"></span>
    <span class="school-panel__decor school-panel__decor--wave" aria-hidden="true"></span>

    <div class="school-panel__header">
      <div class="school-panel__logo-wrap">
        <img v-if="logoSrc" :src="logoSrc" alt="系统 Logo" class="school-panel__logo" />
        <span v-else class="school-panel__logo-fallback">{{ fallbackMark }}</span>
      </div>
    </div>

    <div class="school-panel__title-stage">
      <h1 class="school-panel__title">{{ displaySystemName }}</h1>
    </div>

    <div class="school-panel__meta-stage">
      <div class="school-panel__copy">
        <p class="school-panel__school">{{ schoolLabel }}</p>
        <p class="school-panel__tagline">{{ descriptionText }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  logoSrc: string
  systemName: string
  schoolName?: string
  brandDescription: string
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: '',
})

const fallbackMark = computed(() => {
  return (props.systemName || 'SCGP').trim().slice(0, 1).toUpperCase()
})

const schoolLabel = computed(() => {
  return props.schoolName?.trim() || 'XX学校'
})

const displaySystemName = computed(() => {
  return (props.systemName || '星愿能力发展训练系统').trim()
})

const descriptionText = computed(() => {
  const candidates = [props.brandDescription]
    .map(item => item?.trim() || '')
    .filter(Boolean)

  return candidates[0] || '从能力基线到情绪感知，用智能化的数据记录，守护孩子点滴进步'
})
</script>

<style scoped>
.school-panel {
  position: relative;
  height: 100%;
  padding: 60px 72px 60px 68px;
  box-sizing: border-box;
  overflow: hidden;
  color: var(--login-brand-panel-text, #4f3412);
  background: var(--login-brand-panel-bg,
    radial-gradient(circle at 18% 78%, rgba(255, 248, 214, 0.34), transparent 24%),
    radial-gradient(circle at 82% 18%, rgba(255, 219, 132, 0.28), transparent 18%),
    linear-gradient(160deg, #f2c94c 0%, #f5bf57 38%, #f2994a 100%)
  );
}

.school-panel__decor {
  position: absolute;
  pointer-events: none;
}

.school-panel__decor--halo {
  left: -22px;
  bottom: -28px;
  width: 236px;
  height: 236px;
  border-radius: 44% 56% 60% 40% / 42% 40% 60% 58%;
  background: rgba(255, 255, 255, 0.16);
  filter: blur(4px);
}

.school-panel__decor--stars {
  top: 78px;
  right: 40px;
  width: 180px;
  height: 180px;
  opacity: 0.7;
  background:
    radial-gradient(circle at 18px 22px, rgba(255, 252, 239, 0.92) 0 1.2px, transparent 1.3px),
    radial-gradient(circle at 88px 30px, rgba(255, 236, 179, 0.8) 0 1.6px, transparent 1.8px),
    radial-gradient(circle at 116px 38px, rgba(255, 186, 129, 0.82) 0 2px, transparent 2.2px),
    radial-gradient(circle at 138px 62px, rgba(255, 255, 255, 0.86) 0 1.2px, transparent 1.4px),
    radial-gradient(circle at 42px 96px, rgba(255, 249, 227, 0.68) 0 1.4px, transparent 1.6px),
    radial-gradient(circle at 18px 146px, rgba(255, 210, 149, 0.74) 0 2px, transparent 2.2px),
    radial-gradient(circle at 120px 116px, rgba(255, 242, 196, 0.8) 0 1.5px, transparent 1.7px),
    radial-gradient(circle at 82px 148px, rgba(255, 255, 255, 0.58) 0 1.2px, transparent 1.4px);
  filter: blur(0.2px);
}

.school-panel__decor--orbit {
  top: 126px;
  right: -34px;
  width: 240px;
  height: 168px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-left-color: transparent;
  border-bottom-color: rgba(255, 255, 255, 0.12);
  transform: rotate(-14deg);
}

.school-panel__decor--wave {
  right: -38px;
  bottom: 120px;
  width: 248px;
  height: 248px;
  border-radius: 42% 58% 56% 44% / 44% 44% 56% 56%;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-right-color: transparent;
  border-top-color: rgba(255, 245, 213, 0.14);
  transform: rotate(20deg);
}

.school-panel__header,
.school-panel__title-stage,
.school-panel__meta-stage {
  position: absolute;
  z-index: 1;
}

.school-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  top: 42px;
  left: 48px;
}

.school-panel__logo-wrap {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 88px;
  width: 88px;
}

.school-panel__logo {
  max-width: 88px;
  max-height: 88px;
  object-fit: contain;
  filter: drop-shadow(0 10px 18px rgba(123, 80, 19, 0.18));
}

.school-panel__logo-fallback {
  font-size: 52px;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1;
}

.school-panel__title-stage {
  display: flex;
  justify-content: center;
  top: 188px;
  left: 50%;
  width: calc(100% - 120px);
  transform: translateX(-50%);
}

.school-panel__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: min(100%, 280px);
  text-align: center;
}

.school-panel__title {
  margin: 0;
  max-width: min(100%, 420px);
  overflow: hidden;
  font-size: clamp(30px, 2.6vw, 42px);
  font-weight: 800;
  font-family: 'Microsoft YaHei UI', 'PingFang SC', 'Noto Sans SC', sans-serif;
  line-height: 1.25;
  letter-spacing: -0.02em;
  white-space: normal;
  word-break: break-word;
  text-align: center;
}

.school-panel__meta-stage {
  display: flex;
  justify-content: center;
  bottom: 92px;
  left: 50%;
  width: calc(100% - 136px);
  transform: translateX(-50%);
}

.school-panel__school {
  margin: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: var(--login-brand-badge-bg, rgba(255, 252, 239, 0.3));
  white-space: nowrap;
  color: var(--login-brand-badge-text, #6a4518);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.school-panel__tagline {
  margin: 2px 0 0;
  width: min(100%, 280px);
  color: var(--login-brand-tagline, rgba(255, 255, 255, 0.92));
  font-size: 14px;
  font-weight: 500;
  line-height: 1.72;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
  white-space: normal;
}

@media (max-width: 768px) {
  .school-panel {
    min-height: 260px;
    padding: 36px 28px;
  }

  .school-panel__decor--stars {
    top: 72px;
    right: 20px;
    width: 120px;
    height: 120px;
  }

  .school-panel__decor--orbit {
    top: 112px;
    right: -64px;
    width: 180px;
    height: 128px;
  }

  .school-panel__decor--wave {
    right: -56px;
    bottom: 84px;
    width: 170px;
    height: 170px;
  }

  .school-panel__header,
  .school-panel__title-stage,
  .school-panel__meta-stage {
    display: flex;
    justify-content: center;
  }

  .school-panel__header {
    top: 28px;
    left: 28px;
    justify-content: flex-start;
  }

  .school-panel__logo {
    max-width: 96px;
    max-height: 96px;
  }

  .school-panel__logo-wrap {
    height: 96px;
    width: 96px;
  }

  .school-panel__logo-fallback {
    font-size: 58px;
  }

  .school-panel__title-stage {
    top: 148px;
    width: calc(100% - 48px);
  }

  .school-panel__copy {
    gap: 12px;
    align-items: center;
    width: min(100%, 248px);
    text-align: center;
  }

  .school-panel__title {
    max-width: min(100%, 320px);
    font-size: 28px;
    line-height: 1.25;
  }

  .school-panel__meta-stage {
    bottom: 32px;
    width: calc(100% - 48px);
  }

  .school-panel__tagline {
    width: min(100%, 228px);
    text-align: center;
  }
}
</style>
