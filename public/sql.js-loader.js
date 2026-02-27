// SQL.js 加载器
// 这个文件用于正确加载SQL.js模块

// 使用动态加载来避免Vite的模块解析问题
(function() {
  // 如果已经加载，直接返回
  if (window.initSqlJs) {
    return Promise.resolve(window.initSqlJs);
  }

  // 创建Promise来处理异步加载
  const promise = new Promise((resolve, reject) => {
    // 创建script标签
    const script = document.createElement('script');
    script.src = '/node_modules/sql.js/dist/sql-wasm.js';
    script.async = true;

    script.onload = function() {
      if (window.initSqlJs) {
        resolve(window.initSqlJs);
      } else {
        reject(new Error('SQL.js加载失败：未找到initSqlJs函数'));
      }
    };

    script.onerror = function() {
      reject(new Error('SQL.js加载失败：script加载错误'));
    };

    // 添加到文档
    document.head.appendChild(script);
  });

  // 缓存Promise
  window.initSqlJsPromise = promise;

  return promise;
})();