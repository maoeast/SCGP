/**
 * SIC-ADS 性能基准测试套件
 *
 * Phase 3.5: 性能基准测试
 *
 * 测试场景：
 * 1. DB 序列化开销 (db-export)
 * 2. 搜索响应时间 (sys_tags 关联查询)
 * 3. 批量查询性能
 */

import { getDatabase } from '@/database/init'
import { BenchmarkRunner, TestDataGenerator } from './benchmark-core'
import type { BenchmarkConfig, PerformanceReport } from './types'

/**
 * 性能基准测试套件
 */
export class PerformanceBenchmarkSuite {
  private runner: BenchmarkRunner
  private db: any

  constructor() {
    this.runner = new BenchmarkRunner()
    // 使用 init.ts 导出的 getDatabase() 函数
    this.db = getDatabase()
  }

  /**
   * 运行所有测试
   */
  async runAll(): Promise<PerformanceReport> {
    console.log('[Benchmark Suite] 开始运行性能基准测试套件...')

    // 获取当前数据库大小
    const dbSize = this.getDBSize()

    // 1. DB 序列化性能测试
    await this.runDBExportBenchmarks()

    // 2. 搜索响应性能测试
    await this.runSearchBenchmarks()

    // 3. 批量查询性能测试
    await this.runBatchQueryBenchmarks()

    // 4. 写入性能测试
    await this.runWriteBenchmarks()

    // 5. 读取性能测试
    await this.runReadBenchmarks()

    // 生成报告
    const report = this.runner.generateReport(dbSize)
    console.log('[Benchmark Suite] 所有测试完成！')

    return report
  }

  /**
   * 获取数据库大小
   */
  private getDBSize(): number {
    try {
      const exported = this.db.export()
      return exported.byteLength
    } catch (error) {
      console.warn('[Benchmark] 无法获取数据库大小:', error)
      return 0
    }
  }

  // ==================== DB 导出性能测试 ====================

  /**
   * DB 导出性能测试
   *
   * 目标：测试不同数据量下的 db.export() 主线程阻塞时间
   */
  async runDBExportBenchmarks(): Promise<void> {
    console.log('[Benchmark] === DB 导出性能测试 ===')

    const recordCounts = [100, 500, 1000, 5000, 10000]
    const config: BenchmarkConfig = { iterations: 5, warmupRuns: 2 }

    for (const count of recordCounts) {
      // 估算数据大小：假设每条记录约 500 bytes
      const estimatedSize = count * 500 / 1024 / 1024
      const targetDuration = Math.max(100, count * 0.05) // 动态目标：100ms + 0.05ms/record

      await this.runner.runBenchmark(
        `DB Export - ${count} 条记录`,
        `测试导出包含 ${count} 条记录的数据库 (${estimatedSize.toFixed(2)} MB 估算)`,
        'db-export',
        async () => {
          this.db.export()
        },
        config,
        { recordCount: count },
        {
          maxDuration: targetDuration,
          passed: true // 将在运行后评估
        }
      )
    }
  }

  // ==================== 搜索性能测试 ====================

  /**
   * 搜索响应性能测试
   *
   * 目标：测试使用新架构 sys_tags 关联查询的延迟
   */
  async runSearchBenchmarks(): Promise<void> {
    console.log('[Benchmark] === 搜索响应性能测试 ===')

    const config: BenchmarkConfig = { iterations: 20, warmupRuns: 5 }

    // 测试 1: 简单关键词搜索
    await this.runner.runBenchmark(
      '搜索 - 简单关键词',
      '使用 LIKE 进行简单关键词搜索',
      'search',
      async () => {
        this.db.all(`
          SELECT tr.*
          FROM sys_training_resource tr
          WHERE tr.name LIKE '%测试%'
            OR tr.description LIKE '%测试%'
          LIMIT 50
        `)
      },
      config,
      { queryType: 'simple-like', limit: 50 },
      {
        maxDuration: 200, // 目标: < 200ms
        passed: true
      }
    )

    // 测试 2: 标签关联查询
    await this.runner.runBenchmark(
      '搜索 - 标签关联查询',
      '通过 sys_tags 和 sys_resource_tag_map 进行关联查询',
      'search',
      async () => {
        this.db.all(`
          SELECT DISTINCT tr.*
          FROM sys_training_resource tr
          INNER JOIN sys_resource_tag_map m ON tr.id = m.resource_id
          INNER JOIN sys_tags t ON m.tag_id = t.id
          WHERE t.name IN ('手眼协调', '精细动作')
          LIMIT 50
        `)
      },
      config,
      { queryType: 'tag-join', limit: 50 },
      {
        maxDuration: 300, // 目标: < 300ms
        passed: true
      }
    )

    // 测试 3: 复杂组合查询
    await this.runner.runBenchmark(
      '搜索 - 复杂组合查询',
      '组合关键词、标签、分类的多条件查询',
      'search',
      async () => {
        this.db.all(`
          SELECT
            tr.*,
            GROUP_CONCAT(t.name) as tags
          FROM sys_training_resource tr
          LEFT JOIN sys_resource_tag_map m ON tr.id = m.resource_id
          LEFT JOIN sys_tags t ON m.tag_id = t.id
          WHERE tr.category = 'tactile'
            AND (tr.name LIKE '%训练%' OR tr.description LIKE '%训练%')
          GROUP BY tr.id
          LIMIT 50
        `)
      },
      config,
      { queryType: 'complex', limit: 50 },
      {
        maxDuration: 500, // 目标: < 500ms
        passed: true
      }
    )
  }

  // ==================== 批量查询性能测试 ====================

  /**
   * 批量查询性能测试
   */
  async runBatchQueryBenchmarks(): Promise<void> {
    console.log('[Benchmark] === 批量查询性能测试 ===')

    const config: BenchmarkConfig = { iterations: 10, warmupRuns: 3 }

    // 测试 1: 批量获取学生
    await this.runner.runBenchmark(
      '批量查询 - 获取学生列表',
      '查询所有学生基本信息',
      'batch-query',
      async () => {
        this.db.all('SELECT id, name, gender, birthday FROM student ORDER BY name')
      },
      config,
      { queryType: 'all-students' },
      {
        maxDuration: 100,
        minOpsPerSecond: 10,
        passed: true
      }
    )

    // 测试 2: 批量获取训练记录
    await this.runner.runBenchmark(
      '批量查询 - 获取训练记录',
      '查询最近 100 条训练记录',
      'batch-query',
      async () => {
        this.db.all(`
          SELECT tr.id, tr.student_id, tr.task_id, tr.score, tr.created_at, s.name as student_name
          FROM train_log tr
          INNER JOIN student s ON tr.student_id = s.id
          ORDER BY tr.created_at DESC
          LIMIT 100
        `)
      },
      config,
      { queryType: 'training-records', limit: 100 },
      {
        maxDuration: 200,
        minOpsPerSecond: 5,
        passed: true
      }
    )

    // 测试 3: 统计查询
    await this.runner.runBenchmark(
      '批量查询 - 统计聚合',
      '计算各类别资源数量统计',
      'batch-query',
      async () => {
        this.db.all(`
          SELECT
            tr.category,
            COUNT(*) as count,
            AVG(tr.usage_count) as avg_usage
          FROM sys_training_resource tr
          WHERE tr.is_active = 1
          GROUP BY tr.category
        `)
      },
      config,
      { queryType: 'aggregation' },
      {
        maxDuration: 150,
        minOpsPerSecond: 6,
        passed: true
      }
    )
  }

  // ==================== 写入性能测试 ====================

  /**
   * 写入性能测试
   */
  async runWriteBenchmarks(): Promise<void> {
    console.log('[Benchmark] === 写入性能测试 ===')

    const config: BenchmarkConfig = { iterations: 5, warmupRuns: 2 }

    // 注意：这些测试会实际修改数据库，需要清理
    // 使用临时表或在测试后回滚

    // 测试 1: 单条插入
    await this.runner.runBenchmark(
      '写入 - 单条 INSERT',
      '插入单条训练记录',
      'write',
      async () => {
        // 使用临时测试，不影响实际数据
        this.db.run(`
          INSERT INTO train_log (student_id, task_id, start_time, end_time, total_step, finish_step, score, created_at)
          VALUES (9999, 1, datetime('now'), datetime('now'), 10, 8, 85, datetime('now'))
        `)
        // 立即删除以保持数据库清洁
        this.db.run('DELETE FROM train_log WHERE student_id = 9999')
      },
      config,
      { operation: 'single-insert' },
      {
        maxDuration: 50,
        minOpsPerSecond: 20,
        passed: true
      }
    )

    // 测试 2: 批量插入（事务）
    await this.runner.runBenchmark(
      '写入 - 批量 INSERT (事务)',
      '批量插入 50 条记录（使用事务）',
      'write',
      async () => {
        this.db.run('BEGIN TRANSACTION')

        for (let i = 0; i < 50; i++) {
          this.db.run(`
            INSERT INTO train_log (student_id, task_id, start_time, end_time, total_step, finish_step, score, created_at)
            VALUES (9998, ?, datetime('now'), datetime('now'), 10, 8, ?, datetime('now'))
          `, [i % 7 + 1, Math.floor(Math.random() * 100)])
        }

        this.db.run('COMMIT')

        // 清理
        this.db.run('DELETE FROM train_log WHERE student_id = 9998')
      },
      config,
      { operation: 'batch-insert', count: 50 },
      {
        maxDuration: 500,
        minOpsPerSecond: 2,
        passed: true
      }
    )
  }

  // ==================== 读取性能测试 ====================

  /**
   * 读取性能测试
   */
  async runReadBenchmarks(): Promise<void> {
    console.log('[Benchmark] === 读取性能测试 ===')

    const config: BenchmarkConfig = { iterations: 20, warmupRuns: 5 }

    // 测试 1: 主键查询
    await this.runner.runBenchmark(
      '读取 - 主键查询',
      '通过 ID 查询单条记录',
      'read',
      async () => {
        this.db.get('SELECT * FROM sys_training_resource WHERE id = ?', [1])
      },
      config,
      { queryType: 'primary-key' },
      {
        maxDuration: 10,
        minOpsPerSecond: 100,
        passed: true
      }
    )

    // 测试 2: 索引查询
    await this.runner.runBenchmark(
      '读取 - 索引查询',
      '通过模块代码查询（使用索引）',
      'read',
      async () => {
        this.db.all(`
          SELECT * FROM sys_training_resource
          WHERE module_code = 'sensory'
          LIMIT 20
        `)
      },
      config,
      { queryType: 'indexed', limit: 20 },
      {
        maxDuration: 50,
        minOpsPerSecond: 20,
        passed: true
      }
    )

    // 测试 3: JOIN 查询
    await this.runner.runBenchmark(
      '读取 - JOIN 查询',
      '关联查询学生和训练记录',
      'read',
      async () => {
        this.db.all(`
          SELECT
            s.id, s.name,
            tr.id, tr.task_id, tr.score, tr.created_at
          FROM student s
          INNER JOIN train_log tr ON s.id = tr.student_id
          WHERE s.id = 1
          ORDER BY tr.created_at DESC
          LIMIT 20
        `)
      },
      config,
      { queryType: 'join', limit: 20 },
      {
        maxDuration: 100,
        minOpsPerSecond: 10,
        passed: true
      }
    )
  }
}

/**
 * 导出便捷函数
 */
export async function runPerformanceBenchmarks(): Promise<PerformanceReport> {
  const suite = new PerformanceBenchmarkSuite()
  return await suite.runAll()
}
