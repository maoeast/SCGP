import type { EmotionType } from '@/types/emotional/face-emotion'

export interface ExpressionTarget {
  id: string
  label: string
  hint: string
  emotionKey: EmotionType
}

export interface DetectiveWave {
  waveId: number
  waveName: string
  description: string
  rounds: number
  timeLimitPerRound: number
  targets: ExpressionTarget[]
  shuffleTargets: boolean
}

export const EXPRESSION_TARGETS: Record<string, ExpressionTarget> = {
  happy: {
    id: 'happy',
    label: '开心',
    hint: '咧开嘴笑，眼睛眯起来！',
    emotionKey: 'Happy',
  },
  surprised: {
    id: 'surprised',
    label: '惊讶',
    hint: '张大嘴巴，眼睛睁大！',
    emotionKey: 'Surprised',
  },
  neutral: {
    id: 'neutral',
    label: '平静',
    hint: '放松脸，嘴巴轻轻闭上。',
    emotionKey: 'Neutral',
  },
  angry: {
    id: 'angry',
    label: '生气',
    hint: '皱起眉头，嘴巴绷紧！',
    emotionKey: 'Angry',
  },
  sad: {
    id: 'sad',
    label: '伤心',
    hint: '嘴角往下，眉毛皱一皱。',
    emotionKey: 'Sad',
  },
  fearful: {
    id: 'fearful',
    label: '害怕',
    hint: '睁大眼睛，眉毛往上抬！',
    emotionKey: 'Fearful',
  },
}

export const DETECTIVE_WAVES: DetectiveWave[] = [
  {
    waveId: 1,
    waveName: 'Wave 1 · 初级侦探',
    description: '2 种基础表情，5 题，单题 5 秒',
    rounds: 5,
    timeLimitPerRound: 5,
    shuffleTargets: true,
    targets: [EXPRESSION_TARGETS.happy, EXPRESSION_TARGETS.surprised],
  },
  {
    waveId: 2,
    waveName: 'Wave 2 · 中级侦探',
    description: '4 种表情，6 题，单题 4 秒',
    rounds: 6,
    timeLimitPerRound: 4,
    shuffleTargets: true,
    targets: [
      EXPRESSION_TARGETS.happy,
      EXPRESSION_TARGETS.surprised,
      EXPRESSION_TARGETS.sad,
      EXPRESSION_TARGETS.angry,
    ],
  },
  {
    waveId: 3,
    waveName: 'Wave 3 · 高级侦探',
    description: '6 种表情快速切换，8 题，单题 3 秒',
    rounds: 8,
    timeLimitPerRound: 3,
    shuffleTargets: true,
    targets: [
      EXPRESSION_TARGETS.happy,
      EXPRESSION_TARGETS.surprised,
      EXPRESSION_TARGETS.sad,
      EXPRESSION_TARGETS.angry,
      EXPRESSION_TARGETS.fearful,
      EXPRESSION_TARGETS.neutral,
    ],
  },
]

export const ENCOURAGEMENTS = [
  '你是最棒的表情侦探！',
  '侦探技能 +1，太厉害了！',
  '每一个表情你都做得很棒！',
  '继续练习，你会越来越厉害！',
  '今天的你超级勇敢！',
  '表情侦探徽章已解锁！',
]

export function getScoreForMatch(matchPercent: number): number {
  if (matchPercent >= 80) return 100
  if (matchPercent >= 60) return 70
  if (matchPercent >= 40) return 40
  return 10
}

export function getStarsForScore(score: number): 1 | 2 | 3 {
  if (score >= 80) return 3
  if (score >= 50) return 2
  return 1
}

export function getMatchColor(matchPercent: number): string {
  if (matchPercent >= 80) return '#81C784'
  if (matchPercent >= 60) return '#4FC3F7'
  if (matchPercent >= 40) return '#FFB74D'
  return '#BDBDBD'
}

export function getMatchHint(matchPercent: number): string {
  if (matchPercent >= 80) return '太棒了！'
  if (matchPercent >= 60) return '快了！再大一点！'
  if (matchPercent >= 40) return '加油！继续！'
  return ''
}
