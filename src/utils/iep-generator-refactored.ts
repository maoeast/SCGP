/**
 * SIC-ADS IEP 生成器（策略模式重构）
 *
 * Phase 3.3: 业务逻辑策略化
 *
 * 职责：
 * 1. 根据训练数据的 module_code 动态选择策略
 * 2. 从 ModuleRegistry 获取对应的 IEP 策略
 * 3. 委托生成逻辑给具体策略实现
 *
 * 使用方式：
 * ```typescript
 * const result = await IEPGenerator.generate({
 *   studentName: '张三',
 *   moduleCode: 'sensory',
 *   trainingData: { ... }
 * })
 * ```
 */

import { ModuleCode, type IEPResult } from '@/types/module'
import { ModuleRegistry } from '@/core/module-registry'

/**
 * IEP 生成输入数据接口
 */
export interface IEPGeneratorInput {
  // 学生姓名
  studentName: string

  // 模块代码（用于策略选择）
  moduleCode: ModuleCode

  // 训练数据（游戏或器材）
  trainingData: any
}

/**
 * IEP 生成器（策略模式）
 *
 * 此类作为策略模式的门面（Facade），负责：
 * 1. 接收训练数据
 * 2. 识别模块代码
 * 3. 从注册表获取对应策略
 * 4. 委托生成任务
 */
export class IEPGenerator {
  /**
   * 生成 IEP 报告（策略模式入口）
   * @param input - 包含学生、模块代码和训练数据的输入
   * @returns Promise<IEPResult>
   */
  static async generate(input: IEPGeneratorInput): Promise<IEPResult> {
    const { studentName, moduleCode, trainingData } = input

    try {
      // 1. 从 ModuleRegistry 获取对应策略
      const strategy = ModuleRegistry.getIEPSstrategy(moduleCode)

      if (!strategy) {
        return {
          success: false,
          error: `未找到模块 ${moduleCode} 的 IEP 生成策略`
        }
      }

      // 2. 准备训练数据（补充学生姓名）
      const data = {
        studentName,
        ...trainingData
      }

      // 3. 委托给策略生成
      return await strategy.generateIEP(data)

    } catch (error: any) {
      return {
        success: false,
        error: error.message || '未知错误'
      }
    }
  }

  /**
   * 批量生成 IEP 报告
   * @param inputs - 多个输入数据
   * @returns Promise<IEPResult[]>
   */
  static async generateBatch(inputs: IEPGeneratorInput[]): Promise<IEPResult[]> {
    const results: IEPResult[] = []

    for (const input of inputs) {
      const result = await this.generate(input)
      results.push(result)
    }

    return results
  }

  /**
   * 检查模块是否支持 IEP 生成
   * @param moduleCode - 模块代码
   * @returns 是否支持
   */
  static isModuleSupported(moduleCode: ModuleCode): boolean {
    const strategy = ModuleRegistry.getIEPSstrategy(moduleCode)
    return strategy !== undefined
  }

  /**
   * 获取所有支持 IEP 生成的模块
   * @returns ModuleCode 列表
   */
  static getSupportedModules(): ModuleCode[] {
    const allStrategies = ModuleRegistry.getAllIEPSstrategies()
    const supported: ModuleCode[] = []

    for (const strategy of allStrategies) {
      supported.push(...strategy.supportedModules)
    }

    return [...new Set(supported)]
  }
}
