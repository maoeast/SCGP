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
})

const duplicateValidation = validateStudentImportRow({
  sourceRow: 5,
  name: '王五',
  gender: '男',
  birthday: '2014-03-01',
  studentNo: 'S001',
  disorder: '',
}, reservedStudentNos, sourceRow => `AUTO-${sourceRow}`)
assert.match(duplicateValidation.error || '', /学号已存在/)

const invalidValidation = validateStudentImportRow({
  sourceRow: 6,
  name: '',
  gender: '未知',
  birthday: '2026-02-30',
  studentNo: '',
  disorder: '',
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
