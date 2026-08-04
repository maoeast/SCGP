/**
 * SCGP IEP 生成器（策略模式重构）
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

import { ModuleCode } from '@/types/module'
import { ModuleRegistry } from '@/core/module-registry'
import { TaskID, type GameSessionData, type IEPReport, type IEPReportSection } from '@/types/games'
import { CATEGORY_LABELS } from '@/types/equipment'
import type { EquipmentCatalog, EquipmentCategory, PromptLevel } from '@/types/equipment'
import { iepTaskMapping, equipmentTaskMapping } from './iep-templates'
import { normalizeGameMetrics } from './game-performance-normalizer'

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

  // ==========================================
  // 精细动作游戏报告生成（精细动作模块）
  // ==========================================

  /**
   * 生成精细动作游戏 IEP 报告（不带 taskId）
   * Phase 1：F03_RECYCLING 分拣小能手
   */
  static generateFineMotorReport(
    studentName: string,
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReport {
    const taskName = this.getFineMotorGameName(gameCode)
    const sections = this.generateFineMotorSections(gameCode, performanceData)
    const summary = this.generateFineMotorSummary(studentName, taskName, gameCode, performanceData, sections)

    return {
      studentName,
      taskName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary
    }
  }

  // ==========================================
  // 生活自理游戏报告生成（生活技能模块）
  // ==========================================

  /**
   * 生成生活自理游戏 IEP 报告（L06–L13）
   */
  static generateLifeSkillsReport(
    studentName: string,
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReport {
    const taskName = this.getLifeSkillGameName(gameCode)
    const sections = this.generateLifeSkillsSections(gameCode, performanceData)
    const summary = this.generateLifeSkillsSummary(studentName, taskName, gameCode, performanceData, sections)

    return {
      studentName,
      taskName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary
    }
  }

  // ==========================================
  // 认知发展游戏报告生成（cognitive 模块）
  // ==========================================

  /** 认知 K 系列游戏 code -> 中文名映射 */
  private static readonly COGNITIVE_GAME_NAMES: Record<string, string> = {
    K01_MEMORY_MATCH: '记忆翻牌',
    K02_MISSING_ITEM: '少了什么',
    K03_PATTERN_NEXT: '模式补全',
    K04_ODD_ONE_OUT: '哪个不同类',
    K05_NUMBER_SENSE: '数感大比拼',
    K06_SIZE_ORDER: '排排队',
    K07_SPOT_DIFF: '找不同',
    K08_MAZE_RUN: '小迷宫',
    K09_ECHO_SEQ: '序列复现',
    K10_STORY_ORDER: '故事排序',
  }

  /**
   * 生成认知发展游戏 IEP 报告
   */
  static generateCognitiveReport(
    studentName: string,
    gameCode: string,
    performanceData: Record<string, any>,
  ): IEPReport {
    const taskName = this.COGNITIVE_GAME_NAMES[gameCode] || '认知训练'
    const sections = this.generateCognitiveSections(gameCode, performanceData)
    const summary = this.generateCognitiveSummary(studentName, taskName, performanceData, sections)

    return {
      studentName,
      taskName,
      reportDate: new Date().toLocaleDateString('zh-CN'),
      sections,
      summary,
    }
  }

  private static generateCognitiveSections(
    gameCode: string,
    performanceData: Record<string, any>,
  ): IEPReportSection[] {
    const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
    const correct = this.numOr(data.correct, 0)
    const total = this.numOr(data.total, 0)
    const hasStats = total > 0

    const domainLabels: Record<string, string> = {
      K01_MEMORY_MATCH: '工作记忆', K02_MISSING_ITEM: '短时记忆',
      K03_PATTERN_NEXT: '模式推理', K04_ODD_ONE_OUT: '归类能力',
      K05_NUMBER_SENSE: '数感', K06_SIZE_ORDER: '序列排序',
      K07_SPOT_DIFF: '视觉辨别', K08_MAZE_RUN: '路径规划',
      K09_ECHO_SEQ: '序列工作记忆', K10_STORY_ORDER: '时序因果',
    }

    return [
      {
        category: '完成情况',
        performance: hasStats
          ? `本次共 ${total} 轮任务中，正确完成 ${correct} 轮。`
          : '本次未采集到量化数据。',
        suggestions: hasStats && correct < total
          ? ['鼓励孩子逐步提高正确率，每次尝试都是进步。', '从较低难度开始，建立成功体验后再逐步增加挑战。']
          : ['孩子表现很好！可以适当增加难度挑战更高认知负荷的任务。'],
      },
      {
        category: '认知能力域',
        performance: `训练目标：${domainLabels[gameCode] || '综合认知能力'}。该游戏通过反复练习帮助提升相关认知功能。`,
        suggestions: [
          '建议定期（每周 2-3 次）进行该类型认知训练，保持能力稳定发展。',
          '可与教师沟通，将训练重点与课堂学习目标相衔接。',
        ],
      },
    ]
  }

  private static generateCognitiveSummary(
    studentName: string,
    taskName: string,
    performanceData: Record<string, any>,
    sections: IEPReportSection[],
  ): string {
    const data = performanceData && typeof performanceData === 'object' ? performanceData : {}
    const correct = this.numOr(data.correct, 0)
    const total = this.numOr(data.total, 0)

    if (total > 0) {
      const pct = Math.round((correct / total) * 100)
      return `${studentName} 在${taskName}训练中完成了 ${total} 轮任务，正确 ${correct} 轮（${pct}%）。`
    }
    return `${studentName} 完成了${taskName}认知训练。建议持续练习以建立稳定认知基础。`
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

  // ---------- 精细动作：私有辅助 ----------

  /**
   * 精细动作游戏 code -> 中文名映射（Phase 1 仅 F03 落地，其余为 Phase 2/3 预留）
   */
  private static getFineMotorGameName(gameCode: string): string {
    const names: Record<string, string> = {
      F01_CLOUD_ERASE: '云朵擦擦擦',
      F02_STAR_TRACE: '连线小星座',
      F03_RECYCLING: '分拣小能手',
      F04_TRACK_BUILD: '轨道修补匠',
      F05_BALLOONS: '刺破慢气球'
    }
    return names[gameCode] || '精细动作训练'
  }

  /**
   * 按 gameCode 维度生成精细动作评估段（围绕手眼协调、动作稳定、抑制控制）
   * 指标统一来自 normalizeGameMetrics，缺指标时给“未采集到量化指标”降级提示，不编造数值。
   */
  private static generateFineMotorSections(
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReportSection[] {
    const sections: IEPReportSection[] = []
    const metrics = normalizeGameMetrics(gameCode, performanceData, 0)
    const accuracy = metrics.accuracy
    const hasAccuracy = accuracy !== null
    const reaction = metrics.avgResponseTimeMs
    const hasReaction = reaction !== null

    if (gameCode === 'F03_RECYCLING') {
      // 分拣小能手：分类正确率 + 反应时 + 手眼协调
      const coordPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子的抓取稳定性与拖拽落点准确度。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较稳定地把物品抓起并拖到正确分类桶，手眼协调与落点控制发展良好。'
          : hasAccuracy
            ? '能参与抓取与拖拽，但落点判断仍偶尔出错，需要在更慢的节奏下多练“看准再放”。'
            : '本次能完成拖拽交互，建议在后续训练中持续记录分类正确率以评估手眼协调。'

      sections.push({
        category: '分类正确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('物品分类', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录分类正确率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每次分拣反应时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '先引导孩子口头说出“这是什么、该扔进哪个桶”，再动手分拣，建立“先认后放”的习惯。',
          '从两类物品、慢速掉落开始，待稳定后再增加到三类或更快的掉落节奏。',
          '当孩子把物品放进正确分类桶时，及时描述他做得好的抓取与拖拽动作，给予具体反馈。'
        ]
      })
      sections.push({
        category: '手眼协调与拖拽控制',
        performance: coordPerformance,
        suggestions: [
          '练习“抓稳再移动”：先让孩子用手指稳稳捏住物品再拖动，减少中途掉落。',
          '可配合大颗粒积木、夹子等生活小物做抓放游戏，迁移拖拽控制能力。',
          '若孩子出现频繁放错或掉落，先放慢节奏并增加示范，再逐步恢复原速。'
        ]
      })
    } else if (gameCode === 'F04_TRACK_BUILD') {
      // 轨道修补匠：旋转拼接正确率 + 反应时 + 旋转操作与空间拼接
      const assemblyPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能对齐接口、把轨道片段旋转到正确方向再放下。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较稳定地把轨道片段旋转到正确方向并对齐接口，空间拼接与手眼协调发展良好。'
          : hasAccuracy
            ? '能参与轨道拼接，但方向判断或接口对齐仍偶尔出错，需要在更慢的节奏下多练“先转再放”。'
            : '本次能完成拼接交互，建议在后续训练中持续记录拼接正确率以评估空间拼接能力。'

      sections.push({
        category: '轨道拼接正确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('轨道拼接', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录拼接正确率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每次拼接反应时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '先引导孩子观察“接口形状、缺口方向”，再决定旋转到哪个角度，建立“先看再转”的习惯。',
          '从两段直轨、慢速开始，待对齐稳定后再增加弯轨或更复杂的拼接组合。',
          '当孩子把片段旋转到正确方向并对齐时，及时描述他注意到的接口细节，给予具体反馈。'
        ]
      })
      sections.push({
        category: '旋转操作与空间拼接',
        performance: assemblyPerformance,
        suggestions: [
          '练习“旋转再放下”：先把片段转到大致方向、悬停比对接口，再松手放下，减少反复调整。',
          '可配合拼图、螺母螺帽等生活小物做旋转对齐游戏，迁移旋转控制与空间推理能力。',
          '若孩子频繁放反或对不齐，先放慢节奏并用手势示范接口方向，再逐步恢复原速。'
        ]
      })
    } else if (gameCode === 'F02_STAR_TRACE') {
      // 连线小星座：轨迹精度 + 反应时 + 路径跟随与手眼配合
      const followPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能沿星点顺序缓慢、稳定地连线。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较稳定地沿星点顺序连线，轨迹偏离少，路径跟随与手眼精细配合发展良好。'
          : hasAccuracy
            ? '能参与连线，但轨迹偏离或断开仍较多，需要在更慢的节奏下多练“看准星点再走”。'
            : '本次能完成连线交互，建议在后续训练中持续记录轨迹精度以评估路径跟随。'

      sections.push({
        category: '轨迹精度',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('轨迹精度', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录轨迹精度以支撑评估。',
        behavior: hasReaction
          ? `本次平均每个星座连线反应时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '先引导孩子用眼睛“走一遍”星点顺序，再动手连，建立“先看路径再下笔”的习惯。',
          '从少量星点、慢速开始，待轨迹稳定后再增加星点或加快节奏。',
          '当孩子沿星点顺序稳定连线时，及时肯定他注意到的下一个落点，给予具体反馈。'
        ]
      })
      sections.push({
        category: '路径跟随与手眼配合',
        performance: followPerformance,
        suggestions: [
          '练习“慢走不抬笔”：鼓励孩子一笔连完一小段，减少中途停顿与断开。',
          '可用描红本、迷宫等做路径跟随游戏，迁移手眼精细配合与轨迹控制能力。'
        ]
      })
    } else if (gameCode === 'F01_CLOUD_ERASE') {
      // 云朵擦擦擦：擦拭覆盖率 + 手眼协调与持续控制（无反应时指标）
      const controlPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能用稳定的大范围擦拭动作拨开云层。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能用较稳定的大范围擦拭动作拨开云层，手眼协调与持续精细控制发展良好。'
          : hasAccuracy
            ? '能参与擦拭，但覆盖范围或动作连贯性仍不足，需要更多“稳稳地、慢慢擦”的练习。'
            : '本次能完成擦拭交互，建议在后续训练中持续记录覆盖率以评估手眼协调。'

      sections.push({
        category: '擦拭覆盖率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('擦拭覆盖', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录擦拭覆盖率以支撑评估。',
        behavior: '',
        suggestions: [
          '先示范“整只手稳稳移动、不来回乱蹭”，让孩子模仿大范围、连贯的擦拭动作。',
          '从大块云层、低强度开始，待稳定覆盖后再增加层数或强度。',
          '当孩子把云层擦干净时，及时肯定他注意到的剩余区域，鼓励“再擦一下就干净了”。'
        ]
      })
      sections.push({
        category: '手眼协调与持续控制',
        performance: controlPerformance,
        suggestions: [
          '练习“看着擦”：让孩子眼睛跟着手移动，避免只凭感觉乱擦。',
          '可配合擦桌子、擦黑板等生活动作迁移手眼协调与持续控制能力。'
        ]
      })
    } else if (gameCode === 'F05_BALLOONS') {
      // 刺破慢气球：无经典正确率，核心是抑制控制（early_taps 过早点击）+ 出手反应稳定
      const earlyTaps = this.numOr(metrics.extra?.early_taps, -1)
      const successfulPops = this.numOr(metrics.extra?.successful_pops, -1)
      const maxStreak = this.numOr(metrics.extra?.max_streak, -1)

      const inhibitPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能在合适时机出手、忍住过早点击。'
        : earlyTaps >= 0 && earlyTaps <= 1
          ? '能在大部分正确时机出手，过早点击很少，抑制控制与等待能力发展良好。'
          : earlyTaps >= 0 && earlyTaps <= 4
            ? '能等待正确出手时机，但偶尔出现过早点击，抑制控制仍可在更慢节奏下继续练习。'
            : earlyTaps >= 0
              ? '出手偏急，常在正确时机到来前就点击，抑制控制需要更多“等一等再出手”的练习。'
              : '本次能完成点破气球交互，建议在后续训练中持续记录过早点击次数以评估抑制控制。'

      sections.push({
        category: '抑制控制与出手时机',
        performance: inhibitPerformance,
        behavior: successfulPops >= 0
          ? `本次成功点破气球 ${successfulPops} 个${earlyTaps >= 0 ? `，过早点击约 ${earlyTaps} 次` : ''}。`
          : '',
        suggestions: [
          '练习“等亮起再点”：先和孩子约定一个明确的出手信号，强化“看到信号再动手”。',
          '出现过早点击时，暂停并示范“先停一下、看准了再点”，把节奏放慢。',
          '当孩子忍住没在错误时机点击时，及时肯定他的等待与自控。'
        ]
      })
      sections.push({
        category: '反应稳定与持续出手',
        performance: hasReaction
          ? (maxStreak > 0
            ? `本次平均出手反应时约 ${((reaction as number) / 1000).toFixed(1)} 秒，最长连续正确出手 ${maxStreak} 次。`
            : `本次平均出手反应时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`)
          : '本次未采集到反应时数据，建议在后续训练中关注出手的稳定性与节奏。',
        suggestions: [
          '把“稳”放在“快”前面：鼓励孩子宁可稍慢也要在正确时机出手，再逐步提升节奏。',
          '可配合“红灯停、绿灯行”一类等待游戏，迁移抑制控制与稳定出手能力。'
        ]
      })
    } else {
      // 其它 F 类（后续接入时再细化）兜底
      sections.push({
        category: '精细动作训练',
        performance: hasAccuracy
          ? `本次精细动作训练总体完成情况：${((accuracy as number) * 100).toFixed(1)}%。`
          : '本次未采集到量化指标，建议结合训练观察进行综合评估。',
        suggestions: [
          '在活动前做简单的手指张合、抓握热身，降低手部紧张。',
          '把目标拆成小步，每完成一步给予明确鼓励。'
        ]
      })
    }

    return sections
  }

  private static generateFineMotorSummary(
    studentName: string,
    taskName: string,
    gameCode: string,
    performanceData: Record<string, any>,
    sections: IEPReportSection[]
  ): string {
    const metrics = normalizeGameMetrics(gameCode, performanceData, 0)
    const accuracy = metrics.accuracy
    const parts: string[] = []

    if (accuracy !== null) {
      if (accuracy >= 0.8) {
        parts.push(`${studentName}在本次《${taskName}》中表现优异，总体完成度达到 ${(accuracy * 100).toFixed(1)}%，精细动作目标完成稳定。`)
      } else if (accuracy >= 0.6) {
        parts.push(`${studentName}在本次《${taskName}》中表现良好，总体完成度为 ${(accuracy * 100).toFixed(1)}%，仍有继续提升的空间。`)
      } else {
        parts.push(`${studentName}在本次《${taskName}》中面临一定挑战，总体完成度为 ${(accuracy * 100).toFixed(1)}%，需要更多支持与练习。`)
      }
    } else {
      parts.push(`${studentName}完成了本次《${taskName}》精细动作训练。`)
    }

    parts.push('精细动作训练的目标是帮助孩子提升手眼协调、抓握控制与动作稳定性，建议在日常生活中通过拿取、分拣、拼搭等小活动继续泛化本次训练涉及的精细动作技能。')

    if (sections.length > 0) {
      parts.push(`本报告共给出 ${sections.length} 项专项评估与对应建议，可作为下一阶段训练计划的参考。`)
    }

    return parts.join('\n\n')
  }

  // ---------- 生活自理：私有辅助 ----------

  /**
   * 生活自理游戏 code -> 中文名映射（Phase 1 仅 L05 落地，其余为 Phase 2 预留）
   */
  private static getLifeSkillGameName(gameCode: string): string {
    const names: Record<string, string> = {
      L06_STEADY_SPOON: '稳稳送一勺',
      L07_BODY_SIGNAL: '身体信号小灯塔',
      L08_TOWEL_TWIST: '毛巾拧拧工坊',
      L09_HOME_SOUND: '家里声音小侦探',
      L10_MARKET_PAY: '超市付款小能手',
      L11_FACE_WASH: '洗脸小镜子',
      L12_POUR_WATER: '倒水小帮手',
      L13_ROAD_CROSS: '安全过马路'
    }
    return names[gameCode] || '生活自理训练'
  }

  /**
   * 按 gameCode 维度生成生活自理评估段（围绕自理步骤完成度、顺序理解、执行功能）
   * 指标统一来自 normalizeGameMetrics，缺指标时给“未采集到量化指标”降级提示，不编造数值。
   */
  private static generateLifeSkillsSections(
    gameCode: string,
    performanceData: Record<string, any>
  ): IEPReportSection[] {
    const sections: IEPReportSection[] = []
    const metrics = normalizeGameMetrics(gameCode, performanceData, 0)
    const accuracy = metrics.accuracy
    const hasAccuracy = accuracy !== null
    const reaction = metrics.avgResponseTimeMs
    const hasReaction = reaction !== null

    if (gameCode === 'L06_STEADY_SPOON') {
      // 稳稳送一勺：稳定送勺占比 + 平均送达用时 + 稳定控制与手部协调
      const stabilityPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子送勺时是否太快、偏离通道或突然转向。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较稳定地沿通道把食物送到嘴边，速度控制与路径保持发展良好。'
          : hasAccuracy
            ? '能参与送勺动作，但偶尔会过快或偏离通道，需要在更慢的节奏下多练“慢慢走、沿通道走”。'
            : '本次能完成送勺交互，建议在后续训练中持续记录稳定送勺占比以评估运动控制。'

      sections.push({
        category: '稳定送勺准确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('稳定送勺', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录稳定送勺占比以支撑评估。',
        behavior: hasReaction
          ? `本次平均每次送勺用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在真实进餐时先示范“碗边拿勺—慢慢送到嘴边”，让孩子看清平稳的送勺节奏。',
          '把“太快”改成“慢一点，稳稳走”，用具体口令帮助孩子在动作中调节速度。',
          '当孩子平稳送达时，描述他控制住的部分（没有洒、没有急转），强化稳定动作。'
        ]
      })
      sections.push({
        category: '稳定控制与手部协调',
        performance: stabilityPerformance,
        suggestions: [
          '先让孩子用空勺沿桌面上的宽通道练习慢速移动，再过渡到带食物的真实进餐。',
          '进餐时把食物切成小份，降低端送难度，让孩子在成功中积累稳定控制的信心。'
        ]
      })
    } else if (gameCode === 'L07_BODY_SIGNAL') {
      // 身体信号小灯塔：信号识别准确率 + 平均响应时 + 主动表达与求助
      const signalPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能根据身体线索认出正确的信号。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较准确地把身体线索对应到正确信号，身体觉察与信号识别发展良好。'
          : hasAccuracy
            ? '能参与信号识别，但偶尔会把相近的身体感觉弄混，需要更多“先感觉、再对照”的提示。'
            : '本次能完成信号识别交互，建议在后续训练中持续记录识别准确率以评估身体觉察。'

      sections.push({
        category: '身体信号识别准确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('身体信号识别', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录识别准确率以支撑评估。',
        behavior: hasReaction
          ? `本次平均从线索出现到正确识别的响应时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在生活中把身体感觉说出来：“你的肚子咕咕叫了，是不是饿了？”帮助孩子把感觉和信号连起来。',
          '当孩子主动说出“想上厕所 / 饿了 / 累了”时，立即回应并肯定，强化求助行为。',
          '用绘本或图卡反复对应“感觉—信号—请求”三件套，让表达句式稳定下来。'
        ]
      })
      sections.push({
        category: '主动表达与求助',
        performance: signalPerformance,
        suggestions: [
          '固定求助句式（“我想上厕所，请带我去”），先在游戏中练习，再迁移到真实情境。',
          '在如厕、饭前等真实时机提醒孩子先感受身体，再开口表达，逐步减少成人代答。'
        ]
      })
    } else if (gameCode === 'L08_TOWEL_TWIST') {
      // 毛巾拧拧工坊：双侧协调占比 + 平均拧动用时 + 双手配合与力量控制
      const coordinationPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子能否让左右两端沿相反方向协调移动。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较协调地让双手沿相反方向完成拧动，双侧协调与力量配合发展良好。'
          : hasAccuracy
            ? '能参与双手拧动，但偶尔会两手同向或中途松手，需要更多“一左一右、握住再动”的提示。'
            : '本次能完成拧动交互，建议在后续训练中持续记录双侧协调占比以评估动作配合。'

      sections.push({
        category: '双侧协调准确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('双侧协调', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录双侧协调占比以支撑评估。',
        behavior: hasReaction
          ? `本次平均每次完整拧动用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '真实拧毛巾时先让孩子握住两端，成人带着手做一次“一左一右”的示范。',
          '用口令“握住—朝相反方向转—转满就停”把双侧动作拆成小步。',
          '当孩子完成一次完整拧动时，描述他的双手配合（一只手往前、一只手往后），强化协调感。'
        ]
      })
      sections.push({
        category: '双手配合与力量控制',
        performance: coordinationPerformance,
        suggestions: [
          '先用轻软的小毛巾练习，再逐步换到需要更多力量的真毛巾，让力量难度循序渐进。',
          '拧动前先练习“双手同时握住”，减少中途松手，再逐步加快到正常拧干节奏。'
        ]
      })
    } else if (gameCode === 'L09_HOME_SOUND') {
      // 家里声音小侦探：声音识别与安全应对准确率 + 平均响应时 + 听觉识别与安全反应
      const safetyPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子能否听出声音来源并选择安全反应。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较准确地把声音对应到来源并选择安全反应，听觉识别与安全意识发展良好。'
          : hasAccuracy
            ? '能参与声音判断，但偶尔会把相近声音弄混或选择不安全做法，需要更多“先听清、再行动”的提示。'
            : '本次能完成声音互动，建议在后续训练中持续记录识别与应对准确率以评估听觉判断。'

      sections.push({
        category: '声音识别与安全应对准确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('声音识别与安全应对', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录识别与应对准确率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每轮从声音播放到安全行动完成用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在家听到真实声音（门铃、水壶）时，先说“听一听，这是什么声音？”，再引导安全做法。',
          '把声音和行动配对讲给孩子听：“听到水壶响，先关小火，再叫大人。”',
          '当孩子选对安全反应时，描述他听到的关键线索，强化“先听、再想、再做”的链条。'
        ]
      })
      sections.push({
        category: '听觉识别与安全反应',
        performance: safetyPerformance,
        suggestions: [
          '用家里的真实声音做听声练习，先近距离、安静环境，再逐步增加干扰。',
          '对听觉敏感或听觉受限的孩子，配合文字图卡说明声音来源，声音只是辅助线索。'
        ]
      })
    } else if (gameCode === 'L10_MARKET_PAY') {
      // 超市付款小能手：付款准确率 + 平均付款用时 + 货币认知与数量规划
      const paymentPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子能否用硬币凑出商品价格并主动核对。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较准确地用硬币凑出价格并主动核对付款，货币认知与数量规划发展良好。'
          : hasAccuracy
            ? '能参与凑钱付款，但偶尔会少付或多付，需要更多"先数一数、再核对"的提示。'
            : '本次能完成付款交互，建议在后续训练中持续记录付款准确率以评估货币认知。'

      sections.push({
        category: '付款准确率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('付款', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录付款准确率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每件商品从出现到精确付款用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在真实购物付款时先一起看价签，再让孩子说出"要几枚硬币"，再逐枚放进收银台。',
          '把"先数一遍、再核对"变成固定习惯，鼓励孩子主动检查"够不够、多没多"。',
          '当孩子精确付款或自己纠正差额时，描述他数钱和检查的过程，强化自主核对。'
        ]
      })
      sections.push({
        category: '货币认知与数量规划',
        performance: paymentPerformance,
        suggestions: [
          '先用 1 元硬币练习数量对应，再逐步加入 2 元、5 元，让面值组合循序渐进。',
          '少付或多付时，引导孩子自己再加一枚或退回一枚，而不是直接告诉他正确答案。'
        ]
      })
    } else if (gameCode === 'L11_FACE_WASH') {
      // 洗脸小镜子：擦洗完成率 + 圆形擦拭手势
      const washPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能在面部各区域完成完整的圆形擦洗动作。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较完整地在面部各区域完成圆形擦洗动作，手势覆盖与个人卫生意识发展良好。'
          : hasAccuracy
            ? '能参与擦洗动作，但部分区域弧线覆盖不完整，需要在更大的目标区域下多练"画圆圈擦脸"。'
            : '本次能完成洗脸交互，建议在后续训练中持续记录弧线覆盖率以评估擦洗手势。'

      sections.push({
        category: '洗脸区域完成率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('洗脸区域', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录区域完成率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每个区域画圈用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在真实洗脸时引导孩子"额头画圆圈、左脸画圆圈、右脸画圆圈"，把游戏中的画圈动作迁移到生活。',
          '先在纸上或镜子上练习画大圆圈，再过渡到真实洗脸时的圆形擦拭动作。',
          '当孩子完成完整圆形擦洗时，描述他覆盖的区域和动作流畅度，强化正确手势。'
        ]
      })
      sections.push({
        category: '圆形擦拭手势与卫生习惯',
        performance: washPerformance,
        suggestions: [
          '用镜子作为反馈：让孩子看着镜子中的脸一边画圈一边确认哪里还没洗到。',
          '从大区域（整个脸颊）开始，逐步缩小目标区域，让手势更精细。'
        ]
      })
    } else if (gameCode === 'L12_POUR_WATER') {
      // 倒水小帮手：倒水精度 + 角度旋转控制
      const pourPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能控制倾斜角度把水倒到目标水位。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较精准地控制倾斜角度把水倒到目标水位附近，手腕旋转与释放控制发展良好。'
          : hasAccuracy
            ? '能参与倒水动作，但水位控制偶尔不准（溢出或不够），需要更多"慢慢倾斜、看准松手"的练习。'
            : '本次能完成倒水交互，建议在后续训练中持续记录填充精度以评估手腕控制。'

      sections.push({
        category: '倒水精度',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('倒水', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录倒水精度以支撑评估。',
        behavior: hasReaction
          ? `本次平均每杯水从开始倒到完成用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在真实倒水时先从小容器和慢速开始，让孩子练习"慢慢倾斜、看刻度、停手"的三步操作。',
          '用彩色标记线贴在杯子外侧，给孩子一个清晰的"到这里就停"的视觉提示。',
          '当孩子倒水接近目标水位时，描述他控制的动作（倾斜角度变化、松手时机），强化精准释放。'
        ]
      })
      sections.push({
        category: '角度旋转与手腕控制',
        performance: pourPerformance,
        suggestions: [
          '先用空杯子做"假装倒水"的手腕旋转练习，再逐步过渡到真实水壶。',
          '选择有把手的轻量水壶或杯子，降低重量对手腕控制的干扰。'
        ]
      })
    } else if (gameCode === 'L13_ROAD_CROSS') {
      // 安全过马路：安全过马路率 + 冲动抑制
      const crossPerformance = !metrics.hasRealData
        ? '本次未采集到量化指标，建议在后续训练中关注孩子是否能在红灯时等待、绿灯时再过马路。'
        : hasAccuracy && (accuracy as number) >= 0.7
          ? '能较好地在红灯时抑制动作并在绿灯时安全通过，等待意识与出行安全规则理解良好。'
          : hasAccuracy
            ? '能参与过马路练习，但偶尔在红灯时冲动行动或绿灯时未能及时通过，需要更多等待练习。'
            : '本次能完成过马路交互，建议在后续训练中持续记录安全通过率以评估冲动抑制。'

      sections.push({
        category: '安全过马路完成率',
        performance: hasAccuracy
          ? this.buildAccuracyPerformance('安全过马路', accuracy as number, true)
          : '本次未采集到量化指标，建议在后续训练中持续记录安全通过率以支撑评估。',
        behavior: hasReaction
          ? `本次平均每次过马路用时约 ${((reaction as number) / 1000).toFixed(1)} 秒。`
          : '',
        suggestions: [
          '在真实过马路时先一起做"红灯停、绿灯走"的口令练习，把等待变成自然反应。',
          '使用视觉倒计时辅助（手指数数、数到3再走），帮助孩子建立等待节奏。',
          '当孩子成功等待红灯并安全通过时，描述他做到了什么（等待、观察、按时出发），强化安全意识。'
        ]
      })
      sections.push({
        category: '冲动抑制与等待意识',
        performance: crossPerformance,
        suggestions: [
          '先在安全区域练习"停—看—走"三步口令，再逐步应用到真实路口。',
          '对冲动性较强的孩子，可以先用"拉住手等绿灯"的身体辅助，逐步撤除。'
        ]
      })
    } else {
      sections.push({
        category: '生活自理训练',
        performance: hasAccuracy
          ? `本次生活自理训练总体完成情况：${((accuracy as number) * 100).toFixed(1)}%。`
          : '本次未采集到量化指标，建议结合训练观察进行综合评估。',
        suggestions: [
          '把训练中的步骤迁移到真实生活情境，让孩子在自然场景中反复练习。',
          '把自理流程拆成小步，每完成一步给予明确鼓励。'
        ]
      })
    }

    return sections
  }

  private static generateLifeSkillsSummary(
    studentName: string,
    taskName: string,
    gameCode: string,
    performanceData: Record<string, any>,
    sections: IEPReportSection[]
  ): string {
    const metrics = normalizeGameMetrics(gameCode, performanceData, 0)
    const accuracy = metrics.accuracy
    const parts: string[] = []

    if (accuracy !== null) {
      if (accuracy >= 0.8) {
        parts.push(`${studentName}在本次《${taskName}》中表现优异，总体完成度达到 ${(accuracy * 100).toFixed(1)}%，生活自理目标完成稳定。`)
      } else if (accuracy >= 0.6) {
        parts.push(`${studentName}在本次《${taskName}》中表现良好，总体完成度为 ${(accuracy * 100).toFixed(1)}%，仍有继续提升的空间。`)
      } else {
        parts.push(`${studentName}在本次《${taskName}》中面临一定挑战，总体完成度为 ${(accuracy * 100).toFixed(1)}%，需要更多支持与练习。`)
      }
    } else {
      parts.push(`${studentName}完成了本次《${taskName}》生活自理训练。`)
    }

    parts.push('生活自理训练的目标是帮助孩子建立稳定的自理步骤、顺序理解与执行功能，建议在日常生活中结合真实情境继续泛化本次训练涉及的自理技能。')

    if (sections.length > 0) {
      parts.push(`本报告共给出 ${sections.length} 项专项评估与对应建议，可作为下一阶段训练计划的参考。`)
    }

    return parts.join('\n\n')
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
