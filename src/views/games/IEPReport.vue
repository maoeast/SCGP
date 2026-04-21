<template>
  <div class="iep-report-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <el-icon class="is-loading"><Loading /></el-icon>
      <p>正在生成报告...</p>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-wrapper">
      <el-icon><WarningFilled /></el-icon>
      <p>{{ error }}</p>
      <el-button type="primary" @click="goBack">返回</el-button>
    </div>

    <!-- 报告内容 -->
    <div v-else-if="report" class="report-content">
      <!-- 操作栏 -->
      <div class="action-bar">
        <div class="report-title">
          <h2>IEP 评估报告</h2>
          <span class="report-date">{{ report.reportDate }}</span>
        </div>
        <div class="action-buttons">
          <el-button type="success" :icon="Document" @click="exportPDF">
            导出 PDF
          </el-button>
          <el-button type="primary" :icon="DocumentCopy" @click="exportWord">
            导出 Word
          </el-button>
          <el-button @click="goBack">返回菜单</el-button>
        </div>
      </div>

      <!-- 报告主体 -->
      <div class="report-body">
        <!-- 学生信息 -->
        <div class="student-info">
          <div class="info-row">
            <span class="label">学生姓名:</span>
            <span class="value">{{ student?.name || '未知' }}</span>
          </div>
          <div class="info-row">
            <span class="label">训练任务:</span>
            <span class="value">{{ report.taskName }}</span>
          </div>
        </div>

        <el-divider />

        <!-- 报告段落 -->
        <div v-for="(section, index) in report.sections" :key="index" class="report-section">
          <h3>{{ section.category }}</h3>

          <div class="section-content">
            <div class="performance-box">
              <h4>📊 表现评估</h4>
              <p>{{ section.performance }}</p>
            </div>

            <div v-if="section.behavior" class="behavior-box">
              <h4>🔍 行为特征</h4>
              <p>{{ section.behavior }}</p>
            </div>

            <div class="suggestions-box">
              <h4>💡 训练建议</h4>
              <ul>
                <li v-for="(suggestion, idx) in section.suggestions" :key="idx">
                  {{ suggestion }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 总体评估 -->
        <div class="summary-section">
          <h3>📋 总体评估</h3>
          <p class="summary-text">{{ report.summary }}</p>
        </div>

        <!-- 训练数据统计 -->
        <div v-if="sessionData" class="stats-section">
          <h3>📈 训练数据</h3>
          <el-row :gutter="20">
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-value">{{ (sessionData.accuracy * 100).toFixed(1) }}%</div>
                <div class="stat-label">准确率</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-value" v-if="sessionData.rhythmStats">
                  {{ sessionData.rhythmStats.timingErrorAvg }}ms
                </div>
                <div class="stat-value" v-else>
                  {{ (sessionData.avgResponseTime / 1000).toFixed(1) }}s
                </div>
                <div class="stat-label">{{ sessionData.rhythmStats ? '平均节奏误差' : '平均反应时' }}</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-value">{{ sessionData.duration }}s</div>
                <div class="stat-label">训练时长</div>
              </div>
            </el-col>
            <el-col :span="6">
              <div class="stat-card">
                <div class="stat-value">{{ sessionData.correctTrials }}/{{ sessionData.totalTrials }}</div>
                <div class="stat-label">正确/总数</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, WarningFilled, Document, DocumentCopy } from '@element-plus/icons-vue'
import { IEPGenerator } from '@/utils/iep-generator'
import { GameTrainingAPI } from '@/database/api'
import { DatabaseAPI } from '@/database/api'
import { TaskID, type IEPReport, type GameSessionData } from '@/types/games'
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  LevelFormat,
  ShadingType,
  BorderStyle,
  WidthType,
  VerticalAlign,
  PageOrientation,
  Table,
  TableRow,
  TableCell
} from 'docx'

const router = useRouter()
const route = useRoute()

// 状态
const loading = ref(true)
const error = ref<string>()
const report = ref<IEPReport>()
const sessionData = ref<GameSessionData>()
const student = ref<any>()

// 获取记录 ID
const recordId = ref<string>(route.query.recordId as string)

const normalizeLegacyAudioAccuracy = (data: GameSessionData): GameSessionData => {
  if (![TaskID.AUDIO_DIFF, TaskID.AUDIO_COMMAND].includes(data.taskId)) {
    return data
  }

  if (data.totalTrials <= 0) {
    return data
  }

  const derivedAccuracy = data.correctTrials / data.totalTrials
  if (Math.abs(data.accuracy - derivedAccuracy) < 0.0001) {
    return data
  }

  return {
    ...data,
    accuracy: Number(derivedAccuracy.toFixed(4))
  }
}

// 加载报告数据
const loadReport = async () => {
  try {
    loading.value = true

    if (!recordId.value) {
      throw new Error('缺少记录 ID')
    }

    // 从数据库读取训练记录（直接使用 ID 获取）
    const gameApi = new GameTrainingAPI()
    const record = gameApi.getTrainingRecord(Number(recordId.value))

    if (!record) {
      throw new Error('未找到训练记录')
    }

    // 解析会话数据
    sessionData.value = normalizeLegacyAudioAccuracy(record.raw_data as GameSessionData)

    // 获取学生信息
    const db = new DatabaseAPI()
    const students = db.query('SELECT * FROM student WHERE id = ?', [sessionData.value.studentId])
    if (students.length > 0) {
      student.value = students[0]
    }

    // 生成 IEP 报告
    report.value = IEPGenerator.generateReport(
      student.value?.name || '未知',
      sessionData.value.taskId,
      sessionData.value
    )

  } catch (err: any) {
    console.error('加载报告失败:', err)
    error.value = err.message || '加载报告失败'
  } finally {
    loading.value = false
  }
}

// 导出 PDF
const exportPDF = async () => {
  try {
    if (!report.value) return

    // 使用浏览器打印功能生成 PDF
    // 打印前添加打印样式
    const printStyle = document.createElement('style')
    printStyle.textContent = `
      @media print {
        .action-bar, .el-button { display: none !important; }
        .report-content { box-shadow: none !important; }
        body { background: white !important; }
      }
    `
    document.head.appendChild(printStyle)

    // 调用浏览器打印
    window.print()

    // 移除打印样式
    setTimeout(() => {
      document.head.removeChild(printStyle)
    }, 1000)

    ElMessage.success('请在打印对话框中选择"另存为 PDF"')
  } catch (err: any) {
    console.error('导出 PDF 失败:', err)
    ElMessage.error('导出 PDF 失败: ' + err.message)
  }
}

// 导出 Word
const exportWord = async () => {
  try {
    if (!report.value || !sessionData.value) return

    const tableBorder = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
    const cellBorders = { top: tableBorder, bottom: tableBorder, left: tableBorder, right: tableBorder }

    // 创建文档内容
    const children: any[] = []

    // 标题
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'IEP 评估报告', bold: true, size: 32 })]
      })
    )

    // 报告日期
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: `报告日期: ${report.value.reportDate}`, color: '666666' })]
      })
    )

    // 学生信息
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: '学生信息', bold: true })]
      })
    )

    // 学生信息表格
    children.push(
      new Table({
        columnWidths: [2340, 7020],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: 'F5F7FA', type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: '学生姓名', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7020, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun(student.value?.name || '未知')] })]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: 'F5F7FA', type: ShadingType.CLEAR },
                children: [new Paragraph({ children: [new TextRun({ text: '训练任务', bold: true })] })]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 7020, type: WidthType.DXA },
                children: [new Paragraph({ children: [new TextRun(report.value.taskName)] })]
              })
            ]
          })
        ]
      })
    )

    // 各个评估段落
    for (const section of report.value.sections) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: section.category, bold: true })]
        })
      )

      // 表现评估
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: '📊 表现评估', bold: true, color: '409EFF' })]
        })
      )
      children.push(
        new Paragraph({
          spacing: { after: 150 },
          indent: { firstLine: 360 },
          children: [new TextRun(section.performance)]
        })
      )

      // 行为特征
      if (section.behavior) {
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 100 },
            children: [new TextRun({ text: '🔍 行为特征', bold: true, color: 'F56C6C' })]
          })
        )
        children.push(
          new Paragraph({
            spacing: { after: 150 },
            indent: { firstLine: 360 },
            children: [new TextRun(section.behavior)]
          })
        )
      }

      // 训练建议
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: '💡 训练建议', bold: true, color: '67C23A' })]
        })
      )
      section.suggestions.forEach(suggestion => {
        children.push(
          new Paragraph({
            spacing: { after: 80 },
            indent: { left: 360, hanging: 360 },
            children: [new TextRun({ text: '• ' + suggestion })]
          })
        )
      })
    }

    // 总体评估
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: '📋 总体评估', bold: true })]
      })
    )
    children.push(
      new Paragraph({
        indent: { firstLine: 360 },
        spacing: { after: 100 },
        children: [new TextRun(report.value.summary)]
      })
    )

    // 训练数据统计
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: '📈 训练数据', bold: true })]
      })
    )

    children.push(
      new Table({
        columnWidths: [2340, 2340, 2340, 2340],
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: '667EEA', type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '准确率', bold: true, color: 'FFFFFF' })]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: '667EEA', type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ 
                      text: sessionData.value?.rhythmStats ? '平均节奏误差' : '平均反应时', 
                      bold: true, 
                      color: 'FFFFFF' 
                    })]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: '667EEA', type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '训练时长', bold: true, color: 'FFFFFF' })]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                shading: { fill: '667EEA', type: ShadingType.CLEAR },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: '正确/总数', bold: true, color: 'FFFFFF' })]
                  })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `${(sessionData.value.accuracy * 100).toFixed(1)}%`,
                        bold: true,
                        size: 28
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: sessionData.value?.rhythmStats 
                          ? `${sessionData.value.rhythmStats.timingErrorAvg}ms`
                          : `${(sessionData.value.avgResponseTime / 1000).toFixed(1)}s`,
                        bold: true,
                        size: 28
                      })
                    ]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({ text: `${sessionData.value.duration}s`, bold: true, size: 28 })
                    ]
                  })
                ]
              }),
              new TableCell({
                borders: cellBorders,
                width: { size: 2340, type: WidthType.DXA },
                verticalAlign: VerticalAlign.CENTER,
                children: [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `${sessionData.value.correctTrials}/${sessionData.value.totalTrials}`,
                        bold: true,
                        size: 28
                      })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    )

    // 创建文档
    const doc = new DocxDocument({
      styles: {
        default: {
          document: {
            run: { font: 'Arial', size: 24 },
            paragraph: { spacing: { line: 360 } }
          }
        },
        paragraphStyles: [
          {
            id: 'Title',
            name: 'Title',
            basedOn: 'Normal',
            next: 'Normal',
            run: { size: 56, bold: true, color: '000000', font: 'Arial' },
            paragraph: { spacing: { before: 240, after: 120 }, alignment: AlignmentType.CENTER }
          },
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 32, bold: true, color: '000000', font: 'Arial' },
            paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 }
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: { size: 28, bold: true, color: '000000', font: 'Arial' },
            paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 1 }
          }
        ]
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
            }
          },
          children
        }
      ]
    })

    // 生成并下载
    Packer.toBlob(doc).then((blob: Blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `IEP报告_${student.value?.name || '未知'}_${new Date().toISOString().slice(0, 10)}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      ElMessage.success('Word 文档导出成功！')
    })
  } catch (err: any) {
    console.error('导出 Word 失败:', err)
    ElMessage.error('导出 Word 失败: ' + err.message)
  }
}

// 返回
const goBack = () => {
  router.push('/games')
}

// 组件挂载时加载数据
onMounted(() => {
  loadReport()
})
</script>

<style scoped>
.iep-report-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

.loading-wrapper,
.error-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 20px;
}

.loading-wrapper .el-icon {
  font-size: 48px;
  color: #409eff;
}

.error-wrapper .el-icon {
  font-size: 48px;
  color: #f56c6c;
}

.error-wrapper p {
  font-size: 16px;
  color: #666;
}

.report-content {
  max-width: 1000px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 15px;
}

.report-title h2 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.report-date {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
  display: block;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

/* 报告主体 */
.report-body {
  padding: 30px;
}

/* 学生信息 */
.student-info {
  background: #f9fafc;
  padding: 20px;
  border-radius: 6px;
  margin-bottom: 20px;
}

.info-row {
  display: flex;
  margin-bottom: 10px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 600;
  color: #606266;
  width: 100px;
  flex-shrink: 0;
}

.info-row .value {
  color: #303133;
}

/* 报告段落 */
.report-section {
  margin-bottom: 30px;
}

.report-section h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #409eff;
}

.section-content > div {
  margin-bottom: 20px;
}

.section-content > div:last-child {
  margin-bottom: 0;
}

.section-content h4 {
  font-size: 16px;
  color: #606266;
  margin-bottom: 10px;
}

.performance-box,
.behavior-box,
.suggestions-box {
  padding: 15px;
  border-radius: 6px;
}

.performance-box {
  background: #ecf5ff;
  border-left: 4px solid #409eff;
}

.behavior-box {
  background: #fef0f0;
  border-left: 4px solid #f56c6c;
}

.suggestions-box {
  background: #f0f9ff;
  border-left: 4px solid #67c23a;
}

.section-content p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
}

.suggestions-box ul {
  margin: 0;
  padding-left: 20px;
  list-style-type: disc;
}

.suggestions-box li {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 5px;
}

/* 总体评估 */
.summary-section {
  margin-bottom: 30px;
}

.summary-section h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 15px;
}

.summary-text {
  line-height: 1.8;
  color: #606266;
  text-indent: 2em;
}

/* 统计数据 */
.stats-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.stats-section h3 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 20px;
}

.stat-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: white;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  opacity: 0.9;
}

/* 响应式 */
@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .action-buttons {
    justify-content: stretch;
  }

  .action-buttons .el-button {
    flex: 1;
  }
}
</style>
