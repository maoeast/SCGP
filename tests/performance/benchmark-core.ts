/**
 * SIC-ADS 性能基准测试核心框架
 *
 * Phase 3.5: 性能基准测试
 *
 * 功能：
 * 1. 测试运行器和统计计算
 * 2. 测试数据生成器
 * 3. 性能报告生成器
 */

import type {
  BenchmarkConfig,
  BenchmarkMetrics,
  BenchmarkResult,
  BenchmarkRun,
  BenchmarkStatistics,
  PerformanceReport,
  TestDataOptions,
  DBGeneratorConfig
} from './types'

/**
 * 基准测试核心类
 */
export class BenchmarkRunner {
  private results: Map<string, BenchmarkResult[]> = new Map()
  private environment: any

  constructor() {
    this.environment = this.detectEnvironment()
  }

  /**
   * 检测测试环境
   */
  private detectEnvironment() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isElectron: !!(window as any).electronAPI,
      cpuCores: (navigator as any).hardwareConcurrency || undefined,
      deviceMemory: (navigator as any).deviceMemory || undefined
    }
  }

  /**
   * 运行基准测试
   */
  async runBenchmark(
    name: string,
    description: string,
    category: BenchmarkResult['category'],
    testFn: () => Promise<void> | void,
    config: BenchmarkConfig = { iterations: 10 },
    params: Record<string, any> = {},
    acceptanceCriteria: BenchmarkResult['acceptanceCriteria']
  ): Promise<BenchmarkResult> {
    console.log(`[Benchmark] 开始测试: ${name}`)

    const runs: BenchmarkRun[] = []
    const { iterations, warmupRuns = 3, timeout = 30000 } = config

    // 预热运行
    console.log(`[Benchmark] 预热运行 (${warmupRuns} 次)...`)
    for (let i = 0; i < warmupRuns; i++) {
      try {
        await this.runSingle(testFn, timeout)
      } catch (error) {
        console.warn(`[Benchmark] 预热运行 ${i + 1} 失败:`, error)
      }
    }

    // 正式运行
    console.log(`[Benchmark] 正式运行 (${iterations} 次)...`)
    for (let i = 0; i < iterations; i++) {
      const runNumber = i + 1
      const startTime = performance.now()

      try {
        const metrics = await this.runWithMetrics(testFn, timeout)
        const endTime = performance.now()

        runs.push({
          runNumber,
          startTime: Date.now(),
          endTime: Date.now(),
          metrics,
          success: true
        })

        console.log(`[Benchmark] 运行 ${runNumber}/${iterations}: ${metrics.duration.toFixed(2)}ms`)
      } catch (error: any) {
        const endTime = performance.now()
        runs.push({
          runNumber,
          startTime: Date.now(),
          endTime: Date.now(),
          metrics: { duration: endTime - startTime },
          success: false,
          error: error.message
        })
        console.error(`[Benchmark] 运行 ${runNumber}/${iterations} 失败:`, error)
      }
    }

    // 计算统计数据
    const statistics = this.calculateStatistics(runs)

    // 评估验收标准
    const criteriaResult = this.evaluateAcceptanceCriteria(statistics, acceptanceCriteria)

    const result: BenchmarkResult = {
      name,
      description,
      category,
      statistics,
      params,
      acceptanceCriteria: criteriaResult,
      completedAt: new Date()
    }

    // 保存结果
    if (!this.results.has(category)) {
      this.results.set(category, [])
    }
    this.results.get(category)!.push(result)

    console.log(`[Benchmark] 测试完成: ${name}`)
    console.log(`[Benchmark] 平均: ${statistics.mean.toFixed(2)}ms, 中位数: ${statistics.median.toFixed(2)}ms`)

    return result
  }

  /**
   * 运行单次测试（无指标收集）
   */
  private async runSingle(testFn: () => Promise<void> | void, timeout: number): Promise<void> {
    return Promise.race([
      testFn(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('测试超时')), timeout)
      )
    ])
  }

  /**
   * 运行测试并收集指标
   */
  private async runWithMetrics(
    testFn: () => Promise<void> | void,
    timeout: number
  ): Promise<BenchmarkMetrics> {
    // 内存快照（开始）
    const memoryStart = this.getMemoryUsage()

    const startTime = performance.now()

    await this.runSingle(testFn, timeout)

    const endTime = performance.now()

    // 内存快照（结束）
    const memoryEnd = this.getMemoryUsage()

    return {
      duration: endTime - startTime,
      memoryUsed: memoryEnd !== undefined ? memoryEnd - (memoryStart || 0) : undefined
    }
  }

  /**
   * 获取当前内存使用量 (bytes)
   */
  private getMemoryUsage(): number | undefined {
    // @ts-ignore - performance.memory 是 Chrome 非标准 API
    if (performance.memory && performance.memory.usedJSHeapSize) {
      // @ts-ignore
      return performance.memory.usedJSHeapSize
    }
    return undefined
  }

  /**
   * 计算统计数据
   */
  private calculateStatistics(runs: BenchmarkRun[]): BenchmarkStatistics {
    const successfulRuns = runs.filter(r => r.success)

    if (successfulRuns.length === 0) {
      throw new Error('没有成功的测试运行')
    }

    const durations = successfulRuns.map(r => r.metrics.duration).sort((a, b) => a - b)

    const mean = this.mean(durations)
    const median = this.median(durations)
    const min = durations[0]
    const max = durations[durations.length - 1]
    const stdDev = this.standardDeviation(durations, mean)
    const p95 = this.percentile(durations, 95)
    const p99 = this.percentile(durations, 99)
    const opsPerSecond = 1000 / mean

    return {
      sampleSize: successfulRuns.length,
      mean,
      median,
      min,
      max,
      standardDeviation: stdDev,
      p95,
      p99,
      opsPerSecond,
      runs
    }
  }

  /**
   * 评估验收标准
   */
  private evaluateAcceptanceCriteria(
    statistics: BenchmarkStatistics,
    criteria: BenchmarkResult['acceptanceCriteria']
  ): BenchmarkResult['acceptanceCriteria'] {
    const result = { ...criteria, passed: true }

    if (criteria.maxDuration && statistics.mean > criteria.maxDuration) {
      result.passed = false
      result.failureReason = `平均执行时间 (${statistics.mean.toFixed(2)}ms) 超过目标 (${criteria.maxDuration}ms)`
    }

    if (criteria.minOpsPerSecond && statistics.opsPerSecond < criteria.minOpsPerSecond) {
      result.passed = false
      result.failureReason = result.failureReason
        ? `${result.failureReason}; 吞吐量 (${statistics.opsPerSecond.toFixed(2)} ops/s) 低于目标 (${criteria.minOpsPerSecond} ops/s)`
        : `吞吐量 (${statistics.opsPerSecond.toFixed(2)} ops/s) 低于目标 (${criteria.minOpsPerSecond} ops/s)`
    }

    return result
  }

  /**
   * 生成性能报告
   */
  generateReport(dbSize?: number): PerformanceReport {
    const allResults: BenchmarkResult[] = []
    for (const results of this.results.values()) {
      allResults.push(...results)
    }

    const passedTests = allResults.filter(r => r.acceptanceCriteria.passed).length
    const failedTests = allResults.length - passedTests

    // 计算总执行时间
    const totalDuration = allResults.reduce((sum, r) => sum + r.statistics.mean, 0)

    // 生成建议
    const recommendations = this.generateRecommendations(allResults)

    return {
      id: `perf-${Date.now()}`,
      generatedAt: new Date(),
      environment: {
        ...this.environment,
        dbSize
      },
      results: allResults,
      summary: {
        totalTests: allResults.length,
        passedTests,
        failedTests,
        totalDuration
      },
      recommendations
    }
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(results: BenchmarkResult[]): string[] {
    const recommendations: string[] = []

    for (const result of results) {
      if (!result.acceptanceCriteria.passed) {
        switch (result.category) {
          case 'db-export':
            recommendations.push(
              `⚠️ ${result.name}: 数据库导出时间过长，考虑:`,
              `   - 使用增量保存而非完整导出`,
              `   - 启用 WAL 模式以减少导出频率`,
              `   - 考虑将大型数据移至 IndexedDB`
            )
            break

          case 'search':
            recommendations.push(
              `⚠️ ${result.name}: 搜索响应时间过长，考虑:`,
              `   - 添加适当的数据库索引`,
              `   - 使用 FTS5 全文检索`,
              `   - 实现查询结果缓存`
            )
            break

          case 'batch-query':
            recommendations.push(
              `⚠️ ${result.name}: 批量查询性能不足，考虑:`,
              `   - 使用事务批量操作`,
              `   - 减少 JOIN 操作`,
              `   - 预加载常用数据`
            )
            break

          case 'write':
            recommendations.push(
              `⚠️ ${result.name}: 写入性能不足，考虑:`,
              `   - 增加防抖延迟`,
              `   - 使用批量写入`,
              `   - 考虑使用 Worker 处理`
            )
            break

          case 'read':
            recommendations.push(
              `⚠️ ${result.name}: 读取性能不足，考虑:`,
              `   - 实现结果缓存`,
              `   - 优化查询语句`,
              `   - 使用 prepared statements`
            )
            break
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ 所有测试通过，性能表现良好！')
    }

    return recommendations
  }

  // ========== 统计辅助方法 ==========

  private mean(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }

  private median(sortedValues: number[]): number {
    const mid = Math.floor(sortedValues.length / 2)
    return sortedValues.length % 2 !== 0
      ? sortedValues[mid]
      : (sortedValues[mid - 1] + sortedValues[mid]) / 2
  }

  private standardDeviation(values: number[], mean: number): number {
    const squareDiffs = values.map(v => Math.pow(v - mean, 2))
    return Math.sqrt(this.mean(squareDiffs))
  }

  private percentile(sortedValues: number[], p: number): number {
    const index = (p / 100) * (sortedValues.length - 1)
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    const weight = index - lower

    if (upper >= sortedValues.length) {
      return sortedValues[sortedValues.length - 1]
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight
  }
}

/**
 * 测试数据生成器
 */
export class TestDataGenerator {
  /**
   * 生成测试学生数据
   */
  static generateStudents(options: TestDataOptions): Record<string, any>[] {
    const { count, includeChinese = true } = options
    const students = []

    for (let i = 0; i < count; i++) {
      students.push({
        name: includeChinese ? `测试学生${i + 1}` : `Test Student ${i + 1}`,
        gender: i % 2 === 0 ? '男' : '女',
        birthday: this.randomDate(new Date(2010, 0, 1), new Date(2020, 0, 1)),
        diagnosis: includeChinese ? this.randomChineseDiagnosis() : 'Autism Spectrum Disorder',
        created_at: new Date().toISOString()
      })
    }

    return students
  }

  /**
   * 生成测试训练记录数据
   */
  static generateTrainingRecords(options: TestDataOptions & { studentIds: number[] }): Record<string, any>[] {
    const { count, studentIds, includeChinese = true } = options
    const records = []

    for (let i = 0; i < count; i++) {
      records.push({
        student_id: studentIds[i % studentIds.length],
        game_id: (i % 7) + 1,
        score: Math.floor(Math.random() * 100),
        duration: Math.floor(Math.random() * 600) + 60,
        accuracy: Math.random(),
        ability_tags: JSON.stringify(this.randomAbilityTags(includeChinese)),
        created_at: new Date().toISOString()
      })
    }

    return records
  }

  /**
   * 生成测试资源数据
   */
  static generateResources(options: TestDataOptions): Record<string, any>[] {
    const { count, includeChinese = true } = options
    const resources = []
    const categories = ['tactile', 'vestibular', 'proprioceptive', 'visual', 'auditory']

    for (let i = 0; i < count; i++) {
      resources.push({
        module_code: 'sensory',
        resource_type: 'equipment',
        name: includeChinese ? `测试器材${i + 1}` : `Test Equipment ${i + 1}`,
        category: categories[i % categories.length],
        description: includeChinese ? `这是一个测试器材` : `This is a test equipment`,
        is_custom: 0,
        is_active: 1,
        usage_count: Math.floor(Math.random() * 100),
        created_at: new Date().toISOString()
      })
    }

    return resources
  }

  /**
   * 生成测试标签数据
   */
  static generateTags(options: TestDataOptions & { includeDomain?: boolean }): Record<string, any>[] {
    const { count, includeChinese = true, includeDomain = true } = options
    const tags = []
    const domains = includeDomain ? ['ability', 'symptom', 'skill'] : ['ability']
    const tagNames = includeChinese
      ? ['手眼协调', '精细动作', '粗大动作', '注意力', '记忆力', '语言表达', '社交技能']
      : ['hand-eye coordination', 'fine motor', 'gross motor', 'attention', 'memory', 'language', 'social']

    for (let i = 0; i < count; i++) {
      tags.push({
        domain: domains[i % domains.length],
        name: tagNames[i % tagNames.length],
        usage_count: Math.floor(Math.random() * 50)
      })
    }

    return tags
  }

  /**
   * 生成搜索关键词
   */
  static generateSearchKeywords(includeChinese = true): string[] {
    if (includeChinese) {
      return ['训练', '器材', '触觉', '视觉', '注意力', '手眼', '协调', '运动', '感统', '游戏']
    }
    return ['training', 'equipment', 'tactile', 'visual', 'attention', 'hand-eye', 'coordination', 'motor', 'sensory', 'game']
  }

  /**
   * 生成随机日期
   */
  private static randomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
    return date.toISOString().split('T')[0]
  }

  /**
   * 生成随机中文诊断
   */
  private static randomChineseDiagnosis(): string {
    const diagnoses = ['孤独症谱系障碍', '发育迟缓', '注意力缺陷多动障碍', '语言发育迟缓', '感觉统合失调']
    return diagnoses[Math.floor(Math.random() * diagnoses.length)]
  }

  /**
   * 生成随机能力标签
   */
  private static randomAbilityTags(includeChinese: boolean): string[] {
    const allTags = includeChinese
      ? ['手眼协调', '精细动作', '粗大动作', '注意力', '记忆力', '语言表达', '社交技能', '前庭觉', '本体觉', '触觉']
      : ['hand-eye coordination', 'fine motor', 'gross motor', 'attention', 'memory', 'language', 'social', 'vestibular', 'proprioceptive', 'tactile']

    const count = Math.floor(Math.random() * 3) + 1
    const shuffled = allTags.sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }
}

/**
 * 性能报告格式化器
 */
export class PerformanceReportFormatter {
  /**
   * 格式化为 Markdown
   */
  static toMarkdown(report: PerformanceReport): string {
    const lines: string[] = []

    lines.push('# 性能基准测试报告')
    lines.push('')
    lines.push(`**报告 ID**: ${report.id}`)
    lines.push(`**生成时间**: ${report.generatedAt.toLocaleString('zh-CN')}`)
    lines.push('')

    // 环境信息
    lines.push('## 测试环境')
    lines.push('')
    lines.push(`- **平台**: ${report.environment.platform}`)
    lines.push(`- **浏览器**: ${report.environment.userAgent}`)
    lines.push(`- **Electron**: ${report.environment.isElectron ? '是' : '否'}`)
    if (report.environment.cpuCores) {
      lines.push(`- **CPU 核心**: ${report.environment.cpuCores}`)
    }
    if (report.environment.deviceMemory) {
      lines.push(`- **设备内存**: ${report.environment.deviceMemory} GB`)
    }
    if (report.environment.dbSize) {
      lines.push(`- **数据库大小**: ${(report.environment.dbSize / 1024 / 1024).toFixed(2)} MB`)
    }
    lines.push('')

    // 汇总
    lines.push('## 测试汇总')
    lines.push('')
    lines.push(`- **总测试数**: ${report.summary.totalTests}`)
    lines.push(`- **通过**: ${report.summary.passedTests} ✅`)
    lines.push(`- **失败**: ${report.summary.failedTests} ❌`)
    lines.push(`- **总执行时间**: ${report.summary.totalDuration.toFixed(2)} ms`)
    lines.push('')

    // 详细结果
    lines.push('## 详细结果')
    lines.push('')

    for (const result of report.results) {
      lines.push(`### ${result.name}`)
      lines.push('')
      lines.push(result.description)
      lines.push('')
      lines.push(`**参数**: ${JSON.stringify(result.params)}`)
      lines.push('')
      lines.push('| 指标 | 数值 |')
      lines.push('|------|------|')
      lines.push(`| 平均时间 | ${result.statistics.mean.toFixed(2)} ms |`)
      lines.push(`| 中位数 | ${result.statistics.median.toFixed(2)} ms |`)
      lines.push(`| 最小值 | ${result.statistics.min.toFixed(2)} ms |`)
      lines.push(`| 最大值 | ${result.statistics.max.toFixed(2)} ms |`)
      lines.push(`| 标准差 | ${result.statistics.standardDeviation.toFixed(2)} ms |`)
      lines.push(`| P95 | ${result.statistics.p95.toFixed(2)} ms |`)
      lines.push(`| P99 | ${result.statistics.p99.toFixed(2)} ms |`)
      lines.push(`| 吞吐量 | ${result.statistics.opsPerSecond.toFixed(2)} ops/s |`)
      lines.push('')

      // 验收标准
      const status = result.acceptanceCriteria.passed ? '✅ 通过' : '❌ 失败'
      lines.push(`**验收标准**: ${status}`)
      if (result.acceptanceCriteria.failureReason) {
        lines.push(`- ${result.acceptanceCriteria.failureReason}`)
      }
      lines.push('')
    }

    // 建议
    if (report.recommendations.length > 0) {
      lines.push('## 优化建议')
      lines.push('')
      for (const rec of report.recommendations) {
        lines.push(rec)
      }
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * 格式化为 JSON
   */
  static toJSON(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * 格式化为 HTML
   */
  static toHTML(report: PerformanceReport): string {
    const md = this.toMarkdown(report)
    // 简单的 Markdown 转 HTML
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>性能基准测试报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    h1, h2, h3 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .pass { color: #4CAF50; }
    .fail { color: #f44336; }
    pre { background-color: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <pre>${md}</pre>
</body>
</html>
    `
  }
}
