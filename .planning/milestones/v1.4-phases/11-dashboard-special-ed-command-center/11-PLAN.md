# PLAN: Dashboard Special Ed Command Center

**Milestone:** v1.4  
**Phase:** 11  
**Status:** Completed  
**Date:** 2026-03-19

## Goal

Transform the homepage from a generic ERP-style summary page into a special-education daily command center powered only by real local SQL data, then let teachers launch training directly from today's schedule with student and plan context already attached.

## Deliverables

1. A new `src/database/dashboard-api.ts` that centralizes homepage aggregation queries for metrics, active plans, anomalies, and assessment reminders.
2. A three-section Element Plus homepage that renders real data only and falls back to `el-empty` or stable-state UI when no records exist.
3. Direct launch from today's schedule into the concrete training execution page using real `studentId`, `planId`, `resourceId`, and route context.
4. Shared launch-contract logic so Dashboard and Training Plan use the same routing rules for real training resources.

## Locked Constraints

- No front-end mock data is allowed anywhere on the dashboard.
- Use the current production data model: `sys_training_plan`, `sys_plan_resource_map`, `training_records`, `emotional_training_session`, `emotional_training_detail`, and the existing assessment tables.
- Preserve local-first, zero-native-dependency architecture.
- If real data is missing, show empty states rather than invented placeholders.

## Execution Order

1. Build `src/database/dashboard-api.ts` with real SQL aggregations.
2. Rebuild `src/views/Dashboard.vue` into the special-ed command center layout.
3. Add schedule-resource context to dashboard query results.
4. Introduce a shared direct-launch route builder and apply it to Dashboard and Training Plan.
5. Update target training pages so `from=dashboard` / `from=plan` exits return to the correct upstream context.
6. Run targeted `vue-tsc` verification for touched files and record residual repository-wide type debt separately.

## Acceptance Targets

1. The homepage displays only real local metrics and lists.
2. Teachers can open Dashboard and immediately see today's active plans, weekly anomalies, and overdue assessments.
3. Clicking `开始训练` from Today's Schedule jumps directly into the actual training runtime with the correct student already bound.
4. Empty-data states are explicit and professional, never mocked.
