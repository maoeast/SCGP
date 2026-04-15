import { ModuleCode } from '@/types/module'
import type { CustomGameCode, EmotionGameBadgePayload } from '@/types/emotional/games'
import type { TrainingEntryCode } from '@/utils/training-entry'

export type CustomGamePermission = 'microphone' | 'camera'
export type CustomGamePermissionPolicy = 'all_required' | 'degradable'

export interface CustomGameBadgeDefinition {
  badgeCode: string
  badgeName: string
  visualThemeTag: string
  iconToken: string
  paletteToken: string
}

export interface CustomGameDefinition {
  gameCode: CustomGameCode
  name: string
  description: string
  moduleCode: ModuleCode
  trainingEntryCode: TrainingEntryCode
  entryPath: string
  category: string
  tags: string[]
  coverImage: string
  maxPlayers: 1 | 2
  requiredPermissions: CustomGamePermission[]
  permissionPolicy: CustomGamePermissionPolicy
  difficultyLocked: boolean
  badge: CustomGameBadgeDefinition
  metadata: Record<string, any>
}

export const CUSTOM_GAME_REGISTRY: ReadonlyArray<CustomGameDefinition> = [
  {
    gameCode: 'G01_BALLOON',
    name: '深呼吸热气球',
    description: '通过按住吸气、松开呼气的温和互动，帮助孩子练习平稳呼吸与自我安抚。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'emotional-regulation',
    entryPath: '/emotional/games/balloon',
    category: 'calming',
    tags: ['情绪安抚', '呼吸训练', '热气球'],
    coverImage: '🎈',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_CALM_WIND',
      badgeName: '平静微风徽章',
      visualThemeTag: 'breath-sky',
      iconToken: 'balloon-breeze',
      paletteToken: 'warm-sunset',
    },
    metadata: {
      emoji: '🎈',
      color: 'linear-gradient(135deg, #ff9a8b 0%, #ff6a88 100%)',
      duration: '2-4分钟',
      difficulty: '三级递进',
      therapeuticGoal: '生理安抚',
      previewDescription: '按住主按钮慢慢吸气，松开时轻轻呼气，帮助热气球平稳升空，练习柔和呼吸与自我安抚。',
      repeatPlayHint: '每次进入都会轮换天空主题、任务目标和云层节奏，可根据孩子当下状态反复练习。',
    },
  },
  {
    gameCode: 'G03_FOREST',
    name: '音量魔法森林',
    description: '对着麦克风用日常对话的音量说话，唤醒森林里的萤火虫和小动物，练习柔和的声音调节。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'emotional-regulation',
    entryPath: '/emotional/games/forest',
    category: 'regulation',
    tags: ['情绪调节', '音量控制', '麦克风互动'],
    coverImage: '🎵',
    maxPlayers: 1,
    requiredPermissions: ['microphone'],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_MAGIC_VOICE',
      badgeName: '魔法声音徽章',
      visualThemeTag: 'voice-forest',
      iconToken: 'forest-note',
      paletteToken: 'forest-night',
    },
    metadata: {
      emoji: '🎵',
      color: 'linear-gradient(135deg, #15324a 0%, #2e6b66 52%, #f6c667 100%)',
      duration: '3-5分钟',
      difficulty: '三级音量进阶',
      therapeuticGoal: '声控调节',
      previewDescription: '先和森林一起安静 2 秒，再用平时说话的声音对小熊说一句“你好”，之后把音量稳定在日常对话区间，唤醒萤火虫和小动物。',
      repeatPlayHint: '每次会轮换小动物组合、森林地形和灯泡颜色，让孩子在反复练习中慢慢找到“魔法声音”。',
    },
  },
  {
    gameCode: 'G04_WIPE_ICE',
    name: '擦亮坏心情',
    description: '用大范围、连续的手势擦掉冰霜，让底部的阳光笑脸慢慢亮起来，帮助孩子把坏心情释放出去。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'emotional-regulation',
    entryPath: '/emotional/games/wipe-ice',
    category: 'release',
    tags: ['情绪释放', '大动作发泄', '刮擦互动', 'Canvas'],
    coverImage: '☀️',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_SUNSHINE_SMILE',
      badgeName: '阳光笑脸徽章',
      visualThemeTag: 'sunny-release',
      iconToken: 'sun-glow',
      paletteToken: 'ice-sunrise',
    },
    metadata: {
      emoji: '☀️',
      color: 'linear-gradient(135deg, #7fd6ff 0%, #8be0c8 46%, #ffd36e 100%)',
      duration: '3-5分钟',
      difficulty: '三级擦除进阶',
      therapeuticGoal: '大动作发泄',
      previewDescription: '用整只手臂带着手指快速擦掉冰霜，让藏在下面的阳光笑脸一点点露出来。简单模式很快就会融化，中等模式停太久会慢慢结冰，困难模式要把厚厚的冰霜反复擦亮三次。',
      repeatPlayHint: '每次会轮换底部笑脸细节、冰霜裂纹和光点节奏，让孩子在不同状态下反复做大动作释放，慢慢把坏心情擦干净。',
    },
  },
  {
    gameCode: 'G07_MONSTER',
    name: '喂食情绪小怪兽',
    description: '把合适的安抚工具拖给不同情绪颜色的小怪兽，帮助孩子练习情绪匹配、照顾他人与问题解决。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'emotional-regulation',
    entryPath: '/emotional/games/monster',
    category: 'matching',
    tags: ['情绪匹配', '拖拽互动', '问题解决', '传送带挑战'],
    coverImage: '🧸',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_EMOTION_MANAGER',
      badgeName: '情绪小管家徽章',
      visualThemeTag: 'monster-care',
      iconToken: 'monster-helper',
      paletteToken: 'candy-monster',
    },
    metadata: {
      emoji: '🧸',
      color: 'linear-gradient(135deg, #ffa86b 0%, #ff7fa3 38%, #7ad9c7 100%)',
      duration: '3-6分钟',
      difficulty: '三级拖拽进阶',
      therapeuticGoal: '认知匹配',
      previewDescription: '把水杯、拥抱、耳罩等安抚工具拖给对应情绪颜色的小怪兽。简单模式只有 1 只怪兽和 2 个工具，中等模式会同时出现 2 只怪兽和更多干扰项，困难模式里工具还会放在缓慢移动的传送带上。',
      repeatPlayHint: '每次会轮换怪兽组合、工具顺序和 L3 传送带节奏，让孩子在反复练习中慢慢学会“谁现在需要什么安抚工具”。',
    },
  },
  {
    gameCode: 'G08_ENERGY_BALL',
    name: '表情能量球',
    description: '通过摄像头实时捕捉面部表情，引导孩子练习开心、惊讶和深呼吸放松，用表情能量点亮关卡。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'emotional-regulation',
    entryPath: '/emotional/games/energy-ball',
    category: 'expression',
    tags: ['情绪识别', '面部表情', '摄像头互动', 'MediaPipe'],
    coverImage: '🔮',
    maxPlayers: 1,
    requiredPermissions: ['camera'],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_EXPRESSION_STAR',
      badgeName: '表情达人徽章',
      visualThemeTag: 'expression-energy',
      iconToken: 'orb-expression',
      paletteToken: 'prism-spark',
    },
    metadata: {
      emoji: '🔮',
      color: 'linear-gradient(135deg, #ffd93d 0%, #ff6b6b 50%, #74b9ff 100%)',
      duration: '3-5分钟',
      difficulty: '三级递进',
      therapeuticGoal: '面部肌肉训练',
      previewDescription: '对着摄像头做出开心、惊讶的表情，或者闭眼深呼吸放松，让能量球充满并完成每个关卡。',
      repeatPlayHint: '每次会轮换关卡顺序和视觉主题，帮助孩子在反复练习中逐步增强面部肌肉控制力。',
    },
  },
  {
    gameCode: 'F01_CLOUD_ERASE',
    name: '\u4e91\u6735\u64e6\u64e6\u64e6',
    description: '\u901a\u8fc7\u7a33\u5b9a\u7684\u5927\u8303\u56f4\u64e6\u62ed\u52a8\u4f5c\u62e8\u5f00\u4e91\u5c42\uff0c\u5e2e\u52a9\u5b69\u5b50\u7ec3\u4e60\u624b\u773c\u534f\u8c03\u4e0e\u6301\u7eed\u7cbe\u7ec6\u63a7\u5236\u3002',
    moduleCode: ModuleCode.SENSORY,
    trainingEntryCode: 'fine-motor',
    entryPath: '/emotional/games/cloud-erase',
    category: 'coordination',
    tags: [
      '\u7cbe\u7ec6\u52a8\u4f5c',
      '\u64e6\u9664\u4ea4\u4e92',
      'Canvas',
      '\u624b\u773c\u534f\u8c03',
    ],
    coverImage: '\u2601\ufe0f',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_CLEAR_SKY',
      badgeName: '\u6674\u7a7a\u5de7\u624b\u5fbd\u7ae0',
      visualThemeTag: 'clear-sky',
      iconToken: 'cloud-swipe',
      paletteToken: 'sky-mint',
    },
    metadata: {
      emoji: '\u2601\ufe0f',
      color: 'linear-gradient(135deg, #9be7ff 0%, #d5f4ff 48%, #ffe38a 100%)',
      duration: '3-5\u5206\u949f',
      difficulty: '\u4e09\u7ea7\u64e6\u9664\u8fdb\u9636',
      therapeuticGoal: '\u624b\u773c\u534f\u8c03',
      previewDescription: '\u7528\u6574\u53ea\u624b\u6301\u7eed\u5730\u628a\u4e91\u5c42\u64e6\u5f00\uff0c\u8ba9\u84dd\u5929\u4e00\u70b9\u70b9\u9732\u51fa\u6765\u3002\u7b80\u5355\u6a21\u5f0f\u66f4\u5bb9\u6613\u64e6\u51c0\uff0c\u4e2d\u7b49\u6a21\u5f0f\u9700\u8981\u4fdd\u6301\u8fde\u7eed\u52a8\u4f5c\uff0c\u56f0\u96be\u6a21\u5f0f\u8981\u53cd\u590d\u628a\u539a\u4e91\u5c42\u64e6\u4eae\u3002',
      repeatPlayHint: '\u6bcf\u6b21\u8fdb\u5165\u90fd\u53ef\u4ee5\u5207\u6362\u4e91\u5c42\u8282\u594f\u3001\u80cc\u666f\u914d\u8272\u548c\u76ee\u6807\u8986\u76d6\u533a\u57df\uff0c\u8ba9\u5b69\u5b50\u5728\u53cd\u590d\u7ec3\u4e60\u4e2d\u7a33\u5b9a\u624b\u90e8\u63a7\u5236\u3002',
    },
  },
  {
    gameCode: 'F05_BALLOONS',
    name: '刺破慢气球',
    description: '在合适的时机轻轻点破慢慢飘来的气球，帮助孩子练习抑制控制、手眼协调与稳定出手。',
    moduleCode: ModuleCode.SENSORY,
    trainingEntryCode: 'fine-motor',
    entryPath: '/emotional/games/balloons',
    category: 'inhibition',
    tags: ['精细动作', '抑制控制', '点击互动', '手眼协调'],
    coverImage: '🎈',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_STEADY_POP',
      badgeName: '稳稳出手徽章',
      visualThemeTag: 'steady-pop',
      iconToken: 'balloon-tap',
      paletteToken: 'sunrise-balloons',
    },
    metadata: {
      emoji: '🎈',
      color: 'linear-gradient(135deg, #ffd36e 0%, #ff9f7f 46%, #8fd8ff 100%)',
      duration: '3-5分钟',
      difficulty: '三级等待进阶',
      therapeuticGoal: '抑制控制',
      previewDescription: '看着慢气球轻轻飘进金色圈，再稳稳地轻点一下。简单模式的等待区更宽，中等模式需要更稳地等时机，困难模式里还会混入需要先放行的休息气球。',
      repeatPlayHint: '每次进入都会轮换天空主题、气球颜色和飘动节奏，让孩子在反复练习中慢慢学会“先等一等，再出手”。',
    },
  },
  {
    gameCode: 'C01_DANDELION',
    name: '吹蒲公英',
    description: '通过按住吸气、松开轻吹的柔和互动，帮助孩子练习平稳呼吸、身体放松与安抚转换。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'soothing-aids',
    entryPath: '/emotional/games/dandelion',
    category: 'calming',
    tags: ['安抚教具', '呼吸训练', '放松调节', '蒲公英'],
    coverImage: '🌼',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_SOFT_SEED',
      badgeName: '轻柔飞絮徽章',
      visualThemeTag: 'dandelion-breeze',
      iconToken: 'dandelion-seed',
      paletteToken: 'meadow-breeze',
    },
    metadata: {
      emoji: '🌼',
      color: 'linear-gradient(135deg, #c7f0d8 0%, #f7f2c6 48%, #ffd6b0 100%)',
      duration: '2-4分钟',
      difficulty: '三级呼吸进阶',
      therapeuticGoal: '安抚放松',
      previewDescription: '按住主按钮慢慢吸气，让蒲公英绒球轻轻蓄满风；松开时再把种子柔和地吹向空中。简单模式更容易完成，中等模式需要更稳定地控制节奏，困难模式会要求更完整的吸气与轻吹配合。',
      repeatPlayHint: '每次进入都会轮换草地配色、风向轨迹和种子散开节奏，让孩子在反复练习中慢慢找到舒服、平稳的呼吸感觉。',
    },
  },
  {
    gameCode: 'C04_HOURGLASS',
    name: '魔法沙漏',
    description: '通过安静观察沙粒缓缓流动的倒计时互动，帮助孩子练习等待、专注和情绪平复。',
    moduleCode: ModuleCode.EMOTIONAL,
    trainingEntryCode: 'soothing-aids',
    entryPath: '/emotional/games/hourglass',
    category: 'calming',
    tags: ['安抚教具', '视觉计时', '等待练习', '沙漏'],
    coverImage: '⏳',
    maxPlayers: 1,
    requiredPermissions: [],
    permissionPolicy: 'all_required',
    difficultyLocked: false,
    badge: {
      badgeCode: 'BADGE_SAND_CALM',
      badgeName: '静心沙光徽章',
      visualThemeTag: 'hourglass-calm',
      iconToken: 'hourglass-sand',
      paletteToken: 'amber-sand',
    },
    metadata: {
      emoji: '⏳',
      color: 'linear-gradient(135deg, #f6d7a7 0%, #f4b183 45%, #8ec5d6 100%)',
      duration: '2-4分钟',
      difficulty: '三级等待进阶',
      therapeuticGoal: '等待安抚',
      previewDescription: '看着发光的沙粒一点点落下，在沙漏流完前保持身体安静、呼吸平稳。简单模式时长更短，中等模式需要更稳定地坚持等待，困难模式会加入更长的倒计时和更细的节奏提示。',
      repeatPlayHint: '可根据孩子当下状态反复练习，并通过难度调整等待时长，慢慢建立“安静等一等”的稳定感。',
    },
  },
]

const CUSTOM_GAME_REGISTRY_MAP = new Map<string, CustomGameDefinition>(
  CUSTOM_GAME_REGISTRY.map((definition) => [definition.gameCode, definition]),
)

export function listCustomGameDefinitions(): CustomGameDefinition[] {
  return [...CUSTOM_GAME_REGISTRY]
}

export function getCustomGameDefinition(gameCode: string): CustomGameDefinition | null {
  return CUSTOM_GAME_REGISTRY_MAP.get(gameCode) || null
}

export function getRequiredCustomGameDefinition(gameCode: string): CustomGameDefinition {
  const definition = getCustomGameDefinition(gameCode)
  if (!definition) {
    throw new Error(`Unknown custom game definition: ${gameCode}`)
  }

  return definition
}

export function getCustomGamesByTrainingEntry(trainingEntryCode: TrainingEntryCode): CustomGameDefinition[] {
  return CUSTOM_GAME_REGISTRY.filter((definition) => definition.trainingEntryCode === trainingEntryCode)
}

export function getCustomGameCodes(): string[] {
  return CUSTOM_GAME_REGISTRY.map((definition) => definition.gameCode)
}

export function getCustomGameBadgePayload(gameCode: string): EmotionGameBadgePayload | undefined {
  const definition = getCustomGameDefinition(gameCode)
  if (!definition) {
    return undefined
  }

  return {
    badgeCode: definition.badge.badgeCode,
    badgeName: definition.badge.badgeName,
  }
}
