import type { Component } from 'vue'
import {
  Avatar,
  Cpu,
  DataAnalysis,
  EditPen,
  HomeFilled,
  OfficeBuilding,
  Operation,
  Opportunity,
  Setting,
  Stamp,
  Sunny,
  TrophyBase,
  User,
} from '@element-plus/icons-vue'
import { CNBSR2016_SUPPORTED_AGE_RANGE_TEXT } from '@/config/cnbsr2016-thresholds'
import type { EntitlementCode } from '@/features/entitlements/entitlement-catalog'
import type { TrainingEntryCode } from '@/utils/training-entry'

export const ASSESSMENT_SCALE_CODES = [
  'sm',
  'weefim',
  'csirs',
  'conners-psq',
  'conners-trs',
  'sdq',
  'srs2',
  'cbcl',
  'cnbsr2016',
  'fine_motor',
  'gmfm_88',
  'tgmd_3',
  'brief',
  'crt',
] as const

export type AssessmentScaleCode = typeof ASSESSMENT_SCALE_CODES[number]

export const BUSINESS_MODULE_CODES = [
  'sensory',
  'emotional',
  'social',
  'cognitive',
  'life_skills',
] as const

export type BusinessModuleCode = typeof BUSINESS_MODULE_CODES[number]

type AssessmentTone = 'primary' | 'success' | 'warning' | 'danger' | 'info'

export interface AssessmentScaleTag {
  type: AssessmentTone
  label: string
  description: string
}

export interface AssessmentTabDefinition {
  id: TrainingEntryCode
  label: string
}

export interface AssessmentScaleCatalogItem {
  code: AssessmentScaleCode
  title: string
  subtitle: string
  icon: Component
  buttonType: AssessmentTone
  iconClass: string
  ageRange: string
  questionCount: string
  dimensions: string
  timeEstimate: string
  studentSelectorTitle: string
  studentSelectorTag: AssessmentScaleTag
  entryTabs: TrainingEntryCode[]
  accessEntitlementsAnyOf?: EntitlementCode[]
  accessModulesAnyOf: BusinessModuleCode[]
}

export type AssessmentModuleAccessChecker = (moduleCode: BusinessModuleCode) => boolean
export type AssessmentEntitlementAccessChecker = (entitlementCode: EntitlementCode) => boolean

export const ASSESSMENT_TABS: AssessmentTabDefinition[] = [
  { id: 'sensory-integration', label: '感官统合' },
  { id: 'emotional-regulation', label: '情绪调节' },
  { id: 'soothing-aids', label: '情绪安抚' },
  { id: 'social-communication', label: '社交沟通' },
  { id: 'fine-motor', label: '精细动作' },
  { id: 'life-skills', label: '生活自理' },
  { id: 'cognitive', label: '认知发展' },
]

export const ASSESSMENT_SCALE_CATALOG: AssessmentScaleCatalogItem[] = [
  {
    code: 'sm',
    title: '婴儿-初中生社会生活能力量表',
    subtitle: '(S-M量表)',
    icon: User,
    buttonType: 'primary',
    iconClass: 'sm-icon',
    ageRange: '6个月 - 14岁',
    questionCount: '132道',
    dimensions: '评估维度：交往、作业、运动能力、独立生活能力、自我管理、集体活动',
    timeEstimate: '约30-45分钟',
    studentSelectorTitle: '选择评估学生 - S-M量表',
    studentSelectorTag: {
      type: 'primary',
      label: 'S-M 社会生活能力',
      description: '评估儿童社会生活能力发展水平',
    },
    entryTabs: ['life-skills', 'social-communication'],
    accessEntitlementsAnyOf: ['life_skills'],
    accessModulesAnyOf: ['life_skills'],
  },
  {
    code: 'weefim',
    title: '改良儿童功能独立性评估量表',
    subtitle: '(WeeFIM量表)',
    icon: Setting,
    buttonType: 'success',
    iconClass: 'weefim-icon',
    ageRange: '0 - 18岁',
    questionCount: '18道',
    dimensions: '评估领域：日常生活活动（13题）、认知功能（5题）',
    timeEstimate: '约15-20分钟',
    studentSelectorTitle: '选择评估学生 - WeeFIM量表',
    studentSelectorTag: {
      type: 'success',
      label: 'WeeFIM 功能独立性',
      description: '评估儿童功能独立性发展水平',
    },
    entryTabs: ['life-skills'],
    accessEntitlementsAnyOf: ['life_skills'],
    accessModulesAnyOf: ['life_skills'],
  },
  {
    code: 'csirs',
    title: '儿童感觉统合能力发展评定量表',
    subtitle: '(CSIRS量表)',
    icon: Sunny,
    buttonType: 'warning',
    iconClass: 'csirs-icon',
    ageRange: '3 - 12岁',
    questionCount: '58道',
    dimensions: '评估维度：前庭觉、触觉、本体感、学习能力、执行功能',
    timeEstimate: '约15-20分钟',
    studentSelectorTitle: '选择评估学生 - CSIRS量表',
    studentSelectorTag: {
      type: 'warning',
      label: 'CSIRS 感觉统合',
      description: '评估儿童感觉统合能力',
    },
    entryTabs: ['sensory-integration'],
    accessEntitlementsAnyOf: ['sensory_integration'],
    accessModulesAnyOf: ['sensory'],
  },
  {
    code: 'conners-psq',
    title: 'Conners 父母用问卷',
    subtitle: '(PSQ量表)',
    icon: HomeFilled,
    buttonType: 'danger',
    iconClass: 'conners-psq-icon',
    ageRange: '3 - 17岁',
    questionCount: '48道',
    dimensions: '评估维度：品行问题、学习问题、冲动性、焦虑、多动指数',
    timeEstimate: '约10-15分钟',
    studentSelectorTitle: '选择评估学生 - Conners父母问卷',
    studentSelectorTag: {
      type: 'danger',
      label: 'Conners 父母问卷',
      description: '评估儿童在家中的行为表现',
    },
    entryTabs: ['emotional-regulation', 'soothing-aids'],
    accessEntitlementsAnyOf: ['emotional', 'soothing_aids'],
    accessModulesAnyOf: ['emotional'],
  },
  {
    code: 'conners-trs',
    title: 'Conners 教师用问卷',
    subtitle: '(TRS量表)',
    icon: OfficeBuilding,
    buttonType: 'info',
    iconClass: 'conners-trs-icon',
    ageRange: '3 - 17岁',
    questionCount: '28道',
    dimensions: '评估维度：品行问题、多动、注意力缺陷、多动指数',
    timeEstimate: '约5-10分钟',
    studentSelectorTitle: '选择评估学生 - Conners教师问卷',
    studentSelectorTag: {
      type: 'info',
      label: 'Conners 教师问卷',
      description: '评估儿童在学校中的行为表现',
    },
    entryTabs: ['emotional-regulation'],
    accessEntitlementsAnyOf: ['emotional'],
    accessModulesAnyOf: ['emotional'],
  },
  {
    code: 'sdq',
    title: '长处和困难问卷',
    subtitle: '(SDQ量表 - 父母版)',
    icon: Stamp,
    buttonType: 'warning',
    iconClass: 'sdq-icon',
    ageRange: '3 - 16岁',
    questionCount: '25道',
    dimensions: '评估维度：情绪症状、品行问题、多动注意、同伴交往、亲社会行为',
    timeEstimate: '约5-10分钟',
    studentSelectorTitle: '选择评估学生 - SDQ长处和困难问卷',
    studentSelectorTag: {
      type: 'warning',
      label: 'SDQ 长处和困难问卷',
      description: '评估儿童的情绪、行为及社交能力',
    },
    entryTabs: ['emotional-regulation', 'social-communication'],
    accessEntitlementsAnyOf: ['emotional', 'social_communication'],
    accessModulesAnyOf: ['emotional', 'social'],
  },
  {
    code: 'srs2',
    title: '社交反应量表第二版',
    subtitle: '(SRS-2 学龄版)',
    icon: Avatar,
    buttonType: 'primary',
    iconClass: 'srs2-icon',
    ageRange: '6 - 18岁',
    questionCount: '65道',
    dimensions: '评估维度：社交觉知、社交认知、社交沟通、社交动机、刻板行为',
    timeEstimate: '约15-20分钟',
    studentSelectorTitle: '选择评估学生 - SRS-2社交反应量表',
    studentSelectorTag: {
      type: 'primary',
      label: 'SRS-2 社交反应量表',
      description: '评估儿童社交反应能力',
    },
    entryTabs: ['social-communication'],
    accessEntitlementsAnyOf: ['social_communication'],
    accessModulesAnyOf: ['social'],
  },
  {
    code: 'cbcl',
    title: 'Achenbach儿童行为量表',
    subtitle: '(CBCL 家长版)',
    icon: DataAnalysis,
    buttonType: 'warning',
    iconClass: 'cbcl-icon',
    ageRange: '4 - 16岁',
    questionCount: '113道 + 社会能力评估',
    dimensions: '评估维度：社会能力、行为问题（内化/外化）',
    timeEstimate: '约20-30分钟',
    studentSelectorTitle: '选择评估学生 - CBCL儿童行为量表',
    studentSelectorTag: {
      type: 'success',
      label: 'CBCL 儿童行为量表',
      description: '评估儿童社会能力与行为问题',
    },
    entryTabs: ['emotional-regulation', 'soothing-aids'],
    accessEntitlementsAnyOf: ['emotional', 'soothing_aids'],
    accessModulesAnyOf: ['emotional'],
  },
  {
    code: 'cnbsr2016',
    title: '儿童发育行为评估量表',
    subtitle: '(儿心量表Ⅱ)',
    icon: Opportunity,
    buttonType: 'success',
    iconClass: 'dev-behavior-icon',
    ageRange: CNBSR2016_SUPPORTED_AGE_RANGE_TEXT,
    questionCount: '261道',
    dimensions: '评估维度：大运动、精细运动、适应能力、语言、社会行为',
    timeEstimate: '约30-40分钟',
    studentSelectorTitle: '选择评估学生 - 儿心量表Ⅱ',
    studentSelectorTag: {
      type: 'success',
      label: '儿心量表Ⅱ',
      description: '评估儿童大运动、精细动作、适应能力、语言与社会行为发展水平',
    },
    entryTabs: ['sensory-integration', 'fine-motor', 'social-communication', 'life-skills', 'cognitive'],
    accessEntitlementsAnyOf: ['sensory_integration', 'fine_motor', 'social_communication', 'life_skills', 'cognitive'],
    accessModulesAnyOf: ['sensory'],
  },
  {
    code: 'tgmd_3',
    title: '大肌肉动作发展测验',
    subtitle: '(TGMD-3)',
    icon: TrophyBase,
    buttonType: 'warning',
    iconClass: 'tgmd-icon',
    ageRange: '3岁0个月 - 10岁11个月',
    questionCount: '13项动作技能',
    dimensions: '评估维度：位移技能（6项）、球类技能（7项）',
    timeEstimate: '约15-20分钟',
    studentSelectorTitle: '选择评估学生 - TGMD-3大肌肉动作发展测验',
    studentSelectorTag: {
      type: 'warning',
      label: 'TGMD-3 大肌肉动作',
      description: '评估儿童位移技能与球类技能发展水平',
    },
    entryTabs: ['sensory-integration'],
    accessEntitlementsAnyOf: ['sensory_integration'],
    accessModulesAnyOf: ['sensory'],
  },
  {
    code: 'gmfm_88',
    title: '粗大运动功能评定量表',
    subtitle: '(GMFM-88)',
    icon: Operation,
    buttonType: 'primary',
    iconClass: 'gmfm-icon',
    ageRange: '5个月 - 16岁',
    questionCount: '88项',
    dimensions: '评估维度：卧位与翻身、坐位、爬与跪、站立、行走跑跳',
    timeEstimate: '约45-60分钟',
    studentSelectorTitle: '选择评估学生 - GMFM-88粗大运动功能评定量表',
    studentSelectorTag: {
      type: 'danger',
      label: 'GMFM-88 粗大运动功能',
      description: '评估儿童卧位翻身、坐位、爬跪、站立与走跑跳能力',
    },
    entryTabs: ['sensory-integration'],
    accessEntitlementsAnyOf: ['sensory_integration'],
    accessModulesAnyOf: ['sensory'],
  },
  {
    code: 'fine_motor',
    title: '小肌肉功能发展评估量表',
    subtitle: '(FMDA)',
    icon: EditPen,
    buttonType: 'primary',
    iconClass: 'fmda-icon',
    ageRange: '0 - 6岁',
    questionCount: '88项',
    dimensions: '评估维度：抓握能力、手眼协调、双手协作、操作精确性',
    timeEstimate: '约20-30分钟',
    studentSelectorTitle: '选择评估学生 - 小肌肉功能发展评估量表',
    studentSelectorTag: {
      type: 'warning',
      label: '小肌肉功能发展评估量表',
      description: '评估儿童精细动作与手部操作能力发展水平',
    },
    entryTabs: ['fine-motor'],
    accessEntitlementsAnyOf: ['fine_motor'],
    accessModulesAnyOf: ['sensory'],
  },
  {
    code: 'brief',
    title: '执行功能评估量表',
    subtitle: '(BRIEF 自编 DRAFT)',
    icon: Cpu,
    buttonType: 'primary',
    iconClass: 'brief-icon',
    ageRange: '2 - 18岁（学前 BRIEF-P / 学龄 BRIEF-2 自动切换）',
    questionCount: '学前15道 / 学龄27道',
    dimensions: '评估维度：抑制、自我监控、转换、情感控制、任务发起、工作记忆、计划与组织、任务监控、物品组织（按年龄分版）',
    timeEstimate: '约10-15分钟',
    studentSelectorTitle: '选择评估学生 - BRIEF执行功能量表',
    studentSelectorTag: {
      type: 'primary',
      label: 'BRIEF 执行功能',
      description: '评估儿童执行功能（抑制、工作记忆、计划组织等）发展水平',
    },
    entryTabs: ['cognitive'],
    accessEntitlementsAnyOf: ['cognitive'],
    accessModulesAnyOf: ['cognitive'],
  },
  {
    code: 'crt',
    title: '瑞文图形推理测验',
    subtitle: '(CRT 自编 DRAFT)',
    icon: DataAnalysis,
    buttonType: 'primary',
    iconClass: 'crt-icon',
    ageRange: '5.5 - 16.5岁',
    questionCount: '7道（SPM 五组示例题，DRAFT）',
    dimensions: '评估维度：A 知觉辨别、B 类同比较、C 比较推理、D 系列关系、E 抽象推理（SPM 五组）',
    timeEstimate: '约10-15分钟',
    studentSelectorTitle: '选择评估学生 - 瑞文CRT图形推理测验',
    studentSelectorTag: {
      type: 'primary',
      label: '瑞文 CRT 图形推理',
      description: '评估儿童图形推理与抽象思维能力（儿童本人作答）',
    },
    entryTabs: ['cognitive'],
    accessEntitlementsAnyOf: ['cognitive'],
    accessModulesAnyOf: ['cognitive'],
  },
]

const ASSESSMENT_SCALE_CATALOG_MAP = ASSESSMENT_SCALE_CATALOG.reduce<Record<AssessmentScaleCode, AssessmentScaleCatalogItem>>(
  (catalogMap, item) => {
    catalogMap[item.code] = item
    return catalogMap
  },
  {} as Record<AssessmentScaleCode, AssessmentScaleCatalogItem>
)

export function isAssessmentScaleCode(value: unknown): value is AssessmentScaleCode {
  return typeof value === 'string' && value in ASSESSMENT_SCALE_CATALOG_MAP
}

export function getAssessmentScaleCatalogItem(code: unknown): AssessmentScaleCatalogItem | null {
  if (!isAssessmentScaleCode(code)) {
    return null
  }

  return ASSESSMENT_SCALE_CATALOG_MAP[code]
}

export function isAssessmentScaleAuthorized(
  item: AssessmentScaleCatalogItem,
  hasModuleAccess: AssessmentModuleAccessChecker,
  hasEntitlementAccess?: AssessmentEntitlementAccessChecker
): boolean {
  if (item.accessEntitlementsAnyOf && item.accessEntitlementsAnyOf.length > 0) {
    if (!hasEntitlementAccess) {
      return false
    }

    return item.accessEntitlementsAnyOf.some((entitlementCode) => hasEntitlementAccess(entitlementCode))
  }

  return item.accessModulesAnyOf.some((moduleCode) => hasModuleAccess(moduleCode))
}

export function getVisibleAssessmentScalesForTab(
  tabId: TrainingEntryCode,
  hasModuleAccess: AssessmentModuleAccessChecker,
  hasEntitlementAccess?: AssessmentEntitlementAccessChecker
): AssessmentScaleCatalogItem[] {
  return ASSESSMENT_SCALE_CATALOG.filter((item) =>
    item.entryTabs.includes(tabId) && isAssessmentScaleAuthorized(item, hasModuleAccess, hasEntitlementAccess)
  )
}

export function getDefaultAssessmentTab(
  hasModuleAccess: AssessmentModuleAccessChecker,
  hasEntitlementAccess?: AssessmentEntitlementAccessChecker
): TrainingEntryCode {
  return ASSESSMENT_TABS.find((tab) =>
    getVisibleAssessmentScalesForTab(tab.id, hasModuleAccess, hasEntitlementAccess).length > 0
  )?.id
    || 'sensory-integration'
}
