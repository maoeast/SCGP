/**
 * SIC-ADS 策略初始化
 *
 * Phase 3.3: 业务逻辑策略化
 *
 * 职责：
 * 1. 注册所有 IEP 策略到 ModuleRegistry
 * 2. 确保策略在应用启动时可用
 * 3. 提供统一的策略管理入口
 */

import { ModuleRegistry } from './module-registry'
import { SensoryIEPStrategy } from '@/strategies/SensoryIEPStrategy'

/**
 * 初始化所有 IEP 策略
 *
 * 此函数应在应用启动时调用，通常在 main.ts 或 app.vue 的 onMounted 中
 */
export function initializeStrategies(): void {
  // 注册感官统合训练 IEP 策略
  ModuleRegistry.registerIEPSstrategy(new SensoryIEPStrategy())

  // 未来扩展：
  // ModuleRegistry.registerIEPSstrategy(new EmotionalIEPStrategy())
  // ModuleRegistry.registerIEPSstrategy(new SocialIEPStrategy())
  // ModuleRegistry.registerIEPSstrategy(new CognitiveIEPStrategy())

  console.log('[Strategies] 已初始化 IEP 策略')
}
