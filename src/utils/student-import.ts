/**
 * 学生 Excel 导入解析与校验
 *
 * 模板列（2026-09-20 扩展）：姓名* / 性别* / 出生日期* / 学号 / 诊断类型 /
 * 监护人姓名 / 与学生关系 / 监护人电话 / 健康备注 / 学籍号（后 5 列选填）
 * 校验从宽：新列不做格式强校验（电话/学籍号仅 trim），录入界面有占位口径
 */
import * as XLSX from 'xlsx'

export interface StudentImportRow {
  sourceRow: number
  name: unknown
  gender: unknown
  birthday: unknown
  studentNo: unknown
  disorder: unknown
  guardianName: unknown
  guardianRelation: unknown
  guardianPhone: unknown
  healthNotes: unknown
  registryNo: unknown
}

export interface StudentImportInput {
  name: string
  gender: '男' | '女'
  birthday: string
  student_no: string
  disorder: string
  guardian_name: string
  guardian_relation: string
  guardian_phone: string
  health_notes: string
  registry_no: string
}

export interface StudentImportValidationResult {
  input?: StudentImportInput
  error?: string
}

const STUDENT_IMPORT_COLUMNS = {
  name: ['姓名*', '姓名'],
  gender: ['性别*', '性别'],
  birthday: ['出生日期*', '出生日期'],
  studentNo: ['学号'],
  disorder: ['诊断类型'],
  guardianName: ['监护人姓名'],
  guardianRelation: ['与学生关系', '监护人关系'],
  guardianPhone: ['监护人电话'],
  healthNotes: ['健康备注'],
  registryNo: ['学籍号'],
} as const

const REQUIRED_COLUMNS = ['name', 'gender', 'birthday'] as const

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/^\uFEFF/, '').replace(/\s+/g, '').trim()
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim()
}

function isBlankRow(row: StudentImportRow): boolean {
  return [row.name, row.gender, row.birthday, row.studentNo, row.disorder,
          row.guardianName, row.guardianRelation, row.guardianPhone, row.healthNotes, row.registryNo]
    .every(value => normalizeText(value) === '')
}

function formatBirthday(year: number, month: number, day: number): string | null {
  const birthday = new Date(year, month - 1, day)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (
    birthday.getFullYear() !== year
    || birthday.getMonth() !== month - 1
    || birthday.getDate() !== day
    || birthday > today
  ) {
    return null
  }

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function normalizeBirthday(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatBirthday(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return formatBirthday(parsed.y, parsed.m, parsed.d)
    }
  }

  const normalized = normalizeText(value)
    .replace(/[./]/g, '-')
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (!match) return null

  return formatBirthday(Number(match[1]), Number(match[2]), Number(match[3]))
}

function getColumnIndex(headers: unknown[], aliases: readonly string[]): number {
  return headers.findIndex(header => aliases.some(alias => alias === normalizeHeader(header)))
}

function getMissingRequiredColumns(headers: unknown[]): string[] {
  return REQUIRED_COLUMNS
    .filter(column => getColumnIndex(headers, STUDENT_IMPORT_COLUMNS[column]) === -1)
    .map(column => STUDENT_IMPORT_COLUMNS[column][0])
}

export function readStudentImportWorkbook(buffer: ArrayBuffer): StudentImportRow[] {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheetName = workbook.SheetNames[0]
  if (!firstSheetName) {
    throw new Error('Excel 文件中没有可导入的工作表')
  }

  const worksheet = workbook.Sheets[firstSheetName]
  if (!worksheet) {
    throw new Error('无法读取 Excel 工作表')
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: '',
    raw: true,
  })
  const headers = rows[0] || []
  const missingColumns = getMissingRequiredColumns(headers)
  if (missingColumns.length > 0) {
    throw new Error(`Excel 缺少必填列：${missingColumns.join('、')}`)
  }

  const columnIndexes = {
    name: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.name),
    gender: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.gender),
    birthday: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.birthday),
    studentNo: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.studentNo),
    disorder: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.disorder),
    guardianName: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.guardianName),
    guardianRelation: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.guardianRelation),
    guardianPhone: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.guardianPhone),
    healthNotes: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.healthNotes),
    registryNo: getColumnIndex(headers, STUDENT_IMPORT_COLUMNS.registryNo),
  }

  return rows.slice(1)
    .map((row, index) => ({
      sourceRow: index + 2,
      name: columnIndexes.name >= 0 ? row[columnIndexes.name] : '',
      gender: columnIndexes.gender >= 0 ? row[columnIndexes.gender] : '',
      birthday: columnIndexes.birthday >= 0 ? row[columnIndexes.birthday] : '',
      studentNo: columnIndexes.studentNo >= 0 ? row[columnIndexes.studentNo] : '',
      disorder: columnIndexes.disorder >= 0 ? row[columnIndexes.disorder] : '',
      guardianName: columnIndexes.guardianName >= 0 ? row[columnIndexes.guardianName] : '',
      guardianRelation: columnIndexes.guardianRelation >= 0 ? row[columnIndexes.guardianRelation] : '',
      guardianPhone: columnIndexes.guardianPhone >= 0 ? row[columnIndexes.guardianPhone] : '',
      healthNotes: columnIndexes.healthNotes >= 0 ? row[columnIndexes.healthNotes] : '',
      registryNo: columnIndexes.registryNo >= 0 ? row[columnIndexes.registryNo] : '',
    }))
    .filter(row => !isBlankRow(row))
}

export function validateStudentImportRow(
  row: StudentImportRow,
  reservedStudentNos: Set<string>,
  generateStudentNo: (sourceRow: number) => string,
): StudentImportValidationResult {
  const errors: string[] = []
  const name = normalizeText(row.name)
  const gender = normalizeText(row.gender)
  const birthday = normalizeBirthday(row.birthday)
  let studentNo = normalizeText(row.studentNo)

  if (!name) errors.push('姓名不能为空')
  if (gender !== '男' && gender !== '女') errors.push('性别只能填写“男”或“女”')
  if (!birthday) errors.push('出生日期无效或晚于今天')

  if (!studentNo) {
    studentNo = generateStudentNo(row.sourceRow)
  } else if (reservedStudentNos.has(studentNo)) {
    errors.push('学号已存在或与导入文件其他行重复')
  }

  if (errors.length > 0 || !birthday || (gender !== '男' && gender !== '女')) {
    return { error: errors.join('；') }
  }

  reservedStudentNos.add(studentNo)
  return {
    input: {
      name,
      gender,
      birthday,
      student_no: studentNo,
      disorder: normalizeText(row.disorder),
      // 监护人/健康备注/学籍号：选填、从宽校验（仅 trim），格式口径由录入界面占位提示约束
      guardian_name: normalizeText(row.guardianName),
      guardian_relation: normalizeText(row.guardianRelation),
      guardian_phone: normalizeText(row.guardianPhone),
      health_notes: normalizeText(row.healthNotes),
      registry_no: normalizeText(row.registryNo),
    },
  }
}

export function getStudentImportWriteError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || '')

  if (message.includes('UNIQUE constraint failed: student.student_no')) {
    return '学号已存在'
  }
  if (message.includes('CHECK constraint failed')) {
    return '性别不符合写入约束'
  }
  if (message.includes('NOT NULL constraint failed')) {
    return '必填字段缺失'
  }

  return message || '写入失败，请重试'
}
