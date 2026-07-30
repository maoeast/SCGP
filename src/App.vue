<script setup lang="ts">
import { RouterView } from 'vue-router'
import RecommendationDrawer from '@/features/recommendation/components/RecommendationDrawer.vue'
import AiAssistant from '@/features/ai/components/AiAssistant.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <RouterView />
  <RecommendationDrawer />
  <AiAssistant v-if="authStore.isLoggedIn" />
</template>

<style>
/* 全局样式已移至 main.css */
</style>
