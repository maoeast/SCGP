# 技术债清理执行计划：docxExporter 废弃代码清理与器材 IEP 导出统一化

> **文档性质**：Codex / 代理专用执行计划与操作指南\
> **适用对象**：Codex、开发代理、代码维护者\
> **基线分支**：`main`（版本 1.1.4 / 代码基线 `af5f33c`）\
> **关联上下文**：`.continue-here.md`（遗留项：equipment 器材 IEP 导出对齐统一层；docxExporter 4 个无调用方函数待专项清理）\

---

## 1. 背景与现状分析

### 1.1 现状事实
在 1.1.4 版本中，系统完成了统一报告导出分发层 `exportReport`（`src/utils/report-export.ts`）的建设，并改造了 19 个评估量表的 `Report.vue`，实现：
1. 系统设置中“报告页眉文本”自动注入（Word 走 docx Header，HTML 走页眉条）；
2. 系统设置中“包含学生头像”自动查库并浮动排版（Word 绝对定位浮动头像，HTML 浮动头像）；
3. 系统设置中“默认导出格式”（Word / HTML）全局策略生效。

### 1.2 现存技术债
1. **`src/views/equipment/Records.vue` 仍绕过统一分发层**：
   - 目前仍直接导入并调用 `exportEquipmentIEPToWord`（`src/utils/docxExporter.ts:771`）；
   - 该函数仅手动调用旧版 `readReportHeaderText` 注入页眉，无法享受 HTML 导出、无法享受学生头像排版、不响应全局默认格式设置。
2. **`src/utils/docxExporter.ts` 存在 4 个完全无调用方的死函数**：
   - `exportSMToWord`（第 295–408 行，0 处调用）；
   - `exportWeeFIMToWord`（第 409–515 行，0 处调用）；
   - `exportCSIRSToWord`（第 516–631 行，0 处调用）；
   - `exportConnersToWord`（第 632–770 行，0 处调用）；
   - 上述量表的导出逻辑已全部迁移至 `src/utils/assessment-word-builders.ts` 并在各自 `Report.vue` 中走 `exportReport`。
3. **类型耦合残留**：
   - `src/utils/assessment-word-builders.ts`（第 4–9 行）仍从 `./docxExporter` 导入 4 个接口类型：`ConnersExportData`、`CSIRSExportData`、`SMExportData`、`WeeFIMExportData`。

---

## 2. 目标与非目标

### 2.1 目标
1. 将 `equipment`（器材训练）的 IEP 评估报告导出改造为构造 `WordExportPayload`，接入统一分发层 `exportReport(payload, { studentId })`；
2. 彻底清理 `docxExporter.ts` 中的 4 个死函数；
3. 将 4 个残留导出数据类型迁移至更合理的定义位置（`assessment-word-builders.ts` 或专用类型文件），解除对旧导出工具的类型依赖；
4. 若 `exportEquipmentIEPToWord` 也被 `exportReport` 替代，则 `docxExporter.ts` 将无任何运行时函数，可完全退役或保留精简类型定义；
5. 保证 `npm run verify:core`（`type-check`、`node --test`、`jiti` 测试）全绿。

### 2.2 非目标
1. 不改动器材训练的 UI 交互与业务数据流；
2. 不改动已闭环的 19 个量表报告导出逻辑；
3. 不引入任何额外 npm 依赖。

---

## 3. 详细实施步骤（分阶段实施）

### Phase 1: 构造器材 IEP 报告 Payload 构建函数

在 `src/utils/assessment-word-builders.ts`（或新建 `src/utils/equipment-word-builder.ts`）中新增构建器函数：

```ts
export interface EquipmentIEPRecordDetail {
  equipmentName: string
  equipmentCategory: string
  score: number
  promptLevel: number
  duration: number
  date: string
  remark?: string
  performance: string
  suggestions: string[]
}

export interface EquipmentIEPExportData {
  student: {
    name: string
    gender: string
    age: number
  }
  reportDate: string
  summary: {
    totalRecords: number
    categoryBreakdown: Record<string, number>
    averageScore: number
  }
  records: EquipmentIEPRecordDetail[]
}

export function buildEquipmentIepReportPayload(
  data: EquipmentIEPExportData,
  filename: string
): WordExportPayload
```

**Payload 内容映射规则**（对齐原 `exportEquipmentIEPToWord` 呈现的全部信息）：
1. `title`: `'器材训练 IEP 评估报告'`
2. `filename`: `filename`
3. `meta`:
   - 姓名：`data.student.name`
   - 性别：`data.student.gender`
   - 年龄：`${data.student.age}岁`
   - 报告日期：`data.reportDate`
4. `sections`:
   - Section 1（训练统计，表格/kv-table）：
     - 总训练次数：`${data.summary.totalRecords}次`
     - 平均得分：`data.summary.averageScore.toFixed(1)`
     - 平均星级：星级符号文本
   - Section 2（分类统计，表格）：
     - 列名：`['感官领域', '训练次数']`
     - 数据行：映射领域中文名（触觉/嗅觉/视觉/听觉/味觉/本体觉/感官综合箱）及对应训练次数
   - Section 3（训练记录详情）：
     - 逐条记录展开为子表格或段落：器材名称、训练日期、训练时长、动作表现评分、辅助等级、表现分析与个别化训练建议。

### Phase 2: 改造 `src/views/equipment/Records.vue`

1. **更新导入**：
   - 移除：`import { exportEquipmentIEPToWord, type EquipmentIEPExportData } from '@/utils/docxExporter'`
   - 引入：`import { exportReport } from '@/utils/report-export'`
   - 引入：`import { buildEquipmentIepReportPayload, type EquipmentIEPExportData } from '@/utils/assessment-word-builders'`（或对应位置）
2. **改造 `exportAllIEP` 函数**（第 670–678 行）：
   ```ts
   const filename = `${studentInfo.value.name}${entrySuffix}_器材训练IEP报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}`

   const payload = buildEquipmentIepReportPayload(exportData, filename)
   await exportReport(payload, { studentId: studentInfo.value.id })
   ElMessage.success('报告导出成功')
   ```

### Phase 3: 清理 `src/utils/docxExporter.ts`

1. 确认无任何文件调用以下 5 个函数：
   - `exportSMToWord`
   - `exportWeeFIMToWord`
   - `exportCSIRSToWord`
   - `exportConnersToWord`
   - `exportEquipmentIEPToWord`
2. 将 `SMExportData`、`WeeFIMExportData`、`CSIRSExportData`、`ConnersExportData` 移动至 `src/utils/assessment-word-builders.ts`；
3. 将 `docxExporter.ts` 彻底删除，或仅保留兼容性类型 re-export（若确认无其他隐式引用，建议直接删除该文件）；
4. 同步移除不再使用的私有辅助函数（`createTitle`、`createHeading1`、`createInfoRow`、`createLegacyReportHeader`、`readReportHeaderText` 等）。

---

## 4. 验证门禁与命令

实施完成后，按顺序执行以下验证：

1. **类型检查**：
   ```bash
   npm run type-check
   ```
   *预期结果*：0 error，TypeScript 类型检查完全通过。

2. **核心守护套件验证**：
   ```bash
   npm run verify:core
   ```
   *预期结果*：全部测试全绿（包含 155 项 Node 测试与 11 项 jiti 授权测试）。

3. **静态打包与构建验证**：
   ```bash
   npm run build:web
   ```
   *预期结果*：Vite 生产打包成功，无缺失导入或构建错误。

---

## 5. 交接与变更记录

清理完成后，按规则同步更新：
1. `.continue-here.md`：从 `Relevant Files` 和 `Key Decisions` 中移除待清理项，标记技术债已闭环；
2. 检查 `git status --short`，确保无无关格式噪音。

---

## 6. 供 Codex 执行的 Copy-Paste Prompt

```text
请阅读并严格执行技术债清理计划 `docs/plans/2026-10-13-docx-exporter-debt-cleanup-plan.md`：
1. 在 `src/utils/assessment-word-builders.ts` 中实现 `buildEquipmentIepReportPayload`，将器材训练 IEP 报告结构化转换为 `WordExportPayload`。
2. 改造 `src/views/equipment/Records.vue`，使其调用 `exportReport(payload, { studentId: studentInfo.value.id })`，统一走系统的页眉、头像与格式分发层。
3. 迁移 `src/utils/docxExporter.ts` 中的数据类型至 `src/utils/assessment-word-builders.ts`，并彻底清理 `docxExporter.ts` 中的 5 个无调用方导出函数（exportSMToWord、exportWeeFIMToWord、exportCSIRSToWord、exportConnersToWord、exportEquipmentIEPToWord）及废弃私有工具。
4. 运行 `npm run type-check` 和 `npm run verify:core`，确保 0 报错、全部测试通过。
5. 更新 `.continue-here.md`，移除非活跃的遗留项描述。
```
