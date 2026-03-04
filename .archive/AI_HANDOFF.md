# AI 交接文档

**最后更新日期**: 2025-12-31
**项目**: 生活自理适应综合训练系统 (Self-Care ATS)
**技术栈**: Vue 3 + TypeScript + Vite + Element Plus + SQL.js + IndexedDB + Electron

---

## 项目当前状态

### 最近完成功能 (2025-12-31 下午)

#### 1. 资料库批量导入与初始化
- **211个资源**成功导出并集成到系统初始化流程
- 创建导出脚本 `scripts/export-resources.cjs`（使用 better-sqlite3）
- 导出文件: `scripts/exported-resources.ts`（已合并到 `src/database/resource-data.ts`）
- 资源数据现在作为系统初始数据的一部分，新安装即包含完整资料库

#### 2. 激活页面触屏优化
- 添加"粘贴"按钮到激活码输入框旁边
- 按钮样式与"验证激活码"按钮一致（蓝绿渐变）
- 移除重复标签文本，优化页面标题为"软件未激活"（橙红色渐变）
- 改进一体机触屏操作体验

#### 3. 开发者调试工具
- 新增"开发者调试"标签页（仅开发环境可见）
- **清空所有数据**功能：
  - 双重确认机制（确认对话框 + 输入"DELETE"验证）
  - 清空 IndexedDB、localStorage、sessionStorage
  - 删除 Electron 本地备份文件 `database_backup.db`
  - 自动重新加载页面完成初始化
- **数据统计显示**：学生数、评估数、训练记录数、用户数

#### 4. 数据加载逻辑优化
- 清空数据时跳过从备份文件和 IndexedDB 加载旧数据
- 修改 `src/database/sqljs-loader.ts` 检查 `__CLEAR_ALL_DATA__` 标志
- 确保清空后创建全新数据库并插入初始数据

---

### 历史功能记录 (2025-12-31 上午)

#### 1. 美工资源制作完成
- **31项任务封面图片**已制作完成
- 文件命名格式: `{任务编码}_cover.jpg`
- 存放路径: `assets/tasks/`
- 涵盖 6 大技能分类

---

### 历史功能记录 (2025-12-30)

#### 1. 评估报告记录保存修复
- **WeeFIM 评估报告修复**:
  - 问题：`savedAssessId` 在内部 try 块中声明，导致作用域问题
  - 修复：将 `savedAssessId: number | null = null` 声明移至函数开头
  - 文件：`src/views/assessment/weefim/Assessment.vue:365-432`

- **S-M 评估报告修复**:
  - 同样的 `savedAssessId` 作用域问题
  - 添加了空值检查：`if (savedAssessId)` 再保存报告记录
  - 文件：`src/views/assessment/sm/Assessment.vue:788-904`

#### 2. 学生详情训练记录显示修复
- **问题**: 学生详情页面训练记录不显示
- **原因**:
  - 直接使用 `db.all()` 原始数据库查询
  - 训练记录关联的任务难度等级（`level`）未正确获取
- **修复**:
  - 改用 `TaskAPI.getStudentTrainingLogs()` API 方法
  - 训练计划加载改用 `TaskAPI.getStudentTrainingPlans()` API 方法
  - 添加从 `task_level` 表子查询获取难度等级
  - 字段映射：`total_tasks` → `task_count`
- **文件**: `src/views/StudentDetail.vue`, `src/database/api.ts:1105-1127`

#### 3. 数据一致性检查日志优化
- **问题**: 控制台显示红色 error 日志（category_id 无效）
- **修复**: 将 `console.error` 改为 `console.warn`
- **原因**: 数据会自动修复，不是真正的错误
- **文件**: `src/database/api.ts:884-914`

#### 4. Electron 打包配置优化
- **目标**: 支持覆盖安装时保留用户资源文件
- **新增配置**:
  - `allowElevation`: 允许提升权限
  - `perMachine`: 安装到 Program Files
  - `deleteAppDataOnUninstall`: 卸载时不删除用户数据
  - `include`: 包含自定义 NSIS 脚本
- **自定义 NSIS 脚本**: `build/installer.nsh`
  - 使用 `SetOverwrite try` 模式（文件正在使用则跳过）
  - 卸载时询问是否保留 resources 文件夹
- **文件**: `package.json`, `build/installer.nsh`

---

### 历史功能记录 (2025-12-29)

#### 1. 训练任务封面图片存储机制确认
- **存储方式区分**:
  - **Electron 环境**: 封面图片保存为文件，存储在 `assets/tasks/{任务编码}_cover.jpg`
  - **Web 环境**: 封面图片转换为 Base64 编码，直接存入数据库 `task.cover_img` 字段

---

### 历史功能记录 (2025-12-26)

#### 1. 资源文件管理优化
- **资源路径管理**: `src/utils/resource-manager.ts`
  - 修改资源路径策略：从 `userData` 改为应用安装目录下的 `resources` 文件夹
  - Electron 环境：资源文件存放在 `{安装目录}/resources/`
  - 开发环境：资源文件存放在 `/assets/resources/`

#### 2. 打包配置更新
- **package.json**: 添加 `extraResources` 配置
  - 将 `resources` 目录打包到应用安装目录

#### 3. 登录和激活页面背景优化
- **动态流动渐变背景**: `src/views/Login.vue` 和 `src/views/Activation.vue`
  - 使用蓝色 (#3498db) 和绿色 (#2ecc71) 为主色调
  - 15 秒循环的背景流动动画

---

## 已解决的顽疾

### Bug #8: 资源批量导入时数据库插入失败
**表现**:
- 资料库批量导入时出现 `NOT NULL constraint failed: resource_meta.title` 错误
- 资源数据看起来正常，但数据库插入失败

**原因**:
```typescript
// ❌ 错误代码：使用 prepare().run() 在某些情况下参数绑定有问题
const insertResource = db.prepare(`
  INSERT INTO resource_meta
  (id, title, type, category, path, size_kb, tags, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
`);

insertResource.run(
  resource.id,
  resource.title || '',
  // ...
);
```

在 sql.js 中，使用 `prepare()` 返回的 statement 对象在某些情况下参数绑定可能存在问题，特别是在 Electron 环境下。

**解决方案**:
```typescript
// ✅ 正确代码：直接使用 db.run() 方法
const insertSQL = `
  INSERT INTO resource_meta
  (id, title, type, category, path, size_kb, tags, description, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))
`;

db.run(insertSQL, [
  resource.id,
  resource.title || '',
  resource.type || '',
  resource.category || 1,
  resource.path || '',
  resource.size_kb || 0,
  resource.tags || '',
  resource.description || ''
]);
```

**关键教训**:
- **在 sql.js 中，直接使用 `db.run(SQL, params)` 比 `prepare().run()` 更可靠**
- 特别是在处理批量插入时，建议使用 `db.run()` 直接执行
- 如果必须使用 prepared statement，确保在正确的上下文中使用
- **相关文件**:
  - `src/database/resource-data.ts:2390-2463`

---

### Bug #7: 清空数据后仍从备份加载旧数据
**表现**:
- 点击"清空所有数据"后刷新页面
- 控制台显示"加载已有数据库，跳过初始数据插入"
- 资料库没有初始化新的资源数据

**原因**:
```typescript
// src/database/sqljs-loader.ts
// 旧代码：清空标志检查不完整
if ((window as any).electronAPI) {
  // 总是从备份文件加载，即使设置了清空标志
  const fileInfo = await electronAPI.databaseFileExists(backupPath)
  if (fileInfo.exists) {
    // 加载备份数据...
  }
}

if (!shouldClear) {  // shouldClear 未定义！
  // 从 IndexedDB 加载
}
```

**解决方案**:
```typescript
// src/database/sqljs-loader.ts
// ✅ 正确代码：首先检查清空标志
const shouldClear = sessionStorage.getItem('__CLEAR_ALL_DATA__') === 'true' ||
                    new URLSearchParams(window.location.search).get('clear') === 'true'

// 跳过备份文件加载
if ((window as any).electronAPI && !shouldClear) {
  // 只有在不清空时才加载备份
}

// 跳过 IndexedDB 加载
if (!shouldClear) {
  // 只有在不清空时才从 IndexedDB 加载
}
```

**关键教训**:
- **清空数据时必须阻止所有数据源加载**：备份文件、IndexedDB、localStorage
- 在数据加载器入口处统一检查清空标志
- **相关文件**:
  - `src/database/sqljs-loader.ts:50-155`
  - `src/main.ts:20-78`

---

### Bug #6: 评估报告记录保存失败 - savedAssessId 作用域问题
**表现**:
- WeeFIM 和 S-M 评估完成后，报告生成模块不显示评估记录
- 控制台错误：`ReferenceError: savedAssessId is not defined`

**原因**:
```typescript
// ❌ 错误代码（变量在内部 try 块中声明）
const completeAssessment = async () => {
  try {
    try {
      let savedAssessId = await api.createAssessment(assessData)  // ❌ 声明在内部
    } catch (error) {
      // ...
    }
    reportAPI.saveReportRecord({
      assess_id: savedAssessId  // ❌ ReferenceError
    })
  }
}
```

**解决方案**:
```typescript
// ✅ 正确代码（变量在函数开头声明）
const completeAssessment = async () => {
  let savedAssessId: number | null = null  // ✅ 提前声明
  try {
    if (savedAssessId) {
      reportAPI.saveReportRecord({
        assess_id: savedAssessId
      })
    }
  }
}
```

**关键教训**:
- JavaScript 的 `let/const` 块级作用域：在内部 try 块中声明的变量，外部无法访问
- 多层 try-catch 中共享变量，必须在函数开头声明

---

### Bug #1: 资源下载跳转到登录页
**表现**:
- 在资料库点击"打开资源"按钮
- 页面直接跳转到登录激活页面

**原因**: 使用相对路径导致浏览器尝试导航

**解决方案**: 使用 `resourceManager` 获取完整路径或 URL

---

## 关键技术决策与约束

### 1. SQL.js 数据库操作规范 (2025-12-31 新增)
- **优先使用 `db.run()` 而非 `prepare().run()`**: 在批量插入和简单查询中更可靠
- **Prepared Statement 使用场景**: 只在需要多次执行相同 SQL 时使用
- **参数传递**: 直接使用 `db.run(SQL, paramsArray)` 格式

```typescript
// ✅ 推荐：直接执行
db.run('INSERT INTO table (col1, col2) VALUES (?, ?)', [val1, val2])

// ⚠️ 谨慎使用：prepared statement
const stmt = db.prepare('INSERT INTO table (col1, col2) VALUES (?, ?)')
stmt.run([val1, val2])
stmt.free()
```

### 2. 数据清空流程 (2025-12-31 新增)
- **清空标志**: `sessionStorage.getItem('__CLEAR_ALL_DATA__')`
- **清空范围**:
  1. IndexedDB: `indexedDB.deleteDatabase('SelfCareATS_DB')`
  2. localStorage: 保留 `theme` 和 `language`
  3. sessionStorage: 完全清空
  4. Electron 备份文件: `database_backup.db`
- **加载器检查**: `sqljs-loader.ts` 必须检查清空标志

### 3. 资源数据初始化 (2025-12-31 新增)
- **导出脚本**: `scripts/export-resources.cjs` (使用 better-sqlite3)
- **数据文件**: `src/database/resource-data.ts` 包含 211 个资源
- **初始化函数**: `initImportedResources(db)` 在 `insertInitialDataToDB` 中调用
- **使用 `db.run()` 方法**: 避免参数绑定问题

### 4. 触屏优化规范 (2025-12-31 新增)
- **粘贴按钮**: 在需要输入的表单中添加粘贴按钮
- **按钮样式**: 使用与主操作按钮一致的样式
- **触屏友好**: 按钮大小足够，间距合理

### 5. 开发者工具规范 (2025-12-31 新增)
- **环境检测**: 使用 `import.meta.env.DEV` 或 hostname 判断
- **危险操作**: 双重确认机制
  1. 第一次确认：说明操作后果
  2. 第二次确认：输入验证文本（如 "DELETE"）
- **条件渲染**: 使用 `v-if="isDevMode"` 控制显示

---

## 核心模块说明

### 1. 资源数据管理 (2025-12-31 更新)
**文件**: `src/database/resource-data.ts`

**包含内容**:
- `resourceCategories`: 6 个资源分类
- `sampleResources`: 5 个示例资源
- `importedResources`: 211 个导入的资源
- `initResourceData(db)`: 主初始化函数
- `initImportedResources(db)`: 导入资源初始化
- `formatFileSize()`: 文件大小格式化
- `getFileIcon()`: 获取文件图标
- `getFileIconColor()`: 获取文件图标颜色

**初始化流程**:
```typescript
// src/database/init.ts:638
const { initResourceData } = await import('./resource-data')
initResourceData(database)
```

### 2. 资源导出脚本 (2025-12-31 新增)
**文件**: `scripts/export-resources.cjs`

**功能**:
- 从 Electron 备份数据库导出资源数据
- 使用 `better-sqlite3` 读取 SQLite 数据库
- 生成 TypeScript 代码文件

**使用方法**:
```bash
node scripts/export-resources.cjs
```

**依赖**: `better-sqlite3` (已安装)

### 3. 开发者调试组件 (2025-12-31 新增)
**文件**: `src/views/System.vue`

**功能**:
- 清空所有数据（双确认）
- 数据统计显示
- 仅在开发环境显示

**环境检测**:
```typescript
const isDevMode = computed(() => {
  return import.meta.env.DEV ||
         window.location.hostname === 'localhost' ||
         window.location.port === '5173'
})
```

---

## 待办事项

### 高优先级
- [x] **美工资源制作**: 根据任务编码清单制作 31 个封面图片 (完成)
- [x] **资源文件路径管理**: 将资源文件从 userData 迁移到应用安装目录 (完成)
- [x] **文件打开功能增强**: 添加系统默认程序打开和错误提示 (完成)
- [x] **登录/激活页面背景优化**: 实现动态流动渐变背景 (完成)
- [x] **评估报告记录保存修复**: 修复 WeeFIM 和 S-M 评估报告记录保存问题 (完成)
- [x] **学生详情训练记录显示修复**: 修复训练记录不显示问题 (完成)
- [x] **资料库批量导入**: 将 211 个资源集成到系统初始化 (完成)
- [x] **激活页面触屏优化**: 添加粘贴按钮 (完成)
- [x] **开发者调试工具**: 添加清空数据功能 (完成)

### 中优先级
- [ ] **系统配置实时同步**: 配置修改后立即刷新所有相关组件
- [ ] **备份计划任务**: 实现自动备份的定时任务
- [ ] **系统日志记录**: 记录关键操作日志
- [ ] **数据导出优化**: 支持选择性导出（按时间范围、按学生）
- [ ] **测试覆盖安装保留用户文件**: 验证 NSIS 自定义脚本功能

### 低优先级
- [ ] **页面切换动画**: 如果要实现，使用 `mode="default"` 避免白屏
- [ ] **系统主题切换**: 支持亮色/暗色主题
- [ ] **多语言支持**: i18n 国际化
- [ ] **性能监控**: 集成性能监控工具

---

## 应用启动方式

### Web 开发环境
```bash
npm run dev
# 或强制重新构建
npm run dev:force
```

### Electron 开发环境
```bash
# 同时启动 Vite 和 Electron
npm run electron:dev

# 或分步启动
npm run dev          # 终端1：启动 Vite
npm run electron     # 终端2：启动 Electron
```

### 生产构建
```bash
# Web 构建
npm run build:web

# Electron 构建（Windows）
npm run build:electron:win

# Electron 构建（macOS）
npm run build:electron:mac

# Electron 构建（Linux）
npm run build:electron:linux
```

### 项目依赖
```bash
npm install

# 如果需要添加新的导出脚本依赖
npm install better-sqlite3 --save-dev
```

---

## 重要文件索引

### 最新修改的文件 (2025-12-31)
1. `src/database/resource-data.ts` - 资源数据定义和初始化（新增 211 个资源）
2. `src/database/sqljs-loader.ts` - 数据加载器（添加清空标志检查）
3. `src/main.ts` - 应用入口（优化数据清空逻辑）
4. `src/views/Activation.vue` - 激活页面（添加粘贴按钮、UI 优化）
5. `src/views/System.vue` - 系统设置页面（新增开发者调试标签）
6. `scripts/export-resources.cjs` - 资源导出脚本（新增）
7. `src/utils/resource-importer.ts` - 资源导入器（允许文件不存在时继续导入）

### 最近修改的脚本
1. `scripts/export-resources.cjs` - 资源导出脚本（新增）
2. `scripts/exported-resources.ts` - 导出的资源数据（已合并到 resource-data.ts）

---

## 常见问题排查

### 问题: 资料库数据为空
**排查步骤**:
1. 检查是否是新安装的系统
2. 查看控制台是否有"开始初始化资源数据..."日志
3. 检查是否有"成功插入 211 条资源数据"的日志
4. 如果没有，检查 `initImportedResources` 函数是否被调用
5. **相关文件**: `src/database/resource-data.ts:2390`, `src/database/init.ts:638`

### 问题: 资源批量导入失败
**排查步骤**:
1. 检查是否使用了 `db.run()` 而非 `prepare().run()`
2. 确认资源数据的 `title` 字段不为空
3. 查看控制台的详细错误日志
4. **相关文件**: `src/database/resource-data.ts:2407`

### 问题: 清空数据后仍有旧数据
**排查步骤**:
1. 检查 `sqljs-loader.ts` 是否检查了清空标志
2. 确认 IndexedDB、localStorage、sessionStorage 都被清空
3. Electron 环境确认 `database_backup.db` 被删除
4. **相关文件**: `src/database/sqljs-loader.ts:50`, `src/main.ts:20-78`

### 问题: 评估报告记录不显示
**排查步骤**:
1. 检查 `savedAssessId` 是否在函数开头声明
2. 确认 `savedAssessId` 在使用前是否已赋值
3. 检查是否有空值检查：`if (savedAssessId)`
4. **相关文件**: `src/views/assessment/weefim/Assessment.vue:365`

---

## 下次会话启动检查清单

- [ ] 阅读本文档最新的"项目当前状态"章节
- [ ] 查看"待办事项"了解当前优先级
- [ ] 检查"已解决的顽疾"避免重复犯错
- [ ] **特别注意**: SQL.js 操作优先使用 `db.run()` 而非 `prepare().run()`
- [ ] **特别注意**: 数据清空时必须在所有加载器入口检查清空标志
- [ ] **特别注意**: 资源数据初始化使用 211 个导入的资源
- [ ] 特别注意：数据库版本号必须保持一致
- [ ] 特别注意：资源文件路径根据环境区分处理
- [ ] 特别注意：封面图片在 Electron 和 Web 环境下的存储方式不同
- [ ] 特别注意：变量作用域问题 - 多层 try-catch 中共享变量必须在函数开头声明
- [ ] 特别注意：优先使用 API 方法而非直接数据库查询
- [ ] 如有新的复杂 Bug，记得更新本文档

---

## 附录：211个资源分类统计

### 资源分类概览
- **文档资料 (category=1)**: 53 个 PDF/Word 文档
  - 包含: 生活自理训练指南、评估手册、教学课件等
- **视频教程 (category=2)**: 86 个 MP4 视频
  - 包含: 学龄前自理训练、影子老师培训、星星雨教育等
- **音频资料 (category=3)**: 无
- **压缩包 (category=4)**: 无
- **图片素材 (category=5)**: 72 个 JPG/PNG 图片
  - 包含: 洗手、刷牙、穿衣等步骤分解图
- **其他资源 (category=6)**: 无

**总计**: 211 个资源

---

**文档维护者**: Claude (AI Assistant)
**下次更新**: 下一个开发会话结束时
