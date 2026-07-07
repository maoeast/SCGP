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
import { TaskID, type GameSessionData, type IEPReport, type IEPReportSection } from '@/types/games'
import { CATEGORY_LABELS } from '@/types/equipment'
import type { EquipmentCatalog, EquipmentCategory, PromptLevel } from '@/types/equipment'
import { iepTaskMapping, equipmentTaskMapping } from './iep-templates'

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

// ========== 保留的接口定义（向后兼容） ==========

/**
 * 器材训练报告数据接口
 * @deprecated 使用 IEPGeneratorInput 替代
 */
export interface EquipmentTrainingData {
  studentName: string
  equipment: EquipmentCatalog
  score: number
  promptLevel: PromptLevel
  duration_seconds?: number
  training_date: string
  notes?: string
}

/**
 * 器材训练报告接口
 * @deprecated 使用 IEPResult 替代
 */
export interface EquipmentIEPReport {
  studentName: string
  equipmentName: string
  category: string
  domainName: string
  reportDate: string
  performance: string
  suggestions: string[]
  generatedComment: string
}

/**
 * 器材训练报告数据接口
 */
export interface EquipmentTrainingData {
  studentName: string
  equipment: EquipmentCatalog
  score: number
  promptLevel: PromptLevel
  duration_seconds?: number
  training_date: string
  notes?: string
}

/**
 * 器材训练报告接口
 */
export interface EquipmentIEPReport {
  studentName: string
  equipmentName: string
  category: string
  domainName: string
  reportDate: string
  performance: string
  suggestions: string[]
  generatedComment: string
}

export class IEPGenerator {
  // ==========================================
  // 游戏训练报告生成（原有逻辑）
  // ==========================================

  /**
   * 生成完整的游戏训练 IEP 报告
   */
  static generateReport(
    studentName: string,
    taskId: TaskID,
    sessionData: GameSessionData
  ): IEPReport {
    const taskName = this.getTaskName(taskId)
    const sections = this.generateSections(taskId, sessionData)
    const summary = this.generateSummary(sessionData, sections)

    return {
      studentName,
      taskId,
      taskName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary
    }
  }

  // ==========================================
  // 社交沟通游戏报告生成（社交模块）
  // ==========================================

  /**
   * 生成社交沟通游戏 IEP 报告（不带 taskId）
   */
  static generateSocialReport(
    studentName: string,
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReport {
    const taskName = this.getSocialGameName(gameCode)
    const sections = this.generateSocialSections(gameCode, performanceData)
    const summary = this.generateSocialSummary(studentName, taskName, performanceData, sections)

    return {
      studentName,
      taskName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary
    }
  }

  /**
   * 社交游戏 code -> 中文名映射
   */
  private static getSocialGameName(gameCode: string): string {
    const names: Record<string, string> = {
      S01_BURGER: '合作造汉堡',
      S02_EMOTION_MIRROR: '表情猜猜乐',
      S03_STORY_SEQ: '故事接龙板',
      S04_GIFT_MATCH: '礼物分享派对',
      S05_ECHO_PARROT: '动物传声筒',
      S06_EXPRESSION_DUEL: '双人表情擂台'
    }
    return names[gameCode] || '社交沟通训练'
  }

  /**
   * 按 gameCode 维度生成社交评估段（共情/轮流/识别/分享/仿说）
   */
  private static generateSocialSections(
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReportSection[] {
    const sections: IEPReportSection[] = []
    const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
    const accuracy = this.clampNum(data.accuracy ?? data.accuracyRate, 0, 1, NaN)
    const hasAccuracy = Number.isFinite(accuracy)

    if (gameCode === 'S01_BURGER' || gameCode === 'S06_EXPRESSION_DUEL') {
      // 合作 / 双人表情擂台
      sections.push({
        category: '轮流配合',
        performance: this.buildCooperativePerformance(gameCode, accuracy, hasAccuracy, data),
        behavior: data.turnCount || data.rounds
          ? `本次共完成约 ${this.numOr(data.turnCount ?? data.rounds, 0)} 个回合的轮流互动。`
          : '',
        suggestions: [
          '在生活情境中继续练习“先看伙伴、再轮到我”，强化共同注意与等待。',
          '当孩子主动等待或邀请伙伴时，及时给予具体、积极的反馈，描述他做得好的行为。',
          '若出现抢答或抢动作，可以暂停并示范“该你/该我”的简短提示语。'
        ]
      })
      sections.push({
        category: '合作完成度',
        performance: hasAccuracy
          ? (accuracy >= 0.7
            ? '在双人合作任务中能稳定配合伙伴完成目标，共同完成度较高。'
            : '在双人合作任务中能参与部分配合，但仍需要成人提示来维持协作节奏。')
          : '本次未采集到量化指标，建议在后续训练中关注双方配合的稳定程度。',
        suggestions: [
          '设置一个共同的视觉目标（如共享的拼图或成品），让孩子体验合作完成后的成就感。',
          '练习换位思考：邀请孩子说出“伙伴现在需要什么”，再决定自己的下一步动作。'
        ]
      })
    } else if (gameCode === 'S02_EMOTION_MIRROR') {
      sections.push({
        category: '表情识别准确率',
        performance: this.buildAccuracyPerformance('表情识别', accuracy, hasAccuracy),
        behavior: data.confusions
          ? `观察到较容易混淆的表情组合：${String(data.confusions)}。`
          : '',
        suggestions: [
          '结合生活照片或镜子练习，把表情与“因为…所以…”的情绪原因连起来描述。',
          '用绘本或情绪卡片做“猜感受”小游戏，先看表情再读情境，提升共情理解。',
          '当孩子识别准确时，复述并肯定他注意到的面部细节（眉毛、嘴角等）。'
        ]
      })
    } else if (gameCode === 'S03_STORY_SEQ') {
      sections.push({
        category: '故事接龙逻辑顺序',
        performance: hasAccuracy
          ? (accuracy >= 0.7
            ? '能较好地把握故事的先后顺序，把打乱的步骤归位到正确位置。'
            : '在排序中能识别部分关键步骤，但整体顺序判断仍需要提示。')
          : '本次未采集到量化指标，建议在后续训练中观察孩子对“先/再/最后”的理解。',
        behavior: data.steps || data.totalTrials
          ? `本次排序任务约包含 ${this.numOr(data.steps ?? data.totalTrials, 0)} 个步骤。`
          : '',
        suggestions: [
          '用日常小故事（洗手、起床、吃饭）练习口头复述“先…接着…最后…”。',
          '鼓励孩子讲完顺序后补一句“为什么这样排”，培养因果与叙事组织。',
          '排序出错时，不要直接给答案，而是引导他对比相邻两步的因果关系。'
        ]
      })
    } else if (gameCode === 'S04_GIFT_MATCH') {
      sections.push({
        category: '分享与匹配决策',
        performance: this.buildAccuracyPerformance('礼物匹配', accuracy, hasAccuracy),
        behavior: data.mismatches !== undefined
          ? `本次出现约 ${this.numOr(data.mismatches, 0)} 次匹配不一致。`
          : '',
        suggestions: [
          '在生活中练习“他喜欢什么/我喜欢什么”的对比，培养换位思考与分享意识。',
          '当孩子选对礼物时，描述他注意到的线索（颜色、表情、情境），强化观察。',
          '匹配不一致时，引导孩子重新看一眼对方的表情和场景再决定。'
        ]
      })
    } else if (gameCode === 'S05_ECHO_PARROT') {
      sections.push({
        category: '仿说完整度',
        performance: hasAccuracy
          ? (accuracy >= 0.7
            ? '能较完整地模仿短词和短句，听说配合较稳定。'
            : '能跟读部分词语，但在较长句子或顺序上仍需要重复提示。')
          : '本次未采集到量化指标，建议在后续训练中关注仿说长度与清晰度。',
        behavior: data.phraseLength
          ? `本次跟读内容约 ${this.numOr(data.phraseLength, 0)} 个字词长度。`
          : '',
        suggestions: [
          '从孩子熟悉的日常词开始，先听一遍再模仿一遍，逐步延长句子。',
          '当孩子模仿不准确时，先肯定他愿意回应，再用自然的语速示范一次正确说法。',
          '练习轮流说话：成人一句、孩子一句，强化社交轮替而非单纯复述。'
        ]
      })
    } else {
      // 未知 gameCode 兜底
      sections.push({
        category: '社交沟通训练',
        performance: hasAccuracy
          ? `本次社交沟通训练总体完成情况：${(accuracy * 100).toFixed(1)}%。`
          : '本次未采集到量化指标，建议结合训练观察进行综合评估。',
        suggestions: [
          '在互动中保持耐心，多用积极反馈描述孩子具体的合作或表达行为。',
          '把社交目标拆成小步，每完成一步就给一次明确的鼓励。'
        ]
      })
    }

    return sections
  }

  private static generateSocialSummary(
    studentName: string,
    taskName: string,
    performanceData: Record<string, any>,
    sections: IEPReportSection[]
  ): string {
    const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
    const accuracy = this.clampNum(data.accuracy ?? data.accuracyRate, 0, 1, NaN)
    const parts: string[] = []

    if (Number.isFinite(accuracy)) {
      if (accuracy >= 0.8) {
        parts.push(`${studentName}在本次《${taskName}》中表现优异，总体准确率达到 ${(accuracy * 100).toFixed(1)}%，社交沟通目标完成稳定。`)
      } else if (accuracy >= 0.6) {
        parts.push(`${studentName}在本次《${taskName}》中表现良好，总体准确率为 ${(accuracy * 100).toFixed(1)}%，仍有继续提升的空间。`)
      } else {
        parts.push(`${studentName}在本次《${taskName}》中面临一定挑战，总体准确率为 ${(accuracy * 100).toFixed(1)}%，需要更多支持与练习。`)
      }
    } else {
      parts.push(`${studentName}完成了本次《${taskName}》社交沟通训练。`)
    }

    parts.push('社交沟通训练的目标是帮助孩子在真实互动中练习共情、换位思考和轮流等待，建议在日常生活中继续泛化本次训练涉及的社交技能。')

    if (sections.length > 0) {
      parts.push(`本报告共给出 ${sections.length} 项专项评估与对应建议，可作为下一阶段训练计划的参考。`)
    }

    return parts.join('\n\n')
  }

  private static buildAccuracyPerformance(
    domain: string,
    accuracy: number,
    hasAccuracy: boolean
  ): string {
    if (!hasAccuracy) {
      return '本次未采集到量化指标，建议在后续训练中持续记录以支撑评估。'
    }
    if (accuracy >= 0.8) {
      return `${domain}准确率较高（${(accuracy * 100).toFixed(1)}%），能较稳定地完成识别与判断。`
    }
    if (accuracy >= 0.6) {
      return `${domain}准确率为 ${(accuracy * 100).toFixed(1)}%，基本能完成大部分任务，个别项目仍需提示。`
    }
    return `${domain}准确率为 ${(accuracy * 100).toFixed(1)}%，完成过程中需要较多支持与示范。`
  }

  private static buildCooperativePerformance(
    gameCode: string,
    accuracy: number,
    hasAccuracy: boolean,
    data: Record<string, any>
  ): string {
    const scene = gameCode === 'S01_BURGER' ? '合作造汉堡' : '双人表情擂台'
    if (!hasAccuracy) {
      return `本次${scene}未采集到量化指标，建议在后续训练中记录轮流配合的稳定性。`
    }
    const turnNote = data.turnCount || data.rounds
      ? `共进行约 ${this.numOr(data.turnCount ?? data.rounds, 0)} 个回合，`
      : ''
    if (accuracy >= 0.7) {
      return `在${scene}中${turnNote}能较好地等待伙伴、轮流操作，共同完成度约 ${(accuracy * 100).toFixed(1)}%。`
    }
    return `在${scene}中${turnNote}能参与轮流互动，但有时会出现抢答或需要提示才轮换，共同完成度约 ${(accuracy * 100).toFixed(1)}%。`
  }

  private static clampNum(value: unknown, min: number, max: number, fallback: number): number {
    const num = Number(value)
    if (!Number.isFinite(num)) {
      return fallback
    }
    if (num < min) return min
    if (num > max) return max
    return num
  }

  private static numOr(value: unknown, fallback: number): number {
    const num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }

  /**
   * 获取任务名称
   */
  private static getTaskName(taskId: TaskID): string {
    const names: Record<TaskID, string> = {
      [TaskID.COLOR_MATCH]: '颜色配对游戏',
      [TaskID.SHAPE_MATCH]: '形状识别游戏',
      [TaskID.ICON_MATCH]: '物品配对游戏',
      [TaskID.VISUAL_TRACK]: '视觉追踪游戏',
      [TaskID.AUDIO_DIFF]: '声音辨别游戏',
      [TaskID.AUDIO_COMMAND]: '听指令做动作',
      [TaskID.AUDIO_RHYTHM]: '节奏模仿游戏',
      [TaskID.HAND_XYLOPHONE]: '空气木琴',
      [TaskID.HAND_WOOD_BLOCKS]: '木块磁贴拼图',
      [TaskID.HAND_BUBBLE_POP]: '打泡泡',
      [TaskID.AIR_CONDUCTOR]: '空中魔法指挥棒'
    }
    return names[taskId] || '未知任务'
  }

  /**
   * 生成报告段落（游戏训练）
   */
  private static generateSections(
    taskId: TaskID,
    data: GameSessionData
  ): IEPReportSection[] {
    const sections: IEPReportSection[] = []

    // 根据任务ID获取对应的模板配置
    if ([TaskID.COLOR_MATCH, TaskID.SHAPE_MATCH].includes(taskId)) {
      sections.push(this.generateVisualDiscriminationSection(taskId, data))
    } else if (taskId === TaskID.ICON_MATCH) {
      sections.push(this.generateVisualAssociationSection(data))
    } else if (taskId === TaskID.VISUAL_TRACK) {
      sections.push(this.generateVisualTrackingSection(data))
    } else if (taskId === TaskID.AUDIO_DIFF) {
      sections.push(this.generateAuditoryDiscriminationSection(data))
    } else if (taskId === TaskID.AUDIO_COMMAND) {
      sections.push(this.generateAuditoryIntegrationSection(data))
    } else if (taskId === TaskID.AUDIO_RHYTHM) {
      sections.push(this.generateAuditorySequencingSection(data))
    } else if ([TaskID.HAND_XYLOPHONE, TaskID.HAND_WOOD_BLOCKS, TaskID.HAND_BUBBLE_POP, TaskID.AIR_CONDUCTOR].includes(taskId)) {
      sections.push(this.generateHandIntegrationSection(taskId, data))
    }

    return sections
  }

  /**
   * 生成视觉辨别段落 (Task 1, 2)
   */
  private static generateVisualDiscriminationSection(
    taskId: TaskID,
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.visual_discrimination
    const type = taskId === TaskID.COLOR_MATCH ? '颜色' : '形状'

    // 判断表现等级
    let performanceText = ''
    if (data.accuracy >= 0.8) {
      performanceText = template.performance.high.replace(/{TYPE}/g, type)
    } else if (data.accuracy >= 0.5) {
      performanceText = template.performance.medium.replace(/{TYPE}/g, type)
    } else {
      performanceText = template.performance.low.replace(/{TYPE}/g, type)
    }

    // 分析行为特征
    let behaviorText = ''
    if (data.behavior.impulsivityScore > 70) {
      behaviorText = template.behavior.impulsive
    } else if (data.avgResponseTime > 3000) {
      behaviorText = template.behavior.hesitant
    } else if (data.errors.omission / data.totalTrials > 0.3) {
      behaviorText = template.behavior.distracted
    }

    return {
      category: '视觉辨别',
      performance: performanceText,
      behavior: behaviorText,
      suggestions: template.suggestions
    }
  }

  /**
   * 生成视觉认知段落 (Task 3)
   */
  private static generateVisualAssociationSection(
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.visual_association
    const performanceText = data.accuracy >= 0.7
      ? template.performance.high
      : template.performance.low

    return {
      category: '视觉认知',
      performance: performanceText,
      suggestions: template.suggestions
    }
  }

  /**
   * 生成视觉追踪段落 (Task 4)
   */
  private static generateVisualTrackingSection(
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.visual_tracking
    const tot = data.trackingStats?.timeOnTargetPercent || 0

    let performanceText = ''
    if (tot >= 0.8) {
      performanceText = template.performance.high
    } else if (tot >= 0.5) {
      performanceText = template.performance.medium
    } else {
      performanceText = template.performance.low
    }

    const behaviorParts: string[] = []
    if (typeof data.trackingStats?.followStability === 'number') {
      behaviorParts.push(`追踪稳定度为 ${data.trackingStats.followStability} 分`)
    }
    if (typeof data.trackingStats?.longestStreakMs === 'number') {
      behaviorParts.push(`最长连续跟随 ${(data.trackingStats.longestStreakMs / 1000).toFixed(1)} 秒`)
    }
    if (typeof data.trackingStats?.breakCount === 'number') {
      behaviorParts.push(`过程中出现 ${data.trackingStats.breakCount} 次跟随断开`)
    }

    return {
      category: '视觉追踪',
      performance: performanceText,
      behavior: behaviorParts.join('，'),
      suggestions: template.suggestions
    }
  }

  /**
   * 生成听觉辨别段落 (Task 5)
   */
  private static generateAuditoryDiscriminationSection(
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.auditory_discrimination
    const performanceText = data.accuracy >= 0.7
      ? template.performance.high
      : template.performance.low

    return {
      category: '听觉辨别',
      performance: performanceText,
      suggestions: template.suggestions
    }
  }

  /**
   * 生成视听统合段落 (Task 6)
   */
  private static generateAuditoryIntegrationSection(
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.auditory_integration

    let performanceText = ''
    if (data.accuracy >= 0.8) {
      performanceText = template.performance.high
    } else if (data.accuracy >= 0.5) {
      performanceText = template.performance.medium
    } else {
      performanceText = template.performance.low
    }

    return {
      category: '视听统合',
      performance: performanceText,
      suggestions: template.suggestions
    }
  }

  /**
   * 生成听觉序列段落 (Task 7)
   */
  private static generateAuditorySequencingSection(
    data: GameSessionData
  ): IEPReportSection {
    const template = iepTaskMapping.auditory_sequencing
    const avgError = data.rhythmStats?.timingErrorAvg || 0

    // 基于节奏偏差判断表现
    const performanceText = avgError < 200
      ? template.performance.high
      : template.performance.low

    return {
      category: '听觉序列',
      performance: performanceText,
      suggestions: template.suggestions
    }
  }

  /**
   * 生成手势体感统合训练段落 (Task 8-10)
   */
  private static generateHandIntegrationSection(
    taskId: TaskID,
    data: GameSessionData
  ): IEPReportSection {
    const score = data.handGameStats?.completionScore ?? Math.round(data.accuracy * 100)
    const handTrackingText = data.handGameStats?.handTrackingUsed
      ? '本次训练已使用摄像头手势识别，能反映儿童在开放空间中的主动动作表现。'
      : '本次训练主要使用鼠标或触摸备用操作，建议在后续训练中逐步过渡到摄像头手势识别。'

    let domain = '手眼协调与动作计划'
    if (taskId === TaskID.HAND_XYLOPHONE) {
      domain = '双侧协调与节奏控制'
    } else if (taskId === TaskID.HAND_WOOD_BLOCKS) {
      domain = '抓放控制与视觉空间配对'
    } else if (taskId === TaskID.HAND_BUBBLE_POP) {
      domain = '手眼协调与目标抑制控制'
    }

    const performance = score >= 80
      ? `儿童在${domain}训练中完成度较高，动作启动、目标定位和反馈调整较稳定。${handTrackingText}`
      : score >= 50
        ? `儿童在${domain}训练中能完成部分目标，但动作稳定性、节奏保持或手势转换仍需要成人提示。${handTrackingText}`
        : `儿童在${domain}训练中仍需要较多支持，建议降低目标数量、放慢节奏，并增加示范和身体辅助。${handTrackingText}`

    return {
      category: domain,
      performance,
      behavior: data.handGameStats
        ? `共记录 ${data.handGameStats.gestureEvents} 次有效手势事件，完成度 ${score}%。`
        : '',
      suggestions: [
        '训练前先用 1-2 分钟做肩肘腕放松和手指张合热身，降低动作紧张。',
        '初期优先使用大目标、短时长和高对比反馈，等成功率稳定后再增加目标数量或节奏变化。',
        '教师应观察儿童是否出现疲劳、躲避镜头或过度兴奋，必要时改用触摸备用操作完成同一目标。'
      ]
    }
  }

  /**
   * 生成总体评估（游戏训练）
   */
  private static generateSummary(
    data: GameSessionData,
    sections: IEPReportSection[]
  ): string {
    const parts: string[] = []

    // 总体表现
    if (data.accuracy >= 0.8) {
      parts.push(`该生在本次${this.getTaskName(data.taskId)}中表现优异，总体准确率达到${(data.accuracy * 100).toFixed(1)}%。`)
    } else if (data.accuracy >= 0.6) {
      parts.push(`该生在本次${this.getTaskName(data.taskId)}中表现良好，总体准确率为${(data.accuracy * 100).toFixed(1)}%，仍有提升空间。`)
    } else {
      parts.push(`该生在本次${this.getTaskName(data.taskId)}中面临较大挑战，总体准确率为${(data.accuracy * 100).toFixed(1)}%，需要更多支持与练习。`)
    }

    // 反应时评估
    if (data.avgResponseTime < 800) {
      parts.push('反应迅速，显示出良好的信息处理速度。')
    } else if (data.avgResponseTime > 2500) {
      parts.push('反应时间较长，可能需要更明确的视觉或听觉提示。')
    }

    // 注意力评估
    if (data.behavior.fatigueIndex < 0.7) {
      parts.push('观察到明显的疲劳效应，后半程准确率下降，建议缩短单次训练时长。')
    }

    // 错误模式
    if (data.errors.commission > data.errors.omission * 2) {
      parts.push('误报率显著高于漏报率，提示冲动控制能力需加强。')
    } else if (data.errors.omission > data.errors.commission * 2) {
      parts.push('漏报率较高，提示注意力维持或警觉性需要提升。')
    }

    return parts.join('\n\n')
  }

  // ==========================================
  // 器材训练报告生成（新增逻辑）
  // ==========================================

  /**
   * 生成器材训练 IEP 报告
   */
  static generateEquipmentReport(
    data: EquipmentTrainingData
  ): EquipmentIEPReport {
    const template = this.getEquipmentTemplate(data.equipment.category)
    const generatedComment = this.generateEquipmentComment(data, template)
    const suggestions = this.getEquipmentSuggestions(data.equipment.category, data.score)

    return {
      studentName: data.studentName,
      equipmentName: data.equipment.name,
      category: data.equipment.category,
      domainName: template.domainName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      performance: this.extractPerformanceFromComment(generatedComment),
      suggestions,
      generatedComment
    }
  }

  /**
   * 获取器材模板（处理分类映射）
   */
  private static getEquipmentTemplate(category: EquipmentCategory) {
    // 处理 "integration" → "multisensory" 的映射
    const templateKey = category === 'integration' ? 'multisensory' : category
    const template = equipmentTaskMapping[templateKey]

    if (!template) {
      console.warn(`未找到 ${category} 分类的评语模板`)
      // 返回默认模板
      return {
        domainName: CATEGORY_LABELS[category] || category,
        performance: {
          high: '{name}在【{domain}】训练中表现良好。',
          medium: '{name}在【{domain}】训练中表现平稳。',
          low: '{name}在【{domain}】训练中需要更多支持。'
        },
        actionDescriptions: {
          '1': '独立完成操作',
          '2': '在口头提示下完成任务',
          '3': '在视觉提示辅助下进行',
          '4': '在手触引导下尝试操作',
          '5': '在身体辅助下完成训练'
        },
        suggestions: ['继续加强训练', '提供适当辅助']
      }
    }

    return template
  }

  /**
   * 生成器材训练评语（DAO 逻辑：Domain + Action + Outcome）
   */
  private static generateEquipmentComment(
    data: EquipmentTrainingData,
    template: any
  ): string {
    // 确定表现等级
    const level = data.score >= 4 ? 'high' : data.score >= 3 ? 'medium' : 'low'

    // 获取动作描述（处理字符串键 "1", "2", ... 转换为数字）
    const actionDescription = template.actionDescriptions[String(data.promptLevel)] || template.actionDescriptions['1']

    // 器材训练专用占位符替换逻辑
    let comment = template.performance[level]
      .replace(/{name}/g, data.studentName)
      .replace(/{domain}/g, template.domainName)
      .replace(/{equipment}/g, data.equipment.name)
      .replace(/{action}/g, actionDescription)
      .replace(/{outcome}/g, data.equipment.ability_tags.join('、'))

    return comment
  }

  /**
   * 从评语中提取表现部分
   */
  private static extractPerformanceFromComment(comment: string): string {
    // 提取评语中关于表现的部分（通常在"展现出"之前或第一句）
    const sentences = comment.split('。')
    for (const sentence of sentences) {
      if (sentence.includes('展现出') || sentence.includes('表现')) {
        return sentence.trim() + '。'
      }
    }
    return comment.split('。')[0] + '。'
  }

  /**
   * 获取器材训练建议
   */
  private static getEquipmentSuggestions(category: EquipmentCategory, score: number): string[] {
    const template = this.getEquipmentTemplate(category)
    // 表现良好时，返回简化建议；表现不佳时返回详细建议
    if (score >= 4) {
      return template.suggestions.slice(0, 2)
    }
    return template.suggestions
  }

  // ==========================================
  // 通用格式化方法
  // ==========================================

  /**
   * 格式化游戏训练报告为可读文本
   */
  static formatReport(report: IEPReport): string {
    const lines: string[] = []

    lines.push(`# IEP 评估报告`)
    lines.push(``)
    lines.push(`**学生姓名**: ${report.studentName}`)
    lines.push(`**训练任务**: ${report.taskName}`)
    lines.push(`**报告日期**: ${report.reportDate}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // 各个段落
    for (const section of report.sections) {
      lines.push(`## ${section.category}`)
      lines.push(``)
      lines.push(`**表现评估**: ${section.performance}`)
      if (section.behavior) {
        lines.push(`**行为特征**: ${section.behavior}`)
      }
      lines.push(``)
      lines.push(`**训练建议**:`)
      section.suggestions.forEach(s => {
        lines.push(`- ${s}`)
      })
      lines.push(``)
    }

    // 总体评估
    lines.push(`---`)
    lines.push(``)
    lines.push(`## 总体评估`)
    lines.push(``)
    lines.push(report.summary)

    return lines.join('\n')
  }

  /**
   * 格式化器材训练报告为可读文本
   */
  static formatEquipmentReport(report: EquipmentIEPReport): string {
    const lines: string[] = []

    lines.push(`# 器材训练 IEP 评估报告`)
    lines.push(``)
    lines.push(`**学生姓名**: ${report.studentName}`)
    lines.push(`**训练器材**: ${report.equipmentName}`)
    lines.push(`**感官领域**: ${report.domainName}`)
    lines.push(`**报告日期**: ${report.reportDate}`)
    lines.push(``)
    lines.push(`---`)
    lines.push(``)

    // 表现评估
    lines.push(`## 表现评估`)
    lines.push(``)
    lines.push(report.performance)
    lines.push(``)

    // 训练建议
    lines.push(`## 训练建议`)
    lines.push(``)
    report.suggestions.forEach(s => {
      lines.push(`- ${s}`)
    })
    lines.push(``)

    // 完整评语
    lines.push(`---`)
    lines.push(``)
    lines.push(`## 完整评语`)
    lines.push(``)
    lines.push(report.generatedComment)

    return lines.join('\n')
  }

  /**
   * 自动识别训练类型并生成报告
   * @param trainingData 训练数据（游戏或器材）
   * @returns IEP 报告
   */
  static generateAutoReport(trainingData: any): IEPReport | EquipmentIEPReport {
    // 判断是游戏训练还是器材训练
    if (this.isEquipmentTraining(trainingData)) {
      return this.generateEquipmentReport(trainingData)
    } else {
      return this.generateReport(
        trainingData.studentName,
        trainingData.taskId,
        trainingData.sessionData
      )
    }
  }

  /**
   * 判断是否为器材训练数据
   */
  private static isEquipmentTraining(data: any): boolean {
    return data.equipment !== undefined && data.score !== undefined && data.promptLevel !== undefined
  }
}
