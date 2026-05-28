import { TaskID } from '@/types/games'
import type { TrainingEntryCode } from '@/utils/training-entry'

export type GameMusicProfileId =
  | 'calm'
  | 'playful'
  | 'focus'
  | 'bubble'
  | 'warm-social'
  | 'music-minimal'
  | 'listening'
  | 'expression-calm'
  | 'expression-happy'
  | 'expression-angry'
  | 'expression-sad'
  | 'expression-fearful'
  | 'expression-surprised'

export type GameMusicStateId = 'idle' | 'playing' | 'focus' | 'combo' | 'finish' | 'paused'
export type GameMusicDuckMode = 'low' | 'mute'
export type GameMusicOscillatorType = 'sine' | 'triangle' | 'square' | 'sawtooth'

export interface GameMusicTheme {
  bpm: number
  melody: string[]
  melodyLength: string
  bass: string[]
  bassLength: string
  outputGain: number
  loop: boolean
  melodyOscillator: GameMusicOscillatorType
  bassOscillator: GameMusicOscillatorType
  reverbWet: number
  delayWet: number
}

export type GameMusicProfile = Partial<Record<Exclude<GameMusicStateId, 'paused'>, GameMusicTheme>>

export const GAME_MUSIC_PROFILES: Record<GameMusicProfileId, GameMusicProfile> = {
  calm: {
    idle: {
      bpm: 56,
      melody: ['C4', 'E4', 'G4', 'E4', 'D4', 'G4'],
      melodyLength: '2n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '1n',
      outputGain: 0.14,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.5,
      delayWet: 0.08,
    },
    playing: {
      bpm: 64,
      melody: ['C4', 'D4', 'E4', 'G4', 'E4', 'D4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.16,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.44,
      delayWet: 0.06,
    },
    finish: {
      bpm: 78,
      melody: ['C4', 'E4', 'G4', 'C5'],
      melodyLength: '4n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.2,
      loop: false,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.24,
      delayWet: 0.04,
    },
  },
  playful: {
    idle: {
      bpm: 60,
      melody: ['C4', 'D4', 'E4', 'D4', 'C4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2', 'F2'],
      bassLength: '2n',
      outputGain: 0.14,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.24,
      delayWet: 0.04,
    },
    playing: {
      bpm: 70,
      melody: ['C4', 'E4', 'G4', 'E4', 'D4', 'E4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2', 'F2'],
      bassLength: '4n',
      outputGain: 0.18,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.18,
      delayWet: 0.05,
    },
    finish: {
      bpm: 84,
      melody: ['C4', 'E4', 'G4', 'A4', 'G4'],
      melodyLength: '4n',
      bass: ['C3', 'E3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.22,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.16,
      delayWet: 0,
    },
  },
  focus: {
    idle: {
      bpm: 52,
      melody: ['C4', 'G4', 'D4'],
      melodyLength: '2n',
      bass: ['C3', 'A2'],
      bassLength: '1n',
      outputGain: 0.1,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.34,
      delayWet: 0.02,
    },
    focus: {
      bpm: 60,
      melody: ['C4', 'D4', 'E4', 'D4', 'C4'],
      melodyLength: '2n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.12,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.28,
      delayWet: 0.02,
    },
    finish: {
      bpm: 72,
      melody: ['C4', 'E4', 'A4'],
      melodyLength: '4n',
      bass: ['A2', 'E3', 'A3'],
      bassLength: '4n',
      outputGain: 0.16,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.14,
      delayWet: 0,
    },
  },
  bubble: {
    idle: {
      bpm: 60,
      melody: ['C4', 'E4', 'G4', 'E4', 'D4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.14,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.22,
      delayWet: 0.05,
    },
    playing: {
      bpm: 72,
      melody: ['C4', 'D4', 'E4', 'G4', 'E4', 'D4'],
      melodyLength: '4n',
      bass: ['C3', 'C3', 'G2', 'A2', 'F2', 'G2'],
      bassLength: '4n',
      outputGain: 0.18,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.18,
      delayWet: 0.06,
    },
    combo: {
      bpm: 86,
      melody: ['E4', 'G4', 'A4', 'G4', 'E4', 'D4'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'A3', 'F3'],
      bassLength: '8n',
      outputGain: 0.22,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.1,
      delayWet: 0.04,
    },
    finish: {
      bpm: 90,
      melody: ['C4', 'E4', 'G4', 'C5'],
      melodyLength: '4n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.24,
      loop: false,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.14,
      delayWet: 0,
    },
  },
  'warm-social': {
    idle: {
      bpm: 58,
      melody: ['D4', 'F4', 'A4', 'F4', 'G4'],
      melodyLength: '2n',
      bass: ['D3', 'A2', 'G2'],
      bassLength: '2n',
      outputGain: 0.13,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.34,
      delayWet: 0.04,
    },
    playing: {
      bpm: 68,
      melody: ['D4', 'F4', 'A4', 'F4', 'E4', 'D4'],
      melodyLength: '4n',
      bass: ['D3', 'A2', 'B2', 'G2'],
      bassLength: '4n',
      outputGain: 0.16,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.28,
      delayWet: 0.04,
    },
    finish: {
      bpm: 82,
      melody: ['D4', 'F4', 'A4', 'D5'],
      melodyLength: '4n',
      bass: ['D3', 'A3', 'D4'],
      bassLength: '4n',
      outputGain: 0.2,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.16,
      delayWet: 0,
    },
  },
  'music-minimal': {
    idle: {
      bpm: 48,
      melody: ['C4', 'G4', 'E4'],
      melodyLength: '2n',
      bass: ['C3', 'G2'],
      bassLength: '1n',
      outputGain: 0.06,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.14,
      delayWet: 0,
    },
    playing: {
      bpm: 56,
      melody: ['C4', 'E4', 'G4', 'E4'],
      melodyLength: '2n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.08,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.12,
      delayWet: 0,
    },
    finish: {
      bpm: 70,
      melody: ['C4', 'E4', 'G4'],
      melodyLength: '4n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.1,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.1,
      delayWet: 0,
    },
  },
  listening: {
    idle: {
      bpm: 54,
      melody: ['C4', 'G4', 'A4'],
      melodyLength: '2n',
      bass: ['C3', 'A2'],
      bassLength: '1n',
      outputGain: 0.09,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.18,
      delayWet: 0,
    },
    playing: {
      bpm: 62,
      melody: ['C4', 'D4', 'G4', 'E4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.11,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.14,
      delayWet: 0,
    },
    focus: {
      bpm: 52,
      melody: ['C4', 'G4', 'D4'],
      melodyLength: '2n',
      bass: ['C3', 'G2'],
      bassLength: '1n',
      outputGain: 0.08,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.08,
      delayWet: 0,
    },
    finish: {
      bpm: 74,
      melody: ['C4', 'E4', 'G4'],
      melodyLength: '4n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.12,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.1,
      delayWet: 0,
    },
  },
  'expression-calm': {
    idle: {
      bpm: 58,
      melody: ['C4', 'E4', 'G4', 'D4'],
      melodyLength: '2n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '1n',
      outputGain: 0.11,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.42,
      delayWet: 0.02,
    },
    playing: {
      bpm: 64,
      melody: ['C4', 'D4', 'E4', 'G4', 'E4', 'D4'],
      melodyLength: '4n',
      bass: ['C3', 'G2', 'A2'],
      bassLength: '2n',
      outputGain: 0.13,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.46,
      delayWet: 0.03,
    },
    focus: {
      bpm: 60,
      melody: ['C4', 'G4', 'D4'],
      melodyLength: '2n',
      bass: ['C3', 'G2'],
      bassLength: '1n',
      outputGain: 0.1,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.38,
      delayWet: 0.02,
    },
  },
  'expression-happy': {
    playing: {
      bpm: 108,
      melody: ['C4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'A3', 'G3'],
      bassLength: '4n',
      outputGain: 0.14,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.14,
      delayWet: 0.04,
    },
    combo: {
      bpm: 114,
      melody: ['E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4'],
      melodyLength: '8n',
      bass: ['C3', 'E3', 'G3', 'A3'],
      bassLength: '8n',
      outputGain: 0.15,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'triangle',
      reverbWet: 0.12,
      delayWet: 0.05,
    },
    finish: {
      bpm: 118,
      melody: ['C4', 'E4', 'G4', 'C5'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.14,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.08,
      delayWet: 0.02,
    },
  },
  'expression-angry': {
    playing: {
      bpm: 78,
      melody: ['C3', 'G2', 'C3'],
      melodyLength: '8n',
      bass: ['C2', 'G1'],
      bassLength: '4n',
      outputGain: 0.075,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.08,
      delayWet: 0,
    },
    focus: {
      bpm: 72,
      melody: ['C3', 'D3', 'G2'],
      melodyLength: '4n',
      bass: ['C2', 'G1'],
      bassLength: '2n',
      outputGain: 0.065,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.06,
      delayWet: 0,
    },
  },
  'expression-sad': {
    idle: {
      bpm: 68,
      melody: ['A4', 'E4', 'D4', 'C4'],
      melodyLength: '2n',
      bass: ['A2', 'E2', 'F2'],
      bassLength: '1n',
      outputGain: 0.08,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.58,
      delayWet: 0.03,
    },
    playing: {
      bpm: 72,
      melody: ['A4', 'G4', 'E4', 'D4', 'C4'],
      melodyLength: '2n',
      bass: ['A2', 'E2', 'F2'],
      bassLength: '1n',
      outputGain: 0.1,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.54,
      delayWet: 0.04,
    },
    focus: {
      bpm: 66,
      melody: ['A4', 'E4', 'D4'],
      melodyLength: '1n',
      bass: ['A2', 'E2'],
      bassLength: '1n',
      outputGain: 0.08,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.6,
      delayWet: 0.02,
    },
  },
  'expression-fearful': {
    playing: {
      bpm: 72,
      melody: ['E4', 'F4', 'D4', 'F4'],
      melodyLength: '4n',
      bass: ['D3', 'A2'],
      bassLength: '2n',
      outputGain: 0.065,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'sine',
      reverbWet: 0.18,
      delayWet: 0.08,
    },
    focus: {
      bpm: 68,
      melody: ['E4', 'D4', 'F4'],
      melodyLength: '2n',
      bass: ['D3', 'A2'],
      bassLength: '1n',
      outputGain: 0.055,
      loop: true,
      melodyOscillator: 'sine',
      bassOscillator: 'sine',
      reverbWet: 0.2,
      delayWet: 0.06,
    },
  },
  'expression-surprised': {
    playing: {
      bpm: 96,
      melody: ['C4', 'G4', 'C5'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.085,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.1,
      delayWet: 0.04,
    },
    combo: {
      bpm: 108,
      melody: ['C4', 'G4', 'C5', 'E5'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.095,
      loop: true,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.08,
      delayWet: 0.06,
    },
    finish: {
      bpm: 112,
      melody: ['C4', 'E5', 'G5'],
      melodyLength: '8n',
      bass: ['C3', 'G3', 'C4'],
      bassLength: '4n',
      outputGain: 0.1,
      loop: false,
      melodyOscillator: 'triangle',
      bassOscillator: 'triangle',
      reverbWet: 0.06,
      delayWet: 0.04,
    },
  },
}

export function resolveLegacyGameMusicProfile(taskId: TaskID): GameMusicProfileId {
  switch (taskId) {
    case TaskID.COLOR_MATCH:
      return 'calm'
    case TaskID.SHAPE_MATCH:
    case TaskID.VISUAL_TRACK:
      return 'focus'
    case TaskID.ICON_MATCH:
      return 'warm-social'
    case TaskID.AUDIO_DIFF:
    case TaskID.AUDIO_COMMAND:
    case TaskID.AUDIO_RHYTHM:
      return 'listening'
    case TaskID.HAND_XYLOPHONE:
      return 'music-minimal'
    case TaskID.HAND_WOOD_BLOCKS:
      return 'calm'
    case TaskID.HAND_BUBBLE_POP:
      return 'bubble'
    default:
      return 'playful'
  }
}

export function getDefaultMusicStateForLegacyTask(taskId: TaskID): GameMusicStateId {
  switch (taskId) {
    case TaskID.VISUAL_TRACK:
      return 'focus'
    case TaskID.AUDIO_DIFF:
    case TaskID.AUDIO_COMMAND:
    case TaskID.AUDIO_RHYTHM:
      return 'paused'
    default:
      return 'playing'
  }
}

export function hasLegacyGameBackgroundMusic(taskId: TaskID): boolean {
  return getDefaultMusicStateForLegacyTask(taskId) !== 'paused'
}

export function resolveCustomGameMusicProfile({
  trainingEntryCode,
  gameCode,
}: {
  trainingEntryCode: TrainingEntryCode
  gameCode?: string | null
}): GameMusicProfileId {
  if (gameCode === 'C03_XYLOPHONE') {
    return 'music-minimal'
  }

  switch (trainingEntryCode) {
    case 'emotional-regulation':
    case 'soothing-aids':
    case 'life-skills':
      return 'calm'
    case 'social-communication':
      return 'warm-social'
    case 'fine-motor':
      return 'focus'
    default:
      return 'calm'
  }
}

export function hasCustomGameBackgroundMusic({
  trainingEntryCode,
  gameCode,
}: {
  trainingEntryCode: TrainingEntryCode
  gameCode?: string | null
}): boolean {
  if (
    gameCode === 'C03_XYLOPHONE'
    || gameCode === 'G08_ENERGY_BALL'
    || gameCode === 'G09_EXPRESSION_DETECTIVE'
  ) {
    return false
  }

  if (trainingEntryCode === 'life-skills') {
    return false
  }

  return true
}
