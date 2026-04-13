# 评估选择页面布局重构计划

## 1. 目标
优化评估选择页面 (`src/views/assessment/AssessmentSelect.vue`) 的布局和逻辑：
1. **分类导航**：将现有的 12 个评估量表，按临床/训练领域分为 6 个可切换的标签页（Tab）：`感官统合`、`情绪调节`、`情绪安抚`、`社交沟通`、`精细动作`、`生活自理`。
2. **多重归属**：允许综合性量表（如 CBCL、儿心量表Ⅱ）同时出现在多个相关的标签页中。
3. **按需授权展示**：根据学校购买的顶层业务模块（授权 License）进行过滤，如果某个量表所属的顶层模块未被授权，该量表将完全不在 UI 中显示。

## 2. 业务逻辑映射
根据 `PROJECT_CONTEXT.md` 和系统设定，这 6 个分类对应内部的训练入口（`TRAINING_ENTRY_CODES`），而顶层授权依然基于 `BUSINESS_MODULE_CODES`（如 `sensory`, `emotional`, `social`, `life_skills`）。

具体映射规则设计如下：

| 量表名称 (Code) | 推荐显示的 Tab 分类 | 依赖的顶层授权模块 (`requiredModule`) |
| :--- | :--- | :--- |
| **CSIRS** (`csirs`) | 感官统合 | `sensory` |
| **TGMD-3** (`tgmd_3`) | 感官统合 | `sensory` |
| **GMFM-88** (`gmfm_88`) | 感官统合 | `sensory` |
| **CBCL** (`cbcl`) | 情绪调节, 情绪安抚 | `emotional` |
| **Conners PSQ** (`conners-psq`) | 情绪调节, 情绪安抚 | `emotional` |
| **Conners TRS** (`conners-trs`) | 情绪调节 | `emotional` |
| **SDQ** (`sdq`) | 情绪调节, 社交沟通 | `emotional` (或 `social`) |
| **SRS-2** (`srs2`) | 社交沟通 | `social` |
| **FMDA** (`fine_motor`) | 精细动作 | `sensory` (精细动作归属于感官统合模块授权) |
| **WeeFIM** (`weefim`) | 生活自理 | `life_skills` |
| **S-M量表** (`sm`) | 生活自理, 社交沟通 | `life_skills` |
| **儿心量表Ⅱ** (`cnbsr2016`) | 感官统合, 精细动作, 社交沟通, 生活自理 | `sensory` (作为基础量表，通常只要有感官或任意核心模块即可解锁) |

## 3. 实施步骤

### 步骤 1: 数据驱动化改造
将 `AssessmentSelect.vue` 模板中硬编码的 12 个量表 HTML 卡片，提取为数据配置数组（如 `assessmentScales`）。
配置结构示例：
```typescript
interface AssessmentScaleConfig {
  code: string;           // 如 'csirs'
  title: string;          // 主标题
  subtitle: string;       // 副标题
  icon: Component;        // Element Plus 图标组件
  themeType: string;      // 按钮颜色主题，如 'primary', 'warning'
  ageRange: string;       // 适用年龄
  questionCount: string;  // 题量
  dimensions: string;     // 评估维度说明
  timeEstimate: string;   // 预估耗时
  tabs: string[];         // 归属的 Tab 标识，如 ['sensory', 'fine-motor']
  requiredModule: string; // 依赖的授权模块，如 'sensory'
}
```

### 步骤 2: 定义标签页 (Tabs)
使用统一的内部标识来定义 6 个标签页：
```typescript
const assessmentTabs = [
  { id: 'sensory', label: '感官统合' },
  { id: 'emotional', label: '情绪调节' },
  { id: 'soothing', label: '情绪安抚' },
  { id: 'social', label: '社交沟通' },
  { id: 'fine-motor', label: '精细动作' },
  { id: 'life-skills', label: '生活自理' }
];
const activeTab = ref('sensory');
```

### 步骤 3: 授权与分类过滤逻辑
编写计算属性 `visibleScales`，基于当前选中的 Tab 和当前的 License 授权来过滤列表：

```typescript
const authStore = useAuthStore();

const visibleScales = computed(() => {
  return assessmentScales.filter(scale => {
    // 1. 判断该量表是否应该出现在当前选中的 Tab 中
    const inTab = scale.tabs.includes(activeTab.value);
    
    // 2. 判断学校是否购买了该量表所属的顶层模块
    const isAuthorized = authStore.hasModuleAccess(scale.requiredModule);
    
    return inTab && isAuthorized;
  });
});
```

### 步骤 4: UI 渲染重构
使用 `el-tabs` 替换现有的静态网格。
在 `el-tab-pane` 内部，通过 `v-for` 循环渲染 `visibleScales` 数组中的卡片：

```html
<el-tabs v-model="activeTab" class="assessment-tabs">
  <el-tab-pane v-for="tab in assessmentTabs" :key="tab.id" :label="tab.label" :name="tab.id">
    <div class="scale-cards">
      <el-card
        v-for="scale in visibleScales"
        :key="scale.code"
        class="scale-card"
        shadow="hover"
        @click="selectScale(scale.code)"
      >
        <!-- 使用 scale 对象动态渲染卡片内容 -->
      </el-card>
      
      <!-- 如果当前 Tab 下没有购买模块或暂无量表，显示空状态 -->
      <el-empty v-if="visibleScales.length === 0" description="该分类下暂无可用量表或相关模块未授权" />
    </div>
  </el-tab-pane>
</el-tabs>
```

## 4. 样式调整
- 现有的 `.scale-cards` 和 `.scale-card` 的 CSS 样式基本可以直接复用。
- 可能需要对新增的 `el-tabs` 容器做少量的 margin/padding 调整，以确保它与外层的 `main-content scgp-page-panel` 风格保持一致，不出现不和谐的边距。

## 5. 验收标准
1. **分类正确性**：点击 6 个不同的 Tab，能够准确筛选出对应的量表。
2. **多分类展示**：CBCL、儿心量表Ⅱ等必须能够在配置的多个 Tab 中都正常显示。
3. **授权阻断**：在本地调试时，手动修改 `authStore.entitlements.allowedModules` 移除某个模块（例如 `sensory`），对应的量表（如 CSIRS, TGMD-3）必须从所有相关 Tab 中彻底消失，不能有占位符或锁图标泄漏。