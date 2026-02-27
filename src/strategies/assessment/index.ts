/**
 * 评估策略驱动器工厂
 *
 * 根据量表代码动态加载对应的 ScaleDriver 实例
 *
 * @module strategies/assessment
 */

import type { ScaleDriver, ScaleInfo } from '@/types/assessment'

// 静态导入所有驱动器（Vite 不支持 require）
import { SMDriver } from './SMDriver'
import { WeeFIMDriver } from './WeeFIMDriver'
import { CSIRSDriver } from './CSIRSDriver'
import { ConnersPSQDriver } from './ConnersPSQDriver'
import { ConnersTRSDriver } from './ConnersTRSDriver'

// 导出基类供其他驱动器继承
export { BaseDriver } from './BaseDriver'

// 驱动器类注册表
const driverRegistry: Record<string, new () => ScaleDriver> = {
  'sm': SMDriver,
  'weefim': WeeFIMDriver,
  'csirs': CSIRSDriver,
  'conners-psq': ConnersPSQDriver,
  'conners-trs': ConnersTRSDriver,
}

// 驱动器实例缓存
const driverCache: Map<string, ScaleDriver> = new Map()

/**
 * 获取量表驱动器实例（同步版本）
 *
 * @param scaleCode 量表代码
 * @returns 驱动器实例
 * @throws 如果量表未注册
 */
export function getDriverByScaleCode(scaleCode: string): ScaleDriver {
  // 检查缓存
  const cached = driverCache.get(scaleCode)
  if (cached) return cached

  // 从注册表获取驱动器类
  const DriverClass = driverRegistry[scaleCode]
  if (!DriverClass) {
    throw new Error(`[AssessmentStrategy] 未找到量表驱动器: ${scaleCode}`)
  }

  // 创建实例并缓存
  const driver = new DriverClass()
  driverCache.set(scaleCode, driver)
  return driver
}

/**
 * 异步获取量表驱动器实例
 * （保留接口兼容性，实际为同步操作）
 *
 * @param scaleCode 量表代码
 * @returns Promise<驱动器实例>
 */
export async function getDriverAsync(scaleCode: string): Promise<ScaleDriver> {
  return getDriverByScaleCode(scaleCode)
}

/**
 * 获取所有已注册的量表信息
 * 用于量表选择页面展示
 *
 * @returns 量表信息数组
 */
export function getRegisteredScales(): ScaleInfo[] {
  const scales: ScaleInfo[] = []

  for (const [code, DriverClass] of Object.entries(driverRegistry)) {
    try {
      const driver = new DriverClass()
      scales.push(driver.getScaleInfo())
    } catch (e) {
      console.warn(`[AssessmentStrategy] ${code} 驱动器加载失败:`, e)
    }
  }

  return scales
}

/**
 * 检查量表是否已注册
 *
 * @param scaleCode 量表代码
 * @returns 是否已注册
 */
export function isScaleRegistered(scaleCode: string): boolean {
  return scaleCode in driverRegistry
}

/**
 * 清除驱动器缓存（用于测试或热重载）
 */
export function clearDriverCache(): void {
  driverCache.clear()
}

// 导出类型
export type { ScaleDriver, ScaleInfo } from '@/types/assessment'

// 导出具体驱动器（便于直接使用）
export { SMDriver } from './SMDriver'
export { WeeFIMDriver } from './WeeFIMDriver'
export { CSIRSDriver } from './CSIRSDriver'
export { ConnersPSQDriver } from './ConnersPSQDriver'
export { ConnersTRSDriver } from './ConnersTRSDriver'
