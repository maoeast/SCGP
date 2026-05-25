// 游戏类型定义

/**
 * 任务ID枚举
 */
export enum TaskID {
  COLOR_MATCH = 1,      // 颜色配对
  SHAPE_MATCH = 2,      // 形状识别
  ICON_MATCH = 3,       // 物品配对
  VISUAL_TRACK = 4,     // 视觉追踪
  AUDIO_DIFF = 5,       // 声音辨别
  AUDIO_COMMAND = 6,    // 听指令做动作
  AUDIO_RHYTHM = 7,     // 节奏模仿
  HAND_XYLOPHONE = 8,   // 空气木琴
  HAND_WOOD_BLOCKS = 9, // 木块磁贴拼图
  HAND_GESTURE_GARDEN = 10 // 森林手势魔法屋
}

/**
 * GameGrid 游戏模式
 */
export type GameGridMode = 'color' | 'shape' | 'icon'

/**
 * GameAudio 游戏模式
 */
export type GameAudioMode = 'diff' | 'command' | 'rhythm'

/**
 * 摄像头手势游戏模式
 */
export type GameHandMode = 'hand-xylophone' | 'wood-blocks' | 'gesture-garden'

/**
 * 网格尺寸
 */
export type GridSize = 2 | 3 | 4

/**
 * 干扰级别
 */
export type DistractorLevel = 'low' | 'medium' | 'high'

/**
 * 游戏配置接口
 */
export interface GameConfig {
  taskId: TaskID
  gridSize?: GridSize
  distractorLevel?: DistractorLevel
  timeLimit?: number // 秒
  rounds?: number // 轮次数量
}

/**
 * 颜色定义 - 扩展为12种颜色，支持4x4网格不重复
 * 注意：颜色选择考虑区分度，避免相近色调
 */
export const GAME_COLORS = {
  red: '#FF4444',      // 鲜红
  blue: '#0066FF',     // 标准蓝（原#4ECDC4是青绿色，已修正）
  yellow: '#FFD700',   // 金黄
  green: '#00CC66',    // 鲜绿（与蓝色区分明显）
  orange: '#FF8800',   // 橙色
  purple: '#9932CC',   // 紫罗兰
  pink: '#FF69B4',     // 热粉
  cyan: '#00DDFF',     // 青色（天蓝）
  lime: '#32CD32',     // 酸橙绿
  coral: '#FF6347',    // 珊瑚红
  teal: '#20B2AA',     // 浅海绿
  indigo: '#4B0082'    // 靛蓝
} as const

export type GameColor = keyof typeof GAME_COLORS

/**
 * 形状定义 - 扩展为8种形状，支持4x4网格不重复
 */
export const GAME_SHAPES = {
  circle: 'circle',
  square: 'square',
  triangle: 'triangle',
  hexagon: 'hexagon',
  star: 'star',
  trapezoid: 'trapezoid',
  diamond: 'diamond',
  rightTriangle: 'rightTriangle'
} as const

export type GameShape = keyof typeof GAME_SHAPES

/**
 * 图标定义 - 扩展为30种图标，支持4x4网格不重复，包含水果、蔬菜、动物、植物等
 */
export const GAME_ICONS = {
  // 原有图标
  apple: '🍎',
  car: '🚗',
  dog: '🐕',
  cat: '🐱',
  star: '⭐',
  heart: '❤️',
  ball: '⚽',
  flower: '🌸',
  moon: '🌙',
  sun: '☀️',
  fish: '🐟',
  bird: '🐦',
  // 新增水果类
  tomato: '🍅',
  kiwi: '🥝',
  lemon: '🍋',
  strawberry: '🍓',
  // 新增蔬菜类
  corn: '🌽',
  carrot: '🥕',
  mushroom: '🍄',
  // 新增食物类
  hamburger: '🍔',
  lollipop: '🍭',
  // 新增动物类
  cow: '🐮',
  rabbit: '🐰',
  swan: '🦢',
  duck: '🦆',
  frog: '🐸',
  shrimp: '🦐',
  butterfly: '🦋',
  tiger: '🐯',
  // 新增植物类
  sunflower: '🌻',
  // 新增运动类
  basketball: '🏀',
  football: '🏈'
} as const

export type GameIcon = keyof typeof GAME_ICONS

/**
 * Grid 项目数据结构
 */
export interface GridItem {
  id: number
  type: 'color' | 'shape' | 'icon'
  color?: GameColor
  shape?: GameShape
  icon?: GameIcon
  isTarget: boolean
  isSelected: boolean
  isCorrect?: boolean
}

/**
 * 游戏试次数据
 */
export interface TrialData {
  trialId: number
  target: GridItem
  options: GridItem[]
  userChoice: number | null // 点击的item id
  isCorrect: boolean
  responseTime: number // 毫秒
  isOmission: boolean // 漏报
  isCommission: boolean // 误报
  timestamp: number
}

/**
 * 视觉追踪数据
 */
export interface TrackingData {
  timeOnTarget: number // 在目标上的时间（毫秒）
  totalTime: number // 总时间（毫秒）
  timeOnTargetPercent: number // 在靶时间百分比
  samplePoints: Array<{
    time: number
    onTarget: boolean
    distancePx?: number
    pointer?: { x: number; y: number } | null
    target?: { x: number; y: number }
  }> // 采样点
}

/**
 * 音频游戏数据
 */
export interface AudioTrialData {
  trialId: number
  mode: GameAudioMode
  // 辨别模式
  sounds?: number[]
  userAnswer?: boolean | null // true=一样 false=不一样
  // 指令模式
  command?: string
  targetAttributes?: { color?: GameColor; shape?: GameShape }
  userSelection?: GridItem
  // 节奏模式
  rhythmPattern?: number[] // 时间戳数组
  userRhythm?: number[]
  rhythmStats?: {
    timingErrorAvg: number
    accuracy?: number
  }
  // 通用
  isCorrect: boolean
  responseTime: number
  timestamp: number
}

/**
 * 完整游戏会话数据
 */
export interface GameSessionData {
  taskId: TaskID
  studentId: number
  startTime: number
  endTime: number
  duration: number // 秒
  trials: TrialData[] | AudioTrialData[]
  trackingData?: TrackingData

  // 统计数据
  totalTrials: number
  correctTrials: number
  accuracy: number // 0-1
  avgResponseTime: number // 毫秒

  // 错误分析
  errors: {
    omission: number // 漏报次数
    commission: number // 误报次数
  }

  // 行为特征
  behavior: {
    impulsivityScore: number // 0-100
    fatigueIndex: number // 后半程/前半程准确率比值
    distractorPattern?: string
  }

  // 特定任务的额外数据
  rhythmStats?: {
    timingErrorAvg: number // 平均节奏偏差（毫秒）
    accuracy?: number // 节奏准确率（百分比）
  }

  trackingStats?: {
    timeOnTargetPercent: number
    useEyeTracking?: boolean
    followStability?: number
    breakCount?: number
    longestStreakMs?: number
    inputMode?: 'pointer' | 'touch' | 'mouse' | 'eye'
  }

  handGameStats?: {
    handTrackingUsed: boolean
    pointerFallbackUsed: boolean
    gestureEvents: number
    completionScore: number
  }
}

/**
 * IEP 报告段落
 */
export interface IEPReportSection {
  category: string // 类别，如"视觉辨别"、"听觉统合"
  performance: string // 表现描述
  behavior?: string // 行为特征分析
  suggestions: string[] // 训练建议
}

/**
 * IEP 完整报告
 */
export interface IEPReport {
  studentName: string
  taskId: TaskID
  taskName: string
  reportDate: string
  sections: IEPReportSection[]
  summary: string // 总体评估
}

/**
 * 难度级别定义
 */
export interface DifficultyLevel {
  level: number
  name: string
  description: string
  gridSize: GridSize
  distractorCount: number // 干扰项数量
  timeLimit: number // 秒
}
