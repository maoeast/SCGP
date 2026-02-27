<template>
  <div class="class-snapshot-test-lite">
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <h2>班级快照模式轻量级测试</h2>
          <el-tag :type="testStatus === 'idle' ? 'info' : testStatus === 'running' ? 'warning' : testStatus === 'passed' ? 'success' : 'danger'">
            {{ statusText }}
          </el-tag>
        </div>
      </template>

      <div class="test-info">
        <el-alert
          title="测试说明"
          type="info"
          :closable="false"
          show-icon
        >
          <p>本测试验证班级管理混合快照模式：</p>
          <ul>
            <li>创建学生并分配到"测试2025班"</li>
            <li>录入训练记录，记录班级快照</li>
            <li>执行升学操作，将学生迁移至"测试2026班"</li>
            <li>验证：历史记录的班级保持不变，学生档案已更新</li>
          </ul>
        </el-alert>
      </div>

      <div class="test-actions">
        <el-button
          type="primary"
          :loading="testStatus === 'running'"
          :disabled="testStatus === 'running'"
          @click="runTest"
        >
          {{ testStatus === 'running' ? '测试运行中...' : '开始测试' }}
        </el-button>

        <el-button
          v-if="testStatus !== 'idle'"
          @click="clearLog"
        >
          清空日志
        </el-button>
      </div>

      <div v-if="logMessages.length > 0" class="test-log">
        <h3>测试日志</h3>
        <div class="log-container">
          <div
            v-for="(msg, index) in logMessages"
            :key="index"
            :class="['log-entry', `log-${msg.level}`]"
          >
            <span class="log-time">{{ msg.time }}</span>
            <span class="log-message">{{ msg.message }}</span>
          </div>
        </div>
      </div>

      <div v-if="testResult" class="test-result">
        <h3>测试结果</h3>
        <div class="result-summary">
          <el-result
            :icon="testResult.success ? 'success' : 'error'"
            :title="testResult.success ? '测试通过' : '测试失败'"
            :sub-title="testResult.message"
          >
            <template #extra>
              <div v-if="testResult.data" class="result-details">
                <h4>详细数据</h4>
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="历史记录班级ID">
                    {{ testResult.data.historicalClassId }}
                  </el-descriptions-item>
                  <el-descriptions-item label="历史记录班级名称">
                    {{ testResult.data.historicalClassName }}
                  </el-descriptions-item>
                  <el-descriptions-item label="学生当前班级ID">
                    {{ testResult.data.currentClassId }}
                  </el-descriptions-item>
                  <el-descriptions-item label="学生当前班级名称">
                    {{ testResult.data.currentClassName }}
                  </el-descriptions-item>
                  <el-descriptions-item label="快照隔离验证">
                    <el-tag :type="testResult.data.isolationVerified ? 'success' : 'danger'">
                      {{ testResult.data.isolationVerified ? '✓ 快照独立' : '✗ 快照被篡改' }}
                    </el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </template>
          </el-result>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { ClassAPI } from '@/database/class-api'
import { StudentAPI } from '@/database/api'
import { EquipmentTrainingAPI } from '@/database/api'
import { getDatabase } from '@/database/init'

// 测试状态
type TestStatus = 'idle' | 'running' | 'passed' | 'failed'
const testStatus = ref<TestStatus>('idle')
const testResult = ref<any>(null)

// 日志消息
interface LogMessage {
  time: string
  level: 'info' | 'success' | 'error' | 'warning'
  message: string
}
const logMessages = ref<LogMessage[]>([])

// 状态文本
const statusText = ref<string>('待开始')

// 添加日志
function log(level: 'info' | 'success' | 'error' | 'warning', message: string) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logMessages.value.push({ time, level, message })
  console.log(`[${level.toUpperCase()}] ${time} - ${message}`)
}

// 清空日志
function clearLog() {
  logMessages.value = []
  testResult.value = null
  testStatus.value = 'idle'
  statusText.value = '待开始'
}

// 清理测试数据
async function cleanupTestData() {
  log('info', '[清理] 开始清理测试数据...')

  try {
    const db = getDatabase()

    // 直接删除，不需要先查询
    // 删除约束冲突的班级记录
    try {
      db.run(`DELETE FROM sys_class WHERE (academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1) OR (academic_year = '2026-2027' AND grade_level = 2 AND class_number = 1)`)
    } catch (e) {
      // 忽略错误
    }

    // 删除测试班级
    try {
      db.run(`DELETE FROM sys_class WHERE name = '测试2025班' OR name = '测试2026班'`)
    } catch (e) {
      // 忽略错误
    }

    // 删除测试学生
    try {
      db.run(`DELETE FROM student WHERE name = '测试张三'`)
    } catch (e) {
      // 忽略错误
    }

    // 删除测试训练记录
    try {
      db.run(`DELETE FROM equipment_training_records WHERE notes LIKE '%班级快照测试%'`)
    } catch (e) {
      // 忽略错误
    }

    log('success', '[清理] 测试数据清理完成')
  } catch (error: any) {
    log('warning', `[清理] 清理部分失败: ${error.message}`)
  }
}

// 运行测试
async function runTest() {
  testStatus.value = 'running'
  statusText.value = '运行中'
  testResult.value = null
  logMessages.value = []

  log('info', '========== 开始班级快照模式测试 ==========')

  const classAPI = new ClassAPI()
  const studentAPI = new StudentAPI()
  const equipmentAPI = new EquipmentTrainingAPI()
  const db = getDatabase()
  // 获取原始数据库对象（一次性声明，整个测试中复用）
  const rawDb = (db as any).getRawDB ? (db as any).getRawDB() : (db as any)._db || db

  let testClassId: number | null = null
  let newClassId: number | null = null
  let testStudentId: number | null = null
  let trainingRecordId: number | null = null

  try {
    // ========== Step 1: 环境清理 ==========
    log('info', 'Step 1: 环境清理')
    await cleanupTestData()

    // ========== Step 2: 建立关联 ==========
    log('info', 'Step 2: 建立关联 - 创建班级和学生')

    // 先检查 sys_class 表是否存在，不存在则创建
    const tableCheck = db.exec(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name='sys_class'
    `)

    if (!tableCheck || tableCheck.length === 0) {
      log('warning', '  sys_class 表不存在，正在创建...')

      // 创建 sys_class 表
      db.exec(`
        CREATE TABLE IF NOT EXISTS sys_class (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          grade_level INTEGER NOT NULL,
          class_number INTEGER NOT NULL,
          academic_year TEXT NOT NULL,
          max_students INTEGER DEFAULT 50,
          current_enrollment INTEGER DEFAULT 0,
          status INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          UNIQUE (academic_year, grade_level, class_number)
        )
      `)

      // 创建 student_class_history 表
      db.exec(`
        CREATE TABLE IF NOT EXISTS student_class_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          student_name TEXT NOT NULL,
          class_id INTEGER NOT NULL,
          class_name TEXT NOT NULL,
          academic_year TEXT NOT NULL,
          enrollment_date TEXT NOT NULL,
          leave_date TEXT,
          leave_reason TEXT,
          is_current INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (student_id) REFERENCES student(id) ON DELETE CASCADE,
          FOREIGN KEY (class_id) REFERENCES sys_class(id) ON DELETE CASCADE,
          UNIQUE (student_id, academic_year)
        )
      `)

      // 检查并添加 student 表的列
      try {
        const studentColumns = db.exec(`PRAGMA table_info(student)`)
        let hasCurrentClassId = false

        if (studentColumns.length > 0 && studentColumns[0]?.values) {
          hasCurrentClassId = studentColumns[0].values.some((row: any[]) => row && row[1] === 'current_class_id')
        }

        if (!hasCurrentClassId) {
          db.run(`ALTER TABLE student ADD COLUMN current_class_id INTEGER`)
          db.run(`ALTER TABLE student ADD COLUMN current_class_name TEXT`)
          log('info', '  添加 student 表的班级字段')
        }
      } catch (e) {
        // 忽略错误
      }

      // 删除可能存在的冲突数据
      db.run(`DELETE FROM sys_class WHERE (academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1) OR (academic_year = '2026-2027' AND grade_level = 2 AND class_number = 1)`)

      log('success', '  表创建完成')
    }

    // 先确保没有冲突数据（双重保险）
    try {
      const beforeDelete = db.exec(`SELECT COUNT(*) as cnt FROM sys_class WHERE (academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1)`)
      const beforeCount = (beforeDelete && beforeDelete.length > 0 && beforeDelete[0]?.values) ? beforeDelete[0].values[0][0] : 0
      log('info', `  删除前冲突记录数: ${beforeCount}`)
    } catch (e) {
      log('info', '  查询删除前记录数失败，继续执行...')
    }

    try {
      db.run(`DELETE FROM sys_class WHERE (academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1)`)
    } catch (e) {
      // 忽略删除错误
    }

    try {
      const afterDelete = db.exec(`SELECT COUNT(*) as cnt FROM sys_class WHERE (academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1)`)
      const afterCount = (afterDelete && afterDelete.length > 0 && afterDelete[0]?.values) ? afterDelete[0].values[0][0] : 0
      log('info', `  删除后冲突记录数: ${afterCount}`)
    } catch (e) {
      log('info', '  查询删除后记录数失败，继续执行...')
    }

    // 检查是否已存在班级
    const existingClass = db.get(`
      SELECT id FROM sys_class
      WHERE academic_year = '2025-2026' AND grade_level = 1 AND class_number = 1
    `)

    if (existingClass) {
      testClassId = existingClass.id
      log('warning', `  班级已存在，复用 ID: ${testClassId}`)
    } else {
      // 创建测试班级 "测试2025班"
      log('info', '  正在创建班级...')

      // 获取原始数据库对象
      // rawDb 已在函数开始时声明

      try {
        // 先执行 INSERT
        rawDb.run(`
          INSERT INTO sys_class (name, grade_level, class_number, academic_year, max_students)
          VALUES (?, ?, ?, ?, ?)
        `, ['测试2025班', 1, 1, '2025-2026', 50])

        // sql.js 中需要通过 SELECT last_insert_rowid() 获取插入的 ID
        const rowIdResult = rawDb.exec(`SELECT last_insert_rowid() as id`)
        if (rowIdResult.length > 0 && rowIdResult[0]?.values && rowIdResult[0].values.length > 0) {
          testClassId = rowIdResult[0].values[0][0]
        }
        log('success', `  创建班级成功 (ID: ${testClassId})`)
      } catch (error: any) {
        throw new Error(`创建班级失败: ${error.message}`)
      }
    }

    // 验证班级创建成功
    if (!testClassId && testClassId !== 0) {
      throw new Error('创建班级失败：返回的 ID 为空')
    }

    // 创建测试学生
    testStudentId = await studentAPI.addStudent({
      name: '测试张三',
      gender: '男',
      birthday: '2018-01-01',
      student_no: 'TEST_LITE_001',
      disorder: '测试障碍',
      avatar_path: null
    })
    log('success', `  创建学生 "测试张三" (ID: ${testStudentId})`)

    // 分配学生到班级
    classAPI.assignStudentToClass(
      testStudentId,
      '测试张三',
      testClassId,
      '2025-2026',
      new Date().toISOString().split('T')[0]
    )
    log('success', `  分配学生到 "测试2025班"`)

    // 验证并确保学生表的班级字段已更新
    // rawDb 已在函数开始时声明
    rawDb.run(`
      UPDATE student
      SET current_class_id = ?, current_class_name = ?
      WHERE id = ?
    `, [testClassId, '测试2025班', testStudentId])
    log('info', `  已更新学生当前班级字段`)

    // ========== Step 3: 记录业务数据 ==========
    log('info', 'Step 3: 记录业务数据 - 创建训练记录')

    // 获取一个器材ID
    let equipmentId = 1
    try {
      const equipment = db.exec(`
        SELECT id FROM sys_training_resource LIMIT 1
      `)
      if (equipment && equipment.length > 0 && equipment[0]?.values && equipment[0].values.length > 0) {
        equipmentId = equipment[0].values[0][0]
        log('info', `  使用器材 ID: ${equipmentId}`)
      } else {
        log('warning', '  未找到器材，使用默认 ID: 1')
      }
    } catch (e) {
      log('warning', '  查询器材失败，使用默认 ID: 1')
    }

    // 直接使用原始数据库创建训练记录，包含班级快照
    // rawDb 已在函数开始时声明
    const today = new Date().toISOString().split('T')[0]

    rawDb.run(`
      INSERT INTO equipment_training_records (
        student_id, equipment_id, score, prompt_level,
        duration_seconds, notes, training_date, teacher_name, environment,
        class_id, class_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      testStudentId,
      equipmentId,
      5,
      1,
      300,
      '班级快照测试记录',
      today,
      '测试教师',
      '测试环境',
      testClassId,      // 班级 ID 快照
      '测试2025班'      // 班级名称快照
    ])

    // 获取插入的记录 ID
    const rowIdResult = rawDb.exec(`SELECT last_insert_rowid() as id`)
    if (rowIdResult.length > 0 && rowIdResult[0]?.values && rowIdResult[0].values.length > 0) {
      trainingRecordId = rowIdResult[0].values[0][0]
    }
    log('success', `  创建训练记录 (ID: ${trainingRecordId})`)

    // ========== Step 4: 状态固化检查 ==========
    log('info', 'Step 4: 状态固化检查 - 记录班级快照')

    const record = db.get(`
      SELECT class_id, class_name
      FROM equipment_training_records
      WHERE id = ${trainingRecordId}
    `)

    const originalClassId = record.class_id
    const originalClassName = record.class_name

    log('success', `  训练记录班级快照: ID=${originalClassId}, 名称=${originalClassName}`)

    if (originalClassName !== '测试2025班') {
      throw new Error(`班级快照不正确！期望: 测试2025班, 实际: ${originalClassName}`)
    }

    // ========== Step 5: 模拟升学操作 ==========
    log('info', 'Step 5: 模拟升学操作 - 创建新班级并迁移学生')

    // 创建新班级 "测试2026班"
    // 先检查是否已存在
    const existingNewClass = db.get(`
      SELECT id FROM sys_class
      WHERE academic_year = '2026-2027' AND grade_level = 2 AND class_number = 1
    `)

    if (existingNewClass) {
      newClassId = existingNewClass.id
      log('warning', `  新班级已存在，复用 ID: ${newClassId}`)
    } else {
      log('info', '  正在创建新班级...')

      // 获取原始数据库对象
      // rawDb 已在函数开始时声明

      try {
        // 先执行 INSERT
        rawDb.run(`
          INSERT INTO sys_class (name, grade_level, class_number, academic_year, max_students)
          VALUES (?, ?, ?, ?, ?)
        `, ['测试2026班', 2, 1, '2026-2027', 50])

        // sql.js 中需要通过 SELECT last_insert_rowid() 获取插入的 ID
        const rowIdResult = rawDb.exec(`SELECT last_insert_rowid() as id`)
        if (rowIdResult.length > 0 && rowIdResult[0]?.values && rowIdResult[0].values.length > 0) {
          newClassId = rowIdResult[0].values[0][0]
        }
        log('success', `  创建新班级成功 (ID: ${newClassId})`)
      } catch (error: any) {
        throw new Error(`创建新班级失败: ${error.message}`)
      }
    }

    // 验证新班级创建成功
    if (!newClassId && newClassId !== 0) {
      throw new Error('创建新班级失败：返回的 ID 为空')
    }

    // 执行学生转班
    classAPI.changeStudentClass({
      studentId: testStudentId,
      oldClassId: testClassId,
      newClassId: newClassId,
      academicYear: '2026-2027',
      changeDate: new Date().toISOString().split('T')[0],
      reason: 'upgrade'
    })
    log('success', `  执行学生升学操作`)

    // ========== Step 6: 核心结果断言 ==========
    log('info', 'Step 6: 核心结果断言 - 验证快照隔离')

    // 重新读取训练记录
    const historicalRecord = db.get(`
      SELECT class_id, class_name
      FROM equipment_training_records
      WHERE id = ${trainingRecordId}
    `)

    // 读取学生当前状态
    const currentStudent = db.get(`
      SELECT current_class_id, current_class_name
      FROM student
      WHERE id = ${testStudentId}
    `)

    log('info', `  历史记录班级: ${historicalRecord.class_name} (ID: ${historicalRecord.class_id})`)
    log('info', `  学生当前班级: ${currentStudent.current_class_name} (ID: ${currentStudent.current_class_id})`)

    // 断言
    const historicalClassMatch = historicalRecord.class_name === '测试2025班'
    const studentUpdated = currentStudent.current_class_name === '测试2026班'
    const isolationVerified = historicalRecord.class_id !== currentStudent.current_class_id

    if (!historicalClassMatch) {
      throw new Error(`历史记录被篡改！期望: 测试2025班, 实际: ${historicalRecord.class_name}`)
    }

    if (!studentUpdated) {
      throw new Error(`学生档案未更新！期望: 测试2026班, 实际: ${currentStudent.current_class_name}`)
    }

    if (!isolationVerified) {
      throw new Error(`快照隔离失败！历史记录和学生档案指向同一班级`)
    }

    log('success', '✓ 班级快照保持不变')
    log('success', '✓ 学生档案已更新')
    log('success', '✓ 快照隔离验证通过')

    // ========== 测试通过 ==========
    testStatus.value = 'passed'
    statusText.value = '通过'
    testResult.value = {
      success: true,
      message: '混合快照模式工作正常',
      data: {
        historicalClassId: historicalRecord.class_id,
        historicalClassName: historicalRecord.class_name,
        currentClassId: currentStudent.current_class_id,
        currentClassName: currentStudent.current_class_name,
        isolationVerified: isolationVerified
      }
    }

    log('success', '========== 测试通过 ==========')
    ElMessage.success('班级快照模式测试通过！')

  } catch (error: any) {
    // ========== 测试失败 ==========
    testStatus.value = 'failed'
    statusText.value = '失败'
    testResult.value = {
      success: false,
      message: error.message,
      data: null
    }

    log('error', `✗ 测试失败: ${error.message}`)
    log('error', '========== 测试失败 ==========')
    ElMessage.error(`测试失败: ${error.message}`)
  } finally {
    // ========== Step 7: 环境清理 ==========
    log('info', 'Step 7: 环境清理')
    await cleanupTestData()
  }
}
</script>

<style scoped>
.class-snapshot-test-lite {
  padding: 20px;
}

.test-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.test-info {
  margin-bottom: 20px;
}

.test-info ul {
  margin: 10px 0;
  padding-left: 20px;
}

.test-info li {
  margin: 5px 0;
}

.test-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.test-log,
.test-result {
  margin-top: 20px;
}

.test-log h3,
.test-result h3 {
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
}

.log-container {
  background: #1e1e1e;
  border-radius: 6px;
  padding: 15px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.log-entry {
  padding: 4px 0;
  display: flex;
  gap: 10px;
}

.log-time {
  color: #858585;
  min-width: 60px;
}

.log-message {
  flex: 1;
}

.log-info {
  color: #4fc3f7;
}

.log-success {
  color: #81c784;
}

.log-error {
  color: #e57373;
}

.log-warning {
  color: #ffb74d;
}

.result-details {
  width: 100%;
  max-width: 600px;
}

.result-details h4 {
  margin-bottom: 15px;
  font-size: 14px;
  font-weight: 600;
}
</style>
