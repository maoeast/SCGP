/**
 * 评估质量追踪统计 API（Phase 2 管理看板专用）
 *
 * 只读聚合 17 张 *_assess 表的 total_duration / avg_response_time / quality_note：
 * - 汇总：各量表评估总数、有质量数据记录数、very_fast/fast/suspicious 计数与占比
 * - 明细钻取：疑似记录清单（学生、日期、用时、平均每题、quality_note），可跳报告页
 *
 * 设计约束：
 * - 纯只读（SELECT），不写任何表——宽松质控原则，看板是质量数据唯一出口
 * - quality_note 值域：'very_fast'(<3s/题) | 'fast'(<5s/题) | 'suspicious'（Phase 3 追加，
 *   标记组合形态如 'very_fast+suspicious'）| NULL（正常或旧记录）
 * - 表名清单硬编码（17 张表与 catalog 同源），不走外部输入拼接，无注入面
 */

import { DatabaseAPI } from './api'

/** 疑似标记（Phase 3 随机作答模式检测写入，值可与其他标记组合，含 '+' 分隔） */
export const SUSPICIOUS_MARKER = 'suspicious'

/** quality_note 中是否含疑似标记（兼容 'suspicious' / 'very_fast+suspicious' 等组合） */
export function isSuspiciousNote(note: string | null | undefined): boolean {
  if (!note) return false
  return note.split('+').includes(SUSPICIOUS_MARKER)
}

/** 17 张量表主表 → catalog 量表码（表名 = `${code}_assess`，个别历史不一致单列） */
const QUALITY_TABLES: ReadonlyArray<{ table: string; code: string }> = [
  { table: 'sm_assess', code: 'sm' },
  { table: 'weefim_assess', code: 'weefim' },
  { table: 'csirs_assess', code: 'csirs' },
  { table: 'conners_psq_assess', code: 'conners-psq' },
  { table: 'conners_trs_assess', code: 'conners-trs' },
  { table: 'sdq_assess', code: 'sdq' },
  { table: 'srs2_assess', code: 'srs2' },
  { table: 'cbcl_assess', code: 'cbcl' },
  { table: 'cnbsr2016_assess', code: 'cnbsr2016' },
  { table: 'fine_motor_assess', code: 'fine_motor' },
  { table: 'gmfm_88_assess', code: 'gmfm_88' },
  { table: 'tgmd_3_assess', code: 'tgmd_3' },
  { table: 'brief_assess', code: 'brief' },
  { table: 'crt_assess', code: 'crt' },
  { table: 'cognitive_self_assess', code: 'cognitive_self' },
  { table: 'abc_assess', code: 'abc' },
  { table: 'atec_assess', code: 'atec' },
]

/** 单量表质量汇总 */
export interface ScaleQualitySummary {
  scaleCode: string
  tableName: string
  /** 评估总次数 */
  total: number
  /** 有质量数据（total_duration 非空）的记录数 */
  tracked: number
  veryFast: number
  fast: number
  suspicious: number
  /** tracked>0 时：平均总用时（秒） */
  avgTotalDuration: number | null
  /** tracked>0 时：平均每题用时（秒）均值 */
  avgResponseTimeMean: number | null
}

/** 疑似记录明细行 */
export interface QualityFlagRow {
  assessId: number
  scaleCode: string
  tableName: string
  studentId: number
  studentName: string
  /** 评估开始时间（ISO） */
  startTime: string
  totalDuration: number | null
  avgResponseTime: number | null
  qualityNote: string | null
}

export class AssessmentQualityAPI extends DatabaseAPI {
  /**
   * 17 张表逐一聚合（表结构一致但表名不同，SQL 端 UNION 不可维护，应用层循环聚合）。
   * 单表聚合行数 = 表内记录数，量级为百~千级，性能无压力。
   */
  getQualitySummary(): ScaleQualitySummary[] {
    return QUALITY_TABLES.map(({ table, code }) => {
      const row = this.queryOne(`
        SELECT
          COUNT(*)                                                AS total,
          SUM(CASE WHEN total_duration IS NOT NULL THEN 1 ELSE 0 END) AS tracked,
          SUM(CASE WHEN quality_note LIKE '%very_fast%' THEN 1 ELSE 0 END) AS very_fast,
          SUM(CASE WHEN quality_note LIKE '%fast%' AND quality_note NOT LIKE '%very_fast%' THEN 1 ELSE 0 END) AS fast,
          SUM(CASE WHEN quality_note LIKE '%${SUSPICIOUS_MARKER}%' THEN 1 ELSE 0 END) AS suspicious,
          AVG(CASE WHEN total_duration IS NOT NULL THEN total_duration END) AS avg_total_duration,
          AVG(CASE WHEN avg_response_time IS NOT NULL THEN avg_response_time END) AS avg_rt_mean
        FROM ${table}
      `) as Record<string, number | null> | null

      return {
        scaleCode: code,
        tableName: table,
        total: row?.total ?? 0,
        tracked: row?.tracked ?? 0,
        veryFast: row?.very_fast ?? 0,
        fast: row?.fast ?? 0,
        suspicious: row?.suspicious ?? 0,
        avgTotalDuration: row?.avg_total_duration ?? null,
        avgResponseTimeMean: row?.avg_rt_mean ?? null,
      }
    })
  }

  /**
   * 疑似记录明细（含 quality_note 非空的记录，按开始时间倒序）。
   * 逐表查询后应用层合并排序，取前 limit 条。
   */
  getQualityFlags(limit = 100): QualityFlagRow[] {
    const rows: QualityFlagRow[] = []
    for (const { table, code } of QUALITY_TABLES) {
      const list = this.query(`
        SELECT
          a.id,
          a.student_id,
          s.name AS student_name,
          a.start_time,
          a.total_duration,
          a.avg_response_time,
          a.quality_note
        FROM ${table} a
        LEFT JOIN student s ON s.id = a.student_id
        WHERE a.quality_note IS NOT NULL
        ORDER BY a.start_time DESC
        LIMIT 50
      `) as any[]
      for (const r of list) {
        rows.push({
          assessId: r.id,
          scaleCode: code,
          tableName: table,
          studentId: r.student_id,
          studentName: r.student_name ?? '（已删除学生）',
          startTime: r.start_time,
          totalDuration: r.total_duration,
          avgResponseTime: r.avg_response_time,
          qualityNote: r.quality_note,
        })
      }
    }
    rows.sort((x, y) => (x.startTime < y.startTime ? 1 : -1))
    return rows.slice(0, limit)
  }
}
