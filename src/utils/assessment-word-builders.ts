import type { SDQDimensionDetail, SDQStructuredFeedback } from '@/types/sdq'
import type { CBCLStructuredFeedback } from '@/strategies/assessment/CBCLDriver'
import type { SRS2DimensionDetail, SRS2StructuredFeedback } from '@/types/srs2'
import type {
  ConnersExportData,
  CSIRSExportData,
  SMExportData,
  WeeFIMExportData,
} from './docxExporter'
import type { WordExportPayload } from './export-word'

interface SDQWordReportInput {
  studentName: string
  ageMonths: number
  assessmentDate: string
  totalDifficultiesScore: number
  totalLevelText: string
  prosocialScore: number
  prosocialLevelText: string
  feedback: SDQStructuredFeedback
  dimensionDetails: SDQDimensionDetail[]
  structuredAdvice: Record<string, string[]>
}

interface CBCLWordSocialFactor {
  name: string
  score: number
  tScore: number
  status: string
}

interface CBCLWordSyndromeRow {
  name: string
  rawScore: number
  tScore: number
  levelName: string
  summary: string
  advice: string
}

interface CBCLWordOverallAssessment {
  title: string
  severity: string
  content: string
  detail: string
  advice: string[]
}

interface CBCLWordReportInput {
  studentName: string
  gender: string
  ageMonths: number
  assessmentDate: string
  normGroupLabel?: string
  totalProblemsScore: number
  totalProblemsTScore: number
  totalLevelText: string
  internalizingTScore: number
  externalizingTScore: number
  socialFactors: CBCLWordSocialFactor[]
  syndromeRows: CBCLWordSyndromeRow[]
  feedback: CBCLStructuredFeedback
  overallAssessment?: CBCLWordOverallAssessment | null
}

interface SRS2WordReportInput {
  studentName: string
  gender: string
  ageMonths: number
  assessmentDate: string
  totalRawScore: number
  totalTScore: number
  totalLevelText: string
  feedback: SRS2StructuredFeedback
  dimensionDetails: SRS2DimensionDetail[]
}

interface GmfmWordReportRule {
  summary: string
  content: string
  advice: string[]
}

interface GmfmWordReportDomain {
  code: string
  name: string
  rawScore: number
  maxScore: number
  percentage: number
  ntCount: number
  itemCount: number
  level: string
}

interface GmfmWordReportDomainFeedback {
  code: string
  content: string
  advice: string
}

interface GmfmWordReportFlag {
  title: string
  severity: 'error' | 'warning'
  content: string
  advice: string
}

interface GmfmWordReportTarget {
  itemCode: string
  title: string
  dimensionName: string
  score: number
  isNt: boolean
  priority: 1 | 2 | 3
  rationale: string
  advice: string
}

interface GmfmWordReportDetail {
  item_code: string
  dimension_name: string
  title: string
  score: number
  is_nt: boolean
}

interface GmfmWordReportInput {
  studentName: string
  gender: string
  ageMonths: number
  assessmentDate: string
  totalScore: number
  rawTotalScore: number
  totalMaxScore: number
  levelText: string
  totalNtCount: number
  overallRule?: GmfmWordReportRule | null
  domainResults: GmfmWordReportDomain[]
  domainFeedback: GmfmWordReportDomainFeedback[]
  iepTargets: GmfmWordReportTarget[]
  flags: GmfmWordReportFlag[]
  details: GmfmWordReportDetail[]
}

function cleanText(text: string | undefined): string {
  if (!text) return ''
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/\r/g, '')
    .trim()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

function formatAgeMonths(ageMonths: number): string {
  if (!ageMonths && ageMonths !== 0) return '--'
  const years = Math.floor(ageMonths / 12)
  const months = ageMonths % 12
  if (years === 0) return `${months}个月`
  if (months === 0) return `${years}岁`
  return `${years}岁${months}个月`
}

function buildFilename(prefix: string, studentName: string) {
  return `${prefix}_${studentName}_${new Date().toISOString().slice(0, 10)}`
}

function formatPercent(value: number | undefined): string {
  return `${Number(value || 0).toFixed(1)}%`
}

function getStructuredAdviceTitle(category: string): string {
  const titleMap: Record<string, string> = {
    environment_setup: '环境创设建议',
    interaction_strategy: '互动策略建议',
    professional_support: '专业支持建议',
  }
  return titleMap[category] || category
}

export function buildSDQWordPayload(input: SDQWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: '困难总分', value: `${input.totalDifficultiesScore} / 40` },
        { label: '困难总分等级', value: input.totalLevelText },
        { label: '亲社会行为', value: `${input.prosocialScore} / 10` },
        { label: '亲社会行为等级', value: input.prosocialLevelText },
      ],
    },
    {
      type: 'paragraph',
      heading: '总体评估说明',
      paragraphs: input.feedback.overallSummary.map(cleanText).filter(Boolean),
    },
    {
      type: 'table',
      heading: '维度结果',
      columns: ['维度', '分数', '等级', '评估说明', '建议重点'],
      columnWidths: [16, 12, 14, 29, 29],
      rows: input.dimensionDetails.map((detail) => [
        detail.name,
        `${detail.score} / 10`,
        detail.levelName,
        cleanText(detail.content.join('；')),
        cleanText(detail.advice.join('；')),
      ]),
    },
  ]

  Object.entries(input.structuredAdvice)
    .filter(([, items]) => items.length > 0)
    .forEach(([category, items]) => {
      sections.push({
        type: 'list',
        heading: getStructuredAdviceTitle(category),
        items: items.map(cleanText).filter(Boolean),
      })
    })

  if (input.feedback.overallAdvice.length > 0) {
    sections.push({
      type: 'list',
      heading: '总体建议',
      items: input.feedback.overallAdvice.map(cleanText).filter(Boolean),
    })
  }

  if (input.feedback.expertRecommendations.length > 0) {
    sections.push({
      type: 'list',
      heading: '专家建议',
      items: input.feedback.expertRecommendations.map(cleanText).filter(Boolean),
    })
  }

  return {
    title: 'SDQ 长处和困难问卷评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('SDQ评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '年龄', value: formatAgeMonths(input.ageMonths) },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
    ],
    sections,
  }
}

export function buildCBCLWordPayload(input: CBCLWordReportInput): WordExportPayload {
  const overallParagraphs = input.overallAssessment
    ? [
        `${input.overallAssessment.title}`,
        cleanText(input.overallAssessment.content),
        cleanText(input.overallAssessment.detail),
      ].filter(Boolean)
    : input.feedback.overallSummary.map(cleanText).filter(Boolean)

  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: '行为问题总分', value: `${input.totalProblemsScore}` },
        { label: '总问题 T 分', value: `${input.totalProblemsTScore}` },
        { label: '总体等级', value: input.totalLevelText },
        { label: '内化问题 T 分', value: `${input.internalizingTScore}` },
        { label: '外化问题 T 分', value: `${input.externalizingTScore}` },
      ],
    },
    {
      type: 'table',
      heading: '社会能力评估',
      columns: ['维度', '原始分', 'T分代表值', '状态'],
      columnWidths: [25, 20, 20, 35],
      rows: input.socialFactors.map((factor) => [
        factor.name,
        String(factor.score),
        String(factor.tScore),
        factor.status,
      ]),
    },
    {
      type: 'paragraph',
      heading: '社会能力说明',
      paragraphs: [
        cleanText(input.feedback.socialCompetence.summary),
        cleanText(input.feedback.socialCompetence.advice),
      ].filter(Boolean),
    },
    {
      type: 'table',
      heading: '综合征量表结果',
      columns: ['综合征', '原始分', 'T分', '等级', '评估说明', '建议'],
      columnWidths: [16, 10, 10, 14, 25, 25],
      rows: input.syndromeRows.map((row) => [
        row.name,
        String(row.rawScore),
        String(row.tScore),
        row.levelName,
        cleanText(row.summary),
        cleanText(row.advice),
      ]),
    },
    {
      type: 'paragraph',
      heading: '总体评估',
      paragraphs: overallParagraphs,
    },
  ]

  if (input.overallAssessment?.advice?.length) {
    sections.push({
      type: 'list',
      heading: '专家建议',
      items: input.overallAssessment.advice.map(cleanText).filter(Boolean),
    })
  } else if (input.feedback.overallAdvice.length > 0) {
    sections.push({
      type: 'list',
      heading: '专家建议',
      items: input.feedback.overallAdvice.map(cleanText).filter(Boolean),
    })
  }

  sections.push({
    type: 'kv-table',
    heading: '宽带量表摘要',
    rows: [
      {
        label: '内化问题',
        value: `${input.internalizingTScore} 分；${cleanText(input.feedback.broadband.internalizing.content)}`,
      },
      {
        label: '外化问题',
        value: `${input.externalizingTScore} 分；${cleanText(input.feedback.broadband.externalizing.content)}`,
      },
    ],
  })

  const meta = [
    { label: '学生姓名', value: input.studentName },
    { label: '性别', value: input.gender },
    { label: '年龄', value: formatAgeMonths(input.ageMonths) },
    { label: '评估日期', value: formatDate(input.assessmentDate) },
  ]

  if (input.normGroupLabel) {
    meta.push({ label: '常模组', value: input.normGroupLabel })
  }

  return {
    title: 'CBCL 儿童行为量表评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('CBCL评估报告', input.studentName),
    meta,
    sections,
  }
}

export function buildSRS2WordPayload(input: SRS2WordReportInput): WordExportPayload {
  return {
    title: 'SRS-2 社交反应量表评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('SRS2评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender },
      { label: '年龄', value: formatAgeMonths(input.ageMonths) },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '总原始分', value: `${input.totalRawScore}` },
      { label: '总T分', value: `${input.totalTScore}` },
      { label: '总体等级', value: input.totalLevelText },
    ],
    sections: [
      {
        type: 'paragraph',
        heading: '总体评估说明',
        paragraphs: [cleanText(input.feedback.overallSummary)].filter(Boolean),
      },
      {
        type: 'table',
        heading: '维度结果',
        columns: ['维度', '原始分', 'T分', '等级', '评估说明', '建议'],
        columnWidths: [16, 10, 10, 12, 26, 26],
        rows: input.dimensionDetails.map((detail) => [
          detail.name,
          `${detail.rawScore}`,
          `${detail.tScore}`,
          detail.levelName,
          cleanText(detail.content),
          cleanText(detail.advice.join('；')),
        ]),
      },
      {
        type: 'list',
        heading: '核心建议',
        items: input.feedback.overallAdvice.map(cleanText).filter(Boolean),
      },
    ],
  }
}

export function buildGmfm88WordPayload(input: GmfmWordReportInput): WordExportPayload {
  const priorityLabelMap: Record<GmfmWordReportTarget['priority'], string> = {
    1: '近期突破',
    2: '继续巩固',
    3: '先备支持',
  }
  const domainFeedbackMap = new Map(
    input.domainFeedback.map((item) => [item.code, item]),
  )

  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: 'GMFM-88 总分', value: formatPercent(input.totalScore) },
        { label: '原始分', value: `${input.rawTotalScore} / ${input.totalMaxScore}` },
        { label: '总体等级', value: input.levelText },
        { label: '目标条目', value: `${input.iepTargets.length}` },
        { label: 'NT 项数', value: `${input.totalNtCount}` },
      ],
    },
  ]

  if (input.overallRule) {
    sections.push({
      type: 'paragraph',
      heading: '总体评估说明',
      paragraphs: [
        cleanText(input.overallRule.summary),
        cleanText(input.overallRule.content),
      ].filter(Boolean),
    })

    if (input.overallRule.advice.length > 0) {
      sections.push({
        type: 'list',
        heading: '总体建议',
        items: input.overallRule.advice.map(cleanText).filter(Boolean),
      })
    }
  }

  if (input.domainResults.length > 0) {
    sections.push({
      type: 'table',
      heading: '五大能区结果',
      columns: ['能区', '得分', '项目数', 'NT', '等级', '评估说明', '训练建议'],
      columnWidths: [16, 12, 10, 8, 12, 21, 21],
      rows: input.domainResults.map((domain) => {
        const feedback = domainFeedbackMap.get(domain.code)
        return [
          domain.name,
          `${formatPercent(domain.percentage)} (${domain.rawScore} / ${domain.maxScore})`,
          `${domain.itemCount}`,
          `${domain.ntCount}`,
          domain.level,
          cleanText(feedback?.content || ''),
          cleanText(feedback?.advice || ''),
        ]
      }),
    })
  }

  if (input.flags.length > 0) {
    sections.push({
      type: 'table',
      heading: '风险提醒',
      columns: ['提醒', '级别', '内容', '建议'],
      columnWidths: [18, 10, 36, 36],
      rows: input.flags.map((flag) => [
        flag.title,
        flag.severity === 'error' ? '高风险' : '提醒',
        cleanText(flag.content),
        cleanText(flag.advice),
      ]),
    })
  }

  if (input.iepTargets.length > 0) {
    sections.push({
      type: 'table',
      heading: '近期 IEP 关注点',
      columns: ['项目', '能区', '当前表现', '优先级', '关注原因', '建议'],
      columnWidths: [24, 12, 12, 10, 21, 21],
      rows: input.iepTargets.map((target) => [
        `${target.itemCode}. ${target.title}`,
        target.dimensionName,
        target.isNt ? 'NT' : `评分 ${target.score}`,
        priorityLabelMap[target.priority],
        cleanText(target.rationale),
        cleanText(target.advice),
      ]),
    })
  }

  if (input.details.length > 0) {
    sections.push({
      type: 'table',
      heading: '评分明细',
      columns: ['项目', '能区', '题目', '得分'],
      columnWidths: [10, 14, 56, 20],
      rows: input.details.map((detail) => [
        detail.item_code,
        detail.dimension_name,
        cleanText(detail.title),
        detail.is_nt ? 'NT' : `${detail.score}`,
      ]),
    })
  }

  return {
    title: 'GMFM-88 粗大运动功能评定量表报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('GMFM-88评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender },
      { label: '年龄', value: formatAgeMonths(input.ageMonths) },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
    ],
    sections,
  }
}

export function buildCSIRSWordPayload(data: CSIRSExportData, filename?: string): WordExportPayload {
  return {
    title: 'CSIRS 感觉统合评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: filename || buildFilename('CSIRS评估报告', data.student.name),
    meta: [
      { label: '学生姓名', value: data.student.name },
      { label: '性别', value: data.student.gender },
      { label: '年龄', value: `${data.student.age}岁` },
      { label: '评估日期', value: data.assessment.date },
      { label: '总T分', value: `${data.assessment.total_t_score}` },
      { label: '评定等级', value: data.assessment.level },
    ],
    sections: [
      {
        type: 'paragraph',
        heading: '结果概述',
        paragraphs: [cleanText(data.summary)].filter(Boolean),
      },
      {
        type: 'table',
        heading: '维度结果',
        columns: ['维度', '原始分', 'T分/百分制', '等级', '评估说明', '建议'],
        columnWidths: [18, 10, 14, 12, 22, 24],
        rows: data.dimensions.map((dim) => [
          dim.name,
          `${dim.rawScore}`,
          dim.tScore !== undefined ? `${dim.tScore}` : dim.percentScore !== undefined ? `${dim.percentScore}` : '-',
          dim.level,
          cleanText(dim.description),
          cleanText(dim.advice),
        ]),
      },
      {
        type: 'list',
        heading: '专业建议',
        items: data.advice.map(cleanText).filter(Boolean),
      },
    ],
  }
}

export function buildConnersWordPayload(data: ConnersExportData, filename?: string): WordExportPayload {
  const scaleLabel = data.assessment.scaleType === 'psq' ? 'Conners 父母问卷评估报告 (PSQ)' : 'Conners 教师问卷评估报告 (TRS)'

  return {
    title: scaleLabel,
    subtitle: '统一评估报告 Word 导出版',
    filename: filename || buildFilename(data.assessment.scaleType === 'psq' ? 'Conners-PSQ评估报告' : 'Conners-TRS评估报告', data.student.name),
    meta: [
      { label: '学生姓名', value: data.student.name },
      { label: '性别', value: data.student.gender },
      { label: '年龄', value: `${data.student.age}岁` },
      { label: '评估日期', value: data.assessment.date },
      { label: 'PI', value: `${data.assessment.pi_score}` },
      { label: 'NI', value: `${data.assessment.ni_score}` },
      { label: '效度状态', value: data.assessment.is_valid ? '有效' : '需留意' },
      { label: '多动指数 T分', value: `${data.totalScore}` },
    ],
    sections: [
      {
        type: 'paragraph',
        heading: '总体说明',
        paragraphs: [
          cleanText(data.summary),
          data.assessment.invalid_reason ? `效度说明：${cleanText(data.assessment.invalid_reason)}` : '',
        ].filter(Boolean),
      },
      {
        type: 'table',
        heading: '维度结果',
        columns: ['维度', '原始分', 'T分', '等级', '评估说明', '建议'],
        columnWidths: [18, 10, 10, 12, 24, 26],
        rows: data.dimensions.map((dim) => [
          dim.name,
          `${dim.rawScore}`,
          dim.tScore !== undefined ? `${dim.tScore}` : '-',
          dim.level,
          cleanText(dim.description),
          cleanText(dim.advice),
        ]),
      },
      {
        type: 'list',
        heading: '专家建议',
        items: data.advice.map(cleanText).filter(Boolean),
      },
    ],
  }
}

export function buildSMWordPayload(data: SMExportData, filename?: string): WordExportPayload {
  const dimensionRows = [
    ['交往', `${data.dimensions.communication.pass}/${data.dimensions.communication.total}`],
    ['作业', `${data.dimensions.work.pass}/${data.dimensions.work.total}`],
    ['运动能力', `${data.dimensions.movement.pass}/${data.dimensions.movement.total}`],
    ['独立生活能力', `${data.dimensions.independent_life.pass}/${data.dimensions.independent_life.total}`],
    ['自我管理', `${data.dimensions.self_management.pass}/${data.dimensions.self_management.total}`],
    ['集体活动', `${data.dimensions.group_activity.pass}/${data.dimensions.group_activity.total}`],
  ]

  return {
    title: '婴儿-初中生社会生活能力量表评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: filename || buildFilename('S-M评估报告', data.student.name),
    meta: [
      { label: '学生姓名', value: data.student.name },
      { label: '性别', value: data.student.gender },
      { label: '年龄', value: `${data.student.age}岁` },
      { label: '评估日期', value: data.assessment.date },
      { label: '粗分', value: `${data.assessment.raw_score}` },
      { label: '标准分', value: `${data.assessment.sq_score}` },
      { label: '评定等级', value: data.assessment.level },
    ],
    sections: [
      {
        type: 'table',
        heading: '各维度结果',
        columns: ['维度', '通过/总题数'],
        columnWidths: [50, 50],
        rows: dimensionRows,
      },
      {
        type: 'list',
        heading: '训练建议',
        items: data.suggestions.map(cleanText).filter(Boolean),
      },
      {
        type: 'list',
        heading: '家庭训练指导',
        items: data.guidance.map(cleanText).filter(Boolean),
      },
    ],
  }
}

export function buildWeeFIMWordPayload(data: WeeFIMExportData, filename?: string): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: '总得分', value: `${data.assessment.total_score}/126` },
        { label: '运动功能得分', value: `${data.assessment.motor_score}/91` },
        { label: '认知功能得分', value: `${data.assessment.cognitive_score}/35` },
        { label: '独立性等级', value: data.assessment.level },
      ],
    },
  ]

  data.categories.forEach((category) => {
    sections.push({
      type: 'table',
      heading: category.name,
      columns: ['项目', '得分', '等级'],
      columnWidths: [60, 20, 20],
      rows: category.items.map((item) => [
        item.title,
        `${item.score}/7`,
        item.level,
      ]),
    })
  })

  sections.push(
    {
      type: 'list',
      heading: '短期目标',
      items: data.suggestions.shortTerm.map(cleanText).filter(Boolean),
    },
    {
      type: 'list',
      heading: '长期目标',
      items: data.suggestions.longTerm.map(cleanText).filter(Boolean),
    },
    {
      type: 'list',
      heading: '训练建议',
      items: data.suggestions.training.map(cleanText).filter(Boolean),
    },
    {
      type: 'list',
      heading: '环境建议',
      items: data.suggestions.environment.map(cleanText).filter(Boolean),
    },
  )

  return {
    title: '改良儿童功能独立性评估量表报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: filename || buildFilename('WeeFIM评估报告', data.student.name),
    meta: [
      { label: '学生姓名', value: data.student.name },
      { label: '性别', value: data.student.gender },
      { label: '年龄', value: `${data.student.age}岁` },
      { label: '评估日期', value: data.assessment.date },
    ],
    sections,
  }
}

// ============ CPEP-3（PEP-3 心理教育量表·中文修订版）导出 ============

/** CPEP-3 Word 导出输入（快照合同的最小展示子集，Report.vue 从 Cpep3ReportSnapshot 组装） */
export interface Cpep3WordReportInput {
  studentName: string
  gender?: string
  birthday?: string
  assessmentDate: string
  caAgeText: string
  /** 报告版本（旧记录无快照时为空） */
  reportVersion: string
  /** 计分口径固定文案 */
  scoringNote: string
  /** 整体概况摘要（规则生成） */
  summary: string
  /** 7 发展能区行 */
  developmentalRows: Array<{
    name: string
    pCount: number
    eCount: number
    fCount: number
    total: number
    monthRange: string
    completionPct: number
  }>
  /** 5 适应不良行为能区行 */
  maladaptiveRows: Array<{
    name: string
    counts: { A: number; M: number; S: number }
    severityScore: number
    note: string
  }>
  /** 照顾者报告说明（明示未配置） */
  caregiverNote: string
  strengths: string[]
  emergingSkills: Array<{ teachingDomain: string; skillName: string; suggestedGoal: string }>
  supportNeeds: Array<{ domainName: string; taskName: string; priorityLabel: string; suggestedGoal: string }>
  iepPriority: Array<{ domainName: string; currentPerformance: string; goalText: string; criteria: string; promptLevel: string; setting: string }>
  iepSecondary: string[]
  familyGeneralization: string[]
  /** 结果解读说明与限制（含逐条 li） */
  limitations: string[]
  /** 动态免责声明（快照 limitations 字段；无快照旧行为空） */
  dynamicDisclaimer: string
  /** 年龄适用性告警（超龄/天花板，页面报告头 el-alert 同源；无告警为空串） */
  ageApplicabilityWarning: string
  /** 逐题明细 */
  detailRows: Array<{ codeNo: string; domainName: string; taskName: string; typeLabel: string; levelLabel: string }>
}

export function buildCpep3WordPayload(input: Cpep3WordReportInput): WordExportPayload {
  // 注意：payload.meta 已由 export-word.ts:227 自动渲染为「基本信息」H1 表，
  // CPEP-3 特有字段（性别/出生日期/CA/报告版本/计分口径）并入 meta，不再另推同名 kv-table。
  const sections: WordExportPayload['sections'] = [
    { type: 'paragraph', heading: '评估说明', paragraphs: ['本评估用于了解儿童当前发展特点、学习优势、发展中技能及教育支持需求，主要服务于个别化教育计划（IEP）和教学干预设计。本报告不作为独立医学诊断依据。'] },
  ]

  // 年龄适用性告警（对齐 CNBSR 侧「常模范围说明」的处理；页面 :52-58 同源）
  if (input.ageApplicabilityWarning) {
    sections.push({ type: 'paragraph', heading: '结果解读警示', paragraphs: [cleanText(input.ageApplicabilityWarning)] })
  }

  if (input.summary) {
    sections.push({ type: 'paragraph', heading: '整体发展概况', paragraphs: [cleanText(input.summary)] })
  }

  sections.push({
    type: 'table',
    heading: '发展能区明细（7 区 · 施测题）',
    columns: ['能区', '通过', '萌发', '未表现', '总题', '发展当量月龄', '完成度'],
    rows: input.developmentalRows.map((r) => [
      r.name,
      String(r.pCount),
      String(r.eCount),
      String(r.fCount),
      String(r.total),
      r.monthRange ? `${r.monthRange}月` : '不适用',
      `${r.completionPct}%`,
    ]),
  })

  sections.push(
    {
      type: 'table',
      heading: '适应不良行为观察（5 区 · 观察题）',
      columns: ['能区', '适当(A)', '轻微(M)', '严重(S)', '严重度分', '观察概况'],
      rows: input.maladaptiveRows.map((r) => [
        r.name,
        String(r.counts.A),
        String(r.counts.M),
        String(r.counts.S),
        String(r.severityScore),
        cleanText(r.note),
      ]),
    },
    {
      type: 'paragraph',
      heading: '照顾者报告',
      paragraphs: [cleanText(input.caregiverNote) || '当前系统未配置 CPEP-3 照顾者报告量表，本区暂无数据。'],
    },
  )

  sections.push({
    type: 'list',
    heading: '相对优势',
    items: input.strengths.length ? input.strengths.map(cleanText) : ['本次评估未识别出通过率过半的能区；建议从萌发技能与基础技能入手安排教学。'],
  })

  if (input.emergingSkills.length) {
    sections.push({
      type: 'table',
      heading: 'Emerging Skills（萌发技能）',
      columns: ['领域', '技能', '教学意义'],
      rows: input.emergingSkills.map((s) => [cleanText(s.teachingDomain), cleanText(s.skillName), cleanText(s.suggestedGoal)]),
    })
  }

  if (input.supportNeeds.length) {
    sections.push({
      type: 'table',
      heading: '当前需要支持的技能',
      columns: ['领域', '技能', '优先级', '建议'],
      rows: input.supportNeeds.map((s) => [cleanText(s.domainName), cleanText(s.taskName), s.priorityLabel, cleanText(s.suggestedGoal)]),
    })
  }

  if (input.iepPriority.length) {
    sections.push({
      type: 'table',
      heading: 'IEP 优先教学目标（源自萌发技能，需教师确认后纳入正式 IEP）',
      columns: ['领域', '当前表现', '建议目标', '达成标准', '提示策略', '训练场景'],
      rows: input.iepPriority.map((g) => [
        cleanText(g.domainName),
        cleanText(g.currentPerformance),
        cleanText(g.goalText),
        cleanText(g.criteria),
        cleanText(g.promptLevel),
        cleanText(g.setting),
      ]),
    })
  }

  if (input.iepSecondary.length) {
    sections.push({ type: 'list', heading: '次级训练目标', items: input.iepSecondary.map(cleanText) })
  }

  if (input.familyGeneralization.length) {
    sections.push({ type: 'list', heading: '家庭泛化建议', items: input.familyGeneralization.map(cleanText) })
  }

  sections.push(
    { type: 'list', heading: '结果解读说明与限制', items: input.limitations.map(cleanText).filter(Boolean) },
  )
  // 快照动态免责段（页面 reportLimitations 同源；无快照旧行为空不渲染）
  if (input.dynamicDisclaimer) {
    sections.push({ type: 'paragraph', heading: '评估结果使用声明', paragraphs: [cleanText(input.dynamicDisclaimer)] })
  }
  sections.push({
    type: 'table',
    heading: '逐题作答明细',
    columns: ['题号', '能区', '任务', '类型', '评级'],
    rows: input.detailRows.map((d) => [d.codeNo, d.domainName, cleanText(d.taskName), d.typeLabel, d.levelLabel]),
  })

  return {
    title: 'C-PEP-3 儿童心理教育评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('CPEP3评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender || '未填写' },
      { label: '出生日期', value: input.birthday || '未填写' },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '实际年龄 CA', value: input.caAgeText },
      { label: '报告版本', value: input.reportVersion || '旧版记录（请重测生成完整报告）' },
      { label: '计分口径', value: input.scoringNote },
    ],
    sections,
  }
}

// ============ CNBSR2016（儿心量表Ⅱ）导出 ============

/** CNBSR2016 Word 导出输入（Report.vue 从 reportViewModel 组装） */
export interface Cnbsr2016WordReportInput {
  studentName: string
  gender: string
  assessmentDate: string
  ageMonths: number
  ageBracketLabel: string
  /** 常模覆盖文案 */
  supportedAgeRangeText: string
  isAgeSupported: boolean
  /** 大运动/精细动作/适应能力/语言/社会行为五区 */
  domainRows: Array<{
    name: string
    mentalAge: string
    dq: string
    level: string
    passedCount: number
    failedCount: number
    manualFailedCount: number
    autoFilledFailedCount: number
    /** 能区解读（富文本，导出时去标记） */
    content: string
    advice: Array<{ tag: string; text: string }>
  }>
  /** 总体解读三段（结果摘要/发展优势/建议重点） */
  overallSummary: string
  overallStrengths: string
  overallSuggestions: string
  /** 专家临床提示（4 段可选） */
  expertClinical: Array<{ label: string; text: string }>
  /** 重点干预建议（页面「重点干预建议」卡对应；仅 borderline/delayed 能区有） */
  interventions: Array<{
    domainName: string
    dqStatusLabel: string
    short?: string
    long?: string
    freq?: string
    methods?: string[]
    home?: string[]
  }>
  /** 结论标签（如 "发育正常"） */
  overallConclusionLabel: string
  /** DQ 状态文案 */
  dqStatusLabel: string
  totalMentalAge: string
  dq: string
  manualIepTargets: Array<{ name: string; description: string; status: string }>
  autoFilledFailedItems: string[]
}

export function buildCnbsr2016WordPayload(input: Cnbsr2016WordReportInput): WordExportPayload {
  // 注意：payload.meta 已由 export-word.ts:227 自动渲染为「基本信息」H1 表，
  // 此处不再另推同名 kv-table（避免双「基本信息」标题与姓名/日期重复）。
  const sections: WordExportPayload['sections'] = []

  if (input.isAgeSupported) {
    sections.push(
      { type: 'paragraph', heading: '结果摘要', paragraphs: [cleanText(input.overallSummary) || '当前未配置总体摘要。'] },
      { type: 'paragraph', heading: '发展优势', paragraphs: [cleanText(input.overallStrengths) || '当前未配置优势摘要。'] },
      { type: 'paragraph', heading: '建议重点', paragraphs: [cleanText(input.overallSuggestions) || '当前未配置建议重点。'] },
    )
    if (input.expertClinical.length) {
      sections.push({
        type: 'list',
        heading: '专家临床提示',
        items: input.expertClinical.map((c) => `${c.label}：${cleanText(c.text)}`),
      })
    }
  }

  sections.push({
    type: 'table',
    heading: '五能区结果总览',
    columns: ['能区', '智龄 MA(月)', 'DQ', '结论', '通过/失败', '手动失败', '自动补记失败'],
    rows: input.domainRows.map((r) => [
      r.name,
      r.mentalAge,
      r.dq,
      r.level,
      `${r.passedCount} / ${r.failedCount}`,
      String(r.manualFailedCount),
      String(r.autoFilledFailedCount),
    ]),
  })

  // 能区反馈与建议（逐区段落）
  for (const domain of input.domainRows) {
    const adviceItems = domain.advice.map((a) => `${a.tag}：${cleanText(a.text)}`)
    sections.push({
      type: 'paragraph',
      heading: `${domain.name}（MA ${domain.mentalAge} 月 · DQ ${domain.dq} · ${domain.level}）`,
      paragraphs: [
        cleanText(domain.content) || '当前未配置能区解读。',
        ...(adviceItems.length ? [`建议方向：${adviceItems.join('；')}`] : []),
      ],
    })
  }

  // 重点干预建议（页面「重点干预建议」卡对应；borderline/delayed 能区才有；
  // 页面该卡在 v-if="isAgeSupported" 块内——超龄记录同步省略）
  if (input.isAgeSupported && input.interventions.length) {
    for (const item of input.interventions) {
      const methodItems = (item.methods || []).map((m) => cleanText(m)).filter(Boolean)
      const homeItems = (item.home || []).map((m) => cleanText(m)).filter(Boolean)
      const paragraphs = [
        cleanText(item.short) || '',
        cleanText(item.long) || '',
        item.freq ? `建议频次：${item.freq}` : '',
      ].filter(Boolean)
      sections.push({
        type: 'paragraph',
        heading: `重点干预建议：${item.domainName}（${item.dqStatusLabel}）`,
        paragraphs,
      })
      if (methodItems.length) sections.push({ type: 'list', heading: `${item.domainName} · 训练方法`, items: methodItems })
      if (homeItems.length) sections.push({ type: 'list', heading: `${item.domainName} · 家庭配合`, items: homeItems })
    }
  }

  if (input.manualIepTargets.length) {
    sections.push({
      type: 'table',
      heading: '手动失败 IEP 目标',
      columns: ['项目', '操作提示', '通过标准'],
      rows: input.manualIepTargets.map((t) => [cleanText(t.name), cleanText(t.description), cleanText(t.status)]),
    })
  }

  if (input.autoFilledFailedItems.length) {
    sections.push({ type: 'list', heading: '自动补记失败项（已排除出 IEP 目标）', items: input.autoFilledFailedItems.map(cleanText) })
  }

  if (!input.isAgeSupported) {
    sections.push({
      type: 'paragraph',
      heading: '常模范围说明',
      paragraphs: [`本记录评估时年龄已超出儿心量表Ⅱ标准常模覆盖的${input.supportedAgeRangeText}，请勿按有效常模结论继续使用，必要时优先考虑 Conners 评定量表或 Achenbach 儿童行为量表（CBCL）。`],
    })
  }

  return {
    title: '儿心量表Ⅱ（0-6岁儿童发育行为评估量表）评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('儿心量表Ⅱ评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
    ],
    sections,
  }
}

// ============ ABC（孤独症儿童行为评定量表）导出 ============

export interface AbcWordReportInput {
  studentName: string
  assessmentDate: string
  ageMonths: number
  totalScore: number
  totalMaxScore: number
  levelText: string
  /** 维度得分（感觉/交往/躯体运动/语言/生活自理） */
  dimensionRows: Array<{ name: string; score: number; maxScore: number; percentage: string; description: string }>
  /** generateFeedback 产出的解释与建议 */
  summary: string
  recommendations: string[]
}

export function buildAbcWordPayload(input: AbcWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'table',
      heading: '评估结果总览',
      columns: ['总分', '满分', '评估等级'],
      rows: [[String(input.totalScore), String(input.totalMaxScore), input.levelText]],
    },
    { type: 'paragraph', heading: '结果解释', paragraphs: [cleanText(input.summary) || '本次评估未生成结果解释。'] },
    {
      type: 'table',
      heading: '维度得分明细',
      columns: ['维度', '得分', '满分', '得分占比', '说明'],
      rows: input.dimensionRows.map((d) => [d.name, String(d.score), String(d.maxScore), `${d.percentage}%`, d.description]),
    },
    { type: 'list', heading: '建议', items: input.recommendations.map(cleanText).filter(Boolean) },
    { type: 'paragraph', heading: '工具说明', paragraphs: ['ABC 为孤独症筛查工具（初筛），最终诊断需由专业医生结合临床观察、发育史等综合判断。'] },
  ]

  return {
    title: 'ABC 孤独症儿童行为评定量表报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('ABC评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '评估月龄', value: formatAgeMonths(input.ageMonths) },
    ],
    sections,
  }
}

// ============ ATEC（孤独症治疗评估量表）导出 ============

export interface AtecWordReportInput {
  studentName: string
  assessmentDate: string
  ageMonths: number
  totalScore: number
  totalMaxScore: number
  levelText: string
  /** 分量表得分（表达/社交/感知认知/健康） */
  subscaleRows: Array<{ name: string; score: number; maxScore: number; percentage: string; description: string; scoringNote: string }>
  summary: string
  recommendations: string[]
}

export function buildAtecWordPayload(input: AtecWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'table',
      heading: '评估结果总览',
      columns: ['总分', '满分', '评估等级'],
      rows: [[String(input.totalScore), String(input.totalMaxScore), input.levelText]],
    },
    { type: 'paragraph', heading: '结果解释', paragraphs: [cleanText(input.summary) || '本次评估未生成结果解释。'] },
    {
      type: 'table',
      heading: '分量表得分明细',
      columns: ['分量表', '得分', '满分', '得分占比', '说明', '计分方向'],
      rows: input.subscaleRows.map((s) => [s.name, String(s.score), String(s.maxScore), `${s.percentage}%`, s.description, s.scoringNote]),
    },
    { type: 'list', heading: '建议', items: input.recommendations.map(cleanText).filter(Boolean) },
    { type: 'paragraph', heading: '工具说明', paragraphs: ['ATEC 用于孤独症康复进展追踪，建议每 3 个月复测一次，观察总分与各分量表得分的变化趋势。'] },
  ]

  return {
    title: 'ATEC 孤独症治疗评估量表报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('ATEC评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '评估月龄', value: formatAgeMonths(input.ageMonths) },
    ],
    sections,
  }
}

// ============ CRT（瑞文图形推理测验）导出 ============

export interface CrtWordReportInput {
  studentName: string
  gender: string
  assessmentDate: string
  ageText: string
  iqEstimate: number
  percentileRank: number
  totalRawScore: number
  totalQuestions: number
  level: string
  resultDescription: string
  /** 五组（SPM A–E）答对情况 */
  unitRows: Array<{ name: string; correct: number; total: number; rate: number; description: string }>
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  trainingFocus: string
}

export function buildCrtWordPayload(input: CrtWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: '离差 IQ 估算', value: `${input.iqEstimate}（M=100，SD=15）` },
        { label: '百分位', value: `${input.percentileRank}` },
        { label: '原始分（答对数）', value: `${input.totalRawScore} / ${input.totalQuestions}` },
        { label: '水平判定', value: input.level },
      ],
    },
    { type: 'paragraph', heading: '结果解释', paragraphs: [cleanText(input.resultDescription) || '本次评估未生成结果解释。'] },
  ]

  if (input.unitRows.length) {
    sections.push({
      type: 'table',
      heading: '五组答对情况（SPM A–E）',
      columns: ['组别', '答对', '总数', '答对率', '能力类型'],
      rows: input.unitRows.map((u) => [u.name, String(u.correct), String(u.total), `${u.rate}%`, u.description]),
    })
  }

  if (input.strengths.length) sections.push({ type: 'list', heading: '优势能力', items: input.strengths.map(cleanText) })
  if (input.weaknesses.length) sections.push({ type: 'list', heading: '需提升能力', items: input.weaknesses.map(cleanText) })
  if (input.trainingFocus) sections.push({ type: 'paragraph', heading: '训练重点', paragraphs: [cleanText(input.trainingFocus)] })
  if (input.recommendations.length) sections.push({ type: 'list', heading: '具体建议', items: input.recommendations.map(cleanText) })

  sections.push({
    type: 'paragraph',
    heading: '重要提示',
    paragraphs: ['本测验用于儿童图形推理能力的筛查与发展监测，不能作为医学诊断依据。如结果提示显著落后或家长有其他发育相关顾虑，请前往正规医院儿童发育行为科或儿童心理科进行专业评估。'],
  })

  return {
    title: '瑞文图形推理测验（CRT）评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('CRT评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender },
      { label: '年龄', value: input.ageText },
      { label: '评估日期', value: input.assessmentDate },
    ],
    sections,
  }
}

// ============ 精细运动（FMDA）导出 ============

export interface FineMotorWordReportInput {
  studentName: string
  gender: string
  assessmentDate: string
  ageText: string
  totalScore: number
  totalMaxScore: number
  masteryPercent: number
  overallTitle: string
  overallSummary: string
  overallAdvice: string
  /** 6 维度表现 */
  domainRows: Array<{ name: string; rawScore: number; maxScore: number; masteryPercent: number; statusLabel: string; title: string; summary: string; expertAdvice: string }>
  /** IEP 目标（萌发/未掌握项） */
  iepTargets: Array<{ title: string; dimensionName: string; priorityLabel: string; iepGoal: string; expertAdvice: string }>
}

export function buildFineMotorWordPayload(input: FineMotorWordReportInput): WordExportPayload {
  // 占位符兜底替换（页面 formatPlainText 已替换，此处防漏网——studentName 空时回退"该儿童"）
  const resolvePlaceholder = (text: string) => String(text || '').replace(/\[儿童姓名\]/g, input.studentName || '该儿童')
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '总体发展水平',
      rows: [
        { label: '总得分', value: `${input.totalScore} / ${input.totalMaxScore}（掌握度 ${input.masteryPercent}%）` },
        { label: '总体判定', value: input.overallTitle },
        { label: '总体解读', value: cleanText(resolvePlaceholder(input.overallSummary)) || '当前未配置总体解读。' },
        ...(input.overallAdvice ? [{ label: '专家建议', value: cleanText(resolvePlaceholder(input.overallAdvice)) }] : []),
      ],
    },
    {
      type: 'table',
      heading: '各维度表现',
      columns: ['维度', '得分', '满分', '掌握度', '状态', '判定'],
      rows: input.domainRows.map((d) => [
        d.name,
        String(d.rawScore),
        String(d.maxScore),
        `${d.masteryPercent}%`,
        d.statusLabel,
        d.title,
      ]),
    },
  ]

  for (const d of input.domainRows) {
    if (d.summary || d.expertAdvice) {
      sections.push({
        type: 'paragraph',
        heading: `${d.name}（${d.statusLabel} · ${d.title}）`,
        paragraphs: [
          cleanText(resolvePlaceholder(d.summary)) || '当前未配置维度解读。',
          ...(d.expertAdvice ? [`专家建议：${cleanText(resolvePlaceholder(d.expertAdvice))}`] : []),
        ],
      })
    }
  }

  if (input.iepTargets.length) {
    sections.push({
      type: 'table',
      heading: 'IEP 目标建议（萌发与未掌握项，需教师确认后纳入正式 IEP）',
      columns: ['优先级', '维度', '技能', 'IEP 目标', '专家建议'],
      rows: input.iepTargets.map((t) => [t.priorityLabel, t.dimensionName, cleanText(t.title), cleanText(t.iepGoal || ''), cleanText(t.expertAdvice || '')]),
    })
  }

  return {
    title: '学前儿童小肌肉功能发展评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('精细运动评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender },
      { label: '年龄', value: input.ageText },
      { label: '评估日期', value: input.assessmentDate },
    ],
    sections,
  }
}

// ============ TGMD-3（大肌肉动作发展测验）导出 ============

export interface Tgmd3WordReportInput {
  studentName: string
  gender: string
  assessmentDate: string
  ageText: string
  totalScore: number
  level: string
  overallTitle: string
  overallSummary: string
  overallAdvice: string[]
  /** 两个分测验（位移技能/控球技能） */
  domainRows: Array<{ name: string; rawScore: number; maxScore: number; percentage: number; normLabel: string; level: string }>
  domainFeedback: Array<{ title: string; label: string; content: string; advice: string }>
  /** IEP 目标 */
  iepTargets: Array<{ itemCode: string; title: string; dimensionName: string; priorityLabel: string; rationale: string; advice: string }>
  /** 预警标志（severityLabel: 高风险/提醒） */
  flags: Array<{ title: string; severityLabel: string; content: string; advice: string }>
  /** 保存明细（含器材准备与指导语，教师复测需要） */
  detailRows: Array<{ itemCode: string; dimensionName: string; title: string; scoreText: string; equipment: string; guidance: string }>
}

export function buildTgmd3WordPayload(input: Tgmd3WordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '总体评估',
      rows: [
        { label: '总分', value: String(input.totalScore) },
        { label: '总体判定', value: `${input.level} · ${input.overallTitle}` },
        { label: '总体解读', value: cleanText(input.overallSummary) || '当前未配置总体解读。' },
      ],
    },
  ]

  if (input.overallAdvice.length) {
    sections.push({ type: 'list', heading: '总体建议', items: input.overallAdvice.map(cleanText) })
  }

  sections.push({
    type: 'table',
    heading: '分测验表现',
    columns: ['分测验', '原始分', '满分', '得分率', '常模水平', '判定'],
    rows: input.domainRows.map((d) => [
      d.name,
      String(d.rawScore),
      String(d.maxScore),
      `${d.percentage}%`,
      d.normLabel || '不适用',
      d.level,
    ]),
  })

  for (const fb of input.domainFeedback) {
    sections.push({
      type: 'paragraph',
      heading: `${fb.title}（${fb.label}）`,
      paragraphs: [cleanText(fb.content) || '当前未配置解读。', ...(fb.advice ? [`建议：${cleanText(fb.advice)}`] : [])],
    })
  }

  if (input.iepTargets.length) {
    sections.push({
      type: 'table',
      heading: 'IEP 目标建议（需教师确认后纳入正式 IEP）',
      columns: ['优先级', '项目', '分测验', '技能', '判定依据', '建议'],
      rows: input.iepTargets.map((t) => [t.priorityLabel, t.itemCode, t.dimensionName, cleanText(t.title), cleanText(t.rationale), cleanText(t.advice)]),
    })
  }

  if (input.flags.length) {
    for (const f of input.flags) {
      sections.push({
        type: 'paragraph',
        heading: `预警提示（${f.severityLabel}）：${f.title}`,
        paragraphs: [cleanText(f.content), ...(f.advice ? [`建议：${cleanText(f.advice)}`] : [])],
      })
    }
  }

  if (input.detailRows.length) {
    sections.push({
      type: 'table',
      heading: '保存明细',
      columns: ['项目', '分测验', '技能', '录入分', '器材准备', '场地路线与测试指导语'],
      rows: input.detailRows.map((d) => [d.itemCode, d.dimensionName, cleanText(d.title), d.scoreText, cleanText(d.equipment), cleanText(d.guidance)]),
      columnWidths: [8, 12, 20, 10, 20, 30],
    })
  }

  return {
    title: 'TGMD-3 大肌肉动作发展测验报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('TGMD-3评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender },
      { label: '年龄', value: input.ageText },
      { label: '评估日期', value: input.assessmentDate },
    ],
    sections,
  }
}

// ============ BRIEF（执行功能问卷，自编 DRAFT）导出 ============

export interface BriefWordReportInput {
  studentName: string
  gender: string
  assessmentDate: string
  ageMonths: number
  versionLabel: string
  totalTScore: number
  totalRawScore: number
  level: string
  /** 维度 T 分明细 */
  dimensionRows: Array<{ name: string; rawScore: number; tScore: number; levelName: string }>
}

export function buildBriefWordPayload(input: BriefWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '评估结果总览',
      rows: [
        { label: '全局执行复合 T 分', value: `${input.totalTScore}（均值 50，标准差 10）` },
        { label: '原始总分', value: String(input.totalRawScore) },
        { label: '水平判定', value: input.level },
        { label: '量表版本', value: input.versionLabel },
      ],
    },
  ]

  if (input.dimensionRows.length) {
    sections.push({
      type: 'table',
      heading: '维度 T 分详情',
      columns: ['维度', '原始分', 'T 分', '等级'],
      rows: input.dimensionRows.map((d) => [d.name, String(d.rawScore), String(d.tScore), d.levelName]),
      columnWidths: [34, 20, 20, 26],
    })
  }

  sections.push({
    type: 'paragraph',
    heading: '重要提示',
    paragraphs: ['本量表为「自编题目 + 占位常模」的草稿版，结果仅供教育支持与发展监测参考，不能作为医学诊断依据。如结果提示显著风险，请前往正规医院发育行为儿科或精神心理科就诊。'],
  })

  return {
    title: 'BRIEF 执行功能问卷评估报告（自编 DRAFT）',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('BRIEF评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '性别', value: input.gender || '未填写' },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '评估月龄', value: formatAgeMonths(input.ageMonths) },
    ],
    sections,
  }
}

// ============ 视知觉图形匹配筛查（自编 DRAFT）导出 ============

export interface CognitiveSelfWordReportInput {
  studentName: string
  assessmentDate: string
  ageMonths: number
  totalRawScore: number
  totalQuestions: number
  accuracyPercent: number
  verdictLabel: string
  overallMedianRtSeconds: number | null
  omittedCount: number
  anticipatoryCount: number
  practicePassed: boolean
  /** 四级难度层表现 */
  layerRows: Array<{ name: string; correct: number; total: number; rate: number; medianRtSeconds: number | null }>
  /** 错误类型分布 */
  errorRows: Array<{ label: string; errors: number; opportunities: number; note: string }>
}

export function buildCognitiveSelfWordPayload(input: CognitiveSelfWordReportInput): WordExportPayload {
  const sections: WordExportPayload['sections'] = [
    {
      type: 'kv-table',
      heading: '总体表现（描述性结果，不输出 IQ / 百分位 / 标准分）',
      rows: [
        { label: '总正确数', value: `${input.totalRawScore} / ${input.totalQuestions}（正确率 ${input.accuracyPercent}%）` },
        { label: '判读结论', value: input.verdictLabel },
        ...(input.overallMedianRtSeconds !== null ? [{ label: '答对平均用时', value: `${input.overallMedianRtSeconds} 秒` }] : []),
        ...(input.omittedCount > 0 || input.anticipatoryCount > 0
          ? [{
              label: '作答质量',
              value: [
                input.omittedCount > 0 ? `超时未答 ${input.omittedCount} 题` : '',
                input.anticipatoryCount > 0 ? `快速乱点 ${input.anticipatoryCount} 次` : '',
              ].filter(Boolean).join('；'),
            }]
          : []),
        { label: '练习题', value: input.practicePassed ? '两题通过' : '未全部通过（请先确认规则理解）' },
      ],
    },
  ]

  if (input.layerRows.length) {
    sections.push({
      type: 'table',
      heading: '各难度层级完成情况',
      columns: ['题目难度', '答对', '总数', '完成率', '答对平均用时'],
      rows: input.layerRows.map((l) => [
        l.name,
        String(l.correct),
        String(l.total),
        `${l.rate}%`,
        l.medianRtSeconds !== null ? `${l.medianRtSeconds} 秒` : '数据不足',
      ]),
    })
  }

  if (input.errorRows.length) {
    sections.push({
      type: 'table',
      heading: '错在哪里（错误类型分布）',
      columns: ['错误类型', '实际发生', '这类选项出现次数', '说明'],
      rows: input.errorRows.map((e) => [e.label, String(e.errors), String(e.opportunities), e.note]),
    })
  }

  sections.push({
    type: 'paragraph',
    heading: '重要提示',
    paragraphs: ['本任务为「自编题目 + 描述性结果」的草稿版筛查工具，图形由代码程序化生成，非标准化测验，无标准化效度/信度，不输出 IQ / 百分位 / 标准分。结果仅供教育支持与发展监测参考，不能作为医学诊断依据；转介建议必须基于重复测量、行为观察与其他资料。如怀疑孩子存在视知觉或认知加工问题，请前往正规医院儿童心理科或发育行为科进行专业评估。'],
  })

  return {
    title: '视知觉图形匹配筛查（DRAFT）评估报告',
    subtitle: '统一评估报告 Word 导出版',
    filename: buildFilename('视知觉筛查评估报告', input.studentName),
    meta: [
      { label: '学生姓名', value: input.studentName },
      { label: '评估日期', value: formatDate(input.assessmentDate) },
      { label: '评估月龄', value: formatAgeMonths(input.ageMonths) },
    ],
    sections,
  }
}
