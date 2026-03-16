<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item>情绪行为调节</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>情绪行为调节</h1>
        <p class="subtitle">把“先评估、后训练”串成一条完整闭环，帮助教师围绕同一位学生连续开展支持。</p>
      </div>
      <div class="header-right">
        <el-tag type="success" effect="light">MVP</el-tag>
      </div>
    </div>

    <div class="main-content">
      <el-card class="context-card" shadow="never">
        <template #header>
          <span>当前上下文</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="学生">
            {{ studentName || '尚未选择学生' }}
          </el-descriptions-item>
          <el-descriptions-item label="学生 ID">
            {{ studentId || '未传入' }}
          </el-descriptions-item>
          <el-descriptions-item label="模块状态">
            已接入评估、训练、记录与报告闭环
          </el-descriptions-item>
          <el-descriptions-item label="建议路径">
            先完成评估，再进入情绪训练
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <div class="menu-grid">
        <el-card class="menu-card">
          <template #header>
            <span>评估快捷入口</span>
          </template>
          <p class="card-copy">不重新开发量表，直接跳转到系统现有统一评估容器。</p>
          <div class="card-actions">
            <el-button type="primary" :disabled="!studentId" @click="goToAssessment('sdq')">
              SDQ 评估
            </el-button>
            <el-button type="primary" plain :disabled="!studentId" @click="goToAssessment('cbcl')">
              CBCL 评估
            </el-button>
          </div>
          <p class="card-hint" v-if="!studentId">请先从游戏训练入口选择学生，再使用快捷评估。</p>
        </el-card>

        <el-card class="menu-card">
          <template #header>
            <span>训练入口</span>
          </template>
          <p class="card-copy">围绕同一位学生开始情绪场景训练或表达关心训练。</p>
          <div class="card-actions">
            <el-button type="success" :disabled="!studentId" @click="goTo('/emotional/emotion-scene')">
              情绪与场景训练
            </el-button>
            <el-button type="success" plain :disabled="!studentId" @click="goTo('/emotional/care-expression')">
              表达关心训练
            </el-button>
          </div>
        </el-card>

        <el-card class="menu-card">
          <template #header>
            <span>训练结果</span>
          </template>
          <p class="card-copy">进入情绪模块记录和专属可视化报告，查看趋势与干预建议。</p>
          <div class="card-actions">
            <el-button plain @click="goTo('/emotional/records')">
              训练记录
            </el-button>
            <el-button plain @click="goTo('/emotional/report')">
              模块报告
            </el-button>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const inheritedQuery = computed(() => ({ ...route.query }))

const studentId = computed(() => {
  const value = route.query.studentId
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ? Number(resolved) : 0
})

const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

function goTo(path: string) {
  router.push({
    path,
    query: inheritedQuery.value,
  })
}

function goToAssessment(scaleCode: 'sdq' | 'cbcl') {
  if (!studentId.value) return
  router.push(`/assessment/unified/${scaleCode}/${studentId.value}`)
}
</script>

<style scoped>
.breadcrumb-wrapper {
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;
}

.main-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.context-card,
.menu-card {
  border-radius: 20px;
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.card-copy {
  margin: 0 0 16px;
  line-height: 1.8;
  color: #606266;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.card-hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: #909399;
}
</style>
