<template>
  <GameContainer
    :launch-context="launchContext"
    :game-code="gameDefinition.gameCode"
    :game-title="gameDefinition.name"
    :default-badge="{ badgeCode: gameDefinition.badge.badgeCode, badgeName: gameDefinition.badge.badgeName }"
  >
    <template #default="{ difficulty, isPaused, completeGame, markRoundDirty, audio, permissionStreams }">
      <ExpressionDetectiveGame
        :difficulty="difficulty"
        :paused="isPaused"
        :mark-round-dirty="markRoundDirty"
        :audio="audio"
        :camera-stream="permissionStreams.camera"
        @complete="completeGame"
      />
    </template>
  </GameContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ExpressionDetectiveGame from '@/components/emotional/games/ExpressionDetectiveGame.vue'
import { getRequiredCustomGameDefinition } from '@/data/custom-game-registry'
import { buildCustomGameLaunchContext } from '@/utils/custom-game-launch'
import GameContainer from './GameContainer.vue'

const route = useRoute()
const gameDefinition = getRequiredCustomGameDefinition('G09_EXPRESSION_DETECTIVE')
const launchContext = computed(() => buildCustomGameLaunchContext(route.query, gameDefinition))
</script>
