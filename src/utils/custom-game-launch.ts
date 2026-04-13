import type { LocationQuery, LocationQueryValue } from 'vue-router'
import type { CustomGameDefinition } from '@/data/custom-game-registry'
import type { CustomGameLaunchContext, EmotionGameDifficulty } from '@/types/emotional/games'
import { getTrainingEntry, resolveTrainingEntryCode } from '@/utils/training-entry'

function getFirstQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : ''
  }

  return typeof value === 'string' ? value : ''
}

function parseBooleanQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): boolean | null {
  const normalized = getFirstQueryValue(value).trim().toLowerCase()
  if (!normalized) {
    return null
  }

  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false
  }

  return null
}

function parseDifficultyQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): EmotionGameDifficulty {
  const parsed = Number(getFirstQueryValue(value) || 1)
  if (parsed === 2 || parsed === 3) {
    return parsed
  }

  return 1
}

function parseStudentIdListQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): number[] {
  const sourceValues = Array.isArray(value)
    ? value
    : value !== undefined
      ? [value]
      : []

  return Array.from(new Set(
    sourceValues
      .flatMap((item) => {
        const normalized = typeof item === 'string' ? item.trim() : ''
        if (!normalized) {
          return []
        }

        if (normalized.startsWith('[') && normalized.endsWith(']')) {
          try {
            const parsed = JSON.parse(normalized)
            if (Array.isArray(parsed)) {
              return parsed.map((entry) => String(entry))
            }
          } catch {
            // Ignore malformed JSON and fall back to split parsing.
          }
        }

        return normalized.split(/[,\|]/)
      })
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0)
      .map((item) => Math.floor(item)),
  ))
}

function parseStudentNameListQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined): string[] {
  const sourceValues = Array.isArray(value)
    ? value
    : value !== undefined
      ? [value]
      : []

  return sourceValues
    .flatMap((item) => {
      const normalized = typeof item === 'string' ? item.trim() : ''
      if (!normalized) {
        return []
      }

      if (normalized.startsWith('[') && normalized.endsWith(']')) {
        try {
          const parsed = JSON.parse(normalized)
          if (Array.isArray(parsed)) {
            return parsed
              .map((entry) => String(entry).trim())
              .filter(Boolean)
          }
        } catch {
          // Ignore malformed JSON and fall back to split parsing.
        }
      }

      return normalized
        .split(/[,\|]/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    })
}

export function buildCustomGameLaunchContext(
  query: LocationQuery,
  definition: CustomGameDefinition,
): CustomGameLaunchContext {
  const participantStudentIds = parseStudentIdListQueryValue(query.participantStudentIds)
  const primaryStudentId = Number(getFirstQueryValue(query.studentId) || 0)
  const normalizedStudentIds = participantStudentIds.length > 0
    ? participantStudentIds
    : (Number.isFinite(primaryStudentId) && primaryStudentId > 0 ? [Math.floor(primaryStudentId)] : [])
  const participantStudentNames = parseStudentNameListQueryValue(query.participantStudentNames)
  const primaryStudentName = getFirstQueryValue(query.studentName).trim()
  const resolvedStudentNames = participantStudentNames.length > 0
    ? participantStudentNames
    : (primaryStudentName ? [primaryStudentName] : [])
  const launchEntryCode = resolveTrainingEntryCode(query.entry, definition.trainingEntryCode)
  const launchEntry = getTrainingEntry(launchEntryCode)
  const difficultyLockedOverride = parseBooleanQueryValue(query.difficultyLocked)

  return {
    studentId: normalizedStudentIds[0] || 0,
    studentName: resolvedStudentNames[0] || '',
    participantStudentIds: normalizedStudentIds,
    participantStudentNames: resolvedStudentNames,
    launchEntryCode,
    launchModuleCode: launchEntry.moduleCode,
    initialDifficulty: parseDifficultyQueryValue(query.difficulty),
    difficultyLocked: difficultyLockedOverride ?? definition.difficultyLocked,
    maxPlayers: definition.maxPlayers,
    metadata: {
      queryModule: getFirstQueryValue(query.module) || definition.moduleCode,
      entryPath: definition.entryPath,
    },
  }
}
