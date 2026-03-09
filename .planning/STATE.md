---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-09T02:27:37.906Z"
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
- Last Session: CBCL Gap Closure (04.5) completed - SocialForm aligned with source document
- Next Action: Phase 4 CBCL Assessment Integration is complete with all gaps resolved

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