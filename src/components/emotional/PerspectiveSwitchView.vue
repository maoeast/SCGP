<template>
  <div class="perspective-root">
    <div class="perspective-track">
      <div class="perspective-user" :class="{ 'perspective-user--active': activeSide === 'sender' }">
        <div class="perspective-avatar">🙂</div>
        <div class="perspective-copy">
          <strong>我</strong>
          <span>说话的人</span>
        </div>
      </div>

      <div class="perspective-arrow">→</div>

      <div class="perspective-user" :class="{ 'perspective-user--active': activeSide === 'receiver' }">
        <div class="perspective-avatar">🧑</div>
        <div class="perspective-copy">
          <strong>对方</strong>
          <span>听的人</span>
        </div>
      </div>
    </div>

    <el-card class="perspective-panel" shadow="never">
      <p class="perspective-title">{{ title }}</p>
      <p class="perspective-text">{{ description }}</p>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  activeSide: 'sender' | 'receiver'
  title: string
  description: string
}>()
</script>

<style scoped>
.perspective-root {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.perspective-track {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

.perspective-user {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 20px;
  border: 2px solid #dcdfe6;
  background: #fff;
}

.perspective-user--active {
  border-color: #409eff;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.12);
}

.perspective-avatar {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #dbeafe 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.perspective-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.perspective-copy strong {
  color: #303133;
}

.perspective-copy span {
  color: #909399;
  font-size: 13px;
}

.perspective-arrow {
  text-align: center;
  font-size: 24px;
  color: #909399;
}

.perspective-panel {
  border-radius: 20px;
  background: #fafafa;
}

.perspective-title {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.perspective-text {
  margin: 0;
  line-height: 1.8;
  color: #606266;
}
</style>
