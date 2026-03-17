# PLAN: Visual Emotional Resource Editors

**Phase:** 07  
**Status:** Completed  
**Date:** 2026-03-17

## Goal

Turn the Phase 6 editor shells into production-grade dynamic Element Plus forms so teachers can configure emotional scenes without touching raw JSON.

## Action Steps

1. Expand `EmotionSceneEditor.vue` into a full nested editor:
   - base info
   - dynamic clue list
   - dynamic reasoning questions and options
   - dynamic solution list
2. Expand `CareExpressionEditor.vue` into a full nested editor:
   - base info
   - dynamic sender utterance list
   - dynamic receiver options list
   - preferred utterance selection
3. Move reusable defaults and validation rules into the emotional editor contract utility.
4. Wire save-time validation back into `TrainingResources.vue`.
5. Run targeted `vue-tsc` verification for touched files and update planning state.

## Acceptance Targets

1. Teachers can manage emotional scenes through dynamic visual forms instead of raw JSON.
2. Nested lists support add/remove/update flows directly on the `v-model` contract.
3. Save flow blocks incomplete emotional resources with teacher-readable validation errors.
4. Resource Center remains backward compatible for non-emotional resource types.
