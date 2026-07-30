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
      <div v-if="student" class="welcome-student">
        <span class="welcome-student__label">评估对象</span>
        <strong>{{ student.name }}</strong>
        <span>{{ student.gender }} · {{ studentAgeLabel }}</span>
      </div>

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
          <p v-if="section.content" class="section-content">{{ section.content }}</p>
          <ul v-if="section.items?.length" class="section-list">
            <li v-for="(item, itemIndex) in section.items" :key="itemIndex">
              {{ item }}
            </li>
          </ul>
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

      <div class="welcome-reminder" v-if="welcomeContent?.reminder">
        <h4>
          <span class="section-icon">{{ welcomeContent.reminder.icon || '⚠️' }}</span>
          {{ welcomeContent.reminder.title || '特别提醒' }}
        </h4>
        <p>{{ welcomeContent.reminder.content }}</p>
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
import type { ScaleDriver, StudentContext } from '@/types/assessment'

interface Props {
  visible: boolean
  driver: ScaleDriver | null
  student: StudentContext | null
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

const studentAgeLabel = computed(() => {
  if (!props.student) return ''
  const years = Math.floor(props.student.ageInMonths / 12)
  const months = props.student.ageInMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
})

function handleStart() {
  emit('start')
}
</script>

<style scoped>
.welcome-content {
  max-height: calc(100vh - 300px);
  overflow-y: auto;
  padding: 10px 0;
}

.welcome-student {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 12px;
  border-radius: 6px;
  background: #eef6ff;
  color: #4e5969;
  font-size: 14px;
}

.welcome-student__label {
  color: #6b7788;
}

.welcome-student strong {
  color: #1d4ed8;
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

.welcome-section p,
.section-content {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
}

.section-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-content + .section-list {
  margin-top: 10px;
}

.section-list li {
  font-size: 14px;
  line-height: 1.7;
  color: #606266;
}

.welcome-reminder {
  margin-top: 18px;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #f5d4a7;
  background: #fff8ec;
}

.welcome-reminder h4 {
  margin: 0 0 8px 0;
  font-size: 15px;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.welcome-reminder p {
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
