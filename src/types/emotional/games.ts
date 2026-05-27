import type { ModuleCode } from '@/types/module'
import type { TrainingEntryCode } from '@/utils/training-entry'
import type {
  GameMusicDuckMode,
  GameMusicProfileId,
  GameMusicStateId,
} from '@/audio/game-music-profiles'

export type EmotionGameCode =
  | 'G01_BALLOON'
  | 'G03_FOREST'
  | 'G04_WIPE_ICE'
  | 'G07_MONSTER'
  | 'G08_ENERGY_BALL'
  | 'G09_EXPRESSION_DETECTIVE'

export type CustomGameCode = EmotionGameCode | (string & {})
export type EmotionGameDifficulty = 1 | 2 | 3

export type EmotionGameCompletionStatus = 'completed' | 'aborted'
export type CustomGameExitTrigger =
  | 'game_complete'
  | 'user_exit'
  | 'teacher_exit'
  | 'timer_end'
  | 'system_interrupt'

export interface GameEmotionRecord {
  id?: number
  student_id: number
  game_code: CustomGameCode
  start_time: string
  duration_ms: number
  difficulty_level: EmotionGameDifficulty
  completion_status: EmotionGameCompletionStatus
  performance_data: Record<string, any>
  session_group_id?: string | null
  exit_trigger?: CustomGameExitTrigger | null
  session_participants?: number[] | null
  created_at?: string
}

export interface StudentBadge {
  id?: number
  student_id: number
  badge_code: string
  badge_name: string
  game_code: CustomGameCode
  unlock_count: number
  first_earned_at?: string
  last_earned_at?: string
}

export interface EmotionGameSettings {
  musicEnabled: boolean
  musicVolume: number
  effectsEnabled: boolean
  backgroundVolume: number
}

export interface EmotionGameBadgePayload {
  badgeCode: string
  badgeName: string
}

export interface CustomGameLaunchContext {
  studentId: number
  studentName?: string
  participantStudentIds: number[]
  participantStudentNames?: string[]
  launchEntryCode: TrainingEntryCode
  launchModuleCode: ModuleCode
  initialDifficulty: EmotionGameDifficulty
  difficultyLocked: boolean
  maxPlayers: 1 | 2
  metadata?: Record<string, any>
}

export interface CustomGameCompletionPayload {
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
  completionStatus?: EmotionGameCompletionStatus
  exitTrigger?: CustomGameExitTrigger | null
  sessionGroupId?: string | null
  sessionParticipants?: number[]
}

export interface GroupGameCompletionPayload extends CustomGameCompletionPayload {
  participantStudentIds: number[]
}

export interface EmotionGameCompletionPayload extends CustomGameCompletionPayload {}

export interface LegacyEmotionGameCompletionPayload {
  performanceData: Record<string, any>
  badge?: EmotionGameBadgePayload
}

export interface EmotionGameAudioController {
  ensureReady: () => Promise<void>
  setProfile: (profileId: GameMusicProfileId) => void
  setState: (state: GameMusicStateId) => void
  duckMusic: (mode: GameMusicDuckMode) => void
  restoreMusic: () => void
  stopMusic: () => void
  dispose: () => void
  startAmbient: () => Promise<void>
  stopAmbient: () => void
  startBreathCue: () => Promise<void>
  stopBreathCue: () => void
  playSoftBounce: () => Promise<void>
  playSuccessCue: () => Promise<void>
  speak: (text: string) => void
  stopAll: () => void
}
