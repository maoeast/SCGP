import { ModuleCode, type ResourceItem } from '@/types/module'

export const EMOTIONAL_GAME_CATALOG: ResourceItem[] = [
  {
    id: -1001,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'game',
    name: '深呼吸热气球',
    description: '通过按住吸气、松开呼气的温和互动，帮助孩子练习平稳呼吸与自我安抚。',
    category: 'calming',
    tags: ['情绪安抚', '呼吸训练', '热气球'],
    coverImage: '🎈',
    isCustom: false,
    isActive: true,
    metadata: {
      emoji: '🎈',
      color: 'linear-gradient(135deg, #ff9a8b 0%, #ff6a88 100%)',
      duration: '2-4分钟',
      difficulty: '三级递进',
      entryPath: '/emotional/games/balloon',
      gameCode: 'G01_BALLOON',
      therapeuticGoal: '生理安抚',
      repeatPlayHint: '每次进入都会轮换天空主题、任务目标和云层节奏，可根据孩子当下状态反复练习。',
    },
  },
]

export function getEmotionalGameCount() {
  return EMOTIONAL_GAME_CATALOG.length
}
