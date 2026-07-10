# SCGP 说明书激活后截图自动化实现计划

> **面向 AI 代理的工作者：** 按本计划执行时，优先修改 `scripts/manual/` 下的截图脚本与截图清单。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为 `scripts/manual/SCGP-产品使用说明书.docx` 的系统内页面提供稳定、可复现的截图生成流程；登录页、未激活页、等待激活页和安装器页面由人工手动截图。

**架构：** 使用 Playwright 的 Electron 模式启动真实 Electron 应用，自动登录到已激活系统后，按说明书截图引用逐页导航、执行必要交互、等待页面断言、截图指定区域，并做重复图/错误页检测。普通浏览器模式仅保留为调试备选，不作为最终说明书截图来源。

**技术栈：** Electron、Playwright `_electron.launch()`、Node.js 脚本、现有 `scripts/manual/*.md` 源稿、`scripts/manual/screenshots/` 输出目录。

---

## 范围边界

人工截图范围：

- Windows / Linux 安装器过程截图。
- 首次启动进入激活页截图。
- 未激活、等待激活、复制机器码、激活成功等页面截图。
- 登录页面和登录表单填写状态截图。

自动截图范围：

- 激活成功并可登录后的全部业务页面。
- 侧边栏、首页、学生、评估、训练计划、情绪行为、游戏训练、器材训练、训练记录、报告中心、资源中心、自理训练、班级管理、学生分班、系统管理。
- 弹窗、标签页、筛选区、编辑器、详情页等说明书内引用的应用内截图。

不做范围：

- 不在截图脚本中自动生成真实激活码。
- 不把普通浏览器截图作为最终交付截图。
- 不在截图阶段改动业务功能逻辑。

## 文件职责

- 修改：`scripts/manual/capture-electron-screenshots.mjs`
  - 保留 Electron 启动方式。
  - 新增场景断言、截图去重、错误页检测、登录后起点校验。
  - 更新章节编号和新增自理训练截图清单。

- 创建：`scripts/manual/screenshot-scenes.mjs`
  - 将截图清单从主脚本拆出，按章节维护。
  - 每个场景包含 `name`、`route`、`assertText` 或 `assertSelector`、`cropSelector`、`setup`。

- 创建：`scripts/manual/screenshot-helpers.mjs`
  - 封装 `gotoAndAssert`、`safeClickByText`、`captureRegion`、`hashFile`、`detectDuplicate`、`detectBlockedPage`。

- 创建：`scripts/manual/screenshots-manual-list.md`
  - 记录人工截图文件名、用途、放置路径和对应说明书位置。

- 修改：`scripts/manual/part2b.md`
  - 如实际截图文件名需要微调，只更新新增自理训练章节的图片引用。

- 修改：`scripts/manual/part3.md`
  - 如截图文件名需要随章节编号同步，把 `ch13/ch14/ch15` 图片名调整为 `ch14/ch15/ch16` 或保留旧文件名并在注释中说明兼容。

## 截图策略

最终截图使用 Electron，而不是浏览器：

- Electron 能覆盖本地 SQL.js 数据、IPC、`resource://` 资源协议、激活授权状态和真实菜单守卫。
- 普通浏览器模式容易被登录/激活/授权守卫拦截，也容易缺少本地资源，导致多张图截到同一个页面。

每张截图必须满足：

- 导航后断言当前页面包含唯一文本或唯一 DOM。
- 截图前等待关键内容出现，而不是只等待固定时间。
- 截图区域优先使用具体容器，例如 `.page-header`、`.main-content`、`.el-dialog`；只有全页类截图才使用窗口截图。
- 保存后计算图片 hash，发现与上一张或高风险集合完全相同则标记失败。
- 如果页面含有“软件未激活”“登录”“页面未找到”“未授权”等阻断文案，而场景没有声明允许，则标记失败。

## 任务 1：梳理截图清单

**文件：**

- 创建：`scripts/manual/screenshot-scenes.mjs`
- 创建：`scripts/manual/screenshots-manual-list.md`

- [ ] **步骤 1：列出人工截图清单**

在 `screenshots-manual-list.md` 中写入：

```markdown
# 说明书人工截图清单

| 文件名 | 页面 | 说明 |
|--------|------|------|
| win-install-path.png | Windows 安装器 | 选择安装路径 |
| win-install-finish.png | Windows 安装器 | 安装完成 |
| first-launch-activation.png | 首次启动 | 未激活进入激活页 |
| copy-machine-code.png | 激活页 | 复制机器码 |
| activation-success.png | 激活页 | 激活成功提示 |
| login-page.png | 登录页 | 登录页初始状态 |
| login-form-filled.png | 登录页 | 登录表单填写状态 |
```

- [ ] **步骤 2：建立业务截图清单骨架**

在 `screenshot-scenes.mjs` 中按章节导出：

```js
export const screenshotScenes = [
  {
    chapter: 'Ch3 系统首页',
    shots: [
      {
        name: 'dashboard-overview.png',
        route: '/dashboard',
        assertText: '系统首页',
        cropSelector: '.page-container, main',
      },
    ],
  },
]
```

- [ ] **步骤 3：新增自理训练场景**

添加以下截图：

```js
{
  chapter: 'Ch13 自理训练',
  shots: [
    {
      name: 'self-care-task-list.png',
      route: '/self-care/tasks',
      assertText: '自理训练',
      cropSelector: '.self-care-task-list-page',
    },
    {
      name: 'self-care-task-create.png',
      route: '/self-care/tasks/new',
      assertText: '新建自理任务',
      cropSelector: '.self-care-task-editor-page',
    },
    {
      name: 'self-care-select-student.png',
      route: '/self-care/tasks/1/select-student',
      assertText: '选择学生',
      cropSelector: '.page-container, main',
      requiresSeed: true,
    },
    {
      name: 'self-care-task-execution.png',
      route: '/self-care/execute/1/1',
      assertText: '执行概览',
      cropSelector: '.task-execution-page',
      requiresSeed: true,
    },
    {
      name: 'self-care-training-records.png',
      route: '/training-records/life-skills',
      assertText: '训练记录',
      cropSelector: '.page-container, main',
    },
  ],
}
```

## 任务 2：封装截图辅助能力

**文件：**

- 创建：`scripts/manual/screenshot-helpers.mjs`

- [ ] **步骤 1：实现页面断言**

```js
export async function gotoAndAssert(page, baseUrl, scene) {
  await page.goto(`${baseUrl}${scene.route}`, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {})
  if (scene.assertSelector) {
    await page.locator(scene.assertSelector).first().waitFor({ state: 'visible', timeout: 15000 })
  }
  if (scene.assertText) {
    await page.getByText(scene.assertText, { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 })
  }
}
```

- [ ] **步骤 2：实现阻断页检测**

```js
export async function detectBlockedPage(page, scene) {
  const blockedTexts = ['软件未激活', '请输入激活码', '登录', '页面未找到', '未授权']
  const body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '')
  if (scene.allowBlockedPage) return null
  const matched = blockedTexts.find((text) => body.includes(text))
  return matched ? `blocked by "${matched}"` : null
}
```

- [ ] **步骤 3：实现区域截图**

```js
export async function captureRegion(page, outputPath, scene) {
  if (scene.cropSelector) {
    const locator = page.locator(scene.cropSelector).first()
    if (await locator.isVisible().catch(() => false)) {
      await locator.screenshot({ path: outputPath })
      return
    }
  }
  await page.screenshot({ path: outputPath, fullPage: false })
}
```

- [ ] **步骤 4：实现 hash 去重**

```js
import crypto from 'crypto'
import fs from 'fs'

export function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}
```

## 任务 3：改造 Electron 截图主脚本

**文件：**

- 修改：`scripts/manual/capture-electron-screenshots.mjs`

- [ ] **步骤 1：导入场景和辅助函数**

```js
import { screenshotScenes } from './screenshot-scenes.mjs'
import {
  gotoAndAssert,
  detectBlockedPage,
  captureRegion,
  hashFile,
} from './screenshot-helpers.mjs'
```

- [ ] **步骤 2：登录后校验已进入业务区**

登录后必须断言出现“系统首页”或业务侧边栏：

```js
await page.getByText('系统首页', { exact: false }).first().waitFor({ state: 'visible', timeout: 15000 })
```

如果仍在激活页或登录页，直接停止并提示用户先完成激活。

- [ ] **步骤 3：替换现有截图循环**

```js
const sceneGroups = screenshotScenes.flatMap((group) =>
  group.shots.map((shot) => ({ ...shot, chapter: group.chapter }))
)

const seenHashes = new Map()

for (const scene of sceneGroups) {
  const outputPath = path.resolve(SCREENSHOTS_DIR, scene.name)
  try {
    if (scene.setup) {
      await scene.setup(page)
    } else {
      await gotoAndAssert(page, DEV_SERVER_URL, scene)
    }

    const blockedReason = await detectBlockedPage(page, scene)
    if (blockedReason) throw new Error(blockedReason)

    await captureRegion(page, outputPath, scene)

    const hash = hashFile(outputPath)
    const duplicateOf = seenHashes.get(hash)
    if (duplicateOf) {
      throw new Error(`duplicate screenshot of ${duplicateOf}`)
    }
    seenHashes.set(hash, scene.name)
    ok(`${scene.chapter} / ${scene.name}`)
  } catch (err) {
    fail(`${scene.name}: ${err.message.slice(0, 120)}`)
  }
}
```

## 任务 4：准备可截图的演示数据

**文件：**

- 视情况创建：`scripts/manual/prepare-screenshot-demo-data.mjs`

- [ ] **步骤 1：确认当前数据库是否已有演示数据**

运行 Electron 后先查看学生、训练资源、自理任务、报告和班级页面是否有可展示内容。

- [ ] **步骤 2：若数据不足，创建专用演示数据脚本**

脚本只用于截图环境，最少需要：

- 1 个学生。
- 1 个班级和学年。
- 1 条自理任务资源，包含 3 个步骤。
- 1 条训练记录。
- 若干报告记录或可迁移评估记录。

- [ ] **步骤 3：避免污染真实数据**

演示数据脚本默认要求显式参数：

```bash
node scripts/manual/prepare-screenshot-demo-data.mjs --yes
```

没有 `--yes` 时只打印将要写入的数据，不执行写入。

## 任务 5：章节编号与图片文件名同步

**文件：**

- 修改：`scripts/manual/part2b.md`
- 修改：`scripts/manual/part3.md`
- 修改：`scripts/manual/screenshot-scenes.mjs`

- [ ] **步骤 1：决定是否保留旧 `ch13/ch14/ch15` 文件名**

推荐保留旧文件名以减少 Word 生成脚本影响，但在截图清单注释中标明：

```js
// 文件名保留 ch13/ch14/ch15 是为了兼容既有说明书引用；
// 文档章节已顺延为第14/15/16章。
```

- [ ] **步骤 2：若改为新文件名，同步替换 Markdown 引用**

例如：

```text
ch13-class-list.png -> ch14-class-list.png
ch14-student-assignment.png -> ch15-student-assignment.png
ch15-system-main.png -> ch16-system-main.png
```

## 任务 6：验证流程

**文件：**

- 修改：`scripts/manual/capture-electron-screenshots.mjs`

- [ ] **步骤 1：运行类型检查**

```bash
npm run type-check
```

预期：通过。

- [ ] **步骤 2：运行 Electron 截图脚本**

```bash
node scripts/manual/capture-electron-screenshots.mjs
```

预期：

- 登录后进入系统首页。
- 自动跳过人工截图清单。
- 每张业务截图都输出成功或明确失败原因。
- 没有重复 hash 截图。

- [ ] **步骤 3：抽查截图质量**

人工检查以下重点图片：

- `dashboard-overview.png`
- `assessment-center.png`
- `emotional-home.png`
- `resource-center-overview.png`
- `self-care-task-list.png`
- `self-care-task-execution.png`
- `ch15-about.png`

验收标准：

- 页面不是登录页、激活页、404 或未授权页。
- 截图内容和文件名对应。
- 文字清晰，主体区域完整。
- 弹窗截图确实显示弹窗。

## 执行顺序

1. 先创建人工截图清单和 `screenshot-scenes.mjs`。
2. 再封装 `screenshot-helpers.mjs`。
3. 改造 `capture-electron-screenshots.mjs`。
4. 准备或确认演示数据。
5. 执行截图脚本。
6. 抽查截图并修正失败场景。
7. 最后再运行 `generate-docx.mjs` 生成新的 Word 说明书。

## 风险与处理

- 如果自动登录后进入激活页：停止截图，提示先人工完成激活。
- 如果某模块未授权：截图脚本应报告具体模块，不保存错误页面。
- 如果某页面需要具体 ID：优先通过演示数据脚本创建固定数据；不要硬编码真实业务数据 ID。
- 如果截图重复：按失败处理，检查路由守卫、断言和等待条件。
- 如果图片缺失资源：优先检查 `resource://` 和演示资源路径，而不是改截图脚本绕过。

