# PLAN: Emotional Resource Contract & Editor Infrastructure

**Phase:** 06  
**Status:** In Progress
**Date:** 2026-03-17

## Goal

Stabilize the emotional resource editor contract before Phase 7 by introducing typed normalization and placeholder visual editors without breaking other resource types in Resource Center.

## Action Steps

1. Extract the current emotional resource contract into a dedicated editor utility that can:
   - create default `emotion_scene` / `care_scene` metadata
   - normalize existing `meta_data` into typed editor state
   - serialize editor state back into runtime-compatible metadata
2. Add `EmotionSceneEditor.vue` and `CareExpressionEditor.vue` as Phase 6 shells:
   - expose `v-model`
   - allow editing of base fields only
   - surface nested structure counts and phase-7 placeholders
3. Integrate the shell editors into `TrainingResources.vue` with conditional rendering:
   - emotional resource types mount the new editors
   - existing resource types keep the current create/edit flow unchanged
4. Replace direct emotional JSON textarea usage in Resource Center save/edit flows with typed metadata save logic.
5. Run `vue-tsc` validation and record follow-up scope for Phase 7.

## Acceptance Targets

1. Emotional resources no longer require raw JSON editing in Resource Center create/edit dialogs.
2. Existing v1.0 emotional resources can be opened, normalized, and saved through typed editor state.
3. Other resource types remain on their current paths without regression.
4. Training runtime metadata shape remains compatible with current emotional training pages.
