import type { EmotionGameDifficulty } from '@/types/emotional/games'

export type ExpressionDuelSide = 'left' | 'right'

export interface ExpressionDuelFaceCandidate {
  centerX: number
  centerY?: number
  width?: number
  height?: number
  label?: string
}

export interface ExpressionDuelRoundSummary {
  setterSide: ExpressionDuelSide
  mimicSide: ExpressionDuelSide
  setterName: string
  mimicName: string
  similarityRatio: number
  score: number
  mimicDurationMs: number
  earlySuccess: boolean
}

export interface ExpressionDuelDifficultyConfig {
  roundsPerPlayer: number
  readyCountdownSeconds: number
  captureCountdownSeconds: number
  mimicCountdownSeconds: number
  frozenRevealMs: number
  scoringRevealMs: number
  earlySuccessThreshold: number
  earlySuccessHoldMs: number
}

export interface ExpressionDuelPerformanceDataInput {
  rounds: ExpressionDuelRoundSummary[]
  participantNames: [string, string] | string[]
  participantStudentIds: [number, number] | number[]
  totalRounds: number
  scores: Record<ExpressionDuelSide, number>
  teacherBonuses: Record<ExpressionDuelSide, number>
  cameraMode: 'shared'
  cameraDeviceLabel?: string
  detectedCameraCount: number
}

type BlendshapeMap = Record<string, number>

const DEFAULT_SIMILARITY_KEYS = [
  'mouthSmileLeft',
  'mouthSmileRight',
  'jawOpen',
  'eyeWideLeft',
  'eyeWideRight',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'mouthFrownLeft',
  'mouthFrownRight',
  'eyeSquintLeft',
  'eyeSquintRight',
  'cheekPuff',
  'mouthPucker',
] as const

const HIGH_WEIGHT_KEYS = new Set([
  'mouthSmileLeft',
  'mouthSmileRight',
  'jawOpen',
  'browDownLeft',
  'browDownRight',
  'browInnerUp',
  'mouthFrownLeft',
  'mouthFrownRight',
  'eyeWideLeft',
  'eyeWideRight',
])

export const EXPRESSION_DUEL_DIFFICULTY_CONFIG: Record<EmotionGameDifficulty, ExpressionDuelDifficultyConfig> = {
  1: {
    roundsPerPlayer: 2,
    readyCountdownSeconds: 3,
    captureCountdownSeconds: 3,
    mimicCountdownSeconds: 6,
    frozenRevealMs: 1200,
    scoringRevealMs: 1800,
    earlySuccessThreshold: 0.78,
    earlySuccessHoldMs: 420,
  },
  2: {
    roundsPerPlayer: 3,
    readyCountdownSeconds: 3,
    captureCountdownSeconds: 3,
    mimicCountdownSeconds: 5,
    frozenRevealMs: 1100,
    scoringRevealMs: 1700,
    earlySuccessThreshold: 0.82,
    earlySuccessHoldMs: 360,
  },
  3: {
    roundsPerPlayer: 4,
    readyCountdownSeconds: 3,
    captureCountdownSeconds: 2,
    mimicCountdownSeconds: 4,
    frozenRevealMs: 900,
    scoringRevealMs: 1600,
    earlySuccessThreshold: 0.86,
    earlySuccessHoldMs: 320,
  },
}

export function getExpressionDuelDifficultyConfig(
  difficulty: EmotionGameDifficulty,
): ExpressionDuelDifficultyConfig {
  return EXPRESSION_DUEL_DIFFICULTY_CONFIG[difficulty] || EXPRESSION_DUEL_DIFFICULTY_CONFIG[1]
}

export function assignDuelFacesByHorizontalOrder<T extends ExpressionDuelFaceCandidate>(
  faces: T[],
): { left: T | null; right: T | null } {
  const sorted = [...faces]
    .filter((face) => Number.isFinite(face.centerX))
    .sort((a, b) => a.centerX - b.centerX)

  return {
    left: sorted[0] || null,
    right: sorted[1] || null,
  }
}

export function computeExpressionDuelSimilarity(
  reference: BlendshapeMap,
  current: BlendshapeMap,
): number {
  const dynamicKeys = Array.from(new Set([
    ...Object.keys(reference || {}),
    ...Object.keys(current || {}),
  ]))
  const keys = dynamicKeys.length > 0 ? dynamicKeys : [...DEFAULT_SIMILARITY_KEYS]

  let weightedDiffSum = 0
  let weightSum = 0

  for (const key of keys) {
    const weight = HIGH_WEIGHT_KEYS.has(key) ? 2 : 1
    const diff = Math.abs((reference?.[key] ?? 0) - (current?.[key] ?? 0))
    weightedDiffSum += diff * weight
    weightSum += weight
  }

  if (weightSum <= 0) {
    return 0
  }

  const normalizedDiff = weightedDiffSum / weightSum
  const similarity = Math.pow(Math.max(0, 1 - normalizedDiff), 0.82)
  return Math.round(similarity * 100)
}

export function resolveExpressionDuelRoundScore(similarityPercent: number) {
  if (similarityPercent >= 85) {
    return { score: 100, stars: 3, label: '心灵相通' }
  }

  if (similarityPercent >= 65) {
    return { score: 75, stars: 2, label: '非常接近' }
  }

  if (similarityPercent >= 45) {
    return { score: 50, stars: 1, label: '继续加油' }
  }

  return { score: 25, stars: 1, label: '再来一次' }
}

function averageRatio(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(2))
}

function averageDuration(values: number[]) {
  if (values.length === 0) {
    return 0
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function buildExpressionDuelPerformanceData(
  input: ExpressionDuelPerformanceDataInput,
) {
  const similarityRatios = input.rounds.map((round) => Number(round.similarityRatio || 0))
  const mimicDurations = input.rounds.map((round) => Number(round.mimicDurationMs || 0))
  const earlySuccessRounds = input.rounds.filter((round) => round.earlySuccess).length
  const participantNames = [...input.participantNames].slice(0, 2)
  const participantStudentIds = [...input.participantStudentIds].slice(0, 2)

  return {
    completed_rounds: input.rounds.length,
    target_round_count: input.totalRounds,
    rounds_per_player: Math.ceil(input.totalRounds / 2),
    average_similarity_ratio: averageRatio(similarityRatios),
    best_similarity_ratio: Number(Math.max(0, ...similarityRatios).toFixed(2)),
    lowest_similarity_ratio: Number((input.rounds.length > 0 ? Math.min(...similarityRatios) : 0).toFixed(2)),
    early_success_rounds: earlySuccessRounds,
    average_mimic_duration_ms: averageDuration(mimicDurations),
    mimic_duration_ms_list: mimicDurations,
    participant_names: participantNames,
    participant_student_ids: participantStudentIds,
    participant_scores: {
      left: Number(input.scores.left || 0) + Number(input.teacherBonuses.left || 0),
      right: Number(input.scores.right || 0) + Number(input.teacherBonuses.right || 0),
    },
    participant_base_scores: {
      left: Number(input.scores.left || 0),
      right: Number(input.scores.right || 0),
    },
    teacher_bonus_scores: {
      left: Number(input.teacherBonuses.left || 0),
      right: Number(input.teacherBonuses.right || 0),
    },
    camera_mode: input.cameraMode,
    camera_device_label: input.cameraDeviceLabel || '',
    detected_camera_count: Number(input.detectedCameraCount || 0),
    round_logs: input.rounds.map((round, index) => {
      return `第 ${index + 1} 轮：${round.setterName} 出题，${round.mimicName} 模仿，相似度 ${Math.round(round.similarityRatio * 100)}%，得分 ${round.score}`
    }),
  }
}
