# PLAN: Modular Licensing Enforcement UI

**Milestone:** v1.5  
**Phase:** 13  
**Status:** Completed  
**Date:** 2026-03-19

## Goal

Enforce module entitlements across routing, sidebar navigation, dashboard entry points, and direct-launch flows while preserving commercial visibility through locked-but-visible module surfaces.

## Deliverables

1. Route metadata and global guard checks for unauthorized modules.
2. Sidebar menu renders unauthorized modules as grey locked items instead of hiding them.
3. Dashboard quick actions render unauthorized modules in locked state and refuse entry.
4. Direct-launch runtime entry points refuse unauthorized module access before navigation.

## Locked Constraints

- Unauthorized modules must remain visible in primary navigation for commercial upsell.
- Authorization checks must reuse `hasModuleAccess(moduleCode)` instead of ad hoc logic.
- DEV bypass from Phase 12 remains the only non-production shortcut.

## Execution Order

1. Add `meta.moduleCode` to top-level business routes.
2. Update router guard to block unauthorized deep links.
3. Update `Layout.vue` to render locked menu items with grey state and 🔒 marker.
4. Update `Dashboard.vue` and `training-launch.ts` to block unauthorized business entry points.
5. Run targeted type-check filtering for touched enforcement files.

## Acceptance Targets

1. Unauthorized deep links redirect back to Dashboard with an explanation.
2. Locked modules are visible in the sidebar and Dashboard.
3. Direct launch into unauthorized training runtime is impossible.
