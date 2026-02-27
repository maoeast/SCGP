/**
 * 器材训练模块类型定义
 */

/**
 * 7大感官套装分类
 */
export type EquipmentCategory =
  | 'tactile'        // 触觉系统套装
  | 'olfactory'      // 嗅觉系统套装
  | 'visual'         // 视觉系统套装
  | 'auditory'       // 听觉系统套装
  | 'gustatory'      // 味觉系统套装
  | 'proprioceptive' // 本体觉系统套装
  | 'integration'    // 感官综合箱套装

/**
 * 辅助等级 (5级)
 */
export enum PromptLevel {
  INDEPENDENT = 1,  // 独立
  VERBAL = 2,       // 口头提示
  VISUAL = 3,       // 视觉提示
  TOUCH = 4,        // 手触提示
  PHYSICAL = 5      // 身体辅助
}

/**
 * 辅助等级中文标签
 */
export const PROMPT_LEVEL_LABELS: Record<PromptLevel, string> = {
  [PromptLevel.INDEPENDENT]: '独立',
  [PromptLevel.VERBAL]: '口头提示',
  [PromptLevel.VISUAL]: '视觉提示',
  [PromptLevel.TOUCH]: '手触提示',
  [PromptLevel.PHYSICAL]: '身体辅助'
}

/**
 * 器材分类中文标签
 */
export const CATEGORY_LABELS: Record<EquipmentCategory, string> = {
  tactile: '触觉系统套装',
  olfactory: '嗅觉系统套装',
  visual: '视觉系统套装',
  auditory: '听觉系统套装',
  gustatory: '味觉系统套装',
  proprioceptive: '本体觉系统套装',
  integration: '感官综合箱套装'
}

/**
 * 器材分类颜色标识
 */
export const CATEGORY_COLORS: Record<EquipmentCategory, string> = {
  tactile: '#FF6B6B',       // 触觉 - 红色
  olfactory: '#4ECDC4',     // 嗅觉 - 青色
  visual: '#45B7D1',        // 视觉 - 蓝色
  auditory: '#FFA07A',      // 听觉 - 橙色
  gustatory: '#98D8C8',     // 味觉 - 绿色
  proprioceptive: '#F7DC6F',// 本体觉 - 黄色
  integration: '#BB8FCE'    // 综合 - 紫色
}

/**
 * 器材主数据
 */
export interface EquipmentCatalog {
  id: number
  category: EquipmentCategory
  sub_category: string
  name: string
  description: string
  ability_tags: string[]  // 能力标签
  image_url: string
  is_active: number       // 0 或 1
  created_at: string
}

/**
 * 器材训练记录
 */
export interface EquipmentTrainingRecord {
  id: number
  student_id: number
  equipment_id: number
  score: number           // 1-5
  prompt_level: PromptLevel
  duration_seconds?: number
  notes?: string
  generated_comment?: string  // IEP评语
  training_date: string
  teacher_name?: string
  environment?: string
  batch_id?: number
  created_at: string
}

/**
 * 器材训练批次
 */
export interface EquipmentTrainingBatch {
  id: number
  student_id: number
  batch_name: string
  training_date: string
  notes?: string
  created_at: string
}

/**
 * 带历史记录的器材卡片数据
 */
export interface EquipmentWithHistory extends EquipmentCatalog {
  last_score?: number         // 该学生上次评分
  last_prompt_level?: PromptLevel
  last_date?: string
}

/**
 * 创建器材训练记录的输入数据（不包含自动生成的字段）
 */
export type CreateEquipmentTrainingRecordInput = Omit<
  EquipmentTrainingRecord,
  'id' | 'created_at'
>

/**
 * 创建器材批次的输入数据
 */
export type CreateEquipmentBatchInput = Omit<
  EquipmentTrainingBatch,
  'id' | 'created_at'
>

/**
 * 带器材信息的训练记录（用于列表展示）
 */
export interface EquipmentTrainingRecordWithEquipment extends EquipmentTrainingRecord {
  equipment_name: string
  equipment_image: string
  category: EquipmentCategory
  sub_category: string
  description?: string
  ability_tags?: string[]
  student_name?: string
  legacy_id?: number  // 旧表 ID（用于图片加载）
}
