/**
 * 简化的PDF导出方法
 * 不使用html2canvas，而是直接使用window.print()
 */

export function simplePrintToPDF(filename: string): void {
  // 创建一个打印样式
  const printStyle = document.createElement('style')
  printStyle.textContent = `
    @media print {
      body * {
        visibility: hidden;
      }
      #report-content, #report-content * {
        visibility: visible;
      }
      #report-content {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
      }
      .report-header {
        display: none !important;
      }
      .no-print {
        display: none !important;
      }
    }
  `

  document.head.appendChild(printStyle)

  // 打印对话框
  window.print()

  // 移除样式
  setTimeout(() => {
    document.head.removeChild(printStyle)
  }, 1000)
}

/**
 * 将页面内容转换为图片并下载
 */
export async function exportAsImage(filename: string): Promise<void> {
  const element = document.getElementById('report-content')
  if (!element) {
    throw new Error('找不到报告内容')
  }

  // 尝试使用较低的质量
  const canvas = await html2canvas(element, {
    scale: 1,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false,
    removeContainer: true
  })

  // 转换为图片并下载
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${filename}.png`
      a.click()
      URL.revokeObjectURL(url)
    }
  }, 'image/png', 0.8)
}