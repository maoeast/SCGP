/**
 * 12 量表 dimension → 统一障碍领域 映射（recommendation engine 核心）
 *
 * 锁定决策 #2：全部 12 个量表建 dimension→统一障碍领域映射。
 *
 * 关键现实（必须据此设计）：ScaleDriver 的 dimension 标识符跨量表异构：
 * - 部分量表 runtime DimensionScore.code 是英文 code（sdq/srs2/conners/cbcl/csirs/fine_motor/cnbsr/gmfm/tgmd/weefim）。
 * - 部分量表 runtime DimensionScore.code 是中文 label（sm：交往/作业…）。
 * - 且静态 driver.dimensions 数组（jiti 断言加载源）对 6 个量表是 label/fullLabel，与 runtime code 不一致
 *   （weefim/csirs/fine_motor/cnbsr2016/gmfm_88/tgmd_3）。
 *
 * 因此本映射同时收录【runtime code】与【static label/fullLabel】两种 key，
 * 引擎按 code 优先、name 兜底解析（见 resolveDimensionDomains），保证：
 *   1) 运行时正确分类每个 DimensionScore；
 *   2) jiti 断言（按静态 dimensions 校验）能通过且能抓出遗漏。
 *
 * 值为 UnifiedDomain[]（有序，首位为主领域），支持"主 emotional + 附 soothing"等次级推送
 * （锁定决策 #1 + 计划注：hyperactivity/inattention 含自我调节信号额外推 soothing_aids）。
 *
 * @module features/recommendation/scale-dimension-mapping
 */

import type { UnifiedDomain } from './ability-taxonomy'

/** 单维度映射到的统一领域（有序，首位为主领域；可多域） */
type DomainList = readonly UnifiedDomain[]

/** 单量表的 dimension-key → 领域列表 */
type ScaleDimensionMap = Readonly<Record<string, DomainList>>

/**
 * 12 量表 dimension → 统一领域 映射表。
 * key 同时收录 runtime code 与 static label/fullLabel（见文件头说明）。
 */
export const SCALE_DIMENSION_MAPPING: Readonly<Record<string, ScaleDimensionMap>> = {
  // ---- sm（社会成熟）：runtime code = 中文 label ----
  sm: {
    交往: ['social'],
    作业: ['cognitive'],
    运动能力: ['gross_motor'],
    独立生活能力: ['life_skills'],
    自我管理: ['emotional'],
    集体活动: ['social'],
  },

  // ---- weefim：runtime code motor/cognitive；static label 运动功能/认知功能 ----
  weefim: {
    motor: ['fine_motor', 'gross_motor'],
    cognitive: ['cognitive'],
    运动功能: ['fine_motor', 'gross_motor'],
    认知功能: ['cognitive'],
  },

  // ---- csirs：runtime code 英文；static label 中文 ----
  csirs: {
    vestibular: ['sensory_integration'],
    前庭觉调节与运动规划: ['sensory_integration'],
    tactile: ['sensory_integration'],
    触觉调节与情绪行为: ['sensory_integration'],
    proprioception: ['sensory_integration'],
    身体感知与动作协调: ['sensory_integration'],
    learning: ['cognitive'],
    视听知觉与学业表现: ['cognitive'],
    executive: ['cognitive'],
    执行功能与社会适应: ['cognitive'],
  },

  // ---- conners-psq：runtime code = 英文 ----
  'conners-psq': {
    conduct: ['emotional'],
    learning: ['cognitive'],
    psychosomatic: ['emotional'],
    impulsivity_hyperactivity: ['emotional', 'soothing'],
    anxiety: ['emotional'],
    hyperactivity_index: ['emotional', 'soothing'],
  },

  // ---- conners-trs：runtime code = 英文 ----
  'conners-trs': {
    conduct: ['emotional'],
    hyperactivity: ['emotional', 'soothing'],
    inattention_passivity: ['emotional', 'soothing'],
    hyperactivity_index: ['emotional', 'soothing'],
  },

  // ---- sdq：runtime code = 英文 ----
  sdq: {
    emotional: ['emotional'],
    conduct: ['emotional'],
    hyperactivity: ['emotional', 'soothing'],
    peer: ['social'],
    prosocial: ['social'],
  },

  // ---- srs2：runtime code = 英文 ----
  srs2: {
    awareness: ['social'],
    cognition: ['social'],
    communication: ['social'],
    motivation: ['social'],
    repetitive: ['emotional'],
  },

  // ---- cbcl：runtime code = 英文 ----
  cbcl: {
    social: ['social'],
    behavior: ['emotional'],
  },

  // ---- brief（执行功能问卷，DRAFT 自编）：runtime code 英文（_p 后缀为学前版）；
  //       全部执行功能维度 → cognitive（执行功能是认知发展的核心子域）----
  brief: {
    // 学前 BRIEF-P
    inhibit_p: ['cognitive'],
    shift_p: ['cognitive'],
    emotional_control_p: ['cognitive'],
    working_memory_p: ['cognitive'],
    plan_organize_p: ['cognitive'],
    // 学龄 BRIEF-2
    inhibit: ['cognitive'],
    self_monitor: ['cognitive'],
    shift: ['cognitive'],
    emotional_control: ['cognitive'],
    initiate: ['cognitive'],
    working_memory: ['cognitive'],
    plan_organize: ['cognitive'],
    task_monitor: ['cognitive'],
    organization_of_materials: ['cognitive'],
    // 中文 name 兜底（多量表共享同名维度，按 scaleCode 隔离互不影响）
    抑制: ['cognitive'],
    转换: ['cognitive'],
    情感控制: ['cognitive'],
    工作记忆: ['cognitive'],
    计划与组织: ['cognitive'],
    自我监控: ['cognitive'],
    任务发起: ['cognitive'],
    任务监控: ['cognitive'],
    物品组织: ['cognitive'],
  },

  // ---- crt（瑞文图形推理，DRAFT 自编）：五组 runtime code unit_a..unit_e；
  //       全部 → cognitive（图形推理是认知发展的核心子域）----
  crt: {
    unit_a: ['cognitive'],
    unit_b: ['cognitive'],
    unit_c: ['cognitive'],
    unit_d: ['cognitive'],
    unit_e: ['cognitive'],
  },

  // ---- cognitive_self（视知觉图形匹配筛查，DRAFT）：四个难度层级；
  //       全部 → cognitive（视空间辨别是认知发展的核心子域）----
  cognitive_self: {
    match_basic: ['cognitive'],
    match_fine: ['cognitive'],
    match_cross: ['cognitive'],
    match_expert: ['cognitive'],
  },

  // ---- fine_motor：runtime code 英文；static label 中文（全 → fine_motor）----
  fine_motor: {
    hand_grasp: ['fine_motor'],
    手部抓握: ['fine_motor'],
    finger_dexterity: ['fine_motor'],
    手指灵活性: ['fine_motor'],
    bilateral_coordination: ['fine_motor'],
    双手协调: ['fine_motor'],
    vmi: ['fine_motor'],
    视动整合: ['fine_motor'],
    pre_writing: ['fine_motor'],
    前书写技能: ['fine_motor'],
    self_care: ['fine_motor'],
    生活自理精细动作: ['fine_motor'],
  },

  // ---- cnbsr2016：runtime code gm/fm/ad/la/sb；static label 中文 ----
  cnbsr2016: {
    gm: ['gross_motor'],
    大运动: ['gross_motor'],
    fm: ['fine_motor'],
    精细动作: ['fine_motor'],
    ad: ['cognitive'],
    适应能力: ['cognitive'],
    la: ['language'],
    语言: ['language'],
    sb: ['social'],
    社会行为: ['social'],
  },

  // ---- gmfm_88：runtime code A-E（+派生 ORTHOPEDIC_RISK/PSYCHOLOGICAL_BARRIER）；static fullLabel ----
  gmfm_88: {
    A: ['gross_motor'],
    'A区 卧位与翻身': ['gross_motor'],
    B: ['gross_motor'],
    'B区 坐位': ['gross_motor'],
    C: ['gross_motor'],
    'C区 爬与跪': ['gross_motor'],
    D: ['gross_motor'],
    'D区 站立': ['gross_motor'],
    E: ['gross_motor'],
    'E区 走、跑、跳': ['gross_motor'],
    // 派生风险维度（runtime-only，不在静态 dimensions，故不参与 jiti 断言，但引擎需能分类）
    ORTHOPEDIC_RISK: ['gross_motor'],
    PSYCHOLOGICAL_BARRIER: ['emotional'],
  },

  // ---- tgmd_3：runtime code locomotor/ball_skills（+派生 DCD_RISK）；static fullLabel ----
  tgmd_3: {
    locomotor: ['gross_motor'],
    '位移技能 Locomotor': ['gross_motor'],
    ball_skills: ['gross_motor'],
    '球类技能 Ball Skills': ['gross_motor'],
    DCD_RISK: ['gross_motor'],
  },
}

/**
 * 解析单个 DimensionScore → 统一领域列表。
 *
 * 匹配顺序：scaleCode 下先按 code 精确命中，再按 name 精确命中。
 * 命中返回领域列表（去重保序）；未命中返回空数组（调用方按"未分类"处理，不阻塞）。
 *
 * @param scaleCode 量表代码
 * @param dimension 维度（取 code/name）
 */
export function resolveDimensionDomains(
  scaleCode: string,
  dimension: { code?: string; name?: string },
): UnifiedDomain[] {
  const scaleMap = SCALE_DIMENSION_MAPPING[scaleCode]
  if (!scaleMap) {
    return []
  }

  const candidates = [dimension.code, dimension.name]
  const collected: UnifiedDomain[] = []
  const seen = new Set<UnifiedDomain>()

  for (const key of candidates) {
    if (typeof key !== 'string' || key.length === 0) {
      continue
    }
    const domains = scaleMap[key]
    if (!domains) {
      continue
    }
    for (const domain of domains) {
      if (!seen.has(domain)) {
        seen.add(domain)
        collected.push(domain)
      }
    }
    if (collected.length > 0) {
      // code 命中即不再回退到 name（避免 label 与 code 映射不一致时叠加）
      break
    }
  }

  return collected
}
