<template>
  <div class="weefim-test">
    <h2>WeeFIM数据测试</h2>
    <button @click="loadData">加载数据</button>

    <div v-if="loaded">
      <h3>题目数量: {{ questions.length }}</h3>
      <h3>分类数量: {{ categories.length }}</h3>

      <h4>题目列表:</h4>
      <ul>
        <li v-for="q in questions" :key="q.id">
          {{ q.id }}. {{ q.title }} ({{ q.dimension }})
        </li>
      </ul>

      <h4>分类列表:</h4>
      <ul>
        <li v-for="c in categories" :key="c.id">
          {{ c.id }}. {{ c.name }}
        </li>
      </ul>
    </div>

    <div v-if="error" style="color: red;">
      错误: {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loaded = ref(false)
const error = ref('')
const questions = ref<any[]>([])
const categories = ref<any[]>([])

const loadData = async () => {
  try {
    const module = await import('@/database/weefim-data')
    questions.value = module.weefimQuestions
    categories.value = module.weefimCategories
    loaded.value = true
    console.log('数据加载成功:', {
      questions: questions.value.length,
      categories: categories.value.length
    })
  } catch (e) {
    error.value = String(e)
    console.error('加载失败:', e)
  }
}
</script>

<style scoped>
.weefim-test {
  padding: 20px;
}
</style>