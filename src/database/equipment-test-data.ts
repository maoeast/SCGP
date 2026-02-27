/**
 * 器材训练模块测试数据生成器
 * 用于生成演示数据、测试数据
 */

import type { EquipmentCatalog, EquipmentCategory } from '@/types/equipment'

/**
 * 随机中文姓名生成
 */
const CHINESE_SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周']
const CHINESE_NAMES = ['明', '华', '强', '芳', '娜', '敏', '静', '丽', '军', '杰', '伟', '勇', '艳', '涛', '磊']

function randomChineseName(): string {
  const surname = CHINESE_SURNAMES[Math.floor(Math.random() * CHINESE_SURNAMES.length)]
  const name = CHINESE_NAMES[Math.floor(Math.random() * CHINESE_NAMES.length)]
  return surname + name
}

/**
 * 随机性别
 */
function randomGender(): '男' | '女' {
  return Math.random() > 0.5 ? '男' : '女'
}

/**
 * 随机年龄（3-12岁）
 */
function randomAge(): number {
  return Math.floor(Math.random() * 10) + 3
}

/**
 * 随机生日（基于年龄）
 */
function randomBirthday(age: number): string {
  const today = new Date()
  const year = today.getFullYear() - age
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 随机诊断信息
 */
const DISORDERS = [
  '自闭症谱系障碍',
  '注意力缺陷多动障碍',
  '发育协调障碍',
  '感觉统合失调',
  '语言发育迟缓',
  '学习障碍',
  ''
]

function randomDisorder(): string {
  return DISORDERS[Math.floor(Math.random() * DISORDERS.length)]
}

/**
 * 生成测试学生数据
 */
export function generateTestStudent(count: number = 1) {
  const students = []
  for (let i = 0; i < count; i++) {
    const age = randomAge()
    students.push({
      name: randomChineseName(),
      gender: randomGender(),
      birthday: randomBirthday(age),
      student_no: `TEST${String(Date.now() + i).slice(-6)}`,
      disorder: randomDisorder(),
      avatar_path: null
    })
  }
  return students
}

/**
 * 随机训练评分 (1-5)
 */
function randomScore(): number {
  // 倾向于生成中等偏上的分数
  const rand = Math.random()
  if (rand < 0.2) return Math.floor(Math.random() * 2) + 1 // 20% 1-2分
  if (rand < 0.5) return Math.floor(Math.random() * 2) + 2 // 30% 2-3分
  if (rand < 0.8) return Math.floor(Math.random() * 2) + 3 // 30% 3-4分
  return 5 // 20% 5分
}

/**
 * 随机辅助等级
 */
function randomPromptLevel(): 1 | 2 | 3 | 4 | 5 {
  const rand = Math.random()
  if (rand < 0.15) return 1 // 15% 独立
  if (rand < 0.35) return 2 // 20% 口头
  if (rand < 0.60) return 3 // 25% 视觉
  if (rand < 0.85) return 4 // 25% 手触
  return 5 // 15% 身体
}

/**
 * 随机训练时长（秒）
 */
function randomDuration(): number {
  return Math.floor(Math.random() * 1200) + 300 // 5-25分钟
}

/**
 * 随机训练备注
 */
const TRAINING_NOTES = [
  '学生表现积极，配合度良好',
  '需要额外提示才能完成任务',
  '注意力集中时间较短，需要分段训练',
  '对触觉刺激反应敏感，逐步增加强度',
  '视觉追踪能力有进步',
  '听觉指令理解能力提升',
  '本体觉感知需要更多引导',
  '整体表现稳定，继续保持',
  '情绪状态良好，训练顺利',
  '疲劳度较高，建议缩短单次训练时间',
  ''
]

function randomNotes(): string | undefined {
  const note = TRAINING_NOTES[Math.floor(Math.random() * TRAINING_NOTES.length)]
  return note || undefined
}

/**
 * 随机日期（最近30天内）
 */
function randomRecentDate(): string {
  const now = new Date()
  const daysAgo = Math.floor(Math.random() * 30)
  const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return date.toISOString()
}

/**
 * 为学生生成器材训练记录
 * @param studentId 学生ID
 * @param equipmentList 器材列表
 * @param count 记录数量
 * @param categories 指定分类（可选）
 */
export function generateEquipmentTrainingRecords(
  studentId: number,
  equipmentList: EquipmentCatalog[],
  count: number = 10,
  categories?: EquipmentCategory[]
) {
  // 过滤器材
  let availableEquipment = equipmentList
  if (categories && categories.length > 0) {
    availableEquipment = equipmentList.filter(e => categories.includes(e.category))
  }

  if (availableEquipment.length === 0) {
    console.warn('没有可用的器材生成训练记录')
    return []
  }

  const records = []
  for (let i = 0; i < count; i++) {
    const equipment = availableEquipment[Math.floor(Math.random() * availableEquipment.length)]
    records.push({
      student_id: studentId,
      equipment_id: equipment.id,
      score: randomScore(),
      prompt_level: randomPromptLevel(),
      duration_seconds: randomDuration(),
      notes: randomNotes(),
      training_date: randomRecentDate(),
      teacher_name: '测试老师'
    })
  }
  return records
}

/**
 * 生成完整的测试数据（学生+训练记录）
 * @param studentCount 学生数量
 * @param recordsPerStudent 每个学生的训练记录数量
 * @param equipmentList 器材列表
 */
export function generateCompleteTestData(
  studentCount: number = 5,
  recordsPerStudent: number = 10,
  equipmentList: EquipmentCatalog[]
) {
  const students = generateTestStudent(studentCount)
  const allRecords = []

  students.forEach(student => {
    const records = generateEquipmentTrainingRecords(
      0, // 临时ID，插入后会自动生成
      equipmentList,
      recordsPerStudent
    )
    allRecords.push({
      student,
      records
    })
  })

  return allRecords
}

/**
 * 打印测试数据摘要
 */
export function printTestDataSummary(data: ReturnType<typeof generateCompleteTestData>) {
  console.log('\n========== 测试数据摘要 ==========')
  console.log(`学生数量: ${data.length}`)

  let totalRecords = 0
  const categoryCount: Record<string, number> = {}

  data.forEach(({ student, records }) => {
    totalRecords += records.length
    console.log(`\n学生: ${student.name} (${student.gender}, ${student.disorder || '无诊断'})`)
    console.log(`  训练记录: ${records.length}条`)

    records.forEach(r => {
      const equipment = equipmentList.find(e => e.id === r.equipment_id)
      if (equipment) {
        categoryCount[equipment.category] = (categoryCount[equipment.category] || 0) + 1
      }
    })
  })

  console.log(`\n总计训练记录: ${totalRecords}条`)
  console.log('\n分类统计:')
  Object.entries(categoryCount).forEach(([cat, count]) => {
    console.log(`  ${cat}: ${count}条`)
  })
  console.log('================================\n')
}

// 用于测试的器材列表（从 equipment-data 导入）
import { EQUIPMENT_DATA } from './equipment-data'
const equipmentList: EquipmentCatalog[] = EQUIPMENT_DATA

/**
 * 导出测试数据到数据库（供外部调用）
 */
export async function seedEquipmentTestData(
  studentCount: number = 5,
  recordsPerStudent: number = 10
) {
  // 这里需要实际的数据库API调用
  // 实际使用时需要传入 StudentAPI 和 EquipmentTrainingAPI 实例
  console.log('生成器材训练测试数据...')
  const testData = generateCompleteTestData(studentCount, recordsPerStudent, equipmentList)
  printTestDataSummary(testData)
  return testData
}

