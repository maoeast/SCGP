<template>
  <el-dialog
    :model-value="visible"
    :title="welcomeContent?.title || '评估说明'"
    width="580px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    :show-close="false"
    class="welcome-dialog"
    draggable
  >
    <div class="welcome-content">
      <p class="welcome-intro" v-if="welcomeContent?.intro">
        {{ welcomeContent.intro }}
      </p>

      <div class="welcome-sections" v-if="welcomeContent?.sections?.length">
        <div
          v-for="(section, index) in welcomeContent.sections"
          :key="index"
          class="welcome-section"
        >
          <h4>
            <span class="section-icon">{{ section.icon }}</span>
            {{ section.title }}
          </h4>
          <p>{{ section.content }}</p>
        </div>
      </div>

      <!-- 默认说明（如果驱动器没有提供自定义内容） -->
      <div class="welcome-sections" v-else>
        <div class="welcome-section">
          <h4><span class="section-icon">📋</span> 评估说明</h4>
          <p>本评估将帮助了解学生的能力发展水平，请根据实际情况如实作答。</p>
        </div>
        <div class="welcome-section">
          <h4><span class="section-icon">⏱️</span> 评估时间</h4>
          <p>预计需要 {{ estimatedTime }} 分钟，请在安静、无干扰的环境下进行评估。</p>
        </div>
        <div class="welcome-section">
          <h4><span class="section-icon">💡</span> 温馨提示</h4>
          <p>请根据孩子的实际情况真实填写，不要过分担忧或刻意美化。</p>
        </div>
      </div>

      <p class="welcome-footer" v-if="welcomeContent?.footer">
        {{ welcomeContent.footer }}
      </p>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button type="primary" size="large" @click="handleStart">
          我已了解，开始评估
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScaleDriver } from '@/types/assessment'

interface Props {
  visible: boolean
  driver: ScaleDriver | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'start'): void
}>()

const welcomeContent = computed(() => {
  if (props.driver?.getWelcomeContent) {
    return props.driver.getWelcomeContent()
  }
  return null
})

const estimatedTime = computed(() => {
  return props.driver?.getScaleInfo()?.estimatedTime || 15
})

function handleStart() {
  emit('start')
}
</script>

<style scoped>
.welcome-content {
  padding: 10px 0;
}

.welcome-intro {
  font-size: 15px;
  line-height: 1.8;
  color: #606266;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px dashed #e4e7ed;
}

.welcome-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.welcome-section {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
}

.welcome-section h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 18px;
}

.welcome-section p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
}

.welcome-footer {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px dashed #e4e7ed;
  font-size: 14px;
  color: #909399;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: center;
}
</style>
