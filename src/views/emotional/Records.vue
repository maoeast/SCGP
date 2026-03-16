<template>
  <div class="page-container">
    <div class="breadcrumb-wrapper">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/games/menu' }">游戏训练</el-breadcrumb-item>
        <el-breadcrumb-item :to="{ path: '/emotional/menu', query: inheritedQuery }">情绪行为调节</el-breadcrumb-item>
        <el-breadcrumb-item>训练记录</el-breadcrumb-item>
      </el-breadcrumb>
    </div>

    <div class="page-header">
      <div class="header-left">
        <h1>训练记录</h1>
        <p class="subtitle">Phase 1 页面壳，后续将在这里接入情绪模块的记录查询与详情浏览。</p>
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
        title="记录能力尚未实现"
        description="当前页面不读取数据库，也不展示训练历史；这里只确认模块记录页入口和路由已打通。"
      />

      <div class="content-grid">
        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>当前上下文</span>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="页面">训练记录</el-descriptions-item>
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
            <span>预留功能</span>
          </template>

          <ul class="placeholder-list">
            <li>按学生、时间和训练类型筛选。</li>
            <li>查看情绪与场景训练记录详情。</li>
            <li>查看表达关心训练记录详情。</li>
            <li>衔接会话总结与报告页。</li>
          </ul>
        </el-card>

        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>壳页面导航</span>
          </template>

          <div class="action-list">
            <el-button type="primary" @click="goTo('/emotional/report')">
              前往模块报告
            </el-button>
            <el-button plain @click="goTo('/emotional/session-summary')">
              返回会话总结
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
