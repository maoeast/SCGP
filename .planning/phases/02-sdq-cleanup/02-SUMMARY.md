# SUMMARY: SDQ Cleanup Remediation

```yaml
phase: "02"
plan: "02"
status: complete
completed: 2026-03-04
```

## What Was Built

SDQ (Strengths and Difficulties Questionnaire) module is now fully integrated and functional with all bugs resolved.

## Tasks Completed

### Task 1: Fix Database Import Path ✅
**File:** `src/views/assessment/sdq/Report.vue:104`
- Changed `import { getDatabase } from '@/database/api'` → `'@/database/init'`

### Task 2: Fix Database API Method Mismatch ✅
**File:** `src/views/assessment/AssessmentContainer.vue`
- `saveSDQAssessment` uses `db.run()` and `db.all()` (SQLWrapper methods)
- NOT `db.execute()` (DatabaseAPI method)

### Task 3: Update CHECK Constraint Migration ✅
**File:** `src/database/migrate-report-constraints.ts`
- Added `'sdq'` to CHECK constraint for `report_type` enum

### Task 4: Fix Report Level Computation ✅
**File:** `src/views/assessment/sdq/Report.vue`
- Dynamically compute `englishLevel` from `rawScore` + `SDQ_THRESHOLDS`
- Don't rely on stored `levelName` field

### Task 5: Fix Dimension Table Binding ✅
**File:** `src/views/assessment/sdq/Report.vue:68`
- Changed `<el-table :data="dimensionTableData">` → `:data="dimensionScores"`

### Task 6: Add SDQ to Report Center ✅
**File:** `src/views/Reports.vue`
- Added `'sdq': 'SDQ长处和困难问卷评估报告'` to `getReportTypeName` nameMap
- Added `'sdq': '/assessment/sdq/report/${report.assess_id}'` to `viewReport` routeMap

## Commits

1. `0149011` - fix(sdq): resolve database api calls, constraint migration, and report rendering bugs
2. `fe268ce` - fix(sdq): resolve report table rendering and global report route mapping

## Verification

- [x] TypeScript compilation passes (`npx tsc --noEmit`)
- [x] Web build succeeds (`npm run build:web`)
- [x] SDQ assessment can be saved to database
- [x] SDQ report displays dimension scores correctly
- [x] SDQ reports appear in Report Center with correct name
- [x] Clicking "查看" navigates to SDQ report page

## Key Lessons

1. **Database Layer Consistency:** `getDatabase()` returns SQLWrapper with `run/all/get`, NOT DatabaseAPI with `execute/query`
2. **SQLite Constraint Evolution:** CHECK constraints require table recreation to add enum values
3. **Data Display Robustness:** Compute derived values from raw data + constants, don't rely on stored values
4. **Template Binding:** Verify variable names match between Vue template and script
5. **New Assessment Type Checklist:** Update migration scripts, name maps, route maps, and selectors

---

*Plan: 02-PLAN.md | Phase: 02-sdq-cleanup*
*Completed: 2026-03-04*
