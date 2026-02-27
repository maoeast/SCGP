/**
 * 统一的评估报告导出模块
 *
 * 功能：
 * - 统一各种评估报告的导出入口
 * - 支持PDF和Word格式导出
 * - 自动处理图表转换
 * - 提供一致的导出体验
 */

import { exportToPDFSimple } from './printHelper'
import { exportToWord } from './exportUtils'

/**
 * 报告类型枚举
 */
export enum ReportType {
  SM = 'sm',
  WEEFIM = 'weefim',
  TRAINING = 'training'
}

/**
 * 导出格式枚举
 */
export enum ExportFormat {
  PDF = 'pdf',
  WORD = 'word'
}

/**
 * 导出配置选项
 */
export interface ExportOptions {
  elementId: string        // 报告容器的DOM元素ID
  filename: string         // 导出文件名（不含扩展名）
  reportType: ReportType   // 报告类型
  format: ExportFormat     // 导出格式
  reportData?: any         // 报告数据（用于Word导出）
}

/**
 * 统一的评估报告导出函数
 *
 * @param options 导出配置选项
 * @returns Promise<void>
 *
 * @example
 * ```typescript
 * // 导出PDF
 * await exportAssessmentReport({
 *   elementId: 'report-content',
 *   filename: 'S-M量表评估报告_张三_2024-12-25',
 *   reportType: ReportType.SM,
 *   format: ExportFormat.PDF
 * })
 *
 * // 导出Word
 * await exportAssessmentReport({
 *   elementId: 'report-content',
 *   filename: 'S-M量表评估报告_张三_2024-12-25',
 *   reportType: ReportType.SM,
 *   format: ExportFormat.WORD,
 *   reportData: reportData
 * })
 * ```
 */
export async function exportAssessmentReport(options: ExportOptions): Promise<void> {
  const { elementId, filename, reportType, format, reportData } = options

  try {
    // 验证必要参数
    if (!elementId || !filename) {
      throw new Error('缺少必要参数：elementId 和 filename 是必需的')
    }

    // 验证报告容器是否存在
    const reportElement = document.getElementById(elementId)
    if (!reportElement) {
      throw new Error(`找不到报告容器元素：${elementId}`)
    }

    // 根据格式选择导出方法
    switch (format) {
      case ExportFormat.PDF:
        // 统一使用 printHelper 的方案（保留雷达图）
        await exportToPDFSimple(elementId, filename)
        break

      case ExportFormat.WORD:
        // Word导出需要报告数据
        if (!reportData) {
          throw new Error('Word导出需要提供 reportData 参数')
        }
        await exportToWord(reportType, reportData, filename)
        break

      default:
        throw new Error(`不支持的导出格式: ${format}`)
    }
  } catch (error) {
    console.error('报告导出失败:', error)
    throw error
  }
}

/**
 * 快捷函数：导出PDF
 */
export async function exportReportToPDF(
  elementId: string,
  filename: string,
  reportType: ReportType
): Promise<void> {
  return exportAssessmentReport({
    elementId,
    filename,
    reportType,
    format: ExportFormat.PDF
  })
}

/**
 * 快捷函数：导出Word
 */
export async function exportReportToWord(
  elementId: string,
  filename: string,
  reportType: ReportType,
  reportData: any
): Promise<void> {
  return exportAssessmentReport({
    elementId,
    filename,
    reportType,
    format: ExportFormat.WORD,
    reportData
  })
}

/**
 * 获取报告类型的显示名称
 */
export function getReportTypeName(reportType: ReportType): string {
  const nameMap: Record<ReportType, string> = {
    [ReportType.SM]: 'S-M量表评估报告',
    [ReportType.WEEFIM]: 'WeeFIM量表评估报告',
    [ReportType.TRAINING]: '训练报告'
  }
  return nameMap[reportType] || '未知报告类型'
}

/**
 * 生成默认文件名
 */
export function generateReportFilename(
  reportType: ReportType,
  studentName: string,
  date?: Date
): string {
  const reportName = getReportTypeName(reportType)
  const dateStr = date ? date.toLocaleDateString('zh-CN') : new Date().toLocaleDateString('zh-CN')
  return `${reportName}_${studentName}_${dateStr}`
}

/**
 * 导出所有可用函数
 */
export default {
  exportAssessmentReport,
  exportReportToPDF,
  exportReportToWord,
  getReportTypeName,
  generateReportFilename
}
