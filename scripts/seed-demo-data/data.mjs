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

export const DEMO_DATE = '2026-09-15' // 演示时间基准（2026-2027 学年开学第三周）

export const ID_RANGES = Object.freeze({
  user: [9001, 9005],
  student: [10001, 10042],
  class: [20001, 20019], // 20001-20012 当前学年 12 班 + 20013-20019 上一学年历史 7 班
  plan: [30001, 30080],
  assess: [40001, 40400],
  report: [41001, 41400],
  // ⚠️ 容量按 v2 生成量设计（42 生默认种子实测：训练记录 810、session 1047、器材 194；
  // 理论最坏值更高——越界由 runSeed 末尾的断言显式报错兜底，扩容请同步改这里）（advisor 2026-09-20 #1）
  trainingRecord: [50001, 50950],
  equipmentRecord: [51001, 51300],
  emotionSession: [52001, 52200],
  gameRecord: [53001, 53200],
  trainingSession: [54001, 55200],
  aiChatSession: [61001, 61010],
  aiChatMessage: [61101, 61300],
  aiMemory: [61301, 61360],
})

export const ACADEMIC_YEARS = Object.freeze([
  { academic_year: '2025-2026', start_date: '2025-09-01', end_date: '2026-07-31', is_active: 0 },
  { academic_year: '2026-2027', start_date: '2026-09-01', end_date: '2027-07-31', is_active: 1 },
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
  { id: 9001, username: 'teacher01', name: '陈慧敏', email: 'chenhuimin@example.invalid', avatar_path: 'images/user-avatars/Young_Female_Teacher.png' },
  { id: 9002, username: 'teacher02', name: '王志远', email: 'wangzhiyuan@example.invalid', avatar_path: 'images/user-avatars/Young_Male_Teacher.png' },
  { id: 9003, username: 'teacher03', name: '林晓芳', email: 'linxiaofang@example.invalid', avatar_path: 'images/user-avatars/MiddleAged_Female_Teacher.png' },
  { id: 9004, username: 'teacher04', name: '刘建华', email: 'liujianhua@example.invalid', avatar_path: 'images/user-avatars/MiddleAged_Male_Teacher.png' },
  { id: 9005, username: 'teacher05', name: '周雨桐', email: 'zhouyutong@example.invalid', avatar_path: 'images/user-avatars/Senior_Female_Teacher.png' },
])

// 班级 → 教师分配（sys_class_teachers）
export const CLASS_TEACHER_MAP = Object.freeze({
  20001: [9001],
  20002: [9001, 9005],
  20003: [9002],
  20004: [9002, 9005],
  20005: [9003],
  20006: [9003, 9004],
  20007: [9004],
  20008: [9001],
  20009: [9002],
  20010: [9005],
  20011: [9004],
  20012: [9003],
  20013: [9001], // 历史班
  20014: [9002],
  20015: [9003],
  20016: [9004],
  20017: [9005],
  20018: [9001, 9003],
  20019: [9002, 9004],
})

// ============================================================================
// 班级（当前学年 12 个 + 上一学年历史 7 个）
// 当前学年：幼儿园小/中/大班 + 小学一~六年级 + 初中一~三年级（grade_level 1-12）
// 历史班（2025-2026）：仅用于演示「学年升级/调班历史」与跨学年训练记录归属，
// 2025-2026 的旧班按 grade_level -1 存放（如 一年级1班历史 = grade 4 行），
// 学生历史行通过 student_class_history 关联（is_current=0）。
// ============================================================================

export const CURRENT_YEAR = '2026-2027'
export const PREV_YEAR = '2025-2026'

export const CLASSES = Object.freeze([
  // 当前学年 12 班
  { id: 20001, name: '小班', grade_level: 1, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20002, name: '中班', grade_level: 2, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20003, name: '大班', grade_level: 3, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20004, name: '一年级1班', grade_level: 4, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20005, name: '二年级1班', grade_level: 5, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20006, name: '三年级1班', grade_level: 6, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20007, name: '四年级1班', grade_level: 7, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20008, name: '五年级1班', grade_level: 8, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20009, name: '六年级1班', grade_level: 9, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20010, name: '初一1班', grade_level: 10, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20011, name: '初二1班', class_number: 1, grade_level: 11, academic_year: CURRENT_YEAR, max_students: 12 },
  { id: 20012, name: '初三1班', grade_level: 12, class_number: 1, academic_year: CURRENT_YEAR, max_students: 12 },
  // 上一学年历史班（is_current=0 的 student_class_history 引用它们；不挂当前学生）
  { id: 20013, name: '大班', grade_level: 3, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20014, name: '一年级1班', grade_level: 4, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20015, name: '二年级1班', grade_level: 5, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20016, name: '三年级1班', grade_level: 6, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20017, name: '初一1班', grade_level: 10, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20018, name: '初二1班', grade_level: 11, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
  { id: 20019, name: '初三1班', grade_level: 12, class_number: 1, academic_year: PREV_YEAR, max_students: 12 },
])

// ============================================================================
// 学生（42 人：男 23 / 女 19，幼儿园~初三 12 班每班 3-4 人）
// 生日按 2026-2027 学年 8/31 资格日口径反推（getExpectedGradeLevel: 应读年级 = 4 + (年龄-6)），
// 常规学生 gap=0 或 -1（留 1 级属特教常态不提示）；
// 3 个刻意演示案例（2026-09-19 拍板的月龄-年级核对软提示）：
//   10030 跳级 gap=+2（六年级在读，年龄应读四年级）
//   10033 跳级 gap=+1（初一在读，年龄应读六年级）
//   10039 留级 gap=-3（初三在读，年龄应读六年级，特教延迟入学）
// 诊断分布：学习障碍10 / 言语障碍8 / 发育迟缓7 / 孤独症谱系7 / 智力障碍6 / 多重障碍4
// 头像按学段+性别用 6 张预置头像（src/utils/avatar-presets.ts 路径约定）
// ============================================================================

const AVATAR = Object.freeze({
  kindergarten: { male: 'images/user-avatars/Kindergarten_Male_Student.png', female: 'images/user-avatars/Kindergarten_Female_Student.png' },
  elementary: { male: 'images/user-avatars/Elementary_Male_Student.png', female: 'images/user-avatars/Elementary_Female_Student.png' },
  middleSchool: { male: 'images/user-avatars/MiddleSchool_Male_Student.png', female: 'images/user-avatars/MiddleSchool_Female_Student.png' },
})

function studentAvatar(classId, gender) {
  if (classId <= 20003) return AVATAR.kindergarten[gender === '男' ? 'male' : 'female']
  if (classId <= 20009) return AVATAR.elementary[gender === '男' ? 'male' : 'female']
  return AVATAR.middleSchool[gender === '男' ? 'male' : 'female']
}

const STUDENT_ROWS = Object.freeze([
  // 小班 20001（3-4 岁）
  { id: 10001, name: '陈沐阳', gender: '男', birthday: '2022-11-18', disorder: '发育迟缓', class_id: 20001 },
  { id: 10002, name: '林若汐', gender: '女', birthday: '2023-03-05', disorder: '言语障碍', class_id: 20001 },
  { id: 10003, name: '徐一诺', gender: '男', birthday: '2022-09-26', disorder: '发育迟缓', class_id: 20001 },
  // 中班 20002（4-5 岁）
  { id: 10004, name: '苏艺涵', gender: '女', birthday: '2022-01-14', disorder: '言语障碍', class_id: 20002 },
  { id: 10005, name: '何宇宸', gender: '男', birthday: '2021-10-22', disorder: '孤独症谱系障碍', class_id: 20002 },
  { id: 10006, name: '高沐辰', gender: '男', birthday: '2022-06-09', disorder: '发育迟缓', class_id: 20002 },
  // 大班 20003（5-6 岁）
  { id: 10007, name: '郭芊羽', gender: '女', birthday: '2021-02-17', disorder: '发育迟缓', class_id: 20003 },
  { id: 10008, name: '唐奕辰', gender: '男', birthday: '2020-12-03', disorder: '孤独症谱系障碍', class_id: 20003 },
  { id: 10009, name: '邓芯语', gender: '女', birthday: '2020-10-28', disorder: '言语障碍', class_id: 20003 },
  { id: 10010, name: '冯浩然', gender: '男', birthday: '2021-05-16', disorder: '智力障碍', class_id: 20003 },
  // 一年级 20004（6-7 岁）
  { id: 10011, name: '曹一诺', gender: '男', birthday: '2020-03-11', disorder: '学习障碍', class_id: 20004 },
  { id: 10012, name: '潘语桐', gender: '女', birthday: '2019-11-27', disorder: '言语障碍', class_id: 20004 },
  { id: 10013, name: '袁梓睿', gender: '男', birthday: '2020-06-30', disorder: '孤独症谱系障碍', class_id: 20004 },
  { id: 10014, name: '蔡欣玥', gender: '女', birthday: '2019-09-14', disorder: '发育迟缓', class_id: 20004 },
  // 二年级 20005（7-8 岁）
  { id: 10015, name: '蒋浩宇', gender: '男', birthday: '2019-01-08', disorder: '学习障碍', class_id: 20005 },
  { id: 10016, name: '沈依诺', gender: '女', birthday: '2018-12-19', disorder: '言语障碍', class_id: 20005 },
  { id: 10017, name: '韩梓萱', gender: '女', birthday: '2019-04-25', disorder: '发育迟缓', class_id: 20005 },
  { id: 10018, name: '杨子墨', gender: '男', birthday: '2018-10-06', disorder: '智力障碍', class_id: 20005 },
  // 三年级 20006（8-9 岁）
  { id: 10019, name: '赵雨泽', gender: '男', birthday: '2018-02-13', disorder: '学习障碍', class_id: 20006 },
  { id: 10020, name: '孙梦瑶', gender: '女', birthday: '2017-12-01', disorder: '言语障碍', class_id: 20006 },
  { id: 10021, name: '吴欣怡', gender: '女', birthday: '2018-05-21', disorder: '孤独症谱系障碍', class_id: 20006 },
  // 四年级 20007（9-10 岁）
  { id: 10022, name: '郑宇轩', gender: '男', birthday: '2017-03-30', disorder: '学习障碍', class_id: 20007 },
  { id: 10023, name: '王若曦', gender: '女', birthday: '2016-11-15', disorder: '孤独症谱系障碍', class_id: 20007 },
  { id: 10024, name: '李明轩', gender: '男', birthday: '2017-07-04', disorder: '智力障碍', class_id: 20007 },
  // 五年级 20008（10-11 岁）
  { id: 10025, name: '张子涵', gender: '男', birthday: '2016-04-18', disorder: '学习障碍', class_id: 20008 },
  { id: 10026, name: '刘诗琪', gender: '女', birthday: '2015-10-09', disorder: '发育迟缓', class_id: 20008 },
  { id: 10027, name: '陈梓豪', gender: '男', birthday: '2016-01-27', disorder: '多重障碍', class_id: 20008 },
  // 六年级 20009（11-12 岁；10030 = 跳级演示案例）
  { id: 10028, name: '黄雅雯', gender: '女', birthday: '2015-03-22', disorder: '学习障碍', class_id: 20009 },
  { id: 10029, name: '周俊杰', gender: '男', birthday: '2014-12-08', disorder: '智力障碍', class_id: 20009 },
  { id: 10030, name: '吴思彤', gender: '女', birthday: '2016-12-05', disorder: '学习障碍', class_id: 20009 },
  { id: 10031, name: '徐浩轩', gender: '男', birthday: '2015-06-14', disorder: '言语障碍', class_id: 20009 },
  // 初一 20010（12-13 岁；10033 = 跳级演示案例）
  { id: 10032, name: '朱子豪', gender: '男', birthday: '2014-05-19', disorder: '多重障碍', class_id: 20010 },
  { id: 10033, name: '胡欣妍', gender: '女', birthday: '2014-10-21', disorder: '学习障碍', class_id: 20010 },
  { id: 10034, name: '高一鸣', gender: '男', birthday: '2013-12-30', disorder: '孤独症谱系障碍', class_id: 20010 },
  { id: 10035, name: '林诗涵', gender: '女', birthday: '2014-02-16', disorder: '学习障碍', class_id: 20010 },
  // 初二 20011（13-14 岁）
  { id: 10036, name: '何雨桐', gender: '女', birthday: '2013-06-07', disorder: '言语障碍', class_id: 20011 },
  { id: 10037, name: '罗天佑', gender: '男', birthday: '2012-11-24', disorder: '多重障碍', class_id: 20011 },
  { id: 10038, name: '郑文博', gender: '男', birthday: '2013-03-13', disorder: '智力障碍', class_id: 20011 },
  // 初三 20012（14-15 岁；10039 = 留级演示案例，大龄延迟入学）
  { id: 10039, name: '马志强', gender: '男', birthday: '2014-11-09', disorder: '多重障碍', class_id: 20012 },
  { id: 10040, name: '谢雨欣', gender: '女', birthday: '2012-02-05', disorder: '孤独症谱系障碍', class_id: 20012 },
  { id: 10041, name: '宋佳琪', gender: '女', birthday: '2011-10-17', disorder: '智力障碍', class_id: 20012 },
  { id: 10042, name: '唐一帆', gender: '男', birthday: '2012-05-29', disorder: '学习障碍', class_id: 20012 },
])

export const STUDENTS = Object.freeze(
  STUDENT_ROWS.map((s) => ({ ...s, student_no: `ST${s.id}`, avatar_path: studentAvatar(s.class_id, s.gender) })),
)

// ============================================================================
// 跨学年班级历史（student_class_history 的 is_current=0 行）
// 语义：2025-2026 学年读历史班（20013-20019），2026 年 7 月升级离班，9 月入当前班。
// 其中 10036 额外演示「学年中途调班」：历史行 leave_reason='adjust'
// （同学年调班在业务层是 UPDATE 现有行，库中只留终态班级，用 leave_reason 表达调整痕迹）。
// 未列出的学生只有当前学年一行（enrollment 2026-09-01）。
// ============================================================================

export const CLASS_HISTORY_UPGRADES = Object.freeze([
  // { studentId, prevClassId }：prevClassId = 2025-2026 学年所在历史班
  { studentId: 10011, prevClassId: 20013 }, // 大班历史 → 一年级
  { studentId: 10012, prevClassId: 20013 },
  { studentId: 10014, prevClassId: 20013 },
  { studentId: 10015, prevClassId: 20014 }, // 一年级历史 → 二年级
  { studentId: 10016, prevClassId: 20014 },
  { studentId: 10017, prevClassId: 20014 },
  { studentId: 10019, prevClassId: 20015 }, // 二年级历史 → 三年级
  { studentId: 10020, prevClassId: 20015 },
  { studentId: 10021, prevClassId: 20015 },
  { studentId: 10022, prevClassId: 20016 }, // 三年级历史 → 四年级
  { studentId: 10025, prevClassId: 20016 },
  { studentId: 10028, prevClassId: 20016 },
  { studentId: 10032, prevClassId: 20017 }, // 初一历史 → 初二
  { studentId: 10033, prevClassId: 20017 },
  { studentId: 10034, prevClassId: 20017 },
  { studentId: 10036, prevClassId: 20018, leaveReason: 'adjust' }, // 初二历史（学年中调班后升学）
  { studentId: 10037, prevClassId: 20018 },
  { studentId: 10039, prevClassId: 20019 }, // 初三历史 → 毕业留校复读（初三无更高班，语义=升级失败复读）
  { studentId: 10040, prevClassId: 20019 },
  { studentId: 10041, prevClassId: 20019 },
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
    // ABC/ATEC（孤独症族量表：诊断核心呼应，分数为维度加分偏移）
    abc: { sensory: 10, relating: 14, body_object: 9, language: 12, social_self_help: 11 },
    atec: { speech: 22, sociability: 24, sensory: 16, health: 10 },
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
  发育迟缓: {
    sm: -3,
    weefim: -18,
    weefimCognitive: -10,
    csirs: { learning: -8, executive: -9, vestibular: -6, tactile: -5, proprioception: -7 },
    cnbsr: { gm: -8, fm: -10, ad: -12, la: -14, sb: -10 },
    fmda: { hand_grasp: 0.1, finger_dexterity: 0.14, bilateral_coordination: 0.12, vmi: 0.14, pre_writing: 0.16, self_care: 0.14 },
    crt: -10,
    srs2: { awareness: 5, cognition: 6, communication: 8, motivation: 5, repetitive: 4 },
    conners: { conduct: 2, learning: 6, psychosomatic: 2, impulsivity_hyperactivity: 4, anxiety: 3, hyperactivity_index: 3 },
    connersTrs: { conduct: 2, hyperactivity: 3, inattention_passivity: 6, hyperactivity_index: 3 },
    sdq: { emotional: 2, conduct: 1, hyperactivity: 3, peer: 4, prosocial: -1 },
    cbcl: { internalizing: 5, externalizing: 3 },
    brief: { inhibit: 4, shift: 4, emotional_control: 5, working_memory: 7, plan_organize: 6, monitor: 4, task_monitor: 5, organize_materials: 4, initiate: 6 },
    // ABC/ATEC/CPEP-3（孤独症族量表，发育迟缓轻度呼应）
    abc: { sensory: 4, relating: 8, body_object: 5, language: 9, social_self_help: 8 },
    atec: { speech: 14, sociability: 16, sensory: 10, health: 8 },
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

/** 年级 → 学段（grade_level 1-12 全覆盖；1-3 幼儿园、4-9 小学、10-12 初中） */
export const PRIMARY_GRADE = Object.freeze({
  1: 'preschool',
  2: 'preschool',
  3: 'preschool',
  4: 'primary',
  5: 'primary',
  6: 'primary',
  7: 'primary',
  8: 'primary',
  9: 'primary',
  10: 'middle',
  11: 'middle',
  12: 'middle',
})

/** 小学补充量表（按诊断/年龄） */
const PRIMARY_EXTRA = {
  学习障碍: ['crt'],
  言语障碍: ['srs2'],
  发育迟缓: ['cnbsr2016'],
  多重障碍: ['crt'],
  孤独症谱系障碍: ['abc'],
  智力障碍: ['crt'],
}

/** 初中补充量表（按诊断/年龄；学习障碍补 Conners 教师问卷 + BRIEF 认知相关） */
const MIDDLE_EXTRA = {
  学习障碍: ['conners-psq', 'conners-trs', 'brief'],
  言语障碍: ['sdq', 'cbcl'],
  发育迟缓: ['sdq', 'srs2'],
  多重障碍: ['cbcl', 'sdq'],
  孤独症谱系障碍: ['abc', 'atec', 'cbcl', 'sdq'],
  智力障碍: ['brief', 'sdq'],
}

/**
 * 计算某学生的评估计划：
 * { scale, times: 1|2 }[]，times=2 表示做前测+后测（体现训练进步）
 * 规则（每生 2-5 个量表，总量表数不超 5）：
 * - 幼儿园(1-3)：cnbsr2016（必做且纵向）+ fine_motor + sm + weefim(50%)；发育迟缓/孤独症加 abc
 * - 小学(4-9)：sm + weefim + csirs + 按诊断补充（crt/srs2/abc/cnbsr 低龄）
 * - 初中(10-12)：weefim + crt + 按诊断 srs2/sm + 补充（abc/atec/cbcl/sdq/conners）
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
    // 孤独症/发育迟缓幼儿补 ABC 初筛（3 岁以上）
    if (['孤独症谱系障碍', '发育迟缓'].includes(disorder) && ageMonths >= 36 && scales.length < 5) {
      scales.push({ scale: 'abc', times: rng.rand() < 0.5 ? 2 : 1 })
    }
    // 孤独症幼儿补 CPEP-3（2-7 岁常模窗）
    if (disorder === '孤独症谱系障碍' && scales.length < 5) {
      scales.push({ scale: 'cpep_3', times: 2 })
    }
    // 运动发育落后幼儿补 TGMD-3（3-10 岁）
    if (['发育迟缓', '多重障碍', '智力障碍'].includes(disorder) && ageMonths >= 36 && scales.length < 5) {
      scales.push({ scale: 'tgmd_3', times: rng.rand() < 0.5 ? 2 : 1 })
    }
  } else if (stage === 'primary') {
    scales.push({ scale: 'sm', times: rng.rand() < 0.5 ? 2 : 1 })
    scales.push({ scale: 'weefim', times: rng.rand() < 0.4 ? 2 : 1 })
    scales.push({ scale: 'csirs', times: rng.rand() < 0.5 ? 2 : 1 })
    const extras = PRIMARY_EXTRA[disorder] || []
    for (const extra of extras) {
      if (scales.length >= 5) break
      if (!isScaleAgeOk(extra, ageMonths)) continue
      if (scales.some((s) => s.scale === extra)) continue
      scales.push({ scale: extra, times: rng.rand() < 0.5 ? 2 : 1 })
    }
    // 低龄小学生补 TGMD-3（3-10 岁，运动协调）
    if (['发育迟缓', '多重障碍', '智力障碍'].includes(disorder) && ageMonths <= 120 && scales.length < 5) {
      scales.push({ scale: 'tgmd_3', times: rng.rand() < 0.5 ? 2 : 1 })
    }
    // 运动障碍向学生补 GMFM-88（粗大运动，5 月-16 岁）
    if (['多重障碍', '智力障碍'].includes(disorder) && scales.length < 5) {
      scales.push({ scale: 'gmfm_88', times: rng.rand() < 0.5 ? 2 : 1 })
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
    // 初中运动障碍学生补 GMFM-88
    if (['多重障碍', '智力障碍'].includes(disorder) && scales.length < 5) {
      scales.push({ scale: 'gmfm_88', times: rng.rand() < 0.5 ? 2 : 1 })
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
  sdq: 192, // 3-16岁（catalog 3-16）
  cbcl: 192, // 4-16岁
  brief: 216, // 2-18岁
  abc: 240, // 3岁以上（演示数据保守上限 20 岁）
  atec: 240, // 2岁以上
  cpep_3: 90, // 2-7岁（常模覆盖 2-7.5 岁；超龄拒测）
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
  sdq: 36,
  cbcl: 48,
  brief: 24,
  abc: 36, // 3 岁以上
  atec: 24, // 2 岁以上
  cpep_3: 24, // 2-7 岁
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

/**
 * 评估时间（2026-2027 学年时间轴）：
 * - 纵向前测：2026-03-01~04-30（上学期下段，训练前基线）
 * - 纵向后测：2026-07-15~08-05（上学期末，训练后复评 → 趋势页进步曲线）
 * - 单次评估：2026-03-01~09-12（含 9 月开学新评估，看板「本周评估」有数据）
 */
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
    : isoToDate('2026-09-12')
  const span = Math.floor((end - start) / 86400000)
  return addDays(start, rng.int(0, Math.max(0, span)))
}

/** 训练时间：上学期训练 2026-04-15~07-30 + 本学期开学 2026-09-01~09-14（看板「今天」有数据） */
export function pickTrainingDate(rng) {
  // 70% 落上学期训练期，30% 落本学期开学两周（保证 9 月新鲜记录）
  const inSeptember = rng.rand() < 0.3
  const start = inSeptember ? isoToDate('2026-09-01') : isoToDate('2026-04-15')
  const end = inSeptember ? isoToDate('2026-09-14') : isoToDate('2026-07-30')
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

/** 根据标准分求 S-M 等级（SMDriver.getLevelCode 规则：src/strategies/assessment/SMDriver.ts:431-440） */
export function smLevelFromSq(sq) {
  if (sq <= 5) return '极重度'
  if (sq === 6) return '重度'
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
// ABC 孤独症行为评定量表（57 题加权 0-158；getABCLevel 判级）
// ============================================================================

const ABC_DIMENSIONS = Object.freeze([
  { code: 'sensory', name: '感觉' },
  { code: 'relating', name: '交往' },
  { code: 'body_object', name: '躯体运动' },
  { code: 'language', name: '语言' },
  { code: 'social_self_help', name: '生活自理' },
])

export function abcLevelFromTotal(total) {
  if (total < 49) return 'normal'
  if (total < 62) return 'borderline'
  if (total < 80) return 'mild'
  if (total < 100) return 'moderate'
  return 'severe'
}

export function makeAbcAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.abc || {}
  const dimensionScores = {}
  let totalScore = 0
  for (const dim of ABC_DIMENSIONS) {
    const offset = (dimOffsets[dim.code] || 0) * improvement
    const raw = clamp(Math.round(6 + offset + rng.float(-2, 2)), 0, 38)
    dimensionScores[dim.code] = { name: dim.name, rawScore: raw }
    totalScore += raw
  }
  const level = abcLevelFromTotal(totalScore)
  const rawAnswers = {}
  for (let q = 1; q <= 57; q += 1) {
    // 加权题：70% 不符合(0)，其余按维度权重 1-4
    rawAnswers[`abc_${q}`] = rng.rand() < 0.7 ? 0 : rng.int(1, 4)
  }
  return {
    table: 'abc_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      raw_answers: JSON.stringify(rawAnswers),
      dimension_scores: JSON.stringify(dimensionScores),
      total_score: totalScore,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

// ============================================================================
// ATEC 孤独症治疗评估量表（77 题 0-179；getATECLevel 判级；分数越低越好）
// ============================================================================

const ATEC_SUBSCALES = Object.freeze([
  { code: 'speech', name: '语言/沟通', max: 28 },
  { code: 'sociability', name: '社交能力', max: 40 },
  { code: 'sensory', name: '感知/认知', max: 42 },
  { code: 'health', name: '健康/行为', max: 75 },
])

export function atecLevelFromTotal(total) {
  if (total < 40) return 'minimal'
  if (total < 70) return 'mild'
  if (total < 120) return 'moderate'
  return 'severe'
}

export function makeAtecAssessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const dimOffsets = profile.atec || {}
  const subscaleScores = {}
  let totalScore = 0
  for (const sub of ATEC_SUBSCALES) {
    const offset = (dimOffsets[sub.code] || 0) * improvement
    const raw = clamp(Math.round(8 + offset + (improvement < 1 ? -rng.int(2, 6) : rng.float(-2, 2))), 0, sub.max)
    subscaleScores[sub.code] = raw
    totalScore += raw
  }
  const level = atecLevelFromTotal(totalScore)
  const rawAnswers = {}
  for (let q = 1; q <= 77; q += 1) {
    rawAnswers[`atec_${q}`] = rng.rand() < 0.6 ? 0 : rng.int(1, 3)
  }
  return {
    table: 'atec_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      raw_answers: JSON.stringify(rawAnswers),
      subscale_scores: JSON.stringify(subscaleScores),
      total_score: totalScore,
      level,
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

// ============================================================================
// CPEP-3（PEP-3 心理教育量表）：91 题静态确定性判分 → 旧记录形态（无 report_snapshot，
// 报告页 normalizeLegacyDomainResult 只读重算，与 capture 脚本 9117 样例同构）
// ============================================================================

const CPEP3_DOMAINS = Object.freeze([
  { code: 'A', name: '模仿', kind: 'developmental', maxPass: 10 },
  { code: 'B', name: '知觉', kind: 'developmental', maxPass: 11 },
  { code: 'C', name: '精细动作', kind: 'developmental', maxPass: 10 },
  { code: 'D', name: '大动作', kind: 'developmental', maxPass: 11 },
  { code: 'E', name: '手眼协调', kind: 'developmental', maxPass: 14 },
  { code: 'F', name: '认知语言', kind: 'developmental', maxPass: 20 },
  { code: 'G', name: '认知表达', kind: 'developmental', maxPass: 19 },
  { code: 'H', name: '情感表达', kind: 'behavioral', max: 6 },
  { code: 'I', name: '社会交往', kind: 'behavioral', max: 7 },
  { code: 'J', name: '感觉模式', kind: 'behavioral', max: 6 },
  { code: 'K', name: '语言模式', kind: 'behavioral', max: 14 },
  { code: 'L', name: '行为模式', kind: 'behavioral', max: 11 },
])

/**
 * 按画像强度给发展能区 P/E/F 分布：offset 越负（能力越弱）→ P 比例越低。
 * 展示层用 passCount/emergingCount/severityScore，与快照无关 → 无需 import 真实常模。
 */
export function makeCpep3Assessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const weakFactor = clamp(0.22 + ((profile.crt || 0) * -0.006), 0.15, 0.55) // crt 负偏移越大 → 越弱
  const domainResults = []
  const details = []
  let questionSeq = 0
  for (const domain of CPEP3_DOMAINS) {
    const count = domain.kind === 'developmental' ? domain.maxPass : domain.max
    let passCount = 0
    let emergingCount = 0
    let severityScore = 0
    for (let i = 1; i <= count; i += 1) {
      questionSeq += 1
      const roll = rng.rand()
      if (domain.kind === 'developmental') {
        const passRate = clamp(1 - weakFactor - rng.float(0, 0.15), 0.2, 0.9)
        let level
        if (roll < passRate) { level = 'P'; passCount += 1 }
        else if (roll < passRate + 0.18) { level = 'E'; emergingCount += 1 }
        else { level = 'F' }
        const score = level === 'P' ? 2 : level === 'E' ? 1 : 0
        details.push({ question_id: questionSeq, code_no: `${domain.code}${i}`, dimension: domain.code, item_type: 'administered', level, score })
      } else {
        const severeRate = clamp(weakFactor - 0.05 + rng.float(0, 0.2), 0.05, 0.6)
        let level
        if (roll < 1 - severeRate - 0.2) { level = 'A'; }
        else if (roll < 1 - 0.2) { level = 'M'; severityScore += 1 }
        else { level = 'S'; severityScore += 2 }
        const score = level === 'A' ? 0 : level === 'M' ? 1 : 2
        details.push({ question_id: questionSeq, code_no: `${domain.code}${i}`, dimension: domain.code, item_type: 'rated', level, score })
      }
    }
    domainResults.push({
      domainCode: domain.code,
      domainName: domain.name,
      passCount,
      emergingCount,
      severityScore,
      itemCount: count,
    })
  }
  const totalPassCount = details.filter((d) => d.item_type === 'administered' && d.level === 'P').length
  const totalEmergingCount = details.filter((d) => d.item_type === 'administered' && d.level === 'E').length
  const totalMentalAge = clamp(Math.round(student.ageMonths * (0.55 + rng.float(-0.05, 0.1))), 12, 90)
  return {
    table: 'cpep3_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      ca_year: Math.floor(student.ageMonths / 12),
      ca_month: student.ageMonths % 12,
      ca_day: 0,
      ca_months_decimal: Number(student.ageMonths.toFixed(1)),
      total_pass_count: totalPassCount,
      total_emerging_count: totalEmergingCount,
      total_mental_age: totalMentalAge,
      total_month_range: `${totalMentalAge - 2}-${totalMentalAge + 2}`,
      domain_results: JSON.stringify(domainResults),
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
    details,
  }
}

// ============================================================================
// GMFM-88 粗大运动（88 题 264 分；5 能区 percentage + 描述性 level）
// ============================================================================

const GMFM_DOMAINS = Object.freeze([
  { code: 'A', name: '卧位与翻身', max: 51, itemCount: 17 },
  { code: 'B', name: '坐位', max: 60, itemCount: 20 },
  { code: 'C', name: '爬与跪', max: 42, itemCount: 14 },
  { code: 'D', name: '站立', max: 39, itemCount: 13 },
  { code: 'E', name: '走、跑、跳', max: 72, itemCount: 24 },
])

function gmfmLevelFromPercentage(pct) {
  if (pct >= 80) return { level: '表现稳定', levelCode: 'stable', severity: 'success' }
  if (pct >= 65) return { level: '继续巩固', levelCode: 'consolidate', severity: 'success' }
  if (pct >= 45) return { level: '需要支持', levelCode: 'support', severity: 'warning' }
  return { level: '显著迟缓', levelCode: 'delayed', severity: 'danger' }
}

export function makeGmfm88Assessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const weakFactor = clamp(0.2 + ((profile.cnbsr?.gm || 0) * -0.008), 0.12, 0.55)
  const domainResults = GMFM_DOMAINS.map((domain) => {
    const pct = clamp(100 - weakFactor * 100 + rng.float(-8, 10) + (improvement < 1 ? rng.float(2, 6) : 0), 18, 96)
    const { level, levelCode, severity } = gmfmLevelFromPercentage(pct)
    return {
      code: domain.code,
      name: domain.name,
      rawScore: Math.round(domain.max * pct / 100),
      maxScore: domain.max,
      percentage: Number(pct.toFixed(1)),
      ntCount: 0,
      itemCount: domain.itemCount,
      level,
      severity,
    }
  })
  const rawTotal = domainResults.reduce((s, d) => s + d.rawScore, 0)
  const totalMax = domainResults.reduce((s, d) => s + d.maxScore, 0)
  const totalScore = Number((rawTotal / totalMax * 100).toFixed(1))
  const overall = gmfmLevelFromPercentage(totalScore)
  return {
    table: 'gmfm_88_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      total_score: totalScore,
      raw_total_score: rawTotal,
      total_max_score: totalMax,
      level: `${overall.level}`,
      level_code: overall.levelCode,
      domain_results: JSON.stringify(domainResults),
      domain_feedback: JSON.stringify(domainResults.map((d) => ({
        code: d.code,
        title: `${d.name}（${d.level}）`,
        label: '结果解读',
        content: `${d.name}能区得分率 ${d.percentage}%。${d.severity === 'success' ? '整体动作模式稳定，可增加变化情境练习。' : '建议将动作分解练习并逐步增加连续性要求。'}`,
        advice: d.severity === 'success' ? '保持现有训练节奏并定期复评。' : '每周安排 2-3 次专项动作训练，配合游戏化任务。',
      }))),
      iep_targets: JSON.stringify([]),
      flags: JSON.stringify([]),
      overall_rule: JSON.stringify({
        id: 'gmfm-demo',
        title: '总体运动能力',
        severity: overall.severity,
        summary: `粗大运动总体得分率 ${totalScore}%（${overall.level}）。`,
        content: '建议以动态平衡、重心转移和动作衔接为近期训练重点。',
        advice: ['每周安排 2-3 次平衡与移动路线练习。'],
      }),
      start_time: `${toIso(date)} ${String(rng.int(8, 17)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
      end_time: `${toIso(date)} ${String(rng.int(9, 18)).padStart(2, '0')}:${String(rng.int(0, 59)).padStart(2, '0')}:00`,
    },
  }
}

// ============================================================================
// TGMD-3 大肌肉动作发展（13 技能项；位移/球类 2 能区）
// ============================================================================

const TGMD_SKILLS = Object.freeze([
  { qid: 1, code: 'A1', dim: 'locomotor', dimName: '位移技能', name: '快速跑', max: 8 },
  { qid: 2, code: 'A2', dim: 'locomotor', dimName: '位移技能', name: '马步跳', max: 8 },
  { qid: 3, code: 'A3', dim: 'locomotor', dimName: '位移技能', name: '单脚连续跳', max: 6 },
  { qid: 4, code: 'A4', dim: 'locomotor', dimName: '位移技能', name: '跨步跳', max: 8 },
  { qid: 5, code: 'A5', dim: 'locomotor', dimName: '位移技能', name: '立定跳远', max: 8 },
  { qid: 6, code: 'A6', dim: 'locomotor', dimName: '位移技能', name: '侧滑步', max: 8 },
  { qid: 7, code: 'B1', dim: 'ball_skills', dimName: '球类技能', name: '双手持棒击定位球', max: 8 },
  { qid: 8, code: 'B2', dim: 'ball_skills', dimName: '球类技能', name: '单手持拍击反弹球', max: 8 },
  { qid: 9, code: 'B3', dim: 'ball_skills', dimName: '球类技能', name: '单手原地拍球', max: 8 },
  { qid: 10, code: 'B4', dim: 'ball_skills', dimName: '球类技能', name: '双手接球', max: 6 },
  { qid: 11, code: 'B5', dim: 'ball_skills', dimName: '球类技能', name: '踢定位球', max: 8 },
  { qid: 12, code: 'B6', dim: 'ball_skills', dimName: '球类技能', name: '过肩投球', max: 8 },
  { qid: 13, code: 'B7', dim: 'ball_skills', dimName: '球类技能', name: '下手抛球', max: 8 },
])

function tgmdNormLabel(pct) {
  if (pct >= 80) return { level: 3, label: '平均水平（稳步发展）', descLevel: '发展良好', severity: 'success' }
  if (pct >= 60) return { level: 2, label: '中度偏差（需关注与支持）', descLevel: '需要支持', severity: 'warning' }
  return { level: 1, label: '显著偏差（需重点干预）', descLevel: '显著迟缓', severity: 'danger' }
}

export function makeTgmd3Assessment(student, rng, { date, improvement }) {
  const profile = DIAGNOSIS_PROFILES[student.disorder] || {}
  const weakFactor = clamp(0.2 + ((profile.cnbsr?.gm || 0) * -0.008), 0.12, 0.55)
  const skillResults = TGMD_SKILLS.map((skill) => {
    const pct = clamp(1 - weakFactor + rng.float(-0.12, 0.12) + (improvement < 1 ? 0.04 : 0), 0.2, 0.98)
    const score = Math.round(skill.max * pct)
    return {
      questionId: skill.qid,
      itemCode: skill.code,
      dimensionName: skill.dimName,
      name: skill.name,
      score,
      maxScore: skill.max,
      percentage: Number((score / skill.max * 100).toFixed(1)),
      criteria: ['动作模式基本协调', '完成过程保持稳定'],
    }
  })
  const domainResults = ['locomotor', 'ball_skills'].map((code) => {
    const skills = skillResults.filter((s) => TGMD_SKILLS.find((k) => k.code === s.itemCode).dim === code)
    const raw = skills.reduce((sum, s) => sum + s.score, 0)
    const max = skills.reduce((sum, s) => sum + s.maxScore, 0)
    const pct = Number((raw / max * 100).toFixed(1))
    const norm = tgmdNormLabel(pct)
    return {
      code,
      name: code === 'locomotor' ? '位移技能' : '球类技能',
      rawScore: raw,
      maxScore: max,
      percentage: pct,
      normLevel: norm.level,
      normLabel: norm.label,
      level: norm.descLevel,
      severity: norm.severity,
    }
  })
  const totalRaw = domainResults.reduce((s, d) => s + d.rawScore, 0)
  const totalMax = domainResults.reduce((s, d) => s + d.maxScore, 0)
  const totalPct = Number((totalRaw / totalMax * 100).toFixed(1))
  const totalNorm = tgmdNormLabel(totalPct)
  return {
    table: 'tgmd_3_assess',
    row: {
      student_id: student.id,
      age_months: student.ageMonths,
      gender: student.gender === '男' ? 'male' : 'female',
      locomotor_score: domainResults[0].rawScore,
      locomotor_percent: domainResults[0].percentage,
      locomotor_level: domainResults[0].normLevel,
      ball_skills_score: domainResults[1].rawScore,
      ball_skills_percent: domainResults[1].percentage,
      ball_skills_level: domainResults[1].normLevel,
      total_score: totalRaw,
      total_percent: totalPct,
      total_level: totalNorm.level,
      level: totalNorm.descLevel,
      level_code: `level_${totalNorm.level}`,
      domain_results: JSON.stringify(domainResults),
      domain_feedback: JSON.stringify(domainResults.map((d) => ({
        code: d.code,
        title: `${d.name}（${d.level}）`,
        label: '结果解读',
        content: `${d.name}得分率 ${d.percentage}%，常模定位：${d.normLabel}。`,
        advice: d.severity === 'success' ? '继续多样化动作组合练习。' : '从单项分解动作开始，逐步过渡到连续组合动作。',
      }))),
      skill_results: JSON.stringify(skillResults),
      norm_summary: JSON.stringify({
        locomotorLevel: domainResults[0].normLevel,
        locomotorLabel: domainResults[0].normLabel,
        ballLevel: domainResults[1].normLevel,
        ballLabel: domainResults[1].normLabel,
        totalLevel: totalNorm.level,
        totalLabel: totalNorm.label,
      }),
      iep_targets: JSON.stringify([]),
      flags: JSON.stringify([]),
      overall_rule: JSON.stringify({
        id: 'tgmd3-demo',
        title: '总体运动能力',
        severity: totalNorm.severity,
        summary: `总体动作发展得分率 ${totalPct}%（${totalNorm.descLevel}）。`,
        content: '建议在安全、可预测的运动情境中增加重复练习。',
        advice: ['每周安排 2-3 次球类协调练习。'],
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
  abc: makeAbcAssessment,
  atec: makeAtecAssessment,
  cpep_3: makeCpep3Assessment,
  gmfm_88: makeGmfm88Assessment,
  tgmd_3: makeTgmd3Assessment,
})

/** report_type → module_code（与 catalog accessModulesAnyOf 首选模块一致） */
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
  abc: 'social',
  atec: 'social',
  cpep_3: 'social',
  gmfm_88: 'sensory',
  tgmd_3: 'sensory',
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
  abc: 'ABC孤独症行为量表',
  atec: 'ATEC孤独症治疗评估量表',
  cpep_3: 'PEP-3心理教育量表',
  gmfm_88: 'GMFM-88粗大运动',
  tgmd_3: 'TGMD-3大肌肉动作发展',
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
  // 进行中计划（本学期新开：9 月中开始）
  plans.push({
    status: 'active',
    template: planTemplate,
    start_date: '2026-09-07',
    end_date: '2027-01-30',
    source_assessment_id: assessments.find((a) => SCALE_REPORT_MODULE[a.scale] === moduleByScale)?.assessId ?? null,
  })
  // 1/3 学生有历史完成计划（上学期）
  if (rng.rand() < 0.33) {
    plans.push({
      status: 'completed',
      template: secondTemplate || planTemplate,
      start_date: '2026-03-09',
      end_date: '2026-07-10',
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

// ============================================================================
// AI 助手演示数据（会话 + 消息 + 学生记忆）
// agent_code 用内置智能体 code（src/data/ai-agent-presets.ts）：
// special_ed_teacher=一人一策 / scgp_builtin_growth_observer=成长看得见 /
// scgp_builtin_communication_support=沟通有方 / scgp_builtin_wellbeing_support=心晴陪伴
// 记忆内容 ≤200 字符（ai_student_memory CHECK），[STUDENT] 为脱敏占位（记忆注入语义）
// ============================================================================

export const AI_CHAT_SESSIONS = Object.freeze([
  {
    id: 61001,
    user_id: 9001,
    agent_code: 'special_ed_teacher',
    title: '【学生】的感觉统合训练调整',
    student_id: 10019,
    memory_watermark: 0,
    created_at: '2026-09-08 10:20:00',
    updated_at: '2026-09-08 10:32:00',
  },
  {
    id: 61002,
    user_id: 9001,
    agent_code: 'scgp_builtin_growth_observer',
    title: '【学生】进步复盘与家长沟通',
    student_id: 10019,
    memory_watermark: 0,
    created_at: '2026-09-10 15:05:00',
    updated_at: '2026-09-10 15:26:00',
  },
  {
    id: 61003,
    user_id: 9002,
    agent_code: 'scgp_builtin_communication_support',
    title: '语言表达训练的家庭配合',
    student_id: 10016,
    memory_watermark: 0,
    created_at: '2026-09-09 11:40:00',
    updated_at: '2026-09-09 11:58:00',
  },
  {
    id: 61004,
    user_id: 9003,
    agent_code: 'scgp_builtin_wellbeing_support',
    title: '课堂情绪爆发的应对策略',
    student_id: 10023,
    memory_watermark: 0,
    created_at: '2026-09-11 14:12:00',
    updated_at: '2026-09-11 14:35:00',
  },
])

export const AI_CHAT_MESSAGES = Object.freeze([
  // 会话 61001：一人一策 × 感统训练
  { id: 61101, session_id: 61001, role: 'user', content: '赵雨泽最近上课坐不住，写作业时手部动作很笨拙，感觉统合训练计划需要怎么调整？', tokens_total: 38, tokens_prompt: 0, tokens_completion: 38, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-08 10:20:00' },
  { id: 61102, session_id: 61001, role: 'assistant', content: '从他的 CSIRS 前测结果看，前庭觉调节（T=41 偏低）和执行功能（T=44 偏低）是两个主要薄弱点，「坐不住」与前庭觉寻求活动不足有关，「手部笨拙」则指向本体觉输入不足。建议做三个调整：\n\n1. **训练顺序**：把前庭类活动（秋千、旋转木马类）放在训练开头 10 分钟，满足感觉寻求后，后面精细任务的配合度会明显提升；\n2. **增加负重任务**：写作业前先做 3-5 分钟「推重物/螃蟹走」，本体觉输入能改善手部控制；\n3. **课堂即时策略**：允许他坐平衡气垫，用「身体动一动」的合法出口替代随意离座。\n\n按当前训练记录，他每周感统训练 3 次，建议维持频次、把上述调整落进本周计划，两周后用 CSIRS 复评观察 T 分变化。', tokens_total: 356, tokens_prompt: 618, tokens_completion: 356, est_cost_yuan: 0.002, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-08 10:22:00' },
  { id: 61103, session_id: 61001, role: 'user', content: '课堂上的平衡气垫会不会影响其他同学注意力？', tokens_total: 22, tokens_prompt: 0, tokens_completion: 22, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-08 10:28:00' },
  { id: 61104, session_id: 61001, role: 'assistant', content: '前期可能有短暂好奇，但一般 3-5 天后就会适应。有两个经验做法：一是提前用班会形式向全班说明「这是帮助注意力的小工具」，把特殊器械正常化；二是让赵雨泽参与气垫的充放气管理，赋予「责任人」角色反而减少他人围观。如果两周后仍有干扰，可以换成静音的坐垫式或改为课间集中训练。', tokens_total: 148, tokens_prompt: 986, tokens_completion: 148, est_cost_yuan: 0.001, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-08 10:32:00' },
  // 会话 61002：成长看得见 × 进步复盘
  { id: 61105, session_id: 61002, role: 'user', content: '帮我把赵雨泽上学期的训练进步总结一下，下周家长会要用。', tokens_total: 28, tokens_prompt: 0, tokens_completion: 28, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-10 15:05:00' },
  { id: 61106, session_id: 61002, role: 'assistant', content: '根据他的纵向评估数据，上学期（3-7 月）的进步可以概括为三条线：\n\n**感觉统合（CSIRS）**：总分 T 从 41 → 49，视听知觉与学业表现维度改善最明显（+11），课堂专注时长从约 8 分钟提升到 15 分钟以上；\n\n**认知推理（CRT）**：图形推理正确率从 42% 提升到 55%，跨过了「比较推理」这一关，抽象推理还在萌芽；\n\n**日常能力（WeeFIM）**：总分从 82 → 96，从「中度依赖」进入「轻度依赖」，最亮眼的是穿衣和进食两项已能独立完成。\n\n给家长的建议表述：不横向比较，用「他自己和 3 月比」的进步曲线讲，家长接受度更高。需要我把这份总结生成 Word 报告吗？', tokens_total: 412, tokens_prompt: 702, tokens_completion: 412, est_cost_yuan: 0.002, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-10 15:12:00' },
  { id: 61107, session_id: 61002, role: 'user', content: '好的，帮我生成一份 Word 版。', tokens_total: 16, tokens_prompt: 0, tokens_completion: 16, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-10 15:24:00' },
  { id: 61108, session_id: 61002, role: 'assistant', content: '已为你生成《赵雨泽-学期训练进步总结.docx》，包含评估对比表、三个维度的进步曲线图和家校配合建议，可直接用于家长会。生成报告已保存到下载目录。', tokens_total: 76, tokens_prompt: 1102, tokens_completion: 76, est_cost_yuan: 0.001, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-10 15:26:00' },
  // 会话 61003：沟通有方 × 言语训练
  { id: 61109, session_id: 61003, role: 'user', content: '沈依诺在家不肯开口说话，在学校却愿意跟读，家长很着急，怎么跟家长解释？', tokens_total: 40, tokens_prompt: 0, tokens_completion: 40, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-09 11:40:00' },
  { id: 61110, session_id: 61003, role: 'assistant', content: '这是言语障碍儿童很典型的「场景性缄默」表现——学校有同伴示范和结构化轮流机制，家庭对话则常常是「一对一追问」，压力反而更大。可以这样向家长解释：\n\n1. **先安抚**：「孩子在学校已经具备开口能力，说明语言基础在建立，这不是能力问题，是环境压力问题」；\n2. **给方法**：请家长把「问句」换成「选择句」——不说「你今天学了什么？」，而说「今天玩了滑梯还是秋千呀？」，降低开口的认知负担；\n3. **定小目标**：每天固定一个 5 分钟的「游戏对话时间」，只聊天不纠错，先积累「开口=愉快」的经验。\n\n两周后请家长记录孩子每天主动开口的次数，我们再一起看数据。', tokens_total: 386, tokens_prompt: 655, tokens_completion: 386, est_cost_yuan: 0.002, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-09 11:52:00' },
  { id: 61111, session_id: 61003, role: 'user', content: '明白了，选择句这个方法我会在家长群里再说明一次。', tokens_total: 25, tokens_prompt: 0, tokens_completion: 25, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-09 11:58:00' },
  // 会话 61004：心晴陪伴 × 情绪爆发
  { id: 61112, session_id: 61004, role: 'user', content: '王若曦这周在课堂上情绪爆发两次，哭闹超过 20 分钟，安抚无效，我该怎么办？', tokens_total: 38, tokens_prompt: 0, tokens_completion: 38, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-11 14:12:00' },
  { id: 61113, session_id: 61004, role: 'assistant', content: '先做记录分析：两次爆发分别发生在什么环节？如果都集中在「任务转换」或「被纠正」之后，就说明触发点在可控范围。当前阶段的处理原则：\n\n**爆发时**：不讲道理、不追问原因，撤掉围观（带离或疏散同学），提供低刺激安静角，等情绪曲线自然回落（通常 15-25 分钟）；\n\n**平静后**：不追究「刚才为什么哭」，改用选择式复盘「下次觉得心里着急，你想用卡片告诉老师，还是先去安静角？」；\n\n**预防面**：她的 CBCL 内化分偏高（焦虑倾向），建议在课表里加入可预期的「预告环节」——活动转换前 2 分钟给视觉提示卡，焦虑降低后爆发频率通常会先降一半。\n\n⚠️ 如果持续两周每天爆发且伴随自伤，请同步告知家长考虑专业心理支持转介。', tokens_total: 402, tokens_prompt: 690, tokens_completion: 402, est_cost_yuan: 0.002, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-11 14:28:00' },
  { id: 61114, session_id: 61004, role: 'user', content: '两次都是数学课的任务转换环节，我明天就开始用预告卡。', tokens_total: 28, tokens_prompt: 0, tokens_completion: 28, est_cost_yuan: 0, delivery_status: 'completed', message_kind: 'final', created_at: '2026-09-11 14:35:00' },
])

export const AI_STUDENT_MEMORIES = Object.freeze([
  // 学生 10019 赵雨泽（学习障碍，配会话 61001/61002）
  { id: 61301, student_id: 10019, user_id: 9001, created_by_type: 'ai', agent_code: 'special_ed_teacher', session_id: 61001, source_type: 'chat', category: 'observation', content: '课堂坐立不安与手部动作笨拙并存，前庭觉输入不足与本体觉寻求并存', confidence: 'assumed', status: 'confirmed', priority: 'normal', confirmed_by_user_id: 9001, confirmed_at: '2026-09-08 11:00:00', effective_at: '2026-09-08 10:22:00' },
  { id: 61302, student_id: 10019, user_id: 9001, created_by_type: 'teacher', agent_code: '', session_id: 61001, source_type: 'manual', category: 'advice_given', content: '训练课已加入开头 10 分钟前庭活动 + 写作业前负重任务，课堂试点平衡气垫', confidence: 'observed', status: 'confirmed', priority: 'pinned', priority_note: '训练方案调整决定，需两周后复评验证', confirmed_by_user_id: 9001, confirmed_at: '2026-09-08 11:01:00', effective_at: '2026-09-08 11:00:00' },
  { id: 61303, student_id: 10019, user_id: 9001, created_by_type: 'ai', agent_code: 'scgp_builtin_growth_observer', session_id: 61002, source_type: 'chat', category: 'follow_up', content: '上学期三线进步（CSIRS T41→49 / CRT 42%→55% / WeeFIM 82→96），家长会已做进步复盘', confidence: 'observed', status: 'confirmed', priority: 'normal', confirmed_by_user_id: 9001, confirmed_at: '2026-09-10 16:00:00', effective_at: '2026-09-10 15:12:00' },
  { id: 61304, student_id: 10019, user_id: 9001, created_by_type: 'ai', agent_code: 'special_ed_teacher', session_id: 61001, source_type: 'chat', category: 'follow_up', content: '计划两周后用 CSIRS 复评验证训练调整效果，观察前庭觉与执行功能 T 分变化', confidence: 'observed', status: 'confirmed', priority: 'normal', confirmed_by_user_id: 9001, confirmed_at: '2026-09-08 11:02:00', effective_at: '2026-09-08 10:32:00' },
  // 学生 10016 沈依诺（言语障碍，配会话 61003）
  { id: 61305, student_id: 10016, user_id: 9002, created_by_type: 'ai', agent_code: 'scgp_builtin_communication_support', session_id: 61003, source_type: 'chat', category: 'observation', content: '典型的场景性缄默表现：在校能跟读、在家拒绝开口，提示环境压力型而非能力型', confidence: 'assumed', status: 'confirmed', priority: 'normal', confirmed_by_user_id: 9002, confirmed_at: '2026-09-09 12:30:00', effective_at: '2026-09-09 11:52:00' },
  { id: 61306, student_id: 10016, user_id: 9002, created_by_type: 'teacher', agent_code: '', session_id: 61003, source_type: 'manual', category: 'advice_given', content: '已指导家长改用选择句提问 + 每天 5 分钟游戏对话时间，两周后统计主动开口次数', confidence: 'observed', status: 'confirmed', priority: 'normal', confirmed_by_user_id: 9002, confirmed_at: '2026-09-09 12:31:00', effective_at: '2026-09-09 12:00:00' },
  // 学生 10023 王若曦（孤独症谱系，配会话 61004）
  { id: 61307, student_id: 10023, user_id: 9003, created_by_type: 'ai', agent_code: 'scgp_builtin_wellbeing_support', session_id: 61004, source_type: 'chat', category: 'observation', content: '情绪爆发集中出现在任务转换环节（本周 2 次，均超 20 分钟），触发点可预期', confidence: 'observed', status: 'confirmed', priority: 'safety_critical', priority_note: '涉及课堂情绪安全，需持续追踪爆发频率', confirmed_by_user_id: 9003, confirmed_at: '2026-09-11 15:00:00', effective_at: '2026-09-11 14:28:00' },
  { id: 61308, student_id: 10023, user_id: 9003, created_by_type: 'teacher', agent_code: '', session_id: 61004, source_type: 'manual', category: 'advice_given', content: '数学课任务转换前 2 分钟使用视觉预告卡，平静后用选择式复盘替代追问', confidence: 'observed', status: 'confirmed', priority: 'pinned', priority_note: '若两周后无改善需启动转介评估', confirmed_by_user_id: 9003, confirmed_at: '2026-09-11 15:01:00', effective_at: '2026-09-11 15:00:00' },
])
