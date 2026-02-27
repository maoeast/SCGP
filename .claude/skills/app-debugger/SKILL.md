---
name: app-debugger
description: 提供浏览器和 Electron 应用的调试、分析、日志查看和问题诊断功能。当用户需要调试应用、查看运行状态、分析性能问题或排查错误时使用此 skill。
---

# 应用调试分析 Skill

此 skill 提供感官综合训练与评估系统（浏览器和 Electron 桌面应用）的调试、日志分析和问题诊断功能。

## 何时使用

- 调试 Electron 应用的主进程和渲染进程
- 查看和分析应用日志
- 诊断应用启动失败或崩溃问题
- 分析应用性能瓶颈
- 查看 Vue 组件状态和调试
- 网络请求调试和拦截
- 本地存储和数据库调试
- 检测内存泄漏
- 调试许可证和激活功能

## 调试环境配置

### 开发者工具访问

#### Electron 应用

1. **主进程调试**

   ```javascript
   // 在主进程中添加断点
   debugger;

   // 或使用 Chrome DevTools
   // 启动时添加 --inspect 参数
   electron --inspect=5858 .
   ```

2. **渲染进程调试**
   - 使用快捷键：`Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Option+I` (Mac)
   - 或在代码中调用：`mainWindow.webContents.openDevTools()`

3. **查看主进程日志**

   ```bash
   # Windows
   %APPDATA%\[app-name]\logs\

   # Mac
   ~/Library/Logs/[app-name]/

   # Linux
   ~/.config/[app-name]/logs/
   ```

#### 浏览器应用

- 使用浏览器开发者工具 (F12)
- Console - 查看日志和错误
- Network - 查看网络请求
- Application - 查看 localStorage、sessionStorage
- Performance - 性能分析
- Memory - 内存分析

## 日志系统

### 项目日志配置

查看 `src/utils/logger.ts`（如果存在）或日志相关代码：

```typescript
// 日志级别
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
}

// 使用示例
import { logger } from '@/utils/logger'

logger.info('应用启动')
logger.warn('警告信息')
logger.error('错误信息', error)
logger.debug('调试信息')
```

### 常用日志位置

#### Electron 应用日志

```
self-care-ats/
├── logs/
│   ├── main.log          # 主进程日志
│   ├── renderer.log      # 渲染进程日志
│   └── error.log         # 错误日志
```

#### 浏览器应用日志

- **Console** - 浏览器控制台输出
- **localStorage** - 本地存储（可在 Application 标签查看）
- **IndexedDB** - 数据库（可在 Application 标签查看）

## 常见调试场景

### 1. 应用启动失败

#### 检查步骤

1. **查看主进程日志**

   ```bash
   # Windows PowerShell
   Get-Content "$env:APPDATA\self-care-ats\logs\main.log" -Tail 50

   # Mac/Linux
   tail -50 ~/Library/Logs/self-care-ats/main.log
   ```

2. **检查 package.json 配置**
   - `main` 字段是否正确指向主进程入口文件
   - `dependencies` 是否完整安装
   - `scripts` 中的启动命令是否正确

3. **检查 Electron 版本兼容性**
   ```bash
   npm list electron
   ```

#### 常见问题

- **端口占用**：检查 3000 或其他端口是否被占用

  ```bash
   # Windows
   netstat -ano | findstr :3000

   # Mac/Linux
   lsof -i :3000
  ```

- **依赖缺失**：运行 `npm install` 重新安装依赖
- **配置错误**：检查 `vite.config.ts` 和 `electron-builder.yml`

### 2. 数据库相关问题

#### 数据库初始化问题

```javascript
// 查看数据库初始化日志
console.log('数据库初始化状态:', db)
console.log('表列表:', db.tables)
```

#### 查询数据库

使用 **sqlite-db-manager** Skill 提供的查询功能，或在控制台执行：

```javascript
// 在浏览器控制台或 Electron DevTools Console 中
import { getDatabase } from '@/database'

const db = await getDatabase()

// 查询所有表
const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'")
console.log('数据库表:', tables)

// 查询特定表数据
const students = db.exec('SELECT * FROM student LIMIT 10')
console.log('学生数据:', students)
```

### 3. Vue 组件调试

#### Vue DevTools

1. 安装 Vue DevTools 浏览器扩展
2. 在开发模式下自动启用
3. 查看：
   - 组件树结构
   - 组件状态（data、computed、props）
   - 事件和生命周期
   - Vuex/Pinia 状态管理

#### 组件调试代码

```vue
<script setup>
import { ref, onMounted } from 'vue'

const data = ref(null)

onMounted(() => {
  console.log('组件挂载', { props: $props, data: data.value })

  // 添加断点
  debugger
})
</script>
```

### 4. 网络请求调试

#### 拦截和查看请求

在 DevTools Network 标签：

- 查看所有 HTTP 请求
- 查看请求头、响应头
- 查看请求和响应内容
- 查看请求时间线

#### 模拟请求失败

```javascript
// 测试错误处理
import axios from 'axios'

try {
  const response = await axios.get('/api/data')
} catch (error) {
  console.error('请求失败:', error)
  console.error('响应状态:', error.response?.status)
  console.error('错误详情:', error.response?.data)
}
```

### 5. 性能分析

#### 使用 Performance 标签

1. 打开 DevTools Performance 标签
2. 点击 "Record" 开始录制
3. 执行要分析的操作
4. 停止录制，分析结果

#### 关键指标

- **FCP** (First Contentful Paint): 首次内容绘制
- **LCP** (Largest Contentful Paint): 最大内容绘制
- **TTI** (Time to Interactive): 可交互时间
- **CLS** (Cumulative Layout Shift): 累积布局偏移

### 6. 内存泄漏检测

#### 使用 Memory 标签

1. 打开 DevTools Memory 标签
2. 选择 "Heap snapshot"（堆快照）
3. 拍摄初始快照
4. 执行操作
5. 再次拍摄快照
6. 对比两次快照，查看内存增长

#### 常见内存泄漏原因

- 未清理的事件监听器
- 定时器未清除（setInterval、setTimeout）
- 全局变量引用未释放
- 闭包持有过大对象

```javascript
// 正确清理
onMounted(() => {
  const interval = setInterval(() => {}, 1000)

  onUnmounted(() => {
    clearInterval(interval) // 清理定时器
  })
})
```

## 许可证调试

### 查看激活状态

在应用中添加调试信息：

```javascript
import { getLicenseStatus } from '@/utils/licenseManager'

// 在控制台查看许可证状态
window.licenseDebug = {
  async status() {
    const status = await getLicenseStatus()
    console.table({
      valid: status.valid,
      licenseKey: status.licenseKey,
      activationCode: status.activationCode,
      expiryDate: status.expiryDate,
      daysUntilExpiry: status.daysUntilExpiry,
      machineCode: status.machineCode,
    })
    return status
  },
}

// 使用
await window.licenseDebug.status()
```

### 测试许可证验证

```javascript
// 测试不同的激活码
async function testActivationCode(code) {
  try {
    const result = await activateLicense({ activationCode: code })
    console.log('激活成功:', result)
  } catch (error) {
    console.error('激活失败:', error)
  }
}

// 测试
await testActivationCode('ABCD-1234-EFGH-5678')
```

## 调试技巧

### 1. 快速定位问题

- 使用 `console.log()` 输出关键变量
- 使用 `console.table()` 格式化输出数组/对象
- 使用 `console.trace()` 查看调用栈
- 使用 `debugger` 添加断点

### 2. 条件断点

在 DevTools 中设置条件断点：

```javascript
// 条件：只有当 id 为 1 时才暂停
id === 1
```

### 3. 监听变量变化

```javascript
// Vue 3 使用 watch
import { watch } from 'vue'

watch(someRef, (newVal, oldVal) => {
  console.log(`${someRef} 变化:`, { old: oldVal, new: newVal })
})
```

### 4. 性能标记

```javascript
// 标记性能点
performance.mark('start')

// 执行操作
doSomething()

performance.mark('end')
performance.measure('operation', 'start', 'end')

console.log('耗时:', performance.getEntriesByName('operation')[0].duration)
```

## 常用调试命令

### 命令行调试

```bash
# 启动应用并打开 DevTools
npm run dev

# 启动主进程调试
npm run dev:debug

# 查看日志文件
cat logs/main.log

# 清空日志
rm logs/*.log

# 查看运行中的进程
ps aux | grep electron

# 强制结束应用
pkill -f electron
```

### 浏览器控制台命令

```javascript
// 查看所有全局变量
Object.keys(window)

// 查看 Vue 实例
const app = document.querySelector('#app').__vue__

// 查看 Pinia/Vuex store
const store = app.$store || app.$pinia

// 查看路由
const router = app.$router

// 清除所有定时器
let id = window.setTimeout(function () {}, 0)
while (id--) {
  window.clearTimeout(id)
}
```

## Electron 特定调试

### 主进程和渲染进程通信调试

```javascript
// 主进程
import { ipcMain } from 'electron'

ipcMain.on('test-channel', (event, data) => {
  console.log('主进程收到消息:', data)
  event.reply('test-reply', '主进程回复')
})

// 渲染进程
import { ipcRenderer } from 'electron'

ipcRenderer.send('test-channel', { message: '来自渲染进程' })
ipcRenderer.on('test-reply', (event, reply) => {
  console.log('收到主进程回复:', reply)
})
```

### 文件系统操作调试

```javascript
import fs from 'fs'
import path from 'path'

// 查看应用路径
console.log('app.getPath:', {
  appData: app.getPath('appData'),
  userData: app.getPath('userData'),
  home: app.getPath('home'),
  temp: app.getPath('temp'),
})

// 读取文件
fs.readFile(path.join(app.getPath('userData'), 'database.db'), (err, data) => {
  if (err) console.error('读取失败:', err)
  console.log('文件大小:', data.length)
})
```

## 错误处理和上报

### 全局错误捕获

```javascript
// 主进程
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error)
  logger.error('Uncaught Exception', error)
})

// 渲染进程
window.onerror = (message, source, lineno, colno, error) => {
  console.error('全局错误:', { message, source, lineno, colno, error })
  logger.error('Window Error', { message, source, lineno, colno, error })
}

// Vue 错误捕获
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue 错误:', err, info)
  logger.error('Vue Error', { error: err, info })
}logger.error('Window Error', { message, source, lineno, colno, error });
};

// Vue 错误捕获
app.config.errorHandler = (err, vm, info) => {
  console.error('Vue 错误:', err, info);
  logger.error('Vue Error', { error: err, info });
};
```

## 文件位置

- 日志文件：`logs/` 目录
- 配置文件：根目录下的配置文件
- 源代码：`src/` 目录
- 数据库文件：`userData/database.db` (Electron) 或 IndexedDB (浏览器)

## 注意事项

- 生产环境不要暴露敏感信息（如数据库密码、激活码）
- 调试完成后移除或注释掉调试代码
- 使用条件编译或环境变量控制调试信息输出
- 定期清理日志文件，避免占用过多磁盘空间
