<template>
  <section class="sensory-shell">
    <div class="sensory-shell__backdrop" aria-hidden="true">
      <div class="sensory-shell__orb sensory-shell__orb--amber"></div>
      <div class="sensory-shell__orb sensory-shell__orb--sky"></div>
      <div class="sensory-shell__grid"></div>
    </div>

    <header class="sensory-shell__toolbar">
      <button class="sensory-shell__back-button" type="button" @click="emit('back')">
        返回准备页
      </button>

      <div class="sensory-shell__title-group">
        <span class="sensory-shell__eyebrow">{{ entryLabel }}</span>
        <h1>{{ title }}</h1>
        <p>{{ summary }}</p>
      </div>

      <div class="sensory-shell__meta">
        <div class="sensory-shell__meta-card">
          <span>学生</span>
          <strong>{{ studentName || '未命名学生' }}</strong>
        </div>

        <div class="sensory-shell__meta-card">
          <span>模式</span>
          <strong>{{ modeLabel }}</strong>
        </div>

        <div v-if="durationLabel" class="sensory-shell__meta-card">
          <span>建议时长</span>
          <strong>{{ durationLabel }}</strong>
        </div>
      </div>
    </header>

    <main class="sensory-shell__stage">
      <slot />
    </main>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  summary?: string
  studentName?: string
  entryLabel?: string
  modeLabel: string
  durationLabel?: string
}>(), {
  summary: '请使用手指直接操作训练内容，系统会自动记录本次训练结果。',
  studentName: '',
  entryLabel: '感官统合训练',
  durationLabel: '',
})

const emit = defineEmits<{
  back: []
}>()

void props
</script>

<style scoped>
.sensory-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  padding: 24px;
  overflow: hidden;
  color: #0f172a;
  background:
    radial-gradient(circle at top left, rgba(255, 211, 135, 0.42), transparent 32%),
    radial-gradient(circle at bottom right, rgba(56, 189, 248, 0.24), transparent 30%),
    linear-gradient(180deg, #f8fbff 0%, #eef6ff 48%, #f5fbf6 100%);
}

.sensory-shell__backdrop {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sensory-shell__orb {
  position: absolute;
  width: 380px;
  height: 380px;
  border-radius: 999px;
  filter: blur(32px);
  opacity: 0.42;
}

.sensory-shell__orb--amber {
  top: -120px;
  left: -80px;
  background: rgba(251, 191, 36, 0.8);
}

.sensory-shell__orb--sky {
  right: -100px;
  bottom: -120px;
  background: rgba(56, 189, 248, 0.72);
}

.sensory-shell__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.6), transparent 88%);
}

.sensory-shell__toolbar {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 18px;
  align-items: stretch;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
  backdrop-filter: blur(18px);
}

.sensory-shell__back-button {
  align-self: start;
  min-height: 58px;
  padding: 0 24px;
  border: 0;
  border-radius: 999px;
  font: inherit;
  font-weight: 700;
  color: #0f172a;
  background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
  box-shadow: 0 16px 34px rgba(245, 158, 11, 0.24);
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.sensory-shell__back-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 40px rgba(245, 158, 11, 0.3);
}

.sensory-shell__title-group {
  min-width: 0;
}

.sensory-shell__eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1d4ed8;
  background: rgba(191, 219, 254, 0.78);
}

.sensory-shell__title-group h1 {
  margin: 10px 0 8px;
  font-size: clamp(2rem, 2.6vw, 2.85rem);
  line-height: 1.04;
}

.sensory-shell__title-group p {
  max-width: 760px;
  margin: 0;
  color: #475569;
  line-height: 1.7;
}

.sensory-shell__meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(150px, 1fr));
  gap: 12px;
}

.sensory-shell__meta-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-height: 92px;
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(241, 245, 249, 0.96));
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.sensory-shell__meta-card span {
  color: #64748b;
  font-size: 0.84rem;
}

.sensory-shell__meta-card strong {
  font-size: 1.06rem;
  line-height: 1.4;
}

.sensory-shell__stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex: 1;
  min-height: 0;
  margin-top: 18px;
  padding: 20px;
  overflow: auto;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.7)),
    linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(219, 234, 254, 0.4));
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(16px);
}

@media (max-width: 1280px) {
  .sensory-shell__toolbar {
    grid-template-columns: 1fr;
  }

  .sensory-shell__meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .sensory-shell {
    padding: 16px;
  }

  .sensory-shell__toolbar {
    padding: 16px;
    border-radius: 24px;
  }

  .sensory-shell__meta {
    grid-template-columns: 1fr;
  }

  .sensory-shell__stage {
    padding: 16px;
    border-radius: 24px;
  }
}
</style>
