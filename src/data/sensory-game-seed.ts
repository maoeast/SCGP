import { buildSensoryGameResourceCopyKey } from '@/utils/training-resource-copy'
import { getTrainingResourceCopyOverride } from '@/data/generated-training-resource-copy'

export interface SensoryGameSeed {
  taskId: number
  name: string
  description: string
  category: 'visual' | 'audio'
  emoji: string
  color: string
  difficulty: string
  duration: string
  mode: string
}

const BASE_SENSORY_GAME_SEED: SensoryGameSeed[] = [
  {
    taskId: 1,
    name: '颜色配对',
    description: '识别和匹配不同颜色，提升视觉辨别能力',
    category: 'visual',
    emoji: '🎨',
    color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'color',
  },
  {
    taskId: 2,
    name: '形状识别',
    description: '识别基本几何形状，提升图形认知',
    category: 'visual',
    emoji: '🔷',
    color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'shape',
  },
  {
    taskId: 3,
    name: '物品配对',
    description: '识别日常物品，提升视觉联想能力',
    category: 'visual',
    emoji: '🍎',
    color: 'linear-gradient(135deg, #A29BFE 0%, #6C5CE7 100%)',
    difficulty: '中等',
    duration: '3-5分钟',
    mode: 'icon',
  },
  {
    taskId: 4,
    name: '视觉追踪',
    description: '追踪移动目标，训练视觉注意力和平滑 pursuit',
    category: 'visual',
    emoji: '🎯',
    color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    difficulty: '中等',
    duration: '1分钟',
    mode: 'track',
  },
  {
    taskId: 5,
    name: '声音辨别',
    description: '辨别不同音调，提升听觉敏锐度',
    category: 'audio',
    emoji: '🔊',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'diff',
  },
  {
    taskId: 6,
    name: '听指令做动作',
    description: '根据语音指令选择正确选项，训练听觉理解',
    category: 'audio',
    emoji: '🎧',
    color: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    difficulty: '中等',
    duration: '3-5分钟',
    mode: 'command',
  },
  {
    taskId: 7,
    name: '节奏模仿',
    description: '听节奏并模仿拍打，训练听觉序列记忆',
    category: 'audio',
    emoji: '🎵',
    color: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    difficulty: '困难',
    duration: '3-5分钟',
    mode: 'rhythm',
  },
]

export const SENSORY_GAME_SEED: SensoryGameSeed[] = BASE_SENSORY_GAME_SEED.map((game) => {
  const override = getTrainingResourceCopyOverride(buildSensoryGameResourceCopyKey(game.taskId))

  return {
    ...game,
    name: override?.name || game.name,
    description: override ? override.description : game.description,
  }
})
