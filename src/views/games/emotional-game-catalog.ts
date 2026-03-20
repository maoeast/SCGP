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
      previewDescription: '按住主按钮慢慢吸气，松开时轻轻呼气，帮助热气球平稳升空，练习柔和呼吸与自我安抚。',
      repeatPlayHint: '每次进入都会轮换天空主题、任务目标和云层节奏，可根据孩子当下状态反复练习。',
    },
  },
  {
    id: -1002,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'game',
    name: '音量魔法森林',
    description: '对着麦克风用日常对话的音量说话，唤醒森林里的萤火虫和小动物，练习柔和的声音调节。',
    category: 'regulation',
    tags: ['情绪调节', '音量控制', '麦克风互动'],
    coverImage: '🎵',
    isCustom: false,
    isActive: true,
    metadata: {
      emoji: '🎵',
      color: 'linear-gradient(135deg, #15324a 0%, #2e6b66 52%, #f6c667 100%)',
      duration: '3-5分钟',
      difficulty: '三级音量进阶',
      entryPath: '/emotional/games/forest',
      gameCode: 'G03_FOREST',
      therapeuticGoal: '声控调节',
      previewDescription: '先和森林一起安静 2 秒，再用平时说话的声音对小熊说一句“你好”，之后把音量稳定在日常对话区间，唤醒萤火虫和小动物。',
      repeatPlayHint: '每次会轮换小动物组合、森林地形和灯泡颜色，让孩子在反复练习中慢慢找到“魔法声音”。',
    },
  },
]

export function getEmotionalGameCount() {
  return EMOTIONAL_GAME_CATALOG.length
}
