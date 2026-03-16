<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">情绪行为调节</el-breadcrumb-item>
        <el-breadcrumb-item>表达关心训练</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>表达关心训练</h1>
        <p class="subtitle">Phase 1 页面壳，后续将在这里接入关心表达场景、选项和反馈展示。</p>
      </div>
      <div class="header-right">
        <el-button @click="goTo('/emotional/menu')">返回模块入口</el-button>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="当前仅为结构占位"
        description="本页只保留训练页面外壳，不含题目加载、互动流程、评分或话术反馈。"
      />

      <div class="content-grid">
        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>当前上下文</span>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="页面">表达关心训练</el-descriptions-item>
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
            <span>预留能力点</span>
          </template>

          <ul class="placeholder-list">
            <li>关心场景的资源展示与分类。</li>
            <li>表达方式选择与效果说明。</li>
            <li>发送者与接收者视角切换。</li>
            <li>训练结束后的会话总结入口。</li>
          </ul>
        </el-card>

        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>壳页面导航</span>
          </template>

          <div class="action-list">
            <el-button type="primary" @click="goTo('/emotional/session-summary')">
              前往会话总结
            </el-button>
            <el-button plain @click="goTo('/emotional/report')">
              查看报告壳页
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
