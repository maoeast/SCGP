---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-04T04:18:51.019Z"
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
- **Phase**: 2. Emotional & Social Expansion
- **Plan**: SDQ Assessment Integration
- **Status**: Executing

### Progress
![15%](https://progress-bar.dev/15/?scale=100&title=Project%20Completion&width=500&color=green&suffix=%)

## Accumulated Context
- **Decisions**:
  - Using Debounced Atomic Save on the Main Thread instead of Web Workers for SQLite due to Vite compatibility issues.
  - ScaleDriver Strategy is used for all assessments (S-M, WeeFIM, CSIRS, Conners, SDQ) to generalize UI flows.
  - All resources (games, equipment, documents) are generalized into `sys_training_resource`.
  - SDQ feedback configuration integrated into feedbackConfig.js (expert-generated content).
- **Blockers**:
  - Visual tracking games are deferred due to hardware/lighting dependencies making testing unreliable.

## Session Continuity
- Last Session: SDQ assessment integration completed with bug fixes
- Next Action: Test SDQ assessment end-to-end flow and verify report generation

### Quick Tasks Completed
| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 1 | 游戏训练配置加载及配置对话框修复 | 2026-02-28 | 06ca952 | ✅ | direct fix |
| 2 | 器材训练记录为空修复 | 2026-02-28 | 7d8fa62 | ✅ Verified | [debug/resolved](./debug/resolved/equipment-training-records-empty.md) |
| 3 | 调整左侧菜单栏模块顺序 | 2026-03-02 | 48881f4 | ✅ | direct fix |
| 4 | 游戏训练记录列表页面多个问题修复 | 2026-03-02 | fd771f6 | ✅ Verified | direct fix |
| 5 | SDQ 评估保存功能修复 | 2026-03-03 | - | ✅ | direct fix |

### Last Activity
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