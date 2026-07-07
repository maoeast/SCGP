import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** 提示等级数字 → 中文 label，与 EquipmentRecordsPanel.getPromptLevelMeta 保持一致 */
function getPromptLevelLabel(level: number | null | undefined): string {
  const safeLevel = Number(level || 0)
  if (safeLevel <= 1) return '完全独立'
  if (safeLevel <= 3) return '语言提示'
  return '身体协助'
}

/** 复刻各面板内 formatDateTimeToMinute，避免循环依赖 */
function formatDateTimeToMinute(value: number | string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-'

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' ? value : '-'
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

/** 当前日期 YYYYMMDD，用于文件名后缀 */
function buildDateStamp(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

function writeWorkbook(rows: any[], sheetName: string, fileName: string): boolean {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], { type: EXCEL_MIME })
  saveAs(blob, fileName)
  return true
}

/** 导出游戏训练记录为 Excel */
export function exportGameRecordsExcel(records: any[], studentName: string): boolean {
  if (!records?.length) return false

  const safeStudentName = studentName || ''
  try {
    const rows = records.map((record: any) => ({
      学生: record.student_name || safeStudentName || '未知',
      任务名: record.task_name || '',
      模块: record.module_code || '',
      日期: formatDateTimeToMinute(record.timestamp),
      '时长(秒)': Math.round(Number(record.duration || 0) / 1000),
      '准确率(%)': Number((Number(record.accuracy_rate || 0) * 100).toFixed(1)),
      '平均反应时(ms)': Number(record.avg_response_time || 0),
    }))

    const stamp = buildDateStamp()
    return writeWorkbook(rows, '游戏训练记录', `训练记录-游戏-${safeStudentName || '全部'}-${stamp}.xlsx`)
  } catch (error) {
    console.error('导出游戏训练记录失败:', error)
    throw error
  }
}

/** 导出器材训练记录为 Excel */
export function exportEquipmentRecordsExcel(records: any[], studentName: string): boolean {
  if (!records?.length) return false

  const safeStudentName = studentName || ''
  try {
    const rows = records.map((record: any) => ({
      学生: record.student_name || safeStudentName || '未知',
      器材: record.equipment_name || '',
      分类: record.category || '',
      训练日期: formatDateTimeToMinute(record.training_date),
      得分: Number(record.score || 0),
      提示等级: getPromptLevelLabel(record.prompt_level),
      '时长(秒)': Number(record.duration_seconds || 0),
      备注: record.notes || '',
      'AI评语': record.generated_comment || '',
    }))

    const stamp = buildDateStamp()
    return writeWorkbook(rows, '器材训练记录', `训练记录-器材-${safeStudentName || '全部'}-${stamp}.xlsx`)
  } catch (error) {
    console.error('导出器材训练记录失败:', error)
    throw error
  }
}
