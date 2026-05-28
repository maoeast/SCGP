<template>
  <GameContainer
    :launch-context="launchContext"
    :game-code="gameDefinition.gameCode"
    :game-title="gameDefinition.name"
    :default-badge="{ badgeCode: gameDefinition.badge.badgeCode, badgeName: gameDefinition.badge.badgeName }"
  >
    <template #default="{ difficulty, settings, isPaused, completeGroupGame, markRoundDirty, audio, launchContext: slotLaunchContext, permissionStreams }">
      <ExpressionDuelGame
        :difficulty="difficulty"
        :settings="settings"
        :paused="isPaused"
        :launch-context="slotLaunchContext"
        :mark-round-dirty="markRoundDirty"
        :audio="audio"
        :camera-stream="permissionStreams.camera"
        @complete="completeGroupGame"
      />
    </template>
  </GameContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ExpressionDuelGame from '@/components/emotional/games/ExpressionDuelGame.vue'
import { getRequiredCustomGameDefinition } from '@/data/custom-game-registry'
import { buildCustomGameLaunchContext } from '@/utils/custom-game-launch'
import GameContainer from './GameContainer.vue'

const route = useRoute()
const gameDefinition = getRequiredCustomGameDefinition('S06_EXPRESSION_DUEL')
const launchContext = computed(() => buildCustomGameLaunchContext(route.query, gameDefinition))
</script>
