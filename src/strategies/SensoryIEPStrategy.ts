/**
 * SIC-ADS 感官统合训练 IEP 策略
 *
 * Phase 3.3: 业务逻辑策略化
 *
 * 职责：
 * 1. 封装感官训练的 IEP 生成逻辑
 * 2. 支持游戏训练和器材训练两种类型
 * 3. 实现 IEPStrategy 接口
 */

import { ModuleCode, type IEPResult } from '@/types/module'
import type { IEPStrategy } from '@/types/module'
import type { GameSessionData } from '@/types/games'
import type { EquipmentTrainingData } from '@/utils/iep-generator'
import { iepTaskMapping, equipmentTaskMapping } from '@/utils/iep-templates'
import type { EquipmentCategory } from '@/types/equipment'
import { CATEGORY_LABELS } from '@/types/equipment'

/**
 * 感官统合训练 IEP 策略实现
 */
export class SensoryIEPStrategy implements IEPStrategy {
  // ========== 策略元数据 ==========

  readonly name = 'sensory_iep_strategy'
  readonly displayName = '感官统合训练 IEP 生成策略'
  readonly supportedModules = [ModuleCode.SENSORY]

  // ========== 游戏训练报告生成 ==========

  /**
   * 生成游戏训练报告段落
   */
  private generateGameSections(taskId: number, data: GameSessionData) {
    const sections: any[] = []

    // 根据任务ID生成对应段落
    if ([1, 2].includes(taskId)) {
      sections.push(this.generateVisualDiscriminationSection(taskId, data))
    } else if (taskId === 3) {
      sections.push(this.generateVisualAssociationSection(data))
    } else if (taskId === 4) {
      sections.push(this.generateVisualTrackingSection(data))
    } else if (taskId === 5) {
      sections.push(this.generateAuditoryDiscriminationSection(data))
    } else if (taskId === 6) {
      sections.push(this.generateAuditoryIntegrationSection(data))
    } else if (taskId === 7) {
      sections.push(this.generateAuditorySequencingSection(data))
    }

    return sections
  }

  /**
   * 生成视觉辨别段落 (Task 1, 2)
   */
  private generateVisualDiscriminationSection(taskId: number, data: GameSessionData) {
    const template = iepTaskMapping.visual_discrimination
    const type = taskId === 1 ? '颜色' : '形状'

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
  private generateVisualAssociationSection(data: GameSessionData) {
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
  private generateVisualTrackingSection(data: GameSessionData) {
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
  private generateAuditoryDiscriminationSection(data: GameSessionData) {
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
  private generateAuditoryIntegrationSection(data: GameSessionData) {
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
  private generateAuditorySequencingSection(data: GameSessionData) {
    const template = iepTaskMapping.auditory_sequencing
    const avgError = data.rhythmStats?.timingErrorAvg || 0

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
  private generateGameSummary(data: GameSessionData, sections: any[]): string {
    const parts: string[] = []

    // 任务名称映射
    const taskNames: Record<number, string> = {
      1: '颜色配对游戏',
      2: '形状识别游戏',
      3: '物品配对游戏',
      4: '视觉追踪游戏',
      5: '声音辨别游戏',
      6: '听指令做动作',
      7: '节奏模仿游戏'
    }
    const taskName = taskNames[data.taskId] || '未知任务'

    // 总体表现
    if (data.accuracy >= 0.8) {
      parts.push(`该生在本次${taskName}中表现优异，总体准确率达到${(data.accuracy * 100).toFixed(1)}%。`)
    } else if (data.accuracy >= 0.6) {
      parts.push(`该生在本次${taskName}中表现良好，总体准确率为${(data.accuracy * 100).toFixed(1)}%，仍有提升空间。`)
    } else {
      parts.push(`该生在本次${taskName}中面临较大挑战，总体准确率为${(data.accuracy * 100).toFixed(1)}%，需要更多支持与练习。`)
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

  /**
   * 生成游戏训练完整报告
   */
  private generateGameReport(studentName: string, taskId: number, sessionData: GameSessionData) {
    const taskNames: Record<number, string> = {
      1: '颜色配对游戏',
      2: '形状识别游戏',
      3: '物品配对游戏',
      4: '视觉追踪游戏',
      5: '声音辨别游戏',
      6: '听指令做动作',
      7: '节奏模仿游戏'
    }

    const sections = this.generateGameSections(taskId, sessionData)
    const summary = this.generateGameSummary(sessionData, sections)

    return {
      type: 'game',
      studentName,
      taskId,
      taskName: taskNames[taskId] || '未知任务',
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary
    }
  }

  // ========== 器材训练报告生成 ==========

  /**
   * 获取器材模板（处理分类映射）
   */
  private getEquipmentTemplate(category: EquipmentCategory) {
    const templateKey = category === 'integration' ? 'multisensory' : category
    const template = equipmentTaskMapping[templateKey]

    if (!template) {
      console.warn(`未找到 ${category} 分类的评语模板`)
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
  private generateEquipmentComment(data: EquipmentTrainingData, template: any): string {
    const level = data.score >= 4 ? 'high' : data.score >= 3 ? 'medium' : 'low'
    const actionDescription = template.actionDescriptions[String(data.promptLevel)] || template.actionDescriptions['1']

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
  private extractPerformanceFromComment(comment: string): string {
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
  private getEquipmentSuggestions(category: EquipmentCategory, score: number): string[] {
    const template = this.getEquipmentTemplate(category)
    if (score >= 4) {
      return template.suggestions.slice(0, 2)
    }
    return template.suggestions
  }

  /**
   * 生成器材训练完整报告
   */
  private generateEquipmentReport(data: EquipmentTrainingData) {
    const template = this.getEquipmentTemplate(data.equipment.category)
    const generatedComment = this.generateEquipmentComment(data, template)
    const suggestions = this.getEquipmentSuggestions(data.equipment.category, data.score)

    return {
      type: 'equipment',
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

  // ========== IEP 策略接口实现 ==========

  /**
   * 生成 IEP（策略模式入口）
   * @param data - 训练数据（游戏或器材）
   * @returns Promise<IEPResult>
   */
  async generateIEP(data: any): Promise<IEPResult> {
    try {
      // 判断是游戏训练还是器材训练
      const isEquipment = data.equipment !== undefined &&
                        data.score !== undefined &&
                        data.promptLevel !== undefined

      let report: any

      if (isEquipment) {
        // 器材训练报告
        report = this.generateEquipmentReport(data as EquipmentTrainingData)
      } else {
        // 游戏训练报告
        report = this.generateGameReport(
          data.studentName,
          data.taskId,
          data.sessionData
        )
      }

      return {
        success: true,
        content: JSON.stringify(report, null, 2),
        format: 'json'
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}
