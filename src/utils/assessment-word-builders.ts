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
