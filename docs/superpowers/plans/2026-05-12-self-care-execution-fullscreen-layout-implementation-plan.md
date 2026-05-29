# Self-Care 全屏训练执行页布局实现计划

> **面向 AI 代理的工作者提示：** 必须按任务顺序实现，并使用复选框语法跟踪进度。所有改动限制在本计划列出的目标文件内，不得触碰无关脏文件。
>
> **目标：** 将 `src/views/self-care/TaskExecution.vue` 改造成“左侧图片主舞台 + 右侧固定记录栏”的无滚动触屏友好执行页，并满足已确认规格中的图片、触控、软键盘、导航溢出和多媒体预留要求。
>
> **架构：** 保持当前 `TaskExecution.vue` 的数据流、保存逻辑和路由行为不变，只重构模板结构、补充少量显示态计算与交互辅助逻辑，并通过原生 CSS Grid/Flex/CSS 变量完成精确布局控制。资源图片继续使用仓库现有 `resource://` 解析工具。
>
> **技术栈：** Vue 3 `script setup`、TypeScript、原生 CSS、CSS Grid/Flex、现有 Element Plus 基础控件、`resolvePresetResourceUrl`

---

## 文件结构

本计划只允许创建或修改以下文件：

- 修改：`src/views/self-care/TaskExecution.vue`
  - 责任：完成模板重构、图片/音频显示逻辑、键盘避让状态、步骤导航行为、物理 UI 状态类与样式
- 创建：`docs/superpowers/plans/2026-05-12-self-care-execution-fullscreen-layout-implementation-plan.md`
  - 责任：保存本实现计划

不允许修改：

- `src/features/self-care/task-training-contract.ts`
- `src/database/self-care-training-api.ts`
- 路由文件
- 其他 self-care 页面
- 与当前任务无关的脏文件

## 任务 1：为执行页补齐显示态与资源解析辅助

**文件：**

- 修改：`src/views/self-care/TaskExecution.vue`

- [ ] **步骤 1：在文件顶部引入当前执行页需要的资源解析与 DOM 辅助**

在现有 import 区增加以下内容：

```ts
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { resolvePresetResourceUrl } from '@/utils/preset-resource'
```

要求：

- 保留现有 `vue-router`、`element-plus`、API 与类型导入
- 不引入新的第三方依赖

- [ ] **步骤 2：新增与布局相关的显示态计算属性和引用**

在现有 `const stepResults = ref<TaskTrainingStepResult[]>([])` 后，补充以下状态：

```ts
const rootRef = ref<HTMLElement | null>(null)
const stepNavRef = ref<HTMLElement | null>(null)
const notesInputFocused = ref(false)
const viewportInsetBottom = ref(0)
```

新增以下计算属性：

```ts
const currentStepImageUrl = computed(() => {
  const value = currentStep.value?.imagePath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const currentStepAudioUrl = computed(() => {
  const value = currentStep.value?.audioPath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const currentStepVideoUrl = computed(() => {
  const value = currentStep.value?.videoPath
  return typeof value === 'string' && value.trim() ? resolvePresetResourceUrl(value) : ''
})

const hasCurrentStepImage = computed(() => Boolean(currentStepImageUrl.value))
const hasCurrentStepAudio = computed(() => Boolean(currentStepAudioUrl.value))
const hasCurrentStepVideo = computed(() => Boolean(currentStepVideoUrl.value))

const currentStepShortLabel = computed(() => {
  const step = currentStep.value
  if (!step) return ''
  return buildStepShortLabel(step.text || step.id || `步骤 ${step.seq}`)
})
```

新增短标题裁剪函数：

```ts
function buildStepShortLabel(value: string): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return '未命名步骤'
  return normalized.length > 10 ? `${normalized.slice(0, 10)}…` : normalized
}
```

要求：

- 资源 URL 只做显示态解析，不改动原始保存值
- 短标题逻辑只用于左下导航，不改动原始步骤说明文本

- [ ] **步骤 3：补充用于多媒体控制位的最小交互状态**

在 `script setup` 内新增：

```ts
const audioMuted = ref(false)
const audioReplayToken = ref(0)
```

并新增以下函数：

```ts
function handleAudioReplay() {
  if (!hasCurrentStepAudio.value) return
  audioReplayToken.value += 1
}

function handleAudioToggleMute() {
  if (!hasCurrentStepAudio.value) return
  audioMuted.value = !audioMuted.value
}
```

要求：

- 当前版本不需要完整做音频播放器业务，只要把控制位结构和状态接口预留出来
- 不允许扩展到新的音频管理模块

- [ ] **步骤 4：运行类型检查验证辅助状态未破坏现有类型**

运行：

```bash
npm run type-check
```

预期：

- 命令通过
- 此时页面尚未重构，但新增状态与函数不产生类型错误

- [ ] **步骤 5：提交本阶段改动**

```bash
git add src/views/self-care/TaskExecution.vue docs/superpowers/plans/2026-05-12-self-care-execution-fullscreen-layout-implementation-plan.md
git commit -m "feat: prepare self-care execution display state"
```

## 任务 2：重构模板为左右双栏无滚动结构

**文件：**

- 修改：`src/views/self-care/TaskExecution.vue`

- [ ] **步骤 1：删除现有顶部 header + footer 双段结构，改成单一双栏骨架**

将当前模板中：

- `task-execution-header`
- `task-execution-stage`
- `task-execution-footer`

重构为以下结构骨架：

```vue
<div ref="rootRef" class="task-execution-page" :class="{ 'is-keyboard-active': notesInputFocused }" v-loading="loading">
  <div class="task-execution-shell" :style="{ '--keyboard-inset': `${viewportInsetBottom}px` }">
    <template v-if="task && currentStep">
      <section class="task-execution-workspace">
        <div class="task-execution-stage">
          <!-- 左侧主舞台 -->
        </div>
        <aside class="task-execution-sidebar">
          <!-- 右侧固定记录栏 -->
        </aside>
      </section>
    </template>
    <el-empty ... />
  </div>
</div>
```

要求：

- 不改变 `v-if="task && currentStep"` 的上下文控制
- 空态 `el-empty` 保留现有返回列表行为

- [ ] **步骤 2：实现左侧主舞台模板**

左侧主舞台按以下顺序组织：

```vue
<div class="task-stage-context">
  <div>
    <p class="task-stage-context__eyebrow">自理训练执行中</p>
    <h1 class="task-stage-context__title">{{ task?.name || '自理任务' }}</h1>
    <p class="task-stage-context__meta">{{ studentName }} · 第 {{ currentStep?.seq || 0 }} / {{ steps.length }} 步</p>
  </div>
</div>

<div class="task-stage-figure">
  <div class="task-stage-figure__blur" :style="hasCurrentStepImage ? { backgroundImage: `url(${currentStepImageUrl})` } : undefined" />
  <img v-if="hasCurrentStepImage" :src="currentStepImageUrl" :alt="currentStep.text || `步骤 ${currentStep.seq}`" class="task-stage-figure__image" />
  <div v-else class="task-stage-figure__empty">当前步骤暂无配图</div>

  <div class="task-stage-media-controls">
    <button type="button" class="media-control media-control--ghost" :disabled="!hasCurrentStepAudio" @click="handleAudioReplay">重播</button>
    <button type="button" class="media-control media-control--ghost" :disabled="!hasCurrentStepAudio" @click="handleAudioToggleMute">
      {{ audioMuted ? '取消静音' : '静音' }}
    </button>
  </div>

  <div class="task-stage-caption">
    <div class="task-stage-caption__body">
      <span class="task-stage-caption__step">步骤 {{ currentStep.seq }}</span>
      <p>{{ currentStep.text || '当前步骤暂未填写说明' }}</p>
    </div>
  </div>
</div>

<nav ref="stepNavRef" class="task-step-nav" aria-label="步骤导航">
  <button
    v-for="step in steps"
    :key="step.seq"
    type="button"
    class="task-step-nav__item"
    :class="{ 'is-active': step.seq === currentStep?.seq }"
    @click="handleStepJump(step.seq)"
  >
    <span class="task-step-nav__index">{{ step.seq }}</span>
    <span class="task-step-nav__label">{{ buildStepShortLabel(step.text || step.id || `步骤 ${step.seq}`) }}</span>
  </button>
</nav>
```

要求：

- 主图使用 `<img>` + 背景层组合实现 `contain + blur fill`
- 说明条和媒体控制位都叠加在图片层内
- 步骤导航只允许单行，后续靠 CSS 做横向滚动

- [ ] **步骤 3：实现右侧固定记录栏模板**

右栏模板按以下顺序组织：

```vue
<aside class="task-execution-sidebar">
  <button type="button" class="task-sidebar__back-button" @click="handleAbort">返回学生选择</button>

  <section class="task-sidebar-panel task-sidebar-panel--summary">
    <h2>执行概览</h2>
    <div class="task-execution-summary">
      ...
    </div>
  </section>

  <section class="task-sidebar-panel task-sidebar-panel--field">
    <h2>完成等级</h2>
    <div class="task-choice-grid">
      ...
    </div>
  </section>

  <section class="task-sidebar-panel task-sidebar-panel--field">
    <h2>错误等级</h2>
    <div class="task-choice-grid">
      ...
    </div>
  </section>

  <section class="task-sidebar-panel task-sidebar-panel--notes">
    <h2>教师备注</h2>
    <el-input ... @focus="handleNotesFocus" @blur="handleNotesBlur" />
  </section>

  <div class="task-execution-actions">
    ...
  </div>
</aside>
```

要求：

- 右栏不再放逐步状态列表
- 统计块只展示规格要求的 5 个数字
- 底部动作区仍沿用现有 `handlePrevStep / handleInterrupt / handleNextOrFinish`

- [ ] **步骤 4：新增步骤跳转函数，保证导航点击可编辑当前记录**

在 `script setup` 中新增：

```ts
function handleStepJump(targetSeq: number) {
  const index = steps.value.findIndex((step) => step.seq === targetSeq)
  if (index < 0 || index === currentStepIndex.value) {
    return
  }

  upsertCurrentStepResult()
  currentStepIndex.value = index
  executionStatus.value = 'in_progress'
  syncFormFromCurrentStep()
}
```

要求：

- 跳步前先保存当前表单状态
- 不新增新的确认弹窗

- [ ] **步骤 5：运行类型检查验证模板重构后仍可编译**

运行：

```bash
npm run type-check
```

预期：

- 命令通过
- 模板引用的所有状态和事件都存在

- [ ] **步骤 6：提交本阶段改动**

```bash
git add src/views/self-care/TaskExecution.vue
git commit -m "feat: rebuild self-care execution layout"
```

## 任务 3：实现无滚动、触控友好和物理 UI 样式

**文件：**

- 修改：`src/views/self-care/TaskExecution.vue`

- [ ] **步骤 1：用原生 CSS 重写页面布局样式**

删除或重构当前样式块，确保至少包含以下类：

```css
.task-execution-page
.task-execution-shell
.task-execution-workspace
.task-execution-stage
.task-execution-sidebar
.task-stage-context
.task-stage-figure
.task-stage-figure__blur
.task-stage-figure__image
.task-stage-caption
.task-step-nav
.task-step-nav__item
.task-sidebar-panel
.task-choice-grid
.task-choice-card
.task-execution-actions
```

布局要求：

- 页面整体 `min-height: 100vh`
- `overflow: hidden`
- 主工作区固定双栏
- 左栏主图高度优先
- 右栏用 `grid-template-rows` 或等价方式锁定“返回 / 概览 / 等级 / 备注 / 底部动作”结构

- [ ] **步骤 2：实现 `contain + blur fill` 图片样式**

图片相关 CSS 必须满足：

```css
.task-stage-figure {
  position: relative;
  overflow: hidden;
}

.task-stage-figure__blur {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  filter: blur(24px);
  transform: scale(1.08);
}

.task-stage-figure__image {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
```

要求：

- 主图不能裁切核心动作
- 背景层必须承担铺满作用
- 占位态高度与有图态一致

- [ ] **步骤 3：实现说明条最大高度与内部滚动**

为图片底部说明条增加：

```css
.task-stage-caption {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 33.333%;
}

.task-stage-caption__body {
  overflow: auto;
}
```

要求：

- 说明条超长时只内部滚动
- 不能把主图整体压扁

- [ ] **步骤 4：实现步骤导航横向溢出与单行约束**

导航样式必须满足：

```css
.task-step-nav {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  scrollbar-width: none;
}

.task-step-nav::-webkit-scrollbar {
  display: none;
}
```

要求：

- 导航只允许单行
- 不能换行撑高左栏
- 当前步骤高亮必须明显

- [ ] **步骤 5：实现右栏的触控尺寸和“磁吸贴 / 木质积木”物理风格**

为右栏按钮、单选卡片和统计卡片实现：

```css
.task-choice-card,
.task-sidebar__back-button,
.task-execution-actions .el-button,
.media-control {
  min-height: 44px;
}
```

并补充物理状态样式：

```css
.task-choice-card,
.task-sidebar__back-button,
.task-action-button {
  transform: translateY(0);
  box-shadow: 0 6px 0 rgba(...), 0 10px 20px rgba(...);
}

.task-choice-card:active,
.task-sidebar__back-button:active,
.task-action-button:active {
  transform: translateY(3px);
  box-shadow: 0 3px 0 rgba(...), 0 6px 12px rgba(...);
}

.task-choice-card.is-selected {
  border-color: ...;
  background: ...;
}
```

要求：

- 明确区分默认态、按下态、选中态
- 不能只改文字颜色
- 触控目标优先做到 `48px`，最差不得低于 `44px`

- [ ] **步骤 6：运行类型检查验证样式重构后模板类名未失配**

运行：

```bash
npm run type-check
```

预期：

- 命令通过
- 没有因模板改名产生的引用问题

- [ ] **步骤 7：提交本阶段改动**

```bash
git add src/views/self-care/TaskExecution.vue
git commit -m "feat: style self-care execution touchscreen layout"
```

## 任务 4：补齐键盘避让、导航自动居中和媒体预留行为

**文件：**

- 修改：`src/views/self-care/TaskExecution.vue`

- [ ] **步骤 1：实现导航自动滚动到当前步骤居中**

在 `script setup` 中新增：

```ts
function centerActiveStepNav() {
  const container = stepNavRef.value
  if (!container) return

  const active = container.querySelector<HTMLElement>('.task-step-nav__item.is-active')
  if (!active) return

  const nextLeft = active.offsetLeft - (container.clientWidth - active.clientWidth) / 2
  container.scrollTo({
    left: Math.max(0, nextLeft),
    behavior: 'smooth',
  })
}
```

并在以下时机触发：

```ts
watch(() => currentStepIndex.value, async () => {
  await nextTick()
  centerActiveStepNav()
})
```

要求：

- 初次进入页面后也要执行一次
- 不允许依赖用户手动把当前步骤滑进视区

- [ ] **步骤 2：实现软键盘避让模式**

新增：

```ts
let removeViewportListener: (() => void) | null = null

function syncViewportInset() {
  if (typeof window === 'undefined' || !window.visualViewport) {
    viewportInsetBottom.value = 0
    return
  }

  const vv = window.visualViewport
  const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
  viewportInsetBottom.value = inset
}

function handleNotesFocus() {
  notesInputFocused.value = true
  syncViewportInset()
}

function handleNotesBlur() {
  notesInputFocused.value = false
  viewportInsetBottom.value = 0
}
```

在 `onMounted` 中注册：

```ts
if (window.visualViewport) {
  const handler = () => syncViewportInset()
  window.visualViewport.addEventListener('resize', handler)
  window.visualViewport.addEventListener('scroll', handler)
  removeViewportListener = () => {
    window.visualViewport?.removeEventListener('resize', handler)
    window.visualViewport?.removeEventListener('scroll', handler)
  }
}
```

在 `onBeforeUnmount` 中清理：

```ts
removeViewportListener?.()
```

要求：

- 键盘弹起时允许右栏进入临时避让态
- 键盘收起后恢复标准无滚动布局

- [ ] **步骤 3：在样式中实现键盘避让态**

加入：

```css
.task-execution-shell {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.task-execution-page.is-keyboard-active .task-execution-sidebar {
  transform: translateY(calc(var(--keyboard-inset, 0px) * -0.35));
}
```

并根据现有布局调优：

- 确保备注框聚焦时底部动作不会完全被挡住
- 如果无法同时保证可达性，则 `handleNextOrFinish` / `handleInterrupt` 触发前先让输入框失焦

可用兜底实现：

```ts
function blurActiveElement() {
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    active.blur()
  }
}
```

在关键动作里先调用再继续：

```ts
blurActiveElement()
```

- [ ] **步骤 4：把媒体控制位收口为稳定预留结构**

要求：

- 即使没有音频，也保留媒体控制容器位置
- 仅在 `hasCurrentStepAudio` 时启用按钮交互
- 当前版本不做自动播放，不做音频时间轴

- [ ] **步骤 5：运行类型检查，验证交互辅助逻辑通过**

运行：

```bash
npm run type-check
```

预期：

- 命令通过
- `visualViewport`、`nextTick`、DOM 引用与事件清理都没有类型错误

- [ ] **步骤 6：提交本阶段改动**

```bash
git add src/views/self-care/TaskExecution.vue
git commit -m "feat: refine self-care execution touch interactions"
```

## 任务 5：执行人工验收与最终验证

**文件：**

- 修改：`src/views/self-care/TaskExecution.vue`（如验收中发现必须修复的小问题）

- [ ] **步骤 1：运行最终类型检查**

运行：

```bash
npm run type-check
```

预期：

- 通过

- [ ] **步骤 2：运行前端构建验证样式与模板可生产构建**

运行：

```bash
npm run build:web
```

预期：

- 构建通过
- 没有由于模板、样式、静态资源解析造成的构建错误

- [ ] **步骤 3：按规格执行人工检查清单**

在本地运行页面后逐项确认：

- 页面标准桌面视口下无整体纵向滚动条
- 左侧主图完整显示，不裁切核心动作
- 主图外空白由模糊背景填充
- 底部说明条超长时内部滚动，主图高度不被压缩
- 右栏所有必需区块同屏可见
- 右栏交互项点击面不小于 `44px`
- 步骤多时左下导航单行横向滑动，当前项自动居中
- 备注框聚焦时软键盘不会把底部关键动作完全遮挡
- 返回按钮、单选卡片、底部动作具备明显按下态和选中态
- 媒体控制位位于主图右上角，不压缩导航区

- [ ] **步骤 4：若人工验收发现问题，仅在 `TaskExecution.vue` 内做收口修复**

修复原则：

- 不扩散文件范围
- 不改业务数据结构
- 只修复本计划覆盖的显示与交互问题

- [ ] **步骤 5：再次运行验证命令**

运行：

```bash
npm run type-check
npm run build:web
```

预期：

- 两个命令都通过

- [ ] **步骤 6：提交最终实现**

```bash
git add src/views/self-care/TaskExecution.vue
git commit -m "feat: ship self-care fullscreen execution layout"
```

## 自检

### 规格覆盖度

本计划已覆盖规格中的所有关键约束：

- 无滚动双栏布局
- 左侧 `contain + blur fill` 主图
- 底部说明条 `1/3` 高度限制
- 左下横向步骤导航
- 右栏固定工作区
- 触控底线 `44px / 48px`
- 磁吸贴 / 木质积木式物理 UI 状态
- 软键盘避让模式
- 媒体控制位预留

### 占位符扫描

本计划未使用：

- `TODO`
- “后续补充”
- 未定义的文件路径
- 未定义的验证命令

### 类型与接口一致性

计划只在 `TaskExecution.vue` 内补充：

- 显示态计算属性
- DOM 辅助引用
- 键盘避让逻辑
- 导航自动居中逻辑

不改动：

- `TaskTrainingStep` 类型定义
- 保存 API 输入输出结构
- 路由参数格式

## 执行交接

计划已完成并保存到：

- `docs/superpowers/plans/2026-05-12-self-care-execution-fullscreen-layout-implementation-plan.md`

两种执行方式：

1. 子代理驱动
   - 适合把“模板重构 / 样式重构 / 交互收口 / 验证”拆波次执行
2. 内联执行
   - 适合在当前会话里直接按任务顺序实现

当前任务更适合 **内联执行**，因为写入范围严格限制在 `src/views/self-care/TaskExecution.vue`，拆分收益不高，且需要持续对齐同一份布局与样式上下文。
