/**
 * 导出工具库
 * 提供PDF和Word文档导出功能
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import JSZip from 'jszip'
import { generateSMReport, generateWeeFIMReport } from './reportTemplates'

// 定义接口避免导入问题
interface SMReportData {
  student: {
    name: string;
    gender: 'male' | 'female';
    age: number;
    birthday: string;
  };
  assessment: {
    id: string;
    date: string;
    raw_score: number;
    sq_score: number;
    level: string;
    age_stage: string;
  };
  dimensions: {
    communication: { pass: number; total: number };
    work: { pass: number; total: number };
    movement: { pass: number; total: number };
    independent_life: { pass: number; total: number };
    self_management: { pass: number; total: number };
    group_activity: { pass: number; total: number };
  };
  answers: Record<number, number>;
}

interface WeeFIMReportData {
  student: {
    name: string;
    gender: 'male' | 'female';
    age: number;
    birthday: string;
  };
  assessment: {
    id: string;
    date: string;
    total_score: number;
    motor_score: number;
    cognitive_score: number;
    level: {
      level: number;
      motor_level: number;
      cognitive_level: number;
    };
  };
  categories: {
    selfcare: { score: number; items: Array<{ title: string; score: number }> };
    sphincter: { score: number; items: Array<{ title: string; score: number }> };
    transfer: { score: number; items: Array<{ title: string; score: number }> };
    locomotion: { score: number; items: Array<{ title: string; score: number }> };
    communication: { score: number; items: Array<{ title: string; score: number }> };
    social_cognition: { score: number; items: Array<{ title: string; score: number }> };
  };
  answers: Record<number, number>;
}

/**
 * 延迟执行函数，避免阻塞UI
 * @param ms 延迟毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 显示进度的加载提示
 */
function showProgressLoading(message: string): HTMLDivElement {
  const loadingMessage = document.createElement('div')
  loadingMessage.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 40px;
    border-radius: 8px;
    z-index: 9999;
    font-size: 16px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `
  loadingMessage.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px;">
      <div class="loading-spinner"></div>
      <span>${message}</span>
    </div>
    <style>
      .loading-spinner {
        border: 2px solid #ffffff30;
        border-top: 2px solid #ffffff;
        border-radius: 50%;
        width: 20px;
        height: 20px;
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `
  document.body.appendChild(loadingMessage)
  return loadingMessage
}

/**
 * 导出PDF文档
 * @param elementId 要导出的HTML元素ID
 * @param filename 导出的文件名（不包含扩展名）
 */
export async function exportToPDF(elementId: string, filename: string = 'report'): Promise<void> {
  let loadingMessage: HTMLDivElement | null = null
  let elementsToHide: NodeListOf<Element> | null = null
  let element: HTMLElement | null = null
  let originalStyle: string = ''

  try {
    // 步骤1：获取元素
    element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`找不到ID为 ${elementId} 的元素`)
    }

    // 步骤2：显示初始加载提示
    loadingMessage = showProgressLoading('正在准备导出PDF...')
    await delay(100)

    // 步骤3：隐藏干扰元素
    loadingMessage.querySelector('span')!.textContent = '正在准备页面...'
    elementsToHide = document.querySelectorAll('.el-message, .el-notification, .el-loading-mask')
    elementsToHide.forEach(el => (el as HTMLElement).style.display = 'none')
    await delay(100)

    // 步骤4：准备元素样式
    loadingMessage.querySelector('span')!.textContent = '正在设置导出样式...'
    originalStyle = element.getAttribute('style') || ''
    element.setAttribute('style', `
      ${originalStyle};
      position: relative;
      z-index: 1;
      background: white;
      padding: 40px;
    `)

    // 滚动到顶部
    element.scrollTop = 0
    element.scrollLeft = 0
    await delay(100)

    console.log('开始生成PDF，元素大小:', element.scrollWidth, 'x', element.scrollHeight)

    // 步骤5：生成Canvas
    loadingMessage.querySelector('span')!.textContent = '正在生成页面截图...'

    // 将html2canvas包装在Promise中，并使用setTimeout避免阻塞
    const canvas = await new Promise((resolve, reject) => {
      // 使用setTimeout将html2canvas推到下一个事件循环
      setTimeout(() => {
        html2canvas(element!, {
          scale: 1, // 进一步降低清晰度以提高性能
          useCORS: true,
          allowTaint: false, // 禁用跨域
          backgroundColor: '#ffffff',
          width: element!.scrollWidth,
          height: element!.scrollHeight,
          logging: false,
          removeContainer: true,
          foreignObjectRendering: false,
          imageTimeout: 5000, // 减少超时时间
          windowWidth: element!.scrollWidth,
          windowHeight: element!.scrollHeight,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc) => {
            // 移除可能导致问题的元素
            const elementsToRemove = clonedDoc.querySelectorAll(
              'video, audio, iframe, object, embed, .el-loading-mask, .el-message, .el-notification'
            )
            elementsToRemove.forEach(el => el.remove())

            // 移除所有动画并通过CSS处理图表样式
            const style = clonedDoc.createElement('style')
            style.textContent = `
              * {
                transition: none !important;
                animation: none !important;
                transform: none !important;
              }
              .v-chart, .radar-chart {
                position: relative !important;
                overflow: hidden !important;
              }
              .v-chart canvas, .radar-chart canvas {
                max-width: 100% !important;
                height: auto !important;
              }
              /* 修复 Font Awesome 图标异常放大问题 */
              .fas, .far, .fab, .fa, .fa-solid, .fa-regular, .fa-brands, [class*="fa-"] {
                display: none !important;
              }
            `
            clonedDoc.head.appendChild(style)
          }
        }).then(resolve).catch(reject)
      }, 100)
    })

    // 步骤6：恢复元素状态
    loadingMessage.querySelector('span')!.textContent = '正在恢复页面...'
    await delay(100)

    if (element) {
      element.setAttribute('style', originalStyle)
    }

    if (elementsToHide) {
      elementsToHide.forEach(el => (el as HTMLElement).style.display = '')
    }

    console.log('Canvas生成完成，尺寸:', (canvas as HTMLCanvasElement).width, 'x', (canvas as HTMLCanvasElement).height)

    // 步骤7：生成PDF
    loadingMessage.querySelector('span')!.textContent = '正在生成PDF文件...'
    await delay(100)

    // 使用setTimeout避免阻塞
    const imgData = await new Promise<string>((resolve) => {
      setTimeout(() => {
        const data = (canvas as HTMLCanvasElement).toDataURL('image/jpeg', 0.7) // 使用JPEG格式，质量更低
        resolve(data)
      }, 100)
    })

    loadingMessage.querySelector('span')!.textContent = '正在保存PDF...'
    await delay(100)

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = (canvas as HTMLCanvasElement).width
    const imgHeight = (canvas as HTMLCanvasElement).height

    // 计算图片在PDF中的尺寸
    const imgWidthInPdf = imgWidth * 0.264583 // px to mm (1px ≈ 0.264583mm at 96dpi)
    const imgHeightInPdf = imgHeight * 0.264583

    // 计算缩放比例以适应页面宽度
    const scale = Math.min(pdfWidth / imgWidthInPdf, 1)
    const scaledWidth = imgWidthInPdf * scale
    const scaledHeight = imgHeightInPdf * scale

    // 分页处理
    const pageHeight = pdfHeight - 20 // 留出边距
    let remainingHeight = scaledHeight
    let currentY = 10 // 顶部边距
    let pageNumber = 1

    // 计算每页可以显示的图片高度比例
    const heightPerPage = pageHeight / scaledHeight

    while (remainingHeight > 0) {
      if (pageNumber > 1) {
        pdf.addPage()
      }

      // 计算当前页要显示的图片区域
      const sourceY = (scaledHeight - remainingHeight) / scale / 0.264583
      const sourceHeight = Math.min(remainingHeight / scale / 0.264583, pageHeight / scale / 0.264583)

      // 添加图片（简化处理：直接在每页添加完整图片，通过位置控制显示区域）
      pdf.addImage(
        imgData,
        'JPEG',
        (pdfWidth - scaledWidth) / 2,
        currentY - (scaledHeight - remainingHeight),
        scaledWidth,
        scaledHeight
      )

      remainingHeight -= pageHeight
      pageNumber++

      // 安全检查：防止无限循环
      if (pageNumber > 100) {
        console.warn('PDF分页超过100页，可能存在问题')
        break
      }
    }

    // 步骤8：保存PDF
    loadingMessage.querySelector('span')!.textContent = '正在下载...'
    await delay(100)

    pdf.save(`${filename}.pdf`)
    console.log('PDF导出成功:', filename)
  } catch (error) {
    console.error('导出PDF失败:', error)

    // 恢复元素样式
    const element = document.getElementById(elementId)
    if (element && originalStyle) {
      element.setAttribute('style', originalStyle.replace(';position: relative; z-index: 1; background: white; padding: 40px;', ''))
    }

    // 恢复隐藏的元素
    if (elementsToHide) {
      elementsToHide.forEach(el => (el as HTMLElement).style.display = '')
    }

    // 显示错误提示
    if (loadingMessage && loadingMessage.parentNode) {
      document.body.removeChild(loadingMessage)
    }

    const errorMessage = document.createElement('div')
    errorMessage.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f56c6c;
      color: white;
      padding: 20px 40px;
      border-radius: 8px;
      z-index: 9999;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `
    errorMessage.textContent = error instanceof Error ? error.message : 'PDF生成失败，请重试'
    document.body.appendChild(errorMessage)

    setTimeout(() => {
      if (errorMessage.parentNode) {
        document.body.removeChild(errorMessage)
      }
    }, 3000)

    throw error
  } finally {
    // 确保移除加载提示
    if (loadingMessage && loadingMessage.parentNode) {
      document.body.removeChild(loadingMessage)
    }
  }
}

/**
 * 导出Word文档（使用HTML格式）
 * @param data 报告数据
 * @param type 报告类型 'sm' 或 'weefim'
 * @param filename 导出的文件名（不包含扩展名）
 */
export function exportToWord(
  data: SMReportData | WeeFIMReportData,
  type: 'sm' | 'weefim',
  filename: string = 'report'
): void {
  try {
    // 生成报告内容
    const reportContent = type === 'sm' ? generateSMReport(data as SMReportData) : generateWeeFIMReport(data as WeeFIMReportData)

    // 创建HTML格式的Word文档
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${type === 'sm' ? 'S-M量表评估报告' : 'WeeFIM量表评估报告'}</title>
  <style>
    body {
      font-family: "Microsoft YaHei", Arial, sans-serif;
      line-height: 1.6;
      margin: 40px;
      color: #333;
    }
    h1 {
      text-align: center;
      color: #333;
      font-size: 24px;
      margin-bottom: 30px;
    }
    h2 {
      color: #333;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #333;
      padding-bottom: 5px;
    }
    h3 {
      color: #333;
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin: 10px 0;
      text-align: justify;
    }
    ul, ol {
      padding-left: 30px;
    }
    li {
      margin: 5px 0;
    }
    .info-section {
      margin: 20px 0;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    .info-item {
      display: inline-block;
      margin-right: 30px;
      margin-bottom: 10px;
    }
    .score-highlight {
      font-weight: bold;
      color: #409eff;
    }
    .level-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 15px;
      color: white;
      font-weight: bold;
    }
    @media print {
      body {
        margin: 20px;
      }
    }
  </style>
</head>
<body>
  <h1>${type === 'sm' ? '婴儿-初中生社会生活能力量表评估报告' : '改良儿童功能独立性评估量表报告'}</h1>

  <div class="info-section">
    <h2>基本信息</h2>
    <div class="info-item"><strong>姓名：</strong>${data.student.name}</div>
    <div class="info-item"><strong>性别：</strong>${data.student.gender}</div>
    <div class="info-item"><strong>年龄：</strong>${data.student.age}岁</div>
    <div class="info-item"><strong>评估日期：</strong>${'assessment' in data ? data.assessment.date : new Date().toLocaleDateString()}</div>
  </div>

  <pre style="white-space: pre-wrap; font-family: inherit;">${reportContent}</pre>

  <div style="margin-top: 60px; text-align: center;">
    <hr style="margin: 40px 0;">
    <p>评估师签名：__________________</p>
    <p>日期：__________________</p>
    <p>机构盖章：__________________</p>
  </div>
</body>
</html>
    `

    // 创建Blob对象
    const blob = new Blob([htmlContent], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'
    })

    // 下载文件
    saveAs(blob, `${filename}.doc`)
  } catch (error) {
    console.error('导出Word失败:', error)
    throw error
  }
}

/**
 * 导出原始数据为JSON文件
 * @param data 要导出的数据
 * @param filename 文件名
 */
export function exportToJSON(data: any, filename: string = 'data'): void {
  try {
    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' })
    saveAs(blob, `${filename}.json`)
  } catch (error) {
    console.error('导出JSON失败:', error)
    throw error
  }
}

/**
 * 导出数据为CSV文件
 * @param data 数据数组
 * @param filename 文件名
 */
export function exportToCSV(data: Array<Record<string, any>>, filename: string = 'data'): void {
  try {
    if (data.length === 0) {
      throw new Error('没有数据可导出')
    }

    // 获取表头
    const headers = Object.keys(data[0])

    // 生成CSV内容
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header]
          // 处理包含逗号或引号的值
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`
          }
          return value
        }).join(',')
      )
    ].join('\n')

    // 添加BOM以支持中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })
    saveAs(blob, `${filename}.csv`)
  } catch (error) {
    console.error('导出CSV失败:', error)
    throw error
  }
}

/**
 * 批量导出多个报告为ZIP文件
 * @param reports 报告数组，每个报告包含 {data, type, filename}
 * @param zipFilename ZIP文件名
 */
export async function exportReportsToZIP(
  reports: Array<{
    data: SMReportData | WeeFIMReportData
    type: 'sm' | 'weefim'
    filename: string
  }>,
  zipFilename: string = 'reports'
): Promise<void> {
  try {
    const zip = new JSZip()

    // 添加PDF报告
    for (const report of reports) {
      try {
        const pdfBlob = await generatePDFBlob(report.data, report.type)
        zip.file(`${report.filename}.pdf`, pdfBlob)
      } catch (error) {
        console.error(`生成 ${report.filename} PDF 失败:`, error)
      }

      // 添加Word报告
      const wordContent = report.type === 'sm'
        ? generateSMReport(report.data as SMReportData)
        : generateWeeFIMReport(report.data as WeeFIMReportData)

      const wordHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${report.filename}</title>
</head>
<body>
  <pre>${wordContent}</pre>
</body>
</html>
      `

      zip.file(`${report.filename}.html`, wordHtml)

      // 添加原始数据
      zip.file(`${report.filename}.json`, JSON.stringify(report.data, null, 2))
    }

    // 生成ZIP文件并下载
    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, `${zipFilename}.zip`)
  } catch (error) {
    console.error('批量导出失败:', error)
    throw error
  }
}

/**
 * 生成PDF Blob（不直接下载）
 * @param data 报告数据
 * @param type 报告类型
 * @returns PDF Blob对象
 */
async function generatePDFBlob(
  data: SMReportData | WeeFIMReportData,
  type: 'sm' | 'weefim'
): Promise<Blob> {
  // 创建临时容器
  const container = document.createElement('div')
  container.style.cssText = `
    position: absolute;
    left: -9999px;
    top: 0;
    width: 210mm; /* A4宽度 */
    padding: 20mm;
    background: white;
    font-family: "Microsoft YaHei", Arial, sans-serif;
  `

  // 生成报告HTML
  const reportContent = type === 'sm'
    ? generateSMReport(data as SMReportData)
    : generateWeeFIMReport(data as WeeFIMReportData)

  container.innerHTML = `
    <h1 style="text-align: center; margin-bottom: 30px;">
      ${type === 'sm' ? '婴儿-初中生社会生活能力量表评估报告' : '改良儿童功能独立性评估量表报告'}
    </h1>
    <pre style="white-space: pre-wrap; font-family: inherit;">${reportContent}</pre>
  `

  document.body.appendChild(container)

  try {
    // 使用html2canvas生成图片
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff'
    })

    // 创建PDF
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = canvas.width
    const imgHeight = canvas.height
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight) * 25.4

    pdf.addImage(
      imgData,
      'PNG',
      0,
      0,
      imgWidth * ratio / 25.4,
      imgHeight * ratio / 25.4
    )

    // 返回PDF Blob
    return pdf.output('blob')
  } finally {
    // 移除临时容器
    document.body.removeChild(container)
  }
}