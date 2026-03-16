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
        <p class="subtitle">Phase 1 页面壳，当前仅接入模块入口与页面导航，不包含训练业务逻辑。</p>
      </div>
      <div class="header-right">
        <el-tag type="warning" effect="light">Phase 1 Shell</el-tag>
      </div>
    </div>

    <div class="main-content">
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        title="当前仅为模块外壳"
        description="本阶段只完成静态页面、路由和学生上下文透传，资源加载、训练流程、记录写入与报告生成将在后续阶段接入。"
      />

      <div class="content-grid">
        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>当前上下文</span>
          </template>

          <el-descriptions :column="1" border>
            <el-descriptions-item label="模块">情绪行为调节</el-descriptions-item>
            <el-descriptions-item label="阶段">Phase 1 空壳接入</el-descriptions-item>
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
            <span>页面入口</span>
          </template>

          <div class="action-list">
            <el-button type="primary" @click="goTo('/emotional/emotion-scene')">
              情绪与场景训练
            </el-button>
            <el-button type="primary" plain @click="goTo('/emotional/care-expression')">
              表达关心训练
            </el-button>
            <el-button plain @click="goTo('/emotional/session-summary')">
              会话总结
            </el-button>
            <el-button plain @click="goTo('/emotional/records')">
              训练记录
            </el-button>
            <el-button plain @click="goTo('/emotional/report')">
              模块报告
            </el-button>
          </div>
        </el-card>

        <el-card class="shell-card" shadow="never">
          <template #header>
            <span>后续实现范围</span>
          </template>

          <ul class="placeholder-list">
            <li>接入情绪与场景训练资源及步骤引导。</li>
            <li>接入表达关心训练的题目与反馈结构。</li>
            <li>接入训练记录落库、会话总结和报告视图。</li>
            <li>接入资源、记录和报告之间的真实数据链路。</li>
          </ul>
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
