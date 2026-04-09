<template>
  <Transition name="teacher-panel">
    <aside v-if="visible" class="teacher-panel" role="dialog" aria-label="教师控制面板">
      <div class="teacher-panel-head">
        <div>
          <span class="teacher-panel-kicker">Teacher Override</span>
          <strong class="teacher-panel-title">教师后门控制台</strong>
        </div>
        <button type="button" class="teacher-panel-close" aria-label="关闭教师控制台" @click="$emit('close')">
          ×
        </button>
      </div>

      <p class="teacher-panel-copy">
        当前仅用于现场干预。快捷键：<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>S</kbd>
      </p>

      <div class="teacher-panel-actions">
        <button type="button" class="teacher-action" @click="store.forceNext()">跳过本题</button>
        <button type="button" class="teacher-action" @click="store.forceReset()">重置本题</button>
        <button type="button" class="teacher-action is-danger" @click="store.forceEnd()">强制结算</button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { useTrainingStore } from '@/stores/useTrainingStore'

defineProps<{
  visible: boolean
}>()

defineEmits<{
  close: []
}>()

const store = useTrainingStore()
</script>

<style scoped>
.teacher-panel {
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 26;
  width: min(100vw - 24px, 360px);
  padding: 16px 16px 14px;
  border-radius: 22px;
  color: #fff;
  background: rgb(15 23 42 / 0.72);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.14),
    0 18px 36px rgb(15 23 42 / 0.26);
  backdrop-filter: blur(14px);
}

.teacher-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.teacher-panel-kicker {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 0.56);
}

.teacher-panel-title {
  display: block;
  margin-top: 4px;
  font-size: 18px;
  line-height: 1.3;
}

.teacher-panel-close {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 12px;
  font-size: 22px;
  line-height: 1;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 0.08);
}

.teacher-panel-copy {
  margin: 12px 0 14px;
  font-size: 13px;
  line-height: 1.7;
  color: rgb(255 255 255 / 0.72);
}

kbd {
  padding: 2px 6px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  color: #0f172a;
  background: #f8fafc;
}

.teacher-panel-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.teacher-action {
  min-height: 44px;
  border: 0;
  border-radius: 14px;
  padding: 10px 8px;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  cursor: pointer;
  background: rgb(255 255 255 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.teacher-action.is-danger {
  background: linear-gradient(135deg, rgb(220 38 38 / 0.72) 0%, rgb(185 28 28 / 0.9) 100%);
  box-shadow: none;
}

.teacher-panel-enter-active,
.teacher-panel-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.teacher-panel-enter-from,
.teacher-panel-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

@media (max-width: 768px) {
  .teacher-panel {
    right: 12px;
    bottom: 12px;
    left: 12px;
    width: auto;
  }

  .teacher-panel-actions {
    grid-template-columns: 1fr;
  }
}
</style>
