<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/emotional' }">情绪行为</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">选择训练</el-breadcrumb-item>
        <el-breadcrumb-item>会话总结</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="summary-wrap">
      <el-card class="summary-card" shadow="never">
        <div class="celebration-stage">
          <div class="celebration-burst">
            <span class="burst burst--left">✨</span>
            <span class="burst burst--right">✨</span>
            <div class="hero-emoji">🎉</div>
          </div>

          <div class="headline">
            <h1>太棒了！训练完成！</h1>
            <p>{{ encouragementText }}</p>
          </div>

          <div class="stars-panel" aria-label="星级评价">
            <span
              v-for="index in 3"
              :key="index"
              class="star"
              :class="{ 'star--active': index <= starCount }"
            >
              ⭐
            </span>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <span class="metric-label">本次星级</span>
              <strong class="metric-value">{{ starCount }} 星</strong>
            </div>
            <div class="metric-card">
              <span class="metric-label">学习场景</span>
              <strong class="metric-value">{{ sceneCount }} 个</strong>
            </div>
          </div>

          <div class="action-row">
            <el-button type="primary" size="large" class="action-btn" @click="goToMenu">
              返回情绪模块首页
            </el-button>
            <el-button type="success" size="large" plain class="action-btn" @click="goToReport">
              查看我的进步报告
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EmotionalTrainingAPI } from '@/database/emotional-api'

const route = useRoute()
const router = useRouter()
const api = new EmotionalTrainingAPI()

const inheritedQuery = computed(() => ({ ...route.query }))
const studentId = computed(() => Number(Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId || 0))
const trainingRecordId = computed(() => Number(Array.isArray(route.query.trainingRecordId) ? route.query.trainingRecordId[0] : route.query.trainingRecordId || 0))

const accuracyRate = ref(1)
const sceneCount = ref(1)
const questionCount = ref(0)

const starCount = computed(() => {
  if (accuracyRate.value >= 0.9) return 3
  if (accuracyRate.value >= 0.6) return 2
  return 1
})

const encouragementText = computed(() => {
  if (starCount.value === 3) {
    return '你已经很会观察别人的心情，也学会了更温柔的回应方式。'
  }
  if (starCount.value === 2) {
    return '你已经完成了今天的练习，继续这样慢慢练，就会越来越棒。'
  }
  return '你认真完成了今天的练习，每一次尝试都在帮助你进步。'
})

function loadSessionSummary() {
  if (!trainingRecordId.value) return

  const session = api.getSessionByTrainingRecordId(trainingRecordId.value)
  if (!session) return

  accuracyRate.value = Number(session.accuracy_rate || 0)
  questionCount.value = Number(session.question_count || 0)
  sceneCount.value = 1
}

function goToMenu() {
  router.push({
    path: '/emotional/menu',
    query: inheritedQuery.value,
  })
}

function goToReport() {
  router.push({
    path: '/emotional/report',
    query: {
      ...inheritedQuery.value,
      studentId: String(studentId.value || ''),
    },
  })
}

onMounted(() => {
  loadSessionSummary()
})
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.summary-wrap {
  padding: 28px;
}

.summary-card {
  border-radius: 30px;
  min-height: calc(100vh - 180px);
  border: 1px solid #f3f4f6;
}

.celebration-stage {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  text-align: center;
  padding: 24px 12px;
}

.celebration-burst {
  position: relative;
  width: 180px;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-emoji {
  font-size: 92px;
  animation: hero-bounce 1.8s ease-in-out infinite;
}

.burst {
  position: absolute;
  top: 50%;
  font-size: 30px;
  transform: translateY(-50%);
  animation: burst-float 1.8s ease-in-out infinite;
}

.burst--left {
  left: 8px;
}

.burst--right {
  right: 8px;
  animation-delay: 0.3s;
}

.headline h1 {
  margin: 0;
  font-size: 40px;
  color: #303133;
}

.headline p {
  margin: 12px 0 0;
  max-width: 560px;
  font-size: 17px;
  line-height: 1.8;
  color: #606266;
}

.stars-panel {
  display: flex;
  gap: 16px;
}

.star {
  font-size: 42px;
  opacity: 0.28;
  transform: scale(0.9);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.star--active {
  opacity: 1;
  transform: scale(1);
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 18px;
}

.metric-card {
  padding: 20px 24px;
  border-radius: 22px;
  background: linear-gradient(135deg, #fff7ed 0%, #eef7ff 100%);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.08);
}

.metric-label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  color: #909399;
}

.metric-value {
  font-size: 32px;
  color: #303133;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
}

.action-btn {
  min-width: 220px;
  min-height: 54px;
  border-radius: 18px;
  font-size: 17px;
}

@keyframes hero-bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes burst-float {
  0%, 100% {
    transform: translateY(-50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translateY(-60%) scale(1.12);
    opacity: 1;
  }
}

@media (max-width: 720px) {
  .headline h1 {
    font-size: 30px;
  }

  .metrics-grid {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .action-row {
    width: 100%;
  }

  .action-btn {
    width: 100%;
  }
}
</style>
