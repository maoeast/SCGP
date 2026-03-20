export type EmotionGameCode =
  | 'G01_BALLOON'
  | 'G03_FOREST'
  | 'G04_WIPE_ICE'
  | 'G07_MONSTER'

export type EmotionGameDifficulty = 1 | 2 | 3

export type EmotionGameCompletionStatus = 'completed' | 'aborted'

export interface GameEmotionRecord {
  id?: number
  student_id: number
  game_code: EmotionGameCode
  start_time: string
  duration_ms: number
  difficulty_level: EmotionGameDifficulty
  completion_status: EmotionGameCompletionStatus
  performance_data: Record<string, any>
  created_at?: string
}

export interface StudentBadge {
  id?: number
  student_id: number
  badge_code: string
  badge_name: string
  game_code: EmotionGameCode
  unlock_count: number
  first_earned_at?: string
  last_earned_at?: string
}

export interface EmotionGameSettings {
  backgroundVolume: number
  effectsEnabled: boolean
}

export interface EmotionGameBadgePayload {
  badgeCode: string
  badgeName: string
}

export interface EmotionGameCompletionPayload {
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
}

export interface EmotionGameAudioController {
  ensureReady: () => Promise<void>
  startAmbient: () => Promise<void>
  stopAmbient: () => void
  startBreathCue: () => Promise<void>
  stopBreathCue: () => void
  playSoftBounce: () => Promise<void>
  playSuccessCue: () => Promise<void>
  speak: (text: string) => void
  stopAll: () => void
}
