/**
 * SCGP 模拟演示数据：数据定义与生成器（纯函数，无 DB 依赖）
 *
 * 规则来源（实现时与代码核对过）：
 * - 年级编码：src/types/class.ts（3=大班、4-9=一~六年级、10-12=初一~初三）
 * - 各量表 level 判定：src/strategies/assessment/*Driver.ts
 * - 评估表字段：src/database/init.ts（sm_assess / weefim_assess / csirs_assess /
 *   cnbsr2016_assess / fine_motor_assess / crt_assess / srs2_assess /
 *   conners_psq_assess / sdq_assess / cbcl_assess / brief_assess）
 * - 诊断类型标准化：src/utils/student-display.ts
 * - 游戏 code：src/data/custom-game-registry.ts
 *
 * 设计原则：
 * - 分数与「诊断画像」呼应（报告符合学生状态）
 * - 前测（症状明显）→ 训练 → 后测（症状减轻），趋势页可见进步
 * - 使用可复现随机（mulberry32），默认种子固定
 */

// ============================================================================
// 常量
// ============================================================================

export const DEMO_DATE = '2026-08-05' // 演示时间基准（生日/记录日期围绕它）

export const ID_RANGES = Object.freeze({
  user: [9001, 9005],
  student: [10001, 10022],
  class: [20001, 20007],
  plan: [30001, 30050],
  assess: [40001, 40200],
  report: [41001, 41200],
  trainingRecord: [50001, 50400],
  equipmentRecord: [51001, 51200],
  emotionSession: [52001, 52200],
  gameRecord: [53001, 53200],
  trainingSession: [54001, 54500],
})

export const ACADEMIC_YEARS = Object.freeze([
  { academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-07-31', is_active: 1 },
  { academic_year: '2026-2027', start_date: '2026-09-01', end_date: '2027-07-31', is_active: 0 },
])

// ============================================================================
// 可复现随机
// ============================================================================

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createRng(seed = 20260806) {
  const rand = mulberry32(seed)
  return {
    rand,
    int(min, max) { return Math.floor(rand() * (max - min + 1)) + min },
    float(min, max) { return rand() * (max - min) + min },
    pick(arr) { return arr[Math.floor(rand() * arr.length)] },
    shuffle(arr) {
      const copy = [...arr]
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1))
        ;[copy[i], copy[j]] = [copy[j], copy[i]]
      }
      return copy
    },
  }
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// ============================================================================
// 教师（5 人）
// ============================================================================

export const TEACHERS = Object.freeze([
  { id: 9001, username: 'teacher01', name: '陈慧敏', email: 'chenhuimin@example.invalid' },
  { id: 9002, username: 'teacher02', name: '王志远', email: 'wangzhiyuan@example.invalid' },
  { id: 9003, username: 'teacher03', name: '林晓芳', email: 'linxiaofang@example.invalid' },
  { id: 9004, username: 'teacher04', name: '刘建华', email: 'liujianhua@example.invalid' },
  { id: 9005, username: 'teacher05', name: '周雨桐', email: 'zhouyutong@example.invalid' },
])

// 班级 → 教师分配（sys_class_teachers）
export const CLASS_TEACHER_MAP = Object.freeze({
  20001: [9001], // 大班
  20002: [9001, 9005], // 一年级
  20003: [9002], // 二年级
  20004: [9002, 9005], // 三年级
  20005: [9003], // 初一
  20006: [9004], // 初二
  20007: [9003, 9004], // 初三
})

// ============================================================================
// 班级（7 个，覆盖 幼儿园大班 / 小学1-3年级 / 初中1-3年级）
// ============================================================================

export const CLASSES = Object.freeze([
  { id: 20001, name: '大班', grade_level: 3, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20002, name: '一年级1班', grade_level: 4, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20003, name: '二年级1班', grade_level: 5, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20004, name: '三年级1班', grade_level: 6, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20005, name: '初一1班', grade_level: 10, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20006, name: '初二1班', grade_level: 11, class_number: 1, academic_year: '2025-2026', max_students: 12 },
  { id: 20007, name: '初三1班', grade_level: 12, class_number: 1, academic_year: '2025-2026', max_students: 12 },
])

// ============================================================================
// 学生（22 人：男 15 / 女 7，符合年龄段的常见姓名）
// 诊断集中于 学习障碍/言语障碍/多重障碍，补充 孤独症谱系障碍/智力障碍
// ============================================================================

export const STUDENTS = Object.freeze([
  { id: 10001, name: '陈昊宇', gender: '男', birthday: '2020-09-15', student_no: 'ST10001', disorder: '言语障碍', class_id: 20001 },
  { id: 10002, name: '李欣妍', gender: '女', birthday: '2021-03-22', student_no: 'ST10002', disorder: '多重障碍', class_id: 20001 },
  { id: 10003, name: '王梓豪', gender: '男', birthday: '2020-11-08', student_no: 'ST10003', disorder: '孤独症谱系障碍', class_id: 20001 },
  { id: 10004, name: '张子睿', gender: '男', birthday: '2019-07-12', student_no: 'ST10004', disorder: '学习障碍', class_id: 20002 },
  { id: 10005, name: '刘宇泽', gender: '男', birthday: '2019-10-30', student_no: 'ST10005', disorder: '学习障碍', class_id: 20002 },
  { id: 10006, name: '赵雨桐', gender: '女', birthday: '2019-12-05', student_no: 'ST10006', disorder: '言语障碍', class_id: 20002 },
  { id: 10007, name: '孙浩轩', gender: '男', birthday: '2018-06-18', student_no: 'ST10007', disorder: '学习障碍', class_id: 20003 },
  { id: 10008, name: '周子墨', gender: '男', birthday: '2018-09-25', student_no: 'ST10008', disorder: '多重障碍', class_id: 20003 },
  { id: 10009, name: '吴语彤', gender: '女', birthday: '2018-04-14', student_no: 'ST10009', disorder: '言语障碍', class_id: 20003 },
  { id: 10010, name: '郑博文', gender: '男', birthday: '2017-05-30', student_no: 'ST10010', disorder: '学习障碍', class_id: 20004 },
  { id: 10011, name: '冯俊熙', gender: '男', birthday: '2017-08-21', student_no: 'ST10011', disorder: '言语障碍', class_id: 20004 },
  { id: 10012, name: '蒋诗涵', gender: '女', birthday: '2017-11-09', student_no: 'ST10012', disorder: '智力障碍', class_id: 20004 },
  { id: 10013, name: '沈嘉豪', gender: '男', birthday: '2013-05-16', student_no: 'ST10013', disorder: '学习障碍', class_id: 20005 },
  { id: 10014, name: '韩天翊', gender: '男', birthday: '2013-09-02', student_no: 'ST10014', disorder: '学习障碍', class_id: 20005 },
  { id: 10015, name: '曹梦洁', gender: '女', birthday: '2014-01-27', student_no: 'ST10015', disorder: '言语障碍', class_id: 20005 },
  { id: 10016, name: '许婉宁', gender: '女', birthday: '2013-12-19', student_no: 'ST10016', disorder: '孤独症谱系障碍', class_id: 20005 },
  { id: 10017, name: '丁宇航', gender: '男', birthday: '2012-04-11', student_no: 'ST10017', disorder: '学习障碍', class_id: 20006 },
  { id: 10018, name: '程俊杰', gender: '男', birthday: '2012-07-23', student_no: 'ST10018', disorder: '多重障碍', class_id: 20006 },
  { id: 10019, name: '罗一鸣', gender: '男', birthday: '2012-10-15', student_no: 'ST10019', disorder: '多重障碍', class_id: 20006 },
  { id: 10020, name: '潘志强', gender: '男', birthday: '2011-03-08', student_no: 'ST10020', disorder: '多重障碍', class_id: 20007 },
  { id: 10021, name: '董思颖', gender: '女', birthday: '2011-06-19', student_no: 'ST10021', disorder: '言语障碍', class_id: 20007 },
  { id: 10022, name: '梁文昊', gender: '男', birthday: '2011-09-27', student_no: 'ST10022', disorder: '智力障碍', class_id: 20007 },
])

// ============================================================================
// 诊断画像：每个诊断在各量表上的「症状偏移」
// 约定：正值=能力变差/症状加重；sm/weefim/cnbsr/fmda/crt 为负偏移（分数降低）
// 后测时偏移按 improvement 缩放（improvement=1 前测症状全开，0.35 后测症状减轻）
// ============================================================================

export const DIAGNOSIS_PROFILES = Object.freeze({
  学习障碍: {
    sm: -1.5,
    weefim: -8,
    weefimCognitive: -6,
    csirs: { learning: -13, executive: -9, vestibular: -3, tactile: -2, proprioception: -3 },
    cnbsr: { gm: -3, fm: -9, ad: -5, la: -8, sb: -4 },
    fmda: { hand_grasp: 0.06, finger_dexterity: 0.16, bilateral_coordination: 0.08, vmi: 0.2, pre_writing: 0.22, self_care: 0.04 },
    crt: -13,
    srs2: { awareness: 6, cognition: 5, communication: 7, motivation: 4, repetitive: 4 },
    conners: { conduct: 3, learning: 11, psychosomatic: 2, impulsivity_hyperactivity: 7, anxiety: 3, hyperactivity_index: 6 },
    connersTrs: { conduct: 2, hyperactivity: 6, inattention_passivity: 11, hyperactivity_index: 6 },
    sdq: { emotional: 2, conduct: 2, hyperactivity: 5, peer: 3, prosocial: -1 },
    cbcl: { internalizing: 6, externalizing: 4 },
    brief: { inhibit: 8, shift: 6, emotional_control: 5, working_memory: 12, plan_organize: 11, monitor: 6, task_monitor: 8, organize_materials: 7, initiate: 9 },
  },
  言语障碍: {
    sm: -2,
    weefim: -6,
    weefimCognitive: -9,
    csirs: { learning: -11, executive: -7, vestibular: -2, tactile: -2, proprioception: -2 },
    cnbsr: { gm: -2, fm: -4, ad: -6, la: -18, sb: -10 },
    fmda: { hand_grasp: 0.02, finger_dexterity: 0.04, bilateral_coordination: 0.03, vmi: 0.05, pre_writing: 0.05, self_care: 0.04 },
    crt: -5,
    srs2: { awareness: 8, cognition: 8, communication: 14, motivation: 8, repetitive: 5 },
    conners: { conduct: 2, learning: 6, psychosomatic: 2, impulsivity_hyperactivity: 3, anxiety: 4, hyperactivity_index: 3 },
    connersTrs: { conduct: 2, hyperactivity: 3, inattention_passivity: 6, hyperactivity_index: 3 },
    sdq: { emotional: 3, conduct: 1, hyperactivity: 2, peer: 6, prosocial: -2 },
    cbcl: { internalizing: 8, externalizing: 2 },
    brief: { inhibit: 3, shift: 5, emotional_control: 4, working_memory: 6, plan_organize: 4, monitor: 4, task_monitor: 4, organize_materials: 3, initiate: 5 },
  },
  多重障碍: {
    sm: -4.5,
    weefim: -28,
    weefimCognitive: -12,
    csirs: { learning: -12, executive: -13, vestibular: -12, tactile: -12, proprioception: -13 },
    cnbsr: { gm: -14, fm: -16, ad: -15, la: -16, sb: -16 },
    fmda: { hand_grasp: 0.22, finger_dexterity: 0.28, bilateral_coordination: 0.26, vmi: 0.24, pre_writing: 0.26, self_care: 0.28 },
    crt: -22,
    srs2: { awareness: 12, cognition: 14, communication: 16, motivation: 12, repetitive: 14 },
    connersTrs: { conduct: 7, hyperactivity: 10, inattention_passivity: 12, hyperactivity_index: 10 },
    conners: { conduct: 6, learning: 12, psychosomatic: 6, impulsivity_hyperactivity: 10, anxiety: 6, hyperactivity_index: 10 },
    sdq: { emotional: 4, conduct: 4, hyperactivity: 6, peer: 6, prosocial: -3 },
    cbcl: { internalizing: 10, externalizing: 8 },
    brief: { inhibit: 10, shift: 10, emotional_control: 9, working_memory: 12, plan_organize: 11, monitor: 9, task_monitor: 10, organize_materials: 10, initiate: 11 },
  },
  孤独症谱系障碍: {
    sm: -3,
    weefim: -10,
    weefimCognitive: -10,
    csirs: { learning: -6, executive: -14, vestibular: -6, tactile: -10, proprioception: -8 },
    cnbsr: { gm: -3, fm: -6, ad: -10, la: -12, sb: -20 },
    fmda: { hand_grasp: 0.04, finger_dexterity: 0.08, bilateral_coordination: 0.06, vmi: 0.08, pre_writing: 0.08, self_care: 0.12 },
    crt: -4,
    connersTrs: { conduct: 2, hyperactivity: 5, inattention_passivity: 7, hyperactivity_index: 5 },
    srs2: { awareness: 16, cognition: 15, communication: 22, motivation: 18, repetitive: 24 },
    conners: { conduct: 2, learning: 5, psychosomatic: 3, impulsivity_hyperactivity: 5, anxiety: 7, hyperactivity_index: 5 },
    sdq: { emotional: 4, conduct: 2, hyperactivity: 3, peer: 10, prosocial: -4 },
    cbcl: { internalizing: 10, externalizing: 3 },
    brief: { inhibit: 6, shift: 12, emotional_control: 10, working_memory: 8, plan_organize: 9, monitor: 8, task_monitor: 8, organize_materials: 9, initiate: 8 },
  },
  智力障碍: {
    sm: -5,
    weefim: -32,
    weefimCognitive: -14,
    csirs: { learning: -14, executive: -16, vestibular: -13, tactile: -13, proprioception: -15 },
    cnbsr: { gm: -16, fm: -18, ad: -20, la: -20, sb: -18 },
    fmda: { hand_grasp: 0.22, finger_dexterity: 0.3, bilateral_coordination: 0.28, vmi: 0.3, pre_writing: 0.32, self_care: 0.3 },
    connersTrs: { conduct: 4, hyperactivity: 6, inattention_passivity: 12, hyperactivity_index: 6 },
    crt: -30,
    srs2: { awareness: 10, cognition: 14, communication: 12, motivation: 10, repetitive: 12 },
    conners: { conduct: 4, learning: 12, psychosomatic: 4, impulsivity_hyperactivity: 6, anxiety: 4, hyperactivity_index: 6 },
    sdq: { emotional: 3, conduct: 3, hyperactivity: 4, peer: 5, prosocial: -2 },
    cbcl: { internalizing: 8, externalizing: 5 },
    brief: { inhibit: 8, shift: 10, emotional_control: 8, working_memory: 14, plan_organize: 13, monitor: 8, task_monitor: 10, organize_materials: 9, initiate: 12 },
  },
})

// ============================================================================
// 量表-学段选择矩阵
// 返回每个学生要做的量表清单（含是否做纵向前测）
// ============================================================================

export const SCALE_ORDER = Object.freeze({
  preschool: ['cnbsr2016', 'fine_motor', 'sm', 'weefim'],
  primary: ['sm', 'weefim', 'csirs'],
  middle: ['weefim', 'crt', 'srs2'],
})

export const PRIMARY_GRADE = Object.freeze({
  3: 'preschool',
  4: 'primary',
  5: 'primary',
  6: 'primary',
  10: 'middle',
  11: 'middle',
  12: 'middle',
})

/** 小学补充量表（按诊断/年龄） */
const PRIMARY_EXTRA = {
  学习障碍: ['crt'],
  言语障碍: ['srs2'],
  多重障碍: ['crt'],
  智力障碍: ['crt'],
}

/** 初中补充量表（按诊断/年龄；学习障碍补 Conners 教师问卷 + BRIEF 认知相关） */
const MIDDLE_EXTRA = {
  学习障碍: ['conners-psq', 'conners-trs', 'brief'],
  言语障碍: ['sdq', 'cbcl'],
  多重障碍: ['cbcl', 'sdq'],
  孤独症谱系障碍: ['cbcl', 'sdq'],
  智力障碍: ['brief', 'sdq'],
}

/**
 * 计算某学生的评估计划：
 * { scale, times: 1|2 }[]，times=2 表示做前测+后测（体现训练进步）
 * 规则（每生 2-4 个量表，总量表数不超 4）：
 * - 大班：cnbsr2016（必做且纵向）+ fine_motor + sm + weefim(50%)
 * - 小学：sm + weefim + csirs + 按诊断补充 1 个（crt/srs2）
 * - 初中：weefim + crt + 按诊断 srs2/sm + 补充 1 个（cbcl/sdq/conners）
 */
export function buildAssessmentPlan(student, rng) {
  const ageMonths = student.ageMonths
  const disorder = student.disorder
  const stage = PRIMARY_GRADE[student.gradeLevel]
  const scales = []

  if (stage === 'preschool') {
    scales.push({ scale: 'cnbsr2016', times: 2 })
    scales.push({ scale: 'fine_motor', times: rng.rand() < 0.4 ? 2 : 1 })
    scales.push({ scale: 'sm', times: rng.rand() < 0.4 ? 2 : 1 })
    if (rng.rand() < 0.5) scales.push({ scale: 'weefim', times: 1 })
  } else if (stage === 'primary') {
    scales.push({ scale: 'sm', times: rng.rand() < 0.5 ? 2 : 1 })
    scales.push({ scale: 'weefim', times: rng.rand() < 0.4 ? 2 : 1 })
    scales.push({ scale: 'csirs', times: rng.rand() < 0.5 ? 2 : 1 })
    const extra = PRIMARY_EXTRA[disorder]?.[0]
    if (extra && isScaleAgeOk(extra, ageMonths) && rng.rand() < 0.6) {
      scales.push({ scale: extra, times: rng.rand() < 0.4 ? 2 : 1 })
    }
  } else {
    scales.push({ scale: 'weefim', times: rng.rand() < 0.45 ? 2 : 1 })
    scales.push({ scale: 'crt', times: rng.rand() < 0.5 ? 2 : 1 })
    const socialDisorders = ['孤独症谱系障碍', '言语障碍', '多重障碍']
    if (socialDisorders.includes(disorder)) {
      scales.push({ scale: 'srs2', times: rng.rand() < 0.5 ? 2 : 1 })
    }
    if (isScaleAgeOk('sm', ageMonths) && rng.rand() < 0.35) {
      scales.push({ scale: 'sm', times: 1 })
    }
    const extras = MIDDLE_EXTRA[disorder] || []
    for (const code of extras) {
      if (scales.length >= 5) break
      if (!isScaleAgeOk(code, ageMonths)) continue
      if (scales.some((s) => s.scale === code)) continue
      scales.push({ scale: code, times: rng.rand() < 0.35 ? 2 : 1 })
      // 不 break：学习障碍等可补多个（conners-psq + conners-trs + brief），总量受 scales.length>=5 限制
    }
  }

  // 兜底：保证至少 2 个量表
  if (scales.length < 2) {
    for (const code of ['sm', 'weefim']) {
      if (scales.length >= 2) break
      if (!isScaleAgeOk(code, ageMonths)) continue
      if (!scales.some((s) => s.scale === code)) scales.push({ scale: code, times: 1 })
    }
  }
  return scales
}

/** 量表年龄上限（月），与 catalog ageRange 对应；null=无限制 */
const SCALE_AGE_MAX = Object.freeze({
  sm: 168, // 6月-14岁
  weefim: 216, // 0-18岁
  csirs: 144, // 3-12岁
  cnbsr2016: 84, // 0-84月
  fine_motor: 71, // 36-71月（driver ageRange）
  crt: 198, // 5.5-16.5岁
  srs2: 216, // 6-18岁
  'conners-psq': 204, // 3-17岁
  'conners-trs': 204, // 3-17岁
  sdq: 204, // 4-17岁
  cbcl: 192, // 4-16岁
  brief: 216, // 2-18岁
})

const SCALE_AGE_MIN = Object.freeze({
  sm: 6,
  weefim: 0,
  csirs: 36,
  cnbsr2016: 0,
  fine_motor: 36,
  crt: 66,
  srs2: 72,
  'conners-psq': 36,
  'conners-trs': 36,
  sdq: 48,
  cbcl: 48,
  brief: 24,
})

export function isScaleAgeOk(scale, ageMonths) {
  const max = SCALE_AGE_MAX[scale]
  const min = SCALE_AGE_MIN[scale]
  if (max != null && ageMonths > max) return false
  if (min != null && ageMonths < min) return false
  return true
}

// ============================================================================
// 日期工具
// ============================================================================

export function toIso(date) {
  return date.toISOString().slice(0, 10)
}

export function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(date, days) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

/** 评估时间：前测 2026-03-01~04-30；单次评估 2026-03-01~07-20；后测 2026-07-15~08-05 */
export function pickAssessmentDate(rng, { longitudinal, isFollowUp }) {
  const start = longitudinal
    ? isFollowUp
      ? isoToDate('2026-07-15')
      : isoToDate('2026-03-01')
    : isoToDate('2026-03-01')
  const end = longitudinal
    ? isFollowUp
      ? isoToDate('2026-08-05')
      : isoToDate('2026-04-30')
    : isoToDate('2026-07-20')
  const span = Math.floor((end - start) / 86400000)
  return addDays(start, rng.int(0, Math.max(0, span)))
}

export function pickTrainingDate(rng) {
  const start = isoToDate('2026-04-15')
  const end = isoToDate('2026-07-30')
  const span = Math.floor((end - start) / 86400000)
  const date = addDays(start, rng.int(0, span))
  return {
    date,
    iso: toIso(date),
    timestampMs: date.getTime() + rng.int(0, 86300000),
  }
}

// ============================================================================
// 各量表评估生成器
// 每个生成器返回 { table, row }[]（主表 + 可能的从表），row 的 id 由调用方分配
// ============================================================================

/** 根据标准分求 S-M 等级（SMDriver.getLevelCode 规则） */
export function smLevelFromSq(sq) {
  if (sq <= 5) return '极重度'
  if (sq === 6) return '极重度'
  if (sq === 7) return '中度'
  if (sq === 8) return '轻度'
  if (sq === 9) return '边缘'
  return '正常'
}

/** S-M 年龄阶段（sm_age_stage：5岁-6岁5个月=4、6岁6个月-8岁5个月=5、8岁6个月-10岁5个月=6、10岁6个月以上=7） */
export function smAgeStage(ageMonths) {
  if (ageMonths <= 77) return 4
  if (ageMonths <= 101) return 5
  if (ageMonths <= 125) return 6
  return 7
}

export function makeSmAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const offset = (profile.sm || 0) * improvement
  const sq = clamp(Math.round(10 + offset + rng.float(-0.6, 0.6)), 3, 12)
  const level = smLevelFromSq(sq)
  const rawScore = Math.round(30 + sq * 4.2 + rng.float(-3, 3))
  return {
    table: 'sm_assess',
    row: {
      student_id: student.id,
      age_stage: smAgeStage(student.ageMonths),
      raw_score: rawScore,
      sq_score: sq,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

/** WeeFIM 等级（WeeFIMDriver.getLevel 规则，满分 126） */
export function weefimLevelFromTotal(total) {
  if (total >= 126) return '完全独立'
  if (total >= 108) return '基本独立'
  if (total >= 90) return '极轻度依赖'
  if (total >= 72) return '轻度依赖'
  if (total >= 54) return '中度依赖'
  if (total >= 36) return '重度依赖'
  return '极重度依赖'
}

export function makeWeefimAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const offset = (profile.weefim || 0) * improvement
  const base = 108 + rng.float(-6, 6) // 无诊断学生约 102-114
  const total = clamp(Math.round(base + offset + (improvement < 1 ? rng.int(8, 16) : 0)), 40, 126)
  const level = weefimLevelFromTotal(total)
  // motor 13 题×7=91、cognitive 5 题×7=35
  const cognitiveOffset = (profile.weefimCognitive || 0) * improvement
  const cognitive = clamp(Math.round(total * 0.26 + cognitiveOffset * 0.7 + rng.float(-3, 3)), 8, 35)
  const adl = clamp(total - cognitive, 20, 91)
  return {
    table: 'weefim_assess',
    row: {
      student_id: student.id,
      total_score: total,
      adl_score: adl,
      cognitive_score: cognitive,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CSIRS_DIMENSIONS = Object.freeze([
  { code: 'vestibular', name: '前庭觉调节与运动规划' },
  { code: 'tactile', name: '触觉调节与情绪行为' },
  { code: 'proprioception', name: '身体感知与动作协调' },
  { code: 'learning', name: '视听知觉与学业表现' },
  { code: 'executive', name: '执行功能与社会适应' },
])

/** CSIRS 等级（T 分：严重偏低<30、偏低30-39、正常40-60、优秀61-70、非常优秀≥71） */
export function csirsLevelFromT(t) {
  if (t < 30) return '严重偏低'
  if (t < 40) return '偏低'
  if (t < 61) return '正常'
  if (t < 71) return '优秀'
  return '非常优秀'
}

export function makeCsirsAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.csirs || {}
  const rawScores = {}
  const tScores = {}
  for (const dim of CSIRS_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const t = clamp(Math.round(50 + offset + rng.float(-4, 4)), 20, 72)
    // 报告页按维度 code（name_en）读取 t_scores / raw_scores
    tScores[dim.code] = t
    rawScores[dim.code] = clamp(Math.round((t - 15) * 0.62 + rng.float(-2, 2)), 4, 40)
  }
  const totalT = Math.round(Object.values(tScores).reduce((s, v) => s + v, 0) / CSIRS_DIMENSIONS.length)
  const flags = CSIRS_DIMENSIONS.filter((dim) => tScores[dim.code] < 40).map((dim) => `${dim.name}偏低`)
  return {
    table: 'csirs_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      raw_scores: JSON.stringify(rawScores),
      t_scores: JSON.stringify(tScores),
      total_t_score: totalT,
      level: csirsLevelFromT(totalT),
      flags: flags.length ? JSON.stringify(flags) : null,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CNBSR_DOMAIN_LABELS = Object.freeze({
  gm: '大运动',
  fm: '精细运动',
  ad: '适应能力',
  la: '语言',
  sb: '社会行为',
})

const CNBSR_SEVERITY = Object.freeze({
  excellent: 'success',
  good: 'success',
  normal: 'info',
  borderline: 'warning',
  delayed: 'danger',
})

/** CNBS-R2016 DQ 等级（≥130 优秀 / 110-129 良好 / 80-109 中等 / 70-79 临界偏低 / <70 智力发育障碍） */
export function cnbsrStatusFromDq(dq) {
  if (dq >= 130) return { status: 'excellent', level: '优秀' }
  if (dq >= 110) return { status: 'good', level: '良好' }
  if (dq >= 80) return { status: 'normal', level: '中等' }
  if (dq >= 70) return { status: 'borderline', level: '临界偏低' }
  return { status: 'delayed', level: '智力发育障碍' }
}

export function makeCnbsr2016Assessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.cnbsr || {}
  const ageMonths = student.ageMonths
  const domainResults = Object.entries(CNBSR_DOMAIN_LABELS).map(([code, name]) => {
    const offset = (dimOffsets[code] || 0) * improvement
    // offset 为负（能力偏低）→ mentalAge 低于实际月龄；improvement 缩小 → 后测接近实际月龄（进步）
    const mentalAge = clamp(Math.round(ageMonths * (1 + offset / 100) + rng.float(-3, 3)), 4, 84)
    const dq = Math.round((mentalAge / ageMonths) * 100)
    const { status, level } = cnbsrStatusFromDq(dq)
    return {
      code,
      name,
      itemCount: 12,
      passedCount: clamp(Math.round(12 * (mentalAge / ageMonths)), 0, 12),
      failedCount: clamp(12 - Math.round(12 * (mentalAge / ageMonths)), 0, 12),
      autoFilledPassedCount: 0,
      autoFilledFailedCount: 0,
      mentalAge,
      maxMentalAge: 84,
      achievementRate: Number((mentalAge / 84).toFixed(4)),
      dq,
      dqStatus: status,
      level,
      severity: CNBSR_SEVERITY[status],
    }
  })
  const totalMentalAge = Math.round(domainResults.reduce((s, d) => s + d.mentalAge, 0) / domainResults.length)
  const dq = Math.round((totalMentalAge / ageMonths) * 100)
  const { status, level } = cnbsrStatusFromDq(dq)
  const ageBracket = ageMonths <= 12 ? 'a1' : ageMonths <= 24 ? 'a2' : ageMonths <= 36 ? 'a3' : 'a4'
  const weakDomains = domainResults.filter((d) => d.dqStatus === 'borderline' || d.dqStatus === 'delayed')
  const domainFeedback = domainResults.map((d) => ({
    domain: d.code,
    domainName: d.name,
    dqStatus: d.dqStatus,
    headline: d.dqStatus === 'delayed' ? `${d.name}显著落后` : d.dqStatus === 'borderline' ? `${d.name}边缘水平` : `${d.name}发展良好`,
    content: `该儿童在${d.name}领域的发育商为 ${d.dq}，${d.level}。${d.dqStatus === 'delayed' || d.dqStatus === 'borderline' ? '建议在训练计划中增加针对性练习并定期复评。' : '建议保持现有训练强度并继续观察。'}`,
    advice: weakDomains.some((w) => w.code === d.code)
      ? [{ tag: '训练建议', text: `针对${d.name}领域安排每周 3-4 次结构化练习` }, { tag: '复评建议', text: '1 个训练周期后复评' }]
      : [{ tag: '保持', text: '维持当前训练节奏' }],
  }))
  const iepTargets = weakDomains.slice(0, 2).map((d, i) => ({
    questionId: i + 1,
    itemCode: `${d.code.toUpperCase()}${String(rng.int(1, 20)).padStart(2, '0')}`,
    title: `${d.name}领域基础项目训练`,
    domain: d.code,
    domainName: d.name,
    ageGroupMonths: Math.min(84, ageMonths),
    scoreWeight: 1,
    prompt: '在自然情境中观察并记录儿童完成情况',
    passCriteria: '连续 3 次独立完成',
    isAutoFilled: false,
  }))
  const iepInterventions = weakDomains.slice(0, 2).map((d) => ({
    domain: d.code,
    domainName: d.name,
    intervention: `开展${d.name}专项游戏化训练，结合家庭环境泛化练习`,
    frequency: '每周 3-4 次，每次 15-20 分钟',
  }))
  return {
    table: 'cnbsr2016_assess',
    row: {
      student_id: student.id,
      age_months: ageMonths,
      total_mental_age: totalMentalAge,
      dq,
      dq_status: status,
      age_bracket: ageBracket,
      level,
      level_code: status,
      domain_results: JSON.stringify(domainResults),
      domain_feedback: JSON.stringify(domainFeedback),
      iep_targets: JSON.stringify(iepTargets),
      iep_interventions: JSON.stringify(iepInterventions),
      overall_rule: weakDomains.length ? '整体发育水平偏低，需重点干预薄弱领域' : '整体发育水平符合预期',
      expert_clinical: weakDomains.length
        ? `该儿童整体发育商 ${dq}（${level}），${weakDomains.map((d) => `${d.name}（${d.dq}）`).join('、')}为薄弱领域。建议在机构干预的同时开展家庭泛化训练，2-3 个月后复评。`
        : `该儿童整体发育商 ${dq}（${level}），各领域发展均衡。建议保持现有干预节奏，定期监测。`,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const FINE_MOTOR_DIMENSIONS = Object.freeze([
  { code: 'hand_grasp', label: '手部抓握', maxScore: 30 },
  { code: 'finger_dexterity', label: '手指灵活性', maxScore: 32 },
  { code: 'bilateral_coordination', label: '双手协调', maxScore: 30 },
  { code: 'vmi', label: '视动整合', maxScore: 40 },
  { code: 'pre_writing', label: '前书写技能', maxScore: 24 },
  { code: 'self_care', label: '生活自理精细动作', maxScore: 20 },
])

const FMDA_STATUS = Object.freeze({
  age_appropriate: { level: '发展适龄', severity: 'success' },
  emerging: { level: '发展萌芽/轻度落后', severity: 'warning' },
  delayed: { level: '显著迟缓', severity: 'danger' },
})

/** FMDA 掌握率等级（≥0.8 适龄 / ≥0.4 萌芽 / <0.4 迟缓） */
export function fmdaStatusFromRate(rate) {
  if (rate >= 0.8) return 'age_appropriate'
  if (rate >= 0.4) return 'emerging'
  return 'delayed'
}

export function makeFineMotorAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.fmda || {}
  const domainResults = FINE_MOTOR_DIMENSIONS.map((dim) => {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const mastery = clamp(0.82 - offset + rng.float(-0.06, 0.06), 0.12, 0.98)
    const status = fmdaStatusFromRate(mastery)
    const config = FMDA_STATUS[status]
    return {
      code: dim.code,
      name: dim.label,
      rawScore: Math.round(mastery * dim.maxScore),
      maxScore: dim.maxScore,
      masteryRate: Number(mastery.toFixed(4)),
      status,
      level: config.level,
      severity: config.severity,
    }
  })
  const totalRawScore = domainResults.reduce((s, d) => s + d.rawScore, 0)
  const totalMaxScore = domainResults.reduce((s, d) => s + d.maxScore, 0)
  const totalMasteryRate = Number((totalRawScore / totalMaxScore).toFixed(4))
  const overallStatus = fmdaStatusFromRate(totalMasteryRate)
  const overallConfig = FMDA_STATUS[overallStatus]
  const weakDomains = domainResults.filter((d) => d.status !== 'age_appropriate')
  const iepTargets = weakDomains.slice(0, 2).map((d, i) => ({
    questionId: i + 1,
    itemCode: `FM${String(rng.int(1, 30)).padStart(2, '0')}`,
    title: `${d.name}精细动作专项训练`,
    domain: d.code,
    domainName: d.name,
    ageGroupMonths: Math.min(71, student.ageMonths),
    scoreWeight: 1,
    prompt: '通过串珠、捏夹、撕贴等活动练习',
    passCriteria: '连续 3 次独立完成',
    isAutoFilled: false,
  }))
  return {
    table: 'fine_motor_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      total_score: totalRawScore,
      standard_score: Math.round(totalMasteryRate * 100),
      level: overallConfig.level,
      level_code: overallStatus,
      total_max_score: totalMaxScore,
      total_mastery_rate: totalMasteryRate,
      domain_results: JSON.stringify(domainResults),
      iep_targets: JSON.stringify(iepTargets),
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CRT_UNITS = Object.freeze([
  { code: 'A', name: '知觉辨别' },
  { code: 'B', name: '类同比较' },
  { code: 'C', name: '比较推理' },
  { code: 'D', name: '系列关系' },
  { code: 'E', name: '抽象推理' },
])

/** CRT IQ → 等级（crt-data.ts crtLevels） */
export function crtLevelFromIq(iq) {
  if (iq >= 130) return { level: '极优秀', levelCode: 'very_superior' }
  if (iq >= 120) return { level: '优秀', levelCode: 'superior' }
  if (iq >= 110) return { level: '中上水平', levelCode: 'high_average' }
  if (iq >= 90) return { level: '典型水平', levelCode: 'average' }
  if (iq >= 80) return { level: '边缘水平', levelCode: 'borderline' }
  return { level: '明显落后', levelCode: 'delayed' }
}

/** 百分位 → IQ 的近似线性映射（演示数据用，M=100 SD=15 的简化版） */
export function percentileToIq(percentile) {
  if (percentile <= 2) return 70
  if (percentile <= 5) return 75
  if (percentile <= 10) return 80
  if (percentile <= 20) return 88
  if (percentile <= 30) return 92
  if (percentile <= 40) return 96
  if (percentile <= 50) return 100
  if (percentile <= 60) return 104
  if (percentile <= 70) return 108
  if (percentile <= 80) return 112
  if (percentile <= 90) return 119
  if (percentile <= 95) return 125
  return 130
}

export function makeCrtAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const offset = (profile.crt || 0) * improvement
  const base = 40 + rng.float(-2, 2) // 典型 40/60
  const totalQuestions = 60
  const rawScore = clamp(Math.round(base + offset + (improvement < 1 ? rng.int(4, 9) : 0)), 8, 58)
  // 百分位：正确率 → 百分位的近似（60 题，低分对应低百分位）
  const ratio = rawScore / totalQuestions
  const percentile = clamp(Math.round(ratio * 95 - 6 + rng.float(-3, 3)), 1, 99)
  const iq = percentileToIq(percentile)
  const { level, levelCode } = crtLevelFromIq(iq)
  // 每组正确数：A 组最容易、E 组最难（每组 12 题）
  const unitScores = CRT_UNITS.map((unit, index) => {
    const groupRatio = ratio * (1.15 - index * 0.09)
    const correct = clamp(Math.round(12 * groupRatio), 0, 12)
    return {
      unitCode: unit.code,
      name: unit.name,
      correct,
      total: 12,
      ability: Number((correct / 12).toFixed(4)),
    }
  })
  const rawAnswers = {}
  for (let q = 1; q <= totalQuestions; q += 1) {
    const unitIndex = Math.floor((q - 1) / 12)
    const isCorrect = rng.rand() < unitScores[unitIndex].ability
    rawAnswers[q] = { v: rng.int(1, 6), s: isCorrect ? 1 : 0, t: rng.int(4000, 30000) }
  }
  return {
    table: 'crt_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      raw_answers: JSON.stringify(rawAnswers),
      total_raw_score: rawScore,
      total_questions: totalQuestions,
      percentile_rank: percentile,
      iq_estimate: iq,
      level,
      level_code: levelCode,
      unit_scores: JSON.stringify(unitScores),
      extra_data: JSON.stringify({ draftNorm: true, iq, percentile, totalQuestions }),
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const SRS2_DIMENSIONS = Object.freeze([
  { code: 'awareness', name: '社交觉知' },
  { code: 'cognition', name: '社交认知' },
  { code: 'communication', name: '社交沟通' },
  { code: 'motivation', name: '社交动机' },
  { code: 'repetitive', name: '刻板行为' },
])

/** SRS-2 T 分等级（官方：<60 正常、60-65 轻度、66-75 中度、≥76 重度） */
export function srs2LevelFromT(t) {
  if (t < 60) return { level: 'normal', levelName: '正常' }
  if (t < 66) return { level: 'mild', levelName: '轻度' }
  if (t < 76) return { level: 'moderate', levelName: '中度' }
  return { level: 'severe', levelName: '重度' }
}

export function makeSrs2Assessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.srs2 || {}
  const base = 48 + rng.float(-3, 3)
  const dimensionScores = {}
  let totalT = 0
  for (const dim of SRS2_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const t = clamp(Math.round(base + offset + (improvement < 1 ? -rng.int(3, 8) : rng.float(-2, 2))), 40, 90)
    const { level, levelName } = srs2LevelFromT(t)
    dimensionScores[dim.code] = {
      name: dim.name,
      rawScore: clamp(Math.round((t - 35) * 0.9), 0, 65),
      tScore: t,
      level,
      levelName,
    }
    totalT += t
  }
  totalT = Math.round(totalT / SRS2_DIMENSIONS.length)
  const { level } = srs2LevelFromT(totalT)
  const rawAnswers = {}
  for (let q = 1; q <= 65; q += 1) {
    rawAnswers[q] = rng.int(0, 2)
  }
  return {
    table: 'srs2_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      raw_answers: JSON.stringify(rawAnswers),
      dimension_scores: JSON.stringify(dimensionScores),
      total_raw_score: clamp(Math.round((totalT - 35) * 0.9), 0, 130),
      total_t_score: totalT,
      total_level: level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CONNERS_DIMENSIONS = Object.freeze([
  { code: 'conduct', name: '品行问题' },
  { code: 'learning', name: '学习问题' },
  { code: 'psychosomatic', name: '心身障碍' },
  { code: 'impulsivity_hyperactivity', name: '冲动-多动' },
  { code: 'anxiety', name: '焦虑' },
  { code: 'hyperactivity_index', name: '多动指数' },
])

/** Conners-PSQ 等级（多动指数 T：<60 正常、60-69 边缘、≥70 临床） */
export function connersLevelFromT(t) {
  if (t < 60) return 'normal'
  if (t < 70) return 'borderline'
  return 'clinical'
}

export function makeConnersPsqAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.conners || {}
  const base = 52 + rng.float(-3, 3)
  const tScores = {}
  const dimensionScores = {}
  for (const dim of CONNERS_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const t = clamp(Math.round(base + offset + (improvement < 1 ? -rng.int(3, 7) : rng.float(-2, 2))), 40, 85)
    tScores[dim.code] = t
    dimensionScores[dim.code] = {
      rawScore: clamp(Math.round((t - 30) * 0.35), 0, 20),
      isValid: true,
      missingCount: 0,
    }
  }
  const hyperactivityIndex = tScores.hyperactivity_index
  const level = connersLevelFromT(hyperactivityIndex)
  const rawScores = {}
  for (let q = 1; q <= 48; q += 1) {
    rawScores[q] = rng.int(0, 3)
  }
  return {
    table: 'conners_psq_assess',
    row: {
      student_id: student.id,
      gender: student.gender === '男' ? 'male' : 'female',
      age_months: student.ageMonths,
      raw_scores: JSON.stringify(rawScores),
      dimension_scores: JSON.stringify(dimensionScores),
      t_scores: JSON.stringify(tScores),
      pi_score: clamp(hyperactivityIndex - rng.int(0, 3), 40, 80),
      ni_score: clamp(hyperactivityIndex - rng.int(2, 6), 40, 80),
      is_valid: 1,
      invalid_reason: null,
      hyperactivity_index: hyperactivityIndex,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CONNERS_TRS_DIMENSIONS = Object.freeze([
  { code: 'conduct', name: '品行问题' },
  { code: 'hyperactivity', name: '多动' },
  { code: 'inattention_passivity', name: '注意不集中-被动' },
  { code: 'hyperactivity_index', name: '多动指数' },
])

/** Conners-TRS 等级（同 PSQ：多动指数 T <60 正常、60-69 边缘、≥70 临床） */
export function makeConnersTrsAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.connersTrs || {}
  const base = 52 + rng.float(-3, 3)
  const tScores = {}
  const dimensionScores = {}
  for (const dim of CONNERS_TRS_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const t = clamp(Math.round(base + offset + (improvement < 1 ? -rng.int(3, 7) : rng.float(-2, 2))), 40, 85)
    tScores[dim.code] = t
    dimensionScores[dim.code] = {
      rawScore: clamp(Math.round((t - 30) * 0.35), 0, 20),
      isValid: true,
      missingCount: 0,
    }
  }
  const hyperactivityIndex = tScores.hyperactivity_index
  const level = connersLevelFromT(hyperactivityIndex)
  const rawScores = {}
  for (let q = 1; q <= 28; q += 1) {
    rawScores[q] = rng.int(0, 3)
  }
  return {
    table: 'conners_trs_assess',
    row: {
      student_id: student.id,
      gender: student.gender === '男' ? 'male' : 'female',
      age_months: student.ageMonths,
      raw_scores: JSON.stringify(rawScores),
      dimension_scores: JSON.stringify(dimensionScores),
      t_scores: JSON.stringify(tScores),
      pi_score: clamp(hyperactivityIndex - rng.int(0, 3), 40, 80),
      ni_score: clamp(hyperactivityIndex - rng.int(2, 6), 40, 80),
      is_valid: 1,
      invalid_reason: null,
      hyperactivity_index: hyperactivityIndex,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const SDQ_DIMENSIONS = Object.freeze([
  { code: 'emotional', name: '情绪症状' },
  { code: 'conduct', name: '品行问题' },
  { code: 'hyperactivity', name: '多动-注意缺陷' },
  { code: 'peer', name: '同伴交往问题' },
  { code: 'prosocial', name: '亲社会行为' },
])

/** SDQ 维度等级（困难维度：0-3 正常、4-5 边缘、6-10 异常；prosocial 相反） */
export function sdqDimensionLevel(code, score) {
  if (code === 'prosocial') {
    if (score >= 6) return { level: 'normal', levelName: '优秀' }
    if (score >= 4) return { level: 'borderline', levelName: '边缘' }
    return { level: 'abnormal', levelName: '需培养' }
  }
  if (score <= 3) return { level: 'normal', levelName: '正常' }
  if (score <= 5) return { level: 'borderline', levelName: '边缘' }
  return { level: 'abnormal', levelName: '异常' }
}

export function sdqTotalLevel(total) {
  if (total <= 13) return '正常'
  if (total <= 16) return '边缘'
  return '异常'
}

export function makeSdqAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.sdq || {}
  const dimensionScores = {}
  const rawScores = {}
  for (const dim of SDQ_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    let score
    if (dim.code === 'prosocial') {
      score = clamp(Math.round(8 + offset + (improvement < 1 ? rng.int(0, 1) : 0)), 0, 10)
    } else {
      score = clamp(Math.round(2 + offset + (improvement < 1 ? -rng.int(0, 2) : rng.float(-0.5, 0.5))), 0, 10)
    }
    const { level, levelName } = sdqDimensionLevel(dim.code, score)
    dimensionScores[dim.code] = { rawScore: score, level, levelName }
    for (let i = 1; i <= 5; i += 1) {
      rawScores[`${dim.code}_${i}`] = rng.int(0, 2)
    }
  }
  const totalDifficulties =
    dimensionScores.emotional.rawScore +
    dimensionScores.conduct.rawScore +
    dimensionScores.hyperactivity.rawScore +
    dimensionScores.peer.rawScore
  return {
    table: 'sdq_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      raw_scores: JSON.stringify(rawScores),
      dimension_scores: JSON.stringify(dimensionScores),
      total_difficulties_score: totalDifficulties,
      prosocial_score: dimensionScores.prosocial.rawScore,
      level: sdqTotalLevel(totalDifficulties),
      is_valid: 1,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const CBCL_INTERNALIZING_FACTORS = Object.freeze(['anxious_depressed', 'withdrawn', 'somatic_complaints'])
const CBCL_EXTERNALIZING_FACTORS = Object.freeze(['rule_breaking', 'aggressive_behavior'])
const CBCL_OTHER_FACTORS = Object.freeze(['social_problems', 'thought_problems', 'attention_problems'])

/** CBCL 等级（总 T：<65 正常、65-69 边缘、≥70 临床） */
export function cbclLevelFromT(t) {
  if (t < 65) return 'normal'
  if (t < 70) return 'borderline'
  return 'clinical'
}

export function makeCbclAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const internalizingOffset = ((profile.cbcl || {}).internalizing || 0) * improvement
  const externalizingOffset = ((profile.cbcl || {}).externalizing || 0) * improvement
  const internalizingT = clamp(Math.round(52 + internalizingOffset + (improvement < 1 ? -rng.int(3, 8) : rng.float(-2, 2))), 40, 80)
  const externalizingT = clamp(Math.round(50 + externalizingOffset + (improvement < 1 ? -rng.int(3, 7) : rng.float(-2, 2))), 40, 78)
  const factorT = {}
  const behaviorRaw = {}
  for (const factor of [...CBCL_INTERNALIZING_FACTORS, ...CBCL_EXTERNALIZING_FACTORS, ...CBCL_OTHER_FACTORS]) {
    const t = clamp(
      CBCL_INTERNALIZING_FACTORS.includes(factor)
        ? internalizingT + rng.int(-3, 3)
        : CBCL_EXTERNALIZING_FACTORS.includes(factor)
          ? externalizingT + rng.int(-3, 3)
          : 52 + rng.int(-4, 4),
      40,
      82,
    )
    factorT[factor] = t
    behaviorRaw[factor] = clamp(Math.round((t - 45) * 0.5), 0, 40)
  }
  const totalT = Math.round((internalizingT * 0.5 + externalizingT * 0.5) * 0.6 + 50 * 0.4 + rng.int(-2, 2))
  const summaryLevel = cbclLevelFromT(totalT)
  const rawAnswers = {}
  for (let q = 1; q <= 113; q += 1) {
    rawAnswers[q] = rng.rand() < 0.7 ? 0 : rng.int(1, 2)
  }
  return {
    table: 'cbcl_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      social_competence_data: JSON.stringify({
        activities: { sports: rng.int(1, 3), hobbies: rng.int(1, 3), organizations: rng.int(0, 2) },
        social: { friends: rng.int(1, 3), withFriends: rng.int(1, 3), behavior: rng.int(1, 3) },
        school: { performance: rng.int(1, 4), special_ed: 0, repeated_grade: 0 },
      }),
      social_activity_score: 42 + rng.int(0, 12),
      social_social_score: 40 + rng.int(0, 14),
      social_school_score: 45 + rng.int(0, 10),
      raw_answers: JSON.stringify(rawAnswers),
      behavior_raw_scores: JSON.stringify(behaviorRaw),
      factor_t_scores: JSON.stringify(factorT),
      total_problems_score: clamp(Math.round((totalT - 35) * 0.7), 0, 120),
      total_problems_t_score: totalT,
      internalizing_t_score: internalizingT,
      externalizing_t_score: externalizingT,
      summary_level: summaryLevel,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

const BRIEF_DIMENSIONS = Object.freeze([
  { code: 'inhibit', name: '抑制' },
  { code: 'shift', name: '转换' },
  { code: 'emotional_control', name: '情感控制' },
  { code: 'initiate', name: '任务发起' },
  { code: 'working_memory', name: '工作记忆' },
  { code: 'plan_organize', name: '计划与组织' },
  { code: 'task_monitor', name: '任务监控' },
  { code: 'organize_materials', name: '物品组织' },
  { code: 'monitor', name: '自我监控' },
])

/** BRIEF 等级（T：<60 良好、60-64 轻度风险、65-69 中度风险、≥70 显著风险） */
export function briefLevelFromT(t) {
  if (t < 60) return { level: 'typical', levelName: '良好' }
  if (t < 65) return { level: 'slightly_elevated', levelName: '轻度风险' }
  if (t < 70) return { level: 'elevated', levelName: '中度风险' }
  return { level: 'clinically_significant', levelName: '显著风险' }
}

export function makeBriefAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.brief || {}
  const base = 52 + rng.float(-3, 3)
  const dimensionScores = {}
  let totalT = 0
  for (const dim of BRIEF_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const t = clamp(Math.round(base + offset + (improvement < 1 ? -rng.int(3, 7) : rng.float(-2, 2))), 40, 85)
    const { level, levelName } = briefLevelFromT(t)
    dimensionScores[dim.code] = {
      name: dim.name,
      rawScore: clamp(Math.round((t - 35) * 0.55), 0, 40),
      rawMean: 1.5,
      tScore: t,
      level,
      levelName,
    }
    totalT += t
  }
  totalT = Math.round(totalT / BRIEF_DIMENSIONS.length)
  const { level: briefLevel, levelCode } = briefLevelFromT(totalT)
  const rawAnswers = {}
  for (let q = 1; q <= 27; q += 1) {
    rawAnswers[q] = { v: rng.int(0, 2), s: 1, t: rng.int(800, 6000) }
  }
  return {
    table: 'brief_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      version: 'school',
      raw_answers: JSON.stringify(rawAnswers),
      dimension_scores: JSON.stringify(dimensionScores),
      total_raw_score: Math.round(totalT * 0.55),
      total_t_score: totalT,
      level: briefLevel,
      level_code: levelCode,
      extra_data: JSON.stringify({
        version: 'school',
        composites: {
          gec: totalT,
          bri: Math.round(dimensionScores.inhibit.tScore * 0.5 + dimensionScores.shift.tScore * 0.3 + dimensionScores.emotional_control.tScore * 0.2),
          eri: Math.round(dimensionScores.working_memory.tScore * 0.5 + dimensionScores.plan_organize.tScore * 0.5),
        },
      }),
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

// ============================================================================
// 生成器注册表
// ============================================================================

export const SCALE_GENERATORS = Object.freeze({
  sm: makeSmAssessment,
  weefim: makeWeefimAssessment,
  csirs: makeCsirsAssessment,
  cnbsr2016: makeCnbsr2016Assessment,
  fine_motor: makeFineMotorAssessment,
  crt: makeCrtAssessment,
  srs2: makeSrs2Assessment,
  'conners-psq': makeConnersPsqAssessment,
  'conners-trs': makeConnersTrsAssessment,
  sdq: makeSdqAssessment,
  cbcl: makeCbclAssessment,
  brief: makeBriefAssessment,
})

/** report_type → module_code（与 catalog 模块归属一致） */
export const SCALE_REPORT_MODULE = Object.freeze({
  sm: 'life_skills',
  weefim: 'life_skills',
  csirs: 'sensory',
  cnbsr2016: 'sensory',
  fine_motor: 'sensory',
  crt: 'cognitive',
  srs2: 'social',
  'conners-psq': 'emotional',
  'conners-trs': 'emotional',
  sdq: 'emotional',
  cbcl: 'emotional',
  brief: 'cognitive',
})

export const SCALE_TITLES = Object.freeze({
  sm: 'S-M量表',
  weefim: 'WeeFIM量表',
  csirs: 'CSIRS感觉统合',
  cnbsr2016: '儿心量表Ⅱ',
  fine_motor: '小肌肉功能发展评估',
  crt: '瑞文CRT图形推理',
  srs2: 'SRS-2社交反应量表',
  'conners-psq': 'Conners父母问卷',
  'conners-trs': 'Conners教师问卷',
  sdq: 'SDQ长处和困难问卷',
  cbcl: 'CBCL儿童行为量表',
  brief: 'BRIEF执行功能问卷',
})

// ============================================================================
// 训练计划生成
// ============================================================================

export const PLAN_TEMPLATES = Object.freeze([
  {
    module_code: 'sensory',
    name: (name) => `${name}的感觉统合训练计划`,
    goals: (disorder) => [
      '改善前庭觉与本体觉信息加工，提升身体协调与运动规划能力',
      '增强触觉调节能力，减少对日常触觉刺激的防御反应',
      '提升视听知觉整合能力，改善课堂学习中的专注表现',
    ],
    shortGoals: (disorder) => [
      '每周完成 4 次感统器材训练，每次 20 分钟',
      '完成前庭觉专项训练 8 次，准确率稳定在 80% 以上',
      '完成触觉脱敏游戏 6 次，情绪平稳完成率 70% 以上',
      '双周进行一次训练效果记录与目标调整',
    ],
  },
  {
    module_code: 'cognitive',
    name: (name) => `${name}的认知能力提升计划`,
    goals: () => [
      '提升图形推理与抽象思维能力',
      '改善工作记忆与计划组织能力',
      '提高课堂任务完成的稳定性与速度',
    ],
    shortGoals: () => [
      '每周完成 3 次图形推理训练（瑞文类游戏），正确率提升 10%',
      '完成记忆配对游戏 10 次，反应时平均缩短 500ms',
      '每周 2 次执行功能游戏，完成任务发起与计划环节',
    ],
  },
  {
    module_code: 'life_skills',
    name: (name) => `${name}的生活自理能力训练计划`,
    goals: () => [
      '提升日常生活自理技能（进食、穿衣、如厕）',
      '增强独立生活能力，减少对成人辅助的依赖',
      '提升社会适应与集体活动参与能力',
    ],
    shortGoals: () => [
      '独立完成穿脱衣物步骤分解训练，完成率 80%',
      '每周 3 次生活自理游戏（L 系列），独立完成 2 项',
      '每月一次 S-M/WeeFIM 复评，跟踪能力变化',
    ],
  },
  {
    module_code: 'emotional',
    name: (name) => `${name}的情绪调节训练计划`,
    goals: () => [
      '提升情绪识别与表达能力',
      '学习情绪调节策略，减少情绪爆发频率',
      '改善同伴交往中的情绪互动质量',
    ],
    shortGoals: () => [
      '每周 3 次情绪场景训练，情绪识别正确率 75% 以上',
      '完成情绪游戏 6 次，能说出 3 种以上情绪名称',
      '记录每日情绪状态，教师周反馈',
    ],
  },
  {
    module_code: 'social',
    name: (name) => `${name}的社交沟通训练计划`,
    goals: () => [
      '提升社交沟通与互动发起能力',
      '改善同伴关系与集体活动参与',
      '增强非语言沟通理解与回应能力',
    ],
    shortGoals: () => [
      '每周 2 次社交情景游戏，主动发起互动 3 次以上',
      '完成社交故事阅读与角色扮演 4 次',
      '参与小组合作游戏，每次持续时间 10 分钟以上',
    ],
  },
])

export function buildPlansForStudent(student, rng, assessments) {
  // 依据评估结果选择计划主题：按最弱量表模块选 1-2 个
  const primaryScale = assessments[0]?.scale || 'sm'
  const moduleByScale = SCALE_REPORT_MODULE[primaryScale] || 'sensory'
  const planTemplate = PLAN_TEMPLATES.find((t) => t.module_code === moduleByScale) || PLAN_TEMPLATES[0]
  const secondTemplate = PLAN_TEMPLATES.find((t) => t.module_code !== moduleByScale && t.module_code !== 'social')
  const plans = []
  // 进行中计划
  plans.push({
    status: 'active',
    template: planTemplate,
    start_date: '2026-05-20',
    end_date: '2026-12-31',
    source_assessment_id: assessments.find((a) => SCALE_REPORT_MODULE[a.scale] === moduleByScale)?.assessId ?? null,
  })
  // 1/3 学生有历史完成计划
  if (rng.rand() < 0.33) {
    plans.push({
      status: 'completed',
      template: secondTemplate || planTemplate,
      start_date: '2026-01-15',
      end_date: '2026-04-30',
      source_assessment_id: null,
    })
  }
  return plans
}

// ============================================================================
// 训练记录生成
// ============================================================================

/** 按学段可用的游戏 code（custom-game-registry.ts） */
export const GAME_CODES_BY_STAGE = Object.freeze({
  preschool: ['G01_BALLOON', 'G04_WIPE_ICE', 'G08_ENERGY_BALL', 'F01_CLOUD_ERASE', 'F05_BALLOONS', 'C02_PUDDLE', 'C03_XYLOPHONE'],
  primary: ['G01_BALLOON', 'G03_FOREST', 'G04_WIPE_ICE', 'G07_MONSTER', 'G08_ENERGY_BALL', 'F02_STAR_TRACE', 'F04_TRACK_BUILD', 'K01_MEMORY_MATCH', 'K06_SIZE_ORDER'],
  middle: ['G03_FOREST', 'G07_MONSTER', 'G09_EXPRESSION_DETECTIVE', 'F03_RECYCLING', 'F04_TRACK_BUILD', 'K03_PATTERN_NEXT', 'K04_ODD_ONE_OUT', 'K07_SPOT_DIFF', 'K08_MAZE_RUN', 'S01_BURGER', 'S03_STORY_SEQ', 'L08_TOWEL_TWIST', 'L09_HOME_SOUND', 'L10_MARKET_PAY'],
})

/**
 * 游戏 code 前缀 → 训练入口 code（与 custom-game-registry.ts 的 trainingEntryCode 一致）：
 * G=情绪调节、F=精细动作、C=安抚教具、K=认知发展、S=社交沟通、L=生活自理。
 * 注意：sensory-integration 入口无注册游戏（该入口以器材训练为主）。
 */
export const GAME_ENTRY_BY_PREFIX = Object.freeze({
  G: 'emotional-regulation',
  F: 'fine-motor',
  C: 'soothing-aids',
  K: 'cognitive',
  S: 'social-communication',
  L: 'life-skills',
})

/** 训练入口 code → 模块 code（与 training-entry.ts TRAINING_ENTRY_DEFINITIONS 一致） */
export const MODULE_BY_ENTRY = Object.freeze({
  'sensory-integration': 'sensory',
  'emotional-regulation': 'emotional',
  'social-communication': 'social',
  'fine-motor': 'sensory',
  'soothing-aids': 'emotional',
  'life-skills': 'life_skills',
  cognitive: 'cognitive',
})

/** 资源模块 code → 训练入口 code（器材记录 entry_code 用） */
export const ENTRY_BY_MODULE = Object.freeze({
  sensory: 'sensory-integration',
  emotional: 'emotional-regulation',
  social: 'social-communication',
  cognitive: 'cognitive',
  life_skills: 'life-skills',
  self_care: 'life-skills',
  fine_motor: 'fine-motor',
})

/**
 * 器材资源 category → 训练入口 code（与 training-entry.ts 器材目录组归属一致）：
 * fine-motor 类 → 精细动作、soothing-aids 类 → 安抚教具、daily-living → 生活自理；
 * 感统相关类（视觉/听觉/触觉/本体/前庭/嗅觉/味觉/整合）→ 感官统合。
 */
export const EQUIPMENT_ENTRY_BY_CATEGORY = Object.freeze({
  'fine-motor': 'fine-motor',
  'soothing-aids': 'soothing-aids',
  'emotional-regulation': 'emotional-regulation',
  'social-communication': 'social-communication',
  'daily-living': 'life-skills',
  cognitive: 'sensory-integration',
  visual: 'sensory-integration',
  auditory: 'sensory-integration',
  tactile: 'sensory-integration',
  olfactory: 'sensory-integration',
  gustatory: 'sensory-integration',
  proprioceptive: 'sensory-integration',
  vestibular: 'sensory-integration',
  integration: 'sensory-integration',
})

/** 自定义游戏 code → 游戏资源中文名（与 custom-game-registry.ts 的 name 一致，用于关联 sys_training_resource 取任务名） */
export const GAME_RESOURCE_NAME_MAP = Object.freeze({
  G01_BALLOON: '深呼吸热气球',
  G03_FOREST: '音量魔法森林',
  G04_WIPE_ICE: '擦亮坏心情',
  G07_MONSTER: '喂食情绪小怪兽',
  G08_ENERGY_BALL: '表情能量球',
  G09_EXPRESSION_DETECTIVE: '表情侦探',
  F01_CLOUD_ERASE: '云朵擦擦擦',
  F02_STAR_TRACE: '连线小星座',
  F03_RECYCLING: '分拣小能手',
  F04_TRACK_BUILD: '轨道修补匠',
  F05_BALLOONS: '刺破慢气球',
  S01_BURGER: '合作造汉堡',
  S02_EMOTION_MIRROR: '表情猜猜乐',
  S03_STORY_SEQ: '故事接龙板',
  S04_GIFT_MATCH: '礼物分享派对',
  S05_ECHO_PARROT: '动物传声筒',
  S06_EXPRESSION_DUEL: '双人表情擂台',
  C01_DANDELION: '吹蒲公英',
  C02_PUDDLE: '水塘波纹',
  C03_XYLOPHONE: '星空八音盒',
  C04_HOURGLASS: '魔法沙漏',
  C05_MOOD_METER: '我的情绪温度计',
  L06_STEADY_SPOON: '稳稳送一勺',
  L07_BODY_SIGNAL: '身体信号小灯塔',
  L08_TOWEL_TWIST: '毛巾拧拧工坊',
  L09_HOME_SOUND: '家里声音小侦探',
  L10_MARKET_PAY: '超市付款小能手',
  K01_MEMORY_MATCH: '记忆翻牌',
  K02_MISSING_ITEM: '少了什么',
  K03_PATTERN_NEXT: '图形找规律',
  K04_ODD_ONE_OUT: '哪个不同类',
  K05_NUMBER_SENSE: '数感小铺',
  K06_SIZE_ORDER: '排排队',
  K07_SPOT_DIFF: '找不同',
  K08_MAZE_RUN: '小迷宫',
  K09_ECHO_SEQ: '序列复现',
  K10_STORY_ORDER: '故事排序',
})

export function stageOf(student) {
  return PRIMARY_GRADE[student.gradeLevel] || 'primary'
}

export const EQUIPMENT_CATEGORIES = Object.freeze(['tactile', 'vestibular', 'proprioceptive', 'visual', 'auditory', 'integration'])

export const TRAINING_COMMENTS = Object.freeze([
  '能配合完成训练，专注度较上次有提升',
  '完成度良好，提示需求减少',
  '需少量语言提示即可完成，表现稳定',
  '主动参与度高，建议逐步增加难度',
  '注意力持续时间延长，训练效果良好',
  '情绪平稳，配合度较高',
  '偶有畏难情绪，鼓励后可继续完成',
  '完成质量较好，动作熟练度提升明显',
])

export const EQUIPMENT_ENVIRONMENTS = Object.freeze(['感统训练室', '个训室', '教室', '资源教室'])

export const EMOTION_SCENE_SUB_MODULES = Object.freeze(['emotion_scene', 'care_scene'])
