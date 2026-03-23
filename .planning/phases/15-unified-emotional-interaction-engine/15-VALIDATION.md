---
phase: 15
slug: unified-emotional-interaction-engine
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-23
---

# Phase 15 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `vue-tsc` focused type-check + manual runtime regression |
| **Config file** | `tsconfig.emotional.json` |
| **Quick run command** | `npm run type-check:emotional` |
| **Full suite command** | `npm run type-check` |
| **Estimated runtime** | ~30-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run type-check:emotional`
- **After every plan wave:** Run `npm run type-check`
- **Before `$gsd-verify-work`:** Full suite must be green or existing unrelated blockers explicitly documented
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ENGN-02 | type-check | `npm run type-check:emotional` | YES | pending |
| 15-01-02 | 01 | 1 | ENGN-01, ENGN-03 | type-check + manual regression | `npm run type-check:emotional` | YES | pending |
| 15-01-03 | 01 | 2 | ENGN-01, ENGN-02, ENGN-03 | full type-check + manual regression | `npm run type-check` | YES | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [x] Existing `vue-tsc` emotional scope covers core engine files through `tsconfig.emotional.json`
- [x] Existing `npm run type-check` command provides repository-level regression coverage
- [ ] Manual regression checklist for emotion-scene and care-scene engine parity must be executed during phase completion

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Emotion-scene retains delayed auto-advance after valid selection | ENGN-03 | UI pacing is behavior/timing sensitive | Run one `emotion_scene`, answer one correct and one wrong-first path, confirm feedback then timed advance still feels unchanged |
| Care-scene retains explicit continue/complete steps after valid selection | ENGN-03 | Intermediate reveal cards are UI-state dependent | Run one `care_scene`, confirm utterance effect card and receiver reason card appear before continuing/completing |
| Cancel-on-leave still persists partial session when attempts exist | ENGN-01 | Requires route navigation and DB-backed persistence path | Start either submodule, answer at least one step, navigate away, confirm cancellation persists without runtime error |
| Session-summary routing remains compatible for both submodules | ENGN-01 | End-to-end navigation cannot be proven by type-check alone | Complete one run in each submodule and confirm `/emotional/session-summary` opens with persisted IDs |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual verification coverage
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing infrastructure references for this phase
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
