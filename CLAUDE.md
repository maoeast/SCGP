# CLAUDE.md - Agent Configuration & Rules

## 1. 🚨 核心协议 (CORE PROTOCOLS)
> **最高优先级指令**：本项目已引入 GSD (Get Shit Done) 规范驱动开发流程。在开始任何任务前，**必须**遵循以下流程。

1.  **GSD 工作流优先 (GSD Workflow)**：
    *   你的核心规划与执行必须依赖 `.planning/` 目录下的状态文件 (`PROJECT.md`, `ROADMAP.md`, `REQUIREMENTS.md`, `STATE.md`)。
    *   在开发新功能前，优先考虑运行 `/gsd:plan-phase` 和 `/gsd:execute-phase` 进行结构化开发。
2.  **上下文加载 (Legacy Context)**：作为补充，你仍需关注根目录的 `PROJECT_CONTEXT.md` 和 `重构实施技术规范.md` 以获取架构约束。
3.  **产品命名**：当前正式产品名称是 `SCGP / 星愿能力发展平台`；文档中的 `SIC-ADS` 和“生活自理适应综合训练系统”默认视为历史阶段名称，除非任务明确要求处理旧交付物。
4.  **单一事实来源**：以 `README.md` + `重构实施技术规范.md` 作为当前产品定位与技术约束的最高准则，并结合 `PROJECT_CONTEXT.md` 判断当前落地状态。忽略旧代码和旧文档中不符合该规范的模式。

## 2. 🛠 技术栈规范 (TECH STACK)
- **Runtime**: Electron (Main/Renderer Process), Node.js
- **Frontend**: Vue 3 (Composition API, `<script setup>`), Vite, Element Plus, 纯 CSS
- **Backend/API**: Electron Main Process + Preload + IPC（无独立在线后端作为主架构前提）
- **Language**: TypeScript (Strict mode enabled)
- **State Management**: Pinia (推荐)
- **Database**: sql.js (Wasm, 主线程防抖写入) - **零原生依赖**

## 3. 🏗️ 构建与运行 (COMMANDS)

### 开发环境 (Development)
> **注意**：优先使用并发启动命令，避免多终端操作。

- **Electron (首选)**: `npm run electron:dev`
    - *行为: 并行启动 Vite Server 和 Electron 窗口，支持热重载 (HMR)。*
- **Web Only (调试UI)**: `npm run dev`
    - *行为: 仅启动浏览器模式，适用于调试纯前端 UI 逻辑（不涉及 Node/Electron API 时使用）。*
- **Reset**: `npm run dev:force`
    - *行为: 清除 Vite/Electron 缓存并强制重启。*

### 生产构建 (Production Build)
- **Web Build**: `npm run build:web`
- **Electron (Windows)**: `npm run build:electron:win`
- **Electron (macOS)**: `npm run build:electron:mac`
- **Electron (Linux)**: `npm run build:electron:linux`

### 依赖管理 (Dependencies)
- **安装依赖**: `npm install`
- **添加依赖**: `npm install [package]` (或 `--save-dev`)
    - *⚠️ 警告*: **严格禁止引入 Native 模块** (如 sqlite3, sharp)。必须保持纯 JS/Wasm 架构以支持跨平台构建。

## 4. 📝 代码风格偏好 (CODING STYLE)

### Vue 组件规范

- **使用 Vue 3 Composition API** + `<script setup lang="ts">`
  - 所有新组件必须使用 `<script setup lang="ts">` 语法
  - 避免使用 Options API 或 `defineComponent`
  - 使用 `ref()` 和 `computed()` 管理响应式状态

```vue
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const loading = ref(false)
const router = useRouter()
</script>

<style scoped>
/* 使用 scoped CSS，避免全局样式污染 */
</style>
```

### TypeScript 规范

- **Interface vs Type**：
  - 复杂对象、类、函数签名 → 使用 `interface`
  - 联合类型、字面量类型 → 使用 `type`

```typescript
// ✅ Interface 用于对象
interface Student {
  id: number
  name: string
  gender: '男' | '女'
  birthday: string
}

// ✅ Type 用于联合类型
type ScaleType = 'sm' | 'weefim' | 'csirs' | 'conners-psq' | 'conners-trs'
```

- **Props 定义**：使用 `defineProps<T>()` 泛型语法

```typescript
interface Props {
  studentId: number
  readonly?: boolean
}
const props = defineProps<Props>()
```

### 样式规范

- **仅使用 Scoped CSS**：`<style scoped>`
- **禁止使用**：Tailwind、UnoCSS、CSS Modules、SCSS
- **样式隔离**：所有组件样式必须使用 `scoped` 避免污染全局

### 目录结构规范

```
src/
├── views/assessment/        # 评估模块（按功能分组）
│   ├── conners-psq/        # PSQ 评估
│   ├── conners-trs/        # TRS 评估
│   └── csirs/              # CSIRS 评估
├── stores/                 # Pinia 状态管理
├── types/                  # TypeScript 类型定义
├── database/               # 数据库相关
└── utils/                  # 工具函数
```

### 状态管理

- **仅使用 Pinia**：禁止使用 Vuex
- Store 定义使用 `setup` 语法：

```typescript
export const useStudentStore = defineStore('student', () => {
  const students = ref<Student[]>([])
  const loadStudents = async () => { /* ... */ }
  return { students, loadStudents }
})
```

### 依赖库规范

| 用途 | 使用 | 禁止使用 |
| :--- | :--- | :--- |
| UI 组件库 | Element Plus | - |
| 图表 | ECharts | Chart.js, D3 |
| 状态管理 | Pinia | Vuex |
| 工具函数 | 原生 API | lodash, underscore |
| 路由 | Vue Router | - |

### 命名规范

- **组件文件**：PascalCase (例：`AssessmentSelect.vue`)
- **工具函数**：camelCase (例：`calculateAge()`)
- **常量**：SCREAMING_SNAKE_CASE (例：`MAX_SCORE`)
- **类型/接口**：PascalCase (例：`interface Student`)

### 代码组织原则

1. **单一职责**：每个组件/函数只做一件事
2. **DRY**：避免重复代码，抽取公共逻辑到 `utils/`
3. **YAGNI**：不过度设计，只实现当前需要的功能
4. **模块化**：按功能分组，而非按文件类型

### 通用规范

- **异步处理**：优先使用 `async/await`，避免回调地狱
- **错误处理**：在 IPC 通信和后端 API 中必须包含 try/catch 块
- **路径引用**：使用 `@/` 别名引用 `src/` 目录
