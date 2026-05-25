export type AirXylophoneNoteId = 'do' | 're' | 'mi' | 'sol' | 'la' | 'do2'
export type AirXylophoneDifficultyId = 'easy' | 'medium' | 'hard'

export interface AirXylophoneMelodyStep {
  noteId: AirXylophoneNoteId
  label: string
}

export interface AirXylophoneSong {
  id: string
  title: string
  difficulty: AirXylophoneDifficultyId
  melody: AirXylophoneMelodyStep[]
}

export interface AirXylophoneDifficulty {
  id: AirXylophoneDifficultyId
  label: string
  description: string
  songs: AirXylophoneSong[]
}

export interface AirXylophoneMelodyProgress {
  stepIndex: number
  celebrating: boolean
}

const NOTE_LABELS: Record<AirXylophoneNoteId, string> = {
  do: '1',
  re: '2',
  mi: '3',
  sol: '5',
  la: '6',
  do2: "1'",
}

function melody(notes: AirXylophoneNoteId[]): AirXylophoneMelodyStep[] {
  return notes.map((noteId) => ({
    noteId,
    label: NOTE_LABELS[noteId],
  }))
}

export const AIR_XYLOPHONE_DIFFICULTIES: AirXylophoneDifficulty[] = [
  {
    id: 'easy',
    label: '简单',
    description: '短句旋律，适合先熟悉敲击位置。',
    songs: [
      {
        id: 'easy-little-star',
        title: '小星星片段',
        difficulty: 'easy',
        melody: melody(['do', 'do', 'sol', 'sol', 'la', 'la', 'sol']),
      },
      {
        id: 'easy-two-tigers',
        title: '两只老虎片段',
        difficulty: 'easy',
        melody: melody(['do', 're', 'mi', 'do', 'do', 're', 'mi', 'do']),
      },
      {
        id: 'easy-mary-lamb',
        title: '小羊羔片段',
        difficulty: 'easy',
        melody: melody(['mi', 're', 'do', 're', 'mi', 'mi', 'mi']),
      },
    ],
  },
  {
    id: 'medium',
    label: '中等',
    description: '加入回跳和重复，训练稳定跟弹。',
    songs: [
      {
        id: 'medium-row-boat',
        title: '划小船片段',
        difficulty: 'medium',
        melody: melody(['do', 'do', 'do', 're', 'mi', 'mi', 're', 'mi', 'sol']),
      },
      {
        id: 'medium-bee',
        title: '小蜜蜂片段',
        difficulty: 'medium',
        melody: melody(['sol', 'mi', 'mi', 're', 'do', 'do', 're', 'mi', 'sol']),
      },
      {
        id: 'medium-rain-rhyme',
        title: '下雨歌片段',
        difficulty: 'medium',
        melody: melody(['mi', 'sol', 'la', 'sol', 'mi', 're', 'do', 're', 'mi']),
      },
    ],
  },
  {
    id: 'hard',
    label: '挑战',
    description: '更长旋律和高音 Do，适合进阶节奏保持。',
    songs: [
      {
        id: 'hard-happy-birthday',
        title: '生日歌片段',
        difficulty: 'hard',
        melody: melody(['do', 'do', 're', 'do', 'sol', 'mi', 'do', 'do', 're', 'do', 'la', 'sol']),
      },
      {
        id: 'hard-london-bridge',
        title: '伦敦桥片段',
        difficulty: 'hard',
        melody: melody(['sol', 'la', 'sol', 'mi', 're', 'mi', 'sol', 'do', 're', 'mi', 're', 'do']),
      },
      {
        id: 'hard-spring-step',
        title: '春天脚步片段',
        difficulty: 'hard',
        melody: melody(['do', 're', 'mi', 'sol', 'la', 'do2', 'la', 'sol', 'mi', 'sol', 're', 'do']),
      },
    ],
  },
]

export const AIR_XYLOPHONE_DIFFICULTY_OPTIONS = AIR_XYLOPHONE_DIFFICULTIES.map((difficulty) => ({
  value: difficulty.id,
  label: difficulty.label,
  description: difficulty.description,
}))

const DEFAULT_AIR_XYLOPHONE_DIFFICULTY =
  AIR_XYLOPHONE_DIFFICULTIES.find((item) => item.id === 'medium')
  ?? AIR_XYLOPHONE_DIFFICULTIES[0]!

export function resolveAirXylophoneDifficulty(
  difficulty: string | null | undefined,
): AirXylophoneDifficulty {
  return AIR_XYLOPHONE_DIFFICULTIES.find((item) => item.id === difficulty)
    ?? DEFAULT_AIR_XYLOPHONE_DIFFICULTY
}

export function selectRandomAirXylophoneSong(
  difficulty: string | null | undefined,
  random: () => number = Math.random,
): AirXylophoneSong {
  const resolvedDifficulty = resolveAirXylophoneDifficulty(difficulty)
  const index = Math.min(
    resolvedDifficulty.songs.length - 1,
    Math.max(0, Math.floor(random() * resolvedDifficulty.songs.length)),
  )
  return resolvedDifficulty.songs[index] ?? resolvedDifficulty.songs[0]!
}

export function advanceAirXylophoneMelodyProgress(
  progress: AirXylophoneMelodyProgress,
  expectedNoteId: AirXylophoneNoteId,
  playedNoteId: AirXylophoneNoteId,
  melodyLength: number,
): AirXylophoneMelodyProgress {
  if (progress.celebrating || playedNoteId !== expectedNoteId || melodyLength <= 0) {
    return progress
  }

  const nextIndex = progress.stepIndex + 1
  if (nextIndex >= melodyLength) {
    return {
      stepIndex: progress.stepIndex,
      celebrating: true,
    }
  }

  return {
    stepIndex: nextIndex,
    celebrating: false,
  }
}
