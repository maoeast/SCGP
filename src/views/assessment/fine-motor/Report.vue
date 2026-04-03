<template>
  <div class="fine-motor-report">
    <el-card class="report-shell" shadow="never">
      <template #header>
        <div class="report-header">
          <div>
            <h1>小肌肉功能发展评估报告</h1>
            <p>fine_motor 报告入口已接通，正式报告结构将在导入真实题库和评分算法后补齐。</p>
          </div>
        </div>
      </template>

      <el-alert
        type="warning"
        show-icon
        :closable="false"
        title="当前为占位报告页"
        description="本页仅用于打通统一评估与报告路由链路，不代表 FMDA 报告已完成。"
      />

      <div class="report-meta">
        <div class="meta-item">
          <span class="meta-label">评估记录 ID</span>
          <strong>{{ assessIdText }}</strong>
        </div>
        <div class="meta-item">
          <span class="meta-label">学生 ID</span>
          <strong>{{ studentIdText }}</strong>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const assessIdText = computed(() => String(route.params.assessId || route.query.assessId || '-'))
const studentIdText = computed(() => String(route.params.studentId || route.query.studentId || '-'))
</script>

<style scoped>
.fine-motor-report {
  padding: 24px;
}

.report-shell {
  border-radius: 20px;
}

.report-header h1 {
  margin: 0;
  font-size: 28px;
  color: #303133;
}

.report-header p {
  margin: 10px 0 0;
  color: #606266;
  line-height: 1.7;
}

.report-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.meta-item {
  padding: 16px;
  border-radius: 16px;
  background: #f8fafc;
  border: 1px solid #e5edf7;
}

.meta-label {
  display: block;
  margin-bottom: 8px;
  color: #909399;
  font-size: 13px;
}
</style>
