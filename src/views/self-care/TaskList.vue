<template>
  <div class="page-container scgp-admin-page">
    <div class="page-header">
      <div class="header-left">
        <h1>自理训练</h1>
        <p class="subtitle">阶段 1 已接入 self-care 路由壳，后续任务列表、选学生与执行链路将在这里继续补齐。</p>
      </div>
    </div>

    <section class="main-content scgp-page-panel self-care-task-list">
      <div class="self-care-task-list__placeholder">
        <span class="self-care-task-list__badge">阶段 1 路由壳</span>
        <h2>自理任务列表占位页</h2>
        <p>当前页面用于承接 `/self-care/tasks` 入口，并继续挂接 `life_skills` 授权。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
// 阶段 1：最小可见路由壳，占位承接自理训练任务入口。
</script>

<style scoped>
.self-care-task-list {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
}

.self-care-task-list__placeholder {
  max-width: 560px;
  text-align: center;
}

.self-care-task-list__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 30px;
  padding: 0 14px;
  border: 1px solid #f3d19e;
  border-radius: 999px;
  background: #fdf6ec;
  color: #b88230;
  font-size: 12px;
  font-weight: 600;
}

.self-care-task-list__placeholder h2 {
  margin: 16px 0 10px;
  color: #303133;
  font-size: 24px;
  font-weight: 700;
}

.self-care-task-list__placeholder p {
  margin: 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.7;
}
</style>
