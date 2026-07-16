<script setup lang="ts">
import { RouterView } from 'vue-router'
import RecommendationDrawer from '@/features/recommendation/components/RecommendationDrawer.vue'
import AiAssistant from '@/features/ai/components/AiAssistant.vue'
</script>

<template>
  <RouterView />
  <RecommendationDrawer />
  <AiAssistant />
</template>

<style>
/* 全局样式已移至 main.css */
</style>
