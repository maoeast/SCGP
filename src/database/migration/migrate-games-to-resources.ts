/**
 * 游戏资源迁移脚本
 *
 * 功能：将硬编码的游戏数据迁移到 sys_training_resource 表
 * 日期：2026-02-28
 * 任务：游戏训练模块重构 - 任务2
 */

import { getDatabase } from '../init'

/**
 * 游戏元数据接口
 */
interface GameMetadata {
  taskId: number       // 原 TaskID，用于挂载游戏引擎
  mode: string         // 游戏模式参数
  difficulty: string   // 难度
  duration: string     // 预计时长
  emoji: string        // emoji 图标
  color: string        // 背景渐变色
}

/**
 * 游戏定义接口
 */
interface GameDefinition {
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

// 游戏定义（从 GamesMenu.vue 迁移）
const GAMES: GameDefinition[] = [
  // 视觉游戏
  {
    taskId: 1,
    name: '颜色配对',
    description: '识别和匹配不同颜色，提升视觉辨别能力',
    category: 'visual',
    emoji: '🎨',
    color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'color'
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
    mode: 'shape'
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
    mode: 'icon'
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
    mode: 'track'
  },
  // 听觉游戏
  {
    taskId: 5,
    name: '声音辨别',
    description: '辨别不同音调，提升听觉敏锐度',
    category: 'audio',
    emoji: '🔊',
    color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    difficulty: '简单',
    duration: '3-5分钟',
    mode: 'diff'
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
    mode: 'command'
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
    mode: 'rhythm'
  }
]

/**
 * 获取原始数据库对象
 */
function getRawDB(): any {
  const db = getDatabase()
  if (db && typeof db.getRawDB === 'function') {
    return db.getRawDB()
  }
  return db
}

/**
 * 检查是否需要迁移
 */
export function needsGameMigration(): boolean {
  const db = getRawDB()
  if (!db) return false

  try {
    // 检查是否已有游戏资源
    const result = db.exec(`
      SELECT COUNT(*) as count FROM sys_training_resource
      WHERE resource_type = 'game'
    `)

    if (result.length > 0 && result[0].values.length > 0) {
      const count = result[0].values[0][0] as number
      return count < GAMES.length
    }
    return true
  } catch (error) {
    console.warn('[needsGameMigration] 检查失败:', error)
    return true
  }
}

/**
 * 执行游戏资源迁移
 */
export async function migrateGamesToResources(): Promise<{
  success: boolean
  message: string
  migratedCount?: number
}> {
  const db = getRawDB()

  if (!db) {
    return { success: false, message: '数据库未初始化' }
  }

  try {
    console.log('[GameMigration] 开始迁移游戏资源...')

    let migratedCount = 0

    for (const game of GAMES) {
      // 检查是否已存在（通过 legacy_id 判断）
      const existingResult = db.exec(`
        SELECT id FROM sys_training_resource
        WHERE resource_type = 'game' AND legacy_id = ${game.taskId}
      `)

      if (existingResult.length > 0 && existingResult[0].values.length > 0) {
        console.log(`[GameMigration] 游戏 "${game.name}" 已存在，跳过`)
        continue
      }

      // 构建元数据
      const metaData: GameMetadata = {
        taskId: game.taskId,
        mode: game.mode,
        difficulty: game.difficulty,
        duration: game.duration,
        emoji: game.emoji,
        color: game.color
      }

      // 插入游戏资源
      db.run(`
        INSERT INTO sys_training_resource (
          module_code,
          resource_type,
          name,
          category,
          description,
          cover_image,
          is_custom,
          is_active,
          legacy_id,
          legacy_source,
          meta_data,
          usage_count,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        'sensory',                    // module_code
        'game',                       // resource_type
        game.name,                    // name
        game.category,                // category
        game.description,             // description
        game.emoji,                   // cover_image (存 emoji)
        0,                            // is_custom
        1,                            // is_active
        game.taskId,                  // legacy_id
        'games_menu',                 // legacy_source
        JSON.stringify(metaData),     // meta_data
        0                             // usage_count
      ])

      migratedCount++
      console.log(`[GameMigration] ✓ 迁移游戏: ${game.name} (taskId=${game.taskId})`)
    }

    console.log(`[GameMigration] 迁移完成，共迁移 ${migratedCount} 个游戏`)

    return {
      success: true,
      message: `成功迁移 ${migratedCount} 个游戏资源`,
      migratedCount
    }
  } catch (error) {
    console.error('[GameMigration] 迁移失败:', error)
    return {
      success: false,
      message: `迁移失败: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}

/**
 * 验证迁移结果
 */
export function verifyGameMigration(): {
  passed: boolean
  errors: string[]
  stats: {
    total: number
    visual: number
    audio: number
  }
} {
  const db = getRawDB()
  const errors: string[] = []

  if (!db) {
    return {
      passed: false,
      errors: ['数据库未初始化'],
      stats: { total: 0, visual: 0, audio: 0 }
    }
  }

  try {
    // 统计游戏数量
    const totalResult = db.exec(`
      SELECT COUNT(*) FROM sys_training_resource WHERE resource_type = 'game'
    `)
    const visualResult = db.exec(`
      SELECT COUNT(*) FROM sys_training_resource WHERE resource_type = 'game' AND category = 'visual'
    `)
    const audioResult = db.exec(`
      SELECT COUNT(*) FROM sys_training_resource WHERE resource_type = 'game' AND category = 'audio'
    `)

    const total = totalResult[0]?.values[0]?.[0] as number || 0
    const visual = visualResult[0]?.values[0]?.[0] as number || 0
    const audio = audioResult[0]?.values[0]?.[0] as number || 0

    // 验证数量
    if (total < GAMES.length) {
      errors.push(`游戏数量不足: 期望 ${GAMES.length}，实际 ${total}`)
    }

    // 验证每个游戏的元数据
    for (const game of GAMES) {
      const result = db.exec(`
        SELECT meta_data FROM sys_training_resource
        WHERE resource_type = 'game' AND legacy_id = ${game.taskId}
      `)

      if (result.length === 0 || result[0].values.length === 0) {
        errors.push(`游戏 "${game.name}" (taskId=${game.taskId}) 未找到`)
        continue
      }

      try {
        const metaData = JSON.parse(result[0].values[0][0] as string)
        if (!metaData.taskId || !metaData.mode || !metaData.emoji) {
          errors.push(`游戏 "${game.name}" 元数据不完整`)
        }
      } catch {
        errors.push(`游戏 "${game.name}" 元数据解析失败`)
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      stats: { total, visual, audio }
    }
  } catch (error) {
    return {
      passed: false,
      errors: [`验证失败: ${error instanceof Error ? error.message : String(error)}`],
      stats: { total: 0, visual: 0, audio: 0 }
    }
  }
}

/**
 * 运行完整的游戏迁移流程
 */
export async function runGameMigration(): Promise<{
  success: boolean
  message: string
  verification?: ReturnType<typeof verifyGameMigration>
}> {
  // 执行迁移
  const result = await migrateGamesToResources()

  if (!result.success) {
    return result
  }

  // 验证迁移
  const verification = verifyGameMigration()

  return {
    success: verification.passed,
    message: verification.passed
      ? `游戏迁移成功！共 ${result.migratedCount} 个游戏`
      : `迁移完成但验证失败: ${verification.errors.join(', ')}`,
    verification
  }
}

export default migrateGamesToResources
