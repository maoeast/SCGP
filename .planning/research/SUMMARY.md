# Research Summary: SCGP (Stellar Competency Growth Platform)

**Domain:** Comprehensive competency development platform for special education (Sensory Integration, Behavior, Daily Living Skills, IEP)
**Researched:** Current Date
**Overall confidence:** HIGH

## Executive Summary

The project, formerly known as SIC-ADS, has undergone a major Phase 5 refactoring and brand upgrade to **Stellar Competency Growth Platform (SCGP)**. It aims to transition from a single vertical application (sensory capabilities) to a multi-system integrated rehabilitation platform supporting Sensory, Emotional, Social, Cognitive, and Life Skills modules. The architecture follows a "Core Kernel + Business Modules" pattern. 

The application is built on Electron with Vue 3, TypeScript, Vite, and SQLite (`sql.js` in-browser) for local-first, privacy-respecting execution without native dependencies (Zero Native Dependencies principle). Recent accomplishments include a total refactor of the evaluation infrastructure using a Strategy Pattern (`ScaleDriver`), the complete consolidation of resource management (Game, Equipment, and Teaching Materials) under a unified `sys_training_resource` mechanism, and comprehensive tracking and analysis modules. 

A critical ongoing focus is completing the "Phase 5.2 Game Training Module Refactoring," ensuring all game resources (rhythm, matching, etc.) are correctly generalized and validated in an end-to-end flow.

## Key Findings

**Stack:** Electron + Vue 3 + TypeScript + Vite + `sql.js` (SQLite in-browser), utilizing Local-First, Zero Native Dependencies architecture.
**Architecture:** Core Kernel (Resource, Profile, System Services, Class) + Business Modules (Sensory, Emotional, Social, etc.) leveraging dynamic ModuleRegistry and ScaleDriver Strategy patterns.
**Critical pitfall:** Heavy local data mutations combined with `sql.js` limitations required a robust "Debounced Atomic Write" fallback (Plan B) on the main thread after Web Worker approaches failed due to CommonJS/Vite compatibility issues.

## Implications for Roadmap

Based on research, suggested phase structure:

1. **Phase: Game Training End-to-End Validation** - Validates the completion of the Phase 5.2 refactoring.
   - Addresses: Validating GameLobby, GamePlay, Emoji rendering, Game resource migration (sys_training_resource) logic.
   - Avoids: Data mismatches and legacy metadata property naming bugs.

2. **Phase: Business Module Expansion (Emotional & Social)** - Leverages the newly generalized architecture.
   - Addresses: Adding new game resources, assessments (CBCL, SDQ), and IEP strategies for Emotional/Social modules.
   - Avoids: Breaking the decoupled module registry paradigm; sticking to the strictly defined `ModuleInterface`.

3. **Phase: Hardware-Dependent Modules Testing (Visual Tracking)** - Revisit paused visual tracking games.
   - Addresses: WebGazer eye tracking integration in controlled environments.
   - Avoids: Committing to unreliable eye tracking without strict environmental control guidelines.

**Phase ordering rationale:**
- Finalize the core technical debt and refactoring validation first (Phase 5.2) before injecting completely new business modules. Hardware-dependent features remain lowest priority due to known external dependencies (lighting, camera).

**Research flags for phases:**
- Phase 1: Standard validation patterns, but ensure thorough database migration verification.
- Phase 2: Needs deeper research into standardizing Emotional/Social scale implementations matching the new `ScaleDriver` model.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Explicitly detailed in PROJECT_CONTEXT.md and implementation plans. |
| Features | HIGH | Thorough documentation of finished vs ongoing capabilities. |
| Architecture | HIGH | Detailed in the refactoring spec (重构实施技术规范.md). |
| Pitfalls | HIGH | Specific, resolved issues meticulously cataloged in tracking sections. |

## Gaps to Address

- The precise structures for the upcoming Emotional and Social modules (e.g., CBCL, SDQ scales) need strict definitions before implementation.
- Long-term viability of the Main Thread Debounced Atomic Save model for extremely large databases (if schools accumulate massive records) is untested beyond the 10K record benchmark.