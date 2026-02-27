<template>
  <div class="sql-test-page">
    <h1>SQL.js 测试</h1>
    <div class="test-buttons">
      <el-button @click="testImport" type="primary" :loading="testing.import">测试导入</el-button>
      <el-button @click="testEquipmentAPI" type="success" :loading="testing.equipment">测试器材API</el-button>
      <el-button @click="testTrainingAPI" type="warning" :loading="testing.training">测试训练API</el-button>
      <el-button @click="testIEP" type="info" :loading="testing.iep">测试IEP</el-button>
      <el-button @click="checkLatestRecord" type="success">查看最新训练记录</el-button>
    </div>
    <div class="result">
      <pre>{{ testResult }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { EquipmentAPI } from '@/database/api'
import { EquipmentTrainingAPI } from '@/database/api'
import { IEPGenerator } from '@/utils/iep-generator'
import { DatabaseAPI } from '@/database/api'

const testResult = ref('')
const testing = ref({
  import: false,
  equipment: false,
  training: false,
  iep: false
})

async function testImport() {
  testing.value.import = true
  testResult.value = '正在测试导入...\n'
  try {
    testResult.value += '✅ 测试完成\n'
  } catch (error: any) {
    testResult.value += `❌ 错误: ${error.message}\n`
  } finally {
    testing.value.import = false
  }
}

// 检查最新的训练记录
async function checkLatestRecord() {
  testResult.value = '正在查询最新的训练记录...\n\n'
  try {
    const db = new DatabaseAPI()
    const records = db.query(`
      SELECT
        r.id,
        r.student_id,
        r.equipment_id,
        r.score,
        r.prompt_level,
        r.duration_seconds,
        r.training_date,
        r.created_at,
        tr.name as equipment_name,
        tr.category as equipment_category,
        tr.legacy_id
      FROM equipment_training_records r
      LEFT JOIN sys_training_resource tr ON r.equipment_id = tr.id
      ORDER BY r.id DESC
      LIMIT 5
    `)

    if (records.length === 0) {
      testResult.value += '❌ 没有找到训练记录\n'
    } else {
      testResult.value += `✅ 找到 ${records.length} 条训练记录:\n\n`
      records.forEach((r: any, i: number) => {
        testResult.value += `记录 #${i + 1}:\n`
        testResult.value += `  - ID: ${r.id}\n`
        testResult.value += `  - 学生ID: ${r.student_id}\n`
        testResult.value += `  - 器材ID (新表): ${r.equipment_id}\n`
        testResult.value += `  - 器材名称: ${r.equipment_name || '未知'}\n`
        testResult.value += `  - 器材分类: ${r.equipment_category || '未知'}\n`
        testResult.value += `  - 旧表ID (legacy_id): ${r.legacy_id || '无'}\n`
        testResult.value += `  - 评分: ${r.score}\n`
        testResult.value += `  - 辅助等级: ${r.prompt_level}\n`
        testResult.value += `  - 创建时间: ${r.created_at}\n\n`
      })
    }

    ElMessage.success(`查询成功，找到 ${records.length} 条记录`)
  } catch (error: any) {
    testResult.value += `❌ 错误: ${error.message}\n`
    ElMessage.error('查询失败')
  }
}

async function testEquipmentAPI() {
  testing.value.equipment = true
  testResult.value = '正在测试器材API...\n'
  try {
    const api = new EquipmentAPI()
    testResult.value += '✅ 测试完成\n'
  } catch (error: any) {
    testResult.value += `❌ 错误: ${error.message}\n`
  } finally {
    testing.value.equipment = false
  }
}

async function testTrainingAPI() {
  testing.value.training = true
  testResult.value = '正在测试训练API...\n'
  try {
    const api = new EquipmentTrainingAPI()
    testResult.value += '✅ 测试完成\n'
  } catch (error: any) {
    testResult.value += `❌ 错误: ${error.message}\n`
  } finally {
    testing.value.training = false
  }
}

async function testIEP() {
  testing.value.iep = true
  testResult.value = '正在测试IEP...\n'
  try {
    const generator = new IEPGenerator()
    testResult.value += '✅ 测试完成\n'
  } catch (error: any) {
    testResult.value += `❌ 错误: ${error.message}\n`
  } finally {
    testing.value.iep = false
  }
}
</script>

<style scoped>
.sql-test-page {
  padding: 20px;
}
.test-buttons {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}
.result {
  background: #f5f5f5;
  padding: 15px;
  border-radius: 4px;
  min-height: 300px;
}
.result pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: monospace;
}
</style>
