# Roadmap

## Archived Milestones

- ✅ `v1.4 Dashboard Special Ed Command Center` — shipped 2026-03-19
  - Archive: `.planning/milestones/v1.4-ROADMAP.md`
- ✅ `v1.3 Unified Assessment Word Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.3-ROADMAP.md`
- ✅ `v1.2 Emotional Resource Pack Import & Export` — shipped 2026-03-18
  - Archive: `.planning/milestones/v1.2-ROADMAP.md`
- ✅ `v1.1 Emotional Authoring & Scene Gallery` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.1-ROADMAP.md`
- ✅ `v1.0 Emotional MVP` — shipped 2026-03-17
  - Archive: `.planning/milestones/v1.0-ROADMAP.md`

## Current Milestone

## v1.5 Strict Modular Licensing

**Status:** In Progress  
**Phases:** 12-13  
**Total Plans:** 2

## Overview

v1.5 introduces strict modular licensing for school-by-school delivery. The milestone first adds authorized module payload, local persistence, and auth-store entitlement state, then follows with route/menu/business-entry enforcement.

## Phases

### Phase 12: Modular Licensing Core

**Goal**: Add strict `allowedModules` support to the signed license payload, local activation persistence, and auth store state.  
**Depends on**: current activation system, `activation` table, auth store  
**Plans**: 1 plan

Plans:

- [x] 12-01: Strict Payload, Activation Persistence, and Auth Entitlements

**Details:**
- Require `am` (`allowedModules`) in the signed license payload.
- Persist authorized modules to `activation.allowed_modules`.
- Expose `entitlements` and `hasModuleAccess()` in the auth store.
- Inject `['sensory', 'emotional']` only in DEV mode when no real activation code exists.

### Phase 13: Licensing Enforcement UI

**Goal**: Enforce modular licensing at route, menu, dashboard, and direct-launch entry points.  
**Depends on**: Phase 12  
**Plans**: 1 plan

Plans:

- [ ] 13-01: Route Guards, Locked Menu State, and Business Entry Enforcement

## Milestone Summary

Strict modular licensing is now underway. Core entitlement plumbing is complete; route and UI interception are next.

## Future Backlog

- Emotional report polish based on richer scene taxonomy and teacher-facing summaries.
- Replace first-resource direct launch with plan-priority or teacher-guided recommended resource selection once the current dashboard launch flow proves stable.
- Resource pack bundling for local cover images / scene illustrations after metadata exchange proves stable.
- Cross-module route/menu platformization after current static-route debt is prioritized.
- Cognitive assessment foundation (`MOD-03`).
- Multi-module comprehensive reporting (`MOD-04`).
