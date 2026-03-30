/**
 * 游戏资源迁移脚本
 *
 * 功能：将硬编码的游戏数据迁移到 sys_training_resource 表
 * 日期：2026-02-28
 * 任务：游戏训练模块重构 - 任务2
 */

import { getDatabase } from '../init'
import { SENSORY_GAME_SEED } from '@/data/sensory-game-seed'

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
      return count < SENSORY_GAME_SEED.length
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

    let updatedCount = 0

    for (const game of SENSORY_GAME_SEED) {
      // 检查是否已存在（通过 legacy_id 判断）
      const existingResult = db.exec(`
        SELECT id FROM sys_training_resource
        WHERE resource_type = 'game' AND legacy_id = ${game.taskId}
      `)

      // 构建元数据
      const metaData: GameMetadata = {
        taskId: game.taskId,
        mode: game.mode,
        difficulty: game.difficulty,
        duration: game.duration,
        emoji: game.emoji,
        color: game.color
      }

      if (existingResult.length > 0 && existingResult[0].values.length > 0) {
        const existingId = Number(existingResult[0].values[0]?.[0] || 0)
        if (!existingId) {
          continue
        }

        db.run(`
          UPDATE sys_training_resource
          SET module_code = ?,
              resource_type = ?,
              name = ?,
              category = ?,
              description = ?,
              cover_image = ?,
              is_custom = 0,
              is_active = 1,
              legacy_source = ?,
              meta_data = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `, [
          'sensory',
          'game',
          game.name,
          game.category,
          game.description,
          game.emoji,
          'games_menu',
          JSON.stringify(metaData),
          existingId,
        ])

        updatedCount++
        continue
      }

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
        'sensory',
        'game',
        game.name,
        game.category,
        game.description,
        game.emoji,
        0,
        1,
        game.taskId,
        'games_menu',
        JSON.stringify(metaData),
        0,
      ])

      migratedCount++
    }

    console.log(`[GameMigration] 同步完成，新增 ${migratedCount} 个游戏，更新 ${updatedCount} 个游戏`)

    return {
      success: true,
      message: `成功同步 ${migratedCount + updatedCount} 个感官游戏资源`,
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
    if (total < SENSORY_GAME_SEED.length) {
      errors.push(`游戏数量不足: 期望 ${SENSORY_GAME_SEED.length}，实际 ${total}`)
    }

    // 验证每个游戏的元数据
    for (const game of SENSORY_GAME_SEED) {
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
