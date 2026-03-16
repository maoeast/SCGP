---
phase: 03
slug: cognitive-comprehensive-reporting
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-12
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | other - no dedicated unit/E2E runner in repo |
| **Config file** | none |
| **Quick run command** | `npm run type-check` |
| **Full suite command** | `npm run build:web` |
| **Estimated runtime** | ~60-120 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run type-check`
- **After every plan wave:** Run `npm run build:web`
- **Before `$gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03.1-01 | 03.1 | 1 | MOD-03 | compile | `npm run type-check` | ❌ W0 | ⬜ pending |
| 03.1-02 | 03.1 | 1 | MOD-03 | build | `npm run build:web` | ❌ W0 | ⬜ pending |
| 03.2-01 | 03.2 | 2 | MOD-03 | compile | `npm run type-check` | ❌ W0 | ⬜ pending |
| 03.2-02 | 03.2 | 2 | MOD-03 | manual+build | `npm run build:web` | ❌ W0 | ⬜ pending |
| 03.3-01 | 03.3 | 1 | MOD-04 | compile | `npm run type-check` | ❌ W0 | ⬜ pending |
| 03.3-02 | 03.3 | 1 | MOD-04 | build | `npm run build:web` | ❌ W0 | ⬜ pending |
| 03.4-01 | 03.4 | 2 | MOD-04 | manual+compile | `npm run type-check` | ❌ W0 | ⬜ pending |
| 03.4-02 | 03.4 | 2 | MOD-04 | manual+build | `npm run build:web` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None - existing infrastructure already provides the only automated checks currently available for this repo:

- `npm run type-check`
- `npm run build:web`

This means Wave 0 does not install new tooling, but execution must compensate with stricter manual verification on UI/report flows.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cognitive scale appears in assessment center and student selection | MOD-03 | current repo has no UI test runner | Open assessment center, confirm `cognitive` entry, select a student, enter unified assessment route |
| Cognitive assessment can be completed and saved | MOD-03 | answer flow and persistence are UI-driven | Complete one full cognitive assessment, verify success dialog, reopen generated report from report center |
| Cognitive report content is readable and teacher-facing | MOD-03 | interpretation quality and layout are visual | Inspect report cards, summary wording, and suggestion blocks with realistic sample data |
| Comprehensive report can be generated with only partial module data | MOD-04 | partial-data UX is business-rule heavy | Use a student with only 1-2 eligible modules, generate report, confirm missing-module cards are honest and non-blocking |
| Comprehensive report can be generated with multi-module data | MOD-04 | cross-scale aggregation is a product workflow | Use a student with sensory + emotional/social + cognitive results, generate report, confirm section order and module cards |
| Comprehensive report print layout stays within 2-4 readable pages | MOD-04 | print pagination is browser/layout dependent | Open print preview or PDF export and verify summary-first layout, limited charts, and page count target |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or explicit manual verification
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing automated references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending

