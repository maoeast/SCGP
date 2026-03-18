import type { SDQDimensionDetail, SDQStructuredFeedback } from '@/types/sdq'
import type { CBCLStructuredFeedback } from '@/strategies/assessment/CBCLDriver'
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
