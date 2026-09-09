import { DatabaseAPI } from './api'

/** 与 api.ts 内部 getTransactionalDb 同款（该函数未导出，此处内联同语义：SQLWrapper→原始 DB） */
function getTransactionalDb(db: any) {
  return typeof db?.getRawDB === 'function' ? db.getRawDB() : db
}

/**
 * CPEP-3 评估数据门面（仿 Cnbsr2016AssessmentAPI 事务写入模式）。
 * saveAssessment 一次事务写入主表 + 明细表，任一失败整体回滚。
 */
export interface Cpep3AssessmentInput {
  student_id: number
  /** CA 精确计算结果（年/月/日 + 连续月龄，设计文档 §2） */
  ca: { year: number; month: number; day: number; monthsDecimal: number }
  age_months: number
  total_pass_count: number
  total_emerging_count: number
  total_mental_age: number
  total_month_range: string
  domain_results: unknown[]
  /** 不可变报告快照 JSON（Cpep3ReportSnapshot，任务书 §二十；G1-G8 校验通过后生成） */
  report_snapshot?: string
  report_version?: string
  scoring_version?: string
  start_time: string
  end_time?: string | null
}

export interface Cpep3AssessmentDetailInput {
  question_id: number
  code_no: string
  dimension: string
  item_type: 'administered' | 'rated'
  level: 'P' | 'E' | 'F' | 'A' | 'M' | 'S'
  score: 0 | 1 | 2
  answer_time?: number
}

export class Cpep3AssessmentAPI extends DatabaseAPI {
  saveAssessment(data: {
    assessment: Cpep3AssessmentInput
    details: Cpep3AssessmentDetailInput[]
  }): number {
    const rawDb = getTransactionalDb(this.db)
    rawDb.run('BEGIN TRANSACTION')

    try {
      const assessId = this.createAssessment(data.assessment)
      this.saveAssessmentDetails(assessId, data.details)
      rawDb.run('COMMIT')
      return assessId
    } catch (error) {
      try {
        rawDb.run('ROLLBACK')
      } catch {
        // ignore rollback failures
      }
      throw error
    }
  }

  createAssessment(assessment: Cpep3AssessmentInput): number {
    this.execute(`
      INSERT INTO cpep3_assess (
        student_id, age_months, ca_year, ca_month, ca_day, ca_months_decimal,
        total_pass_count, total_emerging_count, total_mental_age, total_month_range,
        domain_results, report_snapshot, report_version, scoring_version, start_time, end_time
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      assessment.student_id,
      assessment.age_months,
      assessment.ca.year,
      assessment.ca.month,
      assessment.ca.day,
      assessment.ca.monthsDecimal,
      assessment.total_pass_count,
      assessment.total_emerging_count,
      assessment.total_mental_age,
      assessment.total_month_range,
      JSON.stringify(assessment.domain_results ?? []),
      assessment.report_snapshot || null,
      assessment.report_version || null,
      assessment.scoring_version || null,
      assessment.start_time,
      assessment.end_time || null,
    ])

    return this.getLastInsertId()
  }

  saveAssessmentDetails(assessId: number, details: Cpep3AssessmentDetailInput[]): void {
    details.forEach((detail) => {
      this.execute(`
        INSERT INTO cpep3_assess_detail (
          assess_id, question_id, code_no, dimension, item_type, level, score, answer_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assessId,
        detail.question_id,
        detail.code_no,
        detail.dimension,
        detail.item_type,
        detail.level,
        detail.score,
        detail.answer_time || 0,
      ])
    })
  }

  getStudentAssessments(studentId: number) {
    return this.db.all(`
      SELECT
        id, student_id, age_months,
        total_pass_count, total_emerging_count,
        total_mental_age, total_month_range,
        report_version, scoring_version,
        domain_results, start_time, end_time, created_at
      FROM cpep3_assess
      WHERE student_id = ?
      ORDER BY created_at DESC
    `, [studentId])
  }
}
