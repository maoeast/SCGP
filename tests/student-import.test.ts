import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'

import {
  getStudentImportWriteError,
  readStudentImportWorkbook,
  validateStudentImportRow,
} from '../src/utils/student-import.ts'

function createWorkbookBuffer(rows: unknown[][]): ArrayBuffer {
  const worksheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '学生导入模板')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

// ===== 基线用例：5 列最小表头（选填列全部缺省 → 按空处理）=====
const parsedRows = readStudentImportWorkbook(createWorkbookBuffer([
  ['姓名*', '性别*', '出生日期*', '学号', '诊断类型'],
  [' 张三 ', '男', '2015/1/2', 'S001', '视力障碍'],
  ['', '', '', '', ''],
  ['李四', '女', '2016年5月15日', '', ''],
]))

assert.equal(parsedRows.length, 2, '应忽略完全空白的行')
assert.equal(parsedRows[0]?.sourceRow, 2)
assert.equal(parsedRows[1]?.sourceRow, 4)

const reservedStudentNos = new Set(['EXISTING'])
const firstValidation = validateStudentImportRow(
  parsedRows[0]!,
  reservedStudentNos,
  sourceRow => `AUTO-${sourceRow}`,
)
assert.deepEqual(firstValidation.input, {
  name: '张三',
  gender: '男',
  birthday: '2015-01-02',
  student_no: 'S001',
  disorder: '视力障碍',
  guardian_name: '',
  guardian_relation: '',
  guardian_phone: '',
  health_notes: '',
  care_instructions: '',
  registry_no: '',
})

const secondValidation = validateStudentImportRow(
  parsedRows[1]!,
  reservedStudentNos,
  sourceRow => `AUTO-${sourceRow}`,
)
assert.deepEqual(secondValidation.input, {
  name: '李四',
  gender: '女',
  birthday: '2016-05-15',
  student_no: 'AUTO-4',
  disorder: '',
  guardian_name: '',
  guardian_relation: '',
  guardian_phone: '',
  health_notes: '',
  care_instructions: '',
  registry_no: '',
})

// ===== T24 新模板：医学状态 + 照护要求 列透传 =====
const t24Rows = readStudentImportWorkbook(createWorkbookBuffer([
  ['姓名*', '性别*', '出生日期*', '学号', '诊断类型', '监护人姓名', '与学生关系', '监护人电话', '医学状态', '照护要求', '学籍号'],
  ['王五', '男', '2014-03-01', 'T24001', '发育迟缓', '王大明', '父亲', '13800000001', '对粉尘过敏', '避免剧烈运动', ''],
  ['赵六', '女', '2015-07-20', '', '', '', '', '', '', '', ''],
]))

assert.equal(t24Rows.length, 2, 'T24 新模板应解析出 2 行')
assert.equal(t24Rows[0]?.healthNotes, '对粉尘过敏', '新表头「医学状态」应映射 healthNotes')
assert.equal(t24Rows[0]?.careInstructions, '避免剧烈运动', '新表头「照护要求」应映射 careInstructions')

const t24First = validateStudentImportRow(t24Rows[0]!, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.deepEqual(t24First.input, {
  name: '王五',
  gender: '男',
  birthday: '2014-03-01',
  student_no: 'T24001',
  disorder: '发育迟缓',
  guardian_name: '王大明',
  guardian_relation: '父亲',
  guardian_phone: '13800000001',
  health_notes: '对粉尘过敏',
  care_instructions: '避免剧烈运动',
  registry_no: '',
})
assert.equal(t24First.input?.care_instructions, '避免剧烈运动', '照护要求值应透传')

const t24Second = validateStudentImportRow(t24Rows[1]!, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.equal(t24Second.input?.health_notes, '', '医学状态留空按空处理')
assert.equal(t24Second.input?.care_instructions, '', '照护要求留空按空处理')

// ===== 旧模板兼容：健康备注表头 → health_notes；缺照护要求列 → 按空处理 =====
const legacyRows = readStudentImportWorkbook(createWorkbookBuffer([
  ['姓名*', '性别*', '出生日期*', '学号', '诊断类型', '监护人姓名', '与学生关系', '监护人电话', '健康备注', '学籍号'],
  ['钱七', '男', '2013-11-05', 'OLD001', '智力障碍', '钱母', '母亲', '13900000001', '哮喘史，需备药', 'G123'],
]))

assert.equal(legacyRows.length, 1)
assert.equal(legacyRows[0]?.healthNotes, '哮喘史，需备药', '旧表头「健康备注」应按医学状态解析')
assert.equal(legacyRows[0]?.careInstructions, '', '旧文件缺「照护要求」列按空处理')

const legacyValidation = validateStudentImportRow(legacyRows[0]!, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.equal(legacyValidation.input?.health_notes, '哮喘史，需备药')
assert.equal(legacyValidation.input?.care_instructions, '')

// ===== 校验失败与错误映射（原有用例保持）=====
const duplicateValidation = validateStudentImportRow({
  sourceRow: 5,
  name: '孙八',
  gender: '男',
  birthday: '2014-03-01',
  studentNo: 'S001',
  disorder: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  healthNotes: '',
  careInstructions: '',
  registryNo: '',
}, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.match(duplicateValidation.error || '', /学号已存在/)

const invalidValidation = validateStudentImportRow({
  sourceRow: 6,
  name: '',
  gender: '未知',
  birthday: '2026-02-30',
  studentNo: '',
  disorder: '',
  guardianName: '',
  guardianRelation: '',
  guardianPhone: '',
  healthNotes: '',
  careInstructions: '',
  registryNo: '',
}, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.match(invalidValidation.error || '', /姓名不能为空/)
assert.match(invalidValidation.error || '', /性别只能填写/)
assert.match(invalidValidation.error || '', /出生日期无效/)

assert.throws(
  () => readStudentImportWorkbook(createWorkbookBuffer([['姓名*', '性别*'], ['张三', '男']])),
  /缺少必填列：出生日期\*/,
)

assert.equal(
  getStudentImportWriteError(new Error('UNIQUE constraint failed: student.student_no')),
  '学号已存在',
)

console.log('student-import test passed')
