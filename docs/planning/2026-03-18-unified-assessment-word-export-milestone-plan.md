# 统一评估报告 Word 导出功能里程碑调研与实施规划

**日期**: 2026-03-18  
**建议版本**: `v1.3`  
**建议里程碑名称**: `Unified Assessment Word Export`

---

## 1. 背景与目标

当前系统内各量表评估报告的导出体验不统一：

- 部分量表页面仍残留不可用或效果很差的“导出 PDF”按钮
- 部分量表已经具备 Word 导出能力，但实现方式分散
- 特教老师更需要可二次编辑的 `.docx` 文档，而不是浏览器打印式 PDF

本次里程碑的目标是：

1. 复用现有可工作的 Word 导出技术栈，不引入新 npm 库
2. 把报告导出能力抽象为统一的公共基建
3. 将评估报告页统一收敛为“导出 Word”
4. 至少以 SDQ 或 CBCL 为主完成可用验证

---

## 2. 关键调研结论

### 2.1 IEP 报告导出功能具体在哪个文件里？

当前明确可工作的 IEP 报告 Word 导出逻辑位于：

- [src/views/games/IEPReport.vue](/home/DONG/Mycode/SCGP/src/views/games/IEPReport.vue)

该文件中：

- `exportWord()` 直接内联构建 `docx` 文档结构
- 使用 `Packer.toBlob(doc)` 生成文件
- 通过浏览器 `Blob + URL.createObjectURL + a.click()` 触发下载

### 2.2 IEP 报告用的是什么依赖库？

IEP 报告使用的底层依赖是：

- `docx`

项目内已有的相关公共依赖还有：

- `file-saver`

### 2.3 项目里是否已经有公共 Word 导出实现？

有，而且比 IEP 页面内联实现更适合作为复用基础：

- [src/utils/docxExporter.ts](/home/DONG/Mycode/SCGP/src/utils/docxExporter.ts)

这个文件已经为多个量表提供了专用 Word 导出函数：

- `exportSMToWord`
- `exportWeeFIMToWord`
- `exportCSIRSToWord`
- `exportConnersToWord`
- `exportEquipmentIEPToWord`

因此，**严格意义上更合理的“复用基线”不是只抽 IEP 页面本身，而是统一吸收 IEP 页面和 `docxExporter.ts` 的能力**。

### 2.4 当前项目里是否存在“统一评估报告外壳组件”？

没有发现单一的、可承载所有报告页导出按钮的公共外壳组件。

评估报告基本都是各自独立的：

- [src/views/assessment/sdq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sdq/Report.vue)
- [src/views/assessment/cbcl/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/cbcl/Report.vue)
- [src/views/assessment/srs2/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/srs2/Report.vue)
- [src/views/assessment/csirs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/csirs/Report.vue)
- [src/views/assessment/conners-psq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-psq/Report.vue)
- [src/views/assessment/conners-trs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-trs/Report.vue)
- [src/views/assessment/sm/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sm/Report.vue)
- [src/views/assessment/weefim/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/weefim/Report.vue)

所以本次改造应理解为：

- 抽一个统一的 Word 导出工具层
- 再逐个报告页接入

而不是修改一个真正存在的“总壳组件”。

---

## 3. 当前导出能力现状

### 3.1 只有 PDF / 占位导出的量表

这些页面目前主要还是 PDF 按钮，且不少只是占位提示：

- [src/views/assessment/sdq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sdq/Report.vue)
- [src/views/assessment/cbcl/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/cbcl/Report.vue)
- [src/views/assessment/srs2/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/srs2/Report.vue)

### 3.2 同时存在 PDF 和 Word 的量表

- [src/views/assessment/csirs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/csirs/Report.vue)
- [src/views/assessment/conners-psq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-psq/Report.vue)
- [src/views/assessment/conners-trs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-trs/Report.vue)

这些页面的 Word 已接入 `docxExporter.ts`，但 PDF 按钮仍在。

### 3.3 已以 Word 为主的量表

- [src/views/assessment/sm/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sm/Report.vue)
- [src/views/assessment/weefim/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/weefim/Report.vue)

这两类已经不再是“PDF-only”，但导出逻辑仍是量表专用函数，不够统一。

### 3.4 当前旧统一导出层的问题

项目里还有一套旧的“统一报告导出模块”：

- [src/utils/reportExporter.ts](/home/DONG/Mycode/SCGP/src/utils/reportExporter.ts)
- [src/utils/exportUtils.ts](/home/DONG/Mycode/SCGP/src/utils/exportUtils.ts)

但其中的 Word 导出本质是：

- 用 HTML 拼接内容
- 再伪装成 Word 下载

这不是真正的 `.docx` 结构化导出，不应作为本次里程碑的基建方向。

---

## 4. 抽象方案：如何变成通用工具函数

### 4.1 建议新增公共工具

建议新增：

- `src/utils/export-word.ts`

职责：

- 基于现有 `docx` + `file-saver` 统一生成 `.docx`
- 提供统一的标题、表格、段落、建议列表、基础信息区块样式
- 不关心具体量表业务，只接收“规范化报告 payload”

### 4.2 建议的规范化 JSON 结构

建议通用工具接收如下风格的数据：

```ts
type WordSection =
  | { type: 'paragraph'; heading?: string; text: string }
  | { type: 'list'; heading?: string; items: string[] }
  | { type: 'table'; heading?: string; columns: string[]; rows: string[][] }
  | { type: 'kv-table'; heading?: string; rows: Array<{ label: string; value: string }> }

interface WordExportPayload {
  title: string
  subtitle?: string
  filename: string
  meta?: Array<{ label: string; value: string }>
  sections: WordSection[]
}
```

### 4.3 具体抽象策略

我建议把通用能力拆成两层：

1. `export-word.ts`
   - 只负责把标准 payload 渲染成 `.docx`
   - 统一页面边距、标题、标题层级、表格边框、字体、下载逻辑

2. 各量表的 `buildXxxWordPayload(...)`
   - 负责把 SDQ / CBCL / SRS2 / CSIRS / Conners 等页面已有数据转成统一 payload

这样的好处：

- 通用层不会污染业务规则
- 各量表导出逻辑会从“直接操作 docx 节点”变成“构造规范化 JSON”
- 后续要新增量表导出，只需新增一个 builder

### 4.4 为什么不建议直接继续堆 `docxExporter.ts`

`docxExporter.ts` 当前已经有很多量表专用函数，继续往里堆会变成：

- 文件越来越大
- 各量表导出样式越来越难统一
- 无法形成真正通用的数据契约

因此更合理的路线是：

- 保留 `docxExporter.ts` 作为过渡兼容层
- 新增 `export-word.ts` 作为新通用底座
- 逐步把旧专用函数迁移为 payload builder + 通用导出

---

## 5. 需要改造的具体量表报告组件

### 第一批优先改造（本里程碑必须覆盖）

1. [src/views/assessment/sdq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sdq/Report.vue)
2. [src/views/assessment/cbcl/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/cbcl/Report.vue)

原因：

- 它们目前最符合“痛点最大”的描述
- PDF 按钮最明显需要替换
- 两者能覆盖“中等复杂 + 高复杂”的报告结构

### 第二批同步统一（建议纳入同一里程碑收口）

3. [src/views/assessment/srs2/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/srs2/Report.vue)
4. [src/views/assessment/csirs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/csirs/Report.vue)
5. [src/views/assessment/conners-psq/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-psq/Report.vue)
6. [src/views/assessment/conners-trs/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/conners-trs/Report.vue)
7. [src/views/assessment/sm/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/sm/Report.vue)
8. [src/views/assessment/weefim/Report.vue](/home/DONG/Mycode/SCGP/src/views/assessment/weefim/Report.vue)

这些页面中：

- 一部分已经接通 Word，但实现分散
- 一部分仍残留 PDF 按钮

所以最终收口目标应该是：

- 统一改成“导出 Word”
- 统一走新的公共导出基建

---

## 6. 建议实施 ROADMAP

### Phase A：提取公共 Word 导出基建

目标：

- 基于 `docx` 和 `file-saver` 建立统一的 `.docx` 渲染工具
- 明确通用样式常量、段落与表格 helper

产出：

- `src/utils/export-word.ts`
- 通用 payload 类型定义

### Phase B：建立量表数据到 Word Payload 的转换层

目标：

- 为评估报告建立“业务数据 -> 规范化导出数据”的中间层

优先实现：

- `buildSDQWordPayload(...)`
- `buildCBCLWordPayload(...)`

产出：

- SDQ / CBCL 对应的 builder
- 如果需要，可拆到 `src/utils/assessment-word-builders.ts`

### Phase C：替换第一批量表的导出按钮

目标：

- 删除无用 PDF 按钮
- 接入统一 “导出 Word” 按钮

优先页面：

- SDQ Report
- CBCL Report

### Phase D：扩展到其他评估报告页

目标：

- 将其余 `Report.vue` 的按钮和导出行为统一

覆盖：

- SRS2
- CSIRS
- Conners PSQ / TRS
- SM
- WeeFIM

### Phase E：验证与收尾

目标：

- 确认至少一个主量表（SDQ 或 CBCL）能稳定导出
- 检查 Word 文档可打开、标题和表格排版整洁、中文正常
- 回归检查其他已迁移报告页

---

## 7. 具体验证建议

### 必测

1. SDQ 报告导出 `.docx`
2. CBCL 报告导出 `.docx`
3. 文件能被 Word / WPS 正常打开
4. 中文标题、段落、表格边框、建议列表显示正常

### 补测

1. CSIRS / Conners 至少各验证一次
2. 已有 Word 导出功能迁移后没有回退
3. 原 PDF 按钮已从目标页面移除

---

## 8. 风险与注意事项

1. **不要误用旧的 `reportExporter.ts` / `exportUtils.ts`**
   - 那条 Word 导出链路是 HTML 伪装，不是本次目标

2. **不要试图一次性做“任意复杂布局”通用化**
   - 第一版通用 payload 只需要覆盖标题、基础信息、段落、列表、表格

3. **CBCL 的复杂图表不应强行嵌入 Word**
   - 第一阶段以文本和表格表达为主，先保证可读、可编辑、可交付

4. **保持现有技术栈**
   - 只复用 `docx` + `file-saver`
   - 不引入新 npm 依赖

---

## 9. 当前建议

如果要正式开启这个里程碑，我建议版本号使用：

- `v1.3`

里程碑名称建议：

- `Unified Assessment Word Export`

建议先从：

- **SDQ**
- **CBCL**

这两个量表开始实施，因为它们最能代表当前最痛的“PDF 无效 / 导出不统一”问题。

---

## 10. 一句话总结

这次里程碑的本质不是“给某个量表补一个导出按钮”，而是：

**把现有 IEP 与 `docxExporter.ts` 的 Word 导出能力，收口为一套统一、可复用、可扩展的评估报告 `.docx` 导出基建，并优先落地到 SDQ / CBCL。**
