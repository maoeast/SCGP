<template>
  <section class="school-panel">
    <div class="school-panel__identity">
      <div class="school-panel__logo-shell">
        <img v-if="logoSrc" :src="logoSrc" alt="系统 Logo" class="school-panel__logo" />
        <span v-else class="school-panel__logo-fallback">{{ fallbackMark }}</span>
      </div>

      <div class="school-panel__heading">
        <span class="school-panel__eyebrow">SCGP 教育平台</span>
        <h1>{{ systemName }}</h1>
        <p v-if="schoolName" class="school-panel__school">{{ schoolName }}</p>
      </div>
    </div>

    <div class="school-panel__copy">
      <span class="school-panel__badge">本地部署 · 稳定运行</span>
      <h2>{{ brandTitle }}</h2>
      <p class="school-panel__subtitle">{{ brandSubtitle }}</p>
      <p class="school-panel__description">{{ brandDescription }}</p>
    </div>

    <div class="school-panel__grid" aria-label="系统能力概览">
      <article class="school-panel__feature">
        <i class="fas fa-clipboard-list school-panel__feature-icon" aria-hidden="true"></i>
        <div>
          <strong>能力评估</strong>
          <span>统一进入量表、评估记录与结果回顾。</span>
        </div>
      </article>
      <article class="school-panel__feature">
        <i class="fas fa-layer-group school-panel__feature-icon" aria-hidden="true"></i>
        <div>
          <strong>训练协同</strong>
          <span>衔接游戏训练、器材训练和训练计划执行。</span>
        </div>
      </article>
      <article class="school-panel__feature">
        <i class="fas fa-file-lines school-panel__feature-icon" aria-hidden="true"></i>
        <div>
          <strong>报告归档</strong>
          <span>保留学生发展记录，支持教师日常复盘与输出。</span>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  logoSrc: string
  systemName: string
  schoolName?: string
  brandTitle: string
  brandSubtitle: string
  brandDescription: string
}

const props = withDefaults(defineProps<Props>(), {
  schoolName: '',
})

const fallbackMark = computed(() => {
  return (props.systemName || 'SCGP').trim().slice(0, 1).toUpperCase()
})
</script>

<style scoped>
.school-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 28px;
  height: 100%;
  padding: clamp(28px, 3vw, 42px);
  color: #ffffff;
  background:
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 26%),
    linear-gradient(160deg, var(--login-brand-start, #1f4f9b) 0%, var(--login-brand-end, #17396f) 100%);
}

.school-panel::after {
  content: '';
  position: absolute;
  right: -80px;
  bottom: -80px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.school-panel__identity {
  display: flex;
  align-items: center;
  gap: 18px;
  position: relative;
  z-index: 1;
}

.school-panel__logo-shell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  flex-shrink: 0;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(6px);
}

.school-panel__logo {
  max-width: 64px;
  max-height: 64px;
  object-fit: contain;
}

.school-panel__logo-fallback {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.school-panel__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.school-panel__eyebrow {
  color: var(--login-brand-badge-text, #dceaff);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.school-panel__heading h1 {
  margin: 0;
  font-size: clamp(28px, 2.6vw, 36px);
  line-height: 1.2;
  letter-spacing: -0.03em;
}

.school-panel__school {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
}

.school-panel__copy {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 460px;
}

.school-panel__badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--login-brand-badge-bg, rgba(236, 244, 255, 0.14));
  color: var(--login-brand-badge-text, #dceaff);
  font-size: 12px;
  font-weight: 600;
}

.school-panel__copy h2 {
  margin: 0;
  font-size: clamp(24px, 2.2vw, 32px);
  line-height: 1.3;
  letter-spacing: -0.03em;
}

.school-panel__subtitle {
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 15px;
  line-height: 1.7;
}

.school-panel__description {
  margin: 0;
  color: rgba(255, 255, 255, 0.74);
  font-size: 14px;
  line-height: 1.8;
}

.school-panel__grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
}

.school-panel__feature {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
}

.school-panel__feature-icon {
  margin-top: 3px;
  color: #ffffff;
  font-size: 16px;
}

.school-panel__feature strong {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 700;
}

.school-panel__feature span {
  display: block;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .school-panel {
    gap: 20px;
    min-height: 0;
  }

  .school-panel__identity {
    align-items: flex-start;
  }

  .school-panel__logo-shell {
    width: 72px;
    height: 72px;
    border-radius: 20px;
  }
}
</style>
