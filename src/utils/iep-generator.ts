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
      [TaskID.AUDIO_RHYTHM]: '节奏模仿游戏'
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

    return {
      category: '视觉追踪',
      performance: performanceText,
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
