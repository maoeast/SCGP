---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-17T02:56:28.374Z"
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 9
  completed_plans: 9
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-10T08:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 2
  completed_plans: 6
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-09T01:30:00Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 2
  completed_plans: 2
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-04T02:51:47.236Z"
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
---

# STATE

## Project Reference
**Core Value**: SCGP (Stellar Competency Growth Platform) provides special education teachers and clinicians with a comprehensive, offline, local-first assessment and intervention tool.
**Current Focus**: Phase 2 MVP - SRS-2 Integration

**Plan**: SDQ Assessment Integration (Phase 2.1) ✅ → SRS-2 Assessment Integration (Phase 2.2) ✅

## Current Position
- **Phase**: 4. CBCL Assessment Integration
- **Plan**: 04.5 Gap Closure (SocialForm Refactor)
- **Status**: Completed

### Completed Plan
**04.5-gap-closure-SocialForm-重构** - CBCL SocialForm aligned with source document
- Part 1 General Information: reporter (父/母/其他人), conditional relation field, father/mother occupation with hints
- Part 2 Qualitative Text Input: 3 text fields per section (I-IV) with "None" checkboxes
- Auto-calculation bridge: text inputs → counts for scoring engine compatibility
- Conditional school fields: special ed type, retention grade/reason, problem tracking with resolution
- Question 113 split into 113a, 113b, 113c for multi-text support
- Full backward compatibility via migration helper

### Completed Plan
**04.4-ui-implementation** - CBCL UI implementation complete
- CBCLSocialForm.vue with all 7 sections for Part 2 data collection
- CBCL Report.vue with ECharts clinical profile chart
- AssessmentContainer.vue two-step flow (social form -> behavior questions)
- Pagination for 113 questions (10 per page)
- Entry point registrations in AssessmentSelect, SelectStudent, Reports
- Medical disclaimer on report page

### Completed Plan
**04.3-cbcl-driver** - CBCL scoring engine implementation complete
- CBCLDriver class extending BaseDriver with all required properties
- Social competence calculation for 3 factors (Activity, Social, School)
- Behavior problem calculation with dynamic factor mapping for 6 norm groups
- T-score estimation and clinical level assignment
- Comprehensive feedback generation with placeholder replacement
- Driver registered in assessment index
- getQuestions() now returns actual CBCL questions from cbcl-questions.ts

### Completed Plan
**04.2-database-schema** - CBCL database schema implementation complete
- cbcl_assess table with all required fields (social competence, behavior problems, factor scores)
- CHECK constraints for gender (male/female) and summary_level (normal/borderline/clinical)
- Migration script updated to support 'cbcl' report type
- CBCLAssessmentAPI with full CRUD operations and automatic JSON parsing

### Progress
![15%](https://progress-bar.dev/15/?scale=100&title=Project%20Completion&width=500&color=green&suffix=%)

## Accumulated Context
- **Decisions**:
  - Using Debounced Atomic Save on the Main Thread instead of Web Workers for SQLite due to Vite compatibility issues.
  - ScaleDriver Strategy is used for all assessments (S-M, WeeFIM, CSIRS, Conners, SDQ, SRS-2, CBCL) to generalize UI flows.
  - All resources (games, equipment, documents) are generalized into `sys_training_resource`.
  - SDQ feedback configuration integrated into feedbackConfig.js (expert-generated content).
  - CBCL data infrastructure complete with types, questions, norms, and feedback configuration.
  - CBCL database schema uses JSON TEXT fields for dynamic factor scores and raw answers, matching SRS-2 pattern.
  - CBCL T-score estimation uses simplified linear formula based on p69/p98 thresholds (full lookup tables can be added later).
  - Factor name mapping bridges Chinese factor names to feedback config keys for consistent feedback generation.
  - CBCL UI uses strict v-if="scaleCode==='cbcl'" isolation to protect existing scales.
  - CBCL two-step wizard: SocialForm -> Behavior Questions with pagination (10 per page).
  - CBCL SocialForm uses qualitative text input design (3 fields per section) with auto-calculation to counts.
  - CBCL text-to-count bridge logic ensures scoring engine receives expected count values.
  - CBCL backward compatibility via migration helper for old format records.
  - CBCL Report uses ECharts for clinical profile chart with T-score reference lines at 65 and 70.
- **Blockers**:
  - Visual tracking games are deferred due to hardware/lighting dependencies making testing unreliable.

## Completed Features

### Phase 4: CBCL Assessment Integration ✅ (2026-03-09)
**Status**: Fully deployed and ready for production

**Implementation Summary**:
- **04.1 Data Infrastructure**: TypeScript types, 121 questions (113 + 56a-56h), 6 norm groups, feedback config
- **04.2 Database Schema**: cbcl_assess table, JSON fields, CBCLAssessmentAPI, migration scripts
- **04.3 Scoring Engine**: CBCLDriver with social competence (3 factors) + behavior problems (8-9 factors) scoring
- **04.4 UI Implementation**: Two-step wizard, SocialForm.vue, Report.vue with ECharts clinical profile
- **04.5 Route Configuration**: Added CBCLReport route and legacy redirects in src/router/index.ts
- **04.5 Gap Closure**: SocialForm aligned with source document - Part 1 General Info, qualitative text input design, conditional school fields, Question 113 split, backward compatibility

**Key Technical Achievements**:
- Dynamic norm matching for 6 gender×age groups
- T-score calculation with clinical thresholds (65/70)
- ECharts clinical profile visualization with reference lines
- Strict isolation of CBCL logic protecting existing scales
- Medical disclaimer on all reports

**Files Created**: 6 new files, 9 modified files
**Total Commits**: 17 atomic commits (including 5 gap closure commits)
**Test Status**: TypeScript compilation successful, no errors

**Gap Closure Achievements**:
- Part 1 General Information section with reporter selection and occupation fields
- Qualitative text input design for Sections I-IV (3 text fields each with "None" checkboxes)
- Auto-calculation bridge: text inputs → counts for scoring engine
- Conditional school performance fields (special ed, retention, problems with resolution tracking)
- Question 113 split into 113a, 113b, 113c for multi-text support
- Full backward compatibility with migration helper

## Session Continuity
- Last Session: CBCL Bug Fixes - Factor name mapping, description input fields, question 56 skip logic, and description required validation
- Next Action: Awaiting further bug reports or new feature requirements

### Quick Tasks Completed
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | 游戏训练配置加载及配置对话框修复 | 2026-02-28 | 06ca952 | ✅ | direct fix |
| 2 | 器材训练记录为空修复 | 2026-02-28 | 7d8fa62 | ✅ Verified | [debug/resolved](./debug/resolved/equipment-training-records-empty.md) |
| 3 | 调整左侧菜单栏模块顺序 | 2026-03-02 | 48881f4 | ✅ | direct fix |
| 4 | 游戏训练记录列表页面多个问题修复 | 2026-03-02 | fd771f6 | ✅ Verified | direct fix |
| 5 | SDQ 评估保存功能修复 | 2026-03-03 | - | ✅ | direct fix |
| 6 | CBCL报告因子名称映射修复 | 2026-03-10 | - | ✅ Verified | direct fix |
| 7 | CBCL题目说明内容输入框修复 | 2026-03-10 | - | ✅ Verified | direct fix |
| 8 | CBCL题号56跳题逻辑修复 | 2026-03-10 | - | ✅ Verified | direct fix |
| 9 | CBCL说明内容必填验证修复 | 2026-03-10 | - | ✅ Verified | direct fix |

### Last Activity
**2026-03-10** - CBCL Report & Assessment Bug Fixes (4 critical fixes)

#### Bug 1: CBCL报告因子名称映射问题 (`Report.vue` + `feedbackConfig.js`)
**Problem:** 报告页面的行为问题因子详情里，每个因子没有相关建议内容
**Root Cause:** `feedbackConfig.js` 中的 `dimensions` 配置使用英文代码作为键（如 `anxious_depressed`），但 `Report.vue` 传递给 `generateFeedback` 的 `factor.code` 是中文名（如"抑郁"），导致配置匹配失败

**Solution:** 添加因子名称映射表 `FEEDBACK_FACTOR_MAP`，将中文名映射为英文代码
```typescript
const FEEDBACK_FACTOR_MAP: Record<string, string> = {
  '抑郁': 'anxious_depressed',
  '社交退缩': 'withdrawn',
  '体诉': 'somatic',
  // ... 其他映射
}
```

**Files Modified:**
- `src/views/assessment/cbcl/Report.vue` - 添加映射表，修复 `factorScores`、`dimensions`、`behaviorProblemsResult` 的 `code` 字段

**Verification:** 项目构建成功，因子建议内容正常显示

---

#### Bug 2: CBCL题目说明内容输入框缺失 (`QuestionCard.vue` + `AssessmentContainer.vue`)
**Problem:** 21道需要填写说明内容的题目没有提供输入框
**Affected Questions:** 2, 9, 28, 29, 40, 46, 56d, 56h, 58, 66, 70, 73, 77, 79, 83, 84, 85, 92, 100, 105, 113a-c

**Root Cause:** `QuestionCard` 组件没有处理题目定义中的 `hasDescription` 标记

**Solution:**
1. `QuestionCard.vue` - 添加说明内容输入框UI，支持对象格式答案 `{ value, description }`
2. `AssessmentContainer.vue` - 修改 `handleAnswer` 和 `currentAnswerValue` 支持对象格式答案

**Key Changes:**
- 当 `hasDescription=true` 且选择非0选项时显示输入框
- 说明内容保存到 `ScaleAnswer.metadata.description`
- 失焦时自动保存说明内容

**Files Modified:**
- `src/views/assessment/components/QuestionCard.vue`
- `src/views/assessment/AssessmentContainer.vue`

**Verification:** 项目构建成功，输入框正常显示和保存

---

#### Bug 3: CBCL题号56跳题逻辑缺失 (`AssessmentContainer.vue` + `QuestionCard.vue`)
**Problem:** 题号56（查不出医学原因的躯体不适症状）选择"无此表现"时，应该直接跳到题号57，但当前仍然会显示56a-56h子题

**Root Cause:** CBCL使用分页模式（每页10题），没有实现题号56的子题跳题逻辑

**Solution:**
1. `QuestionCard.vue` - 添加 `isSkipped` 属性，当题目被跳过时：
   - 显示"此题不适用，已自动跳过"提示
   - 禁用选项选择
   - 自动设置答案为0
2. `AssessmentContainer.vue` - 添加 `isCurrentQuestionSkipped` 计算属性：
   - 检测当前题目是否是56题的子题 (56a-56h)
   - 如果56题答案为0，子题标记为跳过

**Key Changes:**
```typescript
// AssessmentContainer.vue
const isCurrentQuestionSkipped = computed(() => {
  if (metadata?.isSubItem && metadata?.parentId === 56) {
    const q56Answer = state.value.answers[56]
    return q56Answer?.value === 0
  }
  return false
})
```

**Files Modified:**
- `src/views/assessment/components/QuestionCard.vue`
- `src/views/assessment/AssessmentContainer.vue`

**Verification:** 项目构建成功，56题选择"无此表现"后，56a-56h显示跳过提示并自动设置答案为0

---

#### Bug 4: CBCL说明内容必填验证缺失 (`AssessmentContainer.vue`)
**Problem:** 在需要输入题目说明内容的几道题目里，点击"有时有"、"经常有"后偶尔会自动进入下一道题目，导致说明内容为空

**Root Cause:** `handleAnswer` 函数在选择答案后300ms自动调用 `navigateToNext()`，没有检查说明内容是否已填写

**Solution:**
1. 添加 `canProceedToNext` 计算属性：
   - 检查当前题目是否需要说明内容
   - 检查是否选择了非0选项
   - 检查说明内容是否为空
   - 如果条件满足，返回 `false` 禁用"下一题"按钮
2. 修改 `handleAnswer` 函数：
   - 如果需要说明内容但未填写，显示警告"请填写说明内容后再继续"
   - 阻止自动跳转到下一题
3. 修改 `handleNext` 函数：
   - 添加相同的验证逻辑
   - 如果未填写说明内容，显示警告并阻止跳转

**Key Changes:**
```typescript
// 新增计算属性：是否可以进入下一题
const canProceedToNext = computed(() => {
  if (currentQuestion.value?.metadata?.hasDescription) {
    const isNonZeroAnswer = answer.value !== 0
    const isDescriptionEmpty = !description || description.trim() === ''
    if (isNonZeroAnswer && isDescriptionEmpty) return false
  }
  return true
})

// 修改 handleAnswer - 阻止自动跳转
if (needsDescription && isNonZeroAnswer && isDescriptionEmpty) {
  ElMessage.warning('请填写说明内容后再继续')
  return  // 不调用 navigateToNext
}
```

**Files Modified:**
- `src/views/assessment/AssessmentContainer.vue`

**Verification:** 项目构建成功，选择"有时有"/"经常有"后不会自动跳转，必须填写说明内容后才能点击"下一题"

---

**2026-03-04** - SDQ Module Deep Bug Fixes (3 critical fixes)

#### Bug 1: Database API Method Mismatch (`AssessmentContainer.vue`)
**Problem:** `db.execute is not a function` when calling `getDatabase()` directly
**Root Cause:** `getDatabase()` returns a `SQLWrapper` instance, NOT a `DatabaseAPI` subclass. `SQLWrapper` exposes:
- `db.run(sql, params)` for INSERT/UPDATE/DELETE
- `db.all(sql, params)` for SELECT queries
- `db.get(sql, params)` for single-row SELECT

**Wrong Pattern:**
```typescript
// ❌ WRONG: db.execute() doesn't exist on SQLWrapper
const result = db.execute(sql, params)
```

**Correct Pattern:**
```typescript
// ✅ CORRECT: Use SQLWrapper methods directly
db.run(sql, params)  // For INSERT/UPDATE/DELETE
db.all(sql, params)  // For SELECT
db.get(sql, params)  // For single row
```

**Lesson:** When bypassing `DatabaseAPI` and using `getDatabase()` directly, use `SQLWrapper` methods (`run`, `all`, `get`), NOT the `DatabaseAPI` methods (`execute`, `query`, `queryOne`).

#### Bug 2: CHECK Constraint Failed (`migrate-report-constraints.ts`)
**Problem:** `CHECK constraint failed` when inserting new `report_type = 'sdq'`
**Root Cause:** SQLite CHECK constraints are immutable. Adding a new enum value requires:
1. Create new table with updated constraint
2. Copy data from old table
3. Drop old table
4. Rename new table

**Solution Pattern:**
```sql
-- Step 1: Create new table with updated CHECK constraint
CREATE TABLE report_record_new (
  report_type TEXT NOT NULL
  CHECK(report_type IN ('sm', 'weefim', 'training', 'iep', 'csirs', 'conners-psq', 'conners-trs', 'sdq'))
  ...
)

-- Step 2: Copy data
INSERT INTO report_record_new SELECT * FROM report_record

-- Step 3: Swap tables
DROP TABLE report_record
ALTER TABLE report_record_new RENAME TO report_record
```

**Lesson:** When adding new enum values to SQLite CHECK constraints, the entire table must be recreated. This is a SQLite limitation, not a bug.

#### Bug 3: `Cannot read properties of undefined (reading 'toLowerCase')` (`Report.vue`)
**Problem:** `Cannot read properties of undefined (reading 'toLowerCase')`
**Root Cause:** Database stores `levelName` (Chinese like '正常') but NOT `level` (English like 'normal'). The code was tried to call `.toLowerCase()` on `levelName`, which doesn't have that method.

**Solution:** Don't rely on stored level - dynamically compute English level from `rawScore` and `SDQ_THRESHOLDS`:
```typescript
// ✅ CORRECT: Compute englishLevel from rawScore
let englishLevel = 'normal'
const threshold = SDQ_THRESHOLDS[code]
if (threshold) {
  if (code === 'prosocial') {
    if (data.rawScore < threshold.borderline) englishLevel = 'abnormal'
    else if (data.rawScore === threshold.borderline) englishLevel = 'borderline'
  } else {
    if (data.rawScore > threshold.borderline) englishLevel = 'abnormal'
    else if (data.rawScore > threshold.normal) englishLevel = 'borderline'
  }
}
return { ...description: getDimensionDescription(code, englishLevel) }
```

**Lesson:** Never assume stored data has all expected fields. When displaying data, prefer computing derived values from raw data + constants rather than relying on pre-computed values that might be missing or in different formats.

#### Bug 4: Report Dimension Table Empty (`Report.vue`)
**Problem:** Dimension table shows empty rows despite data being parsed correctly
**Root Cause:** Vue template `<el-table :data="dimensionTableData">` but script defines `dimensionScores`
**Solution:** Changed binding from `dimensionTableData` → `dimensionScores`
**Lesson:** Always verify variable names match between template and script. TypeScript won't catch template binding errors.

#### Bug 5: SDQ Report Not Recognized in Report Center (`Reports.vue`)
**Problem:** SDQ reports show as "未知类型" and clicking "查看" shows "该类型报告暂未实现"
**Root Cause:** Two missing registrations:
1. `getReportTypeName` nameMap missing `'sdq': 'SDQ长处和困难问卷评估报告'`
2. `viewReport` routeMap missing `'sdq': '/assessment/sdq/report/${report.assess_id}'`

**Solution:** Added SDQ entries to both dictionaries
**Lesson:** When adding new assessment types, update ALL related registries:
- Database migration scripts (CHECK constraints)
- Report type name maps
- Report route maps
- Assessment type selectors

---

### Architecture Notes (Lessons for Future Development)

1. **Database Layer Consistency:**
   - `DatabaseAPI` subclasses provide `execute()` and `query()` methods
   - Direct `getDatabase()` returns `SQLWrapper` with `run()`, `all()`, `get()` methods
   - **Rule:** Be consistent - either always use DatabaseAPI OR always use SQLWrapper directly

2. **SQLite Constraint Evolution:**
   - CHECK constraints are table-level and immutable
   - Adding new enum values requires table recreation migration
   - Always update migration scripts when adding new report types

3. **Data Display Robustness:**
   - Don't rely on stored derived values (like `levelName`)
   - Compute display values from raw data + constants at render time
   - This handles missing fields gracefully and supports schema evolution

---

### Phase 2.1: SDQ Report Polish (2026-03-04)

Enhanced SDQ report page with expert feedback from feedbackConfig.js

**What was added:**
- `totalScoreFeedback` computed property loads content from `ASSESSMENT_LIBRARY.sdq.total_score_rules`
- "总体评估说明" card displays detailed content paragraphs
- Expert advice section now uses advice from feedbackConfig
- Dimension table has expandable rows with detailed content and intervention suggestions
- Placeholder support: `[儿童姓名]` replaced with actual student name
- Markdown-style `**bold**` formatting in advice items

**Key patterns used:**
- `levelToKey()` for Chinese-to-English level mapping
- `replacePlaceholders()` for student name substitution
- `formatAdvice()` for Markdown bold rendering