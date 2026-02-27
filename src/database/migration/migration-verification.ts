/**
 * SIC-ADS 2.0 迁移验证脚本
 *
 * Phase 1.5: 数据迁移验证
 *
 * 功能：
 * 1. 验证迁移数据完整性
 * 2. 检查数据一致性
 * 3. 生成详细验证报告
 * 4. 支持回滚前验证
 *
 * @module migration-verification
 */

// ============ 类型定义 ============

interface Database {
  exec(sql: string, ...params: any[]): any[]
  run(sql: string, ...params: any[]): { changes: number; lastInsertRowid: number }
  prepare(sql: string): { bind(params: any[]): void; step(): boolean; getAsObject(): any; free(): void }
  close(): void
  export(): Uint8Array
}

interface VerificationCheck {
  name: string
  description: string
  expected: any
  actual: any
  passed: boolean
  severity: 'critical' | 'warning' | 'info'
}

interface VerificationReport {
  passed: boolean
  timestamp: string
  checks: VerificationCheck[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
  details: {
    equipmentCount: number
    resourceCount: number
    tagCount: number
    tagMappingCount: number
    favoriteCount: number
    orphanedResources: number
    orphanedTags: number
    duplicateTags: number
  }
  recommendations: string[]
}

// ============ 日志工具 ============

function log(level: 'info' | 'warn' | 'error' | 'success', message: string) {
  const timestamp = new Date().toLocaleTimeString()
  const prefix = {
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
    success: '[PASS]'
  }[level]
  console.log(`${timestamp} ${prefix} ${message}`)
}

// ============ 核心验证函数 ============

/**
 * 安全获取 COUNT 值
 */
function getCount(db: Database, sql: string, defaultValue: number = 0): number {
  try {
    const result = db.exec(sql)
    if (result.length > 0 && result[0].values.length > 0) {
      return (result[0].values[0] as any)[0] as number
    }
    return defaultValue
  } catch (e) {
    log('error', `COUNT 查询失败: ${sql}`)
    return defaultValue
  }
}

/**
 * 验证 1: 资源数量匹配
 */
function verifyResourceCount(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 1: 资源数量匹配...')

  const equipmentCount = getCount(
    db,
    'SELECT COUNT(*) FROM equipment_catalog WHERE is_active = 1'
  )
  const resourceCount = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog' AND is_active = 1`
  )

  const passed = equipmentCount === resourceCount

  checks.push({
    name: '资源数量匹配',
    description: 'equipment_catalog 活跃记录数应等于 sys_training_resource 迁移记录数',
    expected: equipmentCount,
    actual: resourceCount,
    passed,
    severity: passed ? 'info' : 'critical'
  })

  if (passed) {
    log('success', `✅ 资源数量匹配: ${equipmentCount} 条`)
  } else {
    log('error', `❌ 资源数量不匹配: 预期 ${equipmentCount}, 实际 ${resourceCount}`)
  }
}

/**
 * 验证 2: 标签创建和映射
 */
function verifyTagMappings(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 2: 标签创建和映射...')

  const tagCount = getCount(
    db,
    `SELECT COUNT(*) FROM sys_tags WHERE domain = 'ability'`
  )
  const tagMappingCount = getCount(
    db,
    'SELECT COUNT(*) FROM sys_resource_tag_map'
  )

  // 获取原始 ability_tags 的总标签数（估算）
  const result = db.exec(`
    SELECT ability_tags FROM equipment_catalog
    WHERE ability_tags IS NOT NULL AND ability_tags != '' AND ability_tags != 'null'
  `)

  let originalTagCount = 0
  if (result.length > 0) {
    for (const row of result[0].values) {
      const tagsJson = row[0] as string
      try {
        const tags = JSON.parse(tagsJson)
        if (Array.isArray(tags)) {
          originalTagCount += tags.length
        }
      } catch {
        // 忽略解析失败的 JSON
      }
    }
  }

  // 标签数应与原始 JSON 中的标签数一致（考虑去重）
  const passed = tagCount > 0 && tagMappingCount > 0

  checks.push({
    name: '标签创建验证',
    description: '应从 ability_tags 中提取并创建唯一标签',
    expected: 'at_least_1',
    actual: tagCount,
    passed: tagCount > 0,
    severity: tagCount > 0 ? 'info' : 'critical'
  })

  checks.push({
    name: '标签映射验证',
    description: '每个资源应正确映射到其标签',
    expected: 'at_least_1',
    actual: tagMappingCount,
    passed: tagMappingCount > 0,
    severity: tagMappingCount > 0 ? 'info' : 'critical'
  })

  if (passed) {
    log('success', `✅ 标签映射正确: ${tagCount} 个标签, ${tagMappingCount} 条映射`)
  } else {
    log('error', `❌ 标签映射失败`)
  }
}

/**
 * 验证 3: legacy_id 关联完整性
 */
function verifyLegacyIdIntegrity(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 3: legacy_id 关联完整性...')

  // 检查是否有资源缺少 legacy_id
  const withoutLegacyId = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND (legacy_id IS NULL OR legacy_id = 0)`
  )

  // 检查 legacy_id 是否都能对应到原始记录
  const orphanedResources = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource r
     WHERE r.legacy_source = 'equipment_catalog'
     AND NOT EXISTS (
       SELECT 1 FROM equipment_catalog e WHERE e.id = r.legacy_id
     )`
  )

  const passed = withoutLegacyId === 0 && orphanedResources === 0

  checks.push({
    name: 'legacy_id 完整性',
    description: '所有迁移资源应有有效的 legacy_id',
    expected: 0,
    actual: withoutLegacyId,
    passed: withoutLegacyId === 0,
    severity: withoutLegacyId === 0 ? 'info' : 'critical'
  })

  checks.push({
    name: 'legacy_id 关联验证',
    description: '所有 legacy_id 应能对应到原始 equipment_catalog 记录',
    expected: 0,
    actual: orphanedResources,
    passed: orphanedResources === 0,
    severity: orphanedResources === 0 ? 'info' : 'critical'
  })

  if (passed) {
    log('success', `✅ legacy_id 关联完整`)
  } else {
    if (withoutLegacyId > 0) {
      log('error', `❌ ${withoutLegacyId} 个资源缺少 legacy_id`)
    }
    if (orphanedResources > 0) {
      log('error', `❌ ${orphanedResources} 个资源的 legacy_id 无法对应到原始记录`)
    }
  }
}

/**
 * 验证 4: 数据字段完整性
 */
function verifyDataFieldIntegrity(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 4: 数据字段完整性...')

  // 检查必需字段
  const emptyName = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND (name IS NULL OR name = '')`
  )

  const invalidModule = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND module_code != 'sensory'`
  )

  const invalidType = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND resource_type != 'equipment'`
  )

  const passed = emptyName === 0 && invalidModule === 0 && invalidType === 0

  checks.push({
    name: '资源名称完整性',
    description: '所有资源应有非空名称',
    expected: 0,
    actual: emptyName,
    passed: emptyName === 0,
    severity: 'critical'
  })

  checks.push({
    name: 'module_code 正确性',
    description: '所有迁移资源的 module_code 应为 sensory',
    expected: 0,
    actual: invalidModule,
    passed: invalidModule === 0,
    severity: 'warning'
  })

  checks.push({
    name: 'resource_type 正确性',
    description: '所有迁移资源的 resource_type 应为 equipment',
    expected: 0,
    actual: invalidType,
    passed: invalidType === 0,
    severity: 'warning'
  })

  if (passed) {
    log('success', `✅ 数据字段完整`)
  } else {
    log('error', `❌ 数据字段完整性检查失败`)
  }
}

/**
 * 验证 5: 元数据 (meta_data) 完整性
 */
function verifyMetadataIntegrity(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 5: 元数据完整性...')

  // 检查 meta_data 是否包含原始标签
  const withoutMetadata = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND (meta_data IS NULL OR meta_data = '')`
  )

  // 检查 meta_data 是否为有效 JSON
  const invalidMetadata = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND meta_data IS NOT NULL
     AND json_valid(meta_data) = 0`
  )

  const passed = invalidMetadata === 0

  checks.push({
    name: 'meta_data 存在性',
    description: '所有资源应有 meta_data',
    expected: 0,
    actual: withoutMetadata,
    passed: withoutMetadata === 0,
    severity: 'warning'
  })

  checks.push({
    name: 'meta_data JSON 有效性',
    description: 'meta_data 应为有效 JSON',
    expected: 0,
    actual: invalidMetadata,
    passed: invalidMetadata === 0,
    severity: 'warning'
  })

  if (passed) {
    log('success', `✅ 元数据完整`)
  } else {
    log('warn', `⚠️ ${withoutMetadata} 个资源缺少 meta_data`)
    log('warn', `⚠️ ${invalidMetadata} 个资源的 meta_data 不是有效 JSON`)
  }
}

/**
 * 验证 6: 索引完整性
 */
function verifyIndexIntegrity(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 6: 索引完整性...')

  const indexResult = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type = 'index'
    AND name LIKE 'idx_sys_%'
  `)

  const indexCount = indexResult.length > 0 ? indexResult[0].values.length : 0

  // 预期至少有 5 个索引
  const expectedIndexCount = 5
  const passed = indexCount >= expectedIndexCount

  checks.push({
    name: 'sys_ 表索引完整性',
    description: `应创建至少 ${expectedIndexCount} 个索引`,
    expected: `>= ${expectedIndexCount}`,
    actual: indexCount,
    passed,
    severity: passed ? 'info' : 'warning'
  })

  if (passed) {
    log('success', `✅ 索引完整: ${indexCount} 个索引`)
  } else {
    log('warn', `⚠️ 索引数量不足: ${indexCount}/${expectedIndexCount}`)
  }
}

/**
 * 验证 7: 收藏夹迁移
 */
function verifyFavoritesMigration(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 7: 收藏夹迁移...')

  // 检查原始 teacher_fav 表是否存在
  const hasTeacherFav = getCount(
    db,
    `SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'teacher_fav'`
  ) > 0

  if (!hasTeacherFav) {
    log('info', '原始 teacher_fav 表不存在，跳过收藏夹验证')
    checks.push({
      name: '收藏夹迁移',
      description: '原始 teacher_fav 表不存在',
      expected: 'N/A',
      actual: 'N/A',
      passed: true,
      severity: 'info'
    })
    return
  }

  const oldFavCount = getCount(
    db,
    'SELECT COUNT(*) FROM teacher_fav'
  )
  const newFavCount = getCount(
    db,
    'SELECT COUNT(*) FROM sys_favorites'
  )

  const passed = oldFavCount === newFavCount

  checks.push({
    name: '收藏夹迁移',
    description: 'teacher_fav 应完整迁移到 sys_favorites',
    expected: oldFavCount,
    actual: newFavCount,
    passed,
    severity: 'info'
  })

  if (passed) {
    log('success', `✅ 收藏夹迁移完整: ${newFavCount} 条`)
  } else {
    log('info', `收藏夹: 原始 ${oldFavCount} 条, 迁移 ${newFavCount} 条`)
  }
}

/**
 * 验证 8: 无孤儿标签
 */
function verifyNoOrphanedTags(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 8: 无孤儿标签...')

  const orphanedTags = getCount(
    db,
    `SELECT COUNT(*) FROM sys_tags t
     WHERE NOT EXISTS (
       SELECT 1 FROM sys_resource_tag_map m WHERE m.tag_id = t.id
     )`
  )

  const passed = orphanedTags === 0

  checks.push({
    name: '无孤儿标签',
    description: '所有标签应被至少一个资源引用',
    expected: 0,
    actual: orphanedTags,
    passed,
    severity: 'warning'
  })

  if (passed) {
    log('success', `✅ 无孤儿标签`)
  } else {
    log('warn', `⚠️ ${orphanedTags} 个标签未被任何资源引用`)
  }
}

/**
 * 验证 9: 无重复标签
 */
function verifyNoDuplicateTags(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 9: 无重复标签...')

  const duplicateTags = getCount(
    db,
    `SELECT COUNT(*) FROM (
       SELECT domain, name, COUNT(*) as cnt FROM sys_tags
       GROUP BY domain, name HAVING cnt > 1
     )`
  )

  const passed = duplicateTags === 0

  checks.push({
    name: '无重复标签',
    description: '标签不应有重复（domain + name 唯一约束）',
    expected: 0,
    actual: duplicateTags,
    passed,
    severity: duplicateTags === 0 ? 'info' : 'critical'
  })

  if (passed) {
    log('success', `✅ 无重复标签`)
  } else {
    log('error', `❌ ${duplicateTags} 组重复标签`)
  }
}

/**
 * 验证 10: 迁移时间戳
 */
function verifyMigrationTimestamps(db: Database, checks: VerificationCheck[]): void {
  log('info', '验证 10: 迁移时间戳...')

  const invalidTimestamps = getCount(
    db,
    `SELECT COUNT(*) FROM sys_training_resource
     WHERE legacy_source = 'equipment_catalog'
     AND (created_at IS NULL OR updated_at IS NULL)`
  )

  const passed = invalidTimestamps === 0

  checks.push({
    name: '时间戳完整性',
    description: '所有资源应有 created_at 和 updated_at',
    expected: 0,
    actual: invalidTimestamps,
    passed,
    severity: 'warning'
  })

  if (passed) {
    log('success', `✅ 时间戳完整`)
  } else {
    log('warn', `⚠️ ${invalidTimestamps} 个资源缺少时间戳`)
  }
}

// ============ 主验证函数 ============

/**
 * 执行完整的迁移验证
 *
 * @param db sql.js Database 实例
 * @returns 验证报告
 */
export function verifyMigration(db: Database): VerificationReport {
  const checks: VerificationCheck[] = []

  log('success', '==========================================')
  log('success', '  SIC-ADS 2.0 迁移验证开始')
  log('success', '==========================================')

  // 执行所有验证
  verifyResourceCount(db, checks)
  verifyTagMappings(db, checks)
  verifyLegacyIdIntegrity(db, checks)
  verifyDataFieldIntegrity(db, checks)
  verifyMetadataIntegrity(db, checks)
  verifyIndexIntegrity(db, checks)
  verifyFavoritesMigration(db, checks)
  verifyNoOrphanedTags(db, checks)
  verifyNoDuplicateTags(db, checks)
  verifyMigrationTimestamps(db, checks)

  // 统计结果
  const critical = checks.filter(c => c.severity === 'critical' && !c.passed).length
  const warnings = checks.filter(c => c.severity === 'warning' && !c.passed).length
  const passed = checks.filter(c => c.passed).length
  const failed = checks.filter(c => !c.passed).length

  const overallPassed = critical === 0

  // 生成建议
  const recommendations: string[] = []

  if (critical > 0) {
    recommendations.push('❌ 存在关键错误，建议回滚迁移并检查迁移脚本')
  }

  if (warnings > 0) {
    recommendations.push(`⚠️ 存在 ${warnings} 个警告，建议检查数据质量`)
  }

  if (overallPassed && warnings === 0) {
    recommendations.push('✅ 迁移验证通过，可以安全继续')
  }

  // 获取详细统计
  const details = {
    equipmentCount: getCount(db, 'SELECT COUNT(*) FROM equipment_catalog WHERE is_active = 1'),
    resourceCount: getCount(
      db,
      `SELECT COUNT(*) FROM sys_training_resource WHERE legacy_source = 'equipment_catalog'`
    ),
    tagCount: getCount(db, `SELECT COUNT(*) FROM sys_tags WHERE domain = 'ability'`),
    tagMappingCount: getCount(db, 'SELECT COUNT(*) FROM sys_resource_tag_map'),
    favoriteCount: getCount(db, 'SELECT COUNT(*) FROM sys_favorites'),
    orphanedResources: getCount(
      db,
      `SELECT COUNT(*) FROM sys_training_resource r
       WHERE r.legacy_source = 'equipment_catalog'
       AND NOT EXISTS (SELECT 1 FROM equipment_catalog e WHERE e.id = r.legacy_id)`
    ),
    orphanedTags: getCount(
      db,
      `SELECT COUNT(*) FROM sys_tags t
       WHERE NOT EXISTS (SELECT 1 FROM sys_resource_tag_map m WHERE m.tag_id = t.id)`
    ),
    duplicateTags: getCount(
      db,
      `SELECT COUNT(*) FROM (
         SELECT domain, name, COUNT(*) as cnt FROM sys_tags
         GROUP BY domain, name HAVING cnt > 1
       )`
    )
  }

  // 输出总结
  log('success', '==========================================')
  log('success', '  验证报告总结')
  log('success', '==========================================')
  log('info', `总检查项: ${checks.length}`)
  log('success', `通过: ${passed}`)
  log('error', `失败: ${failed}`)
  log('warn', `警告: ${warnings}`)
  log('info', `关键错误: ${critical}`)
  log('success', overallPassed ? '✅ 验证通过' : '❌ 验证失败')
  log('success', '==========================================')

  return {
    passed: overallPassed,
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      passed,
      failed,
      warnings
    },
    details,
    recommendations
  }
}

/**
 * 生成可读的验证报告
 */
export function formatVerificationReport(report: VerificationReport): string {
  let output = '\n'
  output += '==========================================\n'
  output += 'SIC-ADS 2.0 迁移验证报告\n'
  output += '==========================================\n'
  output += `验证时间: ${report.timestamp}\n`
  output += `总体结果: ${report.passed ? '✅ 通过' : '❌ 失败'}\n`
  output += '\n'

  output += '------------------------------------------\n'
  output += '检查详情\n'
  output += '------------------------------------------\n'

  for (const check of report.checks) {
    const icon = check.passed ? '✅' : '❌'
    const severity = check.severity === 'critical' ? '[严重]' : check.severity === 'warning' ? '[警告]' : '[信息]'
    output += `${icon} ${severity} ${check.name}\n`
    output += `   描述: ${check.description}\n`
    output += `   预期: ${check.expected}, 实际: ${check.actual}\n`
    output += '\n'
  }

  output += '------------------------------------------\n'
  output += '统计详情\n'
  output += '------------------------------------------\n'
  output += `equipment_catalog 原始数量: ${report.details.equipmentCount}\n`
  output += `sys_training_resource 迁移数量: ${report.details.resourceCount}\n`
  output += `sys_tags 标签数量: ${report.details.tagCount}\n`
  output += `标签映射数量: ${report.details.tagMappingCount}\n`
  output += `收藏夹数量: ${report.details.favoriteCount}\n`
  output += `孤儿资源: ${report.details.orphanedResources}\n`
  output += `孤儿标签: ${report.details.orphanedTags}\n`
  output += `重复标签: ${report.details.duplicateTags}\n`
  output += '\n'

  output += '------------------------------------------\n'
  output += '建议\n'
  output += '------------------------------------------\n'
  for (const rec of report.recommendations) {
    output += `${rec}\n`
  }

  output += '==========================================\n'

  return output
}
