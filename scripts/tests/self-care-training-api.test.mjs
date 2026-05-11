import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import createJiti from 'jiti'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': `${projectRoot}/src`,
  },
})

function loadSelfCareTrainingApi() {
  return jiti('../../src/database/self-care-training-api.ts')
}

test('self-care training api sources task_training contract constants and session writer', () => {
  const source = readFileSync(resolve(projectRoot, 'src/database/self-care-training-api.ts'), 'utf8')

  assert.match(source, /TASK_TRAINING_ENTRY_CODE/)
  assert.match(source, /TASK_TRAINING_MODULE_CODE/)
  assert.match(source, /TASK_TRAINING_RESOURCE_TYPE/)
  assert.match(source, /TrainingSessionWriter/)
  assert.doesNotMatch(source, /sessionFamily:\s*['"]game['"]/)
})

test('self-care training api persists task execution into training_records and training_session', async () => {
  const { SelfCareTrainingAPI } = loadSelfCareTrainingApi()

  class FakeDb {
    constructor() {
      this.student = {
        id: 12,
        name: '小明',
        current_class_id: 6,
        current_class_name: '向日葵班',
      }
      this.resource = {
        id: 203,
        name: '刷牙练习',
        module_code: 'life_skills',
        resource_type: 'task_training',
      }
      this.trainingRecords = []
      this.trainingSessions = []
      this.lastId = 0
      this.saved = false
    }

    getRawDB() {
      return this
    }

    run(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim()
      if (
        normalized === 'BEGIN TRANSACTION'
        || normalized === 'COMMIT'
        || normalized === 'ROLLBACK'
      ) {
        return
      }

      if (normalized.startsWith('INSERT INTO training_records')) {
        const row = {
          id: ++this.lastId,
          student_id: params[0],
          task_id: params[1],
          resource_id: params[2],
          resource_type: params[3],
          session_type: params[4],
          entry_code: params[5],
          timestamp: params[6],
          duration: params[7],
          accuracy_rate: params[8],
          avg_response_time: params[9],
          raw_data: params[10],
          class_id: params[11],
          class_name: params[12],
          module_code: params[13],
        }
        this.trainingRecords.push(row)
        return
      }

      if (normalized.startsWith('INSERT INTO training_session')) {
        const existingIndex = this.trainingSessions.findIndex(
          (row) => row.source_table === params[17] && row.source_record_id === params[18]
        )
        const row = {
          id: existingIndex >= 0 ? this.trainingSessions[existingIndex].id : ++this.lastId,
          student_id: params[0],
          module_code: params[1],
          entry_code: params[2],
          session_family: params[3],
          resource_id: params[4],
          resource_type: params[5],
          task_id: params[6],
          task_name_snapshot: params[7],
          class_id: params[8],
          class_name: params[9],
          started_at: params[10],
          ended_at: params[11],
          duration_ms: params[12],
          completion_status: params[13],
          accuracy_rate: params[14],
          avg_response_time_ms: params[15],
          summary_payload: params[16],
          source_table: params[17],
          source_record_id: params[18],
        }
        if (existingIndex >= 0) {
          this.trainingSessions[existingIndex] = row
        } else {
          this.trainingSessions.push(row)
        }
        return
      }
    }

    get(sql, params = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim()
      if (normalized.startsWith('SELECT name, current_class_id, current_class_name FROM student')) {
        return params[0] === this.student.id ? this.student : null
      }

      if (normalized.startsWith('SELECT id, name, module_code, resource_type FROM sys_training_resource')) {
        return params[0] === this.resource.id ? this.resource : null
      }

      if (normalized.startsWith('SELECT last_insert_rowid() as id')) {
        return { id: this.lastId }
      }

      if (normalized.startsWith('SELECT id FROM training_session WHERE source_table = ? AND source_record_id = ?')) {
        return this.trainingSessions.find(
          (row) => row.source_table === params[0] && row.source_record_id === params[1]
        ) || null
      }

      return null
    }

    lastInsertId() {
      return this.lastId
    }

    async saveNow() {
      this.saved = true
    }
  }

  const db = new FakeDb()
  const api = new SelfCareTrainingAPI(db)

  const result = await api.saveTrainingSession({
    studentId: 12,
    resourceId: 203,
    startedAt: Date.parse('2026-05-11T09:00:00.000Z'),
    endedAt: Date.parse('2026-05-11T09:02:00.000Z'),
    completionStatus: 'completed',
    executionResult: {
      trainingMode: 'step_task',
      stepCount: 4,
      completedStepCount: 2,
      errorType: 2,
      teacherNotes: '第 2 步需要口头提示',
      stepResults: [
        { seq: 1, stepId: 'step_1', completionLevel: 'independent', errorType: 0 },
        { seq: 2, stepId: 'step_2', completionLevel: 'prompt', errorType: 2, teacherNotes: '注意漱口节奏' },
      ],
    },
  })

  assert.equal(result.trainingRecordId, 1)
  assert.equal(result.sessionId, 2)
  assert.equal(db.saved, true)
  assert.equal(db.trainingRecords.length, 1)
  assert.equal(db.trainingSessions.length, 1)

  const trainingRecord = db.trainingRecords[0]
  assert.equal(trainingRecord.task_id, null)
  assert.equal(trainingRecord.resource_id, 203)
  assert.equal(trainingRecord.resource_type, 'task_training')
  assert.equal(trainingRecord.session_type, 'task_training')
  assert.equal(trainingRecord.entry_code, 'life-skills')
  assert.equal(trainingRecord.module_code, 'life_skills')
  assert.equal(trainingRecord.duration, 120)
  assert.equal(trainingRecord.accuracy_rate, 0.5)

  const rawData = JSON.parse(trainingRecord.raw_data)
  assert.equal(rawData.trainingMode, 'step_task')
  assert.equal(rawData.stepCount, 4)
  assert.equal(rawData.completedStepCount, 2)
  assert.equal(rawData.errorType, 2)
  assert.equal(rawData.teacherNotes, '第 2 步需要口头提示')
  assert.equal(rawData.stepResults.length, 2)

  const trainingSession = db.trainingSessions[0]
  assert.equal(trainingSession.session_family, 'task_training')
  assert.equal(trainingSession.resource_id, 203)
  assert.equal(trainingSession.resource_type, 'task_training')
  assert.equal(trainingSession.task_id, null)
  assert.equal(trainingSession.task_name_snapshot, '刷牙练习')
  assert.equal(trainingSession.class_id, 6)
  assert.equal(trainingSession.class_name, '向日葵班')
  assert.equal(trainingSession.duration_ms, 120000)
  assert.equal(trainingSession.completion_status, 'completed')

  const summaryPayload = JSON.parse(trainingSession.summary_payload)
  assert.equal(summaryPayload.stepCount, 4)
  assert.equal(summaryPayload.completedStepCount, 2)
  assert.equal(summaryPayload.errorType, 2)
  assert.equal(summaryPayload.teacherNotes, '第 2 步需要口头提示')
  assert.equal(summaryPayload.completionBreakdown.independent, 1)
  assert.equal(summaryPayload.completionBreakdown.prompt, 1)
})
