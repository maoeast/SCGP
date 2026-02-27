<template>
  <div class="not-found-page">
    <div class="content">
      <i class="fas fa-triangle-exclamation"></i>
      <h1>404</h1>
      <h2>页面未找到</h2>
      <p>您访问的页面不存在</p>
      <router-link to="/dashboard" class="btn">返回首页</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
// 404页面
</script>

<style scoped>
.not-found-page {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  text-align: center;
}

.content i {
  font-size: 64px;
  color: #ffd700;
  margin-bottom: 20px;
}

.content h1 {
  font-size: 72px;
  margin: 0;
  color: #333;
}

.content h2 {
  font-size: 24px;
  margin: 10px 0;
  color: #666;
}

.content p {
  color: #999;
  margin-bottom: 30px;
}

.btn {
  display: inline-block;
  padding: 12px 30px;
  background: #667eea;
  color: white;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 500;
  transition: background 0.3s;
}

.btn:hover {
  background: #5a67d8;
}
</style>