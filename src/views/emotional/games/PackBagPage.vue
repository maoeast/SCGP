<template>
  <GameContainer
    :launch-context="launchContext"
    :game-code="gameDefinition.gameCode"
    :game-title="gameDefinition.name"
    :default-badge="{ badgeCode: gameDefinition.badge.badgeCode, badgeName: gameDefinition.badge.badgeName }"
  >
    <template #default="{ difficulty, isPaused, completeGame, markRoundDirty, audio }">
      <PackBagGame
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
import PackBagGame from '@/components/emotional/games/PackBagGame.vue'
import { getRequiredCustomGameDefinition } from '@/data/custom-game-registry'
import { buildCustomGameLaunchContext } from '@/utils/custom-game-launch'
import GameContainer from './GameContainer.vue'

const route = useRoute()
const gameDefinition = getRequiredCustomGameDefinition('L05_PACK_BAG')
const launchContext = computed(() => buildCustomGameLaunchContext(route.query, gameDefinition))
</script>
