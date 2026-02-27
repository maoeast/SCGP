/**
 * PDF导出Worker
 * 避免在主线程执行 heavy 操作
 */

self.onmessage = function(e) {
  const { elementHtml, filename, options } = e.data

  try {
    // 在Worker中无法直接访问DOM，所以不能直接使用html2canvas
    // 这里返回一个错误，提示使用其他方式
    self.postMessage({
      success: false,
      error: 'Worker方式暂时不可用，请使用主线程导出'
    })
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message
    })
  }
}