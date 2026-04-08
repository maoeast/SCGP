<template>
  <div
    v-if="store.isExitModalVisible"
    class="exit-overlay"
    @click.self="store.toggleExitModal(false)"
  >
    <div class="exit-card">
      <div class="exit-icon">!</div>
      <h2 class="exit-title">训练还在进行中，确定要退出吗？</h2>
      <p class="exit-description">
        当前进度尚未完成，现在退出会回到训练外层页面。你也可以继续留在这里，完成本轮观察与答题。
      </p>

      <div class="exit-actions">
        <button
          type="button"
          class="exit-button exit-button-secondary"
          @click="store.toggleExitModal(false)"
        >
          继续训练
        </button>
        <button
          type="button"
          class="exit-button exit-button-danger"
          @click="store.exitTraining()"
        >
          确认退出
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTrainingStore } from '@/stores/useTrainingStore'

const store = useTrainingStore()
</script>

<style scoped>
.exit-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(0 0 0 / 60%);
  backdrop-filter: blur(6px);
}

.exit-card {
  width: min(100%, 460px);
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 98%) 0%, rgb(246 249 255 / 98%) 100%);
  box-shadow:
    0 28px 80px rgb(15 23 42 / 30%),
    inset 0 1px 0 rgb(255 255 255 / 80%);
  padding: 32px;
  text-align: center;
}

.exit-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: 26px;
  font-weight: 800;
  color: #7c2d12;
  background: linear-gradient(135deg, #fde68a 0%, #fb923c 100%);
  box-shadow: 0 16px 36px rgb(251 146 60 / 32%);
}

.exit-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.4;
  color: #0f172a;
}

.exit-description {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #475569;
}

.exit-actions {
  margin-top: 28px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.exit-button {
  border: 0;
  border-radius: 18px;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.exit-button:hover {
  transform: translateY(-1px);
}

.exit-button:active {
  transform: scale(0.98);
}

.exit-button-secondary {
  color: #1e3a8a;
  background: #dbeafe;
  box-shadow: inset 0 0 0 1px rgb(96 165 250 / 30%);
}

.exit-button-danger {
  color: #fff;
  background: linear-gradient(135deg, #f97316 0%, #ef4444 100%);
  box-shadow: 0 14px 26px rgb(239 68 68 / 26%);
}

@media (max-width: 640px) {
  .exit-card {
    padding: 24px;
    border-radius: 24px;
  }

  .exit-title {
    font-size: 21px;
  }

  .exit-actions {
    grid-template-columns: 1fr;
  }
}
</style>
