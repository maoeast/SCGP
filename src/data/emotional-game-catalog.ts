import { ModuleCode, type ResourceItem } from '@/types/module'
import { getTrainingResourceCopyOverride } from '@/data/generated-training-resource-copy'
import { buildEmotionalGameResourceCopyKey } from '@/utils/training-resource-copy'

export interface EmotionalGameCatalogSeed {
  name: string
  description: string
  category: string
  tags: string[]
  coverImage: string
  metadata: Record<string, any>
}

export const EMOTIONAL_GAME_RESOURCE_SEED_LEGACY_SOURCE = 'emotional_game_seed_2026_03_30'

const BASE_EMOTIONAL_GAME_CATALOG_SEED: EmotionalGameCatalogSeed[] = [
  {
    name: '深呼吸热气球',
    description: '通过按住吸气、松开呼气的温和互动，帮助孩子练习平稳呼吸与自我安抚。',
    category: 'calming',
    tags: ['情绪安抚', '呼吸训练', '热气球'],
    coverImage: '🎈',
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
      trainingEntryCode: 'emotional-regulation',
    },
  },
  {
    name: '音量魔法森林',
    description: '对着麦克风用日常对话的音量说话，唤醒森林里的萤火虫和小动物，练习柔和的声音调节。',
    category: 'regulation',
    tags: ['情绪调节', '音量控制', '麦克风互动'],
    coverImage: '🎵',
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
      trainingEntryCode: 'emotional-regulation',
    },
  },
  {
    name: '擦亮坏心情',
    description: '用大范围、连续的手势擦掉冰霜，让底部的阳光笑脸慢慢亮起来，帮助孩子把坏心情释放出去。',
    category: 'release',
    tags: ['情绪释放', '大动作发泄', '刮擦互动', 'Canvas'],
    coverImage: '☀️',
    metadata: {
      emoji: '☀️',
      color: 'linear-gradient(135deg, #7fd6ff 0%, #8be0c8 46%, #ffd36e 100%)',
      duration: '3-5分钟',
      difficulty: '三级擦除进阶',
      entryPath: '/emotional/games/wipe-ice',
      gameCode: 'G04_WIPE_ICE',
      therapeuticGoal: '大动作发泄',
      previewDescription: '用整只手臂带着手指快速擦掉冰霜，让藏在下面的阳光笑脸一点点露出来。简单模式很快就会融化，中等模式停太久会慢慢结冰，困难模式要把厚厚的冰霜反复擦亮三次。',
      repeatPlayHint: '每次会轮换底部笑脸细节、冰霜裂纹和光点节奏，让孩子在不同状态下反复做大动作释放，慢慢把坏心情擦干净。',
      trainingEntryCode: 'emotional-regulation',
    },
  },
  {
    name: '喂食情绪小怪兽',
    description: '把合适的安抚工具拖给不同情绪颜色的小怪兽，帮助孩子练习情绪匹配、照顾他人与问题解决。',
    category: 'matching',
    tags: ['情绪匹配', '拖拽互动', '问题解决', '传送带挑战'],
    coverImage: '🧸',
    metadata: {
      emoji: '🧸',
      color: 'linear-gradient(135deg, #ffa86b 0%, #ff7fa3 38%, #7ad9c7 100%)',
      duration: '3-6分钟',
      difficulty: '三级拖拽进阶',
      entryPath: '/emotional/games/monster',
      gameCode: 'G07_MONSTER',
      therapeuticGoal: '认知匹配',
      previewDescription: '把水杯、拥抱、耳罩等安抚工具拖给对应情绪颜色的小怪兽。简单模式只有 1 只怪兽和 2 个工具，中等模式会同时出现 2 只怪兽和更多干扰项，困难模式里工具还会放在缓慢移动的传送带上。',
      repeatPlayHint: '每次会轮换怪兽组合、工具顺序和 L3 传送带节奏，让孩子在反复练习中慢慢学会”谁现在需要什么安抚工具”。',
      trainingEntryCode: 'emotional-regulation',
    },
  },
  {
    name: '表情能量球',
    description: '通过摄像头实时捕捉面部表情，引导孩子练习开心、惊讶和深呼吸放松，用表情能量点亮关卡。',
    category: 'expression',
    tags: ['情绪识别', '面部表情', '摄像头互动', 'MediaPipe'],
    coverImage: '🔮',
    metadata: {
      emoji: '🔮',
      color: 'linear-gradient(135deg, #ffd93d 0%, #ff6b6b 50%, #74b9ff 100%)',
      duration: '3-5分钟',
      difficulty: '三级递进',
      entryPath: '/emotional/games/energy-ball',
      gameCode: 'G08_ENERGY_BALL',
      therapeuticGoal: '面部肌肉训练',
      previewDescription: '对着摄像头做出开心、惊讶的表情，或者闭眼深呼吸放松，让能量球充满并完成每个关卡。',
      repeatPlayHint: '每次会轮换关卡顺序和视觉主题，帮助孩子在反复练习中逐步增强面部肌肉控制力。',
      trainingEntryCode: 'emotional-regulation',
    },
  },
]

export const EMOTIONAL_GAME_CATALOG_SEED: EmotionalGameCatalogSeed[] = BASE_EMOTIONAL_GAME_CATALOG_SEED.map((game) => {
  const gameCode = typeof game.metadata?.gameCode === 'string' ? game.metadata.gameCode : ''
  const override = getTrainingResourceCopyOverride(buildEmotionalGameResourceCopyKey(gameCode))

  return {
    ...game,
    name: override?.name || game.name,
    description: override ? override.description : game.description,
    metadata: {
      ...game.metadata,
      previewDescription: override ? override.previewDescription : game.metadata.previewDescription,
      repeatPlayHint: override ? override.repeatPlayHint : game.metadata.repeatPlayHint,
    },
  }
})

export function createEmotionalGameCatalog(): ResourceItem[] {
  return EMOTIONAL_GAME_CATALOG_SEED.map((game, index) => ({
    id: -1001 - index,
    moduleCode: ModuleCode.EMOTIONAL,
    resourceType: 'game',
    name: game.name,
    description: game.description,
    category: game.category,
    tags: [...game.tags],
    coverImage: game.coverImage,
    isCustom: false,
    isActive: true,
    metadata: { ...game.metadata },
  }))
}

export function getEmotionalGameCount() {
  return EMOTIONAL_GAME_CATALOG_SEED.length
}
