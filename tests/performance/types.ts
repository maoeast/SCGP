/**
 * SIC-ADS 性能基准测试类型定义
 *
 * Phase 3.5: 性能基准测试
 */

/**
 * 基准测试结果指标
 */
export interface BenchmarkMetrics {
  // 执行时间 (ms)
  duration: number

  // 内存使用 (bytes)
  memoryUsed?: number

  // CPU 时间 (ms) - 如果可用
  cpuTime?: number

  // 额外元数据
  metadata?: Record<string, any>
}

/**
 * 单次测试运行结果
 */
export interface BenchmarkRun {
  // 运行序号 (1-based)
  runNumber: number

  // 开始时间戳
  startTime: number

  // 结束时间戳
  endTime: number

  // 指标
  metrics: BenchmarkMetrics

  // 是否成功
  success: boolean

  // 错误信息 (如果失败)
  error?: string
}

/**
 * 基准测试统计结果
 */
export interface BenchmarkStatistics {
  // 样本数量
  sampleSize: number

  // 平均执行时间 (ms)
  mean: number

  // 中位数执行时间 (ms)
  median: number

  // 最小执行时间 (ms)
  min: number

  // 最大执行时间 (ms)
  max: number

  // 标准差 (ms)
  standardDeviation: number

  // 95th 百分位 (ms)
  p95: number

  // 99th 百分位 (ms)
  p99: number

  // 每秒操作数
  opsPerSecond: number

  // 所有运行结果
  runs: BenchmarkRun[]
}

/**
 * 单个基准测试结果
 */
export interface BenchmarkResult {
  // 测试名称
  name: string

  // 测试描述
  description: string

  // 测试类别
  category: 'db-export' | 'search' | 'batch-query' | 'write' | 'read'

  // 统计结果
  statistics: BenchmarkStatistics

  // 测试参数
  params: Record<string, any>

  // 验收标准
  acceptanceCriteria: {
    // 目标最大执行时间 (ms)
    maxDuration?: number

    // 目标最小吞吐量 (ops/s)
    minOpsPerSecond?: number

    // 是否通过
    passed: boolean

    // 失败原因
    failureReason?: string
  }

  // 测试完成时间
  completedAt: Date
}

/**
 * 完整性能报告
 */
export interface PerformanceReport {
  // 报告 ID
  id: string

  // 报告生成时间
  generatedAt: Date

  // 测试环境信息
  environment: {
    // 用户代理
    userAgent: string

    // 平台
    platform: string

    // 是否 Electron
    isElectron: boolean

    // CPU 核心数 (如果可用)
    cpuCores?: number

    // 设备内存 (MB) (如果可用)
    deviceMemory?: number

    // 数据库大小 (bytes)
    dbSize?: number
  }

  // 所有测试结果
  results: BenchmarkResult[]

  // 汇总统计
  summary: {
    // 总测试数
    totalTests: number

    // 通过测试数
    passedTests: number

    // 失败测试数
    failedTests: number

    // 总执行时间 (ms)
    totalDuration: number
  }

  // 建议
  recommendations: string[]
}

/**
 * 基准测试配置
 */
export interface BenchmarkConfig {
  // 预热运行次数
  warmupRuns?: number

  // 实际运行次数
  iterations: number

  // 最小样本数 (用于统计)
  minSamples?: number

  // 超时时间 (ms)
  timeout?: number

  // 是否跳过验证
  skipValidation?: boolean
}

/**
 * 数据库生成器配置
 */
export interface DBGeneratorConfig {
  // 记录数量
  recordCount: number

  // 表结构
  tableSchema: {
    name: string
    columns: { name: string; type: string }[]
  }[]

  // 是否生成索引
  withIndexes?: boolean

  // 是否生成外键
  withForeignKeys?: boolean
}

/**
 * 测试数据生成器选项
 */
export interface TestDataOptions {
  // 记录数量
  count: number

  // 包含 NULL 值的比例 (0-1)
  nullRatio?: number

  // 字符串平均长度
  stringLength?: number

  // 是否包含中文
  includeChinese?: boolean

  // 自定义数据生成器
  customGenerator?: (index: number) => Record<string, any>
}
