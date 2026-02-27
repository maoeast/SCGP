# SIC-ADS 数据流图 (Data Flow Diagram)

**文档日期**: 2026-02-05
**适用阶段**: Phase 2.0 重构
**绘制工具**: Mermaid Diagram

---

## 1. 评估创建流程 (Assessment Creation Flow)

```mermaid
flowchart TD
    A[用户选择学生] --> B[加载评估页面 Assessment.vue]
    B --> C[DatabaseAPI.getQuestions]
    C --> D[sql.js 查询题目表]
    D --> E[渲染评估表单]

    E --> F[用户填写答案]
    F --> G[点击提交]

    G --> H[calculateScores 计算分数]
    H --> I{效度检查 PI/NI}
    I -->|通过| J[DatabaseAPI.saveAssessment]
    I -->|警告| J
    I -->|失败| K[显示错误提示]

    J --> L[sql.js INSERT 评估记录]
    L --> M[SQLWrapper.saveToStorage]
    M --> N[IPC: write-database-file]

    N --> O[Main Process 接收]
    O --> P[fs.writeFile + fs.fsync]
    P --> Q[数据库持久化成功]

    Q --> R[跳转到报告页面 Report.vue]
    R --> S[DatabaseAPI.getAssessment]
    S --> T[IEPGenerator 生成评语]
    T --> U[渲染报告]

    style A fill:#e1f5ff
    style U fill:#c8e6c9
    style N fill:#fff9c4
    style P fill:#ffccbc
```

### 关键 IPC 通讯点

| 位置 | IPC Channel | 数据大小 | 频率 |
|:-----|:------------|:---------|:-----|
| `saveToStorage()` | `write-database-file` | 1-5 MB | 每次 |
| `exportReport()` | `save-file` | 100-500 KB | 按需 |

---

## 2. 训练记录写入流程 (Training Record Write Flow)

```mermaid
flowchart TD
    A[游戏结束 GamePlay.vue] --> B[收集训练数据]
    B --> C{数据完整性检查}

    C -->|完整| D[calculateAbilityTags]
    C -->|缺失| E[记录错误日志]

    D --> F[计算能力标签]
    F --> G[DatabaseAPI.createTrainingRecord]
    G --> H[sql.js INSERT training_records]

    H --> I[SQLWrapper 自动保存触发]
    I --> J[SQLWrapper.saveToStorage]
    J --> K[IPC: write-database-file]

    K --> L[Main Process 接收]
    L --> M[写入 IndexedDB]
    M --> N[写入本地文件]

    N --> O[DatabaseAPI.updateStudentStats]
    O --> P[sql.js UPDATE students]
    P --> Q[再次触发 saveToStorage]

    Q --> R[IEPGenerator.generateReport]
    R --> S[生成评语和建议]

    S --> T[显示训练完成页面]
    T --> U[提供 IEP 查看入口]

    style A fill:#e1f5ff
    style S fill:#c8e6c9
    style K fill:#fff9c4
    style N fill:#ffccbc
    style Q fill:#ffcdd2
```

### 性能瓶颈分析

| 环节 | 当前耗时 | 优化后耗时 | 优化方案 |
|:-----|:---------|:----------|:---------|
| `calculateAbilityTags()` | 50-100ms | 50-100ms | 无需优化 |
| `createTrainingRecord()` | 10-20ms | 10-20ms | 无需优化 |
| `saveToStorage()` 第1次 | 100-300ms | **批量后** | 防抖合并 |
| `saveToStorage()` 第2次 | 100-300ms | **跳过** | 2秒内合并 |
| `updateStudentStats()` | 20-50ms | 20-50ms | 无需优化 |

### 优化方案：防抖保存

```typescript
// 当前流程
INSERT training_records → saveToStorage → IPC (100-300ms)
UPDATE students → saveToStorage → IPC (100-300ms)
// 总耗时: 200-600ms

// 优化后流程
INSERT training_records → 标记 Dirty (0ms)
UPDATE students → 标记 Dirty (0ms)
→ 2秒防抖后 → 一次性 saveToStorage → IPC (100-300ms)
// 总耗时: 100-300ms (节省 50%+)
```

---

## 3. 器材训练 IEP 生成流程 (Equipment IEP Generation Flow)

```mermaid
flowchart TD
    A[用户点击查看 IEP] --> B[Records.vue: viewIEP]
    B --> C[读取训练记录]
    C --> D[ability_tags JSON 解析]

    D --> E{ensureArray 检查}
    E -->|数组| F[直接使用]
    E -->|字符串| G[JSON.parse]
    E -->|其他| H[返回空数组]

    F --> I[IEPGenerator.generateEquipmentReport]
    G --> I
    H --> I

    I --> J[查询器材详情]
    J --> K[DatabaseAPI.getEquipmentById]
    K --> L[sql.js 查询]

    L --> M[根据 ability_tags 匹配模板]
    M --> N[生成评语和建议]

    N --> O[渲染 IEP 对话框]
    O --> P[用户操作]

    P --> Q{导出 Word?}
    Q -->|是| R[docxExporter.exportEquipmentIEPToWord]
    Q -->|否| S[关闭对话框]

    R --> T[IPC: save-file]
    T --> U[Main Process 保存文件]
    U --> V[下载完成]

    style D fill:#fff9c4
    style I fill:#e1f5ff
    style T fill:#ffccbc
    style V fill:#c8e6c9
```

### ability_tags 解析风险点

| 位置 | 操作 | 风险 | 缓解措施 |
|:-----|:-----|:-----|:---------|
| `Records.vue:230` | `JSON.parse(record.ability_tags)` | 中 | 已在 try-catch 中 |
| `Records.vue:293` | `ensureArray(record.ability_tags)` | 低 | 函数已保护 |
| `Records.vue:371` | `ensureArray(record.ability_tags)` | 低 | 函数已保护 |
| `Records.vue:461` | `ensureArray(record.ability_tags)` | 低 | 函数已保护 |

---

## 4. 重构后的数据库架构流程 (Refactored Database Architecture)

```mermaid
flowchart LR
    subgraph MainThread["主线程 (Renderer Process)"]
        A[Views/Components] --> B[DatabaseBridge]
        B --> C[CommandQueue]
    end

    subgraph WorkerThread["数据库 Worker Thread"]
        D[Worker Message Handler] --> E[DatabaseAPI]
        E --> F[SQLWrapper]
        F --> G[sql.js]
        G --> H[DebouncedSave]
    end

    subgraph MainProcess["Electron Main Process"]
        I[IPC Handlers] --> J[FileSystem Operations]
    end

    subgraph Storage["存储层"]
        K[(IndexedDB)]
        L[(Local Files)]
    end

    C -->|postMessage| D
    H -->|IPC| I
    I --> J
    J --> K
    J --> L

    style A fill:#e1f5ff
    style G fill:#c8e6c9
    style I fill:#fff9c4
    style K fill:#ffccbc
    style L fill:#ffccbc
```

### Worker 通讯优化

**模式 1: 单次查询**
```typescript
// 主线程
const result = await bridge.query('SELECT * FROM students')

// Worker
postMessage({ id: 1, result: [...] })
```

**模式 2: 批量查询（优化）**
```typescript
// 主线程
const results = await bridge.batch([
  { sql: 'SELECT * FROM students', params: [] },
  { sql: 'SELECT * FROM training_records', params: [] }
])

// Worker
postMessage({ id: 1, results: [[...], [...]] })
```

---

## 5. 数据迁移流程 (Data Migration Flow)

```mermaid
flowchart TD
    A[开始迁移] --> B[创建备份 backup.db]
    B --> C[验证备份成功]

    C --> D[创建新表 sys_training_resource]
    D --> E[创建新表 sys_tags]
    E --> F[创建新表 sys_resource_tag_map]

    F --> G[读取 equipment_catalog]
    G --> H[遍历 62 个器材]

    H --> I[解析 ability_tags JSON]
    I --> J{解析成功?}
    J -->|是| K[创建/获取标签记录]
    J -->|否| L[记录错误, 跳过]

    K --> M[写入 sys_resource_tag_map]
    L --> M
    M --> N{还有器材?}
    N -->|是| H
    N -->|否| O[迁移 teacher_fav]

    O --> P[写入 sys_favorites]
    P --> Q[运行验证脚本]

    Q --> R{验证通过?}
    R -->|是| S[迁移成功]
    R -->|否| T[Rollback]

    T --> U[删除新表]
    U --> V[恢复备份]
    V --> W[迁移失败]

    S --> X[更新 legacy_id 和 legacy_source]
    X --> Y[完成]

    style B fill:#fff9c4
    style Q fill:#e1f5ff
    style S fill:#c8e6c9
    style T fill:#ffcdd2
    style W fill:#ffcdd2
```

### 迁移验证检查点

| 检查项 | SQL 查询 | 预期结果 |
|:-------|:---------|:---------|
| 资源数量 | `SELECT COUNT(*) FROM sys_training_resource` | = 62 |
| 标签数量 | `SELECT COUNT(*) FROM sys_tags` | > 0 |
| 关联数量 | `SELECT COUNT(*) FROM sys_resource_tag_map` | > 0 |
| 收藏数量 | `SELECT COUNT(*) FROM sys_favorites` | = 原 teacher_fav 数量 |
| legacy_id | `SELECT COUNT(*) FROM sys_training_resource WHERE legacy_id IS NOT NULL` | = 62 |

---

## 6. 资源上传流程 (Resource Upload Flow)

```mermaid
flowchart TD
    A[用户选择图片] --> B[ResourceUpload.vue]
    B --> C[File Reader 读取]
    C --> D[发送到 Image Worker]

    D --> E[ImageWorker.compressImage]
    E --> F[检测 browser-image-compression]

    F -->|可用| G[压缩到 1024px, WebP 0.8]
    F -->|不可用| H[OffscreenCanvas 降级]

    G --> I[生成 Blob]
    H --> I

    I --> J[ArrayBuffer 转换]
    J --> K[IPC: save-asset]

    K --> L[Main Process 接收]
    L --> M[生成 UUID 文件名]
    M --> N[写入 resource_assets/]

    N --> O[返回文件路径]
    O --> P[DatabaseAPI.createResource]

    P --> Q[写入 sys_training_resource]
    Q --> R[保存 cover_image 路径]

    R --> S[触发 FTS5 更新]
    S --> T[更新全文检索索引]

    T --> U[显示上传成功]
    U --> V[预览图片 resource://uuid.webp]

    style D fill:#e1f5ff
    style K fill:#fff9c4
    style N fill:#ffccbc
    style V fill:#c8e6c9
```

### resource:// 协议处理流程

```mermaid
flowchart LR
    A[<img src="resource://abc.webp">] --> B[Renderer Process]
    B --> C[resource:// Protocol Handler]

    C --> D[safeResolveResource]
    D --> E{路径安全检查}

    E -->|通过| F[解析物理路径]
    E -->|失败| G[返回 404]

    F --> H[net.fetch file://]
    H --> I[返回图片数据]
    I --> J[渲染图片]

    G --> K[显示错误占位符]

    style D fill:#fff9c4
    style E fill:#ffcdd2
    style I fill:#c8e6c9
```

### 安全检查点

| 检查项 | 代码 | 防御 |
|:-------|:-----|:-----|
| 路径遍历 | `../` 检测 | `path.resolve()` + 前缀校验 |
| 目录访问 | 检查是否为目录 | `fs.statSync().isFile()` |
| 路径注入 | 特殊字符过滤 | 正则校验 `^[a-zA-Z0-9-_.]+$` |

---

## 7. 备份恢复流程 (Backup & Restore Flow)

```mermaid
flowchart TD
    A[用户点击备份] --> B[DataBackupService]
    B --> C[通知 Worker 暂停写入]

    C --> D[Worker 标记 isBackingUp]
    D --> E[强制 Flush 数据]

    E --> F[IPC: create-backup]
    F --> G[Main Process 接收]

    G --> H[读取 database.sqlite]
    H --> I[读取 resource_assets/]

    I --> J[archiver 创建 ZIP]
    J --> K[流式打包]

    K --> L[生成 backup-YYYYMMDD.zip]
    L --> M[通知 Worker 恢复写入]

    M --> N[Worker 清除 isBackingUp]
    N --> O[备份完成]

    O --> P[显示下载链接]

    Q[用户选择恢复] --> R[上传 ZIP 文件]
    R --> S[解压到临时目录]

    S --> T[验证数据库完整性]
    T --> U{验证通过?}

    U -->|是| V[关闭当前数据库]
    V --> W[替换数据库文件]
    W --> X[重启 Worker]

    X --> Y[重新加载数据]
    Y --> Z[恢复完成]

    U -->|否| AA[显示错误]
    AA --> AB[恢复失败]

    style D fill:#fff9c4
    style J fill:#e1f5ff
    style U fill:#ffcdd2
    style Z fill:#c8e6c9
```

---

## 8. IPC 通讯汇总表 (IPC Communication Summary)

| IPC Channel | 方向 | 数据大小 | 频率 | 阻塞风险 |
|:------------|:-----|:---------|:-----|:---------|
| `write-database-file` | Renderer → Main | 1-5 MB | 高 | 中 |
| `read-database-file` | Renderer → Main | 1-5 MB | 中 | 中 |
| `save-file` | Renderer → Main | 100-500 KB | 低 | 低 |
| `read-file-as-base64` | Renderer → Main | 100-500 KB | 高 | 中 |
| `save-asset` | Renderer → Main | 50-200 KB | 中 | 低 |
| `delete-asset` | Renderer → Main | < 1 KB | 低 | 无 |
| `create-backup` | Renderer → Main | 1-10 MB | 低 | 高 |
| `restore-backup` | Renderer → Main | 1-10 MB | 极低 | 高 |

### 优化建议

1. **write-database-file**: 实施防抖 + 批量
2. **read-file-as-base64**: 改用 `resource://` 协议
3. **create-backup**: 使用流式处理，避免内存溢出

---

**文档生成时间**: 2026-02-05
**相关文档**: `docs/audit-report.md`, `重构实施技术规范.md`
**维护者**: 首席实施工程师
