<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">情绪行为调节</el-breadcrumb-item>
        <el-breadcrumb-item>模块报告</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>模块报告</h1>
        <p class="subtitle">Phase 1 页面壳，后续将在这里接入情绪模块的趋势图表与干预建议。</p>
      </div>
      <div class="header-right">
        <el-button @click="goTo('/emotional/menu')">返回模块入口</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="报告页尚未接入计算与图表"
        description="本页当前不展示真实报告，只保留后续图表、汇总和建议区域的壳结构。"
      />

      <div class="content-grid">
        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>当前上下文</span>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="页面">模块报告</el-descriptions-item>
            <el-descriptions-item label="学生">
              {{ studentName || '未传入学生姓名' }}
            </el-descriptions-item>
            <el-descriptions-item label="学生 ID">
              {{ studentId || '未传入学生 ID' }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>预留输出</span>
          </template>

          <ul class="placeholder-list">
            <li>训练表现趋势图与分布视图。</li>
            <li>情绪类型与表达方式偏好分析。</li>
            <li>教师与家长可读的简要干预建议。</li>
            <li>与训练记录、会话总结联动的跳转入口。</li>
          </ul>
        </el-card>

        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>壳页面导航</span>
          </template>

          <div class="action-list">
            <el-button type="primary" @click="goTo('/emotional/records')">
              查看训练记录
            </el-button>
            <el-button plain @click="goTo('/emotional/menu')">
              返回模块入口
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
  return Array.isArray(value) ? value[0] : value || ''
})

const studentName = computed(() => {
  const value = route.query.studentName
  return Array.isArray(value) ? value[0] : value || ''
})

const goTo = (path: string) => {
  router.push({
    path,
    query: inheritedQuery.value
  })
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
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 16px;
}

.shell-card {
  min-height: 100%;
}

.action-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.placeholder-list {
  margin: 0;
  padding-left: 18px;
  color: #606266;
  line-height: 1.8;
}
</style>
