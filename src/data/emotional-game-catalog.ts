import { ModuleCode, type ResourceItem } from '@/types/module'
import { getTrainingResourceCopyOverride } from '@/data/generated-training-resource-copy'
import {
  getCustomGamesByTrainingEntry,
  listCustomGameDefinitions,
  type CustomGameDefinition,
} from '@/data/custom-game-registry'
import { buildEmotionalGameResourceCopyKey } from '@/utils/training-resource-copy'

export interface EmotionalGameCatalogSeed {
  name: string
  description: string
  category: string
  tags: string[]
  coverImage: string
  metadata: Record<string, any>
}

export const EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE = 'emotional_game_seed_2026_03_30'

function createEmotionalGameCatalogSeedFromDefinition(game: CustomGameDefinition): EmotionalGameCatalogSeed {
  const gameCode = game.gameCode
  const override = getTrainingResourceCopyOverride(buildEmotionalGameResourceCopyKey(gameCode))

  return {
    name: override?.name || game.name,
    description: override ? override.description : game.description,
    category: game.category,
    tags: [...game.tags],
    coverImage: game.coverImage,
    metadata: {
      ...game.metadata,
      entryPath: game.entryPath,
      gameCode: game.gameCode,
      trainingEntryCode: game.trainingEntryCode,
      moduleCode: game.moduleCode,
      maxPlayers: game.maxPlayers,
      requiredPermissions: [...game.requiredPermissions],
      permissionPolicy: game.permissionPolicy,
      difficultyLocked: game.difficultyLocked,
      badge: { ...game.badge },
      previewDescription: override ? override.previewDescription : game.metadata.previewDescription,
      repeatPlayHint: override ? override.repeatPlayHint : game.metadata.repeatPlayHint,
    },
  }
}

export const EMOTIONAL_GAME_CATALOG_SEED: EmotionalGameCatalogSeed[] = getCustomGamesByTrainingEntry('emotional-regulation')
  .map(createEmotionalGameCatalogSeedFromDefinition)

export const ALL_CUSTOM_GAME_RESOURCE_SEED: EmotionalGameCatalogSeed[] = listCustomGameDefinitions()
  .map(createEmotionalGameCatalogSeedFromDefinition)

export function createEmotionalGameCatalog(): ResourceItem[] {
  return EMOTIONAL_GAME_CATALOG_SEED.map((game, index) => ({
    id: -1001 - index,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'game',
    name: game.name,
    description: game.description,
    category: game.category,
    tags: [...game.tags],
    coverImage: game.coverImage,
    isCustom: false,
    isActive: true,
    metadata: { ...game.metadata },
  }))
}

export function getEmotionalGameCount() {
  return EMOTIONAL_GAME_CATALOG_SEED.length
}
