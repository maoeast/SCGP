# PLAN: Emotional Scene Gallery & Launch Flow

**Phase:** 08  
**Status:** Completed  
**Date:** 2026-03-17

## Goal

Add selector pages so teachers choose a concrete emotional scene before entering runtime, and route the current training pages through explicit `resourceId` launch flow.

## Action Steps

1. Add a reusable `SceneSelector.vue` page for emotional scene galleries.
2. Register new static selector routes for `emotion_scene` and `care_scene`.
3. Update `Menu.vue` so the two training cards open the selector pages instead of entering runtime directly.
4. Tighten runtime loading:
   - respect explicit `resourceId`
   - stop silently falling back to `LIMIT 1` when a requested resource is missing
5. Update planning and backlog state for milestone closure.

## Acceptance Targets

1. Teachers can browse all active scenes in a gallery before launch.
2. Scene cards surface cover, title, difficulty, and emotion color cues.
3. Clicking a card launches the existing training runtime with explicit `resourceId`.
4. Legacy implicit launch remains available only when no explicit `resourceId` is provided.
