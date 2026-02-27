/**
 * 打印辅助工具
 * 使用浏览器原生打印功能，避免卡死问题
 */

import html2canvas from 'html2canvas'

export class PrintHelper {
  private static printStyle: HTMLStyleElement | null = null

  /**
   * 准备打印
   */
  static preparePrint(elementId: string, title: string = '报告'): void {
    // 隐藏不需要的元素
    const elementsToHide = document.querySelectorAll(
      '.el-message, .el-notification, .el-loading-mask, .report-header, .no-print'
    )
    elementsToHide.forEach(el => {
      (el as HTMLElement).style.display = 'none'
    })

    // 调整报告内容的padding和margin
    const reportContent = document.getElementById(elementId)
    if (reportContent) {
      reportContent.style.padding = '0'
      reportContent.style.margin = '0'
    }

    // 创建打印样式
    if (this.printStyle) {
      document.head.removeChild(this.printStyle)
    }

    this.printStyle = document.createElement('style')
    this.printStyle.textContent = `
      @media print {
        @page {
          size: A4;
          margin: 1.5cm;
        }

        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        body {
          background: white !important;
          margin: 0;
          padding: 0;
          font-size: 12pt;
        }

        #${elementId} {
          position: static !important;
          width: 100% !important;
          max-width: 100% !important;
          background: white !important;
          box-shadow: none !important;
          overflow: visible !important;
          padding: 0 !important;
        }

        /* 允许大部分内容正常分页 */
        #${elementId} > * {
          page-break-inside: auto;
          break-inside: auto;
        }

        /* 特殊处理需要避免截断的元素 */
        .el-card,
        .radar-chart,
        .report-title,
        .student-info,
        .result-summary,
        .dimensions-content {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* 卡片样式调整 */
        .el-card {
          box-shadow: none !important;
          border: 1px solid #dcdfe6 !important;
          margin-bottom: 15px !important;
          page-break-inside: avoid;
        }

        .el-card__header {
          background: #f5f7fa !important;
          -webkit-print-color-adjust: exact !important;
          padding: 10px 15px !important;
        }

        .el-card__body {
          padding: 15px !important;
        }

        /* 雷达图特殊处理 */
        .radar-chart {
          break-inside: avoid;
          page-break-inside: avoid;
          position: relative !important;
          height: 300px !important;
          margin: 10px 0 !important;
        }

        .radar-chart canvas {
          max-width: 100% !important;
          height: auto !important;
        }

        /* 进度条样式 */
        .el-progress-bar__outer {
          -webkit-print-color-adjust: exact !important;
          background-color: #e4e7ed !important;
        }

        .el-progress-bar__inner {
          -webkit-print-color-adjust: exact !important;
        }

        /* 标签样式 */
        .el-tag {
          -webkit-print-color-adjust: exact !important;
          border: 1px solid #dcdfe6 !important;
        }

        /* 表格样式 */
        .el-table {
          page-break-inside: auto;
          font-size: 10pt;
        }

        .el-table th,
        .el-table td {
          padding: 5px !important;
        }

        .el-table__row {
          page-break-inside: avoid;
        }

        /* 标题样式 */
        h1, h2, h3, h4 {
          page-break-after: avoid;
          margin: 10px 0 !important;
        }

        h1 {
          font-size: 18pt !important;
        }

        h2, h3 {
          font-size: 14pt !important;
        }

        h4 {
          font-size: 12pt !important;
        }

        /* 分页签名区域 */
        .report-signature {
          page-break-inside: avoid;
          margin-top: 30px !important;
          padding-top: 20px !important;
          border-top: 1px solid #dcdfe6 !important;
        }

        /* 调整字体大小 */
        .info-item,
        .score-item,
        .suggestion-item {
          font-size: 11pt !important;
        }

        /* 确保所有文本都可见 */
        .el-collapse-item__content {
          page-break-inside: auto;
        }

        /* 隐藏不需要的元素 */
        .no-print {
          display: none !important;
        }
      }
    `
    document.head.appendChild(this.printStyle)

    // 添加打印标题
    const printTitle = document.createElement('div')
    printTitle.id = 'print-title'
    printTitle.style.cssText = `
      display: none;
      @media print {
        display: block;
        text-align: center;
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 20px;
      }
    `
    printTitle.textContent = title
    document.body.insertBefore(printTitle, document.body.firstChild)
  }

  /**
   * 执行打印
   */
  static doPrint(): void {
    // 延迟一下确保样式生效
    setTimeout(() => {
      window.print()
    }, 100)
  }

  /**
   * 恢复页面状态
   */
  static restorePrint(): void {
    // 恢复隐藏的元素
    setTimeout(() => {
      const elementsToRestore = document.querySelectorAll(
        '.el-message, .el-notification, .el-loading-mask, .report-header'
      )
      elementsToRestore.forEach(el => {
        (el as HTMLElement).style.display = ''
      })

      // 移除打印样式
      if (this.printStyle) {
        document.head.removeChild(this.printStyle)
        this.printStyle = null
      }

      // 移除打印标题
      const printTitle = document.getElementById('print-title')
      if (printTitle) {
        document.body.removeChild(printTitle)
      }
    }, 1000)
  }

  /**
   * 完整的打印流程
   */
  static printElement(elementId: string, title: string = '报告'): void {
    this.preparePrint(elementId, title)
    this.doPrint()

    // 监听打印对话框关闭事件
    const mediaQueryList = window.matchMedia('print')
    mediaQueryList.addListener((mql) => {
      if (!mql.matches) {
        this.restorePrint()
      }
    })

    // 备用恢复方案
    setTimeout(() => {
      this.restorePrint()
    }, 3000)
  }
}

/**
 * 导出为PDF的简化方案
 */
/**
 * 将ECharts图表转换为图片
 */
async function convertChartsToImages(container: HTMLElement): Promise<void> {
  const charts = container.querySelectorAll('.v-chart')
  const promises = Array.from(charts).map(async (chartElement) => {
    try {
      // 使用html2canvas捕获图表
      const canvas = await html2canvas(chartElement as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      })

      // 创建图片元素替换图表
      const img = document.createElement('img')
      img.src = canvas.toDataURL('image/png')
      img.style.width = '100%'
      img.style.height = '300px'
      img.style.display = 'block'

      // 替换原来的图表容器
      const parent = chartElement.parentNode
      if (parent) {
        parent.replaceChild(img, chartElement)
      }
    } catch (error) {
      console.warn('Failed to convert chart to image:', error)
    }
  })

  await Promise.all(promises)
}

export async function exportToPDFSimple(elementId: string, filename: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      // 检查是否支持打印
      if (!window.print) {
        reject(new Error('浏览器不支持打印功能'))
        return
      }

      // 获取报告元素
      const reportElement = document.getElementById(elementId)
      if (!reportElement) {
        reject(new Error('找不到报告内容'))
        return
      }

      // 克隆报告元素
      const clonedReport = reportElement.cloneNode(true) as HTMLElement

      // 创建临时容器处理图表
      const tempContainer = document.createElement('div')
      tempContainer.style.position = 'absolute'
      tempContainer.style.left = '-9999px'
      tempContainer.innerHTML = clonedReport.innerHTML
      document.body.appendChild(tempContainer)

      // 转换图表为图片
      await convertChartsToImages(tempContainer)

      // 获取处理后的HTML
      const processedHTML = tempContainer.innerHTML
      document.body.removeChild(tempContainer)

      // 创建打印页面
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        reject(new Error('无法打开打印窗口，请检查浏览器是否阻止了弹窗'))
        return
      }

      // 设置打印页面内容
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${filename}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: A4;
              margin: 1cm;
            }

            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }

            body {
              font-family: "Microsoft YaHei", Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.5;
              margin: 0;
              padding: 0;
              background: white;
              color: #333;
            }

            /* 报告标题 */
            .report-title {
              text-align: center;
              margin-bottom: 20px;
            }

            .report-title h1 {
              font-size: 20pt;
              margin: 0 0 5px 0;
              color: #303133;
            }

            .report-title p {
              font-size: 14pt;
              margin: 0;
              color: #606266;
            }

            /* 卡片样式 - 更紧凑 */
            .el-card {
              margin-bottom: 15px !important;
              border: 1px solid #dcdfe6 !important;
              page-break-inside: avoid;
            }

            .el-card__header {
              background: #f5f7fa !important;
              padding: 8px 15px !important;
              font-weight: bold;
              font-size: 12pt;
              border-bottom: 1px solid #dcdfe6;
            }

            .el-card__body {
              padding: 10px 15px !important;
            }

            /* 信息布局 */
            .student-info,
            .result-summary {
              margin-bottom: 15px;
            }

            .info-item,
            .score-item {
              display: inline-block;
              margin-right: 20px;
              font-size: 11pt;
            }

            .score-value {
              font-size: 16pt;
              font-weight: bold;
              color: #409eff;
            }

            /* 雷达图 */
            .radar-chart img {
              width: 100% !important;
              height: 250px !important;
              display: block;
              margin: 10px auto;
            }

            /* 表格 */
            .el-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10pt;
              margin-top: 10px;
            }

            .el-table th,
            .el-table td {
              border: 1px solid #dcdfe6;
              padding: 4px 8px;
              text-align: left;
            }

            .el-table th {
              background: #f5f7fa;
              font-weight: bold;
            }

            /* 进度条 */
            .el-progress {
              margin: 3px 0;
            }

            /* 建议 */
            .suggestion-item {
              margin-bottom: 10px;
            }

            .suggestion-item h4 {
              font-size: 11pt;
              margin: 5px 0;
              color: #303133;
            }

            .suggestion-item ul {
              margin: 5px 0;
              padding-left: 20px;
            }

            .suggestion-item li {
              margin-bottom: 3px;
              font-size: 10pt;
            }

            /* 签名 */
            .report-signature {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #dcdfe6;
              page-break-inside: avoid;
            }

            .signature-item {
              text-align: center;
              margin-bottom: 10px;
            }

            .signature-line {
              height: 2px;
              background: #303133;
              margin-bottom: 5px;
            }

            .signature-label {
              font-size: 10pt;
              color: #606266;
            }

            /* 标签 */
            .el-tag {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10pt;
            }

            /* 避免元素被截断 */
            h1, h2, h3, h4 {
              page-break-after: avoid;
            }

            .el-card {
              page-break-inside: avoid;
            }
          </style>
        </head>
        <body>
          ${processedHTML}
        </body>
        </html>
      `)

      // 关闭文档写入
      printWindow.document.close()

      // 监听内容加载
      printWindow.onload = () => {
        // 等待图片加载完成
        setTimeout(() => {
          printWindow.print()
          // 延迟关闭窗口，给用户时间保存
          setTimeout(() => {
            printWindow.close()
            resolve()
          }, 1000)
        }, 1000)
      }

      // 备用方案
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close()
          resolve()
        }
      }, 5000)

    } catch (error) {
      reject(error)
    }
  })
}