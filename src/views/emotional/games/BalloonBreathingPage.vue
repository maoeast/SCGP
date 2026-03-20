<template>
  <GameContainer
    :student-id="studentId"
    :student-name="studentName"
    game-code="G01_BALLOON"
    game-title="深呼吸热气球"
    :initial-difficulty="initialDifficulty"
    :default-badge="{
      badgeCode: 'BADGE_CALM_WIND',
      badgeName: '平静微风徽章',
    }"
  >
    <template #default="{ difficulty, isPaused, completeGame, markRoundDirty, audio }">
      <BalloonBreathingGame
        :difficulty="difficulty"
        :paused="isPaused"
        :mark-round-dirty="markRoundDirty"
        :audio="audio"
        @complete="completeGame"
      />
    </template>
  </GameContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BalloonBreathingGame from '@/components/emotional/games/BalloonBreathingGame.vue'
import GameContainer from './GameContainer.vue'

const route = useRoute()

const studentId = computed(() => {
  const raw = Array.isArray(route.query.studentId) ? route.query.studentId[0] : route.query.studentId
  const resolved = Number(raw || 0)
  return Number.isFinite(resolved) ? resolved : 0
})

const studentName = computed(() => {
  const raw = Array.isArray(route.query.studentName) ? route.query.studentName[0] : route.query.studentName
  return raw || ''
})

const initialDifficulty = computed(() => {
  const raw = Array.isArray(route.query.difficulty) ? route.query.difficulty[0] : route.query.difficulty
  const parsed = Number(raw || 1)
  if (parsed === 2 || parsed === 3) return parsed
  return 1
})
</script>
